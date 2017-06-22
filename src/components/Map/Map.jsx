require('./Map.scss');
import { Component } from 'react';
import Highcharts from 'highcharts';
import generateStops from '../../includes/generateStops';
import fetchData from '../../includes/fetchData';
import { formatNum } from '../../includes/utils';
import aggregateData from '../../includes/aggregateData';
import TimeSeriesSlider from '../Controls/TimeSeriesSlider/TimeSeriesSlider';
import FilterSelector from '../Controls/FilterSelector/FilterSelector';
import StyleSelector from '../Controls/StyleSelector/StyleSelector';
import { getLastIndex } from '../../includes/utils';
import Export from '../Export/Export';
import * as d3 from 'd3';
import ss from 'simple-statistics';
const activeLayers = [];


class Map extends Component {
  constructor(props) {
    super(props);
    this.changeStyle = this.changeStyle.bind(this);
    this.filterData = this.filterData.bind(this);
    const map = {};
    this.state = {
      layers: props.layers.layers,
      layersObj: [],
      style: this.props.mapConfig.mapDefaultStyle,
      styles: props.styles,
    };
  }

  componentDidMount() {
    const _self = this;
    mapboxgl.accessToken = this.props.mapConfig.mapAccessToken;
    this.map = new mapboxgl.Map({
      container: this.props.mapId,
      style: this.state.style,
      center: this.props.mapConfig.mapCenter,
      zoom: this.props.mapConfig.mapZoom,
    });
    window.maps.push(this.map);
    this.map.addControl(new mapboxgl.NavigationControl());
    this.map.on('load', () => {
      this.addDefaultLayers();
      this.addMousemoveEvent();
    });
  }

  componentWillReceiveProps(nextProps) {
    this.map.resize();
    if (nextProps.layers.layers.length > 0) {
      const l = nextProps.layers.layers.length - 1;
      const layers = nextProps.layers.layers;
      this.setState({
        layers,
      });
      if (nextProps.layers.layers[l].visible === true
        && nextProps.layers.layers[l].map === this.props.mapId) {
        this.prepareLayer(nextProps.layers.layers[l]);
      }
      if (nextProps.layers.layers[l].visible === false
        && nextProps.layers.layers[l].map === this.props.mapId) {
        this.removeLayer(nextProps.layers.layers[l]);
      }
    }
  }

  componentDidUpdate() {
    this.addTimeseriesLayers();
  }

  prepareLayer(layer, filterOptions = false) {
    const _self = this;
    const layer_id = layer.title || layer.id;
    const layerData = this.props.layerData[layer_id];
    layerData.id = layer_id;

    if (layerData.popup && layerData.type !== 'chart') {
      activeLayers.push(layerData.id);
    }

    function renderData(layerData) {
      if (!(layerData.labels)) {
        _self.addLayer(layerData);
      } else {
        d3.csv(layerData.labels.data, (labels) => {
          layerData.labels.data = labels;
          _self.addLayer(layerData);
        });
      }
    }
    // if layer has source
    if (layerData.source) {
      // if not processed, grab the csv or geojson data
      if (typeof layerData.source.data === 'string') {
        const fileName = layerData.source.data;
        const fileType = fileName.split('.').pop();
        if (fileType === 'csv') {
          d3.csv(layerData.source.data, (data) => {
            layerData.source.data = data;
            renderData(layerData);
          });
        }
        if (fileType === 'geojson') {
          d3.json(layerData.source.data, (data) => {
            layerData.source.data = data;
            renderData(layerData);
          });
        }
      } else if (layerData.source.data instanceof Array &&
        !(layerData.source.data[0] instanceof Object) &&
        layerData.source.data.length >= 1 &&
        !layerData.loaded) {
        let q = d3.queue();
        const filePaths = layerData.source.data;
        filePaths.forEach((filePath) => {
          if (Number.isInteger(filePath)) {
            q = q.defer(fetchData, _self, filePath, layerData.property);
          } else q = q.defer(d3.csv, filePath);
        });
        q.awaitAll((error, data) => {
          const mergedData = [].concat.apply([], data);
          layerData.mergedData = mergedData;
          layerData.source.data = aggregateData(layerData, this.props.locations);
          layerData.loaded = true;
          renderData(layerData);
        });
      } else if (filterOptions) {
        layerData.source.data = aggregateData(layerData, this.props.locations, filterOptions);
        _self.addLayer(layerData);
      } else {
        // add the already processed layer
        _self.addLayer(layerData);
      }
    } else if (layerData.layers) {
      // if layer has sublayers, add all sublayers
      _self.addLegend(layerData);
      layerData.layers.forEach((layer) => {
        const subLayer = this.props.layerData[layer];
        subLayer.id = layer;
        _self.addLayer(subLayer);
      });
    }
  }

  addLayer(layer) {
    const _self = this;
    const layerData = this.props.layerData;
    const timefield = (layer.aggregate && layer.aggregate.timeseries) ? layer.aggregate.timeseries.field : '';

    if (layer === undefined) {
      return null;
    }

    const layerObj = layer;
    const layersObj = [...this.state.layersObj, layer];
    this.setState({
      layerObj,
      layersObj,
    });

    if (layer.property) {
      var stops = generateStops(layer, timefield);
    }

    if (stops) {
      this.setState({ stops: { stops, id: layer.id } });
      const colorStops = timefield ? stops[0][stops[0].length - 1] : stops[0][0];
      const radiusStops = stops[1][0];
      const stopsData = layer.type === 'circle' ? radiusStops : colorStops;
      const breaks = stops[3];
      const colors = stops[4];
      const currPeriod = stops[2][stops[2].length - 1];
      const currData = layer.source.data.filter(data => data[timefield] === currPeriod);
      const Data = timefield ? currData : layer.source.data;

      this.addLegend(layer, stopsData, Data, breaks, colors);
      this.addLabels(layer, Data);
    } else if (layer.credit && layer.categories.breaks === 'no') {
      this.addLegend(layer);
    }

    /*
     * CIRCLE ==========================================================
     */
    if (layer.type === 'circle') {
      const circleLayer = {
        id: layer.id,
        type: 'circle',
        source: {
          type: layer.source.type,
        },
        layout: {},
        paint: {
          'circle-color': layer.categories.color,
          'circle-opacity': 0.8,
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 1,
          'circle-stroke-opacity': 1,
        },
      };

      // override from layers.json
      if (layer.paint) {
        circleLayer.paint = layer.paint;
      }

      if (layer.source.data) {
        if (layer.source.type === 'vector') {
          const layerStops = timefield ? stops[1][stops[1].length - 1] : stops[1][0];
          circleLayer.paint['circle-radius'] = {
            property: layer.source.join[0],
            stops: layerStops,
            type: 'categorical',
            default: 0,
          };
          circleLayer.source.url = layer.source['map-id'];
          circleLayer['source-layer'] = layer.source.layer;
        } else if (layer.source.type === 'geojson') {
          circleLayer.paint['circle-radius'] = {
            property: layer.source.join[0],
            stops: stops[1][0],
          };
          circleLayer.source.data = layer.source.data;
        }
      }
      // add filter
      if (layer.filter) {
        circleLayer.filter = layer.filter;
      }

      this.map.addLayer(circleLayer);
    }

    /*
     * FILL ==========================================================
     */
    if (layer.type === 'fill') {
      const fillLayer = {
        id: layer.id,
        type: 'fill',
        source: {
          type: layer.source.type,
        },
        layout: {},
        paint: {
          'fill-color': '#f00',
          'fill-opacity': 0.7,
        },
      };

      // override from layers.json
      if (layer.paint) {
        fillLayer.paint = layer.paint;
      }

      if (!(layer['no-outline'])) {
        fillLayer.paint['fill-outline-color'] = '#fff';
      }

      if (layer.source.type === 'geojson') {
        fillLayer.source.data = layer.source.data;
      } else {
        fillLayer.source.url = layer.source['map-id'];
        fillLayer['source-layer'] = layer.source.layer;
      }

      if (layer.source.data) {
        const layerStops = timefield ? stops[0][stops[1].length - 1] : stops[0][0];

        fillLayer.paint['fill-color'] = {
          property: layer.source.join[0],
          stops: layerStops,
          type: 'categorical',
          default: 'rgba(0,0,0,0)',
        };
      }
      // add filter
      if (layer.filter) {
        fillLayer.filter = layer.filter;
      }

      this.map.addLayer(fillLayer);
    }

    /*
     * LINE ==========================================================
     */
    if (layer.type === 'line') {
      const lineLayer = {
        id: layer.id,
        type: 'line',
        source: {
          type: layer.source.type,
        },
        layout: {},
        paint: {
          'line-color': '#f00',
          'line-width': 1,
        },
      };
      if (layer.paint) {
        lineLayer.paint = layer.paint;
      }
      if (layer.source.type === 'geojson') {
        lineLayer.source.data = layer.source.data;
      } else {
        lineLayer.source.url = layer.source['map-id'];
        lineLayer['source-layer'] = layer.source.layer;
      }
      this.map.addLayer(lineLayer);
    }

    /*
     * SYMBOL ==========================================================
     */
    if (layer.type === 'symbol') {
      const symbolLayer = {
        id: layer.id,
        type: 'symbol',
        source: {
          type: layer.source.type,
        },
        layout: layer.layout,
        paint: layer.paint,
      };

      // add filter
      if (layer.filter) {
        symbolLayer.filter = layer.filter;
      }

      if (layer.source.type === 'geojson') {
        symbolLayer.source.data = layer.source.data;
      } else {
        symbolLayer.source.url = layer.source['map-id'];
        symbolLayer['source-layer'] = layer.source.layer;
      }

      if (layer.categories && layer.categories.shape) {
        const stops = [];
        layer.categories.type.forEach((type, index) => {
          stops.push([type, layer.categories.shape[index]]);
        });
        symbolLayer.layout['icon-image'].stops = stops;
      }

      this.map.addLayer(symbolLayer);
    }
    /*
     * CHART ==========================================================
     */
    if (layer.type === 'chart') {
      const population = layer.source.data.map(d => d[layer.categories.total]);
      const clusters = ss.ckmeans(population, layer.categories.clusters);
      const dimensions = layer.categories.dimension;

      // create a DOM element for the marker
      layer.source.data.forEach((district) => {
        const total = district[layer.categories.total];
        let chartArr = [];
        let chartProp = '';
        let propTotal = 0;
        let dimension;

        for (let i = 0; i < layer.categories.property.length; i += 1) {
          chartArr.push({ color: layer.categories.color[i], y: parseInt(district[layer.categories.property[i]] / total * 100), label: layer.categories.label[i] });
          propTotal += parseInt(district[layer.categories.property[i]] / total * 100);
          chartProp += `<div><span class="swatch" style="display: inline-block; height: 10px; width: 5px; background: ${layer.categories.color[i]};"></span>${layer.categories.label[i]}: <b>${(district[layer.categories.property[i]] / total * 100).toFixed(1)}%</b></div>`;
        }

        chartProp += `<div><span class="swatch" style="display: inline-block; height: 10px; width: 5px; background: #DDDDDD;"></span>
        Normal: <b>${(100 - propTotal).toFixed(1)}%</b></div>`;
        chartArr.splice(0, 0, {
          color: '#DDDDDD',
          y: (100 - propTotal),
          label: 'Normal',
        });

        for (let i = 0; i < clusters.length; i += 1) {
          if (clusters[i].includes(total)) {
            dimension = dimensions[i];
          }
        }

        const chartData = [{
          data: chartArr,
          size: layer.chart.size,
          innerSize: layer.chart.innerSize,
        }];

        const content = `<div><b>${district.district_name}</b></div>` + chartProp;

        const el = document.createElement('div');
        el.id = `chart-${district.district_osm_id}-${layer.id}-${_self.props.mapId}`;
        el.className = `marker-chart marker-chart-${layer.id}-${_self.props.mapId}`;
        el.style.width = layer.chart.width;
        el.style.height = layer.chart.height;
        $(el).attr('data-map', _self.props.mapId);
        $(el).attr('data-lng', district.longitude);
        $(el).attr('data-lat', district.latitude);
        $(el).attr('data-popup', content);

        // add marker to map
        new mapboxgl.Marker(el, {
          offset: layer.chart.offset,
        })
          .setLngLat([district.longitude, district.latitude])
          .addTo(_self.map);

        const container = $(`#chart-${district.district_osm_id}-${layer.id}-${_self.props.mapId}`)[0];
        _self.drawDoughnutChart(container, chartData, dimension);
      });
    }

    // sort the layers
    _self.sortLayers();
  }

  sortLayers() {
    const _self = this;
    const layerData = this.props.layerData;
    for (var key in layerData) {
      if (layerData.hasOwnProperty(key)) {
        if (layerData[key].type === 'line') {
          if (_self.map.getLayer(key)) {
            _self.map.moveLayer(key);
          }
        }
      }
    }
    for (var key in layerData) {
      if (layerData.hasOwnProperty(key)) {
        if (layerData[key].type === 'circle') {
          if (_self.map.getLayer(key)) {
            _self.map.moveLayer(key);
          }
        }
      }
    }
    for (var key in layerData) {
      if (layerData.hasOwnProperty(key)) {
        if (layerData[key].type === 'symbol') {
          if (_self.map.getLayer(key)) {
            _self.map.moveLayer(key);
          }
        }
      }
    }
  }

  removeLayer(layer) {
    const layer_id = layer.title || layer.id;
    const layerData = this.props.layerData[layer_id];

    if (layerData.layers) {
      layerData.layers.forEach((layer) => {
        this.map.removeLayer(layer);
        this.map.removeSource(layer);
      });
    }
    if (layerData.popup && layerData.type !== 'chart') {
      const index = activeLayers.indexOf(layerData.id);
      activeLayers.splice(index, 1);
    }
    if (layerData.labels) {
      $(`.marker-label-${layer_id}-${this.props.mapId}`).remove();
    }
    if (layerData.type === 'chart') {
      $(`.marker-chart-${layer_id}-${this.props.mapId}`).remove();
    } else {
      if (this.map.getLayer(layer_id)) {
        this.map.removeLayer(layer_id);
      }
      if (this.map.getSource(layer_id)) {
        this.map.removeSource(layer_id);
      }
    }
    this.setState({ layerObj: null });
    this.removeLabels(layer);
    this.removeLegend(layer);
  }

  addLabels(layer, data) {
    if (layer.labels && layer.labels.data) {
      if (!layer.labels.height) {
        layer.labels.height = 30;
        layer.labels.width = 30;
        layer.labels.offset = [-18, 10];
      }
      if (layer.labels.mode === 'join') {
        data.forEach((row, index) => {
          if (row[layer.labels.property]) {
            const el = document.createElement('div');
            el.className = `marker-label marker-label-${layer.id}-${this.props.mapId}`;
            el.style.width = layer.labels.width;
            el.style.height = layer.labels.height;
            let labelSuffix = layer.labels.suffix || '';
            if (row.total || row[layer.labels['property-2']]) {
              const cummulativeSuffix = row.total ? row.total : row[layer.labels['property-2']];
              labelSuffix += `<span style='font-size: 12px; font-weight: normal'><br><center>of ${cummulativeSuffix}</center></span>`;
            }
            $(el).html(row[layer.labels.property] + labelSuffix);
            layer.labels.data.forEach((label) => {
              if (label.osm_id === row[layer.source.join[1]]) {
                new mapboxgl.Marker(el, {
                  offset: layer.labels.offset,
                })
                  .setLngLat([label.longitude, label.latitude])
                  .addTo(this.map);
              }
            });
          }
        });
      } else {
        layer.labels.data.forEach((label, index) => {
          if (label[layer.labels.property]) {
            const el = document.createElement('div');
            el.className = `marker-label marker-label-${layer.id}-${this.props.mapId}`;
            el.style.width = layer.labels.width;
            el.style.height = layer.labels.height;
            $(el).attr('data-coords', [label.longitude, label.latitude]);
            $(el).html(label[layer.labels.property]);
            new mapboxgl.Marker(el, {
              offset: layer.labels.offset,
            })
              .setLngLat([label.longitude, label.latitude])
              .addTo(this.map);
          }
        });
      }
    }
  }

  removeLabels(layer) {
    const classItems = document.getElementsByClassName(`marker-label-${layer.id}-${this.props.mapId}`);
    while (classItems[0]) {
      classItems[0].parentNode.removeChild(classItems[0]);
    }
  }

  addLegend(layer, stops, data, breaks, colors) {
    const mapId = this.props.mapId;
    let legend_background = '';
    if (layer.credit && layer.type === 'circle') {
      $(`.legend.${mapId}`).prepend(`<div id="legend-${layer.id}-${mapId}"` +
        'class="legend-shapes">' +
        `<b>${layer.label}</b>` +
        '<div class="legend-symbols">' +
        `<span class="circle-sm" style="background:${layer.categories.color};"></span>` +
        `<span class="circle-md" style="background:${layer.categories.color};"></span>` +
        `<span class="circle-lg" style="background:${layer.categories.color};"></span>` +
        `</div>${
        layer.credit
        }</div>`);
    } else if (layer.credit && layer.categories.shape) {
      layer.categories.color.forEach((color, index) => {
        const style = layer.categories.shape[index] === 'triangle-stroked-11' ||
          layer.categories.shape[index] === 'triangle-15' ?
          'border-bottom-color:' : 'background:';

        legend_background += `<li class="layer-symbols"> <span class="${
          layer.categories.shape[index]}" style="${style}${color};"></span>${
          layer.categories.label[index]}</li>`;
      });

      $(`.legend.${mapId}`).prepend(`<div id="legend-${layer.id}-${mapId}"` +
        'class="legend-row">' +
        `<b>${layer.label}</b>` +
        '<div class="legend-shapes">' +
        `<ul style="left: 0;">${legend_background}</ul> </div>${layer.credit}</div>`);
    } else if (layer.credit && layer.categories.breaks === 'no') {
      layer.categories.color.forEach((color, index) => {
        legend_background += `<li style="background:${color}; width:${
          100 / layer.categories.color.length
          }%;">${layer.categories.label[index]}</li>`;
      });

      $(`.legend.${mapId}`).prepend(`<div id="legend-${layer.id}-${mapId
        }" class="legend-row">` + `<b>${layer.label}</b>` +
        `<div class="legend-fill ${layer.categories ? 'legend-label' : ''}">` +
        `<ul>${legend_background}</ul></div>${layer.credit}</div>`);
    } else if (layer.credit && layer.type !== 'circle' && layer.type !== 'chart') {
      const dataValues = data.map(values => values[layer.property]);
      const colorLegend = [...new Set(stops.map(stop => stop[1]))];
      const legendSuffix = layer.categories.suffix ? layer.categories.suffix : '';

      if (colorLegend.includes('transparent') && !(colors).includes('transparent')) {
        colors.splice(0, 0, 'transparent');
        breaks.splice(1, 0, breaks[0]);
      }

      colorLegend.forEach((color, index) => {
        const firstVal = breaks[index - 1] !== undefined ? breaks[index - 1] : 0;
        const lastVal = color === colorLegend[colorLegend.length - 1] || breaks[index] === undefined ?
          Math.max(...dataValues) :
          breaks[index];
        legend_background += `<li class="background-block-${layer.id}-${mapId}"` +
          `data-tooltip="${formatNum(firstVal, 1)}-${formatNum(lastVal, 1)}${legendSuffix}"` +
          `style="background:${color}; width:${100 / colorLegend.length
          }%;"></li > `;
      });

      $(`.legend.${mapId}`).prepend(`<div id="legend-${layer.id}-${mapId}"` +
        'class="legend-row">' +
        `<b>${layer.label}</b>` +
        '<ul class="legend-limit" style="padding: 0% 0% 3% 0%;">' +
        `<li id="first-limit-${layer.id}" class="${mapId
        }"style="position: absolute; list-style: none; display: inline; left: 3%;">${0}${legendSuffix}</li>` +
        `<li id="last-limit-${layer.id}" class="${mapId
        }"style="position: absolute; list-style: none; display: inline; right: 3%;">${
        formatNum(Math.max(...dataValues), 1)}${legendSuffix}</li>` + '</ul>' +
        '<div class="legend-fill' + '">' +
        `<ul id="legend-background">${legend_background}</ul>` +
        `</div>${layer.credit}</div>`);

      $(`.background-block-${layer.id}-${mapId}`).hover(
        () => {
          $(`#first-limit-${layer.id}.${mapId}`).text($('first-limit').text());
          $(`#last-limit-${layer.id}.${mapId}`).text($('last-limit').text());
        }, () => {
          $(`#first-limit-${layer.id}.${mapId}`).text(0 + legendSuffix);
          $(`#last-limit-${layer.id}.${mapId}`).text(formatNum(Math.max(...dataValues), 1) + legendSuffix);
        },
      );
    }
  }

  removeLegend(layer) {
    const layer_id = layer.title || layer.id;
    $(`#legend-${layer_id}-${this.props.mapId}`).remove();
  }

  filterData(filterOptions) {
    this.removeLayer(this.state.layerObj);
    this.prepareLayer(this.state.layerObj, filterOptions);
  }

  getSliderLayers() {
    const sliderIds = [];
    for (const key in this.props.layerData) {
      sliderIds.push(key);
    }
    const sliderLayers = [];
    for (let i = 0; i < sliderIds.length; i += 1) {
      if ('aggregate' in this.props.layerData[sliderIds[i]] &&
        'timeseries' in this.props.layerData[sliderIds[i]].aggregate) {
        sliderLayers.push(sliderIds[i]);
      }
    }
    return sliderLayers;
  }

  addTimeseriesLayers() {
    const sliderLayers = this.getSliderLayers();
    const viewedIds = this.state.layers.map(layers => layers.title);
    const idIndices = [];
    const map = this.map;
    let sliderItem = null;
    // update these to use classes instead of ids for multimap
    const slider = document.getElementById(`${this.props.mapId}-slider`);
    const label = document.getElementById(`${this.props.mapId}-label`);
    for (let i = 0; i < sliderLayers.length; i += 1) {
      const id = sliderLayers[i];
      if (viewedIds.includes(id)) {
        const index = getLastIndex(viewedIds, id);
        const layerObj = this.props.layerData[id];

        if (this.state.layers[index].visible == true &&
          layerObj.source.data instanceof Object && this.state
          && this.state.stops && layerObj.id === this.state.stops.id) {
          const paintStops = this.state.stops.stops;
          const stopsIndex = layerObj.type === 'circle' ? 1 : 0;
          const Stops = paintStops[stopsIndex];
          const period = paintStops[2];
          const breaks = paintStops[3];
          const colors = paintStops[4];

          if (slider !== null && label !== null) {
            slider.max = (period.length - 1);
            slider.value = (period.length - 1);
            label.textContent = period[period.length - 1];

            slider.addEventListener('input', (e) => {
              const index = parseInt(e.target.value, 10);
              label.textContent = period[index];
              if (map.getLayer(layerObj.id) && Stops[index] !== undefined && Stops[index][0][0] !== undefined) {
                const defaultValue = layerObj.type === 'circle' ? 0 : 'rgba(0,0,0,0)';
                const paintProperty = layerObj.type === 'circle' ? 'circle-radius' : 'fill-color';
                const newStops = {
                  property: layerObj.source.join[0],
                  stops: Stops[index],
                  type: 'categorical',
                  default: defaultValue,
                };
                map.setPaintProperty(layerObj.id, paintProperty, newStops);
                const Data = layerObj.source.data.filter(data => data[layerObj.aggregate.timeseries.field] === period[index]);
                this.removeLabels(layerObj);
                this.addLabels(layerObj, Data);
                this.removeLegend(layerObj);
                this.addLegend(layerObj, Stops[index], Data, breaks, colors);
              }
            });
          }
          sliderItem = <TimeSeriesSlider mapId={this.props.mapId} periods={period} />;
        }
      }
    }
    return sliderItem;
  }

  addDefaultLayers() {
    const layerData = this.props.layerData;
    for (const key in layerData) {
      if (layerData.hasOwnProperty(key)) {
        if (layerData[key].visible === true) {
          $(`.layer.${this.props.mapId} > [data-layer="${key}"]`).trigger('click');
        }
      }
    }
  }

  drawDoughnutChart(container, data, dimension) {
    Highcharts.chart(container, {
      chart: {
        type: 'pie',
        spacing: 0,
        backgroundColor: 'transparent',
        height: dimension,
        width: dimension,
      },
      title: {
        text: '',
      },
      credits: {
        enabled: false,
      },
      tooltip: {
        enabled: false,
        backgroundColor: 'rgba(255,255,255,0)',
        borderWidth: 0,
        shadow: false,
        useHTML: true,
        formatter() {
          if (this.point.options.label !== undefined) {
            return `<div class="chart-Tooltip"><b>${this.point.options.label}: ${this.point.options.y.toFixed(0)}%</b></div>`;
          }
          return '';
        },
      },
      plotOptions: {
        series: {
          animation: true,
          states: {
            hover: {
              enabled: false,
            },
          },
        },
        pie: {
          allowPointSelect: false,
          // borderWidth: 0,
          borderColor: '#fff',
          dataLabels: {
            enabled: false,
            distance: 80,
            crop: false,
            overflow: 'none',
            formatter() {
              if (this.point.scoreLabel !== undefined) {
                return `<b>${this.point.label}</b>`;
              }
              return '';
            },
            style: {
              fontWeight: 'bold',
            },
          },
          center: ['50%', '50%'],
        },
      },
      series: data,
    });
  }

  addMousemoveEvent() {
    const _self = this;
    const layerData = this.props.layerData;
    const popup = new mapboxgl.Popup({
      closeOnClick: true,
      closeButton: false,
    });

    _self.map.on('mousemove', (e) => {
      const features = _self.map.queryRenderedFeatures(e.point, {
        layers: activeLayers,
      });

      // Change the cursor style as a UI indicator.
      _self.map.getCanvas().style.cursor = (features.length) ? 'pointer' : '';

      if (!features.length) {
        popup.remove();
        return;
      }

      const feature = features[0];
      let content = 'Unknown';
      const activeLayerId = feature.layer.id;
      const layer = layerData[activeLayerId];

      if (layer.type !== 'chart' && layer.popup.body) {
        const periodData = [];
        if (layer.aggregate && layer.aggregate.timeseries) {
          const currPeriod = document.getElementById(`${_self.props.mapId}-label`).textContent;
          layer.source.data.forEach((Obj) => {
            if (Obj[layer.aggregate.timeseries.field] === currPeriod) {
              periodData.push(Obj);
            }
          });
        }
        const data = (layer.aggregate && layer.aggregate.timeseries) ? periodData : layer.source.data;
        data.forEach((row, index) => {
          if (row[layer.source.join[1]] == feature.properties[layer.source.join[0]]) {
            if (row[layer.popup.header]) {
              content = `<div><b>${row[layer.popup.header]}</b></div>` +
                `<div><center>${row[layer.popup.body]}</center></div>`;
            } else {
              content = row[layer.popup.body];
            }
          }
        });
        popup.setLngLat(_self.map.unproject(e.point))
          .setHTML(content)
          .addTo(_self.map);
      }
    });

    // add popups for marker charts
    $(document).on('mousemove', '.marker-chart', (e) => {
      const map = $(e.currentTarget).data('map');
      const lng = $(e.currentTarget).data('lng');
      const lat = $(e.currentTarget).data('lat');
      const content = $(e.currentTarget).data('popup');
      if (map === _self.props.mapId) {
        popup.setLngLat([parseFloat(lng), parseFloat(lat)])
          .setHTML(content)
          .addTo(_self.map);
      }
    });
  }

  changeStyle(style) {
    const mapLayers = this.props.layers.layers.filter(layer => layer.map === this.props.mapId);
    const layers = mapLayers.map(layer => layer.title);
    const layerProp = [];

    for (let i = 0; i < layers.length; i += 1) {
      const index = getLastIndex(layers, layers[i]);
      if (mapLayers[index].visible === true) {
        layerProp.push(this.state.layersObj.filter(layer => layer.id === layers[i]));
      }
    }

    this.map.setStyle(style);
    this.map.on('style.load', () => {
      layers.forEach((id) => {
        const prop = this.state.layersObj.filter(layer => layer.id === id);
        this.removeLayer(prop[0]);
      });
      for (let j = 0; j < layerProp.length; j += 1) {
        if (!this.map.getSource(layerProp[j][0].id)) {
          this.addLayer(layerProp[j][0]);
        }
      }
    });
    this.setState({ style });
  }

  render() {
    return (
      <div>
        <div id={this.props.mapId}>
          {this.addTimeseriesLayers()}
          <div className={`legend ${this.props.mapId}`} />
          <StyleSelector changeStyle={this.changeStyle} style={this.state.style} styles={this.state.styles} />
        </div>
        <FilterSelector filterData={this.filterData} layerObj={this.state.layerObj} />
        <Export />
      </div>
    );
  }
}

export default Map;
