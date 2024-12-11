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
import SwipeWidget from './SwipeWidget';
import AreaWidget from './AreaWidget';
import ScaleWidget from './ScaleWidget';
import LegendWidget from './LegendWidget';
import InfoWidget from './InfoWidget';
import MenuWidget from './MenuWidget';
import HotspotWidget from './HotspotWidget';
import PanWidget from './PanWidget';
import BookmarkWidget from './BookmarkWidget';
import LoadingSpinner from './LoadingSpinner';
import { injectLazyLibs } from '@plone/volto/helpers/Loadable';

//import "isomorphic-fetch";  <-- Necessary to use fetch?
var Map, MapView, Zoom, intl, Basemap, WebTileLayer, Extent;
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
    this.state = {
      layerLoading: false,
      layers: {},
      uploadedFile: true,
      //isReady: false,
    };
    this.activeLayersHandler = this.activeLayersHandler.bind(this);
    this.activeLayersArray = {};
    this.props.mapviewer_config.loading = true;
    this.cfgUrls = this.props.cfg.Urls;
    this.userID = null;
    this.loadingHandler = this.loadingHandler.bind(this);
    this.hotspotDataHandler = this.hotspotDataHandler.bind(this);
    this.mapLayersHandler = this.mapLayersHandler.bind(this);
    this.bookmarkHandler = this.bookmarkHandler.bind(this);
    this.prepackageHandler = this.prepackageHandler.bind(this);
    this.uploadFileHandler = this.uploadFileHandler.bind(this);
  }

  mapLayersHandler(newLayers) {
    this.setState({ layers: newLayers });
  }

  loadingHandler(bool) {
    this.setState({ layerLoading: bool });
  }

  hotspotDataHandler(newHotspotData) {
    if (!this.state.hotspotData) {
      this.setState({ hotspotData: {} });
    }
    this.setState({ hotspotData: newHotspotData });
  }

  bookmarkHandler(newBookmarkData) {
    if (!this.state.bookmarkData) {
      this.setState({ bookmarkData: {} });
    }
    this.setState({ bookmarkData: newBookmarkData });
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

  recoverState() {
    return JSON.parse(sessionStorage.getItem('mapStatus'));
  }

  updateArea(shared_value) {
    this.mapViewer.setState({ area: shared_value });
  }

  prepackageHandler(prepackage) {
    this.setState({ prepackageChecked: prepackage });
  }

  uploadFileHandler(message) {
    this.setState({ uploadedFile: message });
  }

  loader() {
    return loadModules([
      'esri/WebMap',
      'esri/views/MapView',
      'esri/widgets/Zoom',
      'esri/intl',
      'esri/Basemap',
      'esri/layers/WebTileLayer',
      'esri/geometry/Extent',
      'esri/widgets/Bookmarks',
    ]).then(
      ([_Map, _MapView, _Zoom, _intl, _Basemap, _WebTileLayer, _Extent]) => {
        [Map, MapView, Zoom, intl, Basemap, WebTileLayer, Extent] = [
          _Map,
          _MapView,
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


  async componentDidMount() {
    loadCss();
    await this.loader();
    await this.waitForDataFill(this.compCfg);

    this.positronCompositeBasemap = new Basemap({
      title: 'Positron composite',
      thumbnailUrl: this.cfgUrls.positronCompositeThumbnail,
      baseLayers: [
        new WebTileLayer({
          urlTemplate: this.cfgUrls.positronCompositeTemplate,
          copyright: '© OpenStreetMap (and) contributors, CC-BY-SA',
        }),
      ],
    });
    this.map = new Map({
      basemap: this.positronCompositeBasemap,
      logo: false,
    });

    mapStatus = this.recoverState();

    if (
      mapStatus === null ||
      (mapStatus.zoom === null && mapStatus.center === null) ||
      Object.entries(mapStatus).length === 0
    ) {
      mapStatus = {};
      mapStatus.zoom = this.mapCfg.zoom;
      mapStatus.center = this.mapCfg.center;
      mapStatus.activeLayers = this.mapCfg.activeLayers;
      this.setCenterState(this.mapCfg.center);
      this.setZoomState(this.mapCfg.zoom);
      this.activeLayersHandler(this.mapCfg.activeLayers);
    }

    this.view = new MapView({
      container: this.mapdiv.current,
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
    this.view.when(() => {
      this.zoom = new Zoom({
        view: this.view,
      });
      this.view.ui.add(this.zoom, {
        position: 'top-right',
      });

      this.view.watch('center', (newValue, oldValue, property, object) => {
        this.setCenterState(newValue);
      });

      let constraintExtent = null;
      this.view.watch('zoom', (newValue, oldValue, property, object) => {
        this.setZoomState(newValue);
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
        this.view.constraints.geometry = constraintExtent;
      });
      this.view.popup.autoOpenEnabled = false;
    });
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
  }

  componentDidUpdate(prevProps, prevState) {
    if (
      this.props.Download ||
      (this.location &&
        (this.location.search.includes('product=') ||
          this.location.search.includes('dataset=')))
    ) {
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
    if (this.view)
      return (
        <BasemapWidget view={this.view} mapViewer={this} urls={this.cfgUrls} />
      );
  }

  renderLegend() {
    if (this.view)
      return (
        <LegendWidget
          view={this.view}
          mapViewer={this}
          download={this.props.mapviewer_config.Download}
          urls={this.cfgUrls}
          layerLoading={this.state.layerLoading}
          hotspotData={this.state.hotspotData}
          hotspotDataHandler={this.hotspotDataHandler}
        />
      );
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

  renderSwipe() {
    if (this.props.mapviewer_config.Download) return;
    if (this.view)
      return (
        <SwipeWidget
          view={this.view}
          mapViewer={this}
          map={this.map}
          layers={this.state.layers}
        />
      );
  }

  renderArea() {
    if (this.props.mapviewer_config.Download) return;
    if (this.view) {
      return <CheckLogin reference={this} urls={this.cfgUrls} />;
    }
  }

  renderScale() {
    if (this.view) return <ScaleWidget view={this.view} mapViewer={this} />;
  }

  renderInfo() {
    if (this.view)
      return (
        <InfoWidget
          view={this.view}
          map={this.map}
          mapViewer={this}
          hotspotData={this.state.hotspotData}
        />
      );
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
          selectedLayers={this.state.layers}
          mapViewer={this}
          layers={sessionStorage}
          mapCfg={this.mapCfg}
          urls={this.cfgUrls}
          loadingHandler={this.loadingHandler}
          hotspotData={this.state.hotspotData}
          hotspotDataHandler={this.hotspotDataHandler}
          mapLayersHandler={this.mapLayersHandler}
          bookmarkData={this.state.bookmarkData}
        />
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
          layers={this.state.layers}
          activeLayersHandler={this.activeLayersHandler}
          urls={this.cfgUrls}
          loadingHandler={this.loadingHandler}
          hotspotDataHandler={this.hotspotDataHandler}
          hotspotData={this.state.hotspotData}
          mapLayersHandler={this.mapLayersHandler}
          bookmarkData={this.state.bookmarkData}
          bookmarkHandler={this.bookmarkHandler}
          prepackageChecked={this.state.prepackageChecked}
          prepackageHandler={this.prepackageHandler}
          uploadedFile={this.state.uploadedFile}
          uploadFileHandler={this.uploadFileHandler}
        />
      ); //call conf
  }

  renderBookmark() {
    if (this.view) return <CheckUserID reference={this} />;
  }

  appLanguage() {
    return intl && <CheckLanguage />;
  }

  renderLoadingSpinner() {
    return (
      <LoadingSpinner view={this.view} layerLoading={this.state.layerLoading} />
    );
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
            {this.renderBasemap()}
            {this.renderLegend()}
            {this.renderMeasurement()}
            {this.renderPrint()}
            {this.renderSwipe()}
            {this.renderArea()}
            {this.renderPan()}
            {this.renderScale()}
            {this.renderInfo()}
            {this.renderHotspot()}
            {this.renderMenu()}
            {this.renderBookmark()}
            {this.renderLoadingSpinner()}
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
          mapviewer_config={reference.props.mapviewer_config}
          prepackageChecked={reference.state.prepackageChecked}
          prepackageHandler={reference.prepackageHandler}
          uploadedFile={reference.state.uploadedFile}
          uploadFileHandler={reference.uploadFileHandler}
        />
      )}
    </>
  );
};
export const CheckUserID = ({ reference }) => {
  let { user_id } = useCartState();
  return (
    <>
      {
        <BookmarkWidget
          view={reference.view}
          map={reference.map}
          layers={reference.state.layers}
          mapViewer={reference}
          userID={user_id}
          hotspotData={reference.state.hotspotData}
          bookmarkHandler={reference.bookmarkHandler}
          bookmarkData={reference.state.bookmarkData}
        />
      }
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
  injectLazyLibs('highcharts'),
)(MapViewer);
