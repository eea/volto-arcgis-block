import React, {
  createRef,
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
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
import ErrorReportWidget from './ErrorReportWidget';
import { injectLazyLibs } from '@plone/volto/helpers/Loadable';
import { getTaxonomy } from '@eeacms/volto-taxonomy/actions';
import { fetchCatalogApiDates } from '../../actions';

//import "isomorphic-fetch";  <-- Necessary to use fetch?
var Map, MapView, Zoom, intl, Basemap, WebTileLayer, Extent;
let mapStatus = {};

const CheckLanguage = () => {
  const { locale } = useIntl();
  intl.setLocale(locale);
  return null;
};

// Enhanced UserContext and Provider with state monitoring capabilities
const UserContext = createContext({ user_id: null, isLoggedIn: false });
const useUserContext = () => useContext(UserContext);

// Enhanced UserProvider with state change monitoring
const UserProvider = ({ children }) => {
  const cartState = useCartState();

  // Direct transformation of cart state to user context format
  // No local state needed - context reactively updates when cartState changes
  const userContextValue = {
    user_id: cartState?.user_id || null,
    isLoggedIn: cartState?.isLoggedIn || false,
  };

  // Show loading only when cart state is completely undefined (initial load)
  // Prevents UI flicker by distinguishing between "loading" and "logged out" states
  if (cartState === undefined) {
    return (
      <div className="loading-container">
        <div className="loading-text">Loading...</div>
      </div>
    );
  }

  return (
    <UserContext.Provider value={userContextValue}>
      {children}
    </UserContext.Provider>
  );
};

// MapViewer State Monitor - Functional wrapper that monitors useCartState changes
// and ensures the class component always receives the latest authentication state
const MapViewerStateMonitor = ({ children, onUserStateChange }) => {
  const cartState = useCartState();
  const prevCartStateRef = useRef(null);

  // Monitor cart state changes and notify parent component
  useEffect(() => {
    if (cartState !== undefined) {
      const currentUserState = {
        user_id: cartState?.user_id || null,
        isLoggedIn: cartState?.isLoggedIn || false,
      };

      // Compare with previous state to detect changes
      if (prevCartStateRef.current !== null) {
        const hasUserIdChanged =
          prevCartStateRef.current.user_id !== currentUserState.user_id;
        const hasLoggedInChanged =
          prevCartStateRef.current.isLoggedIn !== currentUserState.isLoggedIn;

        if (hasUserIdChanged || hasLoggedInChanged) {
          // Notify parent component of state change
          if (onUserStateChange) {
            onUserStateChange(currentUserState, prevCartStateRef.current);
          }
        }
      }

      // Update previous state using ref (doesn't cause re-renders)
      prevCartStateRef.current = currentUserState;
    }
  }, [cartState, onUserStateChange]);

  return children;
};

// UserStorageManager now consumes user state directly from UserContext
// Eliminates prop drilling and ensures consistent user state access
const UserStorageManager = ({ children, onStorageManaged }) => {
  const { user_id: userID, isLoggedIn } = useUserContext();
  const [storageManaged, setStorageManaged] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Generate unique instance ID to track operations and prevent race conditions
  const instanceId = useRef(Math.random().toString(36).substring(7));

  // Track if this instance has successfully restored data
  const hasRestoredData = useRef(false);

  const populateSessionFromUserData = (userKey) => {
    const userData = localStorage.getItem(userKey);
    if (userData) {
      const parsed = JSON.parse(userData);
      const userIdFromKey = (key) => key.replace(/^user_/, '');
      const hydratedFor = sessionStorage.getItem('mv_hydrated_for');
      const alreadyHasLayers = (() => {
        try {
          const cl = JSON.parse(
            sessionStorage.getItem('checkedLayers') || '[]',
          );
          return Array.isArray(cl) && cl.length > 0;
        } catch {
          return false;
        }
      })();
      if (hydratedFor === userIdFromKey(userKey) || alreadyHasLayers) {
        return true;
      }
      Object.entries(parsed).forEach(([k, v]) => {
        const existing = sessionStorage.getItem(k);
        if (existing == null) {
          sessionStorage.setItem(
            k,
            typeof v === 'object' ? JSON.stringify(v) : v,
          );
          return;
        }
        if (k === 'checkedLayers') {
          try {
            const a = JSON.parse(existing || '[]');
            const b = typeof v === 'string' ? JSON.parse(v) : v;
            const union = [...new Set([...(b || []), ...(a || [])])];
            sessionStorage.setItem('checkedLayers', JSON.stringify(union));
          } catch {}
        } else if (k === 'visibleLayers' || k === 'layerOpacities') {
          try {
            const a = JSON.parse(existing || '{}');
            const b = typeof v === 'string' ? JSON.parse(v) : v || {};
            sessionStorage.setItem(k, JSON.stringify({ ...b, ...a }));
          } catch {}
        }
      });
      sessionStorage.setItem('mv_hydrated_for', userIdFromKey(userKey));

      // Mark that this instance has successfully restored data
      hasRestoredData.current = true;

      return true; // Indicate successful restoration
    } else {
      return false;
    }
  };

  // Improved instance management with lock mechanism to prevent race conditions
  const acquireStorageLock = (lockKey) => {
    const existingLock = localStorage.getItem(lockKey);
    if (existingLock && existingLock !== instanceId.current) {
      return false; // Another instance has the lock
    }
    localStorage.setItem(lockKey, instanceId.current);
    return true;
  };

  const releaseStorageLock = (lockKey) => {
    const currentLock = localStorage.getItem(lockKey);
    if (currentLock === instanceId.current) {
      localStorage.removeItem(lockKey);
    }
  };

  // Initialization effect - handles user state readiness
  useEffect(() => {
    if (userID !== undefined && isLoggedIn !== undefined) {
      setIsInitialized(true);
    }
  }, [userID, isLoggedIn]);

  // Initial storage management effect - runs once on mount with lock protection
  useEffect(() => {
    if (!isInitialized || storageManaged) {
      return;
    }

    const lockKey = `storage_lock_${userID || 'anonymous'}`;

    // Acquire lock to prevent concurrent operations
    if (!acquireStorageLock(lockKey)) {
      return;
    }
    try {
      if (isLoggedIn === true) {
        if (
          userID &&
          userID !== null &&
          userID !== undefined &&
          userID !== ''
        ) {
          const userKey = `user_${userID}`;
          const userData = localStorage.getItem(userKey);
          const anonymousData = localStorage.getItem('user_anonymous');

          // Migration and restoration logic for signed-in users
          if (!userData && anonymousData) {
            // Move anonymous data to the signed-in user's localStorage key
            localStorage.setItem(userKey, anonymousData);
            // Delete the anonymous key from localStorage
            localStorage.removeItem('user_anonymous');
            // Populate sessionStorage with the migrated data from localStorage
            populateSessionFromUserData(userKey);
          } else if (userData) {
            // User has existing saved data - restore it to sessionStorage
            populateSessionFromUserData(userKey);
          } else {
          }
          setStorageManaged(true);
        } else {
        }
      } else if (isLoggedIn === false) {
        // Handle anonymous user session - restore anonymous data if it exists
        const anonymousKey = 'user_anonymous';
        const anonymousData = localStorage.getItem(anonymousKey);
        if (anonymousData) {
          sessionStorage.clear();
          const parsed = JSON.parse(anonymousData);
          Object.keys(parsed).forEach((k) =>
            sessionStorage.setItem(
              k,
              typeof parsed[k] === 'object'
                ? JSON.stringify(parsed[k])
                : parsed[k],
            ),
          );
          hasRestoredData.current = true;
        } else {
        }
        setStorageManaged(true);
      } else {
      }

      if (onStorageManaged) {
        onStorageManaged();
      }
    } finally {
      // Always release the lock, even if an error occurred
      releaseStorageLock(lockKey);
    }

    // Cleanup function to release lock on unmount
    return () => {
      releaseStorageLock(lockKey);
    };
  }, [isInitialized, isLoggedIn, userID, storageManaged, onStorageManaged]);

  // Data-reactive effect - ensures sessionStorage mirrors localStorage whenever userData changes
  // useEffect(() => {
  //

  //   if (storageManaged && userKey && userData) {
  //
  //     populateSessionFromUserData(userKey);
  //   } else {
  //
  //   }
  // }, [userData, userKey, storageManaged]);

  // Render only when properly initialized to prevent premature mounting
  return isInitialized &&
    storageManaged &&
    userID !== undefined &&
    isLoggedIn !== undefined ? (
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

    // Generate unique instance ID for tracking operations
    this.instanceId = Math.random().toString(36).substring(7);

    this.state = {
      layerLoading: false,
      layers: {},
      uploadedFile: true,
      wmsServiceUrl: '',
      uploadError: false,
      // Track current user state for comparison in componentDidUpdate
      currentUserState: props.initialUserState || {
        user_id: null,
        isLoggedIn: false,
      },
    };
    this.activeLayersHandler = this.activeLayersHandler.bind(this);
    this.activeLayersArray = {};
    this.props.mapviewer_config.loading = true;
    this.cfgUrls = this.props.cfg.Urls;
    // User state change handler
    this.handleUserStateChange = this.handleUserStateChange.bind(this);
    this.loadingHandler = this.loadingHandler.bind(this);
    this.hotspotDataHandler = this.hotspotDataHandler.bind(this);
    this.mapLayersHandler = this.mapLayersHandler.bind(this);
    this.bookmarkHandler = this.bookmarkHandler.bind(this);
    this.prepackageHandler = this.prepackageHandler.bind(this);
    this.uploadFileHandler = this.uploadFileHandler.bind(this);
    this.uploadFileErrorHandler = this.uploadFileErrorHandler.bind(this);
    this.uploadUrlServiceHandler = this.uploadUrlServiceHandler.bind(this);
    this.getTaxonomy = this.props.getTaxonomy.bind(this);
    this.tax = null;
  }

  // Method to handle user state changes from the monitoring wrapper
  handleUserStateChange(newUserState, previousUserState) {
    // Update current user state in component state
    this.setState({ currentUserState: newUserState });

    // Trigger session state update logic
    this.handleSessionStateUpdate(newUserState, previousUserState);
  }

  // Enhanced method to save session data to localStorage with instance tracking
  saveSessionToLocalStorage = () => {
    const { user_id, isLoggedIn } = this.context;
    //const instanceId = this.instanceId || 'unknown';

    if (sessionStorage.length === 0) {
      return;
    }

    const saveToLocal = (key) => {
      const data = {};
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        data[k] = sessionStorage.getItem(k);
      }

      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch (error) {}
    };

    // Save session data to appropriate localStorage key based on user state (always overwrite user key)
    if (
      isLoggedIn &&
      user_id !== undefined &&
      user_id !== null &&
      user_id !== ''
    ) {
      saveToLocal(`user_${user_id}`);
    } else if (!isLoggedIn) {
      saveToLocal('user_anonymous');
    }
    sessionStorage.clear();
  };

  // Handle page unload events (navigation, refresh, close)
  handlePageUnload = (event) => {
    this.saveSessionToLocalStorage();
  };

  // Handle visibility changes (tab switches, window minimizing)
  handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      this.saveSessionToLocalStorage();
    }
  };

  // Method to handle session state updates when user authentication changes
  handleSessionStateUpdate(newUserState, previousUserState) {
    const { user_id: newUserId, isLoggedIn: newIsLoggedIn } = newUserState;
    const {
      user_id: prevUserId,
      isLoggedIn: prevIsLoggedIn,
    } = previousUserState;

    // Handle login/logout transitions
    if (prevIsLoggedIn !== newIsLoggedIn) {
      if (newIsLoggedIn && !prevIsLoggedIn) {
        // User just logged in
        this.handleUserLogin(newUserId);
      } else if (!newIsLoggedIn && prevIsLoggedIn) {
        // User just logged out
        this.handleUserLogout(prevUserId);
      }
    }

    // Handle user ID changes (e.g., switching accounts)
    if (prevUserId !== newUserId && newIsLoggedIn) {
      this.handleUserSwitch(prevUserId, newUserId);
    }
  }

  // Handle user login - restore saved session or preserve current session
  handleUserLogin(userId) {
    // Check if user has saved data
    const userKey = `user_${userId}`;
    const userData = localStorage.getItem(userKey);

    if (userData) {
      // Restore user's saved session
      try {
        const parsed = JSON.parse(userData);
        Object.keys(parsed).forEach((k) =>
          sessionStorage.setItem(
            k,
            typeof parsed[k] === 'object'
              ? JSON.stringify(parsed[k])
              : parsed[k],
          ),
        );
      } catch (error) {}
    } else {
      // No saved data - preserve current session state
    }
  }

  // Handle user logout - save current session to anonymous storage
  handleUserLogout(prevUserId) {
    // Save current session to anonymous storage
    const sessionContents = {};
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      sessionContents[key] = sessionStorage.getItem(key);
    }

    if (Object.keys(sessionContents).length > 0) {
      // Persist snapshot under previous user key first (if available)
      if (prevUserId) {
        try {
          localStorage.setItem(
            `user_${prevUserId}`,
            JSON.stringify(sessionContents),
          );
        } catch (error) {}
      }
      try {
        localStorage.setItem('user_anonymous', JSON.stringify(sessionContents));
      } catch (error) {}
    }
  }

  // Handle user account switching
  handleUserSwitch(prevUserId, newUserId) {
    // Save current session to previous user's storage
    if (prevUserId) {
      const sessionContents = {};
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        sessionContents[key] = sessionStorage.getItem(key);
      }

      if (Object.keys(sessionContents).length > 0) {
        try {
          localStorage.setItem(
            `user_${prevUserId}`,
            JSON.stringify(sessionContents),
          );
        } catch (error) {}
      }
    }

    // Load new user's session
    this.handleUserLogin(newUserId);
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

    // Improved condition check to prevent false positives that overwrite restored data
    if (
      mapStatus === null ||
      mapStatus === undefined ||
      (typeof mapStatus === 'object' &&
        mapStatus.zoom === undefined &&
        mapStatus.center === undefined) ||
      (typeof mapStatus === 'object' && Object.entries(mapStatus).length === 0)
    ) {
      mapStatus = {};
      mapStatus.zoom = this.mapCfg.zoom;
      mapStatus.center = this.mapCfg.center;
      mapStatus.activeLayers = this.mapCfg.activeLayers;
      this.setCenterState(this.mapCfg.center);
      this.setZoomState(this.mapCfg.zoom);
      this.activeLayersHandler(this.mapCfg.activeLayers);
    } else {
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

    // Add event listeners for page unload events to ensure data is saved

    // beforeunload - most reliable for catching navigation away from page
    window.addEventListener('beforeunload', this.handlePageUnload);

    // pagehide - more reliable than unload, catches all page hiding scenarios
    window.addEventListener('pagehide', this.handlePageUnload);

    // visibilitychange - catches tab switches and window minimizing
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  componentDidUpdate(prevProps, prevState) {
    // Handle Download/dataset URL changes (existing logic)
    if (
      this.props.Download ||
      (this.location &&
        (this.location.search.includes('product=') ||
          this.location.search.includes('dataset=')))
    ) {
      let toc_panel_scrolls = sessionStorage.getItem('toc_panel_scrolls');
      if (!sessionStorage.getItem('TMSLayerObj')) {
        sessionStorage.clear();
      }
      sessionStorage.setItem('toc_panel_scrolls', toc_panel_scrolls);
    }

    // Handle user state changes from context
    const {
      user_id: currentUserId,
      isLoggedIn: currentIsLoggedIn,
    } = this.context;
    const { currentUserState: prevUserState } = prevState;

    // Compare current context values with previous state
    if (
      prevUserState.user_id !== currentUserId ||
      prevUserState.isLoggedIn !== currentIsLoggedIn
    ) {
      // Update component state to reflect new user state
      const newUserState = {
        user_id: currentUserId,
        isLoggedIn: currentIsLoggedIn,
      };
      this.setState({ currentUserState: newUserState });

      // Handle the user state change
      this.handleSessionStateUpdate(newUserState, prevUserState);
    }
  }

  componentWillUnmount() {
    window.removeEventListener('beforeunload', this.handlePageUnload);
    window.removeEventListener('pagehide', this.handlePageUnload);
    document.removeEventListener(
      'visibilitychange',
      this.handleVisibilityChange,
    );

    // Save data using the extracted method
    this.saveSessionToLocalStorage();

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
  renderErrorReport() {
    if (this.view)
      return <ErrorReportWidget view={this.view} mapViewer={this} />;
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
            {this.renderErrorReport()}
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
            isLoggedIn={isLoggedIn}
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
            catalogapi={reference.props.catalogapi}
            fetchCatalogApiDates={reference.props.fetchCatalogApiDates}
          />
        </>
      )}
    </>
  );
};

const mapDispatchToProps = (dispatch) => ({
  getTaxonomy: (name) => dispatch(getTaxonomy(name)),
  fetchCatalogApiDates: (byoc, force_refresh) =>
    dispatch(fetchCatalogApiDates(byoc, force_refresh)),
});

const MapViewerWithProvider = (props) => {
  const mapViewerRef = useRef(null);
  const cartState = useCartState();

  // Get initial user state
  const initialUserState = {
    user_id: cartState?.user_id || null,
    isLoggedIn: cartState?.isLoggedIn || false,
  };

  // Handle user state changes from the monitor
  const handleUserStateChange = useCallback(
    (newUserState, previousUserState) => {
      if (mapViewerRef.current) {
        mapViewerRef.current.handleUserStateChange(
          newUserState,
          previousUserState,
        );
      }
    },
    [],
  );

  return (
    <UserProvider>
      <UserStorageManager>
        <MapViewerStateMonitor onUserStateChange={handleUserStateChange}>
          <MapViewer
            {...props}
            ref={mapViewerRef}
            initialUserState={initialUserState}
          />
        </MapViewerStateMonitor>
      </UserStorageManager>
    </UserProvider>
  );
};

export default compose(
  connect(
    (state) => ({
      mapviewer_config: state.mapviewer_config.mapviewer_config,
      catalogapi: state.catalogapi,
    }),
    { MapViewerConfig },
  ),
  connect(null, mapDispatchToProps),
  injectLazyLibs('highcharts'),
)(MapViewerWithProvider, MenuWidget);
