/**
 * Mapviewer configuration reducer.
 * @module reducers/mapViewerConfigReducer
 */

import { MAPVIEWER_CONFIG } from '../../actions';

const initialState = {
  error: null,
  loaded: false,
  loading: false,
  mapviewer_config: {},
};

export const mapViewerConfigReducer = (state = initialState, action = {}) => {
  switch (action?.type) {
    case `${MAPVIEWER_CONFIG}_PENDING`:
      return {
        ...state,
        error: null,
        loaded: false,
        loading: true,
      };
    case `${MAPVIEWER_CONFIG}_FAIL`:
      return {
        ...state,
        error: action.error,
        loaded: false,
        loading: false,
      };

    case `${MAPVIEWER_CONFIG}_SUCCESS`:
      return {
        ...state,
        error: null,
        loaded: true,
        loading: false,
        mapviewer_config: action.result,
      };
    default:
      return state;
  }
};
