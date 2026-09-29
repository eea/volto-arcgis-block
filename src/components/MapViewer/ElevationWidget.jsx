import React, { createRef } from 'react';
//import "@arcgis/core/assets/esri/css/main.css";
//import "./css/ArcgisMap.css";
import { loadModules } from 'esri-loader';

var Map,
  SceneView,
  WMTSLayer,
  ElevationLayer,
  BaseElevationLayer,
  BaseTileLayer,
  Expand,
  Legend,
  LayerList;

const CDSE_PROCESS_URL = 'https://sh.dataspace.copernicus.eu/process/v1';
const CDSE_TOKEN_URL =
  'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';

const CDSE_CLIENT_ID = '';
const CDSE_CLIENT_SECRET = '';
const DEBUG = false;
const ET_WMTS_URL =
  'https://sh.dataspace.copernicus.eu/ogc/wmts/4d893262-0435-430e-81bf-54a032374ecb';
const ET_WMTS_LAYER_ID = 'A_ET_ENSEMBLE';
const ET_BYOC_COLLECTION_ID = 'byoc-24fd5fde-b9db-44f1-a32b-e5dc3a0c5b9b';
const ET_PROCESS_DATE_FROM = '2026-05-11T00:00:00Z';
const ET_PROCESS_DATE_TO = '2026-05-11T23:59:59Z';
const ET_WMTS_TIME = '2026-05-11/2026-05-11';

const WEB_MERCATOR_TILE_INFO = {
  size: [256, 256],
  origin: { x: -20037508.342787, y: 20037508.342787 },
  spatialReference: { wkid: 3857 },
  lods: Array.from({ length: 16 }, function (_, i) {
    return {
      level: i,
      resolution: 26080.00 / Math.pow(2, i),
      scale: 591657527.591555 / Math.pow(2, i),
    };
  }),
};
// const WEB_MERCATOR_TILE_INFO = {
//   size: [256, 256],
//   origin: { x: -20037508.342787, y: 20037508.342787 },
//   spatialReference: { wkid: 3857 },
//   lods: Array.from({ length: 16 }, function (_, i) {
//     return {
//       level: i,
//       resolution: 156543.033928 / Math.pow(2, i),
//       scale: 591657527.591555 / Math.pow(2, i),
//     };
//   }),
// };
var _diagArcgisDone = false;
var _diagCdseDone = false;
var _diagEtDone = false;
class ElevationWidget extends React.Component {
  /**
   * Creator of the Basemap widget class
   * @param {*} props
   */

  constructor(props) {
    super(props);
    //We create a reference to a DOM element to be mounted
    this.container = createRef();
    //Initially, we set the state of the component to
    //not be showing the basemap panel
    this.state = {
      showMapMenu: false,
    };
    this.mapViewer = this.props.mapViewer;
    this.map = this.props.map;
    this.view = this.props.view;
    this.layers = this.props.layers;
  }
  loader() {
    return loadModules([
      'esri/Map',
      'esri/views/SceneView',
      'esri/layers/WMTSLayer',
      'esri/layers/ElevationLayer',
      'esri/layers/BaseElevationLayer',
      'esri/layers/BaseTileLayer',
      'esri/widgets/Expand',
      'esri/widgets/Legend',
      'esri/widgets/LayerList',
      'esri/widgets/Legend/LegendViewModel',
    ]).then(
      ([
        _Map,
        _SceneView,
        _WMTSLayer,
        _ElevationLayer,
        _BaseElevationLayer,
        _BaseTileLayer,
        _Expand,
        _Legend,
        _LayerList,
      ]) => {
        [
          Map,
          SceneView,
          WMTSLayer,
          ElevationLayer,
          BaseElevationLayer,
          BaseTileLayer,
          Expand,
          Legend,
          LayerList,
        ] = [
          _Map,
          _SceneView,
          _WMTSLayer,
          _ElevationLayer,
          _BaseElevationLayer,
          _BaseTileLayer,
          _Expand,
          _Legend,
          _LayerList,
        ];
      },
    );
  }

  // Returns a cached OAuth token provider for CDSE client-credentials flow.



  // Logs the structural properties and value range of a BaseElevationLayer tile object.
  diagLogTileStructure(label, tileData, level, row, col) {
    var keys = tileData ? Object.keys(tileData) : [];
    var values = tileData && tileData.values;
    console.group(
      '[DIAG] ' + label + '  tile ' + level + '/' + row + '/' + col,
    );
    console.log('keys:', keys);
    console.log(
      'width:',
      tileData && tileData.width,
      'height:',
      tileData && tileData.height,
      'noDataValue:',
      tileData && tileData.noDataValue,
    );
    if (values) {
      var min = Infinity,
        max = -Infinity,
        nanCount = 0;
      for (var i = 0; i < values.length; i++) {
        if (!Number.isFinite(values[i])) {
          nanCount++;
          continue;
        }
        if (values[i] < min) min = values[i];
        if (values[i] > max) max = values[i];
      }
      console.log('values.constructor:', values.constructor.name);
      console.log(
        'values.length:',
        values.length,
        '(expected ' + tileData.width * tileData.height + ')',
      );
      console.log(
        'range (m): min=' + min.toFixed(2) + '  max=' + max.toFixed(2),
      );
      console.log('non-finite count:', nanCount);
      console.log('values[0..9]:', Array.from(values.slice(0, 10)));
    } else {
      console.warn(
        "'values' NOT found – ArcGIS cannot use this tile for elevation.",
      );
    }
    console.groupEnd();
  }

  // Normalizes a Float32 elevation array to greyscale and triggers a PNG download.
  diagSaveValuesAsPng(values, width, height, filename) {
    if (!values || !width || !height) return;
    var min = Infinity,
      max = -Infinity;
    for (var i = 0; i < values.length; i++) {
      if (!Number.isFinite(values[i])) continue;
      if (values[i] < min) min = values[i];
      if (values[i] > max) max = values[i];
    }
    var range = max - min || 1;
    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext('2d');
    var imgData = ctx.createImageData(width, height);
    for (var j = 0; j < values.length; j++) {
      var n = Number.isFinite(values[j])
        ? Math.round(((values[j] - min) / range) * 255)
        : 0;
      imgData.data[j * 4] = n;
      imgData.data[j * 4 + 1] = n;
      imgData.data[j * 4 + 2] = n;
      imgData.data[j * 4 + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
    canvas.toBlob(function (blob) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  // Triggers a direct download of a raw Blob as PNG.
  diagSaveBlobAsPng(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // initializeUtilityWidgets() {
  //   this.legend = new Legend({
  //     view: this.view,
  //   });

  //   this.legendExpand = new Expand({
  //     view: this.view,
  //     content: legend,
  //     expandIconClass: 'esri-icon-legend',
  //     expandTooltip: 'Legend',
  //     expanded: false,
  //   });

  //   this.layerList = new LayerList({
  //     view: this.view,
  //   });

  //   this.layerListExpand = new Expand({
  //     view: this.view,
  //     content: layerList,
  //     expandIconClass: 'esri-icon-layer-list',
  //     expandTooltip: 'Layer list',
  //     expanded: false,
  //   });

  //   // WIDGETS
  //   this.view.ui.add(layerListExpand, 'top-right');
  //   this.view.ui.add(legendExpand, 'top-right');
  // }

  getByocCollection(layer) {
    let byocCollectionId =
      layer?.datasetDownloadInformation?.items[0].byoc_collection || null;
    return byocCollectionId;
  }

  openMenu() {
    this.loader().then(() => {
      function createCdseTokenProvider(clientId, clientSecret, tokenUrl) {
        let token = null;
        let tokenExpiration = 0;

        return async function getToken() {
          if (token && tokenExpiration > Date.now()) {
            return token;
          }

          const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              grant_type: 'client_credentials',
              client_id: clientId,
              client_secret: clientSecret,
            }),
          });

          if (!response.ok) {
            const text = await response.text();
            throw new Error('Token error ' + response.status + ': ' + text);
          }

          const data = await response.json();
          token = data.access_token;
          tokenExpiration = Date.now() + data.expires_in * 1000;
          return token;
        };
      }

      // Converts XYZ tile coordinates to an EPSG:3857 bounding box.
      function tileToBBox3857(tileInfo, level, row, col) {
        const origin = tileInfo.origin;
        const resolution = tileInfo.lods[level].resolution;
        const tileSize = tileInfo.size[0];
        const xmin = origin.x + col * tileSize * resolution;
        const ymax = origin.y - row * tileSize * resolution;
        const xmax = xmin + tileSize * resolution;
        const ymin = ymax - tileSize * resolution;

        return { west: xmin, south: ymin, east: xmax, north: ymax };
      }

      // Loads a Blob as HTMLImageElement to be consumed by canvas operations.
      function blobToImage(blob) {
        return new Promise(function (resolve, reject) {
          const imageUrl = URL.createObjectURL(blob);
          const image = new Image();

          image.onload = function () {
            URL.revokeObjectURL(imageUrl);
            resolve(image);
          };

          image.onerror = function (error) {
            URL.revokeObjectURL(imageUrl);
            reject(error);
          };

          image.src = imageUrl;
        });
      }
        // Decodes Terrarium-like RGB PNG values into a Float32 array.
      function decodeTerrariumPng(pngBlob, width, height) {
        return blobToImage(pngBlob).then(function (image) {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext('2d');

          context.drawImage(image, 0, 0, width, height);

          const imageData = context.getImageData(0, 0, width, height).data;
          const elevation = new Float32Array(width * height);

          for (let i = 0; i < width * height; i += 1) {
            const red = imageData[i * 4];
            const green = imageData[i * 4 + 1];
            const blue = imageData[i * 4 + 2];

            let value = red * 256 + green + blue / 256 - 32768;
            if (!Number.isFinite(value)) {
              value = 0;
            }

            elevation[i] = value;
          }

          return elevation;
        });
      }
      // ELEVATION LAYER SUBCLASSES FOR SURFACES EXTRUSION
      // Elevation layer subclass encoded as Terrarium-like PNG values for ground extrusion.
      const CopernicusElevationLayer = BaseElevationLayer.createSubclass({
        properties: {
          clientId: null,
          clientSecret: null,
          tokenUrl: CDSE_TOKEN_URL,
          processUrl: CDSE_PROCESS_URL,
          tokenProvider: null,
          collectionId: null,
          timeFrom: '2025-01-01T00:00:00Z', // Default time
          timeTo: '2025-01-02T00:00:00Z', // Default time.
          exaggeration: 10,
          tms: false,
        },

        // Gets a valid token using lazy initialization and in-memory caching.
        _getToken: function () {
          if (!this.tokenProvider) {
            this.tokenProvider = createCdseTokenProvider(
              this.clientId,
              this.clientSecret,
              this.tokenUrl,
            );
          }

          return this.tokenProvider();
        },

        // For this example the layer name SWI001 is hardcoded, need to be changed accordingly to the layer to be displayed
        // This evalscript is unique and encodes the input layer values into Terrarium-like RGB bytes for PNG transport.
        _getEvalscript: function () {
          return [
            '//VERSION=3',
            'function setup() {',
            '  return { input: ["DMP", "dataMask"], output: { bands: 3, sampleType: "UINT8" } };',
            '}',
            'function evaluatePixel(sample) {',
            '  var swi = sample.dataMask === 1 ? sample.DMP : 0;',
            '  var encoded = swi + 32768;',
            '  var red = Math.floor(encoded / 256);',
            '  var green = Math.floor(encoded - 256 * red);',
            '  var blue = Math.floor(256 * (encoded - green - 256 * red));',
            '  return [red, green, blue];',
            '}',
          ].join('\n');
          // return [
          //   '//VERSION=3',
          //   'function setup() {',
          //   '  return { input: ["SWI001", "dataMask"], output: { bands: 3, sampleType: "UINT8" } };',
          //   '}',
          //   'function evaluatePixel(sample) {',
          //   '  var swi = sample.dataMask === 1 ? sample.SWI001 : 0;',
          //   '  var encoded = swi + 32768;',
          //   '  var red = Math.floor(encoded / 256);',
          //   '  var green = Math.floor(encoded - 256 * red);',
          //   '  var blue = Math.floor(256 * (encoded - green - 256 * red));',
          //   '  return [red, green, blue];',
          //   '}',
          // ].join('\n');
        },

        // Requests a layer tile from CDSE and returns elevation tile data.
        fetchTile: function (level, row, col, options) {
          let safeRow = row;
          if (this.tms) {
            const rowmax = 1 << level;
            safeRow = rowmax - row - 1;
          }

          const bbox = tileToBBox3857(this.tileInfo, level, safeRow, col);
          const width = this.tileInfo.size[0];
          const height = this.tileInfo.size[1];

          const payload = {
            input: {
              bounds: {
                bbox: [bbox.west, bbox.south, bbox.east, bbox.north],
                properties: {
                  crs: 'http://www.opengis.net/def/crs/EPSG/0/3857',
                },
              },
              data: [
                {
                  type: this.collectionId,
                  dataFilter: {
                    timeRange: { from: this.timeFrom, to: this.timeTo },
                  },
                  processing: {
                    upsampling: 'BILINEAR',
                    downsampling: 'BILINEAR',
                  },
                },
              ],
            },
            output: {
              width: width,
              height: height,
              responses: [
                { identifier: 'default', format: { type: 'image/png' } },
              ],
            },
            evalscript: this._getEvalscript(),
          };

          return this._getToken()
            .then(
              function (token) {
                return fetch(this.processUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + token,
                    Accept: 'image/png',
                  },
                  body: JSON.stringify(payload),
                  signal: options && options.signal,
                });
              }.bind(this),
            )
            .then(function (response) {
              if (!response.ok) {
                return response.text().then(function (text) {
                  throw new Error(
                    'SWI elevation process error ' +
                      response.status +
                      ': ' +
                      text,
                  );
                });
              }

              return response.blob();
            })
            .then(
              function (blob) {
                if (DEBUG && !_diagCdseDone) {
                  diagSaveBlobAsPng(
                    blob,
                    'swi_terrarium_raw_' +
                      level +
                      '_' +
                      row +
                      '_' +
                      col +
                      '.png',
                  );
                }
                return decodeTerrariumPng(blob, width, height);
              }.bind(this),
            )
            .then(
              function (elevationArray) {
                var exaggeration = this.exaggeration;
                if (exaggeration && exaggeration !== 1) {
                  for (var i = 0; i < elevationArray.length; i++) {
                    elevationArray[i] = elevationArray[i] * exaggeration;
                  }
                }
                var tile = {
                  values: elevationArray,
                  width: width,
                  height: height,
                  noDataValue: -9999,
                };
                if (DEBUG && !_diagCdseDone) {
                  _diagCdseDone = true;
                  diagLogTileStructure(
                    'CopernicusElevationLayer – decoded',
                    tile,
                    level,
                    row,
                    col,
                  );
                  diagSaveValuesAsPng(
                    elevationArray,
                    width,
                    height,
                    'decoded_greyscale_' +
                      level +
                      '_' +
                      row +
                      '_' +
                      col +
                      '.png',
                  );
                }
                return tile;
              }.bind(this),
            );
        },
      });

      // BASETILE LAYER SUBCLASS FOR VISUALIZATION
      // This is the way of displayng a layer using Process API instead of OGC services
      // SWI layer rendered through CDSE Process API using a BYOC collection.
      const CopernicusTileLayer = BaseTileLayer.createSubclass({
        properties: {
          clientId: null,
          clientSecret: null,
          tokenUrl: CDSE_TOKEN_URL,
          processUrl: CDSE_PROCESS_URL,
          tokenProvider: null,
          collectionId: null,
          timeFrom: '2025-01-01T00:00:00Z', // default date
          timeTo: '2025-01-02T00:00:00Z', // default date
        },

        // BaseTileLayer requires getTileUrl; this layer uses fetchTile instead.
        getTileUrl: function () {
          return null;
        },

        // Gets a valid token using lazy initialization and in-memory caching.
        _getToken: function () {
          if (!this.tokenProvider) {
            this.tokenProvider = createCdseTokenProvider(
              this.clientId,
              this.clientSecret,
              this.tokenUrl,
            );
          }

          return this.tokenProvider();
        },
        _getEvalscript: function () {
          return [
            '//VERSION=3',
            'const factor = 1 / 2;',
            'const offset = 0;',
            'function setup() {',
            '  return {',
            '    input: ["DMP", "dataMask"],',
            '    output: [',
            '      { id: "default", bands: 4, sampleType: "UINT8" },',
            '      { id: "index", bands: 1, sampleType: "FLOAT32" },',
            '      { id: "eobrowserStats", bands: 2, sampleType: "FLOAT32" },',
            '      { id: "dataMask", bands: 1 }',
            '    ]',
            '  };',
            '}',
            'function evaluatePixel(samples) {',
            '  var originalValue = samples.DMP;',
            '  var val = originalValue * factor + offset;',
            '  var dataMask = samples.dataMask;',
            '  var indexVal = dataMask === 1 ? val : NaN;',
            '  var imgVals = visualizer.process(val);',
            '  return {',
            '    default: imgVals.concat(dataMask * 255),',
            '    index: [indexVal],',
            '    eobrowserStats: [val, dataMask],',
            '    dataMask: [dataMask]',
            '  };',
            '}',
            'const ColorBar = [',
            '  [0.0, [148, 80, 23]],',
            '  [10.0, [172, 118, 47]],',
            '  [20.0, [196, 156, 71]],',
            '  [30.0, [220, 194, 96]],',
            '  [40.0, [245, 233, 121]],',
            '  [50.0, [183, 209, 173]],',
            '  [60.0, [121, 185, 225]],',
            '  [70.0, [97, 152, 203]],',
            '  [80.0, [74, 120, 182]],',
            '  [90.0, [50, 87, 160]],',
            '  [100.0, [27, 55, 139]]',
            '];',
            'const visualizer = new ColorRampVisualizer(ColorBar);',
          ].join('\n');
        },

        // Returns the SWI evalscript for SWI001 with an explicit color ramp and stats outputs.
        // The evalscript in this case is hardcoded.
        // _getEvalscript: function () {
        //   return [
        //     '//VERSION=3',
        //     'const factor = 1 / 2;',
        //     'const offset = 0;',
        //     'function setup() {',
        //     '  return {',
        //     '    input: ["SWI001", "dataMask"],',
        //     '    output: [',
        //     '      { id: "default", bands: 4, sampleType: "UINT8" },',
        //     '      { id: "index", bands: 1, sampleType: "FLOAT32" },',
        //     '      { id: "eobrowserStats", bands: 2, sampleType: "FLOAT32" },',
        //     '      { id: "dataMask", bands: 1 }',
        //     '    ]',
        //     '  };',
        //     '}',
        //     'function evaluatePixel(samples) {',
        //     '  var originalValue = samples.SWI001;',
        //     '  var val = originalValue * factor + offset;',
        //     '  var dataMask = samples.dataMask;',
        //     '  var indexVal = dataMask === 1 ? val : NaN;',
        //     '  var imgVals = visualizer.process(val);',
        //     '  return {',
        //     '    default: imgVals.concat(dataMask * 255),',
        //     '    index: [indexVal],',
        //     '    eobrowserStats: [val, dataMask],',
        //     '    dataMask: [dataMask]',
        //     '  };',
        //     '}',
        //     'const ColorBar = [',
        //     '  [0.0, [148, 80, 23]],',
        //     '  [10.0, [172, 118, 47]],',
        //     '  [20.0, [196, 156, 71]],',
        //     '  [30.0, [220, 194, 96]],',
        //     '  [40.0, [245, 233, 121]],',
        //     '  [50.0, [183, 209, 173]],',
        //     '  [60.0, [121, 185, 225]],',
        //     '  [70.0, [97, 152, 203]],',
        //     '  [80.0, [74, 120, 182]],',
        //     '  [90.0, [50, 87, 160]],',
        //     '  [100.0, [27, 55, 139]]',
        //     '];',
        //     'const visualizer = new ColorRampVisualizer(ColorBar);',
        //   ].join('\n');
        // },

        // Requests a PNG tile from Process API and maps it to an image consumable by BaseTileLayer.
        fetchTile: function (level, row, col, options) {
          const bbox = tileToBBox3857(this.tileInfo, level, row, col);
          const width = this.tileInfo.size[0];
          const height = this.tileInfo.size[1];

          // The Process API request targets the configured BYOC collection and time window.
          const payload = {
            input: {
              bounds: {
                bbox: [bbox.west, bbox.south, bbox.east, bbox.north],
                properties: {
                  crs: 'http://www.opengis.net/def/crs/EPSG/0/3857',
                },
              },
              data: [
                {
                  type: this.collectionId,
                  dataFilter: {
                    timeRange: { from: this.timeFrom, to: this.timeTo },
                  },
                  processing: {
                    upsampling: 'BILINEAR',
                    downsampling: 'BILINEAR',
                  },
                },
              ],
            },
            output: {
              width: width,
              height: height,
              responses: [
                { identifier: 'default', format: { type: 'image/png' } },
              ],
            },
            evalscript: this._getEvalscript(),
          };

          return this._getToken()
            .then(
              function (token) {
                return fetch(this.processUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + token,
                    Accept: 'image/png',
                  },
                  body: JSON.stringify(payload),
                  signal: options && options.signal,
                });
              }.bind(this),
            )
            .then(function (response) {
              if (!response.ok) {
                return response.text().then(function (text) {
                  throw new Error(
                    'SWI process error ' + response.status + ': ' + text,
                  );
                });
              }

              return response.blob();
            })
            .then(function (blob) {
              return blobToImage(blob);
            });
        },
      });

      // This layer can be used a default relief surface.
      const ArcgisElevationLayer = BaseElevationLayer.createSubclass({
        properties: {
          exaggeration: null,
        },

        // The load() method is called when the layer is added to the map
        // prior to it being rendered in the view.
        load: function () {
          this._elevation = new ElevationLayer({
            // Relief
            url: 'https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/TopoBathy3D/ImageServer',
          });

          // wait for the elevation layer to load before resolving load()
          this.addResolvingPromise(this._elevation.load());
        },

        // Fetches the tile(s) visible in the view
        fetchTile: function (level, row, col, options) {
          // calls fetchTile() on the elevationlayer for the tiles
          // visible in the view
          return this._elevation.fetchTile(level, row, col, options).then(
            function (data) {
              var exaggeration = this.exaggeration;
              if (DEBUG && !_diagArcgisDone) {
                diagLogTileStructure(
                  'ArcgisElevationLayer – raw from service',
                  data,
                  level,
                  row,
                  col,
                );
                diagSaveValuesAsPng(
                  data.values,
                  data.width,
                  data.height,
                  'arcgis_before_exag_' +
                    level +
                    '_' +
                    row +
                    '_' +
                    col +
                    '.png',
                );
              }
              for (var i = 0; i < data.values.length; i++) {
                data.values[i] = data.values[i] * exaggeration;
              }
              if (DEBUG && !_diagArcgisDone) {
                _diagArcgisDone = true;
                diagLogTileStructure(
                  'ArcgisElevationLayer – after exaggeration x' + exaggeration,
                  data,
                  level,
                  row,
                  col,
                );
                diagSaveValuesAsPng(
                  data.values,
                  data.width,
                  data.height,
                  'arcgis_after_exag_' + level + '_' + row + '_' + col + '.png',
                );
              }
              return data;
            }.bind(this),
          );
        },
      });

      // LAYERS / INSTANCES CREATION
      // This layer can be used a default relief surface.
      const elevationLayer = new ArcgisElevationLayer({ exaggeration: 3 });

      // Main SWI visualization powered by Process API.
      const swiProcessLayer = new CopernicusTileLayer({
        title: 'CDSE SWI - Process API',
        clientId: CDSE_CLIENT_ID,
        clientSecret: CDSE_CLIENT_SECRET,
        collectionId: 'byoc-de3e1b9c-58c4-457a-a3e7-917ec20fc29b',
        //collectionId: 'byoc-d0413fe0-46dc-4c2c-96a2-437e726d89a3',
        tileInfo: WEB_MERCATOR_TILE_INFO,
        timeFrom: '2025-07-01T00:00:00Z',
        timeTo: '2025-07-15T23:59:59Z',
        visible: true,
        opacity: 0.8,
      });


      const swiElevationLayer = new CopernicusElevationLayer({
        title: 'CDSE SWI - Elevation',
        clientId: CDSE_CLIENT_ID,
        clientSecret: CDSE_CLIENT_SECRET,
        collectionId: 'byoc-de3e1b9c-58c4-457a-a3e7-917ec20fc29b',
        //collectionId: 'byoc-d0413fe0-46dc-4c2c-96a2-437e726d89a3',
        tileInfo: WEB_MERCATOR_TILE_INFO,
        timeFrom: '2025-07-01T00:00:00Z',
        timeTo: '2025-07-15T23:59:59Z',
        exaggeration: 2000,
      });



      //this.map.ground.layers.add(elevationLayer);
      this.map.ground.layers.add(swiElevationLayer);
      this.map.addMany([swiProcessLayer]);
    });
    // Adds utility widgets for layer visibility and symbology inspection.

    //this.initializeUtilityWidgets();


    // Initializes runtime layers once the SceneView is ready.
    // this.view.when(function () {
    //   // ---- ELEVATION LAYERS
    //   // The SWI elevation layer is commented out to avoid conflicts with the ArcGIS elevation layer. Change the order or uncomment as needed for testing.
    //   this.map.ground.layers.add(swiElevationLayer); //SWI Process API elevation
    //   // map.ground.layers.add(elevationLayer); //Arcgis

    //   // ---- VISUALIZATION LAYERS
    //   this.map.addMany([swiProcessLayer]);
    //   initializeUtilityWidgets();
    // });
  }

  // async componentDidMount() {
  //   const legend = new Legend({
  //     view: this.view,
  //   });

  //   const legendExpand = new Expand({
  //     view: this.view,
  //     content: legend,
  //     expandIconClass: 'esri-icon-legend',
  //     expandTooltip: 'Legend',
  //     expanded: false,
  //   });

  //   const layerList = new LayerList({
  //     view: this.view,
  //   });

  //   const layerListExpand = new Expand({
  //     view: this.view,
  //     content: layerList,
  //     expandIconClass: 'esri-icon-layer-list',
  //     expandTooltip: 'Layer list',
  //     expanded: false,
  //   });

  //   // WIDGETS
  //   this.view.ui.add(layerListExpand, 'top-right');
  //   this.view.ui.add(legendExpand, 'top-right');
  // }

  /**
   * This method renders the component
   * @returns jsx
   */
  render() {
    return (
      <>
        <div ref={this.container} className="elevation-container">
          <div
            className={this.menuClass}
            id="elevation_button"
            aria-label="Elevation"
            onClick={this.openMenu.bind(this)}
            onKeyDown={(e) => {
              if (
                !e.altKey &&
                e.code !== 'Tab' &&
                !e.ctrlKey &&
                e.code !== 'Delete' &&
                !e.shiftKey &&
                !e.code.startsWith('F')
              ) {
                this.openMenu(this);
              }
            }}
            tabIndex="0"
            role="button"
          >
            Elevation
          </div>
        </div>
      </>
    );
  }
}

export default ElevationWidget;
