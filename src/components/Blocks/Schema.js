import config from '@plone/volto/registry';
import { ARCGIS_BLOCK } from '@eeacms/volto-arcgis-block/constants';

export const Schema = () => {
  const stylesConfig = config.blocks.blocksConfig[ARCGIS_BLOCK].styles;
  const styles = Object.keys(stylesConfig).map((style) => [
    style,
    stylesConfig[style].title || style,
  ]);

  const extraMenuConfig = config.blocks.blocksConfig[ARCGIS_BLOCK].extraMenu;
  const extraMenu = Object.keys(extraMenuConfig).map((extraMenu) => [
    extraMenu,
    extraMenuConfig[extraMenu].title || extraMenu,
  ]);

  return {
    title: 'Map default',
    fieldsets: [
      {
        id: 'default',
        title: 'Default',
        fields: ['customClass', 'extraMenu'],
        // 'style',
      },
    ],
    properties: {
      // style: {
      //   title: 'Map style (Beta)',
      //   description:
      //     'Note 1: To see the results it is necessary to refresh the browser. Note 2: Only the last import of the style will take effect, only one style can be used for all maps.',
      //   choices: [
      //     ['default-light', 'Default Light'],
      //     ['light-blue', 'Light blue'],
      //     ['light-green', 'Light green'],
      //     ['light-purple', 'Light purple'],
      //     ['light-red', 'Light red'],
      //     ['dark', 'Dark'],
      //     ['dark-blue', 'Dark Blue'],
      //     ['dark-green', 'Dark Green'],
      //     ['dark-purple', 'Dark Purple'],
      //     ['dark-red', 'Dark Red'],
      //   ],
      //   default: 'default-light',
      // },
      customClass: {
        title: 'Custom Style',
        description: 'Select customization design',
        choices: [...styles],
        default: 'default',
      },
      extraMenu: {
        title: 'Extra menu (WIP)',
        description: 'Add extra menu component',
        choices: [...extraMenu],
        default: 'default',
      },
    },
    required: ['style'],
  };
};
