import loadable from '@loadable/component';

import world from '@plone/volto/icons/world.svg';
import menu from '@plone/volto/icons/menu.svg';

import {
  MapViewerView,
  MapViewerEdit,
  UseCasesMapViewerView,
  UseCasesMapViewerEdit,
} from '@eeacms/volto-arcgis-block/components';
import { ARCGIS_BLOCK } from '@eeacms/volto-arcgis-block/constants';
import { USE_CASES_BLOCK } from '@eeacms/volto-arcgis-block/constants';
// CUSTOM REDUCERS IMPORT
import reducers from './reducers';

export default function applyConfig(config) {
  config.blocks.blocksConfig[ARCGIS_BLOCK] = {
    id: ARCGIS_BLOCK, // The name (id) of the block
    title: 'Arcgis Map', // The display name of the block
    icon: world, // The icon used in the block chooser
    group: 'common', // The group (blocks can be grouped, displayed in the chooser)
    view: MapViewerView, // The view mode component
    edit: MapViewerEdit, // The edit mode component
    restricted: false, // If the block is restricted, it won't show in the chooser
    mostUsed: false, // A meta group `most used`, appearing at the top of the chooser
    blockHasOwnFocusManagement: false, // Set this to true if the block manages its own focus
    sidebarTab: 1, // The sidebar tab you want to be selected when selecting the block
    security: {
      addPermission: [], // Future proof (not implemented yet) add user permission role(s)
      view: [], // Future proof (not implemented yet) view user role(s)
    },
    styles: {
      default: {
        title: 'Default',
        customClass: null,
      },
    },
    extraMenu: {
      default: {
        title: 'Default (None)',
        component: null,
      },
    },
  };

  config.blocks.blocksConfig[USE_CASES_BLOCK] = {
    id: USE_CASES_BLOCK, // The name (id) of the block
    title: 'Use Cases Map', // The display name of the block
    icon: menu, // The icon used in the block chooser
    group: 'common', // The group (blocks can be grouped, displayed in the chooser)
    view: UseCasesMapViewerView, // The view mode component
    edit: UseCasesMapViewerEdit, // The edit mode component
    restricted: false, // If the block is restricted, it won't show in the chooser
    mostUsed: false, // A meta group `most used`, appearing at the top of the chooser
    blockHasOwnFocusManagement: false, // Set this to true if the block manages its own focus
    sidebarTab: 1, // The sidebar tab you want to be selected when selecting the block
    security: {
      addPermission: [], // Future proof (not implemented yet) add user permission role(s)
      view: [], // Future proof (not implemented yet) view user role(s)
    },
  };
  config.addonReducers = {
    ...config.addonReducers,
    ...reducers,
  };

  config.settings.loadables.highcharts = loadable.lib(
    () => import('highcharts'),
  );

  if (!config.settings.loadables.fontAwesome) {
    config.settings.loadables.fontAwesome = loadable.lib(
      () => import('@fortawesome/react-fontawesome'),
    );
  }

  return config;
}
