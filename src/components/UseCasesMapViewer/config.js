const markerType = 'simple-marker';

const spatialMarkerSize = '8px';
const yellow = '#fcec00';
const blue = '#243f9c';
const greenSpatial = '#a2b32e';
const black = '#000000';

const regionMarkerSize = '40px';
const regionOutlineSize = '8px';
const regionLabelTextPosition = 'center-center';
const grey = '#656565';
const greenRegion = '#acba47';

const config = {
  Map: {
    div: 'mapDiv',
    title: 'Geographical coverage of use cases',
    center: [10.78, 30],
    zoom: 0,
    maxZoom: 5,
    worldDimensions: { height: 256, width: 256 },
    prohibitedKeys: [
      '+',
      '-',
      'Shift',
      '_',
      '=',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
    ],
  },
  Services: {
    RegionLayer:
      'https://bm-eugis.tk/arcgis/rest/services/CLMS/UseCasesRegion_count/MapServer/0',
    SpatialCoverageLayer:
      'https://bm-eugis.tk/arcgis/rest/services/CLMS/UseCasesSpatialCoverage/MapServer/0',
  },

  SpatialRenderer: {
    type: 'unique-value',
    field: 'Spatial_coverage',
    defaultSymbol: {
      type: markerType,
      size: spatialMarkerSize,
      outline: null,
      color: yellow,
    },
    uniqueValueInfos: [
      {
        value: 'EU',
        symbol: {
          type: markerType,
          size: spatialMarkerSize,
          outline: null,
          color: blue,
        },
      },
      {
        value: 'EEA',
        symbol: {
          type: markerType,
          size: spatialMarkerSize,
          outline: null,
          color: greenSpatial,
        },
      },
      {
        value: 'Global',
        symbol: {
          type: markerType,
          size: spatialMarkerSize,
          outline: null,
          color: black,
        },
      },
    ],
  },
  RegionMarkerRenderer: {
    type: 'unique-value',
    field: 'COUNT',
    defaultSymbol: {
      type: markerType,
      size: regionMarkerSize,
      color: grey,
      outline: {
        width: regionOutlineSize,
        color: greenRegion,
      },
    },
  },
  RegionLabel: {
    symbol: {
      type: 'text',
      color: 'white',
      font: {
        weight: 'bold',
      },
    },
    labelPlacement: regionLabelTextPosition,
    labelExpressionInfo: {
      expression: '$feature.COUNT',
    },
  },
};

export default config;
