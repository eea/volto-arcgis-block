import React, { createRef } from 'react';
import { loadModules } from 'esri-loader';
// import { FontAwesomeIcon } from '@eeacms/volto-clms-utils/components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

var Graphic,
  Extent,
  CSVLayer,
  FeatureLayer,
  Field,
  GroupLayer,
  Color,
  projection,
  request,
  SimpleLineSymbol,
  SimpleFillSymbol,
  SpatialReference,
  Polygon;

class AreaWidget extends React.Component {
  /**
   * Creator of the Measurement widget class
   * @param {*} props
   */
  constructor(props) {
    super(props);
    //We create a reference to a DOM element to be mounted
    this.container = this.props.download
      ? document.querySelector('#download_panel')
      : createRef();
    //Initially, we set the state of the component to
    //not be showing the basemap panel
    this.state = {
      showMapMenu: false,
      showInfoPopup: this.props.download ? true : false,
      infoPopupType: 'area',
    };
    this.menuClass =
      'esri-icon-cursor-marquee esri-widget--button esri-widget esri-interactive';
    // Enable defaultPopup option to charge popup and highlifght feature
    this.props.mapViewer.view.popup.defaultPopupTemplateEnabled = true;
    this.nutsUrl = '';
    this.initFMI = this.initFMI.bind(this);
    this.mapviewer_config = this.props.mapviewer_config;
    this.fileInput = createRef();
    this.handleCsv = this.handleCsv.bind(this);
    this.fileUploadLayer = null;
    this.removeFileUploadedLayer = this.removeFileUploadedLayer.bind(this);
    this.uploadPortal = this.props.urls.uploadPortal;
    this.generateFeatureCollection = this.generateFeatureCollection.bind(this);
    this.addFeatureCollectionToMap = this.addFeatureCollectionToMap.bind(this);
    this.checkFeatureCount = this.checkFeatureCount.bind(this);
    this.prepackage = false;
  }

  loader() {
    return loadModules([
      'esri/Graphic',
      'esri/geometry/Extent',
      'esri/layers/CSVLayer',
      'esri/layers/FeatureLayer',
      'esri/layers/support/Field',
      'esri/layers/GroupLayer',
      'esri/Color',
      'esri/geometry/projection',
      'esri/request',
      'esri/symbols/SimpleLineSymbol',
      'esri/symbols/SimpleFillSymbol',
      'esri/geometry/SpatialReference',
      'esri/geometry/Polygon',
    ]).then(
      ([
        _Graphic,
        _Extent,
        _CSVLayer,
        _FeatureLayer,
        _Field,
        _GroupLayer,
        _Color,
        _projection,
        _request,
        _SimpleLineSymbol,
        _SimpleFillSymbol,
        _SpatialReference,
        _Polygon,
      ]) => {
        [
          Graphic,
          Extent,
          CSVLayer,
          FeatureLayer,
          Field,
          GroupLayer,
          Color,
          projection,
          request,
          SimpleLineSymbol,
          SimpleFillSymbol,
          SpatialReference,
          Polygon,
        ] = [
          _Graphic,
          _Extent,
          _CSVLayer,
          _FeatureLayer,
          _Field,
          _GroupLayer,
          _Color,
          _projection,
          _request,
          _SimpleLineSymbol,
          _SimpleFillSymbol,
          _SpatialReference,
          _Polygon,
        ];
      },
    );
  }

  /**
   * Method that will be invoked when the
   * button is clicked. It controls the open
   * and close actions of the component
   */
  openMenu() {
    if (this.state.showMapMenu) {
      this.props.mapViewer.setActiveWidget();
      this.container.current.querySelector('.right-panel').style.display =
        'none';
      this.container.current.querySelector(
        '.right-panel-content',
      ).style.overflowY = 'auto';
      this.container.current.querySelector(
        '.right-panel-content',
      ).style.display = 'none';
      this.container.current.querySelector(
        '.right-panel-content',
      ).style.alignItems = 'none';
      this.container.current.querySelector('.area-panel').style.display =
        'none';
      this.container.current.querySelector('.area-panel').style.flexWrap =
        'none';
      this.container.current
        .querySelector('.esri-widget--button')
        .classList.remove('active-widget');
      document
        .querySelector('.esri-ui-top-right.esri-ui-corner')
        .classList.remove('show-panel');
      // By invoking the setState, we notify the state we want to reach
      // and ensure that the component is rendered again
      this.setState({
        showMapMenu: false,
        showInfoPopup: false,
        infoPopupType: 'area',
      });
      this.props.uploadFileHandler(true);
      this.clearWidget();
      document.querySelector('.coordinateWindow').style.display = 'none';
      this.removeFileUploadedLayer();
      this.container.current.querySelector(
        '#download_area_select_nuts0',
      ).checked = true;
    } else {
      this.props.mapViewer.setActiveWidget(this);
      this.container.current.querySelector('.right-panel').style.display =
        'flex';
      this.container.current.querySelector(
        '.right-panel-content',
      ).style.overflowY = 'hidden';
      this.container.current.querySelector(
        '.right-panel-content',
      ).style.display = 'flex';
      this.container.current.querySelector(
        '.right-panel-content',
      ).style.alignItems = 'center';
      this.container.current.querySelector('.area-panel').style.display =
        'flex';
      this.container.current.querySelector('.area-panel').style.flexWrap =
        'wrap';
      this.container.current
        .querySelector('.esri-widget--button')
        .classList.add('active-widget');
      document
        .querySelector('.esri-ui-top-right.esri-ui-corner')
        .classList.add('show-panel');
      // By invoking the setState, we notify the state we want to reach
      // and ensure that the component is rendered again
      this.setState({
        showMapMenu: true,
        showInfoPopup: true,
        infoPopupType: 'area',
      });
      this.props.uploadFileHandler(true);
      this.container.current.querySelector('input:checked').click();
    }
  }
  nutsRadioButtonGeneral(event) {
    this.nutsRadioButton(event.target.value);
  }
  nutsRadioButton(id) {
    if (id === 'nuts') {
      if (
        !document.getElementById('download_area_select_nuts2').checked &&
        !document.getElementById('download_area_select_nuts3').checked
      ) {
        document.getElementById('download_area_select_nuts1').checked = true;
        this.loadNutsService('nuts1', [1, 2]);
      }
    }
    if (id === 'nuts1' || id === 'nuts2' || id === 'nuts3') {
      document.getElementById('download_area_select_nuts').checked = true;
    }
    if (id === 'nuts0' || id === 'area' || id === 'prepackage') {
      document.getElementById('download_area_select_nuts1').checked = false;
      document.getElementById('download_area_select_nuts2').checked = false;
      document.getElementById('download_area_select_nuts3').checked = false;
    }
    this.props.prepackageHandler(
      document.querySelector('#download_prepackage').checked,
    );
    if (document.querySelector('#download_prepackage').checked) {
      this.setState({
        showInfoPopup: true,
        infoPopupType: 'prepackage',
      });
      this.props.uploadFileHandler(true);
    } else {
      this.setState({
        showInfoPopup: true,
        infoPopupType: 'area',
      });
      this.props.uploadFileHandler(true);
    }
    if (id === 'coordinates') {
      document.querySelector('.coordinateWindow').style.display = 'block';
    } else {
      document.querySelector('.coordinateWindow').style.display = 'none';
      if (document.getElementById('menu-north')) {
        document.getElementById('menu-north').value = null;
      }
      if (document.getElementById('menu-south')) {
        document.getElementById('menu-south').value = null;
      }
      if (document.getElementById('menu-east')) {
        document.getElementById('menu-east').value = null;
      }
      if (document.getElementById('menu-west')) {
        document.getElementById('menu-west').value = null;
      }
    }
  }
  nuts0handler(e) {
    this.loadNutsService(e.target.value, [0]);
    this.loadCountriesService(e.target.value);
    this.nutsRadioButton(e.target.value);
  }
  nuts1handler(e) {
    this.loadNutsService(e.target.value, [1, 2]);
    this.nutsRadioButton(e.target.value);
  }
  nuts2handler(e) {
    this.loadNutsService(e.target.value, [3, 4, 5]);
    this.nutsRadioButton(e.target.value);
  }
  nuts3handler(e) {
    this.loadNutsService(e.target.value, [6, 7, 8]);
    this.nutsRadioButton(e.target.value);
  }

  getNutsUrlChunks(nutsUrl) {
    const [base, query] = nutsUrl.split('query?');
    return {
      baseUrl: base || '',
      queryString: query || '',
    };
  }

  getNutsParams(queryString) {
    if (!queryString) return {};
    return queryString.split('&').reduce((acc, pair) => {
      const [key, value] = pair.split('=');
      if (key && value) {
        acc[key] = decodeURIComponent(value);
      }
      return acc;
    }, {});
  }

  // createDefinitionExpressionObject(params) {
  //   if (!params || Object.keys(params).length === 0) return null;
  //   return Object.entries(params)
  //     .map(([k, v]) => {
  //       if (typeof v === 'string' && v.includes(',')) {
  //         const values = v.split(',').map((val) => `'${val.trim()}'`);
  //         if (values.length > 2) {
  //           return `${k} in (${values.join(', ')})`;
  //         } else {
  //           return values.map((val) => `${k}=${val}`).join(' OR ');
  //         }
  //       } else {
  //         return `${k}='${v}'`;
  //       }
  //     })
  //     .join(' AND ');
  // }

  createFeatureLayer(id, baseUrl, level, customParameters) {
    // Extract relevant properties from customParameters (queryParams)
    const {
      outFields,
      returnGeometry,
      returnTrueCurves,
      sqlFormat,
      featureEncoding,
    } = customParameters;

    return new FeatureLayer({
      id: id,
      url: baseUrl,
      layerId: level,
      outFields: outFields || ['*'],
      popupEnabled: false,
      returnGeometry: returnGeometry || false,
      returnTrueCurves: returnTrueCurves || false,
      sqlFormat: sqlFormat || 'none',
      featureEncoding: featureEncoding || 'esriDefault',
    });
  }

  loadNutsService(id, levels) {
    this.clearWidget();
    document.querySelector('.esri-attribution__powered-by').style.display =
      'flex';
    const { baseUrl, queryString } = this.getNutsUrlChunks(this.nutsUrl);
    const params = this.getNutsParams(queryString);
    // const definitionExpression = this.createDefinitionExpressionObject(params);
    levels.forEach((level) => {
      const layer = this.createFeatureLayer(id, baseUrl, level, params);
      this.nutsGroupLayer.add(layer);
      let index = this.getHighestIndex();
      this.props.map.reorder(this.nutsGroupLayer, index + 1);
    });
  }

  loadCountriesService(id) {
    document.querySelector('.esri-attribution__powered-by').style.display =
      'flex';
    var layer = new FeatureLayer({
      id: id,
      url: this.props.urls.outsideEu,
      layerId: 0,
      outFields: ['*'],
      popupEnabled: false,
    });

    this.nutsGroupLayer.add(layer);

    let index = this.getHighestIndex();

    this.props.map.reorder(this.nutsGroupLayer, index + 1);
  }

  // FILE UPLOAD HANDLERS

  // Trigger the file input click

  handleUploadClick = (event) => {
    event.preventDefault();
    this.fileInput.current.click();
  };

  handleFileUpload = (e) => {
    this.removeNutsLayers();
    //Get the file name

    const fileName = e.target.value.toLowerCase();

    //Get the file size

    const fileSize = e.target.files[0].size;

    //Get the file blob

    const fileBlob = e.target.files[0];

    //Create a new file reader

    let reader = new FileReader();

    //List allowed file extensions

    let fileExtensions = ['zip', 'geojson', 'csv'];

    // Get the file extension

    let fileExtension = fileName.split('.').pop();

    //Check if the file format is not supported

    if (fileExtensions.indexOf(fileExtension) === -1) {
      this.setState({
        showInfoPopup: true,
        infoPopupType: 'fileFormat',
      });
      this.props.uploadFileHandler(false);
      return;
    }

    // Check if the file format is geojson or csv and the file size is over the 10mb file size limit
    // or file is a shape file and the file size is over the 2mb file size limit

    if (
      fileSize > 10485760 &&
      (fileExtension === 'geojson' || fileExtension === 'csv')
    ) {
      this.setState({
        showInfoPopup: true,
        infoPopupType: 'fileLimit',
      });
      this.props.uploadFileHandler(false);
      return;
    }

    if (fileSize > 2097152 && fileExtension === 'zip') {
      this.setState({
        showInfoPopup: true,
        infoPopupType: 'shapefileLimit',
      });
      this.props.uploadFileHandler(false);
      return;
    }

    if (fileExtension === 'zip' || fileExtension === 'geojson') {
      const formData = new FormData();
      formData.append('file', fileBlob, fileName);
      this.generateFeatureCollection(
        fileName,
        formData,
        fileExtension === 'zip' ? 'shapefile' : 'geojson',
      );
    } else if (fileExtension === 'csv') {
      reader.readAsText(fileBlob);
      reader.onload = () => {
        this.handleCsv(reader.result);
      };
    }

    e.target.value = null;
    this.props.uploadFileHandler(this.state.infoPopupType);
  };

  generateFeatureCollection(fileName, formData, inputFormat) {
    let name = fileName.split('.');

    // Chrome adds c:\fakepath to the value - we need to remove it
    name = name[0].replace('c:\\fakepath\\', '');

    // define the input params for generate see the rest doc for details
    // https://developers.arcgis.com/rest/users-groups-and-items/generate.htm
    const params = {
      name: name,
      targetSR: this.props.view.spatialReference,
      maxRecordCount: 1000,
      enforceInputFileSizeLimit: true,
      enforceOutputJsonSizeLimit: true,
      // generalize features to 10 meters for better performance
      generalize: true,
      maxAllowableOffset: 10,
      reducePrecision: true,
      numberOfDigitsAfterDecimal: 0,
    };

    const myContent = {
      filetype: inputFormat,
      publishParameters: JSON.stringify(params),
      f: 'json',
    };
    // use the REST generate operation to generate a feature collection from the zipped shapefile
    request(this.uploadPortal + '/sharing/rest/content/features/generate', {
      query: myContent,
      body: formData,
      responseType: 'json',
    })
      .then((response) => {
        if (response.data && response.data.featureCollection) {
          //Check for more than a single feature
          let featureCollection = response.data.featureCollection;
          if (this.checkFeatureCount(featureCollection) === false) return;

          //Check that attributes and geometry are not null or undefined
          if (
            featureCollection.layers[0].featureSet.features[0].attributes ===
              null ||
            featureCollection.layers[0].featureSet.features[0].attributes ===
              undefined ||
            featureCollection.layers[0].featureSet.features[0].geometry ===
              null ||
            featureCollection.layers[0].featureSet.features[0].geometry ===
              undefined
          ) {
            this.setState({
              showInfoPopup: true,
              infoPopupType: 'invalidShapefile',
            });
            this.props.uploadFileHandler(false);
            return;
          }

          //Create a feature layer from the feature collection
          this.addFeatureCollectionToMap(featureCollection);
        }
      })
      .catch((error) => {
        if (
          error &&
          error.details &&
          error.details.httpStatus === 400 &&
          error.message === 'Invalid Shapefile: missing shp file.'
        ) {
          this.setState({
            showInfoPopup: true,
            infoPopupType: 'invalidShapefile',
          });
          this.props.uploadFileHandler(false);
        } else if (
          error &&
          error.details &&
          error.details.httpStatus === 400 &&
          error.message === 'Invalid spatial reference in geojson.'
        ) {
          this.setState({
            showInfoPopup: true,
            infoPopupType: 'incorrectWkid',
          });
          this.props.uploadFileHandler(false);
        } else {
          this.props.uploadFileHandler(false);
          // Handle other errors
        }
      });
  }

  // add the feature collection to the map and zoom to the feature collection extent
  // if you want to persist the feature collection when you reload browser, you could store the
  // collection in local storage by serializing the layer using featureLayer.toJson()
  // see the 'Feature Collection in Local Storage' sample for an example of how to work with local storage
  addFeatureCollectionToMap(featureCollection) {
    let sourceGraphics = [];

    //Create a graphic for each feature in the feature collection

    const layers = featureCollection.layers.map((layer) => {
      const graphics = layer.featureSet.features.map((feature) => {
        const polygonSymbol = {
          type: 'simple-fill',
          color: [234, 168, 72, 0.8],
          outline: {
            color: '#000000',
            width: 0.1,
          },
        };
        let graphic = Graphic.fromJSON(feature);
        graphic.symbol = polygonSymbol;
        return graphic;
      });

      sourceGraphics = sourceGraphics.concat(graphics);

      // Create a feature layer from the feature collection fields and gaphics

      const featureLayer = new FeatureLayer({
        objectIdField: 'FID',
        source: graphics,
        legendEnabled: false,
        title: 'uploadLayer',
        fields: layer.layerDefinition.fields.map((field) => {
          return Field.fromJSON(field);
        }),
      });
      return featureLayer;
    });

    //Check for the correct spatial reference

    let geometry = new Extent(
      featureCollection.layers[0].layerDefinition.extent,
    );

    //If checkExtent returns false, add the layer to the map

    if (this.checkExtent(geometry.extent)) {
      this.setState({
        showInfoPopup: true,
        infoPopupType: 'fullDataset',
      });
      this.props.uploadFileHandler(true);
    } else {
      //Remove old uploaded file and save new one to component props for reference

      this.removeFileUploadedLayer();
      this.fileUploadLayer = { layers: layers, sourceGraphics: sourceGraphics };

      //Add uploaded layer to the map and zoom to the extent

      this.props.view.graphics.addMany(sourceGraphics);
      this.props.view.goTo(sourceGraphics).catch((error) => {});

      //Create a spatial reference object for the extent

      let sr4326 = new SpatialReference({
        wkid: 4326,
      });

      //Create a projection object for the extent

      let latLongExtent = projection.project(geometry, sr4326);

      //Send the area to the parent component

      this.props.updateArea({
        origin: { x: latLongExtent.xmin, y: latLongExtent.ymin },
        end: { x: latLongExtent.xmax, y: latLongExtent.ymax },
      });

      //Order the layer in the map

      let index = this.getHighestIndex();
      this.props.map.reorder(this.fileUploadLayer, index + 1);

      // Refresh the map view

      this.setState({
        showInfoPopup: true,
        infoPopupType: 'download',
      });
      this.props.uploadFileHandler(true);
      //Save file upload layer to session storage as a tag for adding item to cart action

      sessionStorage.setItem(
        'fileUploadLayer',
        JSON.stringify(this.fileUploadLayer),
      );
    }
  }

  //Check if the featurecollection has more than one feature

  checkFeatureCount(featureCollection) {
    if (featureCollection.layers[0].featureSet.features.length > 1) {
      this.setState({
        showInfoPopup: true,
        infoPopupType: 'singleFeature',
      });
      this.props.uploadFileHandler(false);
      return false;
    } else {
      return true;
    }
  }

  //Display CSV on the map

  async handleCsv(data) {
    //Create a CSV layer
    const blob = new Blob([data], {
      type: 'plain/text',
    });

    let url = URL.createObjectURL(blob);

    const csvLayer = new CSVLayer({
      url,
      legendEnabled: false,
      title: 'uploadLayer',
    });

    // Set a simple renderer on the layer

    csvLayer.renderer = {
      type: 'simple',
      symbol: {
        type: 'simple-marker',
        size: 6,
        color: 'black',
        outline: {
          width: 0.5,
          color: 'white',
        },
      },
    };

    let csvFeatures, csvFeatureCount, csvExtent;

    //Query the CSV layer

    try {
      await csvLayer.load();
      const results = await Promise.all([
        csvLayer.queryFeatures(),
        csvLayer.queryFeatureCount(),
        csvLayer.queryExtent(),
      ]);

      csvFeatures = results[0];
      csvFeatureCount = results[1];
      csvExtent = results[2];

      //Check if the file has the correct spatial reference

      if (this.checkWkid(csvLayer?.spatialReference) === false) return;

      //Check if the file extent is larger than the limit
      //If checkExtent() is false, add the layer to the map
      if (
        csvExtent.extent.width === null ||
        csvExtent.extent.width === undefined ||
        csvExtent.extent.height === null ||
        csvExtent.extent.height === undefined
      ) {
        this.setState({
          showInfoPopup: true,
          infoPopupType: 'fileFormat',
        });
        this.props.uploadFileHandler(false);
      } else if (this.checkExtent(csvExtent.extent)) {
        this.setState({
          showInfoPopup: true,
          infoPopupType: 'fullDataset',
        });
        this.props.uploadFileHandler(true);
      } else {
        //Draw a polygon around of the CSVlayer Features data

        let allRings = [];
        let currentRing = [];
        let startingPoint = null;

        for (let i = 0; i < csvFeatureCount; i++) {
          const currentPoint = [
            csvFeatures.features[i].geometry.x,
            csvFeatures.features[i].geometry.y,
          ];
          if (!startingPoint) {
            startingPoint = currentPoint;
            currentRing.push(currentPoint);
          } else if (
            startingPoint[0] === currentPoint[0] &&
            startingPoint[1] === currentPoint[1]
          ) {
            allRings.push(currentRing);
            currentRing = [];
            startingPoint = null;
          } else {
            currentRing.push(currentPoint);
          }
        }

        if (currentRing.length > 0) {
          allRings.push(currentRing);
        }

        let idPolygon = new Polygon({
          isSelfIntersecting: false,
          rings: allRings,
          spatialReference: csvExtent.spatialReference,
          //set type as multi polygon
        });

        //Draw a graphic using the polyId polygon data as the geometry

        const polygonSymbol = {
          type: 'simple-fill',
          color: [234, 168, 72, 0.8],
          outline: {
            color: '#000000',
            width: 0.1,
          },
        };

        let polygonGraphic = new Graphic({
          geometry: idPolygon,
          symbol: polygonSymbol,
        });

        //Clear any previously saved file upload data and save the uploaded layer to the component props for reference

        this.removeFileUploadedLayer();
        this.fileUploadLayer = {
          layers: CSVLayer,
          sourceGraphics: polygonGraphic,
        };

        //Add the polygon graphic to the map

        this.props.view.graphics.add(polygonGraphic);

        //Refresh the map view

        this.props.view.goTo(polygonGraphic).catch((error) => {});

        //Send the area to the parent component

        this.props.updateArea({
          origin: { x: csvExtent.extent.xmin, y: csvExtent.extent.ymin },
          end: { x: csvExtent.extent.xmax, y: csvExtent.extent.ymax },
        });

        //re order the layer in the map

        let index = this.getHighestIndex();
        this.props.map.reorder(polygonGraphic, index + 1);

        //Refresh the map view

        this.setState({
          showInfoPopup: true,
          infoPopupType: 'download',
        });
        this.props.uploadFileHandler(true);

        //Save file upload layer to session storage as a tag for adding item to cart action

        sessionStorage.setItem(
          'fileUploadLayer',
          JSON.stringify(this.fileUploadLayer),
        );
      }
    } catch (error) {
      this.setState({
        showInfoPopup: true,
        infoPopupType: 'fileFormat',
      });
      this.props.uploadFileHandler(false);
    }
  }

  checkWkid(spatialReference) {
    if (
      spatialReference &&
      spatialReference?.isWGS84 &&
      spatialReference?.wkid === 4326
    ) {
      return true;
    } else {
      this.setState({
        showInfoPopup: true,
        infoPopupType: 'incorrectWkid',
      });
      this.props.uploadFileHandler(false);
    }
  }

  //Remove the NUTS layers from the map

  removeNutsLayers() {
    //find all the radio buttons
    let radioButtons = document.querySelectorAll('.area-radio');
    radioButtons.forEach((button) => {
      button.checked = false;
    });
    this.clearWidget();
  }

  //Remove the uploaded layer from the map

  removeFileUploadedLayer() {
    if (this.fileUploadLayer !== null) {
      this.clearWidget();
    }
  }

  getHighestIndex() {
    let index = 0;
    document.querySelectorAll('.active-layer').forEach((layer) => {
      let value = parseInt(layer.getAttribute('layer-order'));
      if (value > index) {
        index = value;
      }
    });
    return index;
  }

  checkExtent(extent) {
    const areaLimit = this.mapviewer_config.Components[0].Products[0]
      .Datasets[0].DownloadLimitAreaExtent;
    if (
      extent.width * extent.height > areaLimit ||
      extent.width * extent.height === 0
    ) {
      return true;
    } else {
      return false;
    }
  }

  rectanglehandler(event) {
    this.clearWidget();
    window.document.querySelector('.pan-container').style.display = 'flex';
    window.document.querySelector('.pan-container').style.position = 'absolute';
    window.document.querySelector('.pan-container').style.paddingRight =
      '21rem';
    var fillSymbol = {
      type: 'simple-fill',
      color: [255, 255, 255, 0.5],
      outline: {
        color: [0, 0, 0],
        width: 1,
      },
    };

    let extentGraphic = null;
    let origin = null;
    const drawGraphics = this.props.view.on('drag', (e) => {
      if (this.props.mapViewer.pan_enabled) return;
      e.stopPropagation();
      if (e.action === 'start') {
        if (extentGraphic) this.props.view.graphics.remove(extentGraphic);
        origin = this.props.view.toMap(e);
        if (extentGraphic && this.checkExtent(extentGraphic.geometry)) {
          this.setState({
            showInfoPopup: true,
            infoPopupType: 'fullDataset',
          });
          this.props.uploadFileHandler(true);
        } else {
          this.setState({
            showInfoPopup: true,
            infoPopupType: 'download',
          });
          this.props.uploadFileHandler(true);
        }
        if (this.props.download) {
          if (extentGraphic && this.checkExtent(extentGraphic.geometry)) {
            let popupToUpdate = document.querySelector(
              '.drawRectanglePopup-block',
            );
            popupToUpdate.style.display = 'block';
            popupToUpdate.innerHTML =
              '<div className="drawRectanglePopup-content">' +
              '<span className="drawRectanglePopup-icon"><span className="esri-icon-cursor-marquee"></span></span>' +
              '<div className="drawRectanglePopup-text">' +
              '<a style="color: black; cursor: pointer" href="https://land.copernicus.eu/en/how-to-guides/how-to-download-spatial-data/how-to-download-m2m" target="_blank" rel="noreferrer">To download the full dataset consult the "How to download M2M" How to guide.</a>' +
              '</div>' +
              '</div>';
          } else {
            let popupToUpdate = document.querySelector(
              '.drawRectanglePopup-block',
            );
            popupToUpdate.style.display = 'none';
          }
        }
      } else if (e.action === 'update') {
        if (extentGraphic) this.props.view.graphics.remove(extentGraphic);
        let p = this.props.view.toMap(e);
        extentGraphic = new Graphic({
          geometry: new Extent({
            xmin: Math.min(p.x, origin.x),
            xmax: Math.max(p.x, origin.x),
            ymin: Math.min(p.y, origin.y),
            ymax: Math.max(p.y, origin.y),
            spatialReference: { wkid: 102100 },
          }),
          symbol: fillSymbol,
        });
        if (extentGraphic && this.checkExtent(extentGraphic.geometry)) {
          this.setState({
            showInfoPopup: true,
            infoPopupType: 'fullDataset',
          });
          this.props.uploadFileHandler(true);
        } else {
          this.setState({
            showInfoPopup: true,
            infoPopupType: 'download',
          });
          this.props.uploadFileHandler(true);
        }
        if (this.props.download) {
          if (extentGraphic && this.checkExtent(extentGraphic.geometry)) {
            let popupToUpdate = document.querySelector(
              '.drawRectanglePopup-block',
            );
            popupToUpdate.style.display = 'block';
            popupToUpdate.innerHTML =
              '<div className="drawRectanglePopup-content">' +
              '<span className="drawRectanglePopup-icon"><span className="esri-icon-cursor-marquee"></span></span>' +
              '<div className="drawRectanglePopup-text">' +
              '<a style="color: black; cursor: pointer" href="https://land.copernicus.eu/en/how-to-guides/how-to-download-spatial-data/how-to-download-m2m" target="_blank" rel="noreferrer">To download the full dataset consult the "How to download M2M" How to guide.</a>' +
              '</div>' +
              '</div>';
          } else {
            let popupToUpdate = document.querySelector(
              '.drawRectanglePopup-block',
            );
            popupToUpdate.style.display = 'none';
          }
        }
        this.props.updateArea({
          origin: { x: origin.longitude, y: origin.latitude },
          end: { x: p.longitude, y: p.latitude },
        });
        this.props.view.graphics.add(extentGraphic);
      }
    });
    this.setState({
      ShowGraphics: drawGraphics,
    });
    this.nutsRadioButton(event.target.value);
  }
  addCoordinates() {
    this.clearWidget();
    let pointNorth = document.getElementById('menu-north');
    if (pointNorth.value > 90) {
      pointNorth.value = 90;
    } else if (pointNorth.value < -90) {
      pointNorth.value = -90;
    }
    let pointSouth = document.getElementById('menu-south');
    if (pointSouth.value > 90) {
      pointSouth.value = 90;
    } else if (pointSouth.value < -90) {
      pointSouth.value = -90;
    }
    let pointEast = document.getElementById('menu-east');
    if (pointEast.value > 180) {
      pointEast.value = 180;
    } else if (pointEast.value < -180) {
      pointEast.value = -180;
    }
    let pointWest = document.getElementById('menu-west');
    if (pointWest.value > 180) {
      pointWest.value = 180;
    } else if (pointWest.value < -180) {
      pointWest.value = -180;
    }
    let pointNW = [pointNorth.value, pointWest.value];
    let pointSE = [pointSouth.value, pointEast.value];
    var fillSymbol = {
      type: 'simple-fill',
      color: [255, 255, 255, 0.5],
      outline: {
        color: [0, 0, 0],
        width: 1,
      },
    };
    let extentGraphic = new Graphic({
      geometry: new Extent({
        xmin: Math.min(pointNW[1], pointSE[1]),
        xmax: Math.max(pointNW[1], pointSE[1]),
        ymin: Math.min(pointNW[0], pointSE[0]),
        ymax: Math.max(pointNW[0], pointSE[0]),
        spatialReference: { wkid: 4326 },
      }),
      symbol: fillSymbol,
    });
    let outSpatialReference = new SpatialReference({
      wkid: 102100,
    });
    let graphicProjection = projection.project(
      extentGraphic.geometry,
      outSpatialReference,
    );
    if (extentGraphic && this.checkExtent(graphicProjection)) {
      this.setState({
        showInfoPopup: true,
        infoPopupType: 'fullDataset',
      });
      this.props.uploadFileHandler(true);
    } else {
      this.setState({
        showInfoPopup: true,
        infoPopupType: 'download',
      });
      this.props.uploadFileHandler(true);
      this.closeCoordinates();
    }
    this.props.updateArea({
      origin: {
        x: extentGraphic.geometry.xmin,
        y: extentGraphic.geometry.ymax,
      },
      end: { x: extentGraphic.geometry.xmax, y: extentGraphic.geometry.ymin },
    });
    this.props.view.graphics.add(extentGraphic);
  }
  openCoordinates(event) {
    this.clearWidget();
    this.nutsRadioButton(event.target.value);
  }
  closeCoordinates() {
    if (
      document.querySelector('.coordinateContainer').style.display === 'none'
    ) {
      document.querySelector('.coordinateContainer').style.display = 'block';
      document.querySelector('.coordinateWindow').style.height = '13rem';
      document
        .querySelector('.closeCoordinates')
        .classList.replace('esri-icon-up-arrow', 'esri-icon-close');
    } else {
      document.querySelector('.coordinateContainer').style.display = 'none';
      document.querySelector('.coordinateWindow').style.height = '2rem';
      document
        .querySelector('.closeCoordinates')
        .classList.replace('esri-icon-close', 'esri-icon-up-arrow');
    }
  }
  clearWidget() {
    window.document.querySelector('.pan-container').style.display = 'none';
    this.props.mapViewer.view.popup.close();
    if (this.state.ShowGraphics) {
      this.state.ShowGraphics.remove();
      this.setState({ ShowGraphics: null });
      this.props.updateArea();
    }
    this.nutsGroupLayer.removeAll();
    this.props.view.graphics.removeAll();
    this.props.updateArea();
    this.setState({
      infoPopupType: 'area',
    });
    this.props.uploadFileHandler(true);
    if (sessionStorage.getItem('fileUploadLayer')) {
      sessionStorage.removeItem('fileUploadLayer');
    }
    if (this.props.download) {
      let popup = document.querySelector('.drawRectanglePopup-block');
      popup.innerHTML =
        '<div className="drawRectanglePopup-content">' +
        '<span className="drawRectanglePopup-icon"><span className="esri-icon-cursor-marquee"></span></span>' +
        '<div className="drawRectanglePopup-text">Select or draw an area of interest in the map to continue</div>' +
        '</div>';
      popup.style.display = 'block';
    }
    document.querySelector('.esri-attribution__powered-by').style.display =
      'none';
  }
  areaSearch() {
    let searchText = document
      .querySelector('#area-searchtext')
      .value.toUpperCase();
    if (searchText.length <= 2) {
      this.loadNutsService('nuts0', [0]);
      this.loadCountriesService('nuts0');
      document.getElementById('download_area_select_nuts0').checked = true;
      this.nutsRadioButton('nuts0');
    } else if (searchText.length === 3) {
      this.loadNutsService('nuts1', [1, 2]);
      document.getElementById('download_area_select_nuts1').checked = true;
      this.nutsRadioButton('nuts1');
    } else if (searchText.length === 4) {
      this.loadNutsService('nuts2', [3, 4, 5]);
      document.getElementById('download_area_select_nuts2').checked = true;
      this.nutsRadioButton('nuts2');
    } else if (searchText.length === 5) {
      this.loadNutsService('nuts3', [6, 7, 8]);
      document.getElementById('download_area_select_nuts3').checked = true;
      this.nutsRadioButton('nuts3');
    }
    let found = false;
    let count = this.nutsGroupLayer.layers.items.length;
    document.querySelector('.no-result-message').style.display = 'none';
    this.nutsGroupLayer.layers.items.forEach((item) => {
      const queryParams = item.createQuery();
      if (
        item.url ===
        'https://land.discomap.eea.europa.eu/arcgis/rest/services/CLMS_Portal/World_countries_except_EU37/MapServer'
      ) {
        queryParams.where = `(ISO_2DIGIT = '${searchText}')`;
      } else {
        queryParams.where = `(NUTS_ID = '${searchText}')`;
      }
      queryParams.outSpatialReference = this.props.view.spatialReference;
      item.queryFeatures(queryParams).then((response) => {
        count = count - 1;
        response.features.forEach((feature) => {
          if (
            feature.attributes.NUTS_ID === searchText ||
            feature.attributes.ISO_2DIGIT === searchText
          ) {
            found = true;
            this.props.updateArea(feature);
            let symbol = new SimpleFillSymbol(
              'solid',
              new SimpleLineSymbol('solid', new Color([232, 104, 80]), 2),
              new Color([232, 104, 80, 0.25]),
            );
            let highlight = new Graphic(feature.geometry, symbol);
            this.props.view.graphics.removeAll();
            this.props.view.graphics.add(highlight);
            this.setState({
              showInfoPopup: true,
              infoPopupType: 'download',
            });
            this.props.uploadFileHandler(true);
            this.props.view.goTo(feature.geometry);
          }
        });
        if (!found && count === 0) {
          document.querySelector('.no-result-message').style.display = 'block';
        } else if (found) {
          document.querySelector('.no-result-message').style.display = 'none';
        }
      });
    });
  }

  prepackageButton(event) {
    this.clearWidget();
    this.nutsRadioButton(event.target.value);
  }

  /**
   * This method is executed after the rener method is executed
   */
  async componentDidMount() {
    await this.loader();
    await this.initFMI();
    this.nutsGroupLayer = new GroupLayer({
      title: 'nuts',
      //opacity: 0.5,
    });
    this.props.map.add(this.nutsGroupLayer);
    this.props.view.on('click', (event) => {
      if (
        (this.props.mapViewer.activeWidget === this || this.props.download) &&
        (this.props.mapViewer.activeWidget
          ? !this.props.mapViewer.activeWidget.container.current.classList.contains(
              'info-container',
            )
          : true)
      ) {
        this.props.view.hitTest(event).then((response) => {
          if (response.results.length > 0) {
            let graphic = response.results.filter((result) => {
              let layer;
              if (
                'nuts0 nuts1 nuts2 nuts3 countries upload'.includes(
                  result.graphic.layer.id,
                )
              ) {
                layer = result.graphic;
                return layer;
              } else {
                return false;
              }
            })[0].graphic;
            if (graphic) {
              let geometry = graphic.geometry;
              if (geometry.type === 'polygon') {
                this.props.updateArea(graphic);
                let symbol = new SimpleFillSymbol(
                  'solid',
                  new SimpleLineSymbol('solid', new Color([232, 104, 80]), 2),
                  new Color([232, 104, 80, 0.25]),
                );
                let highlight = new Graphic(geometry, symbol);
                this.props.view.graphics.removeAll();
                this.props.view.graphics.add(highlight);
                this.setState({
                  showInfoPopup: true,
                  infoPopupType: 'download',
                });
                this.props.uploadFileHandler(true);
                if (this.props.download) {
                  document.querySelector(
                    '.drawRectanglePopup-block',
                  ).style.display = 'none';
                }
              }
            }
          }
        });
      }
    });
    this.props.view.when(() => {
      this.props.download
        ? this.container !== null && this.props.view.ui.add(this.container)
        : this.container.current !== null &&
          this.props.view.ui.add(this.container.current, 'top-right');

      var popup = document.createElement('div');
      popup.className = 'drawRectanglePopup-block';
      popup.innerHTML =
        '<div className="drawRectanglePopup-content">' +
        '<span className="drawRectanglePopup-icon"><span className="esri-icon-cursor-marquee"></span></span>' +
        '<div className="drawRectanglePopup-text">Select or draw an area of interest in the map to continue</div>' +
        '</div>';
      this.props.download && this.props.view.ui.add(popup, 'top-right');
    });
  }

  async initFMI() {
    let fetchUrl =
      window.location.href
        .replace(window.location.pathname.substring(0), '')
        .replace(window.location.search.substring(0), '') +
      '/++api++/@anon-registry';
    try {
      let nutsResponse = await fetch(
        fetchUrl + '/clms.downloadtool.fme_config_controlpanel.nuts_service',
      );
      if (nutsResponse.status === 200) {
        this.nutsUrl = await nutsResponse.json();
      } else {
        throw new Error(nutsResponse.status);
      }
    } catch (error) {
      //console.error('There was a problem with the fetch operation:', error);
    }
  }
  /**
   * This method renders the component
   * @returns jsx
   */
  render() {
    return (
      <>
        <div ref={this.container} className="area-container">
          {!this.props.download && (
            <div tooltip="Area selection" direction="left" type="widget">
              <div
                className={this.menuClass}
                id="map_area_button"
                aria-label="Area selection"
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
              ></div>
            </div>
          )}
          <div className={this.props.download ? '' : 'right-panel'}>
            {!this.props.download && (
              <div className="right-panel-header">
                <span>Area selection</span>
                <span
                  className="map-menu-icon esri-icon-close"
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
                ></span>
              </div>
            )}
            <div className="right-panel-content">
              <div className="area-panel">
                <div className="ccl-form ccl-form-head">
                  <fieldset className="ccl-fieldset">
                    <div className="ccl-form-group">
                      <input
                        type="radio"
                        id="download_prepackage"
                        name="downloadAreaSelect"
                        value="prepackage"
                        className="ccl-checkbox ccl-required ccl-form-check-input area-radio"
                        onClick={this.prepackageButton.bind(this)}
                      ></input>
                      <label
                        className="ccl-form-radio-label"
                        htmlFor="download_prepackage"
                      >
                        <span className="prepackage-option">
                          For fast download check out the pre-packaged data
                          collection
                        </span>
                      </label>
                    </div>
                  </fieldset>
                </div>
                <div className="area-header">
                  Area selection for custom download:
                </div>
                <div className="area-header2">
                  <div className="area-dot">·</div>
                  Select by country or region on the map:
                </div>
                <div className="nuts-selection">
                  <div className="ccl-form">
                    <fieldset className="ccl-fieldset">
                      <div className="ccl-form-group">
                        <input
                          type="radio"
                          id="download_area_select_nuts0"
                          name="downloadAreaSelect"
                          value="nuts0"
                          className="ccl-checkbox cl-required ccl-form-check-input area-radio"
                          defaultChecked
                          onClick={this.nuts0handler.bind(this)}
                        ></input>
                        <label
                          className="ccl-form-radio-label"
                          htmlFor="download_area_select_nuts0"
                        >
                          <span>View countries</span>
                        </label>
                      </div>
                      <div className="ccl-form-group">
                        <input
                          type="radio"
                          id="download_area_select_nuts"
                          name="downloadAreaSelect"
                          value="nuts"
                          className="ccl-checkbox cl-required ccl-form-check-input area-radio"
                          onClick={this.nutsRadioButtonGeneral.bind(this)}
                        ></input>
                        <label
                          className="ccl-form-radio-label"
                          htmlFor="download_area_select_nuts"
                        >
                          <span>View NUTS</span>
                          <a
                            href={
                              'https://land.copernicus.eu/en/faq/map-viewer/what-are-nuts'
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                          >
                            <span className="map-menu-icon nuts-menu-icon">
                              <FontAwesomeIcon icon={['fa', 'info-circle']} />
                            </span>
                          </a>
                        </label>
                      </div>
                      <div className="nuts-form">
                        <div className="ccl-form-group">
                          <input
                            type="radio"
                            id="download_area_select_nuts1"
                            name="downloadAreaSelectNuts"
                            value="nuts1"
                            className="ccl-checkbox ccl-required ccl-form-check-input area-radio"
                            onClick={this.nuts1handler.bind(this)}
                          ></input>
                          <label
                            className="ccl-form-radio-label"
                            htmlFor="download_area_select_nuts1"
                          >
                            <span>NUTS 1 (major socio-economic regions)</span>
                          </label>
                        </div>
                        <div className="ccl-form-group">
                          <input
                            type="radio"
                            id="download_area_select_nuts2"
                            name="downloadAreaSelectNuts"
                            value="nuts2"
                            className="ccl-checkbox ccl-required ccl-form-check-input area-radio"
                            onClick={this.nuts2handler.bind(this)}
                          ></input>
                          <label
                            className="ccl-form-radio-label"
                            htmlFor="download_area_select_nuts2"
                          >
                            <span>NUTS 2 (basic regions)</span>
                          </label>
                        </div>
                        <div className="ccl-form-group">
                          <input
                            type="radio"
                            id="download_area_select_nuts3"
                            name="downloadAreaSelectNuts"
                            value="nuts3"
                            className="ccl-radio ccl-required ccl-form-check-input area-radio"
                            onClick={this.nuts3handler.bind(this)}
                          ></input>
                          <label
                            className="ccl-form-radio-label"
                            htmlFor="download_area_select_nuts3"
                          >
                            <span>NUTS 3 (small regions)</span>
                          </label>
                        </div>
                      </div>
                    </fieldset>
                  </div>
                </div>
                <div className="area-header2">
                  <div className="area-dot">·</div>
                  Type country code or region code:
                </div>
                <div className="area-search-block">
                  <input
                    type="text"
                    maxLength="6"
                    id="area-searchtext"
                    placeholder="Search"
                  />
                  <button
                    aria-label="Search"
                    className="esri-button area-searchbutton"
                    onClick={this.areaSearch.bind(this)}
                    onKeyDown={(e) => {
                      if (
                        !e.altKey &&
                        e.code !== 'Tab' &&
                        !e.ctrlKey &&
                        e.code !== 'Delete' &&
                        !e.shiftKey &&
                        !e.code.startsWith('F')
                      ) {
                        this.areaSearch.bind(this);
                      }
                    }}
                  >
                    <span className="ccl-icon-zoom"></span>
                  </button>
                  <div className="no-result-message">No result found</div>
                </div>
                <br></br>
                <div className="ccl-form">
                  <fieldset className="ccl-fieldset">
                    <div className="ccl-form-group">
                      <div className="rectangle-block">
                        <div className="area-dot">·</div>
                        <input
                          type="radio"
                          id="download_area_select_rectangle"
                          name="downloadAreaSelect"
                          value="area"
                          className="ccl-radio ccl-required ccl-form-check-input area-radio"
                          onClick={this.rectanglehandler.bind(this)}
                        ></input>
                        <label
                          className="ccl-form-radio-label"
                          htmlFor="download_area_select_rectangle"
                        >
                          <span className="rectangle-header">
                            Draw a rectangle on the map
                          </span>
                        </label>
                      </div>
                    </div>
                    <div className="ccl-form-group">
                      <div className="rectangle-block">
                        <div className="area-dot">·</div>
                        <input
                          type="radio"
                          id="download_area_select_coordinates"
                          name="downloadAreaSelect"
                          value="coordinates"
                          className="ccl-radio ccl-required ccl-form-check-input area-radio"
                          onClick={this.openCoordinates.bind(this)}
                        ></input>
                        <label
                          className="ccl-form-radio-label"
                          htmlFor="download_area_select_coordinates"
                        >
                          <span className="coordinates-header">
                            Add coordinates
                          </span>
                        </label>
                      </div>
                    </div>
                  </fieldset>
                </div>
                <div className="area-header2">
                  <div className="area-dot">·</div>
                  Upload a file with your area of interest
                  <a
                    href="https://land.copernicus.eu/en/faq/map-viewer/how-can-i-upload-a-file-with-my-area-of-interest"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <span className="map-menu-icon nuts-menu-icon">
                      <FontAwesomeIcon icon={['fa', 'info-circle']} />
                    </span>
                  </a>
                </div>
                <div className="ccl-form">
                  <form
                    encType="multipart/form-data"
                    method="post"
                    id="uploadForm"
                  >
                    <div className="field">
                      <label className="file-upload">
                        <span>Valid formats: shp, geojson, CSV</span>
                        <input
                          type="file"
                          name="file"
                          id="inFile"
                          ref={this.fileInput}
                          style={{ display: 'none' }}
                          onChange={this.handleFileUpload}
                        />
                      </label>
                    </div>
                  </form>
                  <button
                    className="esri-button"
                    onClick={this.handleUploadClick}
                    type="submit"
                  >
                    Upload file
                  </button>
                </div>
              </div>
            </div>
          </div>
          {!this.props.download && this.state.showInfoPopup && (
            <div className="map-container popup-block">
              <div className="drawRectanglePopup-block">
                <div className="drawRectanglePopup-content">
                  {this.state.infoPopupType === 'area' && (
                    <>
                      <span className="drawRectanglePopup-icon">
                        <span className="esri-icon-cursor-marquee"></span>
                      </span>
                      <div className="drawRectanglePopup-text">
                        Select or draw an area of interest in the map to
                        continue
                      </div>
                    </>
                  )}
                  {this.state.infoPopupType === 'download' && (
                    <>
                      <span className="drawRectanglePopup-icon">
                        <FontAwesomeIcon icon={['fas', 'download']} />
                      </span>
                      <div className="drawRectanglePopup-text">
                        Click on the download icon on “Products and datasets” to
                        add to cart
                      </div>
                    </>
                  )}
                  {this.state.infoPopupType === 'prepackage' && (
                    <>
                      <span className="drawRectanglePopup-icon">
                        <FontAwesomeIcon icon={['fas', 'download']} />
                      </span>
                      <div className="drawRectanglePopup-text">
                        Click on the download icon on “Products and datasets” to
                        continue
                      </div>
                    </>
                  )}
                  {this.state.infoPopupType === 'fullDataset' && (
                    <>
                      <span className="drawRectanglePopup-icon">
                        <FontAwesomeIcon icon={['fas', 'info-circle']} />
                      </span>
                      <div className="drawRectanglePopupWarning-text">
                        <a
                          style={{ color: 'black', cursor: 'pointer' }}
                          className="drawRectanglePopupWarning"
                          id="drawRectanglePopupWarning"
                          href="https://land.copernicus.eu/en/how-to-guides/how-to-download-spatial-data/how-to-download-m2m"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          To download the full dataset consult the "How to
                          download M2M" How to guide.
                        </a>
                      </div>
                    </>
                  )}
                  {this.state.infoPopupType === 'fileFormat' && (
                    <>
                      <span className="drawRectanglePopup-icon">
                        <FontAwesomeIcon icon={['fas', 'info-circle']} />
                      </span>
                      <div className="drawRectanglePopup-text">
                        The file format is not correct.
                      </div>
                    </>
                  )}
                  {this.state.infoPopupType === 'fileLimit' && (
                    <>
                      <span className="drawRectanglePopup-icon">
                        <FontAwesomeIcon icon={['fas', 'info-circle']} />
                      </span>
                      <div className="drawRectanglePopup-text">
                        Uploading geojson files larger than 10MB is not allowed.
                      </div>
                    </>
                  )}
                  {this.state.infoPopupType === 'shapefileLimit' && (
                    <>
                      <span className="drawRectanglePopup-icon">
                        <FontAwesomeIcon icon={['fas', 'info-circle']} />
                      </span>
                      <div className="drawRectanglePopup-text">
                        Uploading shapefiles files larger than 2MB is not
                        allowed.
                      </div>
                    </>
                  )}
                  {this.state.infoPopupType === 'incorrectWkid' && (
                    <>
                      <span className="drawRectanglePopup-icon">
                        <FontAwesomeIcon icon={['fas', 'info-circle']} />
                      </span>
                      <div className="drawRectanglePopup-text">
                        The spatial reference is not correct.
                      </div>
                    </>
                  )}
                  {this.state.infoPopupType === 'singleFeature' && (
                    <>
                      <span className="drawRectanglePopup-icon">
                        <FontAwesomeIcon icon={['fas', 'info-circle']} />
                      </span>
                      <div className="drawRectanglePopup-text">
                        The file can’t contain more than one register.
                      </div>
                    </>
                  )}
                  {this.state.infoPopupType === 'singlePolygon' && (
                    <>
                      <span className="drawRectanglePopup-icon">
                        <FontAwesomeIcon icon={['fas', 'info-circle']} />
                      </span>
                      <div className="drawRectanglePopup-text">
                        Uploaded file is not a polygon geometry type.
                      </div>
                    </>
                  )}
                  {this.state.infoPopupType === 'invalidShapefile' && (
                    <>
                      <span className="drawRectanglePopup-icon">
                        <FontAwesomeIcon icon={['fas', 'info-circle']} />
                      </span>
                      <div className="drawRectanglePopup-text">
                        Invalid file format, or incomplete shapefile.
                      </div>
                    </>
                  )}
                  {this.state.infoPopupType === 'invalidFileFormat' && (
                    <>
                      <span className="drawRectanglePopup-icon">
                        <FontAwesomeIcon icon={['fas', 'info-circle']} />
                      </span>
                      <div className="drawRectanglePopup-text">
                        The file content is not correctly formatted.
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="coordinateWindow">
          <div className="coordinateHeader">
            Add new coordinates
            <div
              className="esri-icon-close esri-interactive closeCoordinates"
              onClick={this.closeCoordinates.bind(this)}
              onKeyDown={this.closeCoordinates.bind(this)}
              tabIndex="0"
              role="button"
            ></div>
          </div>
          <div className="coordinateContainer">
            <div className="coordinateSubContainer">
              <div className="coordinateSubContainerTitle">NW</div>
              <div>
                Lat:
                <input
                  type="number"
                  id="menu-north"
                  min="-90"
                  max="90"
                  placeholder="00.000000"
                  className="coordinateInput"
                />
              </div>
              <div>
                Lon:
                <input
                  type="number"
                  id="menu-west"
                  min="-180"
                  max="180"
                  placeholder="00.000000"
                  className="coordinateInput"
                />
              </div>
            </div>
            <div className="coordinateSubContainer">
              <div className="coordinateSubContainerTitle">SE</div>
              <div>
                Lat:
                <input
                  type="number"
                  id="menu-south"
                  min="-90"
                  max="90"
                  placeholder="00.000000"
                  className="coordinateInput"
                />
              </div>
              <div>
                Lon:
                <input
                  type="number"
                  id="menu-east"
                  min="-180"
                  max="180"
                  placeholder="00.000000"
                  className="coordinateInput"
                />
              </div>
            </div>
            <button
              aria-label="Search"
              className="button menu-search-button-coordinatess"
              onClick={() => this.addCoordinates()}
              onKeyDown={(e) => {
                if (
                  !e.altKey &&
                  e.code !== 'Tab' &&
                  !e.ctrlKey &&
                  e.code !== 'Delete' &&
                  !e.shiftKey &&
                  !e.code.startsWith('F')
                ) {
                  this.addCoordinates();
                }
              }}
            >
              Add this area to the map
            </button>
          </div>
        </div>
      </>
    );
  }
}
export default AreaWidget;
