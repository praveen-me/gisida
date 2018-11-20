
const defaultState = {
  APP: {
    mapConfig: {
      container: 'map',
      style: 'mapbox://styles/ona/cj13lidxb00062rpd2o5vph3q',
      center: [
        0,
        0,
      ],
      zoom: 5,
    },
    accessToken: false,
    appName: 'React Gisida',
    loaded: false,
  },
  STYLES: [
    {
      label: 'Satelitte',
      url: 'mapbox://styles/mapbox/satellite-v9',
    },
    {
      label: 'Satelitte Streets',
      url: 'mapbox://styles/mapbox/satellite-streets-v9',
    },
  ],
  REGIONS: [
  ],
  MAP: {
    isRendered: false,
    isLoaded: false,
    reloadLayers: false,
    currentStyle: '',
    currentRegion: '',
    layers: {},
    defaultLayers: [],
    oldLayerObj: {},
    showSpinner: false,
    menuIsOpen: true,
    openCategories: [],
    timeseries: {
      visibility: false,
    },
    visibleLayerId: '',
    filter: {
      isFiltered: false,
      prevFilters: null,
      layerId: '',
      filters: {},
      filterOptions: {},
      isOpen: false,
      isMac: (window.navigator.platform.indexOf('Mac') !== -1),
      isLinux: (window.navigator.platform.indexOf('Linux') !== -1),
      globalSearchField: false,
    },
    detailView: null,
    showProfile: false,
    showFilterPanel: false,
    activeLayerId: '',
    lastLayerSelected: '',
    primaryLayer: '',
    reloadLayerId: null,
  },
  AUTH: {
    isFetching: false,
    isAuthenticated: !!localStorage.getItem('access_token'),
  },
  FILTER: {},
  LAYERS: {
    layers: [],
    groups: {},
  },
};

export default (window && window._gisida && window._gisida.defaultState) || defaultState;
