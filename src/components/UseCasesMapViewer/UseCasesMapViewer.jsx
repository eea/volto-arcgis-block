import React, { createRef } from 'react';
import './css/ArcgisMap.css';
import classNames from 'classnames';

import { loadModules, loadCss } from 'esri-loader';
import LayerControl from './LayerControl';
import InfoWidget from './InfoWidget';
import NavigationControl from './NavigationControl';

var Map, MapView, Zoom, FeatureLayer, Extent;

class UseCasesMapViewer extends React.Component {
  /**
   * This method does the creation of the main component
   * @param {*} props
   */
  constructor(props) {
    super(props);
    //we create a reference to the DOM element that will
    //be later mounted. We will use the reference that we
    //create here to reference the DOM element from javascript
    //code, for example, to create later a MapView component
    //that will use the map div to show the map
    this.mapdiv = createRef();
    this.mapCfg = props.cfg.Map;
    this.compCfg = this.props.cfg.Components;
    this.url = this.props.cfg.url;
    this.map = null;
    this.id = props.id;
    this.mapClass = classNames('map-container', {
      [`${props.customClass}`]: props.customClass || null,
    });
  }

  loader() {
    return loadModules([
      'esri/WebMap',
      'esri/views/MapView',
      'esri/widgets/Zoom',
      'esri/layers/FeatureLayer',
      'esri/geometry/Extent',
    ]).then(([_Map, _MapView, _Zoom, _FeatureLayer, _Extent]) => {
      [Map, MapView, Zoom, FeatureLayer, Extent] = [
        _Map,
        _MapView,
        _Zoom,
        _FeatureLayer,
        _Extent,
      ];
    });
  }

  /**
   * Once the component has been mounted in the screen, this method
   * will be executed, so we can access to the DOM elements, since
   * they are already mounted
   */
  async componentDidMount() {
    loadCss();
    await this.loader();

    // this.mapdiv.current is the reference to the current DOM element of
    // this.mapdiv after it was mounted by the render() method
    this.map = new Map({
      basemap: 'gray-vector',
    });

    this.view = new MapView({
      container: this.mapdiv.current,
      map: this.map,
      center: this.mapCfg.center,
      zoom: 1,
      ui: {
        components: ['attribution'],
      },
    });

    this.view.ui.add(this.zoom, {
      position: 'top-right',
    });

    var layerControl = new LayerControl({
      map: this.map,
      view: this.view,
      FeatureLayer: FeatureLayer,
      Extent: Extent,
    });

    var navigation = new NavigationControl({
      map: this.map,
      view: this.view,
      center: this.mapCfg.center,
      layerControl: layerControl,
    });

    var infoWidget = new InfoWidget({
      map: this.map,
      view: this.view,
      layerControl: layerControl,
      navigation: navigation,
      FeatureLayer: FeatureLayer,
    });

    var layerSpatial = layerControl.createLayer({
      id: 'layerSpatial',
      url:
        'https://bm-eugis.tk/arcgis/rest/services/CLMS/UseCasesSpatialCoverage/MapServer/0',
    });

    var layerRegion = layerControl.createLayer({
      id: 'layerRegion',
      url:
        'https://bm-eugis.tk/arcgis/rest/services/CLMS/UseCasesRegion/MapServer/0',
    });

    layerControl.addLayer(layerRegion);
    layerControl.addLayer(layerSpatial);
    layerControl.hideLayer(layerSpatial.id);
    this.view.on('click', (e) => {
      var screenPoint = { x: e.x, y: e.y };

      (async () => {
        // const geometryOptions = {
        //   geometryType: 'esriGeometryEnvelope',
        //   outField: [
        //     'Copernicus_Land_Monitoring_Service_products_used, Use_case_title, Use_case_topics, Use_case_submitting_production_year, Spatial_coverage',
        //   ],
        //   format: 'JSON',
        //   orderByFields: 'Copernicus_Land_Monitoring_Service_products_used',
        // };

        var selectedPoint = await layerControl.getPointInfo(screenPoint);
        var boundingBox = this.clearBBOX(selectedPoint.BBOX);
        navigation.navigateToRegion(boundingBox, infoWidget);

        this.setState({ useCaseLevel: 2 });
      })();
    });

    //Once we have created the MapView, we need to ensure that the map div
    //is refreshed in order to show the map on it. To do so, we need to
    //trigger the renderization again, and to trigger the renderization
    //we invoke the setState method, that changes the state and forces a
    //react component to render itself again
    this.disableMapFunctions(this.view);

    this.setState({ useCaseLevel: 1 });
  }

  disableMapFunctions(view) {
    view.on('mouse-wheel', function (event) {
      event.stopPropagation();
    });
    view.on('double-click', function (event) {
      event.stopPropagation();
    });
    view.on('double-click', ['Control'], function (event) {
      event.stopPropagation();
    });

    view.on('click', ['Shift'], function (event) {
      event.stopPropagation();
    });
    view.on('drag', function (event) {
      event.stopPropagation();
    });
    view.on('drag', ['Shift'], function (event) {
      event.stopPropagation();
    });

    view.on('drag', ['Shift', 'Control'], function (event) {
      event.stopPropagation();
    });

    view.on('key-down', function (event) {
      var prohibitedKeys = ['+', '-', 'Shift', '_', '='];
      var keyPressed = event.key;
      if (prohibitedKeys.indexOf(keyPressed) !== -1) {
        event.stopPropagation();
      }
    });
    view.on('key-down', ['Shift'], function (event) {
      var prohibitedKeys = ['+', '-', 'Shift', '_', '='];
      var keyPressed = event.key;
      if (prohibitedKeys.indexOf(keyPressed) !== -1) {
        event.stopPropagation();
      }
    });
  }

  clearBBOX(stringBbox) {
    var floatBbox = [];

    stringBbox = stringBbox.replace('[', '');
    stringBbox = stringBbox.replace(']', '');
    stringBbox = stringBbox.split(',');

    for (var number in stringBbox)
      floatBbox.push(parseFloat(stringBbox[number]));

    return floatBbox;
  }
  renderInfo() {
    return <InfoWidget view={this.view} mapViewer={this} />;
  }

  /**
   * This method renders the map viewer, invoking if necessary the methods
   * to render the other widgets to display
   * @returns jsx
   */
  render() {
    // we use a reference (ref={this.mapdiv}) in order to reference a
    // DOM element to be mounted (but not yet mounted)
    return (
      <div>
        <div className="ccl-container">
          <div className="use-cases-block">
            <h1>See use cases by product</h1>
          </div>
        </div>
        <br />
        <div className="ccl-container ccl-container-flex">
          {this.renderInfo()}
          <div className="use-cases-products-block cont-w-50">
            <div className="use-cases-products-title">
              Organisation locations
            </div>
            <div className={this.mapClass}>
              <div ref={this.mapdiv} className="map"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default UseCasesMapViewer;
