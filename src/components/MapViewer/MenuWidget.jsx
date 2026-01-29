import ReactDOM from 'react-dom';
import React, { createRef } from 'react';
// import { FontAwesomeIcon } from '@eeacms/volto-clms-utils/components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { loadModules, loadCss } from 'esri-loader';
import useCartState from '@eeacms/volto-clms-utils/cart/useCartState';
import { Modal, Popup } from 'semantic-ui-react';
import AreaWidget from './AreaWidget';
import TimesliderWidget from './TimesliderWidget';

export const USER_SERVICES_KEY = 'user_services_session';

var WMSLayer,
  WMTSLayer,
  FeatureLayer,
  GeoJSONLayer,
  BaseTileLayer,
  esriRequest,
  Extent,
  MapImageLayer,
  projection,
  SpatialReference,
  WebMercatorUtils;

const popupSettings = {
  basic: true,
  inverted: true,
  size: 'mini',
  position: 'top center',
  style: {
    padding: '0.25rem 0.5rem',
    fontSize: '0.625rem',
  },
};

export const AddCartItem = ({
  cartData,
  mapViewer,
  props,
  download,
  areaData,
  dataset,
  handleOpenPopup,
  prepackage,
  uploadedFile,
}) => {
  const { addCartItem, isLoggedIn } = useCartState();

  const checkArea = (e) => {
    let check = document.querySelector('.area-panel input:checked')?.value;
    let fileUpload = sessionStorage.getItem('fileUploadLayer') ? true : false;
    let area = {};
    if (check === 'area' || fileUpload || check === 'coordinates') {
      let graphics = mapViewer.view.graphics;
      if (graphics.length === 0) {
        area = '';
      } else {
        area.type = 'polygon';
        area.value = [
          areaData?.origin?.x,
          areaData?.origin?.y,
          areaData?.end?.x,
          areaData?.end?.y,
        ];
      }
    } else {
      if (areaData) {
        area.type = 'nuts';
        if (areaData?.geometry?.type === 'polygon') {
          if (areaData?.attributes?.ISO_2DIGIT !== undefined) {
            area.value = areaData.attributes.ISO_2DIGIT;
          } else {
            area.value = areaData.attributes.NUTS_ID;
          }
        }
      } else {
        area = '';
      }
    }
    let data = checkCartData(cartData, area, dataset);
    addCartItem(data).then(() => {
      if (dataset?.IsTimeSeries) {
        let id = dataset?.DatasetId;
        let datasetElem = document.querySelector('[datasetid="' + id + '"]');
        let datasetInput = document.querySelector(
          '#active_' +
            datasetElem.querySelector('.map-menu-layer input:checked').id,
        );
        if (datasetInput) {
          datasetInput.removeAttribute('time-start');
          datasetInput.removeAttribute('time-end');
        }
      }
    });
  };
  const checkExtent = async (e) => {
    let target = e?.currentTarget;
    let intersection = false;
    let areaExtent = null;
    let check = document.querySelector('.area-panel input:checked')?.value;
    let fileUpload = sessionStorage.getItem('fileUploadLayer') ? true : false;
    let isMapServer = dataset?.ViewService?.toLowerCase().endsWith('/mapserver')
      ? true
      : false;
    const isCDSE =
      !!dataset?.ViewService &&
      ['/ogc/', '/cdse/'].some((s) =>
        dataset.ViewService.toLowerCase().includes(s),
      );
    if (check === 'area' || fileUpload || check === 'coordinates') {
      areaExtent = new Extent({
        xmin: Math.min(areaData?.end?.x, areaData?.origin?.x),
        xmax: Math.max(areaData?.end?.x, areaData?.origin?.x),
        ymin: Math.min(areaData?.end?.y, areaData?.origin?.y),
        ymax: Math.max(areaData?.end?.y, areaData?.origin?.y),
      });
    } else if (isMapServer) {
      areaExtent = new Extent({
        xmin: areaData?.geometry?.extent?.xmin,
        ymin: areaData?.geometry?.extent?.ymin,
        xmax: areaData?.geometry?.extent?.xmax,
        ymax: areaData?.geometry?.extent?.ymax,
      });
    } else {
      areaExtent = areaData?.geometry;
    }
    if (dataset?.DatasetTitle) {
      for (const id of Object.keys(props.layers)) {
        if (
          props.layers[id]?.DatasetTitle &&
          dataset.DatasetTitle === props.layers[id].DatasetTitle
        ) {
          let layerExtent = null;
          if (props.layers[id].fullExtent) {
            layerExtent = new Extent({
              xmin: props.layers[id].fullExtent.xmin,
              ymin: props.layers[id].fullExtent.ymin,
              xmax: props.layers[id].fullExtent.xmax,
              ymax: props.layers[id].fullExtent.ymax,
            });
          } else if (
            props.layers[id].fullExtents &&
            props.layers[id].fullExtents[0]
          ) {
            if (isCDSE) {
              let e0 = props.layers[id].fullExtents[0];
              let xmin = e0.xmin;
              let ymin = e0.ymin;
              let xmax = e0.xmax;
              let ymax = e0.ymax;
              for (let i = 1; i < props.layers[id].fullExtents.length; i++) {
                let ex = props.layers[id].fullExtents[i];
                if (!ex) continue;
                if (ex.xmin < xmin) xmin = ex.xmin;
                if (ex.ymin < ymin) ymin = ex.ymin;
                if (ex.xmax > xmax) xmax = ex.xmax;
                if (ex.ymax > ymax) ymax = ex.ymax;
              }
              layerExtent = new Extent({
                xmin: xmin,
                ymin: ymin,
                xmax: xmax,
                ymax: ymax,
                spatialReference:
                  e0.spatialReference || mapViewer?.view?.spatialReference,
              });
            } else {
              layerExtent = new Extent({
                xmin: props.layers[id].fullExtents[0].xmin,
                ymin: props.layers[id].fullExtents[0].ymin,
                xmax: props.layers[id].fullExtents[0].xmax,
                ymax: props.layers[id].fullExtents[0].ymax,
                spatialReference:
                  props.layers[id].fullExtents[0].spatialReference ||
                  mapViewer?.view?.spatialReference,
              });
            }
          } else {
            layerExtent = new Extent({
              xmin: -20037508.342789,
              ymin: -20037508.342789,
              xmax: 20037508.342789,
              ymax: 20037508.342789,
            });
          }
          if ((check === 'area' || fileUpload) && isMapServer) {
            const transformedLayerExtent = WebMercatorUtils.webMercatorToGeographic(
              layerExtent,
            );
            if (transformedLayerExtent.intersects(areaExtent)) {
              intersection = true;
            }
          } else if (layerExtent.intersects(areaExtent)) {
            intersection = true;
          }
        }
      }
      if (intersection) {
        try {
          checkArea();
        } catch (error) {}
      } else {
        const popupContainer = document.querySelector('.popup-container');
        if (popupContainer) {
          target.appendChild(popupContainer);
          handleOpenPopup();
        }
      }
    }
  };

  const checkCartData = (cartData, area, dataset) => {
    if (!dataset) {
      dataset = cartData?.[0]?.Products?.[0]?.Datasets?.[0];
    }
    if (!dataset) {
      return [];
    }
    let id = dataset.DatasetId;
    let datasetData = {
      id: id,
      UID: id,
      unique_id: `${id}-${new Date().getTime()}`,
      area: area,
    };
    let data = [datasetData];
    return data;
  };

  if (!dataset) {
    dataset = cartData?.[0]?.Products?.[0]?.Datasets?.[0];
  }

  const setDownloadTag = (val) => {
    if (!sessionStorage.key('downloadButtonClicked')) {
      sessionStorage.setItem('downloadButtonClicked', 'true');
    } else {
      sessionStorage.setItem('downloadButtonClicked', val);
    }
  };

  return (
    <>
      {download ? (
        <div className="map-download-buttons">
          <button
            id="map_download_add"
            className="ccl-button ccl-button-green"
            onClick={(e) => {
              if (!document.querySelector('.map-menu-layer input:checked')) {
                document.getElementById('products_label').click();
              } else {
                if (
                  areaData &&
                  document.querySelector('.drawRectanglePopup-block').style
                    .display === 'none'
                ) {
                  checkExtent(e);
                }
              }
            }}
          >
            Add to cart
          </button>
        </div>
      ) : isLoggedIn && !prepackage && uploadedFile ? ( // If isLoggedIn == true and user clicks download
        <Popup
          trigger={
            <span
              className={
                'map-menu-icon map-menu-icon-login' +
                (isLoggedIn ? ' logged' : '')
              }
              onClick={(e) => {
                if (
                  !document.getElementsByClassName(
                    'drawRectanglePopupWarning-text',
                  ).length > 0
                ) {
                  if (!areaData) {
                    if (
                      !mapViewer.activeWidget ||
                      !mapViewer.activeWidget.container.current.classList.contains(
                        'area-container',
                      )
                    ) {
                      document.querySelector('#map_area_button').click();
                    }
                  } else {
                    checkExtent(e);
                  }
                }
              }}
              onKeyDown={(e) => {
                /* if (!areaData) {
                  if (
                    !mapViewer.activeWidget ||
                    !mapViewer.activeWidget.container.current.classList.contains(
                      'area-container',
                    )
                  ) {
                    document.querySelector('#map_area_button').click();
                  }
                } else {
                  checkArea(e);
                } */
              }}
              tabIndex="0"
              role="button"
            >
              <FontAwesomeIcon
                className={
                  isLoggedIn &&
                  !document.getElementsByClassName(
                    'drawRectanglePopupWarning-text',
                  ).length > 0
                    ? ''
                    : ' locked'
                }
                icon={['fas', 'download']}
              />
              {!isLoggedIn ||
                (document.getElementsByClassName(
                  'drawRectanglePopupWarning-text',
                ).length > 0 && <FontAwesomeIcon icon={['fas', 'lock']} />)}
            </span>
          }
          content="Download"
          {...popupSettings}
        />
      ) : isLoggedIn && prepackage ? (
        <Popup
          trigger={
            <span
              className={
                'map-menu-icon map-menu-icon-login' +
                (dataset.HasPrepackagedFiles ? ' logged' : '')
              }
              onClick={(e) => {
                if (dataset.HasPrepackagedFiles) {
                  window.location = dataset.DatasetURL + '#download';
                }
              }}
              onKeyDown={(e) => {}}
              tabIndex="0"
              role="button"
            >
              <FontAwesomeIcon
                className={dataset.HasPrepackagedFiles ? '' : ' locked'}
                icon={['fas', 'download']}
              />
              {!dataset.HasPrepackagedFiles && (
                <FontAwesomeIcon icon={['fas', 'lock']} />
              )}
            </span>
          }
          content={
            dataset.HasPrepackagedFiles
              ? ' Download Prepackage'
              : 'No Prepackage available'
          }
          {...popupSettings}
        />
      ) : isLoggedIn && !uploadedFile ? (
        <Popup
          trigger={
            <span
              className={'map-menu-icon map-menu-icon-login'}
              onKeyDown={(e) => {}}
              tabIndex="0"
              role="button"
            >
              <FontAwesomeIcon
                className={' locked'}
                icon={['fas', 'download']}
              />
              <FontAwesomeIcon icon={['fas', 'lock']} />
            </span>
          }
          content={'Uploaded file has an error'}
          {...popupSettings}
        />
      ) : (
        // If isLoggedIn == false and user clicks download
        <Popup
          trigger={
            <span
              className={'map-menu-icon map-menu-icon-login'}
              onClick={() => {
                setDownloadTag(true);
                document.querySelector('.header-login-link').click();
              }}
              onKeyDown={() => {
                document.querySelector('.header-login-link').click();
              }}
              tabIndex="0"
              role="button"
            >
              <FontAwesomeIcon
                className={isLoggedIn ? '' : ' locked'}
                icon={['fas', 'download']}
              />
              {!isLoggedIn && <FontAwesomeIcon icon={['fas', 'lock']} />}
            </span>
          }
          content="Download"
          {...popupSettings}
        />
      )}
    </>
  );
};

export const TouchScreenPopup = () => {
  return (
    <>
      <div className="touchScreenPopup-block">
        <div className="touchScreenPopup-content">
          <div className="touchScreenPopup-text">
            <p>
              Some functionalities of the map viewer are not available for
              touchscreens. Functionality will be limited.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
class MenuWidget extends React.Component {
  /**
   * Creator of the Basemap widget class
   * @param {*} props
   */
  constructor(props) {
    super(props);
    //We create a reference to a DOM element to be mounted
    this.container = createRef();
    //Initially, we set the state of the component to
    //not be showing the basemap panel
    // call the props of the layers list (mapviewer.jsx)
    this.location = this.props.location;
    this.compCfg = this.props.conf;
    this.map = this.props.map;
    this.view = this.props.view;
    this.userID = this.props.userID;
    this.state = {
      showMapMenu: false,
      noServiceModal: false,
      setNoServiceModal: true,
      TMSLayerObj: null,
      draggedElements: [],
      popup: false,
      filterArrow: 'chevron-down',
      wmsUserServiceLayers: [],
      //wmsServiceUrl: this.props.wmsServiceUrl,
    };
    this.menuClass =
      'esri-icon-drag-horizontal esri-widget--button esri-widget esri-interactive';
    this.loadFirst = true;
    this.layers = this.props.layers;
    this.activeLayersJSON = {};
    this.layerGroups = {};
    this.xml = null;
    this.dataBBox = null;
    this.extentInitiated = false;
    this.extentCenter = null;
    this.hotspotLayerIds = [];
    this.getHotspotLayerIds = this.getHotspotLayerIds.bind(this);
    this.prepareHotspotLayers = this.prepareHotspotLayers.bind(this);
    this.activeLayersToHotspotData = this.activeLayersToHotspotData.bind(this);
    this.getLimitScale = this.getLimitScale.bind(this);
    this.handleOpenPopup = this.handleOpenPopup.bind(this);
    this.datasetFamilies = {};
    this.filtersApplied = false;
    this.filtersApplied = false;
    // add zoomend listener to map to show/hide zoom in message
    this.view.watch('stationary', (isStationary) => {
      let snowAndIceInSessionStorage = sessionStorage.getItem('snowAndIce');
      let node;
      if (this.view && this.view.center) {
        this.extentCenter = { x: this.view.center.x, y: this.view.center.y };
      }
      if (isStationary) {
        this.extentInitiated = false;
        let zoom = this.view.get('zoom');
        if (this.props.download) {
          node = document.querySelector('.zoom-in-message-dataset');
          if (node && node !== null) {
            node.style.display = zoom > 6 ? 'none' : 'block';
          }
        }
        if (!this.props.download && snowAndIceInSessionStorage === 'true') {
          node = document.getElementById('snow-and-ice-zoom-message');
          if (node && node !== null) {
            node.style.display = zoom > 6 ? 'none' : 'block';
          }
          let innerDropdown = document.getElementsByClassName(
            'map-product-checkbox',
          );
          let items = [...innerDropdown];
          let snowAndIce = null;
          for (let item of items) {
            let itemParentContainer = item.closest(
              '.map-menu-product-dropdown',
            );
            let productId = itemParentContainer.getAttribute('productid');
            if (productId === '8474c3b080fa42cc837f1d2338fcf096') {
              snowAndIce = item;
              break;
            }
          }
          if (
            snowAndIce === null ||
            snowAndIce === undefined ||
            snowAndIce.offsetParent === undefined ||
            snowAndIce.offsetParent === null ||
            snowAndIce.offsetParent.nextSibling === undefined ||
            snowAndIce.offsetParent.nextSibling === null
          )
            return;
          let checks = snowAndIce.offsetParent.nextSibling.children;
          let checksList = [...checks];
          if (checksList && checksList !== null) {
            checksList.forEach((check) => {
              if (check && check !== null) {
                if (check.querySelector('[type="checkbox"]').checked) {
                  let node = [
                    ...check.getElementsByClassName('zoom-in-message-dataset'),
                  ][0];
                  if (node && node !== null) {
                    node.style.display = zoom > 6 ? 'none' : 'block';
                  }
                }
              }
            });
          }
        }
        if (!this.visibleLayers) this.visibleLayers = {};
        this.handleRasterVectorLegend();
        this.setState({});
      }
    });

    this.activeLayersHandler = this.props.activeLayersHandler;
    this.getTaxonomy = this.props.getTaxonomy;
    this.tax = this.props.tax;
  }

  loader() {
    return loadModules([
      'esri/layers/WMSLayer',
      'esri/layers/WMTSLayer',
      'esri/layers/FeatureLayer',
      'esri/layers/GeoJSONLayer',
      'esri/layers/BaseTileLayer',
      'esri/request',
      'esri/geometry/Extent',
      'esri/layers/MapImageLayer',
      'esri/geometry/projection',
      'esri/geometry/SpatialReference',
      'esri/geometry/support/webMercatorUtils',
    ]).then(
      ([
        _WMSLayer,
        _WMTSLayer,
        _FeatureLayer,
        _GeoJSONLayer,
        _BaseTileLayer,
        _esriRequest,
        _Extent,
        _MapImageLayer,
        _projection,
        _SpatialReference,
        _WebMercatorUtils,
      ]) => {
        [
          WMSLayer,
          WMTSLayer,
          FeatureLayer,
          GeoJSONLayer,
          BaseTileLayer,
          esriRequest,
          Extent,
          MapImageLayer,
          projection,
          SpatialReference,
          WebMercatorUtils,
        ] = [
          _WMSLayer,
          _WMTSLayer,
          _FeatureLayer,
          _GeoJSONLayer,
          _BaseTileLayer,
          _esriRequest,
          _Extent,
          _MapImageLayer,
          _projection,
          _SpatialReference,
          _WebMercatorUtils,
        ];
      },
    );
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    if (nextProps.userServiceUrl !== prevState.userServiceUrl) {
      return {
        userServiceUrl: nextProps.userServiceUrl,
        userServiceType: nextProps.userServiceType,
      };
    }
    return null;
  }

  stringMatch(str1, str2) {
    if (!str1 || !str2) {
      return '';
    }
    let matchingPart = '';
    for (let i = 0; i < str1.length && i < str2.length; i++) {
      if (str1[i] === str2[i]) {
        matchingPart += str1[i];
      } else {
        break;
      }
    }
    return matchingPart;
  }

  prepareHotspotLayers() {
    this.compCfg.forEach((component) => {
      const hotspotProduct = component.Products.find(
        (product) => product.ProductId === 'd764e020485a402598551fa461bf1db2',
      );

      if (hotspotProduct !== undefined) {
        const datasetObj = {};
        hotspotProduct.Datasets.forEach((dataset) => {
          const layerObj = {};
          dataset.Layer.forEach((layer) => {
            if (layer && layer.LayerId) {
              layerObj[layer.LayerId] = layer;
            }
          });
          let key;
          if (dataset.Layer.length === 1) {
            key = dataset.Layer[0]?.LayerId;
          } else if (dataset.Layer.length === 2) {
            key = this.stringMatch(
              dataset.Layer[0]?.LayerId,
              dataset.Layer[1]?.LayerId,
            );
            if (key?.endsWith('_')) {
              key = key.slice(0, -1);
            }
          } else if (dataset.Layer.length > 2) {
            key = dataset.DatasetTitle?.toLowerCase()
              .split(' ')
              .join('_')
              .split('_(')[0]
              .split('_for')[0];
          }
          if (key) {
            datasetObj[key] = layerObj;
          }
        });
        return this.props.hotspotDataHandler(datasetObj);
      }
    });
  }

  // get custom TMS layer JSON
  getTMSLayersJSON() {
    let promises = []; // download JSON file calls
    this.compCfg.forEach((component) => {
      component.Products.forEach((product) => {
        product.Datasets.forEach((dataset) => {
          if (dataset.ViewService?.endsWith('file')) {
            let promise = fetch(dataset.ViewService, { mode: 'no-cors' })
              .then((response) => {
                if (!response.ok) {
                  return null;
                }
                return response.json();
              })
              .then((data) => {
                if (data) {
                  // fill dataset.Layer manually
                  dataset.Layer = data.Layers;
                }
              })
              .catch((error) => {});
            promises.push(promise);
          }
        });
      });
    });

    return Promise.all(promises);
  }

  closeNoServiceModal = (e) => {
    if (e) e.stopPropagation();
    this.setState({ noServiceModal: false });
  };

  showNoServiceModal = (e) => {
    if (e) e.stopPropagation();
    this.setState({ noServiceModal: true });
  };

  getCookie(name) {
    var dc = document.cookie;
    var prefix = name + '=';
    var begin = dc.indexOf('; ' + prefix);
    if (begin === -1) {
      begin = dc.indexOf(prefix);
      if (begin !== 0) return null;
    } else {
      begin += 2;
      var end = document.cookie.indexOf(';', begin);
      if (end === -1) {
        end = dc.length;
      }
    }
    return decodeURI(dc.substring(begin + prefix.length, end));
  }

  storePanelScroll() {
    let paneles = document.querySelector('#paneles');
    var selected_tab = document.querySelector('.tab-selected');

    if (!paneles || !selected_tab) {
      return;
    } else {
      let toc_panel_scrolls =
        JSON.parse(sessionStorage.getItem('toc_panel_scrolls')) ?? {};
      toc_panel_scrolls[selected_tab.id] = paneles.scrollTop;
      sessionStorage.setItem(
        'toc_panel_scrolls',
        JSON.stringify(toc_panel_scrolls),
      );
    }
  }

  restorePanelScroll() {
    let paneles = document.querySelector('#paneles');
    var selected_tab = document.querySelector('.tab-selected');

    if (!paneles || !selected_tab) {
      return;
    }

    let toc_panel_scrolls =
      JSON.parse(sessionStorage.getItem('toc_panel_scrolls')) ?? {};
    let scroll = toc_panel_scrolls[selected_tab.id];
    if (scroll !== undefined) {
      scroll = parseInt(scroll);
      paneles.scrollTop = scroll;
    }
  }

  /**
   * Method that will be invoked when the
   * button is clicked. It controls the open
   * and close actions of the component
   */
  openMenu() {
    if (this.state.showMapMenu) {
      const container = this.container.current;
      if (container) {
        const tabContainer = container.querySelector('#tabcontainer');
        const paneles = container.querySelector('#paneles');
        const esriWidgetButton = container.querySelector(
          '.esri-widget--button',
        );
        const timeSliderContainer = document.querySelector(
          '.timeslider-container',
        );
        const opacityPanel = document.querySelector('.opacity-panel');

        if (tabContainer) tabContainer.style.display = 'none';
        if (paneles) paneles.style.display = 'none';
        if (esriWidgetButton) {
          esriWidgetButton.classList.replace(
            'esri-icon-close',
            'esri-icon-drag-horizontal',
          );
        }
        if (timeSliderContainer && document.contains(timeSliderContainer)) {
          timeSliderContainer.style.display = 'none';
        }
        if (opacityPanel && opacityPanel.style.display === 'block') {
          this.closeOpacity();
        }
      }

      // By invoking the setState, we notify the state we want to reach
      // and ensure that the component is rendered again
      this.setState({ showMapMenu: false });
    } else {
      const container = this.container.current;
      if (container) {
        const tabContainer = container.querySelector('#tabcontainer');
        const paneles = container.querySelector('#paneles');
        const esriWidgetButton = container.querySelector(
          '.esri-widget--button',
        );
        const timeSliderContainer = document.querySelector(
          '.timeslider-container',
        );

        if (tabContainer) tabContainer.style.display = 'block';
        if (paneles) paneles.style.display = 'block';
        if (esriWidgetButton) {
          esriWidgetButton.classList.replace(
            'esri-icon-drag-horizontal',
            'esri-icon-close',
          );
        }
        if (timeSliderContainer && document.contains(timeSliderContainer)) {
          timeSliderContainer.style.display = 'block';
        }

        this.restorePanelScroll();
      }

      this.setState({ showMapMenu: true });
    }
    // if (this.loadFirst && this.container.current) {
    this.checkUrl();
    // this.loadFirst = false;
    this.zoomTooltips();
    // }

    let authToken = this.getAuthToken();
    let timeSliderTag = sessionStorage.getItem('timeSliderTag');
    let downloadTag = sessionStorage.getItem('downloadButtonClicked');
    let checkedLayers = JSON.parse(sessionStorage.getItem('checkedLayers'));

    // "Active on map" section and the time slider opened by default if user is logged in and timeSliderTag is true
    if (checkedLayers?.length && !this.props.download) {
      if (authToken && timeSliderTag) {
        for (const layerid of checkedLayers) {
          if (
            layerid &&
            this.layers[layerid]?.isTimeSeries &&
            !this.container.current
              .querySelector('.esri-widget')
              .classList.contains('esri-icon-drag-horizontal')
          ) {
            const event = new MouseEvent('click', {
              view: window,
              bubbles: true,
              cancelable: false,
            });
            const el = document.getElementById('download_label');
            if (el) {
              el.dispatchEvent(event);
            }
            break;
          }
        }
      } else if (authToken && downloadTag) {
        for (const layerid of checkedLayers) {
          if (
            layerid &&
            !this.layers[layerid]?.isTimeSeries &&
            !this.container.current
              .querySelector('.esri-widget')
              .classList.contains('esri-icon-drag-horizontal')
          ) {
            const event = new MouseEvent('click', {
              view: window,
              bubbles: true,
              cancelable: false,
            });
            const loginIcon = document.querySelector(
              '.map-menu-icon-login.logged',
            );
            if (loginIcon) {
              loginIcon.dispatchEvent(event);
            }
            break;
          } else if (
            layerid &&
            this.layers[layerid]?.isTimeSeries &&
            !this.container.current
              .querySelector('.esri-widget')
              .classList.contains('esri-icon-drag-horizontal')
          ) {
            const event = new MouseEvent('click', {
              view: window,
              bubbles: true,
              cancelable: false,
            });
            const el = document.getElementById('download_label');
            if (el) {
              el.dispatchEvent(event);
            }
            break;
          }
        }
      }
    }
    // CLMS-1389
    // "Active on map" section and the time slider opened by default if download and timeseries == true

    if (this.props.download && this.layers) {
      const layerid = Object.keys(this.layers)[0];
      if (
        layerid &&
        this.layers[layerid]?.isTimeSeries &&
        !this.container.current
          .querySelector('.esri-widget')
          .classList.contains('esri-icon-drag-horizontal')
      ) {
        const event = new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: false,
        });
        const el = document.getElementById('download_label');
        if (el) {
          el.dispatchEvent(event);
        }
      }
    }
  }

  /**
   * This method is executed after the render method is executed
   */
  async componentDidMount() {
    loadCss();
    await this.loader();
    await this.getTMSLayersJSON();
    if (!this.container.current) return;
    this.props.view.when(() => {
      this.prepareHotspotLayers();
      this.getHotspotLayerIds();
      this.props.view.ui.add(this.container.current, 'top-left');
    });
    if (this.props.download) {
      const areaPanelInput = document.querySelector(
        '.area-panel input:checked',
      );
      if (areaPanelInput) {
        areaPanelInput.click();
      }
      const mapProductCheckboxInput = document.querySelector(
        '.map-product-checkbox input',
      );
      if (mapProductCheckboxInput) {
        mapProductCheckboxInput.click();
        let dropdown = document.querySelector(
          '.map-menu-dropdown .ccl-expandable__button',
        );
        if (dropdown) {
          dropdown.setAttribute('aria-expanded', 'true');
          dropdown = document.querySelector(
            '.map-menu-product-dropdown .ccl-expandable__button',
          );
          if (dropdown) {
            dropdown.setAttribute('aria-expanded', 'true');
          }
        }
      }
    }
    this.openMenu();
    this.loadComponentFilters();
    this.expandDropdowns();
    // Add "My Services" component to the UI
    const myServicesComponent = this.createMyServicesComponent();
    const myServicesContainer = document.createElement('div');
    ReactDOM.render(myServicesComponent, myServicesContainer);
    this.container.current.appendChild(myServicesContainer.firstChild);
    this.loadUserServicesFromStorage();
    this.loadLayers();
    // this.loadOpacity();
    // this.loadVisibility();
    this.handleRasterVectorLegend();
    this.map.when(() => {
      this.map.layers.on('change', () => {
        if (!this.props.bookmarkData?.active) return;

        this.map.layers.removeAll();
        const layers =
          JSON.parse(sessionStorage.getItem('checkedLayers')) ?? [];
        for (const layer in this.layers) {
          const node = document.getElementById(layer);
          if (node) {
            if (layers.includes(layer)) {
              const index = layers.indexOf(layer);
              let visible;
              if (this.props.bookmarkData.position !== null) {
                let pos = this.props.bookmarkData.position;
                let visibleArray = this.props.bookmarkData.visible[pos];
                visible = String(visibleArray[index]) === 'true';
                if (this.layers[layer]) {
                  let opacityArray = this.props.bookmarkData.opacity[pos];
                  this.layers[layer].opacity = opacityArray[index];
                }
              }
              node.checked = true;
              this.toggleLayer(node);
              if (visible === false) {
                this.eyeLayer(node);
              }
            } else if (node.checked) {
              node.checked = false;
              this.toggleLayer(node);
            }
          }
        }
        const counter = layers.length - 1;
        layers.forEach((layer, index) => {
          const order = counter - index;
          const activeLayers = document.querySelectorAll('.active-layer');
          activeLayers.forEach((item) => {
            if (item.parentElement && layer === item.getAttribute('layer-id')) {
              item.parentElement.insertBefore(item, activeLayers[order]);
            }
          });
        });
        this.layersReorder();
        this.saveLayerOrder();
        const elementOpacities = document.querySelectorAll(
          '.active-layer-opacity',
        );
        const layerOpacities = JSON.parse(
          sessionStorage.getItem('layerOpacities'),
        );
        elementOpacities.forEach((element) => {
          const parentElement = element.parentElement?.parentElement;
          if (parentElement) {
            const id = parentElement.getAttribute('layer-id');
            element.dataset.opacity = layerOpacities[id]
              ? layerOpacities[id] * 100
              : 100;
          }
        });
        let bookmarkData = {
          ...(this.props.bookmarkData || {}),
          active: false,
          position: null,
        };
        this.props.bookmarkHandler(bookmarkData);
      });
    });
  }

  setSliderTag(val) {
    if (!sessionStorage.key('timeSliderTag'))
      sessionStorage.setItem('timeSliderTag', 'true');
    else {
      sessionStorage.setItem('timeSliderTag', val);
    }
  }

  getAuthToken() {
    let tokenResult;
    tokenResult = null;
    if (this.getCookie('auth_token')) {
      tokenResult = true;
    } else {
      tokenResult = false;
    }
    return tokenResult;
  }

  /**
   * Close opacity panel if user clicks outside
   */
  hideOnClickOutsideOpacity() {
    const isVisible = (elem) =>
      !!elem &&
      !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length);
    let element = document.querySelector('.opacity-panel');
    const outsideClickListener = (event) => {
      if (element && !element.contains(event.target) && isVisible(element)) {
        // or use: event.target.closest(selector) === null
        this.closeOpacity();
        removeClickListener();
      }
    };

    const removeClickListener = () => {
      document.removeEventListener('click', outsideClickListener);
    };

    document.addEventListener('click', outsideClickListener);
  }

  checkUrl() {
    let url = new URL(window.location.href);
    let product = url.searchParams.get('product');
    let dataset = url.searchParams.get('dataset');
    if (product || dataset) {
      // CLMS-1261 - clear any previously checked layers when navigating using 'view in the map viewer'
      let expandedDropdowns = sessionStorage.getItem('expandedDropdowns');
      let checkedLayers = sessionStorage.getItem('checkedLayers');
      if (expandedDropdowns) {
        sessionStorage.setItem('expandedDropdowns', JSON.stringify([]));
        const userKey = this.userID ? 'user_' + this.userID : 'user_anonymous';
        const existing = localStorage.getItem(userKey);
        let storeObj = {};
        if (existing) {
          try {
            storeObj = JSON.parse(existing) || {};
          } catch (e) {
            storeObj = {};
          }
        }
        storeObj.expandedDropdowns = [];
        localStorage.setItem(userKey, JSON.stringify(storeObj));
      }
      if (checkedLayers) {
        sessionStorage.setItem('checkedLayers', JSON.stringify([]));
        window.dispatchEvent(new Event('storage'));
      }
      let event = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: false,
      });
      let elem = product
        ? '[productid="' + product + '"]'
        : '[datasetid="' + dataset + '"]';
      let node = document.querySelector(elem + ' input');
      if (node) {
        node.dispatchEvent(event);
        let dropdown = node.closest('.map-menu-dropdown');
        if (dropdown) {
          let button = dropdown.querySelector('.ccl-expandable__button');
          if (button) {
            button.setAttribute('aria-expanded', 'true');
          }
        }
        //a comment to test develop branch
        let productDropdown = node.closest('.map-menu-product-dropdown');
        if (productDropdown) {
          let scrollPosition = productDropdown.offsetTop;
          if (dataset) {
            let familyDropdown = node.closest('.map-menu-family-dropdown');
            if (familyDropdown) {
              let button = familyDropdown.querySelector(
                '.ccl-expandable__button',
              );
              if (button) {
                button.setAttribute('aria-expanded', 'true');
              }
            }
            let datasetDropdown = node.closest('.map-menu-product-dropdown');
            if (datasetDropdown) {
              let button = datasetDropdown.querySelector(
                '.ccl-expandable__button',
              );
              if (button) {
                button.setAttribute('aria-expanded', 'true');
              }
            }
            if (familyDropdown) {
              scrollPosition = familyDropdown.offsetTop;
            }
            let mapMenu = node.closest('.map-menu-dataset-dropdown');
            if (mapMenu) {
              scrollPosition = mapMenu.offsetTop;
            }
          }
          setTimeout(() => {
            let panels = document.querySelector('div#paneles.panels');
            if (panels) {
              panels.scrollTop = scrollPosition;
            }
          }, 1000);
        }
      }
    }
  }

  zoomTooltips() {
    var buttons = document.querySelectorAll('.esri-zoom .esri-widget');
    const attributes = [
      {
        tooltip: 'Zoom in',
        direction: 'left',
        type: 'widget',
      },
      {
        tooltip: 'Zoom out',
        direction: 'left',
        type: 'widget',
      },
    ];
    buttons.forEach((element, index) => {
      if (element) {
        const title = element.getAttribute('title');
        if (title) {
          element.setAttribute('aria-label', title);
          element.removeAttribute('title');
        }
        const attrs = attributes[index];
        if (attrs) {
          Object.keys(attrs).forEach((attr) => {
            element.setAttribute(attr, attrs[attr]);
          });
        }
      }
    });
  }

  /**elem
   * Processes the JSON file containing layers info
   * @returns
   */
  metodprocessJSON() {
    if (!WMSLayer && !WMTSLayer && !FeatureLayer) return;
    var components = [];
    var index = 0;
    if (this.compCfg && Array.isArray(this.compCfg)) {
      for (var i in this.compCfg) {
        if (this.compCfg[i]) {
          components.push(this.metodProcessComponent(this.compCfg[i], index));
          index++;
        }
      }
    }

    // Add "My Services" component
    components.push(this.createMyServicesComponent());

    return components;
  }

  /**
   * Processes each component
   * @param {*} component
   * @param {*} compIndex
   * @returns
   */
  metodProcessComponent(component, compIndex) {
    var products = [];
    var index = 0;
    var inheritedIndexComponent = compIndex;
    var description =
      component.ComponentDescription &&
      component.ComponentDescription.length >= 300
        ? component.ComponentDescription.substr(0, 300) + '...'
        : component.ComponentDescription;

    if (component.Products && Array.isArray(component.Products)) {
      for (var i in component.Products) {
        if (component.Products[i] && component.Products[i].Datasets) {
          // CLMS-1544
          // dont show the product if all of its datasets has the auxiliary service as its ViewService URL
          //CLMS-1756
          //don´t show the product if MarkAsDownloadableNoServiceToVisualize is true
          // const isAuxiliary = (dataset) =>
          //   dataset.MarkAsDownloadableNoServiceToVisualize;
          // if (!component.Products[i].Datasets.every(isAuxiliary)) {
          products.push(
            this.metodProcessProduct(
              component.Products[i],
              index,
              inheritedIndexComponent,
            ),
          );
          index++;
          //}
        }
      }
    }
    let style = this.props.download ? { display: 'none' } : {};

    return (
      <div
        className="map-menu-dropdown"
        id={'component_' + inheritedIndexComponent}
        key={'a' + compIndex}
      >
        <div
          id={'dropdown_' + inheritedIndexComponent}
          className="ccl-expandable__button"
          aria-expanded="false"
          key={'b' + compIndex}
          onClick={this.toggleDropdownContent.bind(this)}
          onKeyDown={this.toggleDropdownContent.bind(this)}
          tabIndex="0"
          role="button"
          style={style}
        >
          <div className="dropdown-icon">
            <FontAwesomeIcon icon={['fas', 'caret-right']} />
          </div>
          {description ? (
            <Popup
              trigger={<span>{component.ComponentTitle}</span>}
              content={description}
              basic
              className="custom"
              style={{ transform: 'translateX(-0.5rem)' }}
            />
          ) : (
            <span>{component.ComponentTitle}</span>
          )}
        </div>
        <div className="map-menu-components-container">{products}</div>
      </div>
    );
  }

  /**
   * Processes each product (of each component)
   * @param {*} product
   * @param {*} prodIndex
   * @param {*} inheritedIndex
   * @returns
   */
  metodProcessProduct(product, prodIndex, inheritedIndex) {
    var dataset_def = [];
    var datasets = [];
    var families = [];
    this.DatasetFamilies = {};
    var index = 0;
    var inheritedIndexProduct = inheritedIndex + '_' + prodIndex;
    var checkProduct = 'map_product_' + inheritedIndexProduct;
    var description =
      product.ProductDescription && product.ProductDescription.length >= 300
        ? product.ProductDescription.substr(0, 300) + '...'
        : product.ProductDescription;

    if (product.Datasets && Array.isArray(product.Datasets)) {
      var familyIndex = 0;
      var firstChildAdded = false;
      for (
        let datasetIndex = 0;
        datasetIndex < product.Datasets.length;
        datasetIndex++
      ) {
        const dataset = product.Datasets[datasetIndex];

        if (dataset.FamilyTitle) {
          if (!this.DatasetFamilies[dataset.FamilyTitle]) {
            this.DatasetFamilies[dataset.FamilyTitle] = [];
          }
          this.DatasetFamilies[dataset.FamilyTitle].push(dataset);
        } else {
          if (this.filtersApplied) {
            const defcheckValue = document
              .querySelector('#' + checkProduct)
              ?.getAttribute('defcheck');
            if (defcheckValue) {
              dataset_def = defcheckValue
                .split(',')
                .filter((id) => id.trim() !== '');
            }
          } else if (
            dataset &&
            dataset.Default_active === true &&
            !firstChildAdded
          ) {
            var idDataset =
              'map_dataset_' + inheritedIndexProduct + '_' + index;
            dataset_def.push(idDataset);
            firstChildAdded = true;
          }

          if (dataset) {
            datasets.push(
              this.metodProcessDataset(
                dataset,
                index,
                inheritedIndexProduct,
                checkProduct,
              ),
            );
            index++;
          }
        }
      }

      Object.keys(this.DatasetFamilies).forEach((familyTitle) => {
        var inheritedIndexFamily = inheritedIndexProduct + '_' + familyIndex;
        var checkFamily = 'map_family_' + inheritedIndexFamily;
        var familyDatasets = [];
        var familyDatasetDef = [];

        this.DatasetFamilies[familyTitle].forEach((dataset) => {
          if (this.filtersApplied) {
            familyDatasetDef = document
              .querySelector('#' + checkFamily)
              ?.getAttribute('defcheck');
          } else if (dataset && dataset.Default_active === true) {
            var idDataset = 'map_dataset_' + inheritedIndexFamily + '_' + index;
            familyDatasetDef.push(idDataset);
          }
          familyDatasets.push(
            this.metodProcessDataset(
              dataset,
              index,
              inheritedIndexFamily,
              checkFamily,
            ),
          );
          index++;
        });

        if (familyDatasets.length > 0) {
          var firstFamilyDatasetId =
            'map_dataset_' +
            inheritedIndexFamily +
            '_' +
            (index - familyDatasets.length);

          if (!familyDatasetDef.length) {
            familyDatasetDef.push(firstFamilyDatasetId);
          }

          if (!firstChildAdded) {
            dataset_def.push(checkFamily);
            firstChildAdded = true;
          }
        }

        families.push(
          this.metodProcessFamily(
            familyTitle,
            familyDatasets,
            inheritedIndexFamily,
            checkFamily,
            checkProduct,
            familyDatasetDef,
          ),
        );

        familyIndex++;
      });
    }

    // Empty vector, add the first dataset
    if (!dataset_def.length) {
      if (families.length > 0) {
        var firstFamilyId = 'map_family_' + inheritedIndexProduct + '_0';
        dataset_def.push(firstFamilyId);
      } else {
        var idDatasetB = 'map_dataset_' + inheritedIndexProduct + '_0';
        dataset_def.push(idDatasetB);
      }
    }
    let style = this.props.download ? { display: 'none' } : {};

    return (
      <div
        className="map-menu-product-dropdown"
        id={'product_' + inheritedIndexProduct}
        productid={product.ProductId}
        key={'a' + prodIndex}
      >
        <fieldset className="ccl-fieldset" key={'b' + prodIndex}>
          <div
            id={'dropdown_' + inheritedIndexProduct}
            className="ccl-expandable__button"
            aria-expanded="false"
            key={'c' + prodIndex}
            onClick={this.toggleDropdownContent.bind(this)}
            onKeyDown={this.toggleDropdownContent.bind(this)}
            tabIndex="0"
            role="button"
            style={style}
          >
            <div className="dropdown-icon">
              <FontAwesomeIcon icon={['fas', 'caret-right']} />
            </div>
            <div
              className="ccl-form map-product-checkbox"
              key={'d' + prodIndex}
            >
              <div className="ccl-form-group" key={'e' + prodIndex}>
                <input
                  type="checkbox"
                  id={checkProduct}
                  name=""
                  value="name"
                  className="ccl-checkbox ccl-required ccl-form-check-input"
                  key={'h' + prodIndex}
                  defcheck={dataset_def}
                  onChange={(e) =>
                    this.toggleProduct(e.target.checked, checkProduct, e)
                  }
                ></input>
                <label
                  className="ccl-form-check-label"
                  htmlFor={checkProduct}
                  key={'f' + prodIndex}
                >
                  <legend className="ccl-form-legend">
                    {description ? (
                      <Popup
                        trigger={<span>{product.ProductTitle}</span>}
                        content={description}
                        basic
                        className="custom"
                        style={{ transform: 'translateX(-4rem)' }}
                      />
                    ) : (
                      <span>{product.ProductTitle}</span>
                    )}
                  </legend>
                </label>
              </div>
            </div>
          </div>
          <div
            className="ccl-form map-menu-products-container"
            id={'datasets_container_' + inheritedIndexProduct}
          >
            {families}
            {datasets}
          </div>
        </fieldset>
      </div>
    );
  }

  metodProcessFamily(
    familyTitle,
    familyDatasets,
    inheritedIndexFamily,
    checkFamily,
    checkProduct,
    familyDatasetDef,
  ) {
    var datasets = [];
    var familyId = familyTitle.replace(/\s+/g, '');
    var familyTitleName = '';

    this.tax.tree.forEach((element) => {
      element.children.forEach((element) => {
        if (element.key === familyTitle) {
          familyTitleName = element.title;
        }
      });
    });

    familyDatasets.forEach((dataset) => {
      datasets.push(dataset);
    });

    if (!familyDatasetDef.length && familyDatasets.length > 0) {
      var idDatasetB = 'map_dataset_' + inheritedIndexFamily + '_0';
      familyDatasetDef.push(idDatasetB);
    }

    let style = this.props.download ? { display: 'none' } : {};

    return (
      <div
        className="map-menu-family-dropdown"
        id={'family_' + inheritedIndexFamily}
        familyid={familyId}
        key={'a' + familyId}
      >
        <fieldset className="ccl-fieldset" key={'b' + familyId}>
          <div
            id={'dropdown_' + inheritedIndexFamily}
            className="ccl-expandable__button"
            aria-expanded="false"
            key={'c' + familyId}
            onClick={this.toggleDropdownContent.bind(this)}
            onKeyDown={this.toggleDropdownContent.bind(this)}
            tabIndex="0"
            role="button"
            style={style}
          >
            <div className="dropdown-icon">
              <FontAwesomeIcon icon={['fas', 'caret-right']} />
            </div>
            <div className="ccl-form map-product-checkbox" key={'d' + familyId}>
              <div className="ccl-form-group" key={'e' + familyId}>
                <input
                  type="checkbox"
                  id={checkFamily}
                  parentid={checkProduct}
                  name=""
                  value="name"
                  className="ccl-checkbox ccl-required ccl-form-check-input"
                  key={'h' + familyId}
                  defcheck={familyDatasetDef}
                  onChange={(e) =>
                    this.toggleFamily(e.target.checked, checkFamily, e)
                  }
                ></input>
                <label
                  className="ccl-form-check-label"
                  htmlFor={checkFamily}
                  key={'f' + familyId}
                >
                  <legend className="ccl-form-legend">
                    {<span>{familyTitleName}</span>}
                  </legend>
                </label>
              </div>
            </div>
          </div>
          <div
            className="ccl-form map-menu-family-container"
            id={'family_container_' + inheritedIndexFamily}
          >
            {datasets}
          </div>
        </fieldset>
      </div>
    );
  }

  /**
   * Method to uncheck Product checkbox if not all dataset are checked
   * @param {*} productid
   */
  updateCheckProduct(productid) {
    let datasetChecks = Array.from(
      document.querySelectorAll('[parentid="' + productid + '"]'),
    );
    let productCheck = document.querySelector('#' + productid);
    if (!productCheck) return;
    let trueCheck = datasetChecks.filter((elem) => elem.checked).length;
    let product = productCheck.closest('.map-menu-product-dropdown');
    if (!product) return;
    let productId = product.getAttribute('productid');
    productCheck.checked = trueCheck > 0;
    // let productCheckLabel = productCheck.labels[0].innerText;
    if (productId === '8474c3b080fa42cc837f1d2338fcf096') {
      sessionStorage.setItem('snowAndIce', true);
    } else {
      sessionStorage.setItem('snowAndIce', false);
    }
    if (productId === '333e4100b79045daa0ff16466ac83b7f') {
      sessionStorage.setItem('DynamicLandCover', true);
    } else {
      sessionStorage.setItem('DynamicLandCover', false);
    }
  }

  /**
   * Processes each dataset (for each product)
   * @param {*} dataset
   * @param {*} datIndex
   * @param {*} inheritedIndex
   * @param {*} checkProduct
   * @returns
   */
  metodProcessDataset(dataset, datIndex, inheritedIndex, checkProduct) {
    var layer_default = [];
    var layers = [];
    var index = 0;
    var inheritedIndexDataset = inheritedIndex + '_' + datIndex;
    var checkIndex = 'map_dataset_' + inheritedIndexDataset;
    let checkedLayers =
      JSON.parse(sessionStorage.getItem('checkedLayers')) || [];
    var description =
      dataset.DatasetDescription && dataset.DatasetDescription.length >= 300
        ? dataset.DatasetDescription.substr(0, 300) + '...'
        : dataset.DatasetDescription;
    let style = this.props.download
      ? { paddingLeft: dataset.HandlingLevel ? '0' : '1rem' }
      : {};
    if (dataset.HandlingLevel) {
      this.layerGroups[dataset.DatasetId] = [];
    }

    // TMS
    if (dataset.ViewService?.endsWith('file')) {
      let tmsLayerIndex = 0;

      dataset.Layer.forEach((layer, sublayerIndex) => {
        if (!layer.LayerId) {
          layer.LayerId = sublayerIndex;
        }

        let inheritedIndexLayer = inheritedIndexDataset + '_' + tmsLayerIndex;
        let checkboxId = layer.LayerId + '_' + inheritedIndexLayer;

        // add as default
        if (!layer_default.length) {
          layer_default.push(checkboxId);
        }
        //CHECK SESSION STORAGE for TMSlAYEROBJ, if not there, create it with TMSLayerObj{ layer: layer, checboxId: checkboxId, dataset: dataset }, and if it is there, replace it with the new one
        let TMSLayerObj = {
          layer: layer,
          checkboxId: checkboxId,
          dataset: dataset,
        };

        sessionStorage.setItem('TMSLayerObj', JSON.stringify(TMSLayerObj));

        // add each sublayer to this.layers
        this.processTMSLayer(layer, checkboxId, dataset);

        // build TMS Layer for TOC
        layers.push(
          <div
            className="ccl-form-group map-menu-layer"
            id={'layer_' + inheritedIndexLayer}
            key={'a' + tmsLayerIndex}
            data-timeseries={dataset.IsTimeSeries}
            style={style}
          >
            <input
              type="checkbox"
              id={checkboxId}
              parentid={checkIndex}
              layerid={layer.LayerId}
              name="layerCheckbox"
              value="name"
              className="ccl-checkbox ccl-required ccl-form-check-input"
              key={'c' + tmsLayerIndex}
              title={layer.Title}
              onChange={(e) => {
                this.toggleLayer(e.target);
              }}
            ></input>
            <label
              className="ccl-form-check-label"
              htmlFor={layer.LayerId + '_' + inheritedIndexLayer}
              key={'d' + tmsLayerIndex}
            >
              <span>{layer.Title}</span>
            </label>
          </div>,
        );
        tmsLayerIndex++;
      });
    } else {
      for (var i in dataset.Layer) {
        if (dataset.Layer[i].Default_active === true) {
          layer_default.push(
            dataset.Layer[i].LayerId + '_' + inheritedIndexDataset + '_' + i,
          );
        }
        if (dataset.HandlingLevel) {
          this.layerGroups[dataset.DatasetId].push(dataset.Layer[i].LayerId);
        }

        layers.push(
          this.metodProcessLayer(
            dataset.Layer[i],
            index,
            inheritedIndexDataset,
            dataset.ViewService,
            dataset.TimeSeriesService,
            checkIndex,
            dataset.IsTimeSeries,
            dataset.DatasetId,
            dataset.DatasetTitle,
            dataset.ProductId,
            dataset.dataset_download_information,
          ),
        );
        index++;
      }
    }

    if (!layer_default.length && dataset.Layer && dataset.Layer[0]) {
      layer_default.push(
        dataset.Layer[0].LayerId + '_' + inheritedIndexDataset + '_0',
      );
    }

    if (dataset.DatasetURL) {
      const originUrl = window.location.origin;
      let datasetUrl = new URL(dataset.DatasetURL);
      let datasetUrlPathname = datasetUrl.pathname;
      let newUrl = new URL(datasetUrlPathname, originUrl);

      dataset.DatasetURL = newUrl.toString();
    }

    return (
      <div
        className={
          dataset.FamilyTitle
            ? 'map-menu-dataset-dropdown map-menu-family-dataset-dropdown'
            : 'map-menu-dataset-dropdown'
        }
        id={'dataset_' + inheritedIndexDataset}
        datasetid={dataset.DatasetId}
        key={'a' + datIndex}
      >
        <fieldset className="ccl-fieldset" key={'b' + datIndex}>
          <div
            id={'dropdown_' + inheritedIndexDataset}
            className="ccl-expandable__button"
            aria-expanded="false"
            key={'c' + datIndex}
            onClick={
              dataset.HandlingLevel
                ? null
                : this.toggleDropdownContent.bind(this)
            }
            onKeyDown={
              dataset.HandlingLevel
                ? null
                : this.toggleDropdownContent.bind(this)
            }
            tabIndex="0"
            role="button"
            style={style}
          >
            <div
              className="dropdown-icon"
              style={dataset.HandlingLevel ? { visibility: 'hidden' } : {}}
            >
              <FontAwesomeIcon icon={['fas', 'caret-right']} />
            </div>
            <div className="ccl-form map-dataset-checkbox" key={'a' + datIndex}>
              <div className="ccl-form-group" key={'b' + datIndex}>
                <input
                  type="checkbox"
                  id={checkIndex}
                  parentid={checkProduct}
                  name=""
                  value="name"
                  title={dataset.DatasetTitle}
                  defcheck={layer_default}
                  className="ccl-checkbox ccl-required ccl-form-check-input"
                  key={'c' + datIndex}
                  onChange={(e) => {
                    this.toggleDataset(e.target.checked, checkIndex, e.target);
                  }}
                ></input>
                <label
                  className="ccl-form-check-label"
                  htmlFor={checkIndex}
                  key={'d' + datIndex}
                >
                  <legend className="ccl-form-legend">
                    {description ? (
                      <Popup
                        trigger={
                          dataset.Message && dataset.Message !== '' ? (
                            <div className="zoom-in-message-container">
                              <span>{dataset.DatasetTitle}</span>
                              <div className="zoom-in-message zoom-in-message-dataset">
                                {dataset.Message}
                              </div>
                            </div>
                          ) : (
                            <span>{dataset.DatasetTitle}</span>
                          )
                        }
                        content={description}
                        basic
                        className="custom"
                        style={{ transform: 'translateX(-4rem)' }}
                      />
                    ) : dataset.Message && dataset.Message !== '' ? (
                      <div className="zoom-in-message-container">
                        <span>{dataset.DatasetTitle}</span>
                        <div className="zoom-in-message zoom-in-message-dataset">
                          {dataset.Message}
                        </div>
                      </div>
                    ) : (
                      <span>{dataset.DatasetTitle}</span>
                    )}
                  </legend>
                </label>

                <div className="map-menu-icons">
                  {!this.props.download && dataset.IsTimeSeries && (
                    <Popup
                      trigger={
                        <span
                          className="map-menu-icon"
                          onClick={() =>
                            this.checkTimeLayer(dataset, checkedLayers)
                          }
                          onKeyDown={() =>
                            this.checkTimeLayer(dataset, checkedLayers)
                          }
                          tabIndex="0"
                          role="button"
                        >
                          <FontAwesomeIcon icon={['far', 'clock']} />
                        </span>
                      }
                      content={'Show time slider'}
                      {...popupSettings}
                    />
                  )}
                  {!this.props.download && (
                    <a
                      href={dataset.DatasetURL}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <Popup
                        trigger={
                          <span className="map-menu-icon">
                            <FontAwesomeIcon icon={['fa', 'info-circle']} />
                          </span>
                        }
                        content="Info"
                        {...popupSettings}
                      />
                    </a>
                  )}

                  {!this.props.download &&
                  dataset.Downloadable &&
                  document.getElementById(checkIndex) &&
                  document.getElementById(checkIndex).checked ? (
                    <AddCartItem
                      cartData={this.compCfg}
                      props={this.props}
                      mapViewer={this.props.mapViewer}
                      download={this.props.download}
                      areaData={this.props.area}
                      dataset={dataset}
                      handleOpenPopup={this.handleOpenPopup}
                      prepackage={this.props.prepackageChecked}
                      uploadedFile={this.props.uploadedFile}
                    />
                  ) : (
                    <span
                      className={'map-menu-icon map-menu-icon-login'}
                      style={{ visibility: 'hidden' }}
                    >
                      <FontAwesomeIcon icon={['fas', 'download']} />
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div
            className="ccl-form map-menu-layers-container"
            id={'layer_container_' + dataset.DatasetId}
          >
            {layers}
          </div>
        </fieldset>
      </div>
    );
  }

  /**
   * Method to uncheck dataset checkbox if not all layers are checked
   * @param {*} id parentId (id del dataset)
   */

  updateCheckDataset(id) {
    let datasetCheck = document.querySelector('#' + id);
    if (!datasetCheck) return;

    let layerChecks = Array.from(
      document.querySelectorAll('[parentid="' + id + '"]'),
    );

    let trueChecks = layerChecks.filter((elem) => elem.checked).length;
    datasetCheck.checked = trueChecks > 0;

    let parentId = datasetCheck.getAttribute('parentid');
    if (parentId) {
      if (parentId.includes('map_family')) {
        this.updateCheckFamily(parentId);
      } else {
        this.updateCheckProduct(parentId);
      }
    }
  }

  updateCheckFamily(id) {
    let familyCheck = document.querySelector('#' + id);
    if (!familyCheck) return;

    let layerChecks = Array.from(
      document.querySelectorAll('[parentid="' + id + '"]'),
    );

    let trueChecks = layerChecks.filter((elem) => elem.checked).length;
    familyCheck.checked = trueChecks > 0;

    let parentId = familyCheck.getAttribute('parentid');
    if (parentId) {
      this.updateCheckProduct(parentId);
    }
  }

  /**
   * Processes each layer (of each dataset)
   * @param {*} layer
   * @param {*} layerIndex
   * @param {*} inheritedIndex
   * @param {*} urlWMS
   * @param {*} parentIndex
   * @returns
   */
  metodProcessLayer(
    layer,
    layerIndex,
    inheritedIndex,
    viewService,
    featureInfoUrl,
    parentIndex,
    isTimeSeries,
    DatasetId,
    DatasetTitle,
    ProductId,
    dataset_download_information,
  ) {
    //For Legend request
    const legendRequest =
      'request=GetLegendGraphic&version=1.0.0&format=image/png&layer=';
    //For each layer
    let inheritedIndexLayer = inheritedIndex + '_' + layerIndex;
    let style = this.props.download ? { paddingLeft: '4rem' } : {};
    //Add sublayers and popup enabled for layers
    if (
      !this.layers.hasOwnProperty(layer.LayerId + '_' + inheritedIndexLayer)
    ) {
      if (viewService?.toLowerCase().endsWith('mapserver')) {
        this.layers[
          layer.LayerId + '_' + inheritedIndexLayer
        ] = new MapImageLayer({
          url: viewService,
          title: layer.Title,
          DatasetId: DatasetId,
          DatasetTitle: DatasetTitle,
          ProductId: ProductId,
          LayerTitle: layer.Title,
        });
        //iterate sublayers fetching all sublayer data
      } else if (viewService?.toLowerCase().includes('wms')) {
        viewService = viewService?.includes('?')
          ? viewService + '&'
          : viewService + '?';
        this.layers[layer.LayerId + '_' + inheritedIndexLayer] = new WMSLayer({
          url: viewService,
          featureInfoFormat: 'text/html',
          featureInfoUrl: viewService,
          title: '',
          legendEnabled: true,
          sublayers: [
            {
              name: layer.LayerId,
              title: layer.Title,
              popupEnabled: true,
              queryable: true,
              visible: true,
              legendEnabled: true,
              legendUrl: layer.StaticImageLegend
                ? layer.StaticImageLegend
                : viewService + legendRequest + layer.LayerId,
              featureInfoUrl: featureInfoUrl,
            },
          ],
          isTimeSeries: isTimeSeries,
          fields: layer.Fields,
          DatasetId: DatasetId,
          DatasetTitle: DatasetTitle,
          ProductId: ProductId,
          ViewService: viewService,
        });
      } else if (viewService?.toLowerCase().includes('wmts')) {
        this.layers[layer.LayerId + '_' + inheritedIndexLayer] = new WMTSLayer({
          url: viewService?.includes('?')
            ? viewService + '&'
            : viewService + '?',
          //id: layer.LayerId,
          title: '',
          _wmtsTitle: layer.Title, // CLMS-1105
          activeLayer: {
            id: layer.LayerId,
            title: layer.Title,
            featureInfoUrl: featureInfoUrl,
          },
          isTimeSeries: isTimeSeries,
          fields: layer.Fields,
          DatasetId: DatasetId,
          DatasetTitle: DatasetTitle,
          ProductId: ProductId,
          ViewService: viewService,
          StaticImageLegend: layer.StaticImageLegend,
          LayerTitle: layer.Title,
          DatasetDownloadInformation: dataset_download_information || {},
          customLayerParameters: {
            SHOWLOGO: false,
          },
        });
      } else {
        this.layers[
          layer.LayerId + '_' + inheritedIndexLayer
        ] = new FeatureLayer({
          url:
            viewService +
            (viewService?.endsWith('/') ? '' : '/') +
            layer.LayerId,
          id: layer.LayerId,
          title: layer.Title,
          featureInfoUrl: featureInfoUrl,
          popupEnabled: true,
          isTimeSeries: isTimeSeries,
          fields: layer.Fields,
          DatasetId: DatasetId,
          DatasetTitle: DatasetTitle,
          ProductId: ProductId,
          ViewService: viewService,
        });
      }
    }
    // const isCDSE = !!this.url && this.url.toLowerCase().includes('/ogc/');
    // if (isCDSE) {
    //   this.layers[
    //     layer.LayerId + '_' + inheritedIndexLayer
    //   ].datasetDownloadInformation = dataset_download_information || {};
    //   this.layers[
    //     layer.LayerId + '_' + inheritedIndexLayer
    //   ].customLayerParameters = {
    //     SHOWLOGO: false,
    //   };
    // }
    return (
      <div
        className="ccl-form-group map-menu-layer"
        id={'layer_' + inheritedIndexLayer}
        key={'a' + layerIndex}
        data-timeseries={isTimeSeries}
        style={style}
      >
        <input
          type="checkbox"
          id={layer.LayerId + '_' + inheritedIndexLayer}
          parentid={parentIndex}
          layerid={layer.LayerId}
          name="layerCheckbox"
          value="name"
          className="ccl-checkbox ccl-required ccl-form-check-input"
          key={'c' + layerIndex}
          title={layer.Title}
          onChange={(e) => {
            this.toggleLayer(e.target);
          }}
        ></input>
        <label
          className="ccl-form-check-label"
          htmlFor={layer.LayerId + '_' + inheritedIndexLayer}
          key={'d' + layerIndex}
        >
          <span>{layer.Title}</span>
        </label>
      </div>
    );
  }

  /**
   * adds a custom TMS layer to this.layers array
   * @param {*} checkboxId Is the layers checkbox ID
   */
  processTMSLayer(layer, checkboxId, dataset) {
    let selectedUrl;
    let zoom = this.view.get('zoom');
    if (layer.LayerUrl && Object.keys(layer.LayerUrl).length > 0) {
      selectedUrl =
        zoom < 10 ? layer.LayerUrl['longZoom'] : layer.LayerUrl['shortZoom'];
    } else {
      selectedUrl = layer.LayerUrl;
    }

    const CustomTileLayer = BaseTileLayer.createSubclass({
      properties: {
        urlTemplate: null,
        tms: false,
        tint: {
          value: null,
        },
      },

      // generate the tile url for a given level, row and column
      getTileUrl: function (level, row, col) {
        if (!selectedUrl) return '';
        return selectedUrl
          .replace('{z}', level)
          .replace('{x}', col)
          .replace('{y}', row);
      },

      // This method fetches tiles for the specified level and size.
      // Override this method to process the data returned from the server.
      fetchTile: function (level, row, col, options) {
        if (!selectedUrl) return Promise.resolve(null);
        if (this.tms) {
          var rowmax = 1 << level; // LEVEL 1 * (2 ** 1) = 1 * (2) = 2   ;   LEVEL 2 * (2 ** 2) = 1 * (4) = 4 ; LEVEL 3 * (2 ** 3) = 1 * (8) = 8 . . .
          row = zoom < 10 ? rowmax - row - 1 : row; // Invert Y axis
        }

        const url = this.getTileUrl(level, row, col);
        // request for tiles based on the generated url
        // the signal option ensures that obsolete requests are aborted
        return esriRequest(url, {
          responseType: 'image',
          signal: options && options.signal,
        }).then(
          function (response) {
            // when esri request resolves successfully
            // get the image from the response
            const image = response.data;
            const width = this.tileInfo.size[0];
            const height = this.tileInfo.size[0];
            // create a canvas with 2D rendering context
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            //canvas
            canvas.width = width;
            canvas.height = height;

            // Draw the blended image onto the canvas.
            context.drawImage(image, 0, 0, width, height);

            return canvas;
          }.bind(this),
        );
      },
    });
    // *******************************************************
    // end of Custom tile layer class code
    // *******************************************************
    let customTileLayer = this.getGlobalDynamicLandCoverUrl(
      CustomTileLayer,
      checkboxId,
      layer,
      dataset,
      selectedUrl,
    );
    if (customTileLayer === null || customTileLayer === undefined) return;
    if (this.layers[checkboxId] && this.activeLayersJSON[checkboxId]) {
      if (customTileLayer.urlTemplate !== this.layers[checkboxId].urlTemplate) {
        this.map.remove(this.layers[checkboxId]);
        this.layers[checkboxId] = customTileLayer;
        this.map.add(this.layers[checkboxId]);
      }
    } else {
      this.layers[checkboxId] = customTileLayer;
    }
  }

  createMyServicesComponent() {
    let dropdowns = document.querySelectorAll('.map-menu-dropdown');
    let i = dropdowns.length === 0 ? 0 : dropdowns.length - 1;
    let componentId = `component_${i}`;
    let dropdownId = `dropdown_${i}`;

    // Create "My Services" component from the start and set its display to none
    let myServicesStyle =
      this.state.wmsUserServiceLayers.length > 0 ? {} : { display: 'none' };
    return (
      <div
        className="map-menu-dropdown"
        id={componentId}
        key="a5"
        style={myServicesStyle}
      >
        <div
          id={dropdownId}
          className="ccl-expandable__button"
          aria-expanded="false"
          onClick={this.toggleDropdownContent.bind(this)}
          onKeyDown={this.toggleDropdownContent.bind(this)}
          tabIndex="0"
          role="button"
        >
          <div className="dropdown-icon">
            <FontAwesomeIcon icon={['fas', 'caret-right']} />
          </div>
          {<span>{'My Service'}</span>}
        </div>
        <div className="map-menu-components-container" id="map-menu-services" />
      </div>
    );
  }

  stripProtocol(url) {
    return (url || '').replace(/^https?:\/\//i, '');
  }

  getProxyBase() {
    return 'https://clmsdemo.devel6cph.eea.europa.eu/ogcproxy/';
  }

  buildProxiedUrl(url) {
    if (!url) return url;
    const hasProxy = /\/ogcproxy\//i.test(url);
    return hasProxy ? url : this.getProxyBase() + this.stripProtocol(url);
  }

  parseWMSLayers(xml) {
    let doc = xml;
    try {
      if (typeof xml === 'string') {
        const parser = new DOMParser();
        doc = parser.parseFromString(xml, 'text/xml');
      }
      const layers = [];
      const layerEls = doc.querySelectorAll('Layer, layer');
      layerEls.forEach((el) => {
        const nameEl =
          el.querySelector('Name') ||
          el.querySelector('name') ||
          el.querySelector('wms\\:Name');
        const titleEl =
          el.querySelector('Title') ||
          el.querySelector('title') ||
          el.querySelector('wms\\:Title');
        const name = nameEl ? (nameEl.textContent || '').trim() : null;
        const title = titleEl ? (titleEl.textContent || '').trim() : null;
        if (name) {
          layers.push({ name: name, title: title });
        }
      });
      return layers;
    } catch (e) {
      return [];
    }
  }

  parseWMTSLayers(xml) {
    let doc = xml;
    try {
      if (typeof xml === 'string') {
        const parser = new DOMParser();
        doc = parser.parseFromString(xml, 'text/xml');
      }
      const layers = [];
      const layerEls = doc.querySelectorAll('Layer, layer');
      layerEls.forEach((el) => {
        const idEl =
          el.querySelector('Identifier') ||
          el.querySelector('identifier') ||
          el.querySelector('ows\\:Identifier');
        const titleEl =
          el.querySelector('Title') ||
          el.querySelector('title') ||
          el.querySelector('ows\\:Title');
        const id = idEl ? (idEl.textContent || '').trim() : null;
        const title = titleEl ? (titleEl.textContent || '').trim() : null;
        if (id) {
          layers.push({ id: id, title: title });
        }
      });
      return layers;
    } catch (e) {
      return [];
    }
  }

  async handleNewMapServiceLayer(viewService, serviceType, serviceSelection) {
    let resourceLayers = [];
    const proxiedUrl = this.buildProxiedUrl(viewService);
    try {
      const rawUrl = (proxiedUrl || '').trim();
      const baseUrl = rawUrl.split('?')[0];
      const isWFS =
        serviceType === 'WFS' ||
        /service=WFS/i.test(rawUrl) ||
        /\/wfs(\b|\/)/i.test(baseUrl) ||
        /\/(ows|ogc)(\b|\/)/i.test(baseUrl);

      if (serviceType === 'WMTS') {
        await this.getCapabilities(viewService, 'WMTS');
        const wmtsLayers = this.parseWMTSLayers(this.xml);
        const active = wmtsLayers && wmtsLayers.length ? wmtsLayers[0] : null;
        resourceLayers = [
          new WMTSLayer({
            url: rawUrl,
            title: active && active.title ? active.title : '',
            activeLayer: active
              ? { id: active.id, title: active.title || active.id }
              : undefined,
            ViewService: rawUrl,
          }),
        ];
      } else if (isWFS) {
        resourceLayers = Object.entries(serviceSelection || {})
          .map(([name, title]) => {
            if (!name) return null;
            const params = new URLSearchParams({
              service: 'WFS',
              request: 'GetFeature',
              version: '2.0.0',
              typeName: name,
              outputFormat: 'application/json',
              srsName: 'EPSG:4326',
            }).toString();
            const wfsUrl = baseUrl + '?' + params;

            const id = (name || baseUrl).toUpperCase().replace(/[: ]/g, '_');
            const layer = new GeoJSONLayer({
              url: wfsUrl,
              id: id,
              title: title || name,
            });
            layer.LayerId = id;
            layer.ViewService = baseUrl;
            layer.name = name;
            return layer;
          })
          .filter(Boolean);
      } else {
        await this.getCapabilities(viewService, 'WMS');
        const wmsLayers = this.parseWMSLayers(this.xml);
        const legendRequest =
          'request=GetLegendGraphic&version=1.0.0&format=image/png&layer=';
        const sep = rawUrl.includes('?') ? '&' : '?';
        const sublayers = (wmsLayers || []).map((l) => ({
          name: l.name,
          title: l.title || l.name,
          popupEnabled: true,
          queryable: true,
          visible: true,
          legendEnabled: true,
          legendUrl: rawUrl + sep + legendRequest + l.name,
          featureInfoUrl: rawUrl,
        }));
        resourceLayers = [
          new WMSLayer({
            url: rawUrl,
            featureInfoFormat: 'text/html',
            featureInfoUrl: rawUrl,
            title: '',
            legendEnabled: true,
            sublayers: sublayers,
            ViewService: rawUrl,
          }),
        ];
      }
    } catch (error) {
      this.props.uploadFileErrorHandler();
      return;
    }

    for (const resourceLayer of resourceLayers) {
      const isDuplicate = this.state.wmsUserServiceLayers.some(
        (layer) =>
          layer.id === resourceLayer.id ||
          layer.LayerId === resourceLayer.LayerId,
      );
      if (isDuplicate) {
        continue;
      }

      try {
        if (typeof resourceLayer.load === 'function' && serviceType === 'WFS') {
          try {
            await resourceLayer.load();
          } catch (e) {}
        }
        if (serviceType === 'WMS' || serviceType === 'WMTS') {
          const forced = (proxiedUrl || '').trim();
          if (forced) {
            if (typeof resourceLayer.url === 'string') {
              resourceLayer.url = forced;
            }
            if (resourceLayer.featureInfoUrl) {
              resourceLayer.featureInfoUrl = forced;
            }
            resourceLayer.ViewService = forced;
          }
        }
        if (!resourceLayer.LayerId) {
          const computedId = resourceLayer.title
            ? resourceLayer.title.toUpperCase().replace(/ /g, '_')
            : resourceLayer.id || viewService;
          resourceLayer.LayerId = computedId;
          resourceLayer.id = computedId;
        }
        if (!resourceLayer.ViewService) {
          resourceLayer.ViewService = (viewService || '').trim();
        }

        const key = resourceLayer.LayerId;
        if (!this.layers[key]) {
          this.layers[key] = resourceLayer;
        }

        this.saveCheckedLayer(key);

        this.setState((prevState) => {
          const updatedLayers = [
            ...prevState.wmsUserServiceLayers,
            this.layers[key],
          ];
          this.saveUserServicesToStorage(updatedLayers);
          return { wmsUserServiceLayers: updatedLayers };
        });

        this.props.onServiceChange();
      } catch (error) {
        this.props.uploadFileErrorHandler();
        return;
      }
    }
  }

  createUserServices(serviceLayers) {
    const fieldset = document.getElementById('map-menu-services');
    if (!fieldset) return;

    // Create an array of all layer elements
    const layerElements = serviceLayers.map((layer, index) => {
      const { LayerId, title, description } = layer;
      const parentIndex = this.layers[layer.id];
      const checkboxId = LayerId;

      return (
        <div className="map-menu-dataset-dropdown" id={'my-service-' + LayerId}>
          <fieldset className="ccl-fieldset">
            <div className="ccl-expandable__button" aria-expanded="false">
              <div className="dropdown-icon">
                <div className="ccl-form map-dataset-checkbox">
                  <div
                    className="ccl-form-group map-menu-service"
                    key={`service_layer_${LayerId}`}
                  >
                    <input
                      type="checkbox"
                      id={checkboxId}
                      parentid={parentIndex}
                      layerid={LayerId}
                      name="layerCheckbox"
                      value="name"
                      className="ccl-checkbox ccl-required ccl-form-check-input"
                      title={layer.title}
                      onChange={(e) => {
                        this.toggleLayer(e.target);
                      }}
                    />
                    <label
                      className="ccl-form-check-label"
                      htmlFor={checkboxId}
                    >
                      <legend className="ccl-form-legend">
                        {description ? (
                          <Popup
                            trigger={<span>{title}</span>}
                            content={description}
                            basic
                            className="custom"
                            style={{ transform: 'translateX(-4rem)' }}
                          />
                        ) : (
                          <span>{title || `Layer ${index + 1}`}</span>
                        )}
                      </legend>
                    </label>
                    <span
                      className="map-menu-icon map-menu-service-icon"
                      onClick={() => this.deleteServiceLayer(LayerId)}
                      onKeyDown={() => this.deleteServiceLayer(LayerId)}
                      tabIndex="0"
                      role="button"
                    >
                      <FontAwesomeIcon icon={['fas', 'trash']} />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </fieldset>
        </div>
      );
    });

    // Render all layers at once to avoid overwriting previous layers
    ReactDOM.render(layerElements, fieldset);
  }

  deleteServiceLayer(elemId) {
    // Remove the layer from the map
    const node = document.getElementById(elemId);
    if (node) {
      node.checked = false;
      this.toggleLayer(node);
    }

    // Delete from layers object
    if (this.layers[elemId]) delete this.layers[elemId];

    // Remove from ArcGIS map
    let removeLayer = this.props.map.findLayerById(elemId) || null;
    if (removeLayer) {
      removeLayer.clear();
      removeLayer.destroy();
      this.props.map.remove(removeLayer);
      removeLayer = null;
    }

    this.props.onServiceChange();

    this.setState((prevState) => {
      const layerExists = prevState.wmsUserServiceLayers.some(
        (layer) => layer.LayerId === elemId,
      );

      if (layerExists) {
        const newWmsUserServiceLayers = prevState.wmsUserServiceLayers.filter(
          (layer) => layer.LayerId !== elemId,
        );
        if (this.userID && this.userID !== null) {
          this.saveUserServicesToStorage(newWmsUserServiceLayers);
        }
        return { wmsUserServiceLayers: newWmsUserServiceLayers };
      }
      return null;
    });
  }

  saveUserServicesToStorage(layers) {
    if (this.userID === null) return;

    try {
      const layersToSave = layers.map((layer) => {
        // First, see if this layer exists in previous saved services to retain checked state
        const checkedLayers =
          JSON.parse(sessionStorage.getItem('checkedLayers')) || [];
        const isChecked = checkedLayers.includes(layer.LayerId);

        // Create a simplified object for storage
        return {
          url: layer.url,
          featureInfoFormat: layer.featureInfoFormat,
          featureInfoUrl: layer.featureInfoUrl,
          title: layer.title,
          legendEnabled: layer.legendEnabled,
          sublayers: layer.sublayers?.items?.map((sublayer) => ({
            index: sublayer.index,
            name: sublayer.name,
            title: sublayer.title,
            popupEnabled: sublayer.popupEnabled,
            queryable: sublayer.queryable,
            visible: sublayer.visible,
            legendEnabled: sublayer.legendEnabled,
            legendUrl: sublayer.legendUrl,
            featureInfoUrl: sublayer.featureInfoUrl,
          })),
          ViewService: layer.ViewService,
          LayerId: layer.LayerId,
          visibility: layer.visible !== false,
          opacity: layer.opacity || 1,
          checked: isChecked || layer.checked || false,
        };
      });

      localStorage.setItem(
        USER_SERVICES_KEY + '_' + this.userID,
        JSON.stringify(layersToSave),
      );
    } catch (error) {}
  }

  async loadUserServicesFromStorage() {
    if (this.userID !== null) {
      try {
        const savedServices = JSON.parse(
          localStorage.getItem(USER_SERVICES_KEY + '_' + this.userID),
        );

        if (savedServices && Array.isArray(savedServices)) {
          // Process saved services to recreate actual layer objects
          const recreatedLayers = await Promise.all(
            savedServices.map(async (serviceData) => {
              try {
                // Create a new WMSLayer with the saved properties
                const newLayer = new WMSLayer(serviceData);

                // Set visibility property based on saved value
                newLayer.visible = serviceData.visibility !== false;

                // Remember the original checked state and visibility
                newLayer.checked = serviceData.checked;

                // Initialize visibleLayers for this layer
                if (!this.visibleLayers) this.visibleLayers = {};
                this.visibleLayers[serviceData.LayerId] =
                  serviceData.visibility !== false
                    ? ['fas', 'eye']
                    : ['fas', 'eye-slash'];

                // Add to this.layers
                this.layers[serviceData.LayerId] = newLayer;
                return newLayer;
              } catch (error) {
                return null;
              }
            }),
          );

          // Filter out any null values from failed recreations
          const validLayers = recreatedLayers.filter((layer) => layer !== null);

          // Update state with recreated layers
          this.setState({ wmsUserServiceLayers: validLayers }, () => {
            // For each layer, update the checkbox state based on localStorage
            setTimeout(() => {
              validLayers.forEach((layer) => {
                const node = document.getElementById(layer.LayerId);
                if (node) {
                  // Check the checkbox if it was saved as checked
                  if (layer.checked === true) {
                    // First add to checkedLayers in sessionStorage if not already there
                    const checkedLayers =
                      JSON.parse(sessionStorage.getItem('checkedLayers')) || [];

                    if (!checkedLayers.includes(layer.LayerId)) {
                      checkedLayers.unshift(layer.LayerId);
                      sessionStorage.setItem(
                        'checkedLayers',
                        JSON.stringify(checkedLayers),
                      );
                      window.dispatchEvent(new Event('storage'));
                    }

                    // Then check the checkbox and call toggleLayer with a flag to preserve visibility
                    node.checked = true;

                    // Custom addition to toggleLayer to bypass visibility override
                    this.toggleLayerWithoutVisibilityReset(node);
                  }
                }
              });
            }, 100);
          });
        }
      } catch (error) {}
    }
  }

  toggleLayerWithoutVisibilityReset(elem) {
    // Copy most of toggleLayer behavior but don't set this.visibleLayers[elem.id]
    if (this.layers[elem.id] === undefined) return;
    if (!this.visibleLayers) this.visibleLayers = {};
    if (!this.timeLayers) this.timeLayers = {};

    // Add the layer to the map
    this.layers[elem.id].visible = this.visibleLayers[elem.id][1] === 'eye';
    this.map.add(this.layers[elem.id]);

    // Continue with other toggleLayer operations
    this.timeLayers[elem.id] = ['far', 'clock'];

    // Add to active layers
    this.activeLayersJSON[elem.id] = this.addActiveLayer(
      elem,
      Object.keys(this.activeLayersJSON).length,
    );

    this.saveCheckedLayer(elem.id);

    // Reorder layers
    let nuts = this.map.layers.items.find((layer) => layer.title === 'nuts');
    if (nuts) {
      this.map.reorder(nuts, this.map.layers.items.length + 1);
    }

    this.layersReorder();
    this.checkInfoWidget();

    // Toggle custom legend
    if (
      this.layers[elem.id].ViewService?.toLowerCase().includes('wmts') ||
      this.layers[elem.id].ViewService?.toLowerCase().endsWith('file')
    ) {
      this.toggleCustomLegendItem(this.layers[elem.id]);
    }

    if (!this.props.download && this.props.hotspotData) {
      this.activeLayersToHotspotData(elem.id);
    }

    this.renderHotspot();
  }

  /**
   * Method to show/hide a layer. Update checkboxes from dataset and products
   * @param {*} elem Is the checkbox
   */

  checkForHotspots(elem, productContainerId) {
    if (!(elem.id.includes('all_present') || elem.id.includes('all_lcc')))
      return;
    let elemContainer = document
      .getElementById(elem.id)
      ?.closest('.ccl-form-group');
    if (!elemContainer) return;
    let nextElemSibling = elemContainer.nextElementSibling;
    let previousElemSibling = elemContainer.previousElementSibling;

    let siblingInput;
    let dataSetContainer = [];

    let productContainer = document.querySelector(
      '[productid="' + productContainerId + '"]',
    );
    if (!productContainer) return;

    let datasetArray = productContainer.querySelectorAll('[datasetid]');

    for (let i = 0; i < datasetArray.length; i++) {
      let dataset = datasetArray[i];
      let datasetChildrenSpans = dataset.querySelectorAll('span');

      for (let j = 0; j < datasetChildrenSpans.length; j++) {
        let datasetChildSpan = datasetChildrenSpans[j];
        let datasetChildSpanText = datasetChildSpan.innerText;
        if (
          datasetChildSpanText.includes('Dichotomous') ||
          datasetChildSpanText.includes('Modular')
        ) {
          dataSetContainer.push(dataset);
          j = datasetChildrenSpans.length + 1;
        }
      }
    }

    let dataSetContents;

    for (let k = 0; k < dataSetContainer.length; k++) {
      let elemContainerIdElement = elemContainer.closest('[datasetid]');
      if (!elemContainerIdElement) continue;
      if (
        dataSetContainer[k].getAttribute('datasetid') !==
        elemContainerIdElement.getAttribute('datasetid')
      ) {
        dataSetContents = dataSetContainer[k].querySelectorAll('[parentid]');
        break;
      }
    }
    let dataSetLayerInput;
    let currentDataSetLayer;
    let currentDataSetLayerSpan;
    let currentElemContainerSpan;

    if (dataSetContents) {
      for (let g = 1; g < dataSetContents.length; g++) {
        if (dataSetContents[g].checked) {
          currentDataSetLayer = dataSetContents[g];
          currentDataSetLayerSpan = currentDataSetLayer.nextSibling?.querySelector(
            'span',
          );
          currentElemContainerSpan = elemContainer.querySelector('span');

          if (
            (currentDataSetLayerSpan?.innerText.includes('Modular') &&
              currentElemContainerSpan?.innerText.includes('Modular')) ||
            (currentDataSetLayerSpan?.innerText.includes('Dichotomous') &&
              currentElemContainerSpan?.innerText.includes('Dichotomous'))
          ) {
            continue;
          } else {
            let previousDataSetLayer;
            let nextDataSetLayer;
            if (g > 1) {
              previousDataSetLayer = dataSetContents[g - 1];
            } else {
              previousDataSetLayer = null;
            }
            if (g < 3) {
              nextDataSetLayer = dataSetContents[g + 1];
            } else {
              nextDataSetLayer = null;
            }

            if (previousDataSetLayer) {
              dataSetLayerInput = previousDataSetLayer;
            } else if (nextDataSetLayer) {
              dataSetLayerInput = nextDataSetLayer;
            }
          }
        }
      }
    }
    if (productContainerId === 'd764e020485a402598551fa461bf1db2') {
      if (nextElemSibling) {
        siblingInput = nextElemSibling.querySelector('input');
      } else if (previousElemSibling) {
        siblingInput = previousElemSibling.querySelector('input');
      }
      if (siblingInput && siblingInput.checked) {
        siblingInput.click();
      }
      if (!currentDataSetLayerSpan && !currentElemContainerSpan) {
        this.setState({});
        return;
      } else {
        if (
          (currentDataSetLayerSpan?.innerText.includes('Modular') &&
            currentElemContainerSpan?.innerText.includes('Modular')) ||
          (currentDataSetLayerSpan?.innerText.includes('Dichotomous') &&
            currentElemContainerSpan?.innerText.includes('Dichotomous'))
        ) {
          this.setState({});
          return;
        } else {
          if (currentDataSetLayer && currentDataSetLayer.checked) {
            currentDataSetLayer.click();
          }
          if (currentDataSetLayer && !currentDataSetLayer.checked) {
            if (dataSetLayerInput) {
              dataSetLayerInput.click();
            }
          }
        }
      }
    }

    this.setState({});
  }

  /**
   * Method to check resourceInfo object from layers and check max or min scale
   */
  getLimitScale(key, layerTitle) {
    //CLMS-2684
    const layerTitleToCompare = layerTitle.includes(' -')
      ? layerTitle.replace(' -', '').trim()
      : layerTitle.includes('raster')
      ? layerTitle
      : layerTitle;
    let scale;
    if (this.layers[key].resourceInfo) {
      this.layers[key].resourceInfo.layers.forEach((sublayer) => {
        if (
          sublayer.title.includes(layerTitleToCompare) &&
          layerTitle.includes('raster')
        ) {
          scale = sublayer.maxScale;
        } else if (
          sublayer.title.includes(layerTitleToCompare) &&
          layerTitle.includes('vector')
        ) {
          scale = sublayer.minScale;
        }
      });
    }
    return scale;
  }

  /**
   * Method to show/hide a legend if the layer is active or not in the view
   */
  handleRasterVectorLegend() {
    //CLMS-2684
    //let zoom = this.view.get('zoom');
    /* let scale = this.view.scale;
    Object.keys(this.activeLayersJSON).forEach((key) => {
      let activeLayer = this.activeLayersJSON[key];
      let layerTitle = activeLayer.props.children[0].props.children;
      if (layerTitle.includes('raster')) {
        if (scale > this.getLimitScale(key, layerTitle)) {
          if (
            this.visibleLayers &&
            this.visibleLayers[key] &&
            this.visibleLayers[key][1] === 'eye'
          ){
            this.layers[key].visible = true;
          }
        } else {
          this.layers[key].visible = false;
        }
      } else if (layerTitle.includes('vector')) {
        if (scale < this.getLimitScale(key, layerTitle)) {
          if (
            this.visibleLayers &&
            this.visibleLayers[key] &&
            this.visibleLayers[key][1] === 'eye'
          ){
            this.layers[key].visible = true;
          }
        } else {
          this.layers[key].visible = false;
        }
      }
      this.setState({});
    }); */
  }

  async toggleLayer(elem) {
    if (!elem) return;
    this.url = this.layers[elem.id]?.ViewService || this.layers[elem.id]?.url;
    const userService =
      this.state.wmsUserServiceLayers.find(
        (layer) => layer.LayerId === elem.id,
      ) || null;
    if (elem.checked && !userService) {
      this.findCheckedDatasetNoServiceToVisualize(elem);
    }
    if (this.layers[elem.id] === undefined) return;
    if (!this.visibleLayers) this.visibleLayers = {};
    if (!this.timeLayers) this.timeLayers = {};
    let parentId = !userService ? elem.getAttribute('parentid') : null;
    let productContainerId = !userService
      ? document
          .getElementById(parentId)
          .closest('.map-menu-product-dropdown')
          .getAttribute('productid')
      : null;

    let group = this.getGroup(elem);
    if (elem.checked) {
      if (
        this.props.download ||
        this.location.search.includes('product=') ||
        (this.location.search.includes('dataset=') && !userService)
      ) {
        if (
          this.extentInitiated === false &&
          productContainerId !== 'd764e020485a402598551fa461bf1db2' // hotspot
        ) {
          this.extentInitiated = true;
          // setTimeout(() => {
          this.fullExtentDataset(elem);
          // }, 2000);
        }
      }
      if (
        this.layers[elem.id].DatasetId === '65f8eded11d94a1ba5540ceecaddd4e6' ||
        this.layers[elem.id].DatasetId === '40e056d02eed4c1fb2040cf0f06823df'
      ) {
        this.fullExtentDataset(elem);
      }
      if (
        (elem.id.includes('all_lcc') || elem.id.includes('all_present')) &&
        (this.layers['lc_filter'] || this.layers['lcc_filter']) &&
        !userService
      ) {
        let bookmarkHotspotFilter = localStorage.getItem(
          'bookmarkHotspotFilter',
        );
        if (
          this.props.bookmarkData &&
          this.props.bookmarkData.active === true
        ) {
          if (
            bookmarkHotspotFilter?.filteredLayers?.hasOwnProperty('lc_filter')
          ) {
            this.layers['lc_filter'].visible = true;
            this.map.add(this.layers['lc_filter']);
          } else if (
            bookmarkHotspotFilter?.filteredLayers?.hasOwnProperty('lcc_filter')
          ) {
            this.layers['lcc_filter'].visible = true;
            this.map.add(this.layers['lcc_filter']);
          } else {
            this.layers[elem.id].visible = true;
            this.map.add(this.layers[elem.id]);
          }
        } else if (
          elem.id.includes('cop_klc') &&
          this.layers['klc_filter'] !== undefined
        ) {
          this.layers['klc_filter'].visible = true;
          this.map.add(this.layers['klc_filter']);
        } else if (
          elem.id.includes('protected_areas') &&
          this.layers['pa_filter'] !== undefined
        ) {
          this.layers['pa_filter'].visible = true;
          this.map.add(this.layers['pa_filter']);
        } else if (
          elem.id.includes('all_present') &&
          this.layers['lc_filter'] !== undefined
        ) {
          this.layers['lc_filter'].visible = true;
          this.map.add(this.layers['lc_filter']);
        } else if (
          elem.id.includes('all_lcc') &&
          this.layers['lcc_filter'] !== undefined
        ) {
          this.layers['lcc_filter'].visible = true;
          this.map.add(this.layers['lcc_filter']);
        }
      } else {
        this.layers[elem.id].visible = true; //layer id
        this.map.add(this.layers[elem.id]);
      }
      this.visibleLayers[elem.id] = ['fas', 'eye'];
      this.timeLayers[elem.id] = ['far', 'clock'];
      let layer = this.layers[elem.id];
      let isMapServer = layer?.url.toLowerCase().endsWith('mapserver')
        ? true
        : false;
      if (group) {
        elem.title =
          this.layers[elem.id].type === 'map-image'
            ? this.layers[elem.id].DatasetTitle
            : this.getLayerTitle(this.layers[elem.id]);
        let groupLayers = this.getGroupLayers(group);
        if (groupLayers.length > 0 && groupLayers[0] in this.activeLayersJSON) {
          elem.hide = isMapServer;
        }
        this.activeLayersJSON[elem.id] = this.addActiveLayer(
          elem,
          Object.keys(this.activeLayersJSON).length,
        );
        this.handleRasterVectorLegend();
      } else {
        this.activeLayersJSON[elem.id] = this.addActiveLayer(
          elem,
          Object.keys(this.activeLayersJSON).length,
        );
      }
      this.saveCheckedLayer(elem.id);

      let nuts = this.map.layers.items.find((layer) => layer.title === 'nuts');
      if (nuts) {
        this.map.reorder(nuts, this.map.layers.items.length + 1);
      }
      if (!userService) this.checkForHotspots(elem, productContainerId);
      // Auto-fit extent once for OGC WMS layers on manual toggle
      try {
        const isCDSE =
          !!this.url &&
          ['/ogc/', '/cdse/'].some((s) => this.url.toLowerCase().includes(s));
        if (isCDSE) {
          const d =
            this.layers[elem.id]?.DatasetDownloadInformation ||
            this.layers[elem.id]?.datasetDownloadInformation ||
            {};
          const byoc =
            d && d.items && d.items[0] ? d.items[0].byoc_collection : null;
          if (byoc && this.props.fetchCatalogApiDates) {
            let payload =
              this.props.catalogapi &&
              this.props.catalogapi.byoc &&
              this.props.catalogapi.byoc[byoc]
                ? this.props.catalogapi.byoc[byoc].data
                : null;
            if (!payload) {
              payload = await this.props.fetchCatalogApiDates(byoc, false);
            }
            if (payload) {
              let myExtent = null;
              if (
                Array.isArray(payload.extent) &&
                payload.extent.length === 4
              ) {
                myExtent = new Extent({
                  xmin: payload.extent[0],
                  ymin: payload.extent[1],
                  xmax: payload.extent[2],
                  ymax: payload.extent[3],
                  spatialReference: { wkid: 3857 },
                });
              } else if (payload.geometry && payload.geometry.coordinates) {
                myExtent = await this.createExtentFromCoordinates(
                  payload.geometry.coordinates,
                );
              }
              if (myExtent) {
                this.view.goTo(myExtent);
              }
            }
          }
        }
      } catch (e) {}
    } else {
      this.extentInitiated = false;
      sessionStorage.removeItem('downloadButtonClicked');
      sessionStorage.removeItem('timeSliderTag');
      this.deleteCheckedLayer(elem.id);
      this.layers[elem.id].opacity = 1;
      this.layers[elem.id].visible = false;
      if (!userService) this.deleteFilteredLayer(elem.id);
      let mapLayer = this.map.findLayerById(elem.id);
      if (mapLayer) {
        if (!userService) {
          if (mapLayer.type && mapLayer.type !== 'base-tile') mapLayer.clear();
          mapLayer.destroy();
          this.map.remove(this.layers[elem.id]);
        } else {
          this.map.remove(mapLayer);
        }
      }
      delete this.activeLayersJSON[elem.id];
      delete this.visibleLayers[elem.id];
      delete this.timeLayers[elem.id];
    }
    if (!userService) this.updateCheckDataset(parentId);
    this.layersReorder();
    this.checkInfoWidget();
    // toggle custom legend for WMTS and TMS
    if (
      this.layers[elem.id].ViewService?.toLowerCase().includes('wmts') ||
      this.layers[elem.id].ViewService?.toLowerCase().endsWith('file')
    ) {
      this.toggleCustomLegendItem(this.layers[elem.id]);
    }
    if (!this.props.download && this.props.hotspotData) {
      this.activeLayersToHotspotData(elem.id);
    }
    this.renderHotspot();
    this.url = null;
  }

  getHotspotLayerIds() {
    let hotspotLayersIds = [];
    Object.keys(this.props.hotspotData).forEach((key) => {
      let dataset = this.props.hotspotData[key];
      Object.keys(dataset).forEach((layerKey) => {
        hotspotLayersIds.push(layerKey);
      });
    });
    this.hotspotLayersIds = hotspotLayersIds;
  }

  activeLayersToHotspotData(layerId) {
    let layer = Object.entries(this.layers).find(
      ([key, value]) => key === layerId,
    )?.[1];
    let hotspotLayersIds = this.hotspotLayersIds;
    let updatedActiveLayers = this.props.hotspotData['activeLayers'] || {};
    let newHotspotData = this.props.hotspotData;

    for (let i = 0; i < hotspotLayersIds.length; i++) {
      const id = hotspotLayersIds[i];
      if (!layerId.includes(id)) continue;
      else if (layerId.includes(id)) {
        if (layer.visible === true) {
          updatedActiveLayers[id] = layer;
        } else if (layer.visible === false) {
          if (updatedActiveLayers[id]) {
            delete updatedActiveLayers[id];
          }
        }
        break;
      }
    }

    newHotspotData['activeLayers'] = updatedActiveLayers;
    return this.props.hotspotDataHandler(newHotspotData);
  }

  /**
   * Hide or show the hotspot widget for a hotspot layer
   */

  toggleHotspotWidget() {
    let hotspotButton = document.querySelector('#hotspot_button');
    let checkedLayers = JSON.parse(sessionStorage.getItem('checkedLayers'));
    if (this.props.download) {
      checkedLayers = Object.keys(this.activeLayersJSON);
    }
    if (
      checkedLayers.length === 0 &&
      sessionStorage.getItem('hotspotFilterApplied')
    ) {
      sessionStorage.removeItem('hotspotFilterApplied');
    }
    if (checkedLayers) {
      checkedLayers.forEach((key) => {
        if (
          key.includes('all_present_lc_a_pol') ||
          key.includes('all_lcc_a_pol')
        ) {
          if (!this.props.mapViewer.activeWidget) {
            hotspotButton.click();
          }
        }
      });
    }
  }
  /**
   * Hide or show a legend image in the legend widget for a WMTS or a TMS layer
   *
   * @param Layer
   */
  toggleCustomLegendItem(layer) {
    // check for existing legend item
    let existingItem = document.getElementById(
      'custom-legend-item-' + layer.id,
    );

    if (layer.visible) {
      if (!existingItem) {
        // create one
        this.addCustomItemToLegend(layer);
      } else {
        // show existing one
        if (!existingItem.innerText.includes('undefined'))
          existingItem.style.display = 'block';
      }
    } else {
      // hide legend item
      if (existingItem) {
        existingItem.style.display = 'none';
      }
    }
    // hide no legend message
    const noLegendMessage = document.querySelectorAll(
      '.esri-legend__message',
    )[0];
    if (noLegendMessage) {
      noLegendMessage.style.display = 'none';
    }
  }

  addCustomItemToLegend(layer) {
    // Find legend widget node
    const legendDiv = document.querySelectorAll('.esri-widget.esri-legend')[0];
    if (!legendDiv) return;
    let childDiv = legendDiv.firstChild;
    if (!childDiv) return;
    // create legend element
    if (layer.LayerTitle !== undefined) {
      let legendItem = this.createStaticLegendImageNode(
        layer.id,
        layer.LayerTitle,
        layer.StaticImageLegend,
      );
      // append to Legend widet
      childDiv.appendChild(legendItem);
    }

    // hide no legend message
    const noLegendMessage = document.querySelectorAll(
      '.esri-legend__message',
    )[0];
    if (noLegendMessage) {
      noLegendMessage.style.display = 'none';
    }
  }

  getGlobalDynamicLandCoverUrl(
    CustomTileLayer,
    checkboxId,
    layer,
    dataset,
    url,
  ) {
    const customTileLayer = new CustomTileLayer({
      id: checkboxId,
      tms: true,
      urlTemplate: url,
      spatialReference: {
        wkid: 3857,
      },
      title: layer.Title,
      LayerTitle: layer.Title,
      DatasetTitle: dataset.DatasetTitle,
      ViewService: dataset.ViewService,
      StaticImageLegend: layer.StaticImageLegend,
      url: dataset.ViewService,
    });

    return customTileLayer;
  }

  createStaticLegendImageNode(id, title, imageURL) {
    let node = document.createElement('div');
    node.classList.add('esri-legend__service');
    node.id = 'custom-legend-item-' + id;

    // Create node
    let template = `
    <div className="esri-legend__layer">
      <div className="esri-legend__layer-table esri-legend__layer-table--size-ramp" >
        <div className="esri-legend__layer-caption">
          ${title}
        </div>
        <div className="esri-legend__layer-body">
          <div className="esri-legend__layer-row">
            <div className="esri-legend__layer-cell esri-legend__layer-cell--symbols" >
              <div className="esri-legend__symbol">
                <img crossorigin="anonymous"
                  alt=""
                  src="${imageURL}"
                  style="opacity: 1"
                />
              </div>
            </div>
            <div
              className="esri-legend__layer-cell esri-legend__layer-cell--info"
            ></div>
          </div>
        </div>
      </div>
    </div>`;

    node.innerHTML = template;

    return node;
  }

  /**
   * Returns the DOM elements for active layers
   * just in the order they were added to map
   */

  activeLayersAsArray() {
    var messageLayers = document.querySelector('#nolayers_message');
    let activeLayersArray = [];
    for (var i in this.activeLayersJSON) {
      activeLayersArray.push(this.activeLayersJSON[i]);
    }
    if (!activeLayersArray.length) {
      messageLayers && (messageLayers.style.display = 'block');
    } else messageLayers && (messageLayers.style.display = 'none');

    this.activeLayersHandler(activeLayersArray);
    return activeLayersArray;
  }

  /**
   * Method to show/hide all the layers of a dataset
   * @param {*} value
   * @param {*} id
   * @param {*} element
   */
  toggleDataset(value, id, e) {
    let layerdef = e.getAttribute('defcheck');
    let splitdefCheck = layerdef.split(',');
    let layerChecks = [];
    let selector = [];
    if (value) {
      let productDropdown = e.closest('.map-menu-product-dropdown');
      let datasetDropdown = e.closest('.map-menu-dropdown');
      let familyDropdown = e.closest('.map-menu-family-dropdown');
      if (productDropdown) {
        let btn = productDropdown.querySelector('.ccl-expandable__button');
        if (btn) btn.setAttribute('aria-expanded', 'true');
        if (btn) this.addExpandedDropdown(btn.id);
      }
      if (familyDropdown) {
        let btn = familyDropdown.querySelector('.ccl-expandable__button');
        if (btn) btn.setAttribute('aria-expanded', 'true');
        if (btn) this.addExpandedDropdown(btn.id);
      }
      if (datasetDropdown) {
        let btn = datasetDropdown.querySelector('.ccl-expandable__button');
        if (btn) btn.setAttribute('aria-expanded', 'true');
        if (btn) this.addExpandedDropdown(btn.id);
      }
    }
    if (value) {
      for (let i = 0; i < splitdefCheck.length; i++) {
        selector = document.querySelector(`[id="${splitdefCheck[i]}"]`);
        if (selector) {
          const layer = this.layers[splitdefCheck[i]];
          if (
            layer?.url?.toLowerCase().includes('/rest/') &&
            layer?.type === 'map-image'
          ) {
            layerChecks.push(selector);
            break;
          } else {
            layerChecks.push(selector);
          }
        }
      }
    } else {
      layerChecks = document.querySelectorAll(`[parentid=${id}]`);
    }
    layerChecks.forEach((element) => {
      if (element) {
        element.checked = value;
        this.toggleLayer(element);
      }
    });
    if (!value) {
      let filterIds = ['lcc_filter', 'lc_filter', 'klc_filter', 'pa_filter'];
      for (let i = 0; i < filterIds.length; i++) {
        let fid = filterIds[i];
        if (this.layers && this.layers[fid]) {
          this.deleteFilteredLayer(fid);
          let mapLayer = this.map && this.map.findLayerById(fid);
          if (mapLayer) {
            if (mapLayer.type && mapLayer.type !== 'base-tile') {
              mapLayer.clear();
            }
            mapLayer.destroy();
            this.map.remove(mapLayer);
          }
          if (this.activeLayersJSON && this.activeLayersJSON[fid])
            delete this.activeLayersJSON[fid];
          if (this.visibleLayers && this.visibleLayers[fid])
            delete this.visibleLayers[fid];
          if (this.timeLayers && this.timeLayers[fid])
            delete this.timeLayers[fid];
        }
      }
    }
  }

  /**
   * Method to show/hide all the datasets of a product
   * @param {*} value (e.target.checked)
   * @param {*} id
   * @param {*} element (checkbox)
   */
  toggleProduct(value, id, element) {
    let productDefCheck = element.target.getAttribute('defcheck');
    let splitdefCheck = productDefCheck.split(',');

    let datasetChecks = [];
    let selector = [];

    if (value) {
      let productContainer = document.querySelector('[productid="' + id + '"]');
      if (productContainer) {
        let btn = productContainer.querySelector('.ccl-expandable__button');
        if (btn) btn.setAttribute('aria-expanded', 'true');
        if (btn) this.addExpandedDropdown(btn.id);
      }
      for (let i = 0; i < splitdefCheck.length; i++) {
        selector = document.querySelector(`[id="${splitdefCheck[i]}"]`);
        datasetChecks.push(selector);
        if (selector) {
          let datasetDropdown = selector.closest('.map-menu-dropdown');
          if (datasetDropdown) {
            let btn = datasetDropdown.querySelector('.ccl-expandable__button');
            if (btn) btn.setAttribute('aria-expanded', 'true');
            if (btn) this.addExpandedDropdown(btn.id);
          }
        }
      }
    } else {
      datasetChecks = document.querySelectorAll(`[parentid=${id}]`);
    }

    datasetChecks.forEach((element) => {
      if (element) {
        element.checked = value;
        this.toggleDataset(value, element.id, element);
      }
    });
  }

  toggleFamily(value, id, element) {
    let familyDefCheck = element.target.getAttribute('defcheck');
    let splitdefCheck = familyDefCheck.split(',');

    let datasetChecks = [];
    let selector = [];

    if (value) {
      let familyContainer = document.querySelector('[productid="' + id + '"]');
      if (familyContainer) {
        let btn = familyContainer.querySelector('.ccl-expandable__button');
        if (btn) btn.setAttribute('aria-expanded', 'true');
        if (btn) this.addExpandedDropdown(btn.id);
      }
      for (let i = 0; i < splitdefCheck.length; i++) {
        selector = document.querySelector(`[id="${splitdefCheck[i]}"]`);
        datasetChecks.push(selector);
        if (selector) {
          let datasetDropdown = selector.closest('.map-menu-dropdown');
          if (datasetDropdown) {
            let btn = datasetDropdown.querySelector('.ccl-expandable__button');
            if (btn) btn.setAttribute('aria-expanded', 'true');
            if (btn) this.addExpandedDropdown(btn.id);
          }
        }
      }
    } else {
      datasetChecks = document.querySelectorAll(`[parentid=${id}]`);
    }

    datasetChecks.forEach((element) => {
      if (element) {
        element.checked = value;
        this.toggleDataset(value, element.id, element);
      }
    });
  }
  /**
   * Method to toggle dropdown content (datasets and layers)
   * @param {*} e
   */

  toggleDropdownContent(e) {
    var aria = e.currentTarget.getAttribute('aria-expanded');
    e.currentTarget.setAttribute(
      'aria-expanded',
      aria === 'true' ? 'false' : 'true',
    );
    this.saveDropdownState(e.currentTarget);
  }

  /**
   * Method to save which dropdowns have been expanded to sessionStorage
   * @param {*} elem From the click event
   */
  saveDropdownState(elem) {
    if (this.props.download) return;
    let expandedDropdowns = JSON.parse(
      sessionStorage.getItem('expandedDropdowns'),
    );
    if (expandedDropdowns === null) {
      expandedDropdowns = [elem.id];
      sessionStorage.setItem(
        'expandedDropdowns',
        JSON.stringify(expandedDropdowns),
      );
    } else {
      if (!expandedDropdowns.includes(elem.id)) {
        expandedDropdowns.push(elem.id);
      } else {
        // remove
        expandedDropdowns = expandedDropdowns.filter((e) => e !== elem.id);
      }
      sessionStorage.setItem(
        'expandedDropdowns',
        JSON.stringify(expandedDropdowns),
      );
    }
    const userKey = this.userID ? 'user_' + this.userID : 'user_anonymous';
    const existing = localStorage.getItem(userKey);
    let storeObj = {};
    if (existing) {
      try {
        storeObj = JSON.parse(existing) || {};
      } catch (e) {
        storeObj = {};
      }
    }
    storeObj.expandedDropdowns = expandedDropdowns;
    localStorage.setItem(userKey, JSON.stringify(storeObj));
  }

  addExpandedDropdown(id) {
    if (!id || this.props.download) return;
    try {
      let expandedDropdowns = JSON.parse(
        sessionStorage.getItem('expandedDropdowns'),
      );
      if (!Array.isArray(expandedDropdowns)) expandedDropdowns = [];
      if (!expandedDropdowns.includes(id)) {
        expandedDropdowns.push(id);
        sessionStorage.setItem(
          'expandedDropdowns',
          JSON.stringify(expandedDropdowns),
        );
        const userKey = this.userID ? 'user_' + this.userID : 'user_anonymous';
        const existing = localStorage.getItem(userKey);
        let storeObj = {};
        if (existing) {
          try {
            storeObj = JSON.parse(existing) || {};
          } catch (e) {
            storeObj = {};
          }
        }
        storeObj.expandedDropdowns = expandedDropdowns;
        localStorage.setItem(userKey, JSON.stringify(storeObj));
      }
    } catch (e) {}
  }
  findCheckedDatasetNoServiceToVisualize(elem) {
    let parentId = elem.getAttribute('parentid');
    let selectedDataset = document.querySelector('[id="' + parentId + '"]');
    let datasetContainer = selectedDataset.closest(
      '.map-menu-dataset-dropdown',
    );
    let datasetContainerId = datasetContainer?.getAttribute('datasetid');
    this.compCfg.forEach((component) => {
      component.Products.forEach((product) => {
        product.Datasets.forEach((dataset) => {
          if (dataset.DatasetId === datasetContainerId) {
            if (!dataset.ViewService) {
              this.showNoServiceModal();
            }
          }
        });
      });
    });
  }
  findCheckedDataset(elem) {
    let parentId = elem.getAttribute('parentid');
    let selectedDataset = document.querySelector('[id="' + parentId + '"]');
    this.compCfg.forEach((component) => {
      component.Products.forEach((product) => {
        product.Datasets.forEach((dataset) => {
          if (dataset.DatasetTitle.includes(selectedDataset.title)) {
            this.url = dataset.ViewService;
            this.productId = product.ProductId;
          }
        });
      });
    });
  }
  findDatasetBoundingBox(elem) {
    this.compCfg.forEach((component) => {
      component.Products.forEach((product) => {
        product.Datasets.forEach((dataset) => {
          dataset.Layer.forEach((layer) => {
            if (layer.Title.includes(elem.title)) {
              this.dataBBox = layer.bbox;
            }
          });
        });
      });
    });
  }
  parseBBOXJSON(bboxJson) {
    let bbox = JSON.parse(bboxJson);
    let BBoxes = [];
    BBoxes[0] = { xmin: bbox[0], ymin: bbox[1], xmax: bbox[2], ymax: bbox[3] };
    return BBoxes;
  }
  async parseBBOXMAPSERVER(layer) {
    let BBoxes = {};
    for (let i = 0; i < layer?.allSublayers?.items.length; i++) {
      const subLayer = layer.allSublayers.items.find(
        (sublayer) => sublayer.id === i,
      );
      try {
        const response = await fetch(`${subLayer.url}?f=pjson`);
        if (!response.ok) {
          continue;
        }
        const subLayerData = await response.json();
        if (subLayerData === null) {
          continue;
        } else {
          let extent = this.convertBBOXValues(subLayerData.extent);
          BBoxes[subLayerData.name] = {
            id: subLayerData.id,
            extent: extent,
          };
        }
      } catch (error) {}
    }

    BBoxes['dataset'] = this.convertBBOXValues(layer?.fullExtent?.extent);

    return BBoxes;
  }

  async createExtentFromCoordinates(coordinates) {
    if (!coordinates) return null;
    let pts;
    if (
      Array.isArray(coordinates) &&
      coordinates[0] &&
      Array.isArray(coordinates[0]) &&
      Array.isArray(coordinates[0][0])
    ) {
      pts = coordinates[0];
    } else if (
      Array.isArray(coordinates) &&
      coordinates[0] &&
      typeof coordinates[0] === 'object' &&
      'latitude' in coordinates[0] &&
      'longitude' in coordinates[0]
    ) {
      pts = coordinates.map((c) => [c.longitude, c.latitude]);
    } else if (
      Array.isArray(coordinates) &&
      coordinates[0] &&
      Array.isArray(coordinates[0]) &&
      typeof coordinates[0][0] === 'number'
    ) {
      pts = coordinates;
    } else {
      return null;
    }
    let xmin = Infinity,
      ymin = Infinity,
      xmax = -Infinity,
      ymax = -Infinity;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (!Array.isArray(p) || p.length < 2) continue;
      const x = p[0];
      const y = p[1];
      if (x < xmin) xmin = x;
      if (x > xmax) xmax = x;
      if (y < ymin) ymin = y;
      if (y > ymax) ymax = y;
    }
    if (
      !isFinite(xmin) ||
      !isFinite(ymin) ||
      !isFinite(xmax) ||
      !isFinite(ymax)
    )
      return null;
    return new Extent({
      xmin: xmin,
      ymin: ymin,
      xmax: xmax,
      ymax: ymax,
      spatialReference: { wkid: 3857 },
    });
  }

  async getCDSEWFSGeoCoordinates(url, layer) {
    if (!url) return {};
    const match = /\/ogc\/(?:wmts|wms)\/([^/?]+)/i.exec(url);
    const datasetDownloadInformation =
      layer?.DatasetDownloadInformation ||
      layer?.DatasetDownloadInformation ||
      {};
    if (!datasetDownloadInformation) return {};
    const byocCollectionId =
      datasetDownloadInformation?.items[0].byoc_collection || null;
    if (!byocCollectionId) return {};
    if (!match) return {};
    const fetchUrl = `https://sh.dataspace.copernicus.eu/ogc/wfs/${match[1]}?SERVICE=WFS&REQUEST=GetFeature&VERSION=2.0.0&TYPENAMES=byoc-${byocCollectionId}&COUNT=100&BBOX=-21039383,-22375217,21039383,22375217&OUTPUTFORMAT=application/json`;
    try {
      const res = await fetch(fetchUrl);
      const data = await res.json();
      if (
        data &&
        data.features &&
        data.features[0] &&
        data.features[0].geometry &&
        data.features[0].geometry.coordinates
      )
        return data.features[0].geometry.coordinates;
    } catch (e) {
      return {};
    }
  }

  parseBBOXCDSE(xml) {
    if (!xml || typeof xml.getElementsByTagName !== 'function') return {};
    const all = Array.from(xml.getElementsByTagName('*'));
    const isLayer = (node) =>
      node && (node.localName || '').toLowerCase() === 'layer';
    const layers = all.filter(isLayer);
    if (!layers.length) return {};
    const hasChildLayer = (element) => {
      const children = element ? element.children : null;
      if (!children || !children.length) return false;
      for (let i = 0; i < children.length; i++)
        if (isLayer(children[i])) return true;
      return false;
    };
    const findDesc = (element, nameLower) => {
      if (!element || typeof element.getElementsByTagName !== 'function')
        return null;
      const items = element.getElementsByTagName('*');
      for (let i = 0; i < items.length; i++) {
        const node = items[i];
        if ((node.localName || '').toLowerCase() === nameLower) return node;
      }
      return null;
    };
    const leaves = layers.filter((node) => !hasChildLayer(node));
    if (!leaves.length) return {};
    const boxes = {};
    const xList = [];
    const yList = [];
    for (let i = 0; i < leaves.length; i++) {
      const leaf = leaves[i];
      if (!leaf) continue;
      const nameElement = findDesc(leaf, 'name');
      const name =
        nameElement && nameElement.textContent
          ? nameElement.textContent.trim()
          : '';
      if (!name) continue;
      let bboxElement = findDesc(leaf, 'boundingbox');
      if (!bboxElement) {
        let parent = leaf.parentElement;
        while (parent) {
          if (isLayer(parent)) {
            const candidate = findDesc(parent, 'boundingbox');
            if (candidate) {
              bboxElement = candidate;
              break;
            }
          }
          parent = parent.parentElement;
        }
      }
      if (!bboxElement) continue;
      const west = parseFloat(bboxElement.getAttribute('minx') || '');
      const south = parseFloat(bboxElement.getAttribute('miny') || '');
      const east = parseFloat(bboxElement.getAttribute('maxx') || '');
      const north = parseFloat(bboxElement.getAttribute('maxy') || '');
      if (
        !isFinite(west) ||
        !isFinite(south) ||
        !isFinite(east) ||
        !isFinite(north)
      )
        continue;
      boxes[name] = { xmin: west, ymin: south, xmax: east, ymax: north };
      xList.push(west, east);
      yList.push(south, north);
    }
    if (!Object.keys(boxes).length) return {};
    if (!xList.length || !yList.length) return boxes;
    boxes.dataset = {
      xmin: Math.min.apply(Math, xList),
      ymin: Math.min.apply(Math, yList),
      xmax: Math.max.apply(Math, xList),
      ymax: Math.max.apply(Math, yList),
    };
    return boxes;
  }

  parseBBOXWMS(xml) {
    if (
      !xml ||
      typeof xml.querySelectorAll !== 'function' ||
      typeof xml.getElementsByTagName !== 'function'
    )
      return {};
    const layerParentNode = xml.querySelectorAll('Layer');
    if (!layerParentNode || layerParentNode.length === 0) return {};
    let layersChildren = Array.from(layerParentNode).filter(
      (v) =>
        v && v.querySelectorAll && v.querySelectorAll('Layer').length === 0,
    );
    let layerParent = Array.from(layerParentNode).filter(
      (v) =>
        v && v.querySelectorAll && v.querySelectorAll('Layer').length !== 0,
    );
    if (!layersChildren.length && !layerParent.length) return {};
    let BBoxes = {};
    let layerGeographicNode = {};
    let xList = [];
    let yList = [];
    for (let i in layersChildren) {
      const child = layersChildren[i];
      if (!child || typeof child.querySelector !== 'function') continue;
      const bboxNode = child.querySelector('EX_GeographicBoundingBox');
      if (bboxNode !== null) {
        layerGeographicNode = bboxNode;
      } else {
        const parentNode =
          layerParent && layerParent.length ? layerParent[0] : null;
        layerGeographicNode =
          parentNode && typeof parentNode.querySelector === 'function'
            ? parentNode.querySelector('EX_GeographicBoundingBox')
            : null;
      }
      const nameNode = child.querySelector('Name');
      const key =
        nameNode && typeof nameNode.innerText === 'string'
          ? nameNode.innerText
          : '';
      if (!layerGeographicNode || !key) continue;
      const westNode = layerGeographicNode.querySelector('westBoundLongitude');
      const southNode = layerGeographicNode.querySelector('southBoundLatitude');
      const eastNode = layerGeographicNode.querySelector('eastBoundLongitude');
      const northNode = layerGeographicNode.querySelector('northBoundLatitude');
      if (!westNode || !southNode || !eastNode || !northNode) continue;
      const xmin = Number(westNode.innerText);
      const ymin = Number(southNode.innerText);
      const xmax = Number(eastNode.innerText);
      const ymax = Number(northNode.innerText);
      if (
        !isFinite(xmin) ||
        !isFinite(ymin) ||
        !isFinite(xmax) ||
        !isFinite(ymax)
      )
        continue;
      BBoxes[key] = {
        xmin: xmin,
        ymin: ymin,
        xmax: xmax,
        ymax: ymax,
      };
      xList.push(BBoxes[key].xmin);
      yList.push(BBoxes[key].ymin);
      xList.push(BBoxes[key].xmax);
      yList.push(BBoxes[key].ymax);
    } // For loop
    if (!xList.length || !yList.length) return {};
    BBoxes['dataset'] = {
      xmin: Math.min.apply(Math, xList),
      ymin: Math.min.apply(Math, yList),
      xmax: Math.max.apply(Math, xList),
      ymax: Math.max.apply(Math, yList),
    };
    return BBoxes;
  } // function parseWMS

  parseCapabilities(xml, tag) {
    return xml.getElementsByTagName(tag);
  }

  // Web Map Tiled Services WMTS
  parseBBOXWMTS(xml) {
    if (
      !xml ||
      typeof xml.querySelectorAll !== 'function' ||
      typeof xml.getElementsByTagName !== 'function'
    )
      return {};
    let BBoxes = {};
    let layersChildren = null;
    let layerParent = null;
    const layerParentNode = xml.querySelectorAll('Layer');
    if (!layerParentNode || layerParentNode.length === 0) return {};
    layersChildren = Array.from(layerParentNode).filter(
      (v) =>
        v && v.querySelectorAll && v.querySelectorAll('Layer').length === 0,
    );
    layerParent = Array.from(layerParentNode).filter(
      (v) =>
        v && v.querySelectorAll && v.querySelectorAll('Layer').length !== 0,
    );
    if (!layersChildren.length && !layerParent.length) return {};
    let lowerCornerValues,
      upperCornerValues = [];
    let xList = [];
    let yList = [];
    let title = '';
    for (let i in layersChildren) {
      const child = layersChildren[i];
      if (!child) continue;
      const lowerCornerNodes = this.parseCapabilities(child, 'ows:LowerCorner');
      const upperCornerNodes = this.parseCapabilities(child, 'ows:UpperCorner');
      if (
        lowerCornerNodes &&
        lowerCornerNodes.length !== 0 &&
        upperCornerNodes &&
        upperCornerNodes.length !== 0
      ) {
        lowerCornerValues = lowerCornerNodes[0].innerText.split(' ');
        upperCornerValues = upperCornerNodes[0].innerText.split(' ');
      } else {
        const parentNode =
          layerParent && layerParent.length ? layerParent[0] : null;
        const parentLower = parentNode
          ? this.parseCapabilities(parentNode, 'ows:LowerCorner')
          : null;
        const parentUpper = parentNode
          ? this.parseCapabilities(parentNode, 'ows:UpperCorner')
          : null;
        if (
          parentLower &&
          parentLower.length !== 0 &&
          parentUpper &&
          parentUpper.length !== 0
        ) {
          lowerCornerValues = parentLower[0].innerText.split(' ');
          upperCornerValues = parentUpper[0].innerText.split(' ');
        } else {
          continue;
        }
      }
      const titleNodes = this.parseCapabilities(child, 'ows:Title');
      if (
        !titleNodes ||
        !titleNodes[0] ||
        typeof titleNodes[0].innerText !== 'string'
      )
        continue;
      title = titleNodes[0].innerText;
      const xmin = Number(lowerCornerValues[0]);
      const ymin = Number(lowerCornerValues[1]);
      const xmax = Number(upperCornerValues[0]);
      const ymax = Number(upperCornerValues[1]);
      if (
        !isFinite(xmin) ||
        !isFinite(ymin) ||
        !isFinite(xmax) ||
        !isFinite(ymax)
      )
        continue;
      BBoxes[title] = {
        xmin: Number(lowerCornerValues[0]),
        ymin: Number(lowerCornerValues[1]),
        xmax: Number(upperCornerValues[0]),
        ymax: Number(upperCornerValues[1]),
      };
      xList.push(BBoxes[title].xmin);
      yList.push(BBoxes[title].ymin);
      xList.push(BBoxes[title].xmax);
      yList.push(BBoxes[title].ymax);
    } // For loop

    if (!xList.length || !yList.length) return {};
    BBoxes['dataset'] = {
      xmin: Math.min.apply(Math, xList),
      ymin: Math.min.apply(Math, yList),
      xmax: Math.max.apply(Math, xList),
      ymax: Math.max.apply(Math, yList),
    };
    return BBoxes;
  }

  getCapabilities = (url, serviceType) => {
    // Get the coordinates of the click on the view
    const proxiedUrl = this.buildProxiedUrl(url);
    return esriRequest(proxiedUrl, {
      responseType: 'html',
      sync: 'true',
      query: {
        request: 'GetCapabilities',
        service: serviceType,
      },
    })
      .then((response) => {
        const xmlDoc = response.data;
        const parser = new DOMParser();
        this.xml = parser.parseFromString(xmlDoc, 'text/html');
      })
      .catch(() => {});
  };

  findBBoxById(obj, id) {
    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Check if the current object's id matches the desired id
        if (obj[key].id === id) {
          return obj[key].extent; // Return the extent if found
        }
      }
    }
    return null; // Return null if the id is not found
  }

  convertBBOXValues(extent) {
    //Create a spatial reference object for the extent

    let sr4326 = new SpatialReference({
      wkid: 4326,
    });

    //Create a projection object for the extent

    let newBBox = projection.project(extent, sr4326);
    return newBBox;
  }

  async datasetFullExtentFromPayload(payload) {
    if (!payload) return null;
    if (
      payload.metadata &&
      Array.isArray(payload.metadata.bbox) &&
      payload.metadata.bbox.length === 4
    ) {
      const srName = payload.metadata?.geometry?.crs?.properties?.name || '';
      const isCRS84 =
        typeof srName === 'string' && srName.toUpperCase().includes('CRS84');
      return new Extent({
        xmin: payload.metadata.bbox[0],
        ymin: payload.metadata.bbox[1],
        xmax: payload.metadata.bbox[2],
        ymax: payload.metadata.bbox[3],
        spatialReference: isCRS84 ? { wkid: 4326 } : { wkid: 3857 },
      });
    } else if (
      payload.metadata &&
      payload.metadata.geometry &&
      payload.metadata.geometry.coordinates
    ) {
      const srName = payload.metadata?.geometry?.crs?.properties?.name || '';
      const isCRS84 =
        typeof srName === 'string' && srName.toUpperCase().includes('CRS84');
      const coords = payload.metadata.geometry.coordinates;
      let xmin = Infinity,
        ymin = Infinity,
        xmax = -Infinity,
        ymax = -Infinity;
      const walk = (arr) => {
        if (!Array.isArray(arr)) return;
        if (typeof arr[0] === 'number' && typeof arr[1] === 'number') {
          const x = Number(arr[0]);
          const y = Number(arr[1]);
          if (isFinite(x) && isFinite(y)) {
            if (x < xmin) xmin = x;
            if (x > xmax) xmax = x;
            if (y < ymin) ymin = y;
            if (y > ymax) ymax = y;
          }
          return;
        }
        for (let i = 0; i < arr.length; i++) walk(arr[i]);
      };
      walk(coords);
      if (
        isFinite(xmin) &&
        isFinite(ymin) &&
        isFinite(xmax) &&
        isFinite(ymax)
      ) {
        return new Extent({
          xmin: xmin,
          ymin: ymin,
          xmax: xmax,
          ymax: ymax,
          spatialReference: isCRS84 ? { wkid: 4326 } : { wkid: 3857 },
        });
      }
    }
    return null;
  }

  async fullExtentDataset(elem) {
    const serviceLayer = this.state.wmsUserServiceLayers.find(
      (layer) => layer.LayerId === elem.id,
    );
    if (!serviceLayer) {
      this.findCheckedDataset(elem);
    } else {
      this.url = serviceLayer.ViewService;
    }
    const isCDSE =
      !!this.url &&
      ['/ogc/', '/cdse/'].some((s) => this.url.toLowerCase().includes(s));
    let BBoxes = {};
    if (isCDSE) {
      let d =
        this.layers[elem.id]?.DatasetDownloadInformation ||
        this.layers[elem.id]?.datasetDownloadInformation ||
        this.layers[elem.id]?.dataset_download_information ||
        {};
      let byoc = d && d.items && d.items[0] ? d.items[0].byoc_collection : null;

      if (!byoc) {
        let parentId = elem.getAttribute('parentid');
        let datasetInput = document.getElementById(parentId);
        let datasetContainer = datasetInput
          ? datasetInput.closest('.map-menu-dataset-dropdown')
          : null;
        let datasetId = datasetContainer
          ? datasetContainer.getAttribute('datasetid')
          : null;
        if (datasetId && this.compCfg && Array.isArray(this.compCfg)) {
          for (let i = 0; i < this.compCfg.length; i++) {
            const comp = this.compCfg[i];
            if (!comp || !comp.Products) continue;
            for (let j = 0; j < comp.Products.length; j++) {
              const prod = comp.Products[j];
              if (!prod || !prod.Datasets) continue;
              for (let k = 0; k < prod.Datasets.length; k++) {
                const ds = prod.Datasets[k];
                if (ds && ds.DatasetId === datasetId) {
                  const info =
                    ds.dataset_download_information ||
                    ds.DatasetDownloadInformation ||
                    {};
                  if (info && info.items && info.items[0]) {
                    byoc = info.items[0].byoc_collection || byoc;
                  }
                  break;
                }
              }
            }
          }
        }
      }

      if (byoc && this.props.fetchCatalogApiDates) {
        let payload =
          this.props.catalogapi &&
          this.props.catalogapi.byoc &&
          this.props.catalogapi.byoc[byoc]
            ? this.props.catalogapi.byoc[byoc].data
            : null;
        if (!payload) {
          payload = await this.props.fetchCatalogApiDates(byoc, false);
        }
        const myExtent = await this.datasetFullExtentFromPayload(payload);
        if (myExtent) {
          this.view.goTo(myExtent);
          return;
        }
      }
      return;
    } else if (this.url?.toLowerCase().endsWith('mapserver')) {
      BBoxes = await this.parseBBOXMAPSERVER(this.layers[elem.id]);
    } else if (this.url?.toLowerCase().includes('wms') || serviceLayer) {
      await this.getCapabilities(this.url, 'wms');
      BBoxes = this.parseBBOXWMS(this.xml);
    } else if (this.url?.toLowerCase().includes('wmts')) {
      await this.getCapabilities(this.url, 'wmts');
      BBoxes = this.parseBBOXWMTS(this.xml);
    }
    let myExtent;
    if (Object.values(BBoxes).length === 0) {
      myExtent = new Extent({
        xmin: -20037508.342789,
        ymin: -20037508.342789,
        xmax: 20037508.342789,
        ymax: 20037508.342789,
        spatialReference: 3857,
      });
    } else {
      myExtent = new Extent({
        xmin: BBoxes['dataset'].xmin,
        ymin: BBoxes['dataset'].ymin,
        xmax: BBoxes['dataset'].xmax,
        ymax: BBoxes['dataset'].ymax,
      });
    }
    if (
      this.extentInitiated === false &&
      (this.layers[elem.id].DatasetId === '65f8eded11d94a1ba5540ceecaddd4e6' ||
        this.layers[elem.id].DatasetId === '40e056d02eed4c1fb2040cf0f06823df')
    ) {
      let myExtent = new Extent({
        xmin: -13478905.5678019,
        ymin: 23797904.386302948,
        xmax: 20538395.093334593,
        ymax: 11175665.272476234,
        spatialReference: 3857,
      });
      const targetCenter = myExtent.center;
      if (this.extentCenter) {
        const epsilon = 1e-3;
        const sameStoredCenter =
          Math.abs(this.extentCenter.x - targetCenter.x) < epsilon &&
          Math.abs(this.extentCenter.y - targetCenter.y) < epsilon;
        if (sameStoredCenter) {
          this.extentInitiated = true;
          return;
        }
      }
      this.view.goTo({ center: targetCenter, zoom: 3 });
      this.extentCenter = { x: targetCenter.x, y: targetCenter.y };
      this.extentInitiated = true;
    } else {
      this.view.goTo(myExtent);
    }
  }

  async fullExtent(elem) {
    this.url = this.layers[elem.id]?.url;
    const isCDSE =
      !!this.url &&
      ['/ogc/', '/cdse/'].some((s) => this.url.toLowerCase().includes(s));
    const serviceLayer = this.state.wmsUserServiceLayers.find(
      (layer) => layer.LayerId === elem.id,
    );

    if (!serviceLayer) {
      this.findCheckedDataset(elem);
    } else {
      this.productId = null;
      this.url = serviceLayer.ViewService;
    }
    let BBoxes = {};
    let firstLayer;
    let myExtent = null;
    let landCoverAndLandUseMapping = document.querySelector('#component_0');
    let productIds = [];
    if (
      landCoverAndLandUseMapping &&
      landCoverAndLandUseMapping.contains(document.activeElement)
    ) {
      const productElements = landCoverAndLandUseMapping.querySelectorAll(
        '.map-menu-product-dropdown',
      );
      productElements.forEach((productElement) => {
        const productId = productElement.getAttribute('productid');
        if (productId) {
          productIds.push(productId);
        }
      });
    }
    if (isCDSE) {
      let d =
        this.layers[elem.id]?.DatasetDownloadInformation ||
        this.layers[elem.id]?.datasetDownloadInformation ||
        this.layers[elem.id]?.dataset_download_information ||
        {};
      let byoc = d && d.items && d.items[0] ? d.items[0].byoc_collection : null;

      if (!byoc) {
        let parentId = elem.getAttribute('parentid');
        let datasetInput = document.getElementById(parentId);
        let datasetContainer = datasetInput
          ? datasetInput.closest('.map-menu-dataset-dropdown')
          : null;
        let datasetId = datasetContainer
          ? datasetContainer.getAttribute('datasetid')
          : null;
        if (datasetId && this.compCfg && Array.isArray(this.compCfg)) {
          for (let i = 0; i < this.compCfg.length; i++) {
            const comp = this.compCfg[i];
            if (!comp || !comp.Products) continue;
            for (let j = 0; j < comp.Products.length; j++) {
              const prod = comp.Products[j];
              if (!prod || !prod.Datasets) continue;
              for (let k = 0; k < prod.Datasets.length; k++) {
                const ds = prod.Datasets[k];
                if (ds && ds.DatasetId === datasetId) {
                  const info =
                    ds.dataset_download_information ||
                    ds.DatasetDownloadInformation ||
                    {};
                  if (info && info.items && info.items[0]) {
                    byoc = info.items[0].byoc_collection || byoc;
                  }
                  break;
                }
              }
            }
          }
        }
      }

      if (byoc && this.props.fetchCatalogApiDates) {
        let payload =
          this.props.catalogapi &&
          this.props.catalogapi.byoc &&
          this.props.catalogapi.byoc[byoc]
            ? this.props.catalogapi.byoc[byoc].data
            : null;
        if (!payload) {
          payload = await this.props.fetchCatalogApiDates(byoc, false);
        }
        const myExtent = await this.datasetFullExtentFromPayload(payload);
        if (myExtent) {
          this.view.goTo(myExtent);
          return;
        }
      }
      return;
    } else if (this.productId?.includes('333e4100b79045daa0ff16466ac83b7f')) {
      this.findDatasetBoundingBox(elem);

      BBoxes = this.parseBBOXJSON(this.dataBBox);
    } else if (
      this.productId?.includes('fe8209dffe13454891cea05998c8e456') ||
      this.productId?.includes('8914fde2241a4035818af8f0264fd55e')
    ) {
      if (
        this.layers[elem.id].fullExtents &&
        this.layers[elem.id].fullExtents !== null
      ) {
        this.view.goTo(this.layers[elem.id].fullExtents[0]);
      } else {
        let myExtent = new Extent({
          xmin: -20037508.342789,
          ymin: -20037508.342789,
          xmax: 20037508.342789,
          ymax: 20037508.342789,
          spatialReference: 3857,
        });
        this.view.goTo(myExtent);
      }
    } else if (this.url?.toLowerCase().endsWith('mapserver')) {
      BBoxes = await this.parseBBOXMAPSERVER(this.layers[elem.id]);
    } else if (this.url?.toLowerCase().includes('wms') || serviceLayer) {
      await this.getCapabilities(this.url, 'wms');
      BBoxes = this.parseBBOXWMS(this.xml);
    } else if (this.url?.toLowerCase().includes('wmts')) {
      await this.getCapabilities(this.url, 'wmts');
      BBoxes = this.parseBBOXWMTS(this.xml);
    }
    if (
      BBoxes &&
      BBoxes !== null &&
      BBoxes[Object.keys(BBoxes)[0]] &&
      BBoxes[Object.keys(BBoxes)[0]] !== null
    ) {
      if (
        this.extentInitiated === false &&
        !this.productId?.includes('333e4100b79045daa0ff16466ac83b7f') &&
        this.location.search !== ''
      ) {
        firstLayer = BBoxes.dataset;
      }
      if (productIds?.includes(this.productId)) {
        let str = elem.parentNode.outerHTML;
        let match = str.match(/layerid="([a-zA-Z0-9_:-]+)"/);
        let layerid = match ? match[1] : null;
        if (layerid === null || layerid === undefined) return;
        if (
          this.productId?.includes('130299ac96e54c30a12edd575eff80f7') &&
          layerid.length <= 2
        ) {
          if (this.url?.toLowerCase().endsWith('mapserver')) {
            switch (layerid) {
              case '1':
                firstLayer = this.findBBoxById(BBoxes, 13);
                break;
              case '2':
                firstLayer = this.findBBoxById(BBoxes, 12);
                break;
              case '3':
                firstLayer = this.findBBoxById(BBoxes, 11);
                break;
              case '4':
                firstLayer = this.findBBoxById(BBoxes, 10);
                break;
              case '5':
                firstLayer = this.findBBoxById(BBoxes, 9);
                break;
              case '7':
                firstLayer = this.findBBoxById(BBoxes, 7);
                break;
              case '8':
                firstLayer = this.findBBoxById(BBoxes, 6);
                break;
              case '9':
                firstLayer = this.findBBoxById(BBoxes, 5);
                break;
              case '10':
                firstLayer = this.findBBoxById(BBoxes, 4);
                break;
              case '11':
                firstLayer = this.findBBoxById(BBoxes, 3);
                break;
              case '12':
                firstLayer = this.findBBoxById(BBoxes, 0);
                break;
              case '13':
                firstLayer = this.findBBoxById(BBoxes, 1);
                break;
              default:
                return;
            }
          } else {
            if (layerid === '12' || layerid === '13') {
              firstLayer = BBoxes['dataset'];
            } else if (layerid === '1' || layerid === '7') {
              firstLayer = BBoxes[Object.keys(BBoxes)[0]];
            } else if (layerid === '2' || layerid === '8') {
              firstLayer = BBoxes[Object.keys(BBoxes)[1]];
            } else if (layerid === '3' || layerid === '9') {
              firstLayer = BBoxes[Object.keys(BBoxes)[2]];
            } else if (layerid === '4' || layerid === '10') {
              firstLayer = BBoxes[Object.keys(BBoxes)[3]];
            } else if (layerid === '5' || layerid === '11') {
              firstLayer = BBoxes[Object.keys(BBoxes)[4]];
            } else {
              firstLayer = BBoxes['dataset'];
            }
          }
        } else if (layerid.length > 2) {
          firstLayer = BBoxes[layerid];
        } else if (
          this.productId?.includes('333e4100b79045daa0ff16466ac83b7f')
        ) {
          firstLayer = BBoxes[0];
        }
      } else if (
        elem.id.includes('all_present') ||
        elem.id.includes('all_lcc') ||
        elem.id.includes('cop_klc') ||
        elem.id.includes('protected_areas')
      ) {
        firstLayer = BBoxes['all_present_lc_a_pol'];
      } else if (serviceLayer) {
        firstLayer = BBoxes['dataset'];
      } else {
        firstLayer = BBoxes[elem.attributes.layerid.value];
      }
      myExtent = new Extent({
        xmin: firstLayer.xmin,
        ymin: firstLayer.ymin,
        xmax: firstLayer.xmax,
        ymax: firstLayer.ymax,
      });
      if (
        this.extentInitiated === false &&
        (this.layers[elem.id].DatasetId ===
          '65f8eded11d94a1ba5540ceecaddd4e6' ||
          this.layers[elem.id].DatasetId === '40e056d02eed4c1fb2040cf0f06823df')
      ) {
        let myExtent = new Extent({
          xmin: -13478905.5678019,
          ymin: 23797904.386302948,
          xmax: 20538395.093334593,
          ymax: 11175665.272476234,
          spatialReference: 3857,
        });
        const targetCenter = myExtent.center;
        if (this.extentCenter) {
          const epsilon = 1e-3;
          const sameStoredCenter =
            Math.abs(this.extentCenter.x - targetCenter.x) < epsilon &&
            Math.abs(this.extentCenter.y - targetCenter.y) < epsilon;
          if (sameStoredCenter) {
            if (this.toggleHotspotWidget.view.zoom !== 3) {
              this.view.zoom = 3;
              this.setState({}); // Force re-render
              return;
            } else {
              this.extentInitiated = true;
              return;
            }
          }
        }
        this.view.goTo({ center: targetCenter, zoom: 3 });
        this.extentCenter = { x: targetCenter.x, y: targetCenter.y };
        this.extentInitiated = true;
      } else {
        this.view.goTo(myExtent);
      }
    }
    this.url = null;
  }
  /**
   * Method to show Active Layers of the map
   * @param {*} elem From the click event
   */
  addActiveLayer(elem, order, fromDownload, hideCalendar) {
    return (
      <div
        className="active-layer"
        id={'active_' + elem.id}
        key={'a_' + elem.id}
        layer-id={elem.id}
        layer-order={order}
        draggable="true"
        {...(elem.hide && { style: { display: 'none' } })}
        onDrop={(e) => this.onDrop(e)}
        onDragOver={(e) => this.onDragOver(e)}
        onDragStart={(e) => this.onDragStart(e)}
      >
        <div className="active-layer-name" name={elem.id} key={'b_' + elem.id}>
          {elem.title}
        </div>
        <div className="active-layer-options" key={'c_' + elem.id}>
          {elem.parentElement.dataset.timeseries === 'true' && (
            <span
              className="map-menu-icon active-layer-time"
              onClick={(e) => {
                e.isTrusted
                  ? this.showTimeSlider(elem)
                  : this.showTimeSlider(elem, true);
              }}
              onKeyDown={(e) => {
                e.isTrusted
                  ? this.showTimeSlider(elem)
                  : this.showTimeSlider(elem, true);
              }}
              tabIndex="0"
              role="button"
              data-download={fromDownload ? true : false}
            >
              <Popup
                trigger={<FontAwesomeIcon icon={this.timeLayers[elem.id]} />}
                content={
                  this.timeLayers[elem.id][1] === 'clock'
                    ? 'Show time slider'
                    : 'Hide time slider'
                }
                {...popupSettings}
              />
            </span>
          )}
          <span
            className="map-menu-icon active-layer-extent"
            onClick={() => this.fullExtent(elem)}
            onKeyDown={() => this.fullExtent(elem)}
            tabIndex="0"
            role="button"
          >
            <Popup
              trigger={<FontAwesomeIcon icon={['fas', 'expand-arrows-alt']} />}
              content="Full extent"
              {...popupSettings}
            />
          </span>
          <span
            className="map-menu-icon active-layer-opacity"
            onClick={(e) => this.showOpacity(elem, e)}
            onKeyDown={(e) => this.showOpacity(elem, e)}
            tabIndex="0"
            role="button"
            data-opacity="100"
          >
            <Popup
              trigger={<FontAwesomeIcon icon={['fas', 'sliders-h']} />}
              content="Opacity"
              {...popupSettings}
            />
          </span>
          <span
            className="map-menu-icon active-layer-hide"
            onClick={() => this.eyeLayer(elem)}
            onKeyDown={() => this.eyeLayer(elem)}
            tabIndex="0"
            role="button"
          >
            <Popup
              trigger={<FontAwesomeIcon icon={this.visibleLayers[elem.id]} />}
              content={
                this.visibleLayers[elem.id] &&
                this.visibleLayers[elem.id][1] === 'eye'
                  ? 'Hide layer'
                  : 'Show layer'
              }
              {...popupSettings}
            />
          </span>
          <span
            className="map-menu-icon active-layer-delete"
            onClick={() => this.deleteCrossEvent(elem)}
            onKeyDown={() => this.deleteCrossEvent(elem)}
            tabIndex="0"
            role="button"
          >
            <Popup
              trigger={<FontAwesomeIcon icon={['fas', 'times']} />}
              content="Remove layer"
              {...popupSettings}
            />
          </span>
          {this.timeLayers[elem.id][1] === 'stop' &&
            this.renderTimeslider(
              elem,
              this.layers[elem.id],
              fromDownload,
              hideCalendar,
            )}
        </div>
      </div>
    );
  }

  /**
   * Behavior for drag-and-drop of active layers
   * when dropping a layer upon another
   * @param {*} e
   * @returns
   */
  onDrop(e) {
    let dst = e.target.closest('div.active-layer');
    if (dst === this.draggingElement) return;
    let id = dst.id.split('_').slice(-4).join('_');
    //First, we decide how to insert the element in the DOM
    let init_ord = this.draggingElement.getAttribute('layer-order');
    let dst_ord = dst.getAttribute('layer-order');

    if (init_ord > dst_ord) {
      dst.parentElement.insertBefore(this.draggingElement, dst.nextSibling);
    } else {
      dst.parentElement.insertBefore(this.draggingElement, dst);
    }

    if (!this.state.draggedElements.includes(id)) {
      this.setState({ draggedElements: [...this.state.draggedElements, id] });
    }
    this.layersReorder();
    this.saveLayerOrder();
  }

  /**
   * Reorders the layers depending on the state of active layers panel
   * @returns
   */
  layersReorder() {
    let activeLayers = document.querySelectorAll('.active-layer');
    let counter = activeLayers.length - 1;
    let filterLayer;
    activeLayers.forEach((item, index) => {
      if (
        this.props.hotspotData &&
        this.props.hotspotData.filteredLayers &&
        Object.keys(this.props.hotspotData.filteredLayers).length > 0
      ) {
        Object.keys(this.props.hotspotData.activeLayers).forEach((key) => {
          if (item.id.includes(key)) {
            if (key.includes('all_lcc')) {
              filterLayer = this.layers['lcc_filter'];
            } else if (key.includes('all_present')) {
              filterLayer = this.layers['lc_filter'];
            }
          }
          this.map.reorder(filterLayer, index);
        });
      }
      let order = counter - index;
      item.setAttribute('layer-order', order);
      if (filterLayer === undefined) {
        this.layerReorder(this.layers[item.getAttribute('layer-id')], order);
      } else {
        this.layerReorder(filterLayer, order);
      }
    });
  }

  /**
   * Saves the order of the active layers to sessionStorage
   */
  saveLayerOrder() {
    if (this.props.download) return;
    let activeLayers = document.querySelectorAll('.active-layer');
    let newLayerOrder = [];
    for (let i = 0; i < activeLayers.length; i++) {
      newLayerOrder.unshift(activeLayers[i].getAttribute('layer-id'));
    }
    sessionStorage.setItem('checkedLayers', JSON.stringify(newLayerOrder));
    window.dispatchEvent(new Event('storage'));
  }

  /**
   * Assigns an index to a layer
   * (depending on its position on active layers panel)
   * @param {*} layer
   * @param {*} index
   */
  layerReorder(layer, index) {
    this.map.reorder(layer, index);
  }

  /**
   * Needed to get the desired drag-and-drop behavior
   * @param {*} e
   */
  onDragOver(e) {
    e.preventDefault();
  }

  /**
   * Needed to get the desired drag-and-drop behavior
   * @param {*} e
   */
  onDragStart(e) {
    this.draggingElement = e.target;
  }

  /**
   * Method for granularity
   */
  getGroup(elem) {
    for (var i in this.layerGroups) {
      if (
        this.layerGroups[i].includes(elem.getAttribute('layerid')) &&
        elem.closest("[datasetid='" + i + "']")
      )
        return i;
    }
    return null;
  }
  getGroupLayers(group) {
    let layers;
    if (group) {
      layers = document
        .querySelector('[datasetid="' + group + '"] input')
        .getAttribute('defcheck')
        .split(',');
    } else {
      layers = '';
    }
    return layers;
  }

  /**
   * Method to show/hide time slider
   * @param {*} e From the click event
   * @param {*} id id from elem
   */

  showTimeSlider(elem, fromDownload, hideCalendar) {
    if (!elem) return;
    if (!this.timeLayers) this.timeLayers = {};
    if (!this.visibleLayers) this.visibleLayers = {};
    if (!this.timeLayers[elem.id]) this.timeLayers[elem.id] = ['far', 'clock'];
    if (!this.visibleLayers[elem.id]) {
      this.visibleLayers[elem.id] = ['fas', 'eye'];
    }
    if (
      sessionStorage.key('timeSliderTag') &&
      sessionStorage.getItem('timeSliderTag') === 'true'
    )
      this.setSliderTag(false);
    else this.setSliderTag(true);
    let activeLayers = document.querySelectorAll('.active-layer');
    let group = this.getGroup(elem);
    let groupLayers = this.getGroupLayers(group);
    if (this.timeLayers[elem.id][1] === 'clock') {
      activeLayers.forEach((layer) => {
        let layerId = layer.getAttribute('layer-id');
        let order = this.activeLayersJSON[elem.id]?.props?.['layer-order'] || 0;
        if (groupLayers && groupLayers.includes(layerId)) {
          elem = document.getElementById(layerId);
        }
        if (elem && elem.id === layerId) {
          this.timeLayers[elem.id] = ['fas', 'stop'];
          if (
            !this.visibleLayers[elem.id] ||
            this.visibleLayers[elem.id][1] === 'eye-slash'
          ) {
            if (this.layers[elem.id]) this.layers[elem.id].visible = true;
            this.visibleLayers[elem.id] = ['fas', 'eye'];
          }
          document
            .querySelectorAll(
              '.active-layer[layer-id="' +
                elem.id +
                '"] .map-menu-icon:not(.active-layer-time)',
            )
            .forEach((item) => {
              item.classList.add('locked');
            });
          if (document.querySelector('#products_label'))
            document.querySelector('#products_label').classList.add('locked');
          if (document.querySelector('#map_remove_layers')) {
            const mapRemoveBtn = document.querySelector('#map_remove_layers');
            if (mapRemoveBtn) mapRemoveBtn.classList.add('locked');
          }
          if (this.props.download && document.querySelector('#download_label'))
            document.querySelector('#download_label').classList.add('locked');
          this.activeLayersJSON[elem.id] = this.addActiveLayer(
            elem,
            order,
            fromDownload,
            hideCalendar,
          );
        } else {
          const node = document.getElementById(layerId);
          if (
            node &&
            node.parentElement &&
            node.parentElement.dataset &&
            node.parentElement.dataset.timeseries === 'true'
          ) {
            if (!this.visibleLayers[layerId]) {
              this.visibleLayers[layerId] = ['fas', 'eye'];
            }
            if (this.visibleLayers[layerId][1] === 'eye') {
              if (this.layers[layerId]) this.layers[layerId].visible = false;
              this.visibleLayers[layerId] = ['fas', 'eye-slash'];
            }
            const activeNode = document.querySelector(
              '.active-layer[layer-id="' + layerId + '"]',
            );
            if (activeNode) activeNode.classList.add('locked');
          }
          this.activeLayersJSON[layerId] = this.addActiveLayer(
            document.getElementById(layerId),
            order,
            fromDownload,
          );
        }
      });
      const op = document.querySelector('.opacity-panel');
      if (op && op.style.display === 'block') {
        this.closeOpacity();
      }
    } else {
      activeLayers.forEach((layer) => {
        let layerId = layer.getAttribute('layer-id');
        let order = this.activeLayersJSON[elem.id]?.props?.['layer-order'] || 0;
        if (groupLayers && groupLayers.includes(layerId)) {
          elem = document.getElementById(layerId);
        }
        if (elem && elem.id === layerId) {
          this.timeLayers[elem.id] = ['far', 'clock'];
          this.activeLayersJSON[elem.id] = this.addActiveLayer(
            elem,
            order,
            fromDownload,
          );
          document
            .querySelectorAll(
              '.active-layer[layer-id="' +
                elem.id +
                '"] .map-menu-icon:not(.active-layer-time)',
            )
            .forEach((item) => {
              item.classList.remove('locked');
            });
          const productsLabel = document.querySelector('#products_label');
          if (productsLabel) productsLabel.classList.remove('locked');
          const removeBtn = document.querySelector('#map_remove_layers');
          if (removeBtn) removeBtn.classList.remove('locked');
          if (this.props.download) {
            const dl = document.querySelector('#download_label');
            if (dl) dl.classList.remove('locked');
            const timeIcon = document.querySelector(
              '.active-layer[layer-id="' +
                elem.id +
                '"] .map-menu-icon.active-layer-time',
            );
            if (timeIcon && timeIcon.dataset.download === 'true') {
              const dlBtn = document.getElementById('download_label');
              if (dlBtn) dlBtn.click();
            }
          } else {
            const timeIcon = document.querySelector(
              '.active-layer[layer-id="' +
                elem.id +
                '"] .map-menu-icon.active-layer-time',
            );
            if (timeIcon && timeIcon.dataset.download === 'true') {
              const prBtn = document.getElementById('products_label');
              if (prBtn) prBtn.click();
            }
          }
          const ts = document.querySelector('.timeslider-container');
          if (ts && document.contains(ts))
            ReactDOM.unmountComponentAtNode(
              document.querySelector('.esri-ui-bottom-right'),
            );
          const warn = document.querySelector('.drawRectanglePopup-block');
          if (warn) warn.style.display = 'block';
        } else {
          if (!this.visibleLayers[layerId]) {
            this.visibleLayers[layerId] = ['fas', 'eye'];
          }
          if (this.visibleLayers[layerId][1] === 'eye-slash') {
            if (this.layers[layerId]) this.layers[layerId].visible = true;
            this.visibleLayers[layerId] = ['fas', 'eye'];
            this.activeLayersJSON[layerId] = this.addActiveLayer(
              document.getElementById(layerId),
              order,
              fromDownload,
            );
          }
          const activeNode = document.querySelector(
            '.active-layer[layer-id="' + layerId + '"]',
          );
          if (activeNode) activeNode.classList.remove('locked');
        }
      });
    }
    this.setState({});
  }

  checkInfoWidget() {
    let layers = [];
    Object.keys(this.activeLayersJSON).forEach((key) => {
      let layer = this.layers[key];
      if (layer.visible) {
        layers.push(layer);
      }
    });
    if (layers.length === 0 && document.querySelector('.info-container')) {
      if (
        this.props.view.graphics.items.find((a) => {
          return a.attributes ? a.attributes.id === 'pixel-info' : false;
        })
      ) {
        let marker = this.props.view.graphics.items.find((a) => {
          return a.attributes && a.attributes.id === 'pixel-info';
        });
        this.props.view.graphics.remove(marker);
      }
      if (
        this.props.mapViewer.activeWidget?.container.current.className ===
        'info-container esri-component'
      ) {
        this.props.mapViewer.activeWidget.setState({
          showMapMenu: false,
          pixelInfo: false,
          popup: false,
        });
        this.props.mapViewer.setActiveWidget();
        let rightPanels = document.querySelectorAll('.right-panel');
        rightPanels.forEach((panel) => {
          if (
            panel.parentElement.className === 'info-container esri-component'
          ) {
            panel.style.display = 'none';
          }
        });
        document
          .querySelector('.esri-icon-description')
          .classList.remove('active-widget');
        document
          .querySelector('.esri-ui-top-right.esri-ui-corner')
          .classList.remove('show-panel');
      }
      document.querySelector('.info-container').style.display = 'none';
    } else if (layers.length > 0) {
      document.querySelector('.info-container').style.display = 'flex';
    }
  }

  getLayerTitle(layer) {
    let title;
    if (layer.url.toLowerCase().includes('wmts')) {
      // CLMS-1105
      title = layer._wmtsTitle;
    } else {
      if (layer.sublayers) {
        title = layer.sublayers.items[0].title;
      } else if (layer.activeLayer) {
        title = layer.activeLayer.title;
      } else {
        title = layer.title;
      }
    }
    return title;
  }

  /**
   * Method to set layer opacity
   * @param {*} elem From the input
   * @param {*} e From the click event
   */
  showOpacity(elem, e) {
    let opacity = e.currentTarget.dataset.opacity;
    document.querySelector('.opacity-slider input').value = opacity;
    document.querySelector('.opacity-panel').style.display = 'block';
    let left = e.currentTarget.offsetLeft + 48;
    document.querySelector('.opacity-panel').style.left = left + 'px';
    let top =
      document.querySelector('.tabs').offsetHeight +
      15 -
      document.querySelector('.panels').scrollTop +
      e.currentTarget.closest('.active-layer').offsetTop +
      e.currentTarget.closest('.active-layer').offsetHeight / 2 -
      document.querySelector('.opacity-panel').offsetHeight / 2;
    document.querySelector('.opacity-panel').style.top = top + 'px';
    document.querySelector('.opacity-slider input').dataset.layer = elem.id;
    e.stopPropagation();
    this.hideOnClickOutsideOpacity();
  }

  setOpacity() {
    let layer = document.querySelector('.opacity-slider input').dataset.layer;
    let value = document.querySelector('.opacity-panel input').value;

    if (this.layers['lcc_filter'] && layer.includes('all_lcc')) {
      this.layers['lcc_filter'].opacity = value / 100;
      this.saveOpacity(this.layers['lcc_filter'], value / 100);
    } else if (this.layers['lc_filter'] && layer.includes('all_present')) {
      this.layers['lc_filter'].opacity = value / 100;
      this.saveOpacity(this.layers['lc_filter'], value / 100);
    } else if (this.layers['klc_filter'] && layer.includes('cop_klc')) {
      this.layers['klc_filter'].opacity = value / 100;
      this.saveOpacity(this.layers['klc_filter'], value / 100);
    } else if (this.layers['pa_filter'] && layer.includes('protected_areas')) {
      this.layers['pa_filter'].opacity = value / 100;
      this.saveOpacity(this.layers['pa_filter'], value / 100);
    }
    this.layers[layer].opacity = value / 100;
    this.saveOpacity(layer, value / 100);
    if (
      this.map.findLayerById(layer) &&
      this.map.findLayerById(layer) !== null &&
      (this.map.findLayerById(layer).opacity ||
        this.map.findLayerById(layer).opacity === 0)
    ) {
      this.map.findLayerById(layer).opacity = value / 100;
    }
    document.querySelector(
      '.active-layer[layer-id="' + layer + '"] .active-layer-opacity',
    ).dataset.opacity = value;
    // }
    setTimeout(() => {
      this.setLegendOpacity();
    }, 100);
  }

  waitForDataFill(obj) {
    while (obj.length === 0) {
      new Promise((resolve) => setTimeout(resolve, 100)); // wait for 100ms
    }
    return obj;
  }

  setLegendOpacity() {
    let collection = document.getElementsByClassName('esri-legend__symbol');

    Array.prototype.forEach.call(collection, function (element) {
      let img = {};

      if (element.hasChildNodes()) {
        img = element.childNodes[0];
      } else {
        img = element;
      }
      // Set Legend opacity back to 1;
      if (img && Object.keys(img).length !== 0) {
        img.setAttribute(
          'style',
          'opacity:1; -moz-opacity:1; filter:alpha(opacity=100)',
        );
      }
    });
  }

  /**
   * Saves the layer opacity to sessionStorage
   * @param {*} layer The layer in question
   * @param {*} value The opacity value retrieved from the input
   */
  saveOpacity(layer, value) {
    if (this.props.download) return;

    // Resolve layer id from string or layer object
    let layerId = typeof layer === 'string' ? layer : null;
    if (!layerId && layer && typeof layer === 'object') {
      let lid = null;
      if (layer.id) {
        lid = layer.id;
      } else if (layer.LayerId) {
        lid = layer.LayerId;
      } else if (layer.layer && layer.layer.id) {
        lid = layer.layer.id;
      }
      layerId = lid;
    }
    if (!layerId) return;

    // Update sessionStorage
    let layerOpacities = JSON.parse(sessionStorage.getItem('layerOpacities'));
    if (layerOpacities === null) {
      layerOpacities = {};
    }
    layerOpacities[layerId] = value;
    sessionStorage.setItem('layerOpacities', JSON.stringify(layerOpacities));

    // Persist basic layer information (metadata + current opacity + visibility)
    try {
      let layersInfo = JSON.parse(sessionStorage.getItem('layersInfo'));
      if (layersInfo === null) layersInfo = {};
      if (this.layers && this.layers[layerId]) {
        const l = this.layers[layerId];
        layersInfo[layerId] = {
          id: layerId,
          title: l.title || l.DatasetTitle || l.LayerTitle || '',
          DatasetId: l.DatasetId || '',
          ViewService: l.ViewService || l.url || '',
          type: l.type || '',
          opacity: value,
          visible: !!l.visible,
        };
        sessionStorage.setItem('layersInfo', JSON.stringify(layersInfo));
      }
    } catch (e) {}

    // Mirror into user-specific localStorage blob for persistence across sessions
    try {
      const userKey = this.userID ? 'user_' + this.userID : 'user_anonymous';
      const existing = localStorage.getItem(userKey);
      const storeObj = existing ? JSON.parse(existing) : {};
      storeObj['layerOpacities'] = JSON.stringify(layerOpacities);
      if (sessionStorage.getItem('layersInfo')) {
        storeObj['layersInfo'] = sessionStorage.getItem('layersInfo');
      }
      localStorage.setItem(userKey, JSON.stringify(storeObj));
    } catch (e) {}

    // Save to localStorage for user service layers
    const savedServices = JSON.parse(
      localStorage.getItem(USER_SERVICES_KEY + '_' + this.userID),
    );

    if (savedServices && Array.isArray(savedServices)) {
      let servicesUpdated = false;

      // Update opacity for matching layer in user services
      savedServices.forEach((service) => {
        if (service.LayerId === layerId) {
          service.opacity = value;
          servicesUpdated = true;
        }
      });

      // Only save if we made changes
      if (servicesUpdated) {
        localStorage.setItem(
          USER_SERVICES_KEY + '_' + this.userID,
          JSON.stringify(savedServices),
        );
      }
    }
  }

  /**
   * Loads a previously configured layer opacity from sessionStorage and applies it to the map and input element
   * @param {*} layer The layer in question
   * @param {*} value The opacity value retrieved from the input
   */
  loadOpacity() {
    let layerOpacities =
      JSON.parse(sessionStorage.getItem('layerOpacities')) || {};

    // Load from localStorage for user service layers
    const savedUserServices = JSON.parse(
      localStorage.getItem(USER_SERVICES_KEY + '_' + this.userID),
    );

    // Import opacity values from user services if not already in session storage
    if (savedUserServices && Array.isArray(savedUserServices)) {
      savedUserServices.forEach((service) => {
        const layerId = service.LayerId;
        const opacity = service.opacity;

        // If this layer's opacity isn't in session storage yet, add it
        if (
          layerId &&
          opacity !== undefined &&
          layerOpacities[layerId] === undefined
        ) {
          layerOpacities[layerId] = opacity;
        }
      });
    }
    //save layerOpacities to sessionStorage
    sessionStorage.setItem('layerOpacities', JSON.stringify(layerOpacities));
    // Apply opacity values to layers and UI
    for (const layerId in layerOpacities) {
      if (this.layers[layerId]) {
        const value = layerOpacities[layerId];

        // Set opacity on the map layer
        this.layers[layerId].opacity = value;

        // Update UI opacity slider
        const node = document.querySelector(
          `.active-layer[layer-id="${layerId}"] .active-layer-opacity`,
        );
        if (node) {
          node.dataset.opacity = value * 100;
        }
      }
    }
  }

  closeOpacity() {
    document.querySelector('.opacity-panel').style.display = '';
    document.querySelector('.opacity-panel input').dataset.layer = '';
  }

  closetouchScreenPopup() {
    document.querySelector('.touchScreenPopup-panel').style.display = 'none';
  }

  /**
   * Method to show/hide layer from "Active Layers"
   * @param {*} e From the click event
   * @param {*} id id from elem
   */
  eyeLayer(elem) {
    // Check if this is a user service layer
    const isUserServiceLayer = this.state.wmsUserServiceLayers.some(
      (layer) => layer.LayerId === elem.id,
    );
    this.url = this.layers[elem.id]?.url;
    const isCDSE =
      !!this.url &&
      ['/ogc/', '/cdse/'].some((s) => this.url.toLowerCase().includes(s));

    // Only call findCheckedDataset for non-service layers (this method looks for parent datasets)
    if (!isUserServiceLayer) {
      this.findCheckedDataset(elem);
    }
    if (
      !this.visibleLayers[elem.id] ||
      this.visibleLayers[elem.id][1] === 'eye'
    ) {
      this.layers[elem.id].visible = false;
      this.visibleLayers[elem.id] = ['fas', 'eye-slash'];
      if (this.layers['lcc_filter'] && elem.id.includes('all_lcc')) {
        this.map.remove(this.layers['lcc_filter']);
        this.layers['lcc_filter'].visible = false;
      } else if (this.layers['lc_filter'] && elem.id.includes('all_present')) {
        this.map.remove(this.layers['lc_filter']);
        this.layers['lc_filter'].visible = false;
      } else if (this.layers['klc_filter'] && elem.id.includes('cop_klc')) {
        this.map.remove(this.layers['klc_filter']);
        this.layers['klc_filter'].visible = false;
      } else if (
        this.layers['pa_filter'] &&
        elem.id.includes('protected_areas')
      ) {
        this.map.remove(this.layers['pa_filter']);
        this.layers['pa_filter'].visible = false;
      }
    } else {
      if (this.layers['lcc_filter'] && elem.id.includes('all_lcc')) {
        this.map.add(this.layers['lcc_filter']);
        this.layers['lcc_filter'].visible = true;
      } else if (this.layers['lc_filter'] && elem.id.includes('all_present')) {
        this.map.add(this.layers['lc_filter']);
        this.layers['lc_filter'].visible = true;
      } else if (this.layers['klc_filter'] && elem.id.includes('cop_klc')) {
        this.map.add(this.layers['klc_filter']);
        this.layers['klc_filter'].visible = true;
      } else if (
        this.layers['pa_filter'] &&
        elem.id.includes('protected_areas')
      ) {
        this.map.add(this.layers['pa_filter']);
        this.layers['pa_filter'].visible = true;
      } else {
        this.map.add(this.layers[elem.id]);
        this.layers[elem.id].visible = true;
      }
      this.visibleLayers[elem.id] = ['fas', 'eye'];
    }

    if (
      !isCDSE &&
      !isUserServiceLayer &&
      this.productId &&
      this.productId.includes('333e4100b79045daa0ff16466ac83b7f')
    ) {
      // global dynamic land cover
      if (this.visibleLayers[elem.id][1] === 'eye-slash') {
        this.map.findLayerById(elem.id).visible = false;
      } else {
        let layerOpacities = JSON.parse(
          sessionStorage.getItem('layerOpacities'),
        );
        if (
          layerOpacities &&
          layerOpacities !== null &&
          (layerOpacities[elem.id] || layerOpacities[elem.id] === 0)
        ) {
          this.map.findLayerById(elem.id).opacity = layerOpacities[elem.id];
        }
      }
    }
    this.saveVisibility();
    this.activeLayersJSON[elem.id] = this.addActiveLayer(elem, 0);
    this.layersReorder();
    this.saveLayerOrder();
    this.checkInfoWidget();
    this.toggleCustomLegendItem(this.layers[elem.id]);
    this.setState({});
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.download) return;

    if (prevProps.userServiceUrl !== this.props.userServiceUrl) {
      const {
        userServiceUrl,
        userServiceType,
        userServiceSelection,
      } = this.props;
      if (
        userServiceUrl &&
        typeof userServiceUrl === 'string' &&
        userServiceUrl !== ''
      ) {
        this.handleNewMapServiceLayer(
          userServiceUrl,
          userServiceType,
          userServiceSelection,
        );
      }
    }

    if (prevState.wmsUserServiceLayers !== this.state.wmsUserServiceLayers) {
      this.createUserServices(this.state.wmsUserServiceLayers);
      setTimeout(() => {
        const checkedLayers =
          JSON.parse(sessionStorage.getItem('checkedLayers')) || [];

        // For each valid layer that was previously checked, make it visible
        this.state.wmsUserServiceLayers.forEach((layer) => {
          if (checkedLayers.includes(layer.LayerId)) {
            const node = document.getElementById(layer.LayerId);
            if (node) {
              node.checked = true;
              this.toggleLayer(node);
            }
          }
        });
      }, 0);
    }
    let url = new URL(window.location.href);
    let product = url.searchParams.get('product');
    let dataset = url.searchParams.get('dataset');
    if (
      this.state.wmsUserServiceLayers.length > 0 &&
      prevState.wmsUserServiceLayers.length === 0
    ) {
      // Close other tabs and open "My Services" tab
      let dropdownsMapMenu = document.querySelectorAll('.map-menu-dropdown');
      let i = dropdownsMapMenu.length - 1;
      // let j = 0;
      let dropdownId = 'dropdown_' + i;
      // let myServicesId = 'component_' + i;
      // let mapMenuServiceDropdownId = 'product_' + i + '_' + j;
      if (!(product || dataset)) {
        dropdownsMapMenu.forEach((dropdown) => {
          if (dropdown.id !== dropdownId) {
            dropdown
              .querySelector('.ccl-expandable__button')
              .setAttribute('aria-expanded', 'false');
          }
        });
      }

      document.getElementById(dropdownId).setAttribute('aria-expanded', 'true');
    }

    if (sessionStorage.getItem('snowAndIce') === 'true') {
      //grab all checkedLayers from sessionstorage store them in checkedLayeers
      let checkedLayers = JSON.parse(sessionStorage.getItem('checkedLayers'));

      if (checkedLayers === null) return;
    }
    const latestLayer = JSON.parse(sessionStorage.getItem('TMSLayerObj'));

    if (latestLayer && BaseTileLayer) {
      this.view.when(() => {
        if (this.view.stationary) {
          const { layer, checkboxId, dataset } = latestLayer;
          this.processTMSLayer(checkboxId, layer, dataset);
        }
      });
    } else if (latestLayer) {
      // If we have a layer but BaseTileLayer isn't loaded yet, wait for it
      this.loader().then(() => {
        this.view.when(() => {
          if (this.view.stationary) {
            const { layer, checkboxId, dataset } = latestLayer;
            this.processTMSLayer(checkboxId, layer, dataset);
          }
        });
      });
    }
    this.setLegendOpacity();
    this.loadOpacity();
    if (
      prevProps.hotspotData !== this.props.hotspotData ||
      !this._visibilityInitialized
    ) {
      this.loadVisibility();
      this._visibilityInitialized = true;
    }
  }

  /**
   * Saves the layer visibility (eye icon state) to sessionStorage
   */
  saveVisibility() {
    if (this.props.download) return;

    // Get services from localStorage - it's an array of objects
    const savedServices = JSON.parse(
      localStorage.getItem(USER_SERVICES_KEY + '_' + this.userID),
    );

    if (savedServices && Array.isArray(savedServices)) {
      let servicesUpdated = false;

      // Update visibility state for each service in the array
      savedServices.forEach((service) => {
        const layerId = service.LayerId;
        if (layerId && this.visibleLayers[layerId]) {
          // Update visibility based on eye icon state
          service.visibility =
            this.visibleLayers[layerId][1] === 'eye' ? true : false;
          servicesUpdated = true;
        }
      });

      // Only save if we made changes
      if (servicesUpdated) {
        localStorage.setItem(
          USER_SERVICES_KEY + '_' + this.userID,
          JSON.stringify(savedServices),
        );
      }
    }
    sessionStorage.setItem('visibleLayers', JSON.stringify(this.visibleLayers));
  }

  /**
   * Loads the layer visibility (eye icon state) from sessionStorage
   */
  loadVisibility() {
    if (this.props.download) return;

    let hasChanges = false;

    // Load visibility settings from sessionStorage
    let vl = JSON.parse(sessionStorage.getItem('visibleLayers'));
    if (vl) {
      this.visibleLayers = vl;
    } else {
      this.visibleLayers = {};
    }

    // Load visibility settings from saved user services in localStorage
    const savedUserServices = JSON.parse(
      localStorage.getItem(USER_SERVICES_KEY + '_' + this.userID),
    );

    if (savedUserServices && Array.isArray(savedUserServices)) {
      savedUserServices.forEach((service) => {
        const layerId = service.LayerId;
        // Check if visibility is explicitly defined (could be true, false, or undefined)
        if (
          layerId &&
          this.visibleLayers[layerId] === undefined &&
          service.visibility !== undefined
        ) {
          // Set visible icon based on saved visibility boolean value
          this.visibleLayers[layerId] =
            service.visibility === true ? ['fas', 'eye'] : ['fas', 'eye-slash'];
          hasChanges = true;
        }
      });
    }
    //add this.visibleLayers to session storage
    sessionStorage.setItem('visibleLayers', JSON.stringify(this.visibleLayers));
    for (const key in this.visibleLayers) {
      if (this.layers[key]) {
        // Set layer visibility based on eye/eye-slash
        const shouldBeVisible = this.visibleLayers[key][1] === 'eye';
        this.layers[key].visible = shouldBeVisible;

        // Update the active layer UI if it exists
        let elem = document.getElementById(key);
        if (elem && this.activeLayersJSON[key]) {
          // Get the current order of the active layer
          let order = this.activeLayersJSON[key].props['layer-order'];

          // Force recreate the active layer component with the correct visibility state
          this.activeLayersJSON[key] = this.addActiveLayer(elem, order);

          // Update related UI
          this.layersReorder();
          this.checkInfoWidget();
          this.toggleCustomLegendItem(this.layers[key]);
          hasChanges = true;
        }
      }
    }

    // Only update state once if there were changes
    if (hasChanges) {
      this.setState({});
    }
  }

  /**
   * Method to delete layer from "Active Layers" and uncheck dataset and products
   * @param {*} e From the click event
   * @param {*} id id from elem
   */
  deleteCrossEvent(elem) {
    elem.checked = false;
    this.toggleLayer(elem);
    delete this.activeLayersJSON[elem.id];
    // }
    this.setState({});
  }

  /**
   * Method to remove all active layers
   */
  removeAllLayers() {
    let activeLayers = document.querySelectorAll('.active-layer');
    activeLayers.forEach((layer) => {
      let layerId = layer.getAttribute('layer-id');
      let elem = document.getElementById(layerId);
      this.deleteCrossEvent(elem);
      if (
        this.state.wmsUserServiceLayers ||
        this.state.wmsUserServiceLayers.length > 0
      ) {
        this.setState({ wmsUserServiceLayers: [] });
      }
    });
  }

  /**
   * Method to save checked layers
   */
  saveCheckedLayer(layer) {
    if (this.props.download) return;

    // Update sessionStorage as before
    let checkedLayers = JSON.parse(sessionStorage.getItem('checkedLayers'));
    if (checkedLayers === null) {
      checkedLayers = [layer];
      sessionStorage.setItem('checkedLayers', JSON.stringify(checkedLayers));
    } else {
      if (!checkedLayers.includes(layer)) {
        checkedLayers.unshift(layer);
      }
      sessionStorage.setItem('checkedLayers', JSON.stringify(checkedLayers));
    }
    window.dispatchEvent(new Event('storage'));

    // Also update localStorage for user service layers
    const savedServices = JSON.parse(
      localStorage.getItem(USER_SERVICES_KEY + '_' + this.userID),
    );

    if (savedServices && Array.isArray(savedServices)) {
      let servicesUpdated = false;

      // Update checked state for matching layer in user services
      savedServices.forEach((service) => {
        if (service.LayerId === layer) {
          service.checked = true;
          servicesUpdated = true;
        }
      });

      // Only save if we made changes
      if (servicesUpdated) {
        localStorage.setItem(
          USER_SERVICES_KEY + '_' + this.userID,
          JSON.stringify(savedServices),
        );
      }
    }
  }

  /**
   * Method to delete checked layers from sessionStorage
   * @param {String} layer the layer id
   */
  deleteCheckedLayer(layer) {
    let checkedLayers = JSON.parse(sessionStorage.getItem('checkedLayers'));
    if (checkedLayers) {
      for (var i = 0; i < checkedLayers.length; i++) {
        if (checkedLayers[i] === layer) {
          checkedLayers.splice(i, 1);
        }
      }
      sessionStorage.setItem('checkedLayers', JSON.stringify(checkedLayers));
      window.dispatchEvent(new Event('storage'));
    }

    // delete layer opacity
    let layerOpacities = JSON.parse(sessionStorage.getItem('layerOpacities'));
    if (layerOpacities) {
      if (layerOpacities[layer]) {
        delete layerOpacities[layer];
        sessionStorage.setItem(
          'layerOpacities',
          JSON.stringify(layerOpacities),
        );
      }
    }

    // delete layer visibility
    let visibleLayers = JSON.parse(sessionStorage.getItem('visibleLayers'));
    if (visibleLayers) {
      if (visibleLayers[layer]) {
        delete visibleLayers[layer];
        sessionStorage.setItem('visibleLayers', JSON.stringify(visibleLayers));
      }
    }

    // Also update localStorage for user service layers
    const savedServices = JSON.parse(
      localStorage.getItem(USER_SERVICES_KEY + '_' + this.userID),
    );

    if (savedServices && Array.isArray(savedServices)) {
      let servicesUpdated = false;

      // Update checked state for matching layer in user services
      savedServices.forEach((service) => {
        if (service.LayerId === layer) {
          service.checked = false;
          servicesUpdated = true;
        }
      });

      // Only save if we made changes
      if (servicesUpdated) {
        localStorage.setItem(
          USER_SERVICES_KEY + '_' + this.userID,
          JSON.stringify(savedServices),
        );
      }
    }
  }

  deleteFilteredLayer(layer) {
    if (
      !(
        layer.includes('all_lcc') ||
        layer.includes('all_present') ||
        layer.includes('cop_klc') ||
        layer.includes('protected_areas')
      )
    )
      return;
    let filterLayer;
    //let temp;
    let updatedHotspotData = this.props.hotspotData;
    let updatedFilteredLayers = this.props.hotspotData['filteredLayers'];
    if (this.layers['lcc_filter'] && layer.includes('all_lcc')) {
      this.layers['lcc_filter'].visible = false;
      filterLayer = this.props.map.findLayerById('lcc_filter');
      if (filterLayer !== undefined) {
        filterLayer.clear();
        filterLayer.destroy();
        this.props.map.remove(filterLayer);
      }
      delete updatedFilteredLayers['lcc_filter'];
      delete this.layers['lcc_filter'];
    } else if (this.layers['lc_filter'] && layer.includes('all_present_lc')) {
      this.layers['lc_filter'].visible = false;
      filterLayer = this.props.map.findLayerById('lc_filter');
      if (filterLayer !== undefined) {
        filterLayer.clear();
        filterLayer.destroy();
        this.props.map.remove(filterLayer);
      }
      delete updatedFilteredLayers['lc_filter'];
      delete this.layers['lc_filter'];
    } else if (
      this.layers['klc_filter'] !== undefined &&
      layer.includes('cop_klc')
    ) {
      this.layers['klc_filter'].visible = false;
      this.layers[layer].visible = false;
      filterLayer = this.props.map.findLayerById('klc_filter');
      if (filterLayer !== undefined) {
        //  temp = filterLayer;
        filterLayer.clear();
        filterLayer.destroy();
        this.props.map.remove(filterLayer);
      }
      delete updatedFilteredLayers['klc_filter'];
      //delete this.layers['klc_filter'];
    } else if (
      this.layers['pa_filter'] !== undefined &&
      layer.includes('protected_areas')
    ) {
      this.layers['pa_filter'].visible = false;
      this.layers[layer].visible = false;
      filterLayer = this.props.map.findLayerById('pa_filter');
      if (filterLayer !== undefined) {
        //  temp = filterLayer;
        filterLayer.clear();
        filterLayer.destroy();
        this.props.map.remove(filterLayer);
      }
      delete updatedFilteredLayers['pa_filter'];
    }
    this.props.mapLayersHandler(this.layers);
    updatedHotspotData['filteredLayers'] = updatedFilteredLayers;
    this.props.hotspotDataHandler(updatedHotspotData);
  }

  /**
   * Method to load previously expanded dropdowns according to sessionStorage
   */
  expandDropdowns() {
    if (this.props.download) return;
    let expandedDropdowns = null;
    const userKey = this.userID ? 'user_' + this.userID : 'user_anonymous';
    const existing = localStorage.getItem(userKey);
    if (existing) {
      try {
        const storeObj = JSON.parse(existing) || {};
        const stored = storeObj ? storeObj.expandedDropdowns : null;
        if (Array.isArray(stored)) {
          expandedDropdowns = stored;
        } else if (typeof stored === 'string') {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) expandedDropdowns = parsed;
        }
      } catch (e) {}
    }
    if (!Array.isArray(expandedDropdowns)) {
      try {
        const fromSession = sessionStorage.getItem('expandedDropdowns');
        if (fromSession) {
          const parsed = JSON.parse(fromSession);
          if (Array.isArray(parsed)) expandedDropdowns = parsed;
        }
      } catch (e) {}
    }
    if (Array.isArray(expandedDropdowns)) {
      expandedDropdowns.forEach((id) => {
        let dd = document.getElementById(id);
        if (dd) {
          dd.setAttribute('aria-expanded', 'true');
        }
      });
    }
  }

  /**
   * Method to load previously checked layers
   */
  loadLayers() {
    let layers = JSON.parse(sessionStorage.getItem('checkedLayers'));
    if (layers && !this.props.download) {
      for (var i = layers.length - 1; i >= 0; i--) {
        let layer = layers[i];
        let node = document.getElementById(layer);

        if (node) {
          if (!node.checked) {
            // dont uncheck layers already checked from URL param
            // click event fires toggleLayer()
            //node.dispatchEvent(event);
            node.checked = true;
            this.toggleLayer(node);
          }

          // set scroll position
          let dropdown = node.closest('.map-menu-dropdown');
          let productDropdown = node.closest('.map-menu-product-dropdown');
          let scrollPosition = productDropdown
            ? productDropdown.offsetTop
            : dropdown.offsetTop;
          let panelsElem = document.querySelector('.panels');
          if (panelsElem) {
            panelsElem.scrollTop = scrollPosition;
          }
        }
      }
    }
  }

  /**
   * Method to change between tabs
   */
  toggleTab(e) {
    if (!e.currentTarget.classList.contains('tab-selected')) {
      var tabsel = document.querySelector('.tab-selected');
      var tab = e.currentTarget;
      var panelsel = document.querySelector('.panel-selected');
      var panel = document.getElementById(tab.getAttribute('aria-controls'));

      tabsel.className = 'tab';
      tabsel.setAttribute('aria-selected', 'false');
      panelsel.className = 'panel';
      panelsel.setAttribute('aria-hidden', 'false');

      tab.className = 'tab tab-selected';
      tab.setAttribute('aria-selected', 'true');
      panel.className = 'panel panel-selected';
      panel.setAttribute('aria-hidden', 'true');
      if (tab.id === 'active_label') {
        this.layersReorder();
      }
      if (tab.id === 'products_label') {
        document.querySelector('.search-panel').removeAttribute('style');
      } else {
        document
          .querySelector('.search-panel')
          .setAttribute('style', 'display: none;');
      }

      if (document.querySelector('.opacity-panel').style.display === 'block') {
        this.closeOpacity();
      }
      this.restorePanelScroll();
    }
  }

  renderHotspot() {
    var hotspotLayers = [];
    Object.keys(this.activeLayersJSON).forEach((key) => {
      let layer = this.layers[key];
      if (
        /* layer.visible && */
        key.includes('all_present_lc_a_pol') ||
        key.includes('all_present_lc_b_pol') ||
        key.includes('all_lcc_a_pol') ||
        key.includes('all_lcc_b_pol')
      ) {
        hotspotLayers.push(layer);
      }
    });
    if (
      hotspotLayers.length === 0 &&
      document.querySelector('.hotspot-container')
    ) {
      if (
        this.props.mapViewer.activeWidget &&
        this.props.mapViewer.activeWidget.container.current.classList.contains(
          'hotspot-container',
        )
      ) {
        this.props.mapViewer.closeActiveWidget();
      }
      document.querySelector('.hotspot-container').style.display = 'none';
    } else if (this.props.view && hotspotLayers.length > 0) {
      document.querySelector('.hotspot-container').style.display = 'flex';
      if (
        sessionStorage.checkedLayers.includes('all_present_lc_a_pol') ||
        sessionStorage.checkedLayers.includes('all_present_lc_b_pol')
      )
        document.querySelector('.presentLandCoverContainer').style.display =
          'block';
      else
        document.querySelector('.presentLandCoverContainer').style.display =
          'none';
      if (
        sessionStorage.checkedLayers.includes('all_lcc_a_pol') ||
        sessionStorage.checkedLayers.includes('all_lcc_b_pol')
      )
        document.querySelector('.landCoverChangeContainer').style.display =
          'block';
      else {
        document.querySelector('.landCoverChangeContainer').style.display =
          'none';
      }
      document.querySelector('#applyFilterButton').disabled = true;
      let klcSelect = document.querySelector('#select-klc-area');
      let LcTimeSelect = document.querySelector('#select-klc-lcTime');
      let LccTimeSelect = document.querySelector('#select-klc-lccTime');
      klcSelect.value = 'default';
      LcTimeSelect.value = 'default';
      LccTimeSelect.value = 'default';
    }
  }

  renderTimeslider(elem, layer, fromDownload, hideCalendar) {
    if (this.props.view && layer) {
      let elemId;
      if (elem.id.includes('.')) {
        elemId = elem.id.replaceAll('.', '\\.');
      } else {
        elemId = elem.id;
      }
      let activeLayer = document.querySelector('#active_' + elemId);
      let time = { elem: activeLayer };
      if (this.props.download) {
        let dataset = document.querySelector('.map-dataset-checkbox input');
        time.dataset = dataset;
      }
      if (activeLayer.hasAttribute('time-start')) {
        time.start = parseInt(activeLayer.getAttribute('time-start'));
        time.end = parseInt(activeLayer.getAttribute('time-end'));
      }
      let isLoggedIn = document.querySelector('.map-menu-icon-login.logged');
      let byoc = null;
      try {
        const d =
          layer?.DatasetDownloadInformation ||
          layer?.datasetDownloadInformation ||
          {};
        byoc = d && d.items && d.items[0] ? d.items[0].byoc_collection : null;
      } catch (e) {}
      ReactDOM.render(
        <TimesliderWidget
          view={this.props.view}
          map={this.map}
          mapViewer={this.props.mapViewer}
          layer={layer}
          download={this.props.download}
          time={time}
          logged={isLoggedIn}
          fromDownload={fromDownload}
          area={this.props.area}
          hideCalendar={hideCalendar}
          catalogapi={this.props.catalogapi}
          catalogApiByoc={byoc}
        />,
        document.querySelector('.esri-ui-bottom-right'),
      );
    }
  }
  findCheckedLayer(dataset, checkedLayers) {
    for (let i = 0; i < dataset.Layer.length; i++) {
      for (let j = 0; j < checkedLayers.length; j++) {
        if (checkedLayers[j].includes(dataset.Layer[i].LayerId)) {
          return checkedLayers[j];
        }
      }
    }
  }
  async checkTimeLayer(dataset, checkedLayers) {
    let id = dataset.DatasetId;
    let container = document.querySelector('[datasetid="' + id + '"]');
    if (!container) return;
    let checkbox = container.querySelector('.map-dataset-checkbox input');
    if (!checkbox) return;
    if (!checkbox.checked) {
      checkbox.click();
    }
    try {
      const info =
        dataset?.dataset_download_information ||
        dataset?.DatasetDownloadInformation ||
        {};
      const byoc =
        info && info.items && info.items[0]
          ? info.items[0].byoc_collection
          : null;
      if (byoc && this.props.fetchCatalogApiDates) {
        await this.props.fetchCatalogApiDates(byoc, false);
      }
    } catch (e) {}
    document.getElementById('active_label').click();
    if (!document.querySelector('.timeslider-container')) {
      setTimeout(() => {
        let layerInputs = container.querySelectorAll(
          '.map-menu-layers-container input[type="checkbox"]',
        );
        let target = null;
        layerInputs.forEach((inp) => {
          if (!target && inp.checked) target = inp;
        });
        if (!target && layerInputs[0]) {
          layerInputs[0].checked = true;
          this.toggleLayer(layerInputs[0]);
          target = layerInputs[0];
        }
        if (target) {
          this.showTimeSlider(target, true, true);
        }
      }, 100);
    }
  }
  handleOpenPopup = () => {
    clearTimeout(this.timeout);
    this.setState({
      popup: true,
    });

    this.timeout = setTimeout(() => {
      this.handleClosePopup();
    }, 2000);
  };

  handleClosePopup = () => {
    this.setState({
      popup: false,
    });
    clearTimeout(this.timeout);
  };

  loadComponentFilters() {
    var selectedComponent = document.getElementById('select-component');
    selectedComponent.options.add(
      new Option('Select a component', 'default', false, false),
    );
    selectedComponent.options[0].disabled = true;
    var selectedProduct = document.getElementById('select-product');
    selectedProduct.options.add(
      new Option('Select a product', 'default', false, false),
    );
    selectedProduct.options[0].disabled = true;
    document
      .querySelector('.menu-family-filter')
      .setAttribute('style', 'display: none;');
    this.compCfg.forEach((element) => {
      selectedComponent.options.add(
        new Option(
          element.ComponentTitle,
          element.ComponentPosition,
          element.ComponentPosition,
        ),
      );
    });
  }
  loadProductFilters() {
    var selectedComponent = document.getElementById('select-component');
    var selectedProduct = document.getElementById('select-product');
    if (
      document.querySelector('.clear-filters') &&
      selectedComponent.value !== 'default'
    ) {
      document
        .querySelector('.clear-filters')
        .setAttribute('style', 'display: block;');
    }
    this.removeOptions(selectedProduct);
    selectedProduct.options.add(
      new Option('Select a product', 'default', false, false),
    );
    selectedProduct.options[0].disabled = true;
    this.compCfg.forEach((component) => {
      if (component.ComponentPosition.toString() === selectedComponent.value) {
        component.Products.forEach((product) => {
          selectedProduct.options.add(
            new Option(
              product.ProductTitle,
              product.ProductId,
              product.ProductId,
            ),
          );
        });
      }
    });
    let familyFilter = document.querySelector('.menu-family-filter');
    if (familyFilter) {
      familyFilter.setAttribute('style', 'display: none;');
    }
  }
  async loadFamilyFilters() {
    var selectedFamily = document.getElementById('select-family');
    var selectedProduct = document.getElementById('select-product');
    this.removeOptions(selectedFamily);
    let tax = await this.getTaxonomy('collective.taxonomy.family');
    let hasFamily = false;
    selectedFamily.options.add(
      new Option('Select a sub-group', 'default', false, false),
    );
    selectedFamily.options[0].disabled = true;
    tax.tree.forEach((element) => {
      if (element.title === selectedProduct.selectedOptions[0].text) {
        hasFamily = true;
        element.children.forEach((child) => {
          selectedFamily.options.add(
            new Option(child.title, child.key, child.key),
          );
        });
      }
    });
    let familyFilter = document.querySelector('.menu-family-filter');
    if (familyFilter) {
      if (!hasFamily) {
        familyFilter.setAttribute('style', 'display: none;');
      } else {
        familyFilter.setAttribute('style', 'display: flex;');
      }
    }
  }
  async menuSearch() {
    let searchText;
    let componentFilter;
    let productFilter;
    let familyFilter;
    let result = false;
    let familiesResult = [];
    if (document.querySelector('#menu-searchtext')) {
      searchText = document
        .querySelector('#menu-searchtext')
        .value?.toUpperCase();
    }
    if (document.getElementById('select-component')) {
      componentFilter = document.getElementById('select-component').value;
    }
    if (document.getElementById('select-product')) {
      productFilter = document.getElementById('select-product').value;
    }
    if (document.getElementById('select-family')) {
      familyFilter = document.getElementById('select-family').value;
    }
    if (
      document.querySelector('.menu-family-filter').getAttribute('style') ===
      'display: none;'
    ) {
      familyFilter = 'default';
    }
    for (let index = 0; index < this.compCfg.length; index++) {
      let componentFound = false;
      let componentChecked = false;
      let componentElem = document.querySelector('#component_' + index);
      for (let j = 0; j < this.compCfg[index].Products.length; j++) {
        const product = this.compCfg[index].Products[j];
        let productFound = false;
        let productChecked = false;
        let productElem = document.querySelector(
          '[productid="' + product.ProductId + '"]',
        );
        let productCheckbox = document.querySelector('#map_' + productElem.id);
        let defaultActive = null;
        for (let k = 0; k < product.Datasets.length; k++) {
          const dataset = product.Datasets[k];
          let datasetChecked = false;
          let datasetElem = document.querySelector(
            '[datasetid="' + dataset.DatasetId + '"]',
          );
          if (datasetElem) {
            for (
              let l = 0;
              l < Object.keys(this.activeLayersJSON).length;
              l++
            ) {
              if (
                dataset.DatasetTitle ===
                this.layers[Object.keys(this.activeLayersJSON)[l]].DatasetTitle
              ) {
                componentChecked = true;
                productChecked = true;
                datasetChecked = true;
              }
            }
            if (
              searchText === '' &&
              componentFilter === 'default' &&
              productFilter === 'default' &&
              (familyFilter === 'default' || familyFilter === '')
            ) {
              this.filtersApplied = false;
              componentFound = true;
              productFound = true;
              result = true;
              componentElem
                .querySelector('.ccl-expandable__button')
                .setAttribute('aria-expanded', 'false');
              productElem
                .querySelector('.ccl-expandable__button')
                .setAttribute('aria-expanded', 'false');
              datasetElem.removeAttribute('style');
              productElem.removeAttribute('style');
              componentElem.removeAttribute('style');
              if (!defaultActive) {
                defaultActive = 'map_' + datasetElem.id;
              }
              if (dataset.Default_active) {
                defaultActive = 'map_' + datasetElem.id;
              }
              if (
                dataset.FamilyTitle &&
                !familiesResult.includes(dataset.FamilyTitle)
              ) {
                familiesResult.push(dataset.FamilyTitle);
              }
            } else if (
              datasetChecked ||
              (dataset?.DatasetTitle?.toUpperCase().includes(searchText) &&
                (product.ProductId === productFilter ||
                  productFilter === 'default') &&
                (this.compCfg[index].ComponentPosition.toString() ===
                  componentFilter ||
                  componentFilter === 'default') &&
                (dataset?.FamilyTitle === familyFilter ||
                  familyFilter === 'default' ||
                  familyFilter === ''))
            ) {
              this.filtersApplied = true;
              componentFound = true;
              productFound = true;
              result = true;
              componentElem
                .querySelector('.ccl-expandable__button')
                .setAttribute('aria-expanded', 'true');
              productElem
                .querySelector('.ccl-expandable__button')
                .setAttribute('aria-expanded', 'true');
              datasetElem.removeAttribute('style');
              productElem.removeAttribute('style');
              componentElem.removeAttribute('style');
              if (!defaultActive) {
                defaultActive = 'map_' + datasetElem.id;
              }
              if (dataset.Default_active) {
                defaultActive = 'map_' + datasetElem.id;
              }
              if (
                dataset.FamilyTitle &&
                !familiesResult.includes(dataset.FamilyTitle)
              ) {
                familiesResult.push(dataset.FamilyTitle);
              }
            } else {
              datasetElem.setAttribute('style', 'display: none;');
            }
          }
        }
        productCheckbox.setAttribute('defcheck', defaultActive);
        if (productChecked) {
          productElem
            .querySelector('.ccl-expandable__button')
            .setAttribute('aria-expanded', 'true');
        }
        if (!productFound && !productChecked) {
          productElem.setAttribute('style', 'display: none;');
        }
      }
      if (componentChecked) {
        componentElem
          .querySelector('.ccl-expandable__button')
          .setAttribute('aria-expanded', 'true');
      }
      if (!componentFound && !componentChecked) {
        componentElem.setAttribute('style', 'display: none;');
      }
    }
    let familiesElements = document.querySelectorAll(
      '.map-menu-family-dropdown',
    );
    for (let index = 0; index < familiesElements.length; index++) {
      if (
        familiesResult.includes(familiesElements[index].attributes[2].value)
      ) {
        familiesElements[index].setAttribute('style', 'display: block;');
      } else {
        familiesElements[index].setAttribute('style', 'display: none;');
      }
    }
    let myServiceResult = false;
    this.state.wmsUserServiceLayers.forEach((element) => {
      let node = document.getElementById('my-service-' + element.LayerId);
      let checkbox = document.getElementById(element.LayerId);
      if (
        element?.LayerId?.toUpperCase().includes(searchText) ||
        checkbox.checked
      ) {
        node.removeAttribute('style');
        result = true;
        myServiceResult = true;
      } else {
        node.setAttribute('style', 'display: none;');
      }
    });
    let dropdowns = document.querySelectorAll('.map-menu-dropdown');
    let i = dropdowns.length === 0 ? 0 : dropdowns.length - 1;
    let componentId = `component_${i}`;
    if (!myServiceResult) {
      document
        .getElementById(componentId)
        .setAttribute('style', 'display: none;');
    } else {
      document.getElementById(componentId).removeAttribute('style');
    }
    if (result) {
      document.querySelector('.no-filter-result-message').style.display =
        'none';
    } else {
      document.querySelector('.no-filter-result-message').style.display =
        'block';
    }
  }
  clearMenuText() {
    if (document.querySelector('#menu-searchtext')) {
      document.querySelector('#menu-searchtext').value = null;
    }
    this.menuSearch();
    this.openClearButton();
  }
  openClearButton() {
    if (document.querySelector('#menu-searchtext').value.length > 0) {
      document.querySelector('.clearsearch').style.display = 'block';
    } else {
      document.querySelector('.clearsearch').style.display = 'none';
    }
  }
  clearFilters() {
    if (document.getElementById('select-component')) {
      document.getElementById('select-component').value = 'default';
    }
    let selectedProduct = document.getElementById('select-product');
    if (selectedProduct) {
      this.removeOptions(selectedProduct);
      selectedProduct.options.add(
        new Option('Select a product', 'default', false, false),
      );
    }
    if (document.getElementById('select-family')) {
      document.getElementById('select-family').value = 'default';
    }
    let familyFilter = document.querySelector('.menu-family-filter');
    if (familyFilter) {
      familyFilter.setAttribute('style', 'display: none;');
    }
    if (document.querySelector('.clear-filters')) {
      document
        .querySelector('.clear-filters')
        .setAttribute('style', 'display: none;');
    }
  }
  closeFilters() {
    if (document.querySelector('.filters-panel').style.display === 'block') {
      document
        .querySelector('.filters-panel')
        .setAttribute('style', 'display: none;');
      this.setState({ filterArrow: 'chevron-down' });
    } else {
      document
        .querySelector('.filters-panel')
        .setAttribute('style', 'display: block;');
      this.setState({ filterArrow: 'chevron-up' });
    }
  }

  removeOptions(selectElement) {
    if (selectElement.options.length > 0) {
      var i,
        L = selectElement.options.length - 1;
      for (i = L; i >= 0; i--) {
        selectElement.remove(i);
      }
    }
  }
  /**
   * This method renders the component
   * @returns jsx
   */
  render() {
    return (
      <>
        <div ref={this.container} className="map-left-menu-container">
          <div className="map-menu tab-container" id="tabcontainer">
            <Popup
              type={'info'}
              open={this.state.popup}
              position="right center"
              trigger={<div className="popup-container"></div>}
              offset={[0, 20]}
            >
              {'No data available on the selected area'}
            </Popup>
            <div className="tabs" role="tablist">
              <span
                className={!this.props.download ? 'tab tab-selected' : 'tab'}
                id="products_label"
                role="tab"
                aria-controls="products_panel"
                aria-selected="true"
                onClick={(e) => this.toggleTab(e)}
                onKeyDown={(e) => this.toggleTab(e)}
                tabIndex="0"
                style={this.props.download ? { width: '33.333%' } : {}}
              >
                Products and datasets
              </span>
              <span
                className="tab"
                id="active_label"
                role="tab"
                aria-controls="active_panel"
                aria-selected="false"
                onClick={(e) => this.toggleTab(e)}
                onKeyDown={(e) => this.toggleTab(e)}
                tabIndex="0"
                style={this.props.download ? { width: '33.333%' } : {}}
              >
                Active layers
              </span>
              {this.props.download && (
                <span
                  className={this.props.download ? 'tab tab-selected' : 'tab'}
                  id="download_label"
                  role="tab"
                  aria-controls="download_panel"
                  aria-selected="false"
                  onClick={(e) => this.toggleTab(e)}
                  onKeyDown={(e) => this.toggleTab(e)}
                  tabIndex="0"
                  style={this.props.download ? { width: '33.333%' } : {}}
                >
                  Download
                </span>
              )}
            </div>
            <div
              className="panels"
              id="paneles"
              onScroll={() => this.storePanelScroll()}
            >
              <div className="search-panel">
                <div className="menu-searchpanel">
                  <div className="search-input menu-search-input">
                    <input
                      type="text"
                      id="menu-searchtext"
                      maxLength="200"
                      placeholder="Search products and datasets"
                      onChange={() => this.openClearButton()}
                      onKeyDown={(e) => {
                        if (e.code === 'Enter') {
                          this.menuSearch();
                        }
                      }}
                    />
                    <div className="search-input-actions">
                      <button
                        className="ui basic icon button search-input-clear-icon-button clearsearch"
                        onClick={() => this.clearMenuText()}
                        onKeyDown={(e) => {
                          if (
                            !e.altKey &&
                            e.code !== 'Tab' &&
                            !e.ctrlKey &&
                            e.code !== 'Delete' &&
                            !e.shiftKey &&
                            !e.code.startsWith('F')
                          ) {
                            this.clearMenuText();
                          }
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 26 26"
                          className="icon"
                        >
                          <path
                            fillRule="evenodd"
                            d="M27.899 9.515L26.485 8.101 18 16.586 9.514 8.101 8.1 9.515 16.586 18 8.1 26.486 9.514 27.9 18 19.414 26.485 27.9 27.899 26.486 19.414 18z"
                          ></path>
                        </svg>
                      </button>
                    </div>
                    <button
                      aria-label="Search"
                      className="button menu-search-button"
                      onClick={() => this.menuSearch()}
                      onKeyDown={(e) => {
                        if (
                          !e.altKey &&
                          e.code !== 'Tab' &&
                          !e.ctrlKey &&
                          e.code !== 'Delete' &&
                          !e.shiftKey &&
                          !e.code.startsWith('F')
                        ) {
                          this.menuSearch();
                        }
                      }}
                    >
                      <span className="ccl-icon-zoom search-menu-icon"></span>
                    </button>
                  </div>
                  <div className="filters-element filter-logo filters-header">
                    <div className="filters-title">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 36 36"
                        className="icon ui"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.0916,5.0002 L14.9996,19.3132 L14.9996,34.0002 L20.9996,29.5002 L20.9996,19.3132 L30.9086,5.0002 L5.0916,5.0002 Z M17.0006,18.6872 L8.9086,7.0002 L27.0916,7.0002 L19.0006,18.6872 L19.0006,28.5002 L17.0006,30.0002 L17.0006,18.6872 Z"
                        ></path>
                      </svg>
                      <span className="filters-title-bold">Filters</span>
                      <div
                        className="clear-filters"
                        tabIndex="0"
                        role="button"
                        onClick={() => {
                          this.clearFilters();
                          this.menuSearch();
                        }}
                        onKeyDown={(e) => {
                          if (
                            !e.altKey &&
                            e.code !== 'Tab' &&
                            !e.ctrlKey &&
                            e.code !== 'Delete' &&
                            !e.shiftKey &&
                            !e.code.startsWith('F')
                          ) {
                            this.clearFilters();
                            this.menuSearch();
                          }
                        }}
                      >
                        Clear filters
                      </div>
                    </div>

                    <div
                      className="dropdown-icon close-filters-icon"
                      role="button"
                      tabIndex="0"
                      onClick={() => this.closeFilters()}
                      onKeyDown={(e) => {
                        if (
                          !e.altKey &&
                          e.code !== 'Tab' &&
                          !e.ctrlKey &&
                          e.code !== 'Delete' &&
                          !e.shiftKey &&
                          !e.code.startsWith('F')
                        ) {
                          this.closeFilters();
                        }
                      }}
                    >
                      <FontAwesomeIcon icon={['fas', this.state.filterArrow]} />
                    </div>
                  </div>
                  <div className="filters-panel">
                    <span className="menu-filter">
                      Component
                      <select
                        id="select-component"
                        className="esri-select filter-select"
                        onBlur={() => {}}
                        onChange={() => {
                          this.loadProductFilters();
                          this.menuSearch();
                        }}
                      ></select>
                    </span>
                    <span className="menu-filter">
                      Product groups
                      <select
                        id="select-product"
                        className="esri-select filter-select"
                        onBlur={() => {}}
                        onChange={() => {
                          this.loadFamilyFilters();
                          this.menuSearch();
                        }}
                      ></select>
                    </span>
                    <span className="menu-filter menu-family-filter">
                      Product sub-group
                      <select
                        id="select-family"
                        className="esri-select filter-select"
                        onBlur={() => {}}
                        onChange={() => {
                          this.menuSearch();
                        }}
                      ></select>
                    </span>
                  </div>
                </div>
              </div>
              <div className="no-filter-result-message">No data available</div>
              <div
                className={
                  !this.props.download ? 'panel panel-selected' : 'panel'
                }
                id="products_panel"
                role="tabpanel"
                aria-hidden="false"
              >
                {this.metodprocessJSON()}
              </div>
              <div
                className="panel"
                id="active_panel"
                role="tabpanel"
                aria-hidden="true"
              >
                <div id="active_layers" className="map-active-layers">
                  {this.activeLayersAsArray()}
                  <span className="message" id="nolayers_message">
                    No layers selected
                  </span>
                  <button
                    id="map_remove_layers"
                    className={
                      'ccl-button ccl-button-green' +
                      (Object.keys(this.activeLayersJSON).length
                        ? ''
                        : ' locked')
                    }
                    onClick={() => this.removeAllLayers()}
                  >
                    <FontAwesomeIcon icon={['fas', 'trash']} />
                    Remove all layers
                  </button>
                </div>
              </div>
              {this.props.download && this.props.view && (
                <div
                  className={
                    this.props.download ? 'panel panel-selected' : 'panel'
                  }
                  id="download_panel"
                  role="tabpanel"
                  aria-hidden="true"
                >
                  <AreaWidget
                    view={this.props.view}
                    map={this.props.map}
                    mapViewer={this.props.mapViewer}
                    download={this.props.download}
                    updateArea={this.props.updateArea}
                  />
                  <AddCartItem
                    cartData={this.compCfg}
                    props={this.props}
                    mapViewer={this.props.mapViewer}
                    download={this.props.download}
                    areaData={this.props.area}
                    handleOpenPopup={this.handleOpenPopup}
                    prepackage={this.props.prepackageChecked}
                    uploadedFile={this.props.uploadedFile}
                  />
                </div>
              )}
              {this.state.noServiceModal && (
                // CLMS-1588 show modal if download and dataset has no dataset to show

                <>
                  <Modal
                    size="tiny"
                    open={this.state.noServiceModal}
                    onClose={() => this.closeNoServiceModal()}
                    onOpen={() => this.showNoServiceModal()}
                    className="map-download-modal"
                  >
                    <div className="modal-close modal-clms-close">
                      <span
                        className="ccl-icon-close"
                        onClick={(e) => this.closeNoServiceModal(e)}
                        onKeyDown={(e) => this.closeNoServiceModal(e)}
                        aria-label="Close"
                        tabIndex="0"
                        role="button"
                      ></span>
                    </div>
                    <Modal.Content>
                      <p>
                        This dataset can be downloaded, although it cannot be
                        visualized on the map.
                      </p>
                    </Modal.Content>
                    <Modal.Actions>
                      <div
                        className="map-download-buttons"
                        style={{ textAlign: 'center', display: 'block' }}
                      >
                        <button
                          className="ccl-button ccl-button-green"
                          onClick={(e) => this.closeNoServiceModal(e)}
                        >
                          Continue
                        </button>
                      </div>
                    </Modal.Actions>
                  </Modal>
                </>
              )}
            </div>
          </div>
          <div tooltip="Menu of products" direction="right" type="widget">
            <div
              className={this.menuClass}
              id="map_manu_button"
              role="button"
              aria-label="Menu of products"
              onClick={this.openMenu.bind(this)}
              onKeyDown={(e) => {
                if (
                  !e.altKey &&
                  e.code !== 'Tab' &&
                  !e.ctrlKey &&
                  e.code !== 'Delete' &&
                  !e.shiftKey &&
                  !e.code.startsWith('F')
                ) {
                  this.openMenu(this);
                }
              }}
              tabIndex="0"
            ></div>
          </div>
        </div>
        <div className="opacity-panel">
          <div
            className="esri-icon-close"
            id="opacity_close"
            role="button"
            onClick={() => this.closeOpacity()}
            onKeyDown={() => this.closeOpacity()}
            tabIndex="0"
          ></div>
          <div className="opacity-title">Opacity</div>
          <div className="opacity-slider">
            <input
              type="range"
              defaultValue="100"
              min="0"
              max="100"
              onChange={() => this.setOpacity()}
            />
            <span className="opacity-label left">0 %</span>
            <span className="opacity-label right">100 %</span>
          </div>
        </div>
        <div className="touchScreenPopup-panel">
          <div
            className="esri-icon-close"
            id="touchScreenPopup_close"
            role="button"
            onClick={() => this.closetouchScreenPopup()}
            onKeyDown={() => this.closetouchScreenPopup()}
            tabIndex="0"
          ></div>
          {<TouchScreenPopup />}
        </div>
      </>
    );
  }
}
export default MenuWidget;
