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
      'esri/Basemap',
      'esri/layers/WebTileLayer',
      "esri/geometry/Extent"
    ]).then(([_Map, _MapView, _Zoom, _intl, _Basemap, _WebTileLayer, _Extent]) => {
      [Map, MapView, Zoom, intl, Basemap, WebTileLayer, Extent] = [
        _Map,
        _MapView,
        _Zoom,
        _intl,
        _Basemap,
        _WebTileLayer,
        _Extent
      ];
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
      logo: false 
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
        geometry: { // Constrain lateral movement to Lower Manhattan
          type: "extent",
          xmin: -90,
          ymin:  -45, //set in configuration
          xmax: 90,
          ymax:  45
        },
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


    // this.map.on('extent-change', function(event) {
    //     //If the map has moved to the point where it's center is 
    //     //outside the initial boundaries, then move it back to the 
    //     //edge where it moved out
    //     var currentCenter = this.map.extent.getCenter();
    //     if (!initialExtent.contains(currentCenter) && 
    //         event.delta.x !== 0 && event.delta.y !== 0) {

    //         var newCenter = this.map.extent.getCenter();

    //         //check each side of the initial extent and if the 
    //         //current center is outside that extent, 
    //         //set the new center to be on the edge that it went out on
    //         if (currentCenter.x < initialExtent.xmin) {
    //             newCenter.x = initialExtent.xmin;
    //         }
    //         if (currentCenter.x > initialExtent.xmax) {
    //             newCenter.x = initialExtent.xmax;
    //         }
    //         if (currentCenter.y < initialExtent.ymin) {
    //             newCenter.y = initialExtent.ymin;
    //         }
    //         if (currentCenter.y > initialExtent.ymax) {
    //             newCenter.y = initialExtent.ymax;
    //         }
    //         this.map.centerAt(newCenter);
    //     }
    // });

    this.view.when(() => {     
      let constraintExtent = new Extent ({
        xmin: -90,
        ymin: -45,
        xmax: 90,
        ymax: 45,
        spatialReference: 4326
      })//-34181823.72082071 -7556972.773181698 37162663.991865456 15924482.316018358

      this.view.watch('center', (newValue, oldValue, property, object) => {
        this.setCenterState(newValue);        
      });

      this.view.watch('zoom', (newValue, oldValue, property, object) => {
        this.setZoomState(newValue);  
        if (mapStatus.zoom <= this.mapCfg.minZoom) {
          this.view.constraints.geometry = constraintExtent;
        } else {
          this.view.constraints.geometry = null;         // PROBAR A PONER AQUI UN LIMITE MAS PEQUEÑO                             
        }     
      });


      // this.view.on("drag", function(event) {
      //   // prevents panning with the mouse drag event
      //     if (mapStatus.zoom <= this.mapCfg.minZoom) {
      //       console.log('Pan Locked');
      //       event.stopPropagation();
      //       // this.view.extent = constraintExtent;
      //       // this.setCenterState(constraintExtent.center);
            
      //     }        
      // });

      // this.view.on("key-down", function(event) {
      //   // prevents panning with the arrow keys
      //   if (mapStatus.zoom <= this.mapCfg.minZoom) {
      //     var keyPressed = event.key;
      //     if (keyPressed.slice(0, 5) === "Arrow") {
      //       console.log('Keyboard Locked');
      //       event.stopPropagation();
      //     }
      //   }
      // });

     

      // this.view.watch('stationary', (newValue, oldValue, property, object) => {        
      //   if (mapStatus.zoom <= this.mapCfg.minZoom) {
      //     // console.log(this.view.extent.xmin, this.view.extent.ymin, this.view.extent.xmax, this.view.extent.ymax);
      //     // console.log(mapStatus.center.x, mapStatus.center.y);
         
      //     this.view.extent = constraintExtent;
      //     this.setCenterState(constraintExtent.center);
      //     //this.view.extent = new Extent ()
      //   }
      // });

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

    window.onload = (event) => {    
      console.log('Ventana cargada');
      document.getElementsByClassName("esri-attribution__powered-by")[0].innerText = ' ';
    };
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
