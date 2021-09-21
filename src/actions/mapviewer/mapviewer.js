/**
 * Get mapviewer configuration actions.
 * @module actions/postMeetingRegister
 */
export const MAPVIEWER_CONFIG = 'MAPVIEWER_CONFIG';

/**
 * Get mapviewer configuration.
 * @function MapViewerConfig
 * @returns {Object} Get extra items action.
 */
export function MapViewerConfig(url) {
  return {
    type: MAPVIEWER_CONFIG,
    request: {
      op: 'get',
      path: `${url}/@mapviewer`,
    },
  };
}
