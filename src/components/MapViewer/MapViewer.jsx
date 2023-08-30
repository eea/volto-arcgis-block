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
import PanWidget from './PanWidget';
import BookmarkWidget from './BookmarkWidget';
import ResetViewWidget from './ResetViewWidget';
import SwipeWidget from './SwipeWidget';
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
    this.location = this.props.location;
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
    this.cfgUrls = this.props.cfg.Urls;
    this.userID = null;
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
    sessionStorage.setItem('mapStatus', JSON.stringify(mapStatus));
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
      'esri/widgets/Bookmarks',
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

  waitForDataFill(obj) {
    while (obj.length === 0) {
      new Promise((resolve) => setTimeout(resolve, 100)); // wait for 100ms
    }
    return obj;
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
      // this.setViewState(this.view.type);
    } else {
      this.sceneView.viewpoint = activeViewpoint;
      this.sceneView.container = this.mapdiv.current;
      this.view = this.sceneView;
      // this.setViewState(this.view.type);
    }
    // this.view.ui._components.map(item => console.log(item));
  }

  async componentDidMount() {
    loadCss();
    await this.loader();
    //    this.state.url = window.location.href;
    await this.waitForDataFill(this.compCfg);
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
    // this.view = null;
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
      // this.setViewState(this.view.type);

      this.zoom = new Zoom({
        view: this.sceneView,
      });

      this.sceneView.ui.add(this.zoom, {
        position: 'top-right',
      });
    }

    // 2D
    this.mapView = new MapView({
      container: null,
      map: this.map,
      center: mapStatus.center,
      zoom: mapStatus.zoom,
      popupEnabled: false,
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
      // this.setViewState(this.view.type);
      this.zoom = new Zoom({
        view: this.mapView,
      });
      this.mapView.ui.add(this.zoom, {
        position: 'top-right',
      });
    }

    this.sceneView.when(() => {
      this.sceneView.watch('center', (newValue, oldValue, property, object) => {
        this.setCenterState(newValue);
      });

      this.sceneView.watch('zoom', (newValue, oldValue, property, object) => {
        this.setZoomState(newValue);
        // if (newValue <= 4) {
        //   if (this.view.type === '2d') {
        //     this.switchView();
        //   }
        // } else {
        //   if (this.view.type === '3d') {
        //     this.switchView();
        //   }
        // }
      });
    });

    this.mapView.when(() => {
      // this.mapView.watch('center', (newValue, oldValue, property, object) => {
      //   this.setCenterState(newValue);
      // });

      let constraintExtent = null;
      this.mapView.watch('zoom', (newValue, oldValue, property, object) => {
        // this.setZoomState(newValue);
        // if (newValue < 4) {
        //   if (this.view.type === '2d') {
        //     this.switchView();
        //   }
        // } else {
        //   if (this.view.type === '3d') {
        //     this.switchView();
        //   }
        // }
        if (mapStatus.zoom <= this.mapCfg.minZoom) {          
          constraintExtent = new Extent({
            xmin: this.mapCfg.geometry.xmin,
            ymin: this.mapCfg.geometry.ymin,
            xmax: this.mapCfg.geometry.xmax,
            ymax: this.mapCfg.geometry.ymax,
            spatialReference: 4326,
          });
        } else {          
          constraintExtent = new Extent({
            xmin: this.mapCfg.geometryZoomIn.xmin,
            ymin: this.mapCfg.geometryZoomIn.ymin,
            xmax: this.mapCfg.geometryZoomIn.xmax,
            ymax: this.mapCfg.geometryZoomIn.ymax,
            spatialReference: 4326,
          });
        }
        this.mapView.constraints.geometry = constraintExtent;
      });
    });

    // this.view.popup.autoOpenEnabled = false;

    this.mapView.popup.autoOpenEnabled = false;

    this.sceneView.popup.autoOpenEnabled = false;

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
    this.sceneView.ui._removeComponents(['attribution']);
    this.mapView.ui._removeComponents(['attribution']);
  } // componentDidMount

  componentDidUpdate(prevProps, prevState) {
    if (this.props.Download || (this.location && this.location.search !== '')) {
      let toc_panel_scrolls = sessionStorage.getItem('toc_panel_scrolls');
      sessionStorage.clear();
      sessionStorage.setItem('toc_panel_scrolls', toc_panel_scrolls);
    }
  }

  componentWillUnmount() {
    // clean up
    if (this.view) {
      this.view.container = null;
      this.view.destroy();
      delete this.view;
      this.mapView.container = null;
      this.mapView.destroy();
      delete this.mapView;
      this.sceneView.container = null;
      this.sceneView.destroy();
      delete this.sceneView;
      sessionStorage.removeItem('mapStatus');
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
  renderBasemap() {
    if (this.props.mapviewer_config.Download) return;
    if (this.view) return <BasemapWidget view={this.view} mapViewer={this} />;
  }

  renderLegend() {
    if (this.view)
      return (
        <LegendWidget
          view={this.view}
          mapViewer={this}
          download={this.props.mapviewer_config.Download}
          urls={this.cfgUrls}
        />
      );
  }

  renderMeasurement() {
    if (this.props.mapviewer_config.Download) return;
    if (this.view)
      return <MeasurementWidget view={this.view} mapViewer={this} />;
  }

  renderPrint(view) {
    if (this.props.mapviewer_config.Download) return;
    if (view) return <PrintWidget view={view} mapViewer={this} />;
  }

  renderSwipe(view) {
    if (this.props.mapviewer_config.Download) return;
    if (view) return <SwipeWidget view={view} mapViewer={this} />;
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

  renderPan() {
    if (this.view)
      return <PanWidget view={this.view} map={this.map} mapViewer={this} />;
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
          mapCfg={this.mapCfg}
          urls={this.cfgUrls}
        />
      );
  }

  renderResetView() {
    if (this.view)
      return (
        <ResetViewWidget view={this.view} map={this.map} mapViewer={this} />
      );
  }

  renderMenu() {
    if (this.view)
      return (
        <MenuWidget
          location={this.location}
          view={this.view}
          conf={this.props.mapviewer_config.Components}
          download={this.props.mapviewer_config.Download}
          map={this.map}
          mapViewer={this}
          updateArea={this.updateArea}
          area={this.state.area}
          layers={this.layers}
          activeLayersHandler={this.activeLayersHandler}
          urls={this.cfgUrls}
        />
      ); //call conf
  }

  renderBookmark() {
    if (this.view) return <CheckUserID reference={this} />;
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
      //
      // print soes not support scenView
      return (
        <div className={this.mapClass}>
          <div ref={this.mapdiv} className="map">
            {this.appLanguage()}
            {this.renderBasemap()}

            {this.renderLegend()}

            {this.renderMeasurement()}

            {this.renderSwipe(this.mapView)}
            {this.renderSwipe(this.sceneView)}
            
            {this.renderPrint(this.mapView)}
            {this.renderPrint(this.sceneView)}

            {this.renderArea()}
            {this.renderScale()}
            {this.renderPan()}
            {this.renderInfo()}
            {this.renderHotspot()}
            {this.renderMenu()}
            {this.renderBookmark()}
            {this.renderResetView()}
           
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
          urls={reference.cfgUrls}
        />
      )}
    </>
  );
};
export const CheckUserID = ({ reference }) => {
  let { user_id, isLoggedIn } = useCartState();
  if (isLoggedIn) {
    return (
      <>
        {
          <BookmarkWidget
            view={reference.view}
            map={reference.map}
            mapViewer={reference}
            userID={user_id}
          />
        }
      </>
    );
  } else {
    return (
      <>
        {
          <BookmarkWidget
            view={reference.view}
            map={reference.map}
            mapViewer={reference}
            userID={null}
          />
        }
      </>
    );
  }
};

export default compose(
  connect(
    (state) => ({
      mapviewer_config: state.mapviewer_config.mapviewer_config,
    }),
    { MapViewerConfig },
  ),
)(MapViewer);
