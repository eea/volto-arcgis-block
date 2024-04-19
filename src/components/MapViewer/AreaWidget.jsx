import React, { createRef } from 'react';
import { loadModules } from 'esri-loader';
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
  SpatialReference;

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
      this.clearWidget();
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
      this.container.current.querySelector('input:checked').click();
    }
  }
  nutsRadioButton(e) {
    if (e.target.value === 'nuts') {
      if (
        !document.getElementById('download_area_select_nuts2').checked &&
        !document.getElementById('download_area_select_nuts3').checked
      ) {
        document.getElementById('download_area_select_nuts1').checked = true;
        this.loadNutsService('nuts1', [1, 2]);
      }
    }
    if (
      e.target.value === 'nuts1' ||
      e.target.value === 'nuts2' ||
      e.target.value === 'nuts3'
    ) {
      document.getElementById('download_area_select_nuts').checked = true;
    }
    if (e.target.value === 'nuts0' || e.target.value === 'area') {
      document.getElementById('download_area_select_nuts1').checked = false;
      document.getElementById('download_area_select_nuts2').checked = false;
      document.getElementById('download_area_select_nuts3').checked = false;
    }
  }
  nuts0handler(e) {
    this.loadNutsService(e.target.value, [0]);
    this.loadCountriesService(e.target.value);
    this.nutsRadioButton(e);
  }
  nuts1handler(e) {
    this.loadNutsService(e.target.value, [1, 2]);
    this.nutsRadioButton(e);
  }
  nuts2handler(e) {
    this.loadNutsService(e.target.value, [3, 4, 5]);
    this.nutsRadioButton(e);
  }
  nuts3handler(e) {
    this.loadNutsService(e.target.value, [6, 7, 8]);
    this.nutsRadioButton(e);
  }
  // countriesHandler(e) {
  //   this.loadCountriesService(e.target.value);
  // }

  loadNutsService(id, levels) {
    this.clearWidget();
    document.querySelector('.esri-attribution__powered-by').style.display =
      'flex';
    levels.forEach((level) => {
      var layer = new FeatureLayer({
        id: id,
        //url: this.props.urls.nutsHandler,
        url: this.nutsUrl,
        layerId: level,
        outFields: ['*'],
        popupEnabled: false,
        //definitionExpression: 'LEVL_CODE=' + level,
      });

      //this.removeFileUploadedLayer();

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
      //url: this.props.urls.outsideEu,
      url:
        'https://land.discomap.eea.europa.eu/arcgis/rest/services/CLMS_Portal/World_countries_except_EU37/MapServer',
      layerId: 0,
      outFields: ['*'],
      popupEnabled: false,
    });

    //this.removeFileUploadedLayer();

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
    //Get the file name
    const fileName = e.target.value.toLowerCase();

    //Get the file size
    const fileSize = e.target.files[0].size;

    //Get the file from the form
    const file = document.getElementById('uploadForm');

    //List allowed file extensions

    let fileExtensions = ['zip', 'geojson'];

    // Get the file extension
    let fileExtension = fileName.split('.').pop();

    //Check if the file format is not supported

    if (fileExtensions.indexOf(fileExtension) === -1) {
      this.setState({
        showInfoPopup: true,
        infoPopupType: 'fileFormat',
      });
      return;
    }

    // Check if the file is a geojson and the file size is over the 10mb file size limit
    // or file is a shape file and the file size is over the 2mb file size limit

    if (fileSize > 10485760 && fileExtension === 'geojson') {
      this.setState({
        showInfoPopup: true,
        infoPopupType: 'fileLimit',
      });
      return;
    }

    if (fileSize > 2097152 && fileExtension === 'zip') {
      this.setState({
        showInfoPopup: true,
        infoPopupType: 'shapefileLimit',
      });
      return;
    }

    switch (fileExtension) {
      case 'zip':
        this.generateFeatureCollection(fileName, file, 'shapefile');
        break;
      case 'geojson':
        this.generateFeatureCollection(fileName, file, 'geojson');
        break;
      //case 'csv':
      //this.generateFeatureCollection(
      //  fileName,
      //  file,
      //  'csv',
      //);
      //  reader.readAsText(fileBlob);
      //  break;
      default:
        break;
    }
    setTimeout(() => {
      e.target.value = null;
    }, 2000);
  };

  generateFeatureCollection(fileName, file, inputFormat) {
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
    };
    // generalize features to 10 meters for better performance
    params.generalize = true;
    params.maxAllowableOffset = 10;
    params.reducePrecision = true;
    params.numberOfDigitsAfterDecimal = 0;

    const myContent = {
      filetype: inputFormat,
      publishParameters: JSON.stringify(params),
      f: 'json',
    };
    // use the REST generate operation to generate a feature collection from the zipped shapefile
    request(this.uploadPortal + '/sharing/rest/content/features/generate', {
      query: myContent,
      body: file,
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
            return;
          }

          //Create a feature layer from the feature collection
          this.addFeatureCollectionToMap(featureCollection);
        } else {
          //console.error('Unexpected response structure:', response);
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
        } else {
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
          type: 'simple-fill', // autocasts as new SimpleFillSymbol()
          color: [234, 168, 72, 0.8],
          outline: {
            // autocasts as new SimpleLineSymbol()
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
    } else {
      //Remove old uploaded file and save new one to component props for reference

      this.removeFileUploadedLayer();
      this.fileUploadLayer = { layers: layers, sourceGraphics: sourceGraphics };

      //remove NUTS and COUNTRIES layers from map

      this.removeNutsLayers();

      //Add uploaded layer to the map and zoom to the extent

      this.props.view.graphics.addMany(sourceGraphics);
      this.props.view.goTo(sourceGraphics).catch((error) => {
        //console.error('From addFeatureCollectionToMap function', error);
      });

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

      //Save file upload layer to session storage as a tag for adding item to cart action

      sessionStorage.setItem(
        'fileUploadLayer',
        JSON.stringify(this.fileUploadLayer),
      );
    }
  }

  //Check if the featurecollection has more than one feature

  checkFeatureCount(layers) {
    if (layers.layers[0].featureSet.features.length > 1) {
      this.setState({
        showInfoPopup: true,
        infoPopupType: 'singleFeature',
      });
      return false;
    } else {
      return true;
    }
  }

  //Display CSV on the map

  handleCsv(data) {
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

    //Query all features insisde the CSV layer

    //csvLayer.load().then(function(){
    //  let query = new Query({
    //    where: "mag > 5",
    //    returnGeometry: true
    //  });
    //
    //  return csvLayer.queryFeatures(query);
    //})
    //.then(function(results){
    //  console.log(results);
    //})
    //.catch(function (error) {
    //  console.error("From CSV query: ", error);
    //});
    //Check if the file has the correct spatial reference
    if (this.checkWkid(csvLayer?.spatialReference) === false) return;

    //Check if the file extent is larger than the limit
    //let geometry = new Extent({
    //  xmin: data?.features[0]?.geometry.bbox[0],
    //  xmax: data?.features[0]?.geometry.bbox[1],
    //  ymin: data?.features[0]?.geometry.bbox[2],
    //  ymax: data?.features[0]?.geometry.bbox[3],
    //  spatialReference: { wkid: 4326 },
    //});

    //If checkExtent returns false, add the layer to the map
    //if (this.checkExtent(geometry)) {
    //  this.setState({
    //    showInfoPopup: true,
    //    infoPopupType: 'fullDataset',
    //  });
    //} else {
    this.removeFileUploadedLayer();
    this.fileUploadLayer = csvLayer;
    this.removeNutsLayers();
    this.props.map.add(this.fileUploadLayer);
    this.setState({
      showInfoPopup: true,
      infoPopupType: 'download',
    });
    //}
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
    }
  }

  //Remove the NUTS layers from the map

  removeNutsLayers() {
    //find all the radio buttons

    let radioButtons = document.querySelectorAll('fieldset.ccl-fieldset');
    let rectangleRadioButton = document.querySelector(
      '#download_area_select_rectangle',
    );
    // Isolate the the checked radio button

    let selectedRadioButton = Array.from(radioButtons).find((radioButton) => {
      let input = radioButton.querySelector('input');
      return input && input.type === 'radio' && input.checked;
    });

    //Uncheck the selected radio button

    if (selectedRadioButton) {
      selectedRadioButton.querySelector('input').checked = false;
    }
    if (rectangleRadioButton.checked) {
      rectangleRadioButton.checked = false;
    }

    //Remove the layers in this.nutsGroupLayer from the map

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
    if (extent.width * extent.height > areaLimit) {
      return true;
    } else {
      return false;
    }
  }

  rectanglehandler(event) {
    this.clearWidget();
    window.document.querySelector('.pan-container').style.display = 'flex';
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
        } else {
          this.setState({
            showInfoPopup: true,
            infoPopupType: 'download',
          });
        }
        if (this.props.download) {
          if (extentGraphic && this.checkExtent(extentGraphic.geometry)) {
            let popupToUpdate = document.querySelector(
              '.drawRectanglePopup-block',
            );
            popupToUpdate.style.display = 'block';
            popupToUpdate.innerHTML =
              '<div class="drawRectanglePopup-content">' +
              '<span class="drawRectanglePopup-icon"><span class="esri-icon-cursor-marquee"></span></span>' +
              '<div class="drawRectanglePopup-text">' +
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
        } else {
          this.setState({
            showInfoPopup: true,
            infoPopupType: 'download',
          });
        }
        if (this.props.download) {
          if (extentGraphic && this.checkExtent(extentGraphic.geometry)) {
            let popupToUpdate = document.querySelector(
              '.drawRectanglePopup-block',
            );
            popupToUpdate.style.display = 'block';
            popupToUpdate.innerHTML =
              '<div class="drawRectanglePopup-content">' +
              '<span class="drawRectanglePopup-icon"><span class="esri-icon-cursor-marquee"></span></span>' +
              '<div class="drawRectanglePopup-text">' +
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
    this.nutsRadioButton(event);
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
    if (sessionStorage.getItem('fileUploadLayer')) {
      sessionStorage.removeItem('fileUploadLayer');
    }
    if (this.props.download) {
      let popup = document.querySelector('.drawRectanglePopup-block');
      popup.innerHTML =
        '<div class="drawRectanglePopup-content">' +
        '<span class="drawRectanglePopup-icon"><span class="esri-icon-cursor-marquee"></span></span>' +
        '<div class="drawRectanglePopup-text">Select or draw an area of interest in the map to continue</div>' +
        '</div>';
      popup.style.display = 'block';
    }
    document.querySelector('.esri-attribution__powered-by').style.display =
      'none';
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

    this.props.download
      ? this.container !== null && this.props.view.ui.add(this.container)
      : this.props.view.ui.add(this.container.current, 'top-right');

    var popup = document.createElement('div');
    popup.className = 'drawRectanglePopup-block';
    popup.innerHTML =
      '<div class="drawRectanglePopup-content">' +
      '<span class="drawRectanglePopup-icon"><span class="esri-icon-cursor-marquee"></span></span>' +
      '<div class="drawRectanglePopup-text">Select or draw an area of interest in the map to continue</div>' +
      '</div>';
    this.props.download && this.props.view.ui.add(popup, 'top-right');
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
                <div className="area-header">Select by country or region</div>
                <div className="ccl-form">
                  <fieldset className="ccl-fieldset">
                    <div className="ccl-form-group">
                      <input
                        type="radio"
                        id="download_area_select_nuts0"
                        name="downloadAreaSelect"
                        value="nuts0"
                        className="ccl-checkbox cl-required ccl-form-check-input"
                        defaultChecked
                        onClick={this.nuts0handler.bind(this)}
                      ></input>
                      <label
                        className="ccl-form-radio-label"
                        htmlFor="download_area_select_nuts0"
                      >
                        <span>By country</span>
                      </label>
                    </div>
                    <div className="ccl-form-group">
                      <input
                        type="radio"
                        id="download_area_select_nuts"
                        name="downloadAreaSelect"
                        value="nuts"
                        className="ccl-checkbox cl-required ccl-form-check-input"
                        onClick={this.nutsRadioButton.bind(this)}
                      ></input>
                      <label
                        className="ccl-form-radio-label"
                        htmlFor="download_area_select_nuts"
                      >
                        <span>By NUTS</span>
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
                          className="ccl-checkbox ccl-required ccl-form-check-input"
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
                          className="ccl-checkbox ccl-required ccl-form-check-input"
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
                          className="ccl-radio ccl-required ccl-form-check-input"
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
                    <br></br>
                    <div className="rectangle-header">
                      Draw a rectangle on the map
                    </div>
                    <div className="ccl-form-group">
                      <input
                        type="radio"
                        id="download_area_select_rectangle"
                        name="downloadAreaSelect"
                        value="area"
                        className="ccl-radio ccl-required ccl-form-check-input"
                        onClick={this.rectanglehandler.bind(this)}
                      ></input>
                      <label
                        className="ccl-form-radio-label"
                        htmlFor="download_area_select_rectangle"
                      >
                        <span>
                          Click and drag your mouse on the map to select your
                          area of interest
                        </span>
                      </label>
                    </div>
                  </fieldset>
                </div>
                <br />
                <div className="area-header">
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
                    enctype="multipart/form-data"
                    method="post"
                    id="uploadForm"
                  >
                    <div className="field">
                      <label className="file-upload">
                        <span>File formats supported: shp(zip), geojson</span>
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
                        Uploading geojson or csv files larger than 10MB is not
                        allowed.
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
                        Uploading files with more than a single feature is not
                        allowed.
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
                </div>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }
}
export default AreaWidget;
