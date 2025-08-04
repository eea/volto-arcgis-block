import React, {
  createRef,
  createContext,
  useContext,
  useState,
  useEffect,
} from 'react';
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
import UploadWidget from './UploadWidget';
import { injectLazyLibs } from '@plone/volto/helpers/Loadable';
import { getTaxonomy } from '@eeacms/volto-taxonomy/actions';

//import "isomorphic-fetch";  <-- Necessary to use fetch?
var Map, MapView, Zoom, intl, Basemap, WebTileLayer, Extent;
let mapStatus = {};

const CheckLanguage = () => {
  const { locale } = useIntl();
  intl.setLocale(locale);
  return null;
};

// UserContext and Provider for user_id and isLoggedIn
const UserContext = createContext({ user_id: null, isLoggedIn: false });
const useUserContext = () => useContext(UserContext);

const UserProvider = ({ children }) => {
  const [userState, setUserState] = useState({
    user_id: null,
    isLoggedIn: false,
  });

  useEffect(() => {
    const updateUserState = () => {
      const {
        user_id,
        isLoggedIn,
      } = window.eeacms_volto_clms_utils_cart_useCartState
        ? window.eeacms_volto_clms_utils_cart_useCartState()
        : { user_id: null, isLoggedIn: false };

      setUserState((prevState) => {
        if (
          prevState.user_id !== user_id ||
          prevState.isLoggedIn !== isLoggedIn
        ) {
          return { user_id, isLoggedIn };
        }
        return prevState;
      });
    };

    updateUserState();

    const interval = setInterval(updateUserState, 1000);

    return () => clearInterval(interval);
  }, []);

  if (userState.user_id === undefined || userState.isLoggedIn === undefined) {
    return (
      <div className="loading-container">
        <div className="loading-text">Loading...</div>
      </div>
    );
  }
  return (
    <UserContext.Provider value={userState}>{children}</UserContext.Provider>
  );
};

const UserStorageManager = ({ children, onStorageManaged }) => {
  console.log('UserStorageManager: Component rendering');
  const { user_id, isLoggedIn } = useUserContext();
  console.log(
    'UserStorageManager: user_id:',
    user_id,
    'isLoggedIn:',
    isLoggedIn,
  );
  const [storageManaged, setStorageManaged] = useState(false);
  console.log('UserStorageManager: storageManaged:', storageManaged);

  const getSessionStorageContents = () => {
    console.log('UserStorageManager: Getting session storage contents');
    const sessionData = {};
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      const value = sessionStorage.getItem(key);
      try {
        sessionData[key] = JSON.parse(value);
      } catch (e) {
        sessionData[key] = value;
      }
    }
    console.log('UserStorageManager: Session storage contents:', sessionData);
    return sessionData;
  };

  useEffect(() => {
    console.log(
      'UserStorageManager: useEffect triggered with storageManaged:',
      storageManaged,
    );
    if (!storageManaged) {
      console.log(
        'UserStorageManager: Storage not managed, checking user state',
      );
      if (isLoggedIn && user_id) {
        console.log('UserStorageManager: User is logged in with ID:', user_id);
        const key = `user_${user_id}`;
        const data = localStorage.getItem(key);
        console.log(
          'UserStorageManager: Found localStorage data for key:',
          key,
          data ? 'exists' : 'not found',
        );
        if (data) {
          console.log('UserStorageManager: Restoring data from localStorage');
          sessionStorage.clear();
          const parsed = JSON.parse(data);
          Object.keys(parsed).forEach((k) =>
            sessionStorage.setItem(
              k,
              typeof parsed[k] === 'object'
                ? JSON.stringify(parsed[k])
                : parsed[k],
            ),
          );
          console.log(
            'UserStorageManager: Restored session storage from localStorage',
          );
        } else {
          console.log(
            'UserStorageManager: No localStorage data found, saving current session storage',
          );
          localStorage.setItem(
            key,
            JSON.stringify(getSessionStorageContents()),
          );
          console.log(
            'UserStorageManager: Saved session storage to localStorage',
          );
        }
      } else if (
        !isLoggedIn &&
        (user_id === undefined || user_id === null || user_id === '')
      ) {
        console.log(
          'UserStorageManager: User is not logged in, checking anonymous data',
        );
        const anon = localStorage.getItem('user_anonymous');
        console.log(
          'UserStorageManager: Anonymous data:',
          anon ? 'exists' : 'not found',
        );
        if (anon) {
          console.log('UserStorageManager: Restoring anonymous data');
          sessionStorage.clear();
          const parsed = JSON.parse(anon);
          Object.keys(parsed).forEach((k) =>
            sessionStorage.setItem(
              k,
              typeof parsed[k] === 'object'
                ? JSON.stringify(parsed[k])
                : parsed[k],
            ),
          );
          localStorage.removeItem('user_anonymous');
          console.log(
            'UserStorageManager: Restored and removed anonymous data',
          );
        }
      }
      console.log('UserStorageManager: Setting storage as managed');
      setStorageManaged(true);
      if (onStorageManaged) {
        console.log('UserStorageManager: Calling onStorageManaged callback');
        onStorageManaged();
      }
    }
  }, [isLoggedIn, user_id, storageManaged, onStorageManaged]);

  return storageManaged && user_id !== undefined && isLoggedIn !== undefined ? (
    children
  ) : (
    <div className="loading-container">
      <div className="loading-text">Loading...</div>
    </div>
  );
};

class MapViewer extends React.Component {
  static contextType = UserContext;

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
      wmsServiceUrl: '',
      uploadError: false,
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
    this.uploadFileErrorHandler = this.uploadFileErrorHandler.bind(this);
    this.uploadUrlServiceHandler = this.uploadUrlServiceHandler.bind(this);
    this.loadingHandler = this.loadingHandler.bind(this);
    this.hotspotDataHandler = this.hotspotDataHandler.bind(this);
    this.mapLayersHandler = this.mapLayersHandler.bind(this);
    this.bookmarkHandler = this.bookmarkHandler.bind(this);
    this.prepackageHandler = this.prepackageHandler.bind(this);
    this.uploadFileHandler = this.uploadFileHandler.bind(this);
    this.uploadFileErrorHandler = this.uploadFileErrorHandler.bind(this);
    this.uploadUrlServiceHandler = this.uploadUrlServiceHandler.bind(this);
    this.cfgUrls = this.props.cfg.Urls;
    this.getTaxonomy = this.props.getTaxonomy.bind(this);
    this.tax = null;
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

  // Function to remove circular references
  removeCircularReferences(obj) {
    const seen = new WeakSet();
    return JSON.parse(
      JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return;
          }
          seen.add(value);
        }
        return value;
      }),
    );
  }

  activeLayersHandler(newActiveLayers) {
    try {
      const layersWithoutCircularReferences = this.removeCircularReferences(
        newActiveLayers,
      );
      this.activeLayers = layersWithoutCircularReferences;
      mapStatus.activeLayers = layersWithoutCircularReferences;
      sessionStorage.setItem('mapStatus', JSON.stringify(mapStatus));
    } catch (error) {
      //setup some sort of error message
    }
  }

  setCenterState(centerStatus) {
    mapStatus.center = centerStatus;
    try {
      sessionStorage.setItem('mapStatus', JSON.stringify(mapStatus));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        sessionStorage.clear();
        sessionStorage.setItem('mapStatus', JSON.stringify(mapStatus));
      }
    }
  }

  setZoomState(zoomStatus) {
    mapStatus.zoom = zoomStatus;
    try {
      sessionStorage.setItem('mapStatus', JSON.stringify(mapStatus));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        sessionStorage.clear();
        sessionStorage.setItem('mapStatus', JSON.stringify(mapStatus));
      }
    }
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

  uploadFileErrorHandler = () => {
    this.setState({ uploadError: true });
    setTimeout(() => {
      this.setState({ uploadError: false });
    }, 3000);
  };

  uploadUrlServiceHandler = (newUrl) => {
    if (newUrl && typeof newUrl === 'string') {
      this.setState({ wmsServiceUrl: newUrl });
    } else {
      //set popup error messsage
      this.setState({ wmsServiceUrl: '' });
    }
  };

  serviceChangeHandler = () => {
    // Reset wmsServiceUrl without causing a new update of the children
    this.setState({ wmsServiceUrl: '' });
  };

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

  // waitForDataFill(obj) {
  //   while (obj.length === 0) {
  //     new Promise((resolve) => setTimeout(resolve, 100)); // wait for 100ms
  //   }
  //   return obj;
  // }

  async componentDidMount() {
    loadCss();
    await this.loader();
    this.tax = await this.getTaxonomy('collective.taxonomy.family');
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
    console.log('MapViewer: componentDidUpdate called');
    console.log('MapViewer: prevProps:', prevProps);
    console.log('MapViewer: current props:', this.props);
    console.log('MapViewer: prevState:', prevState);
    console.log('MapViewer: current state:', this.state);

    if (
      this.props.Download ||
      (this.location &&
        (this.location.search.includes('product=') ||
          this.location.search.includes('dataset=')))
    ) {
      console.log('MapViewer: Download or product/dataset condition met');
      let toc_panel_scrolls = sessionStorage.getItem('toc_panel_scrolls');
      console.log('MapViewer: Retrieved toc_panel_scrolls:', toc_panel_scrolls);
      if (!sessionStorage.getItem('TMSLayerObj')) {
        console.log(
          'MapViewer: TMSLayerObj not found, clearing sessionStorage',
        );
        sessionStorage.clear();
      }
      console.log(
        'MapViewer: Setting toc_panel_scrolls back to sessionStorage',
      );
      sessionStorage.setItem('toc_panel_scrolls', toc_panel_scrolls);
    }
    console.log('MapViewer: componentDidUpdate completed');
    // if (
    //   prevState.wmsServiceUrl !== this.state.wmsServiceUrl &&
    //   this.state.wmsServiceUrl === ''
    // ) {
    //   // Reset wmsServiceUrl without causing a new update of the children
    //   this.setState({ wmsServiceUrl: '' });
    // }
  }

  componentWillUnmount() {
    // clean up
    console.log('MapViewer: componentWillUnmount called');
    console.log('MapViewer: Starting cleanup process');
    const { user_id, isLoggedIn } = this.context;
    console.log('MapViewer: Retrieved user_id:', user_id);
    console.log('MapViewer: Retrieved isLoggedIn:', isLoggedIn);
    console.log('MapViewer: Saving user data to localStorage');

    if (sessionStorage.length === 0) {
      console.log(
        'MapViewer: SessionStorage is empty, skipping save to localStorage',
      );
    } else {
      const saveToLocal = (key) => {
        const data = {};
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          data[k] = sessionStorage.getItem(k);
        }
        console.log('MapViewer: Current session storage contents:', data);
        localStorage.setItem(key, JSON.stringify(data));
        const check = JSON.parse(localStorage.getItem(key));
        console.log(
          'MapViewer: Saved session storage to localStorage content: ',
          check,
        );
      };

      if (
        isLoggedIn &&
        user_id !== undefined &&
        user_id !== null &&
        user_id !== ''
      ) {
        saveToLocal(`user_${user_id}`);
        console.log(`MapViewer: User is logged in, saving to user_${user_id}`);
      } else if (
        !isLoggedIn &&
        (user_id === undefined || user_id === null || user_id === '')
      ) {
        saveToLocal('user_anonymous');
        console.log('MapViewer: User is anonymous, saving to user_anonymous');
      }
    }

    sessionStorage.clear();
    console.log('MapViewer: View exists:', !!this.view);
    if (this.view) {
      console.log('MapViewer: Destroying view container');
      this.view.container = null;
      console.log('MapViewer: Calling view.destroy()');
      this.view.destroy();
      console.log('MapViewer: Deleting view reference');
      delete this.view;
    }
    console.log('MapViewer: componentWillUnmount completed');
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

  // renderMenu() {
  //   if (this.view)
  //     return (
  //       <MenuWidget
  //         location={this.location}
  //         view={this.view}
  //         conf={this.props.mapviewer_config.Components}
  //         download={this.props.mapviewer_config.Download}
  //         map={this.map}
  //         mapViewer={this}
  //         updateArea={this.updateArea}
  //         area={this.state.area}
  //         layers={this.state.layers}
  //         activeLayersHandler={this.activeLayersHandler}
  //         urls={this.cfgUrls}
  //         loadingHandler={this.loadingHandler}
  //         hotspotDataHandler={this.hotspotDataHandler}
  //         hotspotData={this.state.hotspotData}
  //         mapLayersHandler={this.mapLayersHandler}
  //         bookmarkData={this.state.bookmarkData}
  //         bookmarkHandler={this.bookmarkHandler}
  //         prepackageChecked={this.state.prepackageChecked}
  //         prepackageHandler={this.prepackageHandler}
  //         uploadedFile={this.state.uploadedFile}
  //         uploadFileHandler={this.uploadFileHandler}
  //         uploadUrlServiceHandler={this.uploadUrlServiceHandler}
  //         wmsServiceUrl={this.state.wmsServiceUrl}
  //         onServiceChange={this.serviceChangeHandler}
  //         uploadFileErrorHandler={this.uploadFileErrorHandler}
  //         //getTaxonomy={this.getTaxonomy}
  //       />
  //     ); //call conf
  // }

  // renderBookmark() {
  //   if (this.view) return <CheckUserID reference={this} />;
  // }

  appLanguage() {
    return intl && <CheckLanguage />;
  }

  renderLoadingSpinner() {
    return (
      <LoadingSpinner view={this.view} layerLoading={this.state.layerLoading} />
    );
  }

  renderUploadService() {
    if (this.view)
      return (
        <UploadWidget
          mapviewer_config={this.props.mapviewer_config}
          view={this.view}
          map={this.map}
          mapViewer={this}
          wmsServiceUrl={this.state.wmsServiceUrl}
          showErrorPopup={this.state.uploadError}
          uploadUrlServiceHandler={this.uploadUrlServiceHandler}
          uploadFileErrorHandler={this.uploadFileErrorHandler}
        />
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
          <div ref={this.mapdiv} className="map" />
        </div>
      );
    } else {
      return (
        <div className={this.mapClass}>
          <div ref={this.mapdiv} className="map">
            {this.appLanguage()}
            {this.renderBasemap()}
            <UserStorageManager>
              {this.renderLegend()}
              {this.renderMeasurement()}
              {this.renderPrint()}
              {this.renderSwipe()}
              {this.renderArea()}
              {this.renderPan()}
              {this.renderScale()}
              {this.renderInfo()}
              {this.renderHotspot()}
              {this.renderLoadingSpinner()}
              <CheckUserID reference={this} />
              {this.renderUploadService()}
            </UserStorageManager>
          </div>
        </div>
      );
    }
  }
}

// CheckLogin, CheckUserID now use useUserContext instead of useCartState

export const CheckLogin = ({ reference }) => {
  const { isLoggedIn } = useUserContext();
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
  const { user_id, isLoggedIn } = useUserContext();
  return (
    <>
      {reference.view && (
        <>
          {/* BookmarkWidget with user_id */}
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

          {/* MenuWidget with user_id */}
          <MenuWidget
            location={reference.location}
            view={reference.view}
            conf={reference.props.mapviewer_config.Components}
            download={reference.props.mapviewer_config.Download}
            map={reference.map}
            mapViewer={reference}
            updateArea={reference.updateArea}
            area={reference.state.area}
            layers={reference.state.layers}
            activeLayersHandler={reference.activeLayersHandler}
            urls={reference.cfgUrls}
            loadingHandler={reference.loadingHandler}
            hotspotDataHandler={reference.hotspotDataHandler}
            hotspotData={reference.state.hotspotData}
            mapLayersHandler={reference.mapLayersHandler}
            bookmarkData={reference.state.bookmarkData}
            bookmarkHandler={reference.bookmarkHandler}
            prepackageChecked={reference.state.prepackageChecked}
            prepackageHandler={reference.prepackageHandler}
            uploadedFile={reference.state.uploadedFile}
            uploadFileHandler={reference.uploadFileHandler}
            uploadUrlServiceHandler={reference.uploadUrlServiceHandler}
            wmsServiceUrl={reference.state.wmsServiceUrl}
            onServiceChange={reference.serviceChangeHandler}
            uploadFileErrorHandler={reference.uploadFileErrorHandler}
            userID={user_id}
            isLoggedIn={isLoggedIn}
            getTaxonomy={reference.getTaxonomy}
            tax={reference.tax}
          />
        </>
      )}
    </>
  );
};

const mapDispatchToProps = (dispatch) => ({
  getTaxonomy: (name) => dispatch(getTaxonomy(name)),
});

const MapViewerWithProvider = (props) => (
  <UserProvider>
    <MapViewer {...props} />
  </UserProvider>
);

export default compose(
  connect(
    (state) => ({
      mapviewer_config: state.mapviewer_config.mapviewer_config,
    }),
    { MapViewerConfig },
  ),
  connect(null, mapDispatchToProps),
  injectLazyLibs('highcharts'),
)(MapViewerWithProvider, MenuWidget);
