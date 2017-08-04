import React from 'react';
import PropTypes from 'prop-types';
import Layer from '../Layer/Layer';

const Layers = ({ mapTargetId, layers, sector, layerData, headers, defaultView, onLayerChange = f => f, selected, showSector }) =>
  (<ul className="layers" style={{
    display: `${sector === showSector ? 'block' : 'none'}`
  }}>
    {layers.map(layer =>
      (<Layer
        onLayerChange={onLayerChange}
        key={layer}
        mapTargetId={mapTargetId}
        layer={layer}
        layerData={layerData}
        headers={headers}
        defaultView={defaultView}
        sector={sector}
        selected={selected}
      />))
    }
  </ul>);

Layers.propTypes = {
  mapTargetId: PropTypes.string.isRequired,
  layers: PropTypes.arrayOf(PropTypes.any),
  layerData: PropTypes.objectOf(PropTypes.any).isRequired,
  onLayerChange: PropTypes.func.isRequired,
  headers: PropTypes.arrayOf(PropTypes.any),
  defaultView: PropTypes.string.isRequired,
};

Layers.defaultProps = {
  headers: [],
  layers: [],
};

export default Layers;
