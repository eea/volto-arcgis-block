import React, { createRef } from 'react';
import './css/ArcgisMap.css';
import classNames from 'classnames';

import { loadModules, loadCss } from 'esri-loader';
import LayerControl from './LayerControl';
import InfoWidget from './InfoWidget';
import LegendWidget from './LegendWidget';
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
    this.thumbnail = this.props.cfg.Thumbnail;
    this.map = null;
    this.id = props.id;
    this.popupOnce = false;
    this.popupRegion = '';
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
    this.state = {
      useCaseLevel: 1,
      region: '',
      selectedUseCase: '',
      selectedUseCases: [],
      previousState: 1,
      showMapMenu: false,
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
      mapViewer: this,
      worldDimensions: this.mapCfg.worldDimensions,
      maxZoom: this.mapCfg.maxZoom,
      FeatureLayer: FeatureLayer,
      Extent: Extent,
    });

    layerSpatial = layerControl.createLayer({
      id: this.spatialConfig.id,
      url: this.spatialConfig.url,
    });

    layerSpatial.renderer = this.spatialConfig.render;

    let layerRegion = layerControl.createLayer({
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

  /**
   * This method will disable all the functionalities on the map
   * @param {MapView} view
   * @param {LayerControl} layerControl
   * @param {NavigationControl} navigationControl
   * @param {FeatureLayer} layerSpatial
   */
  setMapFunctions(view, layerControl, navigationControl, layerSpatial) {
    const prohibitedKeys = this.mapCfg.prohibitedKeys;

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
      let keyPressed = event.key;
      if (prohibitedKeys.indexOf(keyPressed) !== -1) {
        event.stopPropagation();
      }
    });
    view.on('key-down', ['Shift'], function (event) {
      let keyPressed = event.key;
      if (prohibitedKeys.indexOf(keyPressed) !== -1) {
        event.stopPropagation();
      }
    });
    view.on('click', (e) => {
      let screenPoint = { x: e.x, y: e.y };

      (async () => {
        let selectedPoint = await layerControl.getPointInfo(screenPoint);
        if (selectedPoint.BBOX) {
          let selectedRegion = selectedPoint.Region;
          let boundingBox = selectedPoint.BBOX;
          let selectedTitle = selectedPoint.Use_case_title;
          let selectedSpatial = selectedPoint.Spatial_coverage;
          if (this.state.useCaseLevel === 1 && selectedPoint.COUNT > 1) {
            navigationControl.navigateToRegion(
              boundingBox,
              selectedRegion,
              layerSpatial,
            );
            this.setState((prevState) => {
              return {
                useCaseLevel: 2,
                selectedUseCase: selectedPoint,
                region: selectedRegion,
                previousState: prevState.useCaseLevel,
              };
            });
          } else if (
            this.state.useCaseLevel === 2 ||
            selectedPoint.COUNT === 1
          ) {
            if (!layerSpatial.visible && selectedPoint.COUNT === 1) {
              layerControl.getRegionInfo(
                selectedRegion,
                (data, MapViewerThis) => {
                  data = data.features[0].attributes;
                  navigationControl.navigateToRegion(
                    data.BBOX,
                    data.Region,
                    layerSpatial,
                  );

                  MapViewerThis.setState((prevState) => {
                    return {
                      useCaseLevel: 4,
                      selectedUseCase: data,
                      region: data.Region,
                      previousState: prevState.useCaseLevel,
                    };
                  });
                },
              );
            } else {
              let latLon = {
                latitude: selectedPoint.Latitude,
                longitude: selectedPoint.Longitude,
              };
              layerControl.checkIfMorePoints(latLon, (data, MapViewerThis) => {
                if (data.features.length !== 1) {
                  MapViewerThis.setState((prevState) => {
                    return {
                      useCaseLevel: 3,
                      selectedUseCase: selectedPoint,
                      selectedUseCases: data.features,
                      previousState: prevState.useCaseLevel,
                    };
                  });
                } else {
                  navigationControl.navigateToLocation(
                    boundingBox,
                    selectedTitle,
                    selectedRegion,
                    selectedSpatial,
                    layerSpatial,
                  );
                  MapViewerThis.setState((prevState) => {
                    return {
                      useCaseLevel: 4,
                      selectedUseCase: selectedPoint,
                      previousState: prevState.useCaseLevel,
                    };
                  });
                }
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
      if (this.state.useCaseLevel === 1) {
        view.hitTest(screenPoint).then((response) => {
          if (response.results.length > 1) {
            if (
              response.results[0].graphic.geometry !== null &&
              this.popupOnce &&
              this.popupRegion === response.results[0].graphic.attributes.Region
            ) {
              this.popupOnce = false;
              document.querySelector('.map').style.cursor = 'pointer';
              let region = response.results[0].graphic.attributes.Region;

              layerControl.getRegionInfo(region, (data) => {
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
                  string += `<div>${data_eu} Use cases with EU27+UK coverage</div>`;
                }
                if (data_eea > 0) {
                  string += `<div>${data_eea} Use cases with EEA38+UK coverage</div>`;
                }
                if (data_global > 0) {
                  string += `<div>Global use cases: ${data_global}</div>`;
                }
                if (data_country > 0) {
                  string += `<div>${data_country} Use cases with one or multi-country coverage</div>`;
                }

                view.popup.open({
                  location: {
                    latitude: response.results[0].graphic.geometry.latitude,
                    longitude: response.results[0].graphic.geometry.longitude,
                  },
                  content: string,
                });
              });
            } else {
              this.popupRegion = response.results[0].graphic.attributes.Region;
              this.popupOnce = true;
              if (response.results[0].graphic.attributes.Region === undefined) {
                view.popup.close();
                document.querySelector('.map').style.cursor = '';
              }
            }
          } else {
            this.popupOnce = true;
            document.querySelector('.map').style.cursor = '';
            view.popup.close();
          }
        });
      } else if (this.state.useCaseLevel === 2) {
        view.hitTest(screenPoint).then((response) => {
          layerControl.highlightInfo(response);
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
          layerNUTS={layerNUTS}
          thumbnail={this.thumbnail}
        />
      );
    }
  }

  renderLegend() {
    if (this.view) {
      return <LegendWidget view={this.view} mapViewer={this} />;
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
      <div className="use-cases-container">
        <div className="ccl-container">
          <div className="use-cases-block">
            <h2>See use cases by product</h2>
          </div>
        </div>
        <div className="ccl-container ccl-container-flex">
          {this.renderInfo()}
          {this.renderLegend()}
          <div className="use-cases-products-map cont-w-50">
            <div className="use-cases-products-title">{this.mapCfg.title}</div>
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
