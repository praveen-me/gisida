import React from 'react';
import PropTypes from 'prop-types';
import Filter from '../Filter/Filter';

require('./Filters.scss');

const Filters = ({ filters, headers, views, onToggleView }) =>
  (<ul className="filters">
    {views ?
      views.map(view =>
        (<Filter
          key={view}
          view={view}
          headers={headers}
          onToggleView={onToggleView}
        />)) :
      filters.map(filter =>
        (<Filter
          key={filter}
          filter={filter}
          headers={headers}
        />))
    }
  </ul>);

Filters.propTypes = {
  filters: PropTypes.arrayOf(PropTypes.any),
  headers: PropTypes.arrayOf(PropTypes.any),
  views: PropTypes.arrayOf(PropTypes.any),
  onToggleView: PropTypes.func.isRequired,
};

Filters.defaultProps = {
  headers: [],
  filters: null,
  views: null,
};

export default Filters;