import React, { createRef } from 'react';
import './css/ArcgisMap.css';
import classNames from 'classnames';

import { loadModules, loadCss } from 'esri-loader';
import LayerControl from './LayerControl';
import InfoWidget from './InfoWidget';
import NavigationControl from './NavigationControl';

let Map,
  MapView,
  FeatureLayer,
  Extent,
  Basemap,
  VectorTileLayer,
  layerControl,
  navigationControl,
  layerSpatial;

class UseCasesMapViewer extends React.Component {
  constructor(props) {
    super(props);
    this.mapdiv = createRef();
    this.mapCfg = props.cfg.Map;
    this.serviceCfg = props.cfg.Services;
    this.compCfg = this.props.cfg.Components;
    this.url = this.props.cfg.url;
    this.map = null;
    this.id = props.id;
    this.popupOnce = false;
    this.mapClass = classNames('map-container', {
      [`${props.customClass}`]: props.customClass || null,
    });
    this.spatialConfig = {
      id: 'spatialLayer',
      url: props.cfg.Services.SpatialCoverageLayer,
      render: props.cfg.SpatialRenderer,
    };
    this.regionConfig = {
      id: 'regionLayer',
      url: props.cfg.Services.RegionLayer,
      render: props.cfg.RegionMarkerRenderer,
      label: props.cfg.RegionLabel,
    };
  }

  loader() {
    return loadModules([
      'esri/WebMap',
      'esri/views/MapView',
      'esri/layers/FeatureLayer',
      'esri/geometry/Extent',
      'esri/Basemap',
      'esri/layers/VectorTileLayer',
    ]).then(
      ([
        _Map,
        _MapView,
        _FeatureLayer,
        _Extent,
        _Basemap,
        _VectorTileLayer,
      ]) => {
        [Map, MapView, FeatureLayer, Extent, Basemap, VectorTileLayer] = [
          _Map,
          _MapView,
          _FeatureLayer,
          _Extent,
          _Basemap,
          _VectorTileLayer,
        ];
      },
    );
  }

  /**
   * Once the component has been mounted in the screen, this method
   * will be executed, so we can access to the DOM elements, since
   * they are already mounted
   */
  async componentDidMount() {
    loadCss();
    await this.loader();

    const gray_basemap = new VectorTileLayer({
      portalItem: {
        id: '291da5eab3a0412593b66d384379f89f',
      },
    });

    let basemap = new Basemap({
      baseLayers: [gray_basemap],
    });

    // this.mapdiv.current is the reference to the current DOM element of
    // this.mapdiv after it was mounted by the render() method
    this.map = new Map({
      basemap: basemap,
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

    layerControl = new LayerControl({
      map: this.map,
      view: this.view,
      FeatureLayer: FeatureLayer,
      Extent: Extent,
    });

    layerSpatial = layerControl.createLayer({
      id: this.spatialConfig.id,
      url: this.spatialConfig.url,
    });

    layerSpatial.renderer = this.spatialConfig.render;

    const layerRegion = layerControl.createLayer({
      id: this.regionConfig.id,
      url: this.regionConfig.url,
    });

    layerRegion.renderer = this.regionConfig.render;
    layerRegion.labelingInfo = [this.regionConfig.label];

    layerControl.addLayer(layerRegion);
    layerControl.addLayer(layerSpatial);
    layerControl.hideLayer(layerSpatial.id);

    navigationControl = new NavigationControl({
      map: this.map,
      view: this.view,
      center: this.mapCfg.center,
      layerControl: layerControl,
      mapViewer: this,
      layerRegion: layerRegion,
      layerSpatial: layerSpatial,
    });

    this.setMapFunctions(
      this.view,
      layerControl,
      navigationControl,
      layerSpatial,
    );

    //Once we have created the MapView, we need to ensure that the map div
    //is refreshed in order to show the map on it. To do so, we need to
    //trigger the renderization again, and to trigger the renderization
    //we invoke the setState method, that changes the state and forces a
    //react component to render itself again
    this.setState(() => ({ useCaseLevel: 1 }));
  }

  getRegionInfo(region, callback) {
    const xmlhttp = new XMLHttpRequest();
    const url = `${this.spatialConfig.url}/query?where=Region+%3D+%27${region}%27&text=&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&relationParam=&outFields=*&returnGeometry=true&returnTrueCurves=false&maxAllowableOffset=&geometryPrecision=&outSR=&having=&returnIdsOnly=false&returnCountOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&gdbVersion=&historicMoment=&returnDistinctValues=false&resultOffset=&resultRecordCount=&queryByDistance=&returnExtentOnly=false&datumTransformation=&parameterValues=&rangeValues=&quantizationParameters=&featureEncoding=esriDefault&f=pjson`;
    xmlhttp.onreadystatechange = () => {
      if (xmlhttp.readyState === 4 && xmlhttp.status === 200) {
        const data = JSON.parse(xmlhttp.responseText);
        callback(data, this);
      }
    };
    xmlhttp.open('GET', url, true);
    xmlhttp.send();
  }

  /**
   * This method will disable all the functionalities on the map
   * @param {MapView} view
   * @param {LayerControl} layerControl
   * @param {NavigationControl} navigationControl
   * @param {FeatureLayer} layerSpatial
   */
  setMapFunctions(view, layerControl, navigationControl, layerSpatial) {
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
    view.on('click', (e) => {
      const screenPoint = { x: e.x, y: e.y };

      (async () => {
        let selectedPoint = await layerControl.getPointInfo(screenPoint);
        if (selectedPoint.BBOX) {
          const selectedRegion = selectedPoint.Region;
          const boundingBox = selectedPoint.BBOX;
          const selectedTitle = selectedPoint.Use_case_title;
          const selectedSpatial = selectedPoint.Spatial_coverage;
          if (this.state.useCaseLevel === 1 && selectedPoint.COUNT > 1) {
            navigationControl.navigateToRegion(
              boundingBox,
              selectedRegion,
              layerSpatial,
            );
            this.setState((prevState) => {
              return {
                useCaseLevel: 2,
                region: selectedRegion,
                previousState: prevState.useCaseLevel,
              };
            });
          } else if (
            this.state.useCaseLevel === 2 ||
            selectedPoint.COUNT === 1
          ) {
            if (!layerSpatial.visible && selectedPoint.COUNT === 1) {
              this.getRegionInfo(selectedRegion, (data, MapViewerThis) => {
                data = data.features[0].attributes;
                navigationControl.navigateToRegion(
                  data.BBOX,
                  data.Region,
                  layerSpatial,
                );

                // navigationControl.navigateToLocation(
                //   data.BBOX,
                //   data.Use_case_title,
                //   data.Region,
                //   data.Spatial_coverage,
                //   layerSpatial,
                // );
                MapViewerThis.setState((prevState) => {
                  return {
                    useCaseLevel: 3,
                    selectedUseCase: data,
                    region: data.Region,
                    previousState: prevState.useCaseLevel,
                  };
                });
              });
            } else {
              navigationControl.navigateToLocation(
                boundingBox,
                selectedTitle,
                selectedRegion,
                selectedSpatial,
                layerSpatial,
              );
              this.setState((prevState) => {
                return {
                  useCaseLevel: 3,
                  selectedUseCase: selectedPoint,
                  previousState: prevState.useCaseLevel,
                };
              });
            }
          }
          view.popup.close();
          this.popupOnce = true;
          document.querySelector('.map').style.cursor = '';
        }
      })();
    });

    view.on('pointer-move', (e) => {
      let screenPoint = {
        x: e.x,
        y: e.y,
      };

      let useCaseLevel = document.querySelector('.use-case-button-back')
        ? 2
        : document.querySelector('.use-cases-products-list')
        ? 1
        : 3;

      if (useCaseLevel === 1) {
        view.hitTest(screenPoint).then((response) => {
          if (response.results.length > 1) {
            if (
              response.results[0].graphic.geometry !== null &&
              this.popupOnce
            ) {
              this.popupOnce = false;
              document.querySelector('.map').style.cursor = 'pointer';
              let region = response.results[0].graphic.attributes.Region;

              this.getRegionInfo(region, (data) => {
                let data_eu = data.features.filter(
                  (a) => a.attributes.Spatial_coverage === 'EU',
                ).length;
                let data_eea = data.features.filter(
                  (a) => a.attributes.Spatial_coverage === 'EEA',
                ).length;
                let data_global = data.features.filter(
                  (a) => a.attributes.Spatial_coverage === 'GLOBAL',
                ).length;
                let data_country = data.features.filter(
                  (a) =>
                    a.attributes.Spatial_coverage !== 'EU' &&
                    a.attributes.Spatial_coverage !== 'EEA' &&
                    a.attributes.Spatial_coverage !== 'GLOBAL',
                ).length;

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

                view.popup.open({
                  location: {
                    latitude: response.results[0].graphic.geometry.latitude,
                    longitude: response.results[0].graphic.geometry.longitude,
                  },
                  content: string,
                });
              });
            }
          } else {
            view.popup.close();
            this.popupOnce = true;
            document.querySelector('.map').style.cursor = '';
          }
        });
      } else if (useCaseLevel === 2) {
        view.hitTest(screenPoint).then((response) => {
          if (response.results.length > 1) {
            if (
              response.results[0].graphic.geometry !== null &&
              this.popupOnce
            ) {
              this.popupOnce = false;
              document.querySelector('.map').style.cursor = 'pointer';
              document
                .querySelector(
                  '#use_case_' +
                    response.results[0].graphic.attributes.OBJECTID,
                )
                .classList.add('selected');
            }
          } else {
            this.popupOnce = true;
            document.querySelector('.map').style.cursor = '';
            if (document.querySelector('.use-case-element.selected'))
              document
                .querySelector('.use-case-element.selected')
                .classList.remove('selected');
          }
        });
      }
    });
  }

  renderInfo() {
    if (this.view) {
      return (
        <InfoWidget
          view={this.view}
          mapViewer={this}
          layerControl={layerControl}
          navigationControl={navigationControl}
          layerSpatial={layerSpatial}
        />
      );
    }
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
