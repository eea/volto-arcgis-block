import config from '@plone/volto/registry';
import { ARCGIS_BLOCK } from '@eeacms/volto-arcgis-block/constants';

export const Schema = () => {
  const stylesConfig = config.blocks.blocksConfig[ARCGIS_BLOCK].styles;
  const styles = Object.keys(stylesConfig).map((style) => [
    style,
    stylesConfig[style].title || style,
  ]);
  return {
    title: 'Button default',
    fieldsets: [
      {
        id: 'default',
        title: 'Default',
        fields: ['style', 'customClass'],
      },
    ],
    properties: {
      style: {
        title: 'Map style',
        description:
          'To see the results it is necessary to refresh the browser',
        choices: [
          ['light', 'Light'],
          ['dark', 'Dark'],
        ],
        default: 'light',
      },
      customClass: {
        title: 'Customization class',
        description: 'Select customization design',
        choices: [...styles],
        default: 'default',
      },
    },
    required: ['style'],
  };
};
