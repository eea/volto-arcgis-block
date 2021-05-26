import config from '@plone/volto/registry';
export const Schema = () => {
  // console.log("config: ", config)
  const templatesConfig = config.blocks.blocksConfig['arcgis_block'].templates;
  const templates = Object.keys(templatesConfig).map((template) => [
    template,
    templatesConfig[template].title || template,
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
        choices: [...templates],
        default: 'default',
      },
    },
    required: ['style'],
  };
};
