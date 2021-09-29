import React, { createRef } from 'react';
import './css/ArcgisMap.css';
import classNames from 'classnames';

import { loadModules, loadCss } from 'esri-loader';
import LayerControl from './LayerControl';
import InfoWidget from './InfoWidget';
import NavigationControl from './NavigationControl';

let Map, MapView, FeatureLayer, Extent, SimpleMarkerSymbol, SimpleRenderer;

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
    this.popupOnce = false;
  }

  loader() {
    return loadModules([
      'esri/WebMap',
      'esri/views/MapView',
      'esri/layers/FeatureLayer',
      'esri/geometry/Extent',
      "esri/symbols/SimpleMarkerSymbol",
      "esri/renderers/SimpleRenderer"
    ]).then(([_Map, _MapView, _FeatureLayer, _Extent, _SimpleMarkerSymbol, _SimpleRenderer]) => {
      [Map, MapView, FeatureLayer, Extent, SimpleMarkerSymbol, SimpleRenderer] = [
        _Map,
        _MapView,
        _FeatureLayer,
        _Extent,
        _SimpleMarkerSymbol,
        _SimpleRenderer
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
      zoom: this.mapCfg.zoom,
      ui: {
        components: ['attribution'],
      },
    });

    this.view.ui.add(this.zoom, {
      position: 'top-right',
    });

    const layerControl = new LayerControl({
      map: this.map,
      view: this.view,
      FeatureLayer: FeatureLayer,
      Extent: Extent,
    });

    const layerSpatial = layerControl.createLayer({
      id: 'layerSpatial',
      url:
        'https://bm-eugis.tk/arcgis/rest/services/CLMS/UseCasesSpatialCoverage/MapServer/0',
    });

    const layerRegion = layerControl.createLayer({
      id: 'layerRegion',
      url:
        'https://bm-eugis.tk/arcgis/rest/services/CLMS/UseCasesRegion_count/MapServer/0',
    });




    const renderer = new SimpleRenderer({
      symbol: new SimpleMarkerSymbol({
        size: 4,
        color: "Yellow",
        outline: null,
        visualVariables: [{
          type: "color",
          field: Use_case_submitting_production_year,
          // features with 30 ppl/sq km or below are assigned the first color
          stops: [
            { value: 2020, color: "Blue" },
            { value: 2019, color: "Black" },
            { value: 2018, color: "Green" },
          ]
        }]
      }),
    });

    layerSpatial.renderer = renderer;


    layerControl.addLayer(layerRegion);
    layerControl.addLayer(layerSpatial);
    layerControl.hideLayer(layerSpatial.id);

    const navigationControl = new NavigationControl({
      map: this.map,
      view: this.view,
      center: this.mapCfg.center,
      layerControl: layerControl,
      layerRegion: layerRegion,
      layerSpatial: layerSpatial,
    });

    const infoWidget = new InfoWidget({
      map: this.map,
      view: this.view,
      layerControl: layerControl,
      navigationControl: navigationControl,
      FeatureLayer: FeatureLayer,
      layerRegion: layerRegion,
      layerSpatial: layerSpatial,
      SimpleMarkerSymbol: SimpleMarkerSymbol,
      SimpleRenderer: SimpleRenderer,
    });


    this.view.on('click', (e) => {
      const screenPoint = { x: e.x, y: e.y };

      (async () => {

        const selectedPoint = await layerControl.getPointInfo(screenPoint);
        if (selectedPoint.BBOX) {

          const selectedRegion = selectedPoint.Region;
          const boundingBox = selectedPoint.BBOX;
          const selectedTitle = selectedPoint.Use_case_title;

          if (this.state.useCaseLevel == 1) {
            navigationControl.navigateToRegion(boundingBox, selectedRegion, layerSpatial);
            this.setState({ useCaseLevel: 2, region: selectedRegion, previousState: this.state.useCaseLevel });
            this.view.popup.close();
            this.popupOnce = true;
            document.querySelector('.map').style.cursor = '';

          } else if (this.state.useCaseLevel == 2) {
            navigationControl.navigateToLocation(boundingBox, selectedTitle, selectedRegion, layerSpatial);
            this.setState({ useCaseLevel: 3, selectedUseCase: selectedPoint, previousState: this.state.useCaseLevel });
          }
        }
      })();
    });

    this.view.on('pointer-move', (e) => {
      let screenPoint = {
        x: e.x,
        y: e.y,
      };

      let useCaseLevel = document.querySelector('.use-case-button-back') ? 2 : document.querySelector('.use-cases-products-list') ? 1 : 3;

      if (useCaseLevel == 1) {
        this.view.hitTest(screenPoint)
          .then((response) => {
            if (response.results.length > 1) {
              if (response.results[0].graphic.geometry != null && this.popupOnce) {
                this.popupOnce = false;
                document.querySelector('.map').style.cursor = 'pointer';
                let region = response.results[0].graphic.attributes.Region;

                this.getRegionInfo(region, (data) => {
                  let data_eu = data.features.filter(a => a.attributes.Spatial_coverage == 'EU' || a.attributes.Spatial_coverage == 'UK').length;
                  let data_eea = data.features.filter(a => a.attributes.Spatial_coverage == 'EEA').length;
                  let data_global = data.features.filter(a => a.attributes.Spatial_coverage == 'GLOBAL').length;
                  let data_country = data.features.filter(a => a.attributes.Spatial_coverage != 'EU' && a.attributes.Spatial_coverage != 'UK' && a.attributes.Spatial_coverage != 'EEA' && a.attributes.Spatial_coverage != 'GLOBAL').length;

                  let string = '';
                  if (data_eu > 0) {
                    string += `<div>EU-27 + UK use cases: ${data_eu}</div>`;
                  }
                  if (data_eea > 0) {
                    string += `<div>EEA use cases: ${data_eea}</div>`;
                  }
                  if (data_global > 0) {
                    string += `<div>Global use cases: ${data_global}</div>`;
                  }
                  if (data_country > 0) {
                    string += `<div>Other countries use cases: ${data_country}</div>`;
                  }

                  this.view.popup.open({
                    location: { latitude: response.results[0].graphic.geometry.latitude, longitude: response.results[0].graphic.geometry.longitude },
                    content: string,
                  });
                });
              }
            } else {
              this.view.popup.close();
              this.popupOnce = true;
              document.querySelector('.map').style.cursor = '';
            }
          });
      } else if (useCaseLevel == 2) {
        this.view.hitTest(screenPoint)
          .then((response) => {
            if (response.results.length > 1) {
              if (response.results[0].graphic.geometry != null && this.popupOnce) {
                this.popupOnce = false;
                document.querySelector('.map').style.cursor = 'pointer';
                document.querySelector('#use_case_' + response.results[0].graphic.attributes.OBJECTID).classList.add('selected');
              }
            } else {
              this.popupOnce = true;
              document.querySelector('.map').style.cursor = '';
              if (document.querySelector('.use-case-element.selected')) document.querySelector('.use-case-element.selected').classList.remove('selected');
            }
          });
      }
    });

    //Once we have created the MapView, we need to ensure that the map div
    //is refreshed in order to show the map on it. To do so, we need to
    //trigger the renderization again, and to trigger the renderization
    //we invoke the setState method, that changes the state and forces a
    //react component to render itself again
    this.disableMapFunctions(this.view);

    this.setState({ useCaseLevel: 1 });
  }

  getRegionInfo(region, callback) {
    let xmlhttp;
    const url = `https://bm-eugis.tk/arcgis/rest/services/CLMS/UseCasesSpatial/MapServer/0/query?where=Region+%3D+%27${region}%27&text=&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&relationParam=&outFields=*&returnGeometry=true&returnTrueCurves=false&maxAllowableOffset=&geometryPrecision=&outSR=&having=&returnIdsOnly=false&returnCountOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&gdbVersion=&historicMoment=&returnDistinctValues=false&resultOffset=&resultRecordCount=&queryByDistance=&returnExtentOnly=false&datumTransformation=&parameterValues=&rangeValues=&quantizationParameters=&featureEncoding=esriDefault&f=pjson`;
    xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function () {
      if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
        let data = JSON.parse(this.responseText);
        callback(data);
      }
    }
    xmlhttp.open("GET", url, true);
    xmlhttp.send();
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

    const prohibitedKeys = ['+', '-', 'Shift', '_', '='];
    view.on('key-down', function (event) {
      const keyPressed = event.key;
      if (prohibitedKeys.indexOf(keyPressed) !== -1) {
        event.stopPropagation();
      }
    });
    view.on('key-down', ['Shift'], function (event) {
      const keyPressed = event.key;
      if (prohibitedKeys.indexOf(keyPressed) !== -1) {
        event.stopPropagation();
      }
    });
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
            <h2>See use cases by product</h2>
          </div>
        </div>
        <div className="ccl-container ccl-container-flex">
          {this.renderInfo()}
          <div className="use-cases-products-map cont-w-50">
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
