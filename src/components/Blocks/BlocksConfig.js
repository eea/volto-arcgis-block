import world from '@plone/volto/icons/world.svg';
import View from './View';
import Edit from './Edit';
import { ARCGIS_BLOCK } from '@eeacms/volto-arcgis-block/constants';

const BlocksConfig = (config) => ({
  ...config.blocks.blocksConfig,
  [ARCGIS_BLOCK]: {
    id: ARCGIS_BLOCK, // The name (id) of the block
    title: 'Arcgis Map', // The display name of the block
    icon: world, // The icon used in the block chooser
    group: 'common', // The group (blocks can be grouped, displayed in the chooser)
    view: View, // The view mode component
    edit: Edit, // The edit mode component
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
      land: {
        title: 'Land',
        customClass: 'land',
      },
    },
  },
});
export default BlocksConfig;
