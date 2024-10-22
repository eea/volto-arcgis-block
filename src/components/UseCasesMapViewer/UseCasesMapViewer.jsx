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
  layerControl,
  navigationControl,
  layerSpatial,
  layerHighlight,
  WebTileLayer;

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
    this.initFMI = this.initFMI.bind(this);
    this.mapClass = classNames('map-container', {
      [`${props.customClass}`]: props.customClass || null,
    });
    this.spatialConfig = {
      id: 'spatialLayer',
      url: '',
      render: props.cfg.SpatialRenderer,
      showLegend: true,
    };
    this.regionConfig = {
      id: 'regionLayer',
      url: '',
      render: props.cfg.RegionMarkerRenderer,
      label: props.cfg.RegionLabel,
      showLegend: false,
    };
    this.HighlightConfig = {
      id: 'HightlightLayer',
      url: '',
      render: props.cfg.HightlightRenderer,
      showLegend: false,
    };
    this.state = {
      useCaseLevel: 1,
      region: '',
      selectedUseCase: '',
      selectedUseCases: [],
      previousState: 1,
      showMapMenu: false,
      activeDropdowns: [],
      productsScrollPosition: 0,
      casesScrollPosition: 0,
    };
  }

  loader() {
    return loadModules([
      'esri/WebMap',
      'esri/views/MapView',
      'esri/layers/FeatureLayer',
      'esri/geometry/Extent',
      'esri/Basemap',
      'esri/layers/WebTileLayer',
    ]).then(
      ([_Map, _MapView, _FeatureLayer, _Extent, _Basemap, _WebTileLayer]) => {
        [Map, MapView, FeatureLayer, Extent, Basemap, WebTileLayer] = [
          _Map,
          _MapView,
          _FeatureLayer,
          _Extent,
          _Basemap,
          _WebTileLayer,
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
    await this.initFMI();
    this.basemap = new Basemap({
      title: 'Countries World',
      thumbnailUrl:
        'https://gisco-services.ec.europa.eu/maps/wmts/CountriesWorld/EPSG3857/0/0/0.png',
      baseLayers: [
        new WebTileLayer({
          urlTemplate:
            'https://gisco-services.ec.europa.eu/maps/tiles/CountriesWorld/EPSG3857/{z}/{x}/{y}.png',
        }),
      ],
    });

    // this.mapdiv.current is the reference to the current DOM element of
    // this.mapdiv after it was mounted by the render() method
    this.map = new Map({
      basemap: this.basemap,
    });

    //if (!this.mapdiv.current) return;
    this.view = new MapView({
      container: this.mapdiv.current,
      map: this.map,
      center: this.mapCfg.center,
      zoom: 1,
      ui: {
        components: ['attribution'],
      },
    });

    // this.view.when(() => {
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
      legend: this.spatialConfig.showLegend,
    });

    layerSpatial.renderer = this.spatialConfig.render;

    let layerRegion = layerControl.createLayer({
      id: this.regionConfig.id,
      url: this.regionConfig.url,
      legend: this.regionConfig.showLegend,
    });

    layerHighlight = layerControl.createLayer({
      id: this.HighlightConfig.id,
      url: this.HighlightConfig.url,
      legend: this.HighlightConfig.showLegend,
    });

    layerRegion.renderer = this.regionConfig.render;
    layerRegion.labelingInfo = [this.regionConfig.label];
    layerHighlight.renderer = this.HighlightConfig.render;

    layerControl.addLayer(layerHighlight);
    layerControl.addLayer(layerRegion);
    layerControl.addLayer(layerSpatial);

    layerControl.hideLayer(layerHighlight.id);
    layerControl.hideLayer(layerSpatial.id);

    navigationControl = new NavigationControl({
      map: this.map,
      view: this.view,
      center: this.mapCfg.center,
      layerControl: layerControl,
      mapViewer: this,
      layerRegion: layerRegion,
      layerSpatial: layerSpatial,
      layerHighlight: layerHighlight,
    });

    this.setMapFunctions(
      this.view,
      layerControl,
      navigationControl,
      layerSpatial,
    );
    // });

    //Once we have created the MapView, we need to ensure that the map div
    //is refreshed in order to show the map on it. To do so, we need to
    //trigger the renderization again, and to trigger the renderization
    //we invoke the setState method, that changes the state and forces a
    //react component to render itself again
    this.setState(() => ({ useCaseLevel: 1 }));
  }
  async initFMI() {
    let fetchUrl =
      window.location.href
        .replace(window.location.pathname.substring(0), '')
        .replace(window.location.search.substring(0), '') +
      '/++api++/@anon-registry';
    try {
      let highlightResponse = await fetch(
        fetchUrl + this.serviceCfg.Highlight_service,
      );
      if (highlightResponse.status === 200) {
        this.HighlightConfig.url = await highlightResponse.json();
      } else {
        throw new Error(highlightResponse.status);
      }
      let regionResponse = await fetch(fetchUrl + this.serviceCfg.RegionLayer);
      if (regionResponse.status === 200) {
        this.regionConfig.url = await regionResponse.json();
      } else {
        throw new Error(regionResponse.status);
      }
      let spatialResponse = await fetch(
        fetchUrl + this.serviceCfg.SpatialCoverageLayer,
      );
      if (spatialResponse.status === 200) {
        this.spatialConfig.url = await spatialResponse.json();
      } else {
        throw new Error(spatialResponse.status);
      }
      let thumbnailResponse = await fetch(fetchUrl + this.thumbnail);
      if (thumbnailResponse.status === 200) {
        this.thumbnail = await thumbnailResponse.json();
      } else {
        throw new Error(thumbnailResponse.status);
      }
    } catch (error) {
      //console.error('There was a problem with the fetch operation:', error);
    }
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
      // CLMS-1489
      let productsScrollPosition;
      let pl = document.getElementById('use-cases-product-list');
      if (pl) {
        productsScrollPosition = pl.scrollTop;
      } else {
        productsScrollPosition = null;
      }
      let casesScrollPosition;
      let ucl = document.getElementById('use-cases-list');
      if (ucl) {
        casesScrollPosition = ucl.scrollTop;
      } else {
        casesScrollPosition = null;
      }

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
            // CLMS-1489
            let productsScrollPosition;
            let pl = document.getElementById('use-cases-product-list');
            if (pl) {
              productsScrollPosition = pl.scrollTop;
            } else {
              productsScrollPosition = 0;
            }
            this.setState((prevState) => {
              return {
                useCaseLevel: 2,
                selectedUseCase: selectedPoint,
                region: selectedRegion,
                previousState: prevState.useCaseLevel,
                productsScrollPosition: productsScrollPosition
                  ? productsScrollPosition
                  : prevState.productsScrollPosition,
                casesScrollPosition: casesScrollPosition
                  ? casesScrollPosition
                  : prevState.casesScrollPosition,
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
                      productsScrollPosition: productsScrollPosition
                        ? productsScrollPosition
                        : prevState.productsScrollPosition,
                      casesScrollPosition: casesScrollPosition
                        ? casesScrollPosition
                        : prevState.casesScrollPosition,
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
                layerControl.getGeometry(selectedSpatial, layerHighlight);
                layerControl.showLayer(layerHighlight.id);
                if (data.features.length !== 1) {
                  MapViewerThis.setState((prevState) => {
                    return {
                      useCaseLevel: 3,
                      selectedUseCase: selectedPoint,
                      selectedUseCases: data.features,
                      previousState: prevState.useCaseLevel,
                      productsScrollPosition: productsScrollPosition
                        ? productsScrollPosition
                        : prevState.productsScrollPosition,
                      casesScrollPosition: casesScrollPosition
                        ? casesScrollPosition
                        : prevState.casesScrollPosition,
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
                      productsScrollPosition: productsScrollPosition
                        ? productsScrollPosition
                        : prevState.productsScrollPosition,
                      casesScrollPosition: casesScrollPosition
                        ? casesScrollPosition
                        : prevState.casesScrollPosition,
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
                let data_eu = [
                  ...new Set(
                    data.features
                      .filter((a) => a.attributes.Spatial_coverage === 'EU')
                      .map((item) => item.attributes.Use_case_id),
                  ),
                ].length;
                let data_eu_uk = [
                  ...new Set(
                    data.features
                      .filter(
                        (a) => a.attributes.Spatial_coverage === 'EU 27+UK',
                      )
                      .map((item) => item.attributes.Use_case_id),
                  ),
                ].length;
                let data_eea = [
                  ...new Set(
                    data.features
                      .filter((a) => a.attributes.Spatial_coverage === 'EEA38')
                      .map((item) => item.attributes.Use_case_id),
                  ),
                ].length;
                let data_eea_uk = [
                  ...new Set(
                    data.features
                      .filter(
                        (a) => a.attributes.Spatial_coverage === 'EEA38+UK',
                      )
                      .map((item) => item.attributes.Use_case_id),
                  ),
                ].length;
                let data_global = [
                  ...new Set(
                    data.features
                      .filter((a) => a.attributes.Spatial_coverage === 'GLOBAL')
                      .map((item) => item.attributes.Use_case_id),
                  ),
                ].length;
                let data_country = [
                  ...new Set(
                    data.features
                      .filter(
                        (a) =>
                          a.attributes.Spatial_coverage !== 'EU' &&
                          a.attributes.Spatial_coverage !== 'EU 27+UK' &&
                          a.attributes.Spatial_coverage !== 'EEA38' &&
                          a.attributes.Spatial_coverage !== 'EEA38+UK' &&
                          a.attributes.Spatial_coverage !== 'GLOBAL',
                      )
                      .map((item) => item.attributes.Use_case_id),
                  ),
                ].length;

                let string = '';
                if (data_eu > 0) {
                  string += `<div>${data_eu} Use cases with EU coverage</div>`;
                }
                if (data_eu_uk > 0) {
                  string += `<div>${data_eu_uk} Use cases with EU27+UK coverage</div>`;
                }
                if (data_eea > 0) {
                  string += `<div>${data_eea} Use cases with EEA38 coverage</div>`;
                }
                if (data_eea_uk > 0) {
                  string += `<div>${data_eea_uk} Use cases with EEA38+UK coverage</div>`;
                }
                if (data_global > 0) {
                  string += `<div>Global use cases: ${data_global}</div>`;
                }
                if (data_country > 0) {
                  string += `<div>${data_country} Use cases with one or multi-country coverage</div>`;
                }
                if (data.features.length === 0) {
                  string += `<div>0 Use cases</div>`;
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
        if (document.querySelector('.esri-popup')?.hasChildNodes()) {
          view.popup.close();
        }
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
          thumbnail={this.thumbnail}
          layerHighlight={layerHighlight}
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
        <div className="ccl-container ccl-container-flex">
          {this.renderInfo()}
          {this.renderLegend()}
          <div className="use-cases-products-map cont-w-50">
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
