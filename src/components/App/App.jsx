import React from 'react';
import PropTypes from 'prop-types';
import Menu from '../Menu/Menu';
import Map from '../Map/Map';
import Sectors from '../Sectors/Sectors';
import Framework from '../Framework/Framework';


require('./App.scss');

window.maps = [];

class App extends React.Component {
  static showSector(e) {
    e.preventDefault();
    $(e.target).parent('li').find('.layers').toggle();
    $(e.target).parent('li').find('.filters').toggle();
  }

  static splitScreen(e) {
    e.preventDefault();
    $('#map-1').css('width', '52%');
    $('#map-2, #sector-menu-2-wrapper .open-btn').show();
    window.maps[0].resize();
    window.maps[1].resize();
  }

  static singleScreen(e) {
    e.preventDefault();
    $('#map-1').css('width', '100%');
    $('#map-2, #sector-menu-2').hide();
    $('#sector-menu-2-wrapper .open-btn').hide();
    window.maps[0].resize();
    window.maps[1].resize();
  }

  static toggleSectors(e) {
    e.preventDefault();
    $(e.target).parents('.sectors-menu-wrapper').find('.sectors-menu').toggle();
    $(e.target).parents('.sectors-menu-wrapper').find('.framework-sectors-menu').toggle();
    $(e.target).parents('.sectors-menu-wrapper').find('.open-btn').toggle();
    $(e.target).parents('.sectors-menu-wrapper').find('.framework-open-btn').toggle();
  }

  constructor(props) {
    super(props);
    this.state = {
      layers: [],
      sectors: [],
      view: this.props.appConfig.defaultView,
      filters: [],
    };
    this.changeLayer = this.changeLayer.bind(this);
    this.sectorClick = App.showSector.bind(this);
    this.splitScreen = App.splitScreen.bind(this);
    this.singleScreen = App.singleScreen.bind(this);
    this.toggleSectors = App.toggleSectors.bind(this);
    this.toggleView = this.toggleView.bind(this);
    this.getFilters = this.getFilters.bind(this);
    this.viewClick = this.viewClick.bind(this);
  }

  changeLayer(layer, status, map) {
      const layers = [
        ...this.state.layers,
        {
          title: layer,
          visible: status,
          map,
        },
      ];
      this.setState({ layers });
  }

  toggleView(view) {
    this.setState({ view });
  }

  getFilters(group, filter, status) {
    let filters = [...this.state.filters, { [group]: filter }];
    if (this.state.filters.length > 0) {
      for (let i = 0; i < this.state.filters.length; i += 1) {
        let sector = Object.keys(this.state.filters[i])[0];
        if (sector === group) {
          let filteredArr = this.state.filters.filter(f => Object.keys(f)[0] !== group);
          filters = [...filteredArr, { [group]: filter }];
        }
      }
    }

    this.setState({ filters });
  }

  viewClick(layer, sector) {
    this.setState({ layer, sector });
  }

  render() {
    const { changeLayer } = this;
    const { sectorClick } = this;
    const { toggleSectors } = this;
    const { splitScreen } = this;
    const { singleScreen } = this;
    const { toggleView } = this;
    const { getFilters } = this;
    const { viewClick } = this;
    const layers = this.state;
    const sectorData = this.props.sectorData;
    const layerData = this.props.layerData;
    const styles = this.props.styles;
    const appConfig = this.props.appConfig;
    const currentView = this.state.view;
    const details = this.props.details;
    const filters = this.state.filters.map(filter => filter[Object.keys(filter)[0]]);
    const selected = this.state.layer;
    const showSector = this.state.sector;
    return (
      <div>
        <Menu
          toggleSingleScreen={singleScreen}
          toggleSplitScreen={splitScreen}
          appConfig={appConfig}
        />
        {this.state.view === 'framework' ?
          <Framework
            sectorData={sectorData}
            details={details}
            onToggleView={toggleView}
            onViewClick={viewClick}
            onSectorClick={sectorClick}
            selected={selected}
            filters={filters}
          /> :
          <Map
            mapId="map-1"
            layerData={layerData}
            layers={layers}
            styles={styles}
            locations={this.props.locations}
            mapConfig={appConfig}
          />
        }
        <Sectors
          view={currentView}
          defaultView={appConfig.defaultView}
          sectorMenuId="sector-menu-1"
          mapTargetId="map-1"
          onToggleSectors={toggleSectors}
          onSectorClick={sectorClick}
          onToggleView={toggleView}
          onLayerChange={changeLayer}
          onFilterSelect={getFilters}
          sectorData={sectorData}
          layerData={layerData}
          filters={filters}
          selected={selected}
          showSector={showSector}
        />

        {appConfig.splitView ?
          <div>
            <Map
              mapId="map-2"
              layerData={layerData}
              layers={layers}
              styles={styles}
              locations={this.props.locations}
              mapConfig={appConfig}
            />
            <Sectors
              sectorMenuId="sector-menu-2"
              mapTargetId="map-2"
              onToggleSectors={toggleSectors}
              onToggleView={toggleView}
              onSectorClick={sectorClick}
              onLayerChange={changeLayer}
              onFilterSelect={getFilters}
              sectorData={sectorData}
              layerData={layerData}
              filters={filters}
              selected={selected}
              showSector={showSector}
            />
          </div>
          : null}
      </div>
    );
  }

}

App.propTypes = {
  appConfig: PropTypes.objectOf(PropTypes.any).isRequired,
  layerData: PropTypes.objectOf(PropTypes.any).isRequired,
  locations: PropTypes.objectOf(PropTypes.any).isRequired,
  sectorData: PropTypes.arrayOf(PropTypes.any).isRequired,
  styles: PropTypes.arrayOf(PropTypes.any).isRequired,
  details: PropTypes.objectOf(PropTypes.any).isRequired,
};

export default App;
