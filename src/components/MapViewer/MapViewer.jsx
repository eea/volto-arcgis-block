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
var Map, MapView, Zoom, intl;
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

  loader() {
    return loadModules([
      'esri/WebMap',
      'esri/views/MapView',
      'esri/widgets/Zoom',
      'esri/intl',
    ]).then(([_Map, _MapView, _Zoom, _intl]) => {
      [Map, MapView, Zoom, intl] = [_Map, _MapView, _Zoom, _intl];
    });
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

  async componentDidMount() {
    loadCss();
    await this.loader();
    await this.waitForDataFill();
    // this.mapdiv.current is the reference to the current DOM element of
    // this.mapdiv after it was mounted by the render() method
    this.map = new Map({
      basemap: 'topo',
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
      },
      ui: {
        components: ['attribution'],
      },
    });
    this.zoom = new Zoom({
      view: this.view,
    });
    this.view.ui.add(this.zoom, {
      position: 'top-right',
    });

    this.view.when(() => {
      this.view.watch('center', (newValue, oldValue, property, object) => {
        this.setCenterState(newValue);
      });

      this.view.watch('zoom', (newValue, oldValue, property, object) => {
        this.setZoomState(newValue);
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
    });
  }

  componentWillUnmount() {
    // clean up
    if (this.view) {
      this.view.container = null;
      this.view.destroy();
      delete this.view;
    }
    //mapStatus = {};
    //sessionStorage.clear();
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
    if (this.view) return <LegendWidget view={this.view} mapViewer={this} />;
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
    return (
      <div className={this.mapClass}>
        <div ref={this.mapdiv} className="map">
          {this.appLanguage()}
          {this.renderBasemap()}
          {this.renderLegend()}
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
