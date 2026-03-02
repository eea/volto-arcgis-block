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
import SearchWidget from './SearchWidget';
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
var Map, MapView, SceneView, Zoom, intl, Basemap, WebTileLayer, Extent;
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
    this.mapContainer = createRef();
    this.mapCfg = props.cfg.Map;
    this.compCfg = this.props.cfg.Components;
    this.url = this.props.cfg.url || ''; // Get url or default
    this.location = this.props.location;
    this.map = null;
    this.id = props.id;
    this.viewModeContainer = createRef();
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
      userServiceUrl: '',
      userServiceType: '',
      userServiceFile: null,
      uploadError: false,
      uploadErrorType: 'uploadError',
      viewMode: this.normalizeViewMode(
        this.props.initialViewMode || this.mapCfg.defaultViewMode,
      ),
      viewRevision: 0,
      isWidgetRenderEnabled: true,
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
    this.switchViewMode = this.switchViewMode.bind(this);
    this.getTaxonomy = this.props.getTaxonomy.bind(this);
    this.tax = null;
    this.viewWatchers = [];
    this.zoom = null;
    this.isComponentMounted = false;
    this.viewTransitionTaskId = 0;
    this.isViewSwitchInProgress = false;
    this.syncViewTask = null;
    this.viewUiOperationState = null;
  }

  normalizeViewMode(viewMode) {
    return viewMode === '3d' ? '3d' : '2d';
  }

  getViewConstraintExtent(useZoomInBounds) {
    const geometryConfig = useZoomInBounds
      ? this.mapCfg.geometryZoomIn
      : this.mapCfg.geometry;
    return new Extent({
      xmin: geometryConfig.xmin,
      ymin: geometryConfig.ymin,
      xmax: geometryConfig.xmax,
      ymax: geometryConfig.ymax,
      spatialReference: 4326,
    });
  }

  getViewStateSnapshot() {
    if (!this.view) {
      return {
        center: mapStatus.center,
        zoom: mapStatus.zoom,
        viewpoint: null,
        viewMode: this.normalizeViewMode(this.state.viewMode),
      };
    }

    return {
      center:
        this.view.center && this.view.center.toJSON
          ? this.view.center.toJSON()
          : this.view.center,
      zoom: this.view.zoom,
      viewpoint:
        this.view.viewpoint && this.view.viewpoint.clone
          ? this.view.viewpoint.clone()
          : this.view.viewpoint,
      viewMode: this.normalizeViewMode(this.view.type),
    };
  }

  resolveViewState(previousViewState, normalizedViewMode) {
    if (!previousViewState) {
      return {
        viewpoint: null,
      };
    }

    const isViewModeCompatible =
      previousViewState.viewMode === normalizedViewMode;

    return {
      viewpoint: isViewModeCompatible ? previousViewState.viewpoint : null,
    };
  }

  buildFallbackViewState(normalizedViewMode) {
    return {
      center: this.resolveViewCenter(
        mapStatus.center || this.mapCfg.center,
        normalizedViewMode,
      ),
      zoom:
        typeof mapStatus.zoom === 'number' ? mapStatus.zoom : this.mapCfg.zoom,
      viewpoint: null,
      viewMode: normalizedViewMode,
    };
  }

  resolveViewCenter(centerValue, normalizedViewMode) {
    if (!centerValue) {
      return centerValue;
    }

    if (normalizedViewMode !== '2d') {
      return centerValue;
    }

    if (Array.isArray(centerValue)) {
      return centerValue.slice(0, 2);
    }

    if (typeof centerValue === 'object') {
      if (
        typeof centerValue.longitude === 'number' &&
        typeof centerValue.latitude === 'number'
      ) {
        return [centerValue.longitude, centerValue.latitude];
      }

      const sanitizedCenter = { ...centerValue };
      if ('z' in sanitizedCenter) {
        delete sanitizedCenter.z;
      }
      return sanitizedCenter;
    }

    return centerValue;
  }

  removeViewWatchers() {
    if (Array.isArray(this.viewWatchers) && this.viewWatchers.length > 0) {
      this.viewWatchers.forEach((watchHandler) => {
        if (watchHandler && watchHandler.remove) {
          watchHandler.remove();
        }
      });
    }
    this.viewWatchers = [];
  }

  attachViewWatchers() {
    if (!this.view) return;

    this.removeViewWatchers();

    const centerWatcher = this.view.watch('center', (newValue) => {
      this.setCenterState(newValue);
    });

    const zoomWatcher = this.view.watch('zoom', (newValue) => {
      this.setZoomState(newValue);
      const shouldUseZoomInBounds = newValue > this.mapCfg.minZoom;
      const constraintExtent = this.getViewConstraintExtent(
        shouldUseZoomInBounds,
      );

      if (this.view.type === '2d') {
        this.view.constraints.geometry = constraintExtent;
      } else {
        this.view.clippingArea = constraintExtent;
      }
    });

    this.viewWatchers.push(centerWatcher, zoomWatcher);
  }

  addViewModeControl() {
    return;
  }

  syncViewWidgetContainers() {
    if (
      !this.view ||
      !this.view.ui ||
      this.isViewSwitchInProgress ||
      !this.state.isWidgetRenderEnabled
    )
      return;

    const uiContainerConfig = [
      { selector: '.map-left-menu-container', position: 'top-left' },
      { selector: '.search-container', position: 'top-left' },
      { selector: '.basemap-container', position: 'top-right' },
      { selector: '.legend-container', position: 'top-right' },
      { selector: '.measurement-container', position: 'top-right' },
      { selector: '.print-container', position: 'top-right' },
      { selector: '.swipe-container', position: 'top-right' },
      { selector: '.area-container', position: 'top-right' },
      { selector: '.pan-container', position: 'top-right' },
      { selector: '.info-container', position: 'top-right' },
      { selector: '.hotspot-container', position: 'top-right' },
      { selector: '.bookmark-container', position: 'top-right' },
      { selector: '.upload-container', position: 'top-right' },
      { selector: '.error-report-container', position: 'top-right' },
    ];

    uiContainerConfig.forEach(({ selector, position }) => {
      const containerNodeList = document.querySelectorAll(selector);
      if (!containerNodeList || containerNodeList.length === 0) return;
      containerNodeList.forEach((containerNode) => {
        if (!containerNode) return;
        try {
          this.view.ui.add(containerNode, position);
        } catch (error) {}
      });
    });

    const loaderNode = document.querySelector('#loader');
    if (loaderNode) {
      try {
        this.view.ui.add(loaderNode, 'manual');
      } catch (error) {}
    }
  }

  scheduleViewSyncTask() {
    if (this.syncViewTask) {
      cancelAnimationFrame(this.syncViewTask);
      this.syncViewTask = null;
    }

    this.syncViewTask = requestAnimationFrame(() => {
      if (
        !this.isComponentMounted ||
        !this.view ||
        this.isViewSwitchInProgress ||
        !this.state.isWidgetRenderEnabled
      ) {
        return;
      }
      this.syncViewWidgetContainers();
      this.syncViewTask = null;
    });
  }

  disposeViewResource(preserveMap = true) {
    if (!this.view) return;

    this.removeViewWatchers();

    try {
      if (this.zoom) {
        this.zoom.destroy();
      }
    } catch (error) {}
    this.zoom = null;

    if (preserveMap && this.view.map) {
      this.view.map = null;
    }

    try {
      this.view.container = null;
      this.view.destroy();
    } catch (error) {}

    this.view = null;
  }

  reclaimWidgetNodesFromViewUi() {
    const mapContainerNode = this.mapContainer.current;
    if (!mapContainerNode) {
      return;
    }

    const resolveWidgetParentNode = (widgetNode) => {
      if (
        widgetNode &&
        widgetNode.__mapViewerContainerParentNode instanceof Node
      ) {
        return widgetNode.__mapViewerContainerParentNode;
      }
      return mapContainerNode;
    };

    const widgetSelectorList = [
      '.map-left-menu-container',
      '.search-container',
      '.basemap-container',
      '.legend-container',
      '.measurement-container',
      '.print-container',
      '.swipe-container',
      '.area-container',
      '.pan-container',
      '.info-container',
      '.hotspot-container',
      '.bookmark-container',
      '.upload-container',
      '.error-report-container',
      '.timeslider-container',
      '.esri-swipe',
      '.viewmode-container',
      '#loader',
    ];

    widgetSelectorList.forEach((selector) => {
      const widgetNodeList = document.querySelectorAll(selector);
      if (!widgetNodeList || widgetNodeList.length === 0) {
        return;
      }

      widgetNodeList.forEach((widgetNode) => {
        if (!widgetNode) {
          return;
        }

        try {
          if (this.view && this.view.ui) {
            this.view.ui.remove(widgetNode);
          }
        } catch (error) {}

        const widgetParentNode = resolveWidgetParentNode(widgetNode);
        if (widgetNode.parentNode !== widgetParentNode) {
          try {
            widgetParentNode.appendChild(widgetNode);
          } catch (error) {}
        }
      });
    });
  }

  setWidgetRenderState(isWidgetRenderEnabled) {
    return new Promise((resolveStateUpdate) => {
      this.setState({ isWidgetRenderEnabled }, resolveStateUpdate);
    });
  }

  waitForRenderTask() {
    return new Promise((resolveRenderTask) => {
      requestAnimationFrame(() => {
        resolveRenderTask();
      });
    });
  }

  waitForViewReady(view, timeoutMs = 15000) {
    return Promise.race([
      view.when(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('view_ready_timeout')), timeoutMs);
      }),
    ]);
  }

  freezeViewUiOperations() {
    if (
      this.viewUiOperationState ||
      !this.view ||
      !this.view.ui ||
      !this.view.ui.add ||
      !this.view.ui.remove
    ) {
      return;
    }

    this.viewUiOperationState = {
      viewUi: this.view.ui,
      add: this.view.ui.add,
      remove: this.view.ui.remove,
    };

    this.view.ui.add = () => {};
    this.view.ui.remove = () => {};
  }

  restoreViewUiOperations() {
    if (!this.viewUiOperationState) {
      return;
    }

    const { viewUi, add, remove } = this.viewUiOperationState;
    try {
      if (viewUi) {
        viewUi.add = add;
        viewUi.remove = remove;
      }
    } catch (error) {}

    this.viewUiOperationState = null;
  }

  async processWidgetTeardown() {
    this.processWidgetShutdown();
    this.reclaimWidgetNodesFromViewUi();
    this.freezeViewUiOperations();
    try {
      await this.setWidgetRenderState(false);
      await this.waitForRenderTask();
      this.reclaimWidgetNodesFromViewUi();
      await this.waitForRenderTask();
    } catch (error) {}
  }

  async createView(
    viewMode,
    previousViewState,
    transitionTaskId = this.viewTransitionTaskId,
  ) {
    const normalizedViewMode = this.normalizeViewMode(viewMode);
    const resolvedViewState = this.resolveViewState(
      previousViewState,
      normalizedViewMode,
    );
    const nextCenter = previousViewState?.center || mapStatus.center;
    const sanitizedCenter = this.resolveViewCenter(
      nextCenter,
      normalizedViewMode,
    );
    const nextZoom =
      previousViewState?.zoom !== undefined
        ? previousViewState.zoom
        : mapStatus.zoom;

    const baseViewProperties = {
      container: this.mapdiv.current,
      map: this.map,
      center: sanitizedCenter,
      zoom: nextZoom,
      ui: {
        components: ['attribution'],
      },
    };

    const mapViewConstraints = {
      minZoom: this.mapCfg.minZoom,
      maxZoom: this.mapCfg.maxZoom,
      rotationEnabled: false,
      geometry: this.getViewConstraintExtent(nextZoom > this.mapCfg.minZoom),
    };

    try {
      if (normalizedViewMode === '3d') {
        this.view = new SceneView({
          ...baseViewProperties,
          constraints: {
            minZoom: this.mapCfg.minZoom,
            maxZoom: this.mapCfg.maxZoom,
            tilt: {
              max: 80,
            },
          },
          clippingArea: this.getViewConstraintExtent(
            nextZoom > this.mapCfg.minZoom,
          ),
        });
      } else {
        this.view = new MapView({
          ...baseViewProperties,
          constraints: mapViewConstraints,
        });
      }
    } catch (error) {
      if (this.view) {
        this.disposeViewResource(true);
      }
      return false;
    }

    try {
      await this.waitForViewReady(this.view);
    } catch (error) {
      if (this.view) {
        this.disposeViewResource(true);
      }
      return false;
    }

    if (
      !this.isComponentMounted ||
      transitionTaskId !== this.viewTransitionTaskId
    ) {
      this.disposeViewResource(true);
      return false;
    }

    if (resolvedViewState.viewpoint) {
      this.view.viewpoint = resolvedViewState.viewpoint;
    }

    this.zoom = new Zoom({
      view: this.view,
    });
    this.view.ui.add(this.zoom, {
      position: 'top-right',
    });

    this.attachViewWatchers();
    this.view.popup.autoOpenEnabled = false;
    this.addViewModeControl();
    this.syncViewWidgetContainers();
    return true;
  }

  async switchViewMode(nextViewMode) {
    const normalizedNextMode = this.normalizeViewMode(nextViewMode);

    if (
      normalizedNextMode === '2d' &&
      this.state.viewMode === '3d' &&
      this.props.requestViewRebuild
    ) {
      this.saveSessionToLocalStorage({ shouldClearSession: false });
      this.props.requestViewRebuild(normalizedNextMode);
      return;
    }

    if (
      normalizedNextMode === this.state.viewMode ||
      !this.map ||
      this.isViewSwitchInProgress
    ) {
      return;
    }

    this.isViewSwitchInProgress = true;

    if (this.syncViewTask) {
      cancelAnimationFrame(this.syncViewTask);
      this.syncViewTask = null;
    }

    const transitionTaskId = this.viewTransitionTaskId + 1;
    this.viewTransitionTaskId = transitionTaskId;

    try {
      if (
        !this.isComponentMounted ||
        transitionTaskId !== this.viewTransitionTaskId
      ) {
        return;
      }

      const previousViewState = this.getViewStateSnapshot();
      const resolvedPreviousViewMode = this.normalizeViewMode(
        previousViewState?.viewMode || this.state.viewMode,
      );

      this.saveSessionToLocalStorage({ shouldClearSession: false });
      await this.processWidgetTeardown();
      this.saveSessionToLocalStorage({ shouldClearSession: false });
      this.disposeViewResource(true);
      this.restoreViewUiOperations();

      let isViewCreated = await this.createView(
        normalizedNextMode,
        previousViewState,
        transitionTaskId,
      );

      if (
        !isViewCreated &&
        this.isComponentMounted &&
        transitionTaskId === this.viewTransitionTaskId
      ) {
        const fallbackViewState = this.buildFallbackViewState(
          normalizedNextMode,
        );
        isViewCreated = await this.createView(
          normalizedNextMode,
          fallbackViewState,
          transitionTaskId,
        );
      }

      if (
        !isViewCreated ||
        !this.isComponentMounted ||
        transitionTaskId !== this.viewTransitionTaskId
      ) {
        await this.createView(
          resolvedPreviousViewMode,
          previousViewState,
          transitionTaskId,
        );
        if (this.isComponentMounted) {
          await this.setWidgetRenderState(true);
        }
        return;
      }

      if (this.isComponentMounted) {
        this.setState({
          viewMode: normalizedNextMode,
          isWidgetRenderEnabled: true,
        });
      }
    } finally {
      this.restoreViewUiOperations();
      if (this.isComponentMounted && !this.state.isWidgetRenderEnabled) {
        this.setState({ isWidgetRenderEnabled: true });
      }
      this.isViewSwitchInProgress = false;
    }
  }

  getWidgetRenderKey(widgetName) {
    return `${widgetName}`;
  }

  // Method to handle user state changes from the monitoring wrapper
  handleUserStateChange(newUserState, previousUserState) {
    // Update current user state in component state
    this.setState({ currentUserState: newUserState });

    // Trigger session state update logic
    this.handleSessionStateUpdate(newUserState, previousUserState);
  }

  // Enhanced method to save session data to localStorage with instance tracking
  saveSessionToLocalStorage = (options = {}) => {
    const { shouldClearSession = true } = options;
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
    if (shouldClearSession) {
      sessionStorage.clear();
    }
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

  uploadFileErrorHandler = (errorType = 'uploadError') => {
    this.setState({ uploadError: true, uploadErrorType: errorType });
    setTimeout(() => {
      this.setState({ uploadError: false, uploadErrorType: 'uploadError' });
    }, 3000);
  };

  uploadUrlServiceHandler = (newUrl, newType, newSelection) => {
    if (newType === 'FILE' && newUrl && typeof newUrl === 'object') {
      this.setState({
        userServiceFile: newUrl,
        userServiceType: 'FILE',
        userServiceUrl: '',
        userServiceSelection: newSelection || {},
      });
    } else if (newUrl && typeof newUrl === 'string') {
      this.setState({
        userServiceUrl: newUrl,
        userServiceType: newType || '',
        userServiceSelection: newSelection || {},
        userServiceFile: null,
      });
    } else {
      this.setState({
        userServiceUrl: '',
        userServiceType: '',
        userServiceSelection: {},
        userServiceFile: null,
      });
    }
  };

  serviceChangeHandler = () => {
    // Reset userServiceUrl/type without causing a new update of the children
    this.setState({ userServiceUrl: '', userServiceType: '' });
  };

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

  // waitForDataFill(obj) {
  //   while (obj.length === 0) {
  //     new Promise((resolve) => setTimeout(resolve, 100)); // wait for 100ms
  //   }
  //   return obj;
  // }

  async componentDidMount() {
    this.isComponentMounted = true;
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

    await this.createView(this.state.viewMode, {
      center: mapStatus.center,
      zoom: mapStatus.zoom,
      viewpoint: null,
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

    if (prevState.viewMode !== this.state.viewMode) {
      this.scheduleViewSyncTask();
    }
  }

  componentWillUnmount() {
    this.isComponentMounted = false;
    this.viewTransitionTaskId += 1;
    this.freezeViewUiOperations();

    if (this.syncViewTask) {
      cancelAnimationFrame(this.syncViewTask);
      this.syncViewTask = null;
    }

    window.removeEventListener('beforeunload', this.handlePageUnload);
    window.removeEventListener('pagehide', this.handlePageUnload);
    document.removeEventListener(
      'visibilitychange',
      this.handleVisibilityChange,
    );

    // Save data using the extracted method
    this.saveSessionToLocalStorage();

    this.reclaimWidgetNodesFromViewUi();
    this.disposeViewResource(true);
    this.restoreViewUiOperations();
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
      try {
        if (this.activeWidget.openMenu) {
          this.activeWidget.openMenu();
        }
      } catch (error) {}
      this.activeWidget = null;
    }
  }

  processWidgetShutdown() {
    this.closeActiveWidget();

    const widgetPanelList = document.querySelectorAll('.right-panel');
    widgetPanelList.forEach((widgetPanel) => {
      if (widgetPanel && widgetPanel.style) {
        widgetPanel.style.display = 'none';
      }
    });

    const activeWidgetList = document.querySelectorAll('.active-widget');
    activeWidgetList.forEach((activeWidgetNode) => {
      if (activeWidgetNode && activeWidgetNode.classList) {
        activeWidgetNode.classList.remove('active-widget');
      }
    });

    const topRightCornerNode = document.querySelector(
      '.esri-ui-top-right.esri-ui-corner',
    );
    if (topRightCornerNode && topRightCornerNode.classList) {
      topRightCornerNode.classList.remove('show-panel');
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
        <BasemapWidget
          key={this.getWidgetRenderKey('basemap')}
          view={this.view}
          mapViewer={this}
          urls={this.cfgUrls}
        />
      );
  }

  renderLegend() {
    if (this.view)
      return (
        <LegendWidget
          key={this.getWidgetRenderKey('legend')}
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
      return (
        <MeasurementWidget
          key={this.getWidgetRenderKey('measurement')}
          view={this.view}
          mapViewer={this}
          viewMode={this.state.viewMode}
        />
      );
  }

  renderPrint() {
    if (this.props.mapviewer_config.Download) return;
    if (this.view)
      return (
        <PrintWidget
          key={this.getWidgetRenderKey('print')}
          view={this.view}
          mapViewer={this}
          viewMode={this.state.viewMode}
        />
      );
  }

  renderSwipe() {
    if (this.props.mapviewer_config.Download) return;
    if (this.view)
      return (
        <SwipeWidget
          key={this.getWidgetRenderKey('swipe')}
          view={this.view}
          mapViewer={this}
          map={this.map}
          layers={this.state.layers}
        />
      );
  }
  renderSearch() {
    if (this.props.mapviewer_config.Download) return;
    if (this.view)
      return (
        <SearchWidget
          key={this.getWidgetRenderKey('search')}
          view={this.view}
          mapViewer={this}
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
    if (this.view)
      return (
        <ScaleWidget
          key={this.getWidgetRenderKey('scale')}
          view={this.view}
          mapViewer={this}
        />
      );
  }

  renderInfo() {
    if (this.view)
      return (
        <InfoWidget
          key={this.getWidgetRenderKey('info')}
          view={this.view}
          map={this.map}
          mapViewer={this}
          hotspotData={this.state.hotspotData}
        />
      );
  }

  renderPan() {
    if (this.view)
      return (
        <PanWidget
          key={this.getWidgetRenderKey('pan')}
          view={this.view}
          map={this.map}
          mapViewer={this}
        />
      );
  }

  renderHotspot() {
    if (this.view)
      return (
        <HotspotWidget
          key={this.getWidgetRenderKey('hotspot')}
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
      <LoadingSpinner
        key={this.getWidgetRenderKey('loading')}
        view={this.view}
        layerLoading={this.state.layerLoading}
      />
    );
  }

  renderUploadService() {
    if (this.view)
      return (
        <UploadWidget
          key={this.getWidgetRenderKey('upload')}
          mapviewer_config={this.props.mapviewer_config}
          view={this.view}
          map={this.map}
          mapViewer={this}
          wmsServiceUrl={this.state.wmsServiceUrl}
          showErrorPopup={this.state.uploadError}
          showErrorPopupType={this.state.uploadErrorType}
          uploadUrlServiceHandler={this.uploadUrlServiceHandler}
          uploadFileErrorHandler={this.uploadFileErrorHandler}
        />
      );
  }
  renderErrorReport() {
    if (this.view)
      return (
        <ErrorReportWidget
          key={this.getWidgetRenderKey('error-report')}
          view={this.view}
          mapViewer={this}
        />
      );
  }

  renderViewModeSwitcher() {
    if (!this.view) return null;

    return (
      <div className="viewmode-container esri-component esri-widget">
        <div className="viewmode-button-group">
          <button
            className={classNames('viewmode-button', {
              'active-widget': this.state.viewMode === '2d',
            })}
            onClick={() => this.switchViewMode('2d')}
            type="button"
            aria-label="Switch to 2D view"
          >
            2D
          </button>
          <button
            className={classNames('viewmode-button', {
              'active-widget': this.state.viewMode === '3d',
            })}
            onClick={() => this.switchViewMode('3d')}
            type="button"
            aria-label="Switch to 3D view"
          >
            3D
          </button>
        </div>
      </div>
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
        <div ref={this.mapContainer} className={this.mapClass}>
          <div ref={this.mapdiv} className="map" />
        </div>
      );
    } else {
      return (
        <div ref={this.mapContainer} className={this.mapClass}>
          <div ref={this.mapdiv} className="map" />
          {this.appLanguage()}
          {this.state.isWidgetRenderEnabled && (
            <>
              {this.renderBasemap()}
              {this.renderLegend()}
              {this.renderMeasurement()}
              {this.renderPrint()}
              {this.renderSwipe()}
              {this.renderSearch()}
              {this.renderViewModeSwitcher()}
              {this.renderArea()}
              {this.renderPan()}
              {this.renderScale()}
              {this.renderInfo()}
              {this.renderHotspot()}
              {this.renderLoadingSpinner()}
              <CheckUserID reference={this} />
              {this.renderUploadService()}
              {this.renderErrorReport()}
            </>
          )}
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
          key={reference.getWidgetRenderKey('area')}
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
          {reference.view.type === '2d' && (
            <BookmarkWidget
              key={reference.getWidgetRenderKey('bookmark')}
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
          )}

          {/* MenuWidget with user_id */}
          <MenuWidget
            key={reference.getWidgetRenderKey('menu')}
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
            userServiceUrl={reference.state.userServiceUrl}
            userServiceType={reference.state.userServiceType}
            userServiceSelection={reference.state.userServiceSelection}
            userServiceFile={reference.state.userServiceFile}
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
  const [mapViewerInstanceRevision, setMapViewerInstanceRevision] = useState(0);
  const [initialViewMode, setInitialViewMode] = useState(null);

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

  const handleViewRebuild = useCallback((nextViewMode) => {
    setInitialViewMode(nextViewMode || null);
    setMapViewerInstanceRevision((prevRevision) => prevRevision + 1);
  }, []);

  return (
    <UserProvider>
      <UserStorageManager>
        <MapViewerStateMonitor onUserStateChange={handleUserStateChange}>
          <MapViewer
            {...props}
            key={`map-viewer-${mapViewerInstanceRevision}`}
            ref={mapViewerRef}
            initialUserState={initialUserState}
            initialViewMode={initialViewMode}
            requestViewRebuild={handleViewRebuild}
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
