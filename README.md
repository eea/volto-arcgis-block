# [WIP] Volto Arcgis Block
## ArcGIS Map integration for Volto blocks
****This product is in development, at this time it is not recommended to use it.***

![Demo example volto-arcgis-block](docs/demo.gif)

## Styling
To create custom styles, we need to add it in the block configuration and import the Less file into our project.

1. Add the new styles in the [custom Blocks configuration](https://docs.voltocms.com/blocks/settings/#configuring-a-new-block):

````JS
import { ARCGIS_BLOCK } from '@eeacms/volto-arcgis-block/constants';

const customBlocks = (config) => ({
  ...config.blocks.blocksConfig,
  [ARCGIS_BLOCK]: {
    ...config.blocks.blocksConfig[ARCGIS_BLOCK],
    styles: {
      ...config.blocks.blocksConfig[ARCGIS_BLOCK]?.styles,
      land: {
        title: 'Land style',
        customClass: 'land',
      },
    },
  },
````

2. Import the CSS in your project:

````CSS
@import url('maps.less');
````
3. CSS structure:
````LESS
.land { // <-- Wrap your design inside a class with the name you used in customClass
    .map {
        width: 100%;
        height: 600px;
        padding: 0;
        margin: 0;
    }

    .esri-view .esri-view-surface--inset-outline:focus::after {
        outline: none !important;
    }

    .esri-component.esri-zoom.esri-widget {
        margin-bottom: 0;
        box-shadow: none;
    }
}
````


***Note: If the style selector does not show your new style, try to change the order of the declaration of the addons in package.json, giving preference to volto-arcgis-block***
````
"addons": [
    "@eeacms/volto-arcgis-block",
    "@eeacms/volto-clms-theme"
  ],
````
![Style example volto-arcgis-block](docs/styles_example.gif)