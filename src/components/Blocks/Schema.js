export const Schema = () => ({
  title: 'Button default',
  fieldsets: [
    {
      id: 'default',
      title: 'Default',
      fields: ['style'],
    },
  ],
  properties: {
    style: {
      title: 'Map style',
      description: 'To see the results it is necessary to refresh the browser',
      choices: [
        ['light', 'Light'],
        ['dark', 'Dark'],
      ],
      default: 'light',
    },
  },
  required: ['style'],
});
