require('./App.scss');
import React from 'react';
import { Component } from 'react';
import Menu from '../Menu/Menu';
import Map from '../Map/Map';
import Sectors from '../Sectors/Sectors';
window.maps = [];

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      layers: [],
      sectors: [],
    };
    this.changeLayer = this.changeLayer.bind(this);
    this.sectorClick = this.showSector.bind(this);
    this.splitScreen = this.splitScreen.bind(this);
    this.singleScreen = this.singleScreen.bind(this);
    this.toggleSectors = this.toggleSectors.bind(this);
    let splitScreenOn;
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

  showSector(e) {
    e.preventDefault();
    $(e.target).parent('li').find('.layers').toggle();
  }

  splitScreen(e) {
    e.preventDefault();
    $('#map-1').css('width', '52%');
    $('#map-2, #sector-menu-2-wrapper .open-btn').show();
    window.maps[0].resize();
    window.maps[1].resize();
  }

  singleScreen(e) {
    e.preventDefault();
    $('#map-1').css('width', '100%');
    $('#map-2, #sector-menu-2').hide();
    $('#sector-menu-2-wrapper .open-btn').hide();
    window.maps[0].resize();
    window.maps[1].resize();
  }

  toggleSectors(e) {
    e.preventDefault();
    $(e.target).parents('.sectors-menu-wrapper').find('.sectors-menu').toggle();
    $(e.target).parents('.sectors-menu-wrapper').find('.open-btn').toggle();
  }

  componentDidUpdate() {
    console.log('component updated');
  }

  render() {
    const { changeLayer } = this;
    const { sectorClick } = this;
    const { toggleSectors } = this;
    const { splitScreen } = this;
    const { singleScreen } = this;
    const layers = this.state;
    const sectorData = this.props.sectorData;
    const layerData = this.props.layerData;
    const styles = this.props.styles;
    const appName = this.props.appConfig.appName
    const appNameCaps = this.props.appConfig.appNameCaps

    return (
      <div>
        <Menu toggleSingleScreen={singleScreen} toggleSplitScreen={splitScreen} appConfig={this.props.appConfig}/>
        <Map mapId="map-1" layerData={layerData} layers={layers} styles={styles} />
        <Map mapId="map-2" layerData={layerData} layers={layers} styles={styles} />
        <Sectors sectorMenuId="sector-menu-1" mapTargetId="map-1" onToggleSectors={toggleSectors} onSectorClick={sectorClick} onLayerChange={changeLayer} sectorData={sectorData} layerData={layerData} />
        <Sectors sectorMenuId="sector-menu-2" mapTargetId="map-2" onToggleSectors={toggleSectors} onSectorClick={sectorClick} onLayerChange={changeLayer} sectorData={sectorData} layerData={layerData} />
      </div>
    );
  }

}

export default App;
