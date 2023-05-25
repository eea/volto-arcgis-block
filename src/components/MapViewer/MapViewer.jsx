import React, { createRef } from 'react';
import './css/ArcgisMap.css';
import classNames from 'classnames';
import { loadModules, loadCss } from 'esri-loader';
import { MapViewerConfig } from '../../actions';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { flattenToAppURL } from '@plone/volto/helpers/Url/Url';
import useCartState from '@eeacms/volto-clms-utils/cart/useCartState';
import { useIntl } from 'react-intl';
import BasemapWidget from './BasemapWidget';
import MeasurementWidget from './MeasurementWidget';
import PrintWidget from './PrintWidget';
import AreaWidget from './AreaWidget';
import ScaleWidget from './ScaleWidget';
import LegendWidget from './LegendWidget';
import InfoWidget from './InfoWidget';
import MenuWidget from './MenuWidget';
import HotspotWidget from './HotspotWidget';
//import "isomorphic-fetch";  <-- Necessary to use fetch?
var Map, MapView, SceneView, Zoom, intl, Basemap, WebTileLayer, Extent;
let mapStatus = {};
const CheckLanguage = () => {
  const { locale } = useIntl();
  intl.setLocale(locale);
  return null;
};

class MapViewer extends React.Component {
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
    this.url = this.props.cfg.url || ''; // Get url or default
    this.map = null;
    this.id = props.id;
    this.mapClass = classNames('map-container', {
      [`${props.customClass}`]: props.customClass || null,
    });
    this.state = {};
    this.layers = {};
    this.activeLayersHandler = this.activeLayersHandler.bind(this);
    this.activeLayersArray = {};
    this.props.mapviewer_config.loading = true;
  }

  activeLayersHandler(newActiveLayers) {
    this.activeLayers = newActiveLayers;
    mapStatus.activeLayers = newActiveLayers;
    sessionStorage.setItem('mapStatus', JSON.stringify(mapStatus));
  }

  setCenterState(centerStatus) {
    mapStatus.center = centerStatus;
    sessionStorage.setItem('mapStatus', JSON.stringify(mapStatus));
  }

  setZoomState(zoomStatus) {
    mapStatus.zoom = zoomStatus;
    sessionStorage.setItem('mapStatus', JSON.stringify(mapStatus));
  }

  setViewState(viewType) {
    mapStatus.viewType = viewType;
    sessionStorage.setItem('viewType', JSON.stringify(mapStatus));
  }

  recoverState() {
    return JSON.parse(sessionStorage.getItem('mapStatus'));
  }

  updateArea(shared_value) {
    this.mapViewer.setState({ area: shared_value });
  }

  loader() {
    return loadModules([
      'esri/WebMap',
      'esri/views/MapView',
      'esri/views/SceneView',
      'esri/widgets/Zoom',
      'esri/intl',
      'esri/Basemap',
      'esri/layers/WebTileLayer',
      'esri/geometry/Extent',
    ]).then(
      ([
        _Map,
        _MapView,
        _SceneView,
        _Zoom,
        _intl,
        _Basemap,
        _WebTileLayer,
        _Extent,
      ]) => {
        [Map, MapView, SceneView, Zoom, intl, Basemap, WebTileLayer, Extent] = [
          _Map,
          _MapView,
          _SceneView,
          _Zoom,
          _intl,
          _Basemap,
          _WebTileLayer,
          _Extent,
        ];
      },
    );
  }

  /**
   * Once the component has been mounted in the screen, this method
   * will be executed, so we can access to the DOM elements, since
   * they are already mounted
   */

  waitForDataFill() {
    while (this.compCfg.length === 0) {
      new Promise((resolve) => setTimeout(resolve, 100)); // wait for 100ms
    }
    return this.compCfg;
  }

  switchView() {
    const is3D = this.view.type === '3d';
    const activeViewpoint = this.view.viewpoint.clone();
    // remove the reference to the container for the previous view
    this.view.container = null;

    if (is3D) {
      // if the input view is a SceneView, set the viewpoint on the
      // mapView instance. Set the container on the mapView and flag
      // it as the active view
      this.mapView.viewpoint = activeViewpoint;
      this.mapView.container = this.mapdiv.current;
      this.view = this.mapView;
      this.setViewState(this.view.type);
    } else {
      this.sceneView.viewpoint = activeViewpoint;
      this.sceneView.container = this.mapdiv.current;
      this.view = this.sceneView;
      this.setViewState(this.view.type);
    }
  }

  async componentDidMount() {
    loadCss();
    await this.loader();
    await this.waitForDataFill();

    this.positronCompositeBasemap = new Basemap({
      title: 'Positron composite',
      thumbnailUrl:
        'https://gisco-services.ec.europa.eu/maps/wmts/OSMPositronComposite/EPSG3857/0/0/0.png',
      baseLayers: [
        new WebTileLayer({
          urlTemplate:
            'https://gisco-services.ec.europa.eu/maps/tiles/OSMPositronComposite/EPSG3857/{z}/{x}/{y}.png',
        }),
      ],
      // referenceLayers: [
      //   new _WebTileLayer(...)
      // ],
    });

    this.map = new Map({
      // basemap: 'topo',
      basemap: this.positronCompositeBasemap,
      logo: false,
    });

    mapStatus = this.recoverState();
    this.view = null;
    // Load configuration if no session information is available
    if (
      mapStatus === null ||
      (mapStatus.zoom === null && mapStatus.center === null) ||
      Object.entries(mapStatus).length === 0
    ) {
      mapStatus = {};
      mapStatus.zoom = this.mapCfg.zoom;
      mapStatus.center = this.mapCfg.center;
      mapStatus.viewType = this.mapCfg.viewType;
      mapStatus.activeLayers = this.mapCfg.activeLayers;
      this.setCenterState(this.mapCfg.center);
      this.setZoomState(this.mapCfg.zoom);
      this.setViewState(this.mapCfg.viewType);
      this.activeLayersHandler(this.mapCfg.activeLayers);
    }

    // 3D
    this.sceneView = new SceneView({
      container: null,
      map: this.map,
      center: mapStatus.center,
      zoom: mapStatus.zoom,
      ui: {
        components: ['attribution'],
      },
    });
    if (mapStatus.viewType === '3d') {
      this.sceneView.container = this.mapdiv.current;
      this.view = this.sceneView;
      this.setViewState(this.view.type);
    }

    // 2D
    this.mapView = new MapView({
      container: null,
      map: this.map,
      center: mapStatus.center,
      zoom: mapStatus.zoom,
      constraints: {
        minZoom: this.mapCfg.minZoom,
        maxZoom: this.mapCfg.maxZoom,
        rotationEnabled: false,
        geometry: this.mapCfg.geometry,
      },
      ui: {
        components: ['attribution'],
      },
    });

    if (mapStatus.viewType === '2d') {
      this.mapView.container = this.mapdiv.current;
      this.view = this.mapView;
      this.setViewState(this.view.type);
    }

    this.zoom = new Zoom({
      view: this.view,
    });

    this.view.ui.add(this.zoom, {
      position: 'top-right',
    });

    this.sceneView.when(() => {
      this.sceneView.watch('center', (newValue, oldValue, property, object) => {
        this.setCenterState(newValue);
      });

      this.sceneView.watch('zoom', (newValue, oldValue, property, object) => {
        this.setZoomState(newValue);
        if (newValue <= 4) {
          if (this.view.type === '2d') {
            this.switchView();
          }
        } else {
          if (this.view.type === '3d') {
            this.switchView();
          }
        }
      });
    });

    this.mapView.when(() => {
      this.mapView.watch('center', (newValue, oldValue, property, object) => {
        this.setCenterState(newValue);
      });

      let constraintExtent = null;
      this.mapView.watch('zoom', (newValue, oldValue, property, object) => {
        this.setZoomState(newValue);
        if (newValue < 4) {
          if (this.view.type === '2d') {
            this.switchView();
          }
        } else {
          if (this.view.type === '3d') {
            this.switchView();
          }
        }
        if (mapStatus.zoom <= this.mapCfg.minZoom) {
          constraintExtent = new Extent({
            xmin: -90,
            ymin: -45,
            xmax: 90,
            ymax: 45,
            spatialReference: 4326,
          });
        } else {
          constraintExtent = new Extent({
            xmin: -90,
            ymin: -85,
            xmax: 90,
            ymax: 85,
            spatialReference: 4326,
          });
        }
        this.view.constraints.geometry = constraintExtent;
      });

      this.view.popup.autoOpenEnabled = false;
      // After launching the MapViewerConfig action
      // we will have stored the json response here:
      // this.props.mapviewer_config
      this.props.MapViewerConfig(flattenToAppURL(this.props.url));
      //Once we have created the MapView, we need to ensure that the map div
      //is refreshed in order to show the map on it. To do so, we need to
      //trigger the renderization again, and to trigger the renderization
      //we invoke the setState method, that changes the state and forces a
      //react component to render itself again
      //this.setState({});
      this.view.ui._removeComponents(['attribution']);
    });
  }

  componentWillUnmount() {
    // clean up
    if (this.view) {
      this.view.container = null;
      this.view.destroy();
      delete this.view;
      sessionStorage.removeItem('mapStatus');
      this.mapView.container = null;
      this.mapView.destroy();
      delete this.mapView;
      this.sceneView.container = null;
      this.sceneView.destroy();
      delete this.sceneView;
    }
  }

  setWidgetState() {}

  setSaveMapChange() {}

  setActiveWidget(widget) {
    if (!widget) {
      this.activeWidget = null;
      return;
    }
    if (this.activeWidget === widget) return;
    this.closeActiveWidget();
    this.activeWidget = widget;
  }

  closeActiveWidget() {
    if (this.activeWidget) {
      this.activeWidget.openMenu();
      this.activeWidget = null;
    }
  }

  /**
   * This method evaluates the ability to render the basemaps widget and
   * returns the jsx allowing such a render (if conditions are ok)
   * @returns jsx
   */
  renderBasemap(view) {
    if (this.props.mapviewer_config.Download) return;
    if (view) return <BasemapWidget view={view} mapViewer={this} />;
  }

  renderLegend(view) {
    if (view) return <LegendWidget view={view} mapViewer={this} />;
  }

  renderMeasurement() {
    if (this.props.mapviewer_config.Download) return;
    if (this.view)
      return <MeasurementWidget view={this.view} mapViewer={this} />;
  }

  renderPrint() {
    if (this.props.mapviewer_config.Download) return;
    if (this.view) return <PrintWidget view={this.view} mapViewer={this} />;
  }

  renderArea() {
    if (this.props.mapviewer_config.Download) return;
    if (this.view) {
      return <CheckLogin reference={this} />;
    }
  }

  renderScale() {
    if (this.view) return <ScaleWidget view={this.view} mapViewer={this} />;
  }

  renderInfo() {
    if (this.view)
      return <InfoWidget view={this.view} map={this.map} mapViewer={this} />;
  }

  renderHotspot() {
    if (this.view)
      return (
        <HotspotWidget
          view={this.view}
          map={this.map}
          selectedLayers={this.layers}
          mapViewer={this}
          layers={sessionStorage}
        />
      );
  }

  renderMenu() {
    if (this.view)
      return (
        <MenuWidget
          view={this.view}
          conf={this.props.mapviewer_config.Components}
          download={this.props.mapviewer_config.Download}
          map={this.map}
          mapViewer={this}
          updateArea={this.updateArea}
          area={this.state.area}
          layers={this.layers}
          activeLayersHandler={this.activeLayersHandler}
        />
      ); //call conf
  }

  appLanguage() {
    return intl && <CheckLanguage />;
  }

  /**
   * This method renders the map viewer, invoking if necessary the methods
   * to render the other widgets to display
   * @returns jsx
   */
  render() {
    // we use a reference (ref={this.mapdiv}) in order to reference a
    // DOM element to be mounted (but not yet mounted)
    if ('loading' in this.props.mapviewer_config) {
      return (
        <div className={this.mapClass}>
          <div ref={this.mapdiv} className="map"></div>
        </div>
      );
    } else {
      return (
        <div className={this.mapClass}>
          <div ref={this.mapdiv} className="map">
            {this.appLanguage()}
            {this.renderBasemap(this.sceneView)}
            {this.renderBasemap(this.mapView)}
            {this.renderLegend(this.sceneView)}
            {this.renderLegend(this.mapView)}
            {this.renderMeasurement()}
            {this.renderPrint()}
            {this.renderArea()}
            {this.renderScale()}
            {this.renderInfo()}
            {this.renderHotspot()}
            {this.renderMenu()}
          </div>
        </div>
      );
    }
  }
}

export const CheckLogin = ({ reference }) => {
  let { isLoggedIn } = useCartState();
  return (
    <>
      {isLoggedIn && (
        <AreaWidget
          view={reference.view}
          map={reference.map}
          mapViewer={reference}
          download={reference.props.mapviewer_config.Download}
          updateArea={reference.updateArea}
        />
      )}
    </>
  );
};

export default compose(
  connect(
    (state) => ({
      mapviewer_config: state.mapviewer_config.mapviewer_config,
    }),
    { MapViewerConfig },
  ),
)(MapViewer);
