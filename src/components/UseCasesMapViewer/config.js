const markerType = 'simple-marker';

const spatialMarkerSize = '8px';
const yellow = '#fcec00';
const blue = '#243f9c';
const greenSpatial = '#a2b32e';
const black = '#000000';

const regionMarkerSize = '40px';
const regionOutlineSize = '6px';
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
    Highlight_service:
      'https://trial.discomap.eea.europa.eu/arcgis/rest/services/CLMS/UseCasesWorldCountries/MapServer/1',
    RegionLayer:
      'https://bm-eugis.tk/arcgis/rest/services/CLMS/UseCasesRegion_count/MapServer/0',
    SpatialCoverageLayer:
      'https://bm-eugis.tk/arcgis/rest/services/CLMS/UseCasesSpatialCoverage/MapServer/0',
  },
  Codes: {
    EU: [
      'BE',
      'EL',
      'LT',
      'PT',
      'BG',
      'ES',
      'LU',
      'RO',
      'CZ',
      'FR',
      'HU',
      'SI',
      'DK',
      'HR',
      'MT',
      'SK',
      'DE',
      'IT',
      'NL',
      'FI',
      'EE',
      'CY',
      'AT',
      'SE',
      'IE',
      'LV',
      'PL',
      'UK',
    ],
    EEA: [
      'AT',
      'BE',
      'BG',
      'CH',
      'CY',
      'CZ',
      'DE',
      'DK',
      'EE',
      'EL',
      'ES',
      'FI',
      'FR',
      'HR',
      'HU',
      'IE',
      'IS',
      'IT',
      'LI',
      'LT',
      'LU',
      'LV',
      'MT',
      'NL',
      'NO',
      'PL',
      'PT',
      'RO',
      'SE',
      'SI',
      'SK',
      'TR',
      //COOPERATIVES
      'AL',
      'BA',
      'XK',
      'ME',
      'MK',
      'RS',
      //FORMER MEMBER COUNTRY
      'UK',
    ],
  },

  HightlightRenderer: {
    type: 'unique-value',
    field: 'LEVL_CODE',
    defaultSymbol: {
      type: 'simple-fill',
      color: [172, 186, 71, 0.2],
      outline: {
        width: 1,
        color: greenRegion,
      },
    },
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
