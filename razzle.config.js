// webpack.config.js
const ArcGISPlugin = require('@arcgis/webpack-plugin');

// add it to config
module.exports = {
  plugins: [new ArcGISPlugin()],
};
