/**
 * Root reducer.
 * @module reducers/root
 */

// import defaultReducers from '@plone/volto/reducers';
import { mapViewerConfigReducer } from './mapviewer/mapviewer_reducer';
/**
 * Root reducer.
 * @function
 * @param {Object} state Current state.
 * @param {Object} action Action to be handled.
 * @returns {Object} New state.
 */
const reducers = {
  // ...defaultReducers,
  // Add your reducers here
  mapviewer_config: mapViewerConfigReducer,
};

export default reducers;
