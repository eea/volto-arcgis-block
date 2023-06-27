import ReactDOM from 'react-dom';
import React, { createRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { loadModules, loadCss } from 'esri-loader';
import useCartState from '@eeacms/volto-clms-utils/cart/useCartState';
import { Modal, Popup } from 'semantic-ui-react';
import AreaWidget from './AreaWidget';
import TimesliderWidget from './TimesliderWidget';
import { Toast } from '@plone/volto/components';
import { toast } from 'react-toastify';
var WMSLayer, WMTSLayer, FeatureLayer, BaseTileLayer, esriRequest, Extent;

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
}) => {
  const { addCartItem, isLoggedIn } = useCartState();

  const checkArea = (e) => {
    let check = document.querySelector('.area-panel input:checked').value;
    let area = {};
    if (check === 'area') {
      let graphics = mapViewer.view.graphics;
      if (graphics.length === 0) {
        area = '';
      } else {
        area.type = 'polygon';
        area.value = [
          areaData.origin.x,
          areaData.origin.y,
          areaData.end.x,
          areaData.end.y,
        ];
      }
    } else {
      if (areaData) {
        area.type = 'nuts';
        area.value = areaData;
      } else {
        area = '';
      }
    }
    let data = checkCartData(cartData, area, dataset);
    addCartItem(data).then(() => {
      showMessageTimer('Added to cart', 'success', 'Success');
      if (dataset.IsTimeSeries) {
        let id = dataset.DatasetId;
        let datasetElem = document.querySelector('[datasetid="' + id + '"]');
        let datasetInput = document.querySelector(
          '#active_' +
            datasetElem.querySelector('.map-menu-layer input:checked').id,
        );
        datasetInput.removeAttribute('time-start');
        datasetInput.removeAttribute('time-end');
      }
    });
  };

  const checkCartData = (cartData, area, dataset) => {
    if (!dataset) {
      dataset = cartData[0].Products[0].Datasets[0];
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

  const showMessageTimer = (msg, type, title) => {
    toast[type](<Toast autoClose={4000} title={title} content={msg} />, {
      position: 'top-center',
      autoClose: 4000,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: false,
      draggable: true,
      progress: undefined,
    });
  };

  if (!dataset) {
    dataset = cartData[0].Products[0].Datasets[0];
  }

  const setDownloadTag = (val) => {
    if (!sessionStorage.key('downloadButtonClicked'))
      sessionStorage.setItem('downloadButtonClicked', 'true');
    else sessionStorage.setItem('downloadButtonClicked', val);
  };

  return (
    <>
      {download ? (
        <div className="map-download-buttons">
          <button
            id="map_download_add"
            className="ccl-button ccl-button-green"
            onClick={(e) => {
              if (
                !document.querySelector('.map-menu-layer input:checked') &&
                !dataset.MarkAsDownloadableNoServiceToVisualize
              ) {
                document.getElementById('products_label').click();
              } else {
                if (areaData) {
                  checkArea(e);
                }
              }
            }}
          >
            Add to cart
          </button>
        </div>
      ) : isLoggedIn ? ( // If isLoggedIn == true and user clicks download
        <Popup
          trigger={
            <span
              className={
                'map-menu-icon map-menu-icon-login' +
                (isLoggedIn ? ' logged' : '')
              }
              onClick={(e) => {
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
                  checkArea(e);
                }
              }}
              onKeyDown={(e) => {
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
                  checkArea(e);
                }
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
    this.state = {
      showMapMenu: false,
      noServiceModal: true,
      setNoServiceModal: true,
    };
    // call the props of the layers list (mapviewer.jsx)
    this.location = this.props.location;
    this.compCfg = this.props.conf;
    this.map = this.props.map;
    this.view = this.props.view;
    this.menuClass =
      'esri-icon-drag-horizontal esri-widget--button esri-widget esri-interactive';
    this.loadFirst = true;
    this.layers = this.props.layers;
    this.activeLayersJSON = {};
    this.layerGroups = {};
    this.xml = null;
    this.dataBBox = null;
    this.extentInitiated = false;

    // add zoomend listener to map to show/hide zoom in message
    this.view.watch('stationary', (isStationary) => {
      let snowAndIceInSessionStorage = sessionStorage.getItem('snowAndIce');
      let node;
      if (isStationary) {
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
            if (item.innerText.includes('Snow and Ice')) {
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
              if (check !== null) {
                if (check.querySelector('[type="checkbox"]').checked) {
                  let node = [
                    ...check.getElementsByClassName('zoom-in-message-dataset'),
                  ][0];
                  node.style.display = zoom > 6 ? 'none' : 'block';
                }
              }
            });
          }
        }
      }
    });

    this.activeLayersHandler = this.props.activeLayersHandler;
  }

  loader() {
    return loadModules([
      'esri/layers/WMSLayer',
      'esri/layers/WMTSLayer',
      'esri/layers/FeatureLayer',
      'esri/layers/BaseTileLayer',
      'esri/request',
      'esri/geometry/Extent',
    ]).then(
      ([
        _WMSLayer,
        _WMTSLayer,
        _FeatureLayer,
        _BaseTileLayer,
        _esriRequest,
        _Extent,
      ]) => {
        WMSLayer = _WMSLayer;
        WMTSLayer = _WMTSLayer;
        FeatureLayer = _FeatureLayer;
        BaseTileLayer = _BaseTileLayer;
        esriRequest = _esriRequest;
        Extent = _Extent;
      },
    );
  }

  // get custom TMS layer JSON
  getTMSLayersJSON() {
    let promises = []; // download JSON file calls
    this.compCfg.forEach((component) => {
      component.Products.forEach((product) => {
        product.Datasets.forEach((dataset) => {
          if (dataset.ViewService.endsWith('file')) {
            let promise = fetch(dataset.ViewService, { mode: 'no-cors' })
              .then((response) => {
                if (!response.ok) {
                  //console.error(`HTTP error, status = ${response.status}`);
                }
                return response.json();
              })
              .then((data) => {
                // fill dataset.Layer manually
                dataset.Layer = data.Layers;
              })
              .catch((error) => {
                //console.error(error);
              });
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
    let toc_panel_scrolls =
      JSON.parse(sessionStorage.getItem('toc_panel_scrolls')) || {};
    toc_panel_scrolls[selected_tab.id] = paneles.scrollTop;
    sessionStorage.setItem(
      'toc_panel_scrolls',
      JSON.stringify(toc_panel_scrolls),
    );
  }

  restorePanelScroll() {
    let paneles = document.querySelector('#paneles');
    var selected_tab = document.querySelector('.tab-selected');
    let toc_panel_scrolls =
      JSON.parse(sessionStorage.getItem('toc_panel_scrolls')) || {};
    let scroll = toc_panel_scrolls[selected_tab.id];
    if (scroll) {
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
    setTimeout(() => {
      if (this.state.showMapMenu) {
        this.container.current.querySelector('#tabcontainer').style.display =
          'none';
        this.container.current.querySelector('#paneles').style.display = 'none';
        this.container.current
          .querySelector('.esri-widget--button')
          .classList.replace('esri-icon-close', 'esri-icon-drag-horizontal');
        if (
          document.contains(document.querySelector('.timeslider-container'))
        ) {
          document.querySelector('.timeslider-container').style.display =
            'none';
        }
        if (
          document.querySelector('.opacity-panel').style.display === 'block'
        ) {
          this.closeOpacity();
        }

        // By invoking the setState, we notify the state we want to reach
        // and ensure that the component is rendered again
        this.setState({ showMapMenu: false });
      } else {
        this.container.current.querySelector('#tabcontainer').style.display =
          'block';
        this.container.current.querySelector('#paneles').style.display =
          'block';
        this.container.current
          .querySelector('.esri-widget--button')
          .classList.replace('esri-icon-drag-horizontal', 'esri-icon-close');
        if (document.contains(document.querySelector('.timeslider-container')))
          document.querySelector('.timeslider-container').style.display =
            'block';
        this.restorePanelScroll();

        // By invoking the setState, we notify the state we want to reach
        // and ensure that the component is rendered again
        this.setState({ showMapMenu: true });
      }
      if (this.loadFirst) {
        this.checkUrl();
        this.loadFirst = false;
        this.zoomTooltips();
      }

      let authToken = this.getAuthToken();
      let timeSliderTag = sessionStorage.getItem('timeSliderTag');
      let downloadTag = sessionStorage.getItem('downloadButtonClicked');
      let checkedLayers = JSON.parse(sessionStorage.getItem('checkedLayers'));

      // "Active on map" section and the time slider opened by default if user is logged in and timeSliderTag is true
      if (checkedLayers && !this.props.download) {
        // "Active on map" section and the time slider opened by default if user is logged in and timeSliderTag is true
        if (authToken && timeSliderTag) {
          for (let i = 0; i < checkedLayers.length; i++) {
            let layerid = checkedLayers[i];
            if (
              layerid &&
              this.layers[layerid].isTimeSeries &&
              !this.container.current
                .querySelector('.esri-widget')
                .classList.contains('esri-icon-drag-horizontal')
            ) {
              // select active on map tab
              let event = new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: false,
              });
              let el = document.getElementById('download_label');
              el.dispatchEvent(event);
              break;
            }
          }
        }
        // "Area widget" opened by default if user is logged in and downloadTag is true
        else if (authToken && downloadTag) {
          for (let i = 0; i < checkedLayers.length; i++) {
            let layerid = checkedLayers[i];
            if (
              layerid &&
              !this.layers[layerid].isTimeSeries &&
              !this.container.current
                .querySelector('.esri-widget')
                .classList.contains('esri-icon-drag-horizontal')
            ) {
              //open area widget
              let event = new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: false,
              });
              document
                .querySelector('.map-menu-icon-login.logged')
                .dispatchEvent(event);
              break;
            } else if (
              layerid &&
              this.layers[layerid].isTimeSeries &&
              !this.container.current
                .querySelector('.esri-widget')
                .classList.contains('esri-icon-drag-horizontal')
            ) {
              // select active on map tab
              let event = new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: false,
              });
              let el = document.getElementById('download_label');
              el.dispatchEvent(event);
              break;
            }
          }
        }
      }
      // CLMS-1389
      // "Active on map" section and the time slider opened by default if download and timeseries == true

      if (this.layers)
        if (this.props.download && this.layers) {
          let layerid = Object.keys(this.layers)[0];
          if (
            layerid &&
            this.layers[layerid].isTimeSeries &&
            !this.container.current
              .querySelector('.esri-widget')
              .classList.contains('esri-icon-drag-horizontal')
          ) {
            // select active on map tab
            let event = new MouseEvent('click', {
              view: window,
              bubbles: true,
              cancelable: false,
            });
            // let el = document.getElementById('active_label');
            let el = document.getElementById('download_label');
            el.dispatchEvent(event);
          }
        }
    }, 1000);
  }

  /**
   * This method is executed after the render method is executed
   */
  async componentDidMount() {
    loadCss();
    await this.loader();
    this.state.url = window.location.href;
    await this.getTMSLayersJSON();
    this.props.view.ui.add(this.container.current, 'top-left');
    if (this.props.download) {
      setTimeout(() => {
        document.querySelector('.area-panel input:checked').click();
        if (document.querySelector('.map-product-checkbox input')) {
          document.querySelector('.map-product-checkbox input').click();
          let dropdown = document.querySelector(
            '.map-menu-dropdown .ccl-expandable__button',
          );
          if (dropdown) {
            dropdown.setAttribute('aria-expanded', 'true');
            dropdown = document.querySelector(
              '.map-menu-product-dropdown .ccl-expandable__button',
            );
            dropdown.setAttribute('aria-expanded', 'true');
          }
        }
      }, 1000);
    }
    //to watch the component
    this.setState({});
    this.openMenu();
    this.expandDropdowns();
    this.loadLayers();
    this.showZoomMessageForDatasets();
    this.loadOpacity();
    this.loadVisibility();
  }

  setSliderTag(val) {
    if (!sessionStorage.key('timeSliderTag'))
      sessionStorage.setItem('timeSliderTag', 'true');
    else sessionStorage.setItem('timeSliderTag', val);
  }

  getAuthToken() {
    let tokenResult = null;
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
      if (!element.contains(event.target) && isVisible(element)) {
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
        let dropdown = document
          .querySelector(elem + ' input')
          .closest('.map-menu-dropdown');
        dropdown
          .querySelector('.ccl-expandable__button')
          .setAttribute('aria-expanded', 'true');
        let scrollPosition = document
          .querySelector(elem + ' input')
          .closest('.map-menu-product-dropdown').offsetTop;
        if (dataset) {
          dropdown = document
            .querySelector(elem + ' input')
            .closest('.map-menu-product-dropdown');
          dropdown
            .querySelector('.ccl-expandable__button')
            .setAttribute('aria-expanded', 'true');
          let mapMenu = document
            .querySelector(elem + ' input')
            .closest('.map-menu-dataset');
          if (mapMenu) {
            // mapMenu is null for Corine and was blocking.
            scrollPosition = mapMenu.offsetTop;
          }
        }
        document.querySelector('.panels').scrollTop = scrollPosition;
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
      element.setAttribute('aria-label', element.getAttribute('title'));
      element.removeAttribute('title');
      Object.keys(attributes[index]).forEach((attr) => {
        element.setAttribute(attr, attributes[index][attr]);
      });
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
    for (var i in this.compCfg) {
      components.push(this.metodProcessComponent(this.compCfg[i], index));
      index++;
    }
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

    for (var i in component.Products) {
      // CLMS-1544
      // dont show the product if all of its datasets has the auxiliary service as its ViewService URL
      //CLMS-1756
      //don´t show the product if MarkAsDownloadableNoServiceToVisualize is true
      const isAuxiliary = (dataset) =>
        dataset.MarkAsDownloadableNoServiceToVisualize;
      if (!component.Products[i].Datasets.every(isAuxiliary)) {
        products.push(
          this.metodProcessProduct(
            component.Products[i],
            index,
            inheritedIndexComponent,
          ),
        );
        index++;
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
    var index = 0;
    var inheritedIndexProduct = inheritedIndex + '_' + prodIndex;
    var checkProduct = 'map_product_' + inheritedIndexProduct;
    var description =
      product.ProductDescription && product.ProductDescription.length >= 300
        ? product.ProductDescription.substr(0, 300) + '...'
        : product.ProductDescription;

    //Add only default datasets
    for (var i in product.Datasets) {
      if (product.Datasets[i].Default_active === true) {
        var idDataset = 'map_dataset_' + inheritedIndexProduct + '_' + index;
        dataset_def.push(idDataset);
      }

      // CLMS-1545
      if (!product.Datasets[i].MarkAsDownloadableNoServiceToVisualize) {
        datasets.push(
          this.metodProcessDataset(
            product.Datasets[i],
            index,
            inheritedIndexProduct,
            checkProduct,
          ),
        );
        index++;
      }
    }

    // Empty vector, add the first dataset
    if (!dataset_def.length) {
      var idDatasetB = 'map_dataset_' + inheritedIndexProduct + '_0';
      dataset_def.push(idDatasetB);
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
                        trigger={
                          product.ProductId ===
                            '8474c3b080fa42cc837f1d2338fcf096' ||
                          product.ProductTitle === 'Snow and Ice Parameters' ? (
                            <div class="zoom-in-message-container">
                              <span>{product.ProductTitle}</span>
                              <div
                                class="zoom-in-message"
                                id="snow-and-ice-zoom-message"
                              >
                                Zoom in to view on map
                              </div>
                            </div>
                          ) : (
                            <span>{product.ProductTitle}</span>
                          )
                        }
                        content={description}
                        basic
                        className="custom"
                        style={{ transform: 'translateX(-4rem)' }}
                      />
                    ) : product.ProductId ===
                        '8474c3b080fa42cc837f1d2338fcf096' ||
                      product.ProductTitle ===
                        'High Resolution Snow and Ice Parameters' ? (
                      <div class="zoom-in-message-container">
                        <span>{product.ProductTitle}</span>
                        <div class="zoom-in-message">
                          Zoom in to view on map
                        </div>
                      </div>
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
    let trueCheck = datasetChecks.filter((elem) => elem.checked).length;

    productCheck.checked = trueCheck > 0;
    let productCheckLabel = productCheck.labels[0].innerText;
    if (productCheckLabel.includes('Snow and Ice Parameters')) {
      sessionStorage.setItem('snowAndIce', true);
    } else {
      sessionStorage.setItem('snowAndIce', false);
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
    let checkedLayers = JSON.parse(sessionStorage.getItem('checkedLayers'));
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
    if (dataset.ViewService.endsWith('file')) {
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
          ),
        );
        index++;
      }
    }

    if (!layer_default.length) {
      layer_default.push(
        dataset.Layer[0].LayerId + '_' + inheritedIndexDataset + '_0',
      );
    }

    return (
      <div
        className="map-menu-dataset-dropdown"
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
                          (checkedLayers &&
                            checkedLayers.includes(dataset.Layer.LayerId) &&
                            dataset.ProductId ===
                              '8474c3b080fa42cc837f1d2338fcf096') ||
                          dataset.Product === 'Snow and Ice Parameters' ? (
                            <div class="zoom-in-message-container">
                              <span>{dataset.DatasetTitle}</span>
                              <div class="zoom-in-message zoom-in-message-dataset">
                                Zoom in to view on map
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
                    ) : dataset.ProductId ===
                        '8474c3b080fa42cc837f1d2338fcf096' ||
                      dataset.Product ===
                        'High Resolution Snow and Ice Parameters' ? (
                      <div class="zoom-in-message-container">
                        <span>{dataset.DatasetTitle}</span>
                        <div class="zoom-in-message">
                          Zoom in to view on map
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
                      rel="noreferrer"
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
    let layerChecks = Array.from(
      document.querySelectorAll('[parentid="' + id + '"]'),
    );

    let trueChecks = layerChecks.filter((elem) => elem.checked).length;
    datasetCheck.checked = trueChecks > 0;
    this.updateCheckProduct(datasetCheck.getAttribute('parentid'));
    this.showZoomMessageOnDataset(datasetCheck);
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
      if (viewService.toLowerCase().includes('wms')) {
        viewService = viewService.endsWith('?')
          ? viewService
          : viewService + '?';
        this.layers[layer.LayerId + '_' + inheritedIndexLayer] = new WMSLayer({
          url: viewService,
          featureInfoFormat: 'text/html',
          featureInfoUrl: viewService,
          //id: layer.LayerId,
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
      } else if (viewService.toLowerCase().includes('wmts')) {
        this.layers[layer.LayerId + '_' + inheritedIndexLayer] = new WMTSLayer({
          url: viewService.endsWith('?') ? viewService : viewService + '?',
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
        });
      } else {
        this.layers[
          layer.LayerId + '_' + inheritedIndexLayer
        ] = new FeatureLayer({
          url:
            viewService +
            (viewService.endsWith('/') ? '' : '/') +
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
        // si es cero será el maximo. las filas serán el array invertido
        // tengo que extrarer de alguna manera la cantidad de filas y columnas que se muestran.

        return this.urlTemplate
          .replace('{z}', level)
          .replace('{x}', col)
          .replace('{y}', row);
      },

      // This method fetches tiles for the specified level and size.
      // Override this method to process the data returned from the server.
      fetchTile: function (level, row, col, options) {
        // call getTileUrl() method to construct the URL to tiles
        // for a given level, row and col provided by the LayerView

        // Images pyramid formula
        if (this.tms) {
          var rowmax = 1 << level; // LEVEL 1 * (2 ** 1) = 1 * (2) = 2   ;   LEVEL 2 * (2 ** 2) = 1 * (4) = 4 ; LEVEL 3 * (2 ** 3) = 1 * (8) = 8 . . .
          row = rowmax - row - 1; // Invert Y axis
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
    this.layers[checkboxId] = new CustomTileLayer({
      id: checkboxId,
      tms: true, // True establishes Y axis from the south northwards. False establishes tile origin top left and Y from north southwards (Default False)
      urlTemplate: layer.LayerUrl,
      // TMS Service.
      // 'https://s3-eu-west-1.amazonaws.com/vito-lcv/global/2019/cog-full_l0-colored-full/{z}/{x}/{y}.png',
      // Google/ESRI/OSM tiling style services
      // "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      // "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
      // "https://stamen-tiles.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.jpg",
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
  }

  /**
   * Method to show/hide a layer. Update checkboxes from dataset and products
   * @param {*} elem Is the checkbox
   */

  checkForHotspots(elem, productContainerId) {
    let elemContainer = document
      .getElementById(elem.id)
      .closest('.ccl-form-group');
    let nextElemSibling = elemContainer.nextElementSibling;
    let previousElemSibling = elemContainer.previousElementSibling;

    let siblingInput;
    let dataSetContainer = [];

    let productContainer = document.querySelector(
      '[productid="' + productContainerId + '"]',
    );

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

    for (let g = 1; g < dataSetContents.length; g++) {
      if (dataSetContents[g].checked) {
        currentDataSetLayer = dataSetContents[g];
        currentDataSetLayerSpan = currentDataSetLayer.nextSibling.querySelector(
          'span',
        );
        currentElemContainerSpan = elemContainer.querySelector('span');

        if (
          (currentDataSetLayerSpan.innerText.includes('Modular') &&
            currentElemContainerSpan.innerText.includes('Modular')) ||
          (currentDataSetLayerSpan.innerText.includes('Dichotomous') &&
            currentElemContainerSpan.innerText.includes('Dichotomous'))
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
          (currentDataSetLayerSpan.innerText.includes('Modular') &&
            currentElemContainerSpan.innerText.includes('Modular')) ||
          (currentDataSetLayerSpan.innerText.includes('Dichotomous') &&
            currentElemContainerSpan.innerText.includes('Dichotomous'))
        ) {
          this.setState({});
          return;
        } else {
          if (currentDataSetLayer && currentDataSetLayer.checked) {
            currentDataSetLayer.click();
          }
          if (currentDataSetLayer && !currentDataSetLayer.checked) {
            dataSetLayerInput.click();
          }
        }
      }
    }

    this.setState({});
  }

  async toggleLayer(elem) {
    if (!this.visibleLayers) this.visibleLayers = {};
    if (!this.timeLayers) this.timeLayers = {};
    let parentId = elem.getAttribute('parentid');
    let productContainerId = document
      .getElementById(parentId)
      .closest('.map-menu-product-dropdown')
      .getAttribute('productid');
    let modularLC;
    if (elem.id.includes('all_present_lc_b_pol')) {
      modularLC = elem.id;
    }

    let group = this.getGroup(elem);
    if (elem.checked) {
      if (this.props.download || this.location.search !== '') {
        if (
          this.extentInitiated === false &&
          productContainerId !== 'd764e020485a402598551fa461bf1db2'
        ) {
          this.extentInitiated = true;
          setTimeout(() => {
            this.fullExtent(elem);
          }, 2000);
        }
      }
      if (this.layers['lc_filter'] || this.layers['lcc_filter']) {
        if (elem.id.includes('cop_klc')) {
          this.layers['klc_filter'].visible = true;
          this.map.add(this.layers['klc_filter']);
        } else if (elem.id.includes('protected_areas')) {
          this.layers['pa_filter'].visible = true;
          this.map.add(this.layers['pa_filter']);
        } else {
          this.map.add(this.layers[elem.id]);
        }
      } else if (this.layers[modularLC]) {
        let previousElem = document
          .getElementById(elem.id)
          .closest('.ccl-form-group')
          .previousElementSibling.querySelector('input');
        this.map.add(this.layers[previousElem.id]);
      } else {
        this.map.add(this.layers[elem.id]);
      }
      this.layers[elem.id].visible = true; //layer id
      this.visibleLayers[elem.id] = ['fas', 'eye'];
      this.timeLayers[elem.id] = ['far', 'clock'];
      if (group) {
        elem.title = this.getLayerTitle(this.layers[elem.id]);
        let groupLayers = this.getGroupLayers(group);
        if (groupLayers.length > 0 && groupLayers[0] in this.activeLayersJSON) {
          elem.hide = true;
        }
        this.activeLayersJSON[elem.id] = this.addActiveLayer(
          elem,
          Object.keys(this.activeLayersJSON).length,
        );
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
      this.checkForHotspots(elem, productContainerId);
    } else {
      sessionStorage.removeItem('downloadButtonClicked');
      sessionStorage.removeItem('timeSliderTag');
      this.deleteCheckedLayer(elem.id);
      this.deleteFilteredLayer(elem.id);
      this.layers[elem.id].opacity = 1;
      this.layers[elem.id].visible = false;
      let mapLayer = this.map.findLayerById(elem.id);
      if (mapLayer) mapLayer.destroy();
      this.map.remove(this.layers[elem.id]);
      delete this.activeLayersJSON[elem.id];
      delete this.visibleLayers[elem.id];
      delete this.timeLayers[elem.id];
    }
    this.updateCheckDataset(parentId);
    this.layersReorder();
    this.checkInfoWidget();
    // toggle custom legend for WMTS and TMS
    if (
      this.layers[elem.id].ViewService.toLowerCase().includes('wmts') ||
      this.layers[elem.id].ViewService.toLowerCase().endsWith('file')
    ) {
      this.toggleCustomLegendItem(this.layers[elem.id]);
    }
    // update DOM
    this.setState({});
  }

  //CLMS-1634 - This shows the zoom message for the checked dataset under the Snow and Ice Parameters Products dropdown only.

  showZoomMessageOnDataset(dataset) {
    if (this.props.download) return;
    let snowAndIceParameters;
    for (let i = 0; i < this.compCfg.length; i++) {
      if (this.compCfg[i].ComponentTitle === 'Bio-geophysical Parameters') {
        for (let j = 0; j < this.compCfg[i].Products.length; j++) {
          if (
            this.compCfg[i].Products[j].ProductId ===
            '8474c3b080fa42cc837f1d2338fcf096'
          ) {
            snowAndIceParameters = this.compCfg[i].Products[j];
            break;
          }
        }
        break;
      }
    }

    snowAndIceParameters.Datasets.forEach((set) => {
      if (set.DatasetTitle.includes(dataset.title)) {
        let node = document.getElementById(dataset.id).nextElementSibling
          .lastElementChild.lastChild.lastElementChild;
        if (dataset.checked) {
          node.style.display = 'block';
        } else {
          node.style.display = 'none';
        }
      }
    });
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
        existingItem.style.display = 'block';
      }
    } else {
      // hide legend item
      if (existingItem) {
        existingItem.style.display = 'none';
      }
    }
  }

  addCustomItemToLegend(layer) {
    // Find legend widget node
    const legendDiv = document.querySelectorAll('.esri-widget.esri-legend')[0];
    let childDiv = legendDiv.firstChild;

    // create legend element
    let legendItem = this.createStaticLegendImageNode(
      layer.id,
      layer.LayerTitle,
      layer.StaticImageLegend,
    );

    // append to Legend widet
    childDiv.appendChild(legendItem);

    // hide no legend message
    const noLegendMessage = document.querySelectorAll(
      '.esri-legend__message',
    )[0];
    if (noLegendMessage) {
      noLegendMessage.style.display = 'none';
    }
  }

  createStaticLegendImageNode(id, title, imageURL) {
    let node = document.createElement('div');
    node.classList.add('esri-legend__service');
    node.id = 'custom-legend-item-' + id;

    // Create node
    let template = `
    <div class="esri-legend__layer"> 
      <div class="esri-legend__layer-table esri-legend__layer-table--size-ramp" > 
        <div class="esri-legend__layer-caption"> 
          ${title} 
        </div> 
        <div class="esri-legend__layer-body"> 
          <div class="esri-legend__layer-row"> 
            <div class="esri-legend__layer-cell esri-legend__layer-cell--symbols" > 
              <div class="esri-legend__symbol"> 
                <img crossorigin="anonymous" 
                  alt="" 
                  src="${imageURL}"
                  style="opacity: 1" 
                /> 
              </div> 
            </div> 
            <div 
              class="esri-legend__layer-cell esri-legend__layer-cell--info"
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
    let activeLayers = Array.from(
      document.querySelectorAll('.active-layer'),
    ).map((elem) => {
      return elem.getAttribute('layer-id');
    });
    let data = activeLayersArray.sort(
      (a, b) =>
        activeLayers.indexOf(a.props['layer-id']) -
        activeLayers.indexOf(b.props['layer-id']),
    );
    this.activeLayersHandler(activeLayersArray);
    return data;
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
      for (let i = 0; i < splitdefCheck.length; i++) {
        selector = document.querySelector(`[id="${splitdefCheck[i]}"]`);
        layerChecks.push(selector);
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
      for (let i = 0; i < splitdefCheck.length; i++) {
        selector = document.querySelector(`[id="${splitdefCheck[i]}"]`);
        datasetChecks.push(selector);
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
  }
  findCheckedDatasetNoServiceToVisualize(elem) {
    let parentId = elem.getAttribute('parentid');
    let selectedDataset = document.querySelector('[id="' + parentId + '"]');
    this.compCfg.forEach((component) => {
      component.Products.forEach((product) => {
        product.Datasets.forEach((dataset) => {
          if (dataset.DatasetTitle.includes(selectedDataset.title)) {
            return dataset.MarkAsDownloadableNoServiceToVisualize;
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
  parseBBOXWMS(xml) {
    const layerParentNode = xml.querySelectorAll('Layer');
    let layersChildren = Array.from(layerParentNode).filter(
      (v) => v.querySelectorAll('Layer').length === 0,
    );
    let layerParent = Array.from(layerParentNode).filter(
      (v) => v.querySelectorAll('Layer').length !== 0,
    );
    let BBoxes = {};
    let layerGeoGraphic = {};
    for (let i in layersChildren) {
      if (
        layersChildren[i].querySelector('EX_GeographicBoundingBox') !== null
      ) {
        // If the layer has BBOX
        layerGeoGraphic = layersChildren[i].querySelector(
          'EX_GeographicBoundingBox',
        );
      } else {
        // If the layer has no BBOX, it was assigned dataset BBOX
        layerGeoGraphic = layerParent[0].querySelector(
          'EX_GeographicBoundingBox',
        );
      }
      BBoxes[layersChildren[i].querySelector('Name').innerText] = {
        xmin: Number(
          layerGeoGraphic.querySelector('westBoundLongitude').innerText,
        ),
        ymin: Number(
          layerGeoGraphic.querySelector('southBoundLatitude').innerText,
        ),
        xmax: Number(
          layerGeoGraphic.querySelector('eastBoundLongitude').innerText,
        ),
        ymax: Number(
          layerGeoGraphic.querySelector('northBoundLatitude').innerText,
        ),
      };
    }
    // Add dataset bbox
    layerGeoGraphic = layerParent[0].querySelector('EX_GeographicBoundingBox');
    BBoxes['dataset'] = {
      xmin: Number(
        layerGeoGraphic.querySelector('westBoundLongitude').innerText,
      ),
      ymin: Number(
        layerGeoGraphic.querySelector('southBoundLatitude').innerText,
      ),
      xmax: Number(
        layerGeoGraphic.querySelector('eastBoundLongitude').innerText,
      ),
      ymax: Number(
        layerGeoGraphic.querySelector('northBoundLatitude').innerText,
      ),
    };
    return BBoxes;
  } // function parseWMS
  // Web Map Tiled Services WMTS
  parseBBOXWMTS(xml) {
    let BBoxes = {};
    let layersChildren = null;
    let layerParent = null;
    const layerParentNode = xml.querySelectorAll('Layer');
    layersChildren = Array.from(layerParentNode).filter(
      (v) => v.querySelectorAll('Layer').length === 0,
    );
    layerParent = Array.from(layerParentNode).filter(
      (v) => v.querySelectorAll('Layer').length !== 0,
    );
    let LowerCorner,
      UpperCorner = [];
    for (let i in layersChildren) {
      if (
        this.parseCapabilities(layersChildren[i], 'ows:LowerCorner').length !==
        0
      ) {
        // If the layer has BBOX
        LowerCorner = this.parseCapabilities(
          layersChildren[i],
          'ows:LowerCorner',
        )[0].innerText.split(' ');
        UpperCorner = this.parseCapabilities(
          layersChildren[i],
          'ows:UpperCorner',
        )[0].innerText.split(' ');
      } else if (
        this.parseCapabilities(layerParent, 'ows:LowerCorner').length !== 0
      ) {
        // If the layer has no BBOX, it was assigned dataset BBOX
        LowerCorner = this.parseCapabilities(
          layerParent,
          'ows:LowerCorner',
        )[0].innerText.split(' ');
        UpperCorner = this.parseCapabilities(
          layerParent,
          'ows:UpperCorner',
        )[0].innerText.split(' ');
      }
      BBoxes[
        this.parseCapabilities(layersChildren[i], 'ows:Title')[0].innerText
      ] = {
        xmin: Number(LowerCorner[0]),
        ymin: Number(LowerCorner[1]),
        xmax: Number(UpperCorner[0]),
        ymax: Number(UpperCorner[1]),
      };
    }
    if (
      typeof layerParent === 'object' &&
      layerParent !== null &&
      'getElementsByTagName' in layerParent
    ) {
      LowerCorner = this.parseCapabilities(
        layerParent,
        'ows:LowerCorner',
      )[0]?.innerText.split(' ');
      UpperCorner = this.parseCapabilities(
        layerParent,
        'ows:UpperCorner',
      )[0].innerText.split(' ');

      BBoxes['dataset'] = {
        xmin: Number(LowerCorner[0]),
        ymin: Number(LowerCorner[1]),
        xmax: Number(UpperCorner[0]),
        ymax: Number(UpperCorner[1]),
      };
    }
    return BBoxes;
  }

  parseCapabilities(xml, tag) {
    return xml.getElementsByTagName(tag);
  }

  getCapabilities = (url, serviceType) => {
    // Get the coordinates of the click on the view
    return esriRequest(url, {
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
  async fullExtent(elem) {
    this.findCheckedDataset(elem);
    let BBoxes = {};
    let firstLayer;

    if (this.productId.includes('333e4100b79045daa0ff16466ac83b7f')) {
      this.findDatasetBoundingBox(elem);

      BBoxes = this.parseBBOXJSON(this.dataBBox);
    } else if (
      this.productId.includes('fe8209dffe13454891cea05998c8e456') ||
      this.productId.includes('8914fde2241a4035818af8f0264fd55e')
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
          spatialReference: 3857, // by default wkid 4326
        });

        this.view.goTo(myExtent);
      }
    } else if (this.url.toLowerCase().includes('wms')) {
      await this.getCapabilities(this.url, 'wms');

      BBoxes = this.parseBBOXWMS(this.xml);
    } else if (this.url.toLowerCase().includes('wmts')) {
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
        !this.productId.includes('333e4100b79045daa0ff16466ac83b7f') &&
        !(
          this.state.url === 'http://localhost:3000/en/map-viewer' ||
          this.state.url ===
            'https://clmsdemo.devel6cph.eea.europa.eu/en/map-viewer' ||
          this.state.url === 'https://clms-prod.eea.europa.eu/en/map-viewer'
        )
      ) {
        firstLayer = BBoxes.dataset;
      } else if (this.productId.includes('130299ac96e54c30a12edd575eff80f7')) {
        if (elem.title.includes('Guadeloupe')) {
          firstLayer = BBoxes[Object.keys(BBoxes)[0]];
        } else if (elem.title.includes('French Guiana')) {
          firstLayer = BBoxes[Object.keys(BBoxes)[1]];
        } else if (elem.title.includes('Martinique')) {
          firstLayer = BBoxes[Object.keys(BBoxes)[2]];
        } else if (elem.title.includes('Mayotte')) {
          firstLayer = BBoxes[Object.keys(BBoxes)[3]];
        } else if (elem.title.includes('Reunion')) {
          firstLayer = BBoxes[Object.keys(BBoxes)[4]];
        } else {
          firstLayer =
            BBoxes[Object.keys(BBoxes)[Object.keys(BBoxes).length - 1]];
        }
      } else if (
        elem.id.includes('all_present') ||
        elem.id.includes('all_lcc') ||
        elem.id.includes('cop_klc') ||
        elem.id.includes('protected_areas')
      ) {
        firstLayer = BBoxes['all_present_lc_a_pol'];
      } else {
        firstLayer = BBoxes[Object.keys(BBoxes)[0]];
      }

      let myExtent = new Extent({
        xmin: firstLayer.xmin,
        ymin: firstLayer.ymin,
        xmax: firstLayer.xmax,
        ymax: firstLayer.ymax,
        // spatialReference: 4326 // by default wkid 4326
      });
      this.view.goTo(myExtent);
    }
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
        // {...(elem.hide && { style: { display: 'none' } })}
        onDrop={(e) => this.onDrop(e)}
        onDragOver={(e) => this.onDragOver(e)}
        onDragStart={(e) => this.onDragStart(e)}
      >
        <div className="active-layer-name" name={elem.id} key={'b_' + elem.id}>
          {elem.title}
        </div>
        <div className="active-layer-options" key={'c_' + elem.id}>
          {!this.findCheckedDatasetNoServiceToVisualize(elem) && (
            <span
              className="map-menu-icon active-layer-extent"
              onClick={() => this.fullExtent(elem)}
              onKeyDown={() => this.fullExtent(elem)}
              tabIndex="0"
              role="button"
            >
              <Popup
                trigger={
                  <FontAwesomeIcon icon={['fas', 'expand-arrows-alt']} />
                }
                content="Full extent"
                {...popupSettings}
              />
            </span>
          )}
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

    //First, we decide how to insert the element in the DOM
    let init_ord = this.draggingElement.getAttribute('layer-order');
    let dst_ord = dst.getAttribute('layer-order');

    if (init_ord > dst_ord) {
      dst.parentElement.insertBefore(this.draggingElement, dst.nextSibling);
    } else {
      dst.parentElement.insertBefore(this.draggingElement, dst);
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
    activeLayers.forEach((item, index) => {
      let order = counter - index;
      item.setAttribute('layer-order', order);
      this.layerReorder(this.layers[item.getAttribute('layer-id')], order);
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
      newLayerOrder.push(activeLayers[i].getAttribute('layer-id'));
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
        let order = this.activeLayersJSON[elem.id].props['layer-order'];
        if (groupLayers.includes(layerId)) {
          elem = document.getElementById(layerId);
        }
        if (elem.id === layerId) {
          this.timeLayers[elem.id] = ['fas', 'stop'];
          if (this.visibleLayers[elem.id][1] === 'eye-slash') {
            this.layers[elem.id].visible = true;
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
          document.querySelector('#products_label').classList.add('locked');
          document.querySelector('#map_remove_layers').classList.add('locked');
          if (this.props.download)
            document.querySelector('#download_label').classList.add('locked');
          this.activeLayersJSON[elem.id] = this.addActiveLayer(
            elem,
            order,
            fromDownload,
            hideCalendar,
          );
        } else {
          if (
            document.getElementById(layerId).parentElement.dataset
              .timeseries === 'true'
          ) {
            if (this.visibleLayers[layerId][1] === 'eye') {
              this.layers[layerId].visible = false;
              this.visibleLayers[layerId] = ['fas', 'eye-slash'];
            }
            document
              .querySelector('.active-layer[layer-id="' + layerId + '"]')
              .classList.add('locked');
          }
          this.activeLayersJSON[layerId] = this.addActiveLayer(
            document.getElementById(layerId),
            order,
            fromDownload,
          );
        }
      });
      if (document.querySelector('.opacity-panel').style.display === 'block') {
        this.closeOpacity();
      }
    } else {
      activeLayers.forEach((layer) => {
        let layerId = layer.getAttribute('layer-id');
        let order = this.activeLayersJSON[elem.id].props['layer-order'];
        if (groupLayers.includes(layerId)) {
          elem = document.getElementById(layerId);
        }
        if (elem.id === layerId) {
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
          document.querySelector('#products_label').classList.remove('locked');
          document
            .querySelector('#map_remove_layers')
            .classList.remove('locked');
          if (this.props.download) {
            document
              .querySelector('#download_label')
              .classList.remove('locked');
            if (
              document.querySelector(
                '.active-layer[layer-id="' +
                  elem.id +
                  '"] .map-menu-icon.active-layer-time',
              ).dataset.download === 'true'
            ) {
              document.getElementById('download_label').click();
            }
          } else {
            if (
              document.querySelector(
                '.active-layer[layer-id="' +
                  elem.id +
                  '"] .map-menu-icon.active-layer-time',
              ).dataset.download === 'true'
            ) {
              document.getElementById('products_label').click();
            }
          }
          if (
            document.contains(document.querySelector('.timeslider-container'))
          )
            ReactDOM.unmountComponentAtNode(
              document.querySelector('.esri-ui-bottom-right'),
            );
          if (document.querySelector('.drawRectanglePopup-block'))
            document.querySelector('.drawRectanglePopup-block').style.display =
              'block';
        } else {
          if (this.visibleLayers[layerId][1] === 'eye-slash') {
            this.layers[layerId].visible = true;
            this.visibleLayers[layerId] = ['fas', 'eye'];
            this.activeLayersJSON[layerId] = this.addActiveLayer(
              document.getElementById(layerId),
              order,
              fromDownload,
            );
          }
          document
            .querySelector('.active-layer[layer-id="' + layerId + '"]')
            .classList.remove('locked');
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
    if (!sessionStorage.getItem('hotspotFilterApplied')) {
      if (layers.length === 0 && document.querySelector('.info-container')) {
        this.props.mapViewer.closeActiveWidget();
        document.querySelector('.info-container').style.display = 'none';
      } else if (layers.length > 0) {
        document.querySelector('.info-container').style.display = 'flex';
      }
    }
    this.renderHotspot();
    /**/
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
    if (
      document.querySelector('.opacity-slider input').dataset.layer !== elem.id
    ) {
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
    }
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
    } else {
      this.layers[layer].opacity = value / 100;
      this.saveOpacity(layer, value / 100);
    }
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

  setLegendOpacity() {
    const collection = document.getElementsByClassName('esri-legend__symbol');

    Array.prototype.forEach.call(collection, function (element) {
      let img = {};

      if (element.hasChildNodes()) {
        img = element.childNodes[0];
      } else {
        img = element;
      }
      // Set Legend opacity back to 1;
      if (img) {
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
    let layerOpacities = JSON.parse(sessionStorage.getItem('layerOpacities'));
    if (layerOpacities === null) {
      layerOpacities = {};
      layerOpacities[layer] = value;
      sessionStorage.setItem('layerOpacities', JSON.stringify(layerOpacities));
    } else {
      layerOpacities[layer] = value;
      sessionStorage.setItem('layerOpacities', JSON.stringify(layerOpacities));
    }
  }

  /**
   * Loads a previously configured layer opacity from sessionStorage and applies it to the map and input element
   * @param {*} layer The layer in question
   * @param {*} value The opacity value retrieved from the input
   */
  loadOpacity() {
    let layerOpacities = JSON.parse(sessionStorage.getItem('layerOpacities'));
    if (layerOpacities) {
      for (const layer in layerOpacities) {
        if (this.layers[layer]) {
          let value = layerOpacities[layer];
          // set map
          this.layers[layer].opacity = value;
          // set slider
          let node = document.querySelector(
            '.active-layer[layer-id="' + layer + '"] .active-layer-opacity',
          );
          if (node) {
            node.dataset.opacity = value * 100;
          }
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
    this.findCheckedDataset(elem);
    if (this.visibleLayers[elem.id][1] === 'eye') {
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

    this.saveVisibility();
    this.activeLayersJSON[elem.id] = this.addActiveLayer(elem, 0);
    this.layersReorder();
    this.saveLayerOrder();
    this.checkInfoWidget();
    this.setState({});
    if (this.productId.includes('333e4100b79045daa0ff16466ac83b7f')) {
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
  }

  /**
   * Saves the layer visibility (eye icon state) to sessionStorage
   */
  saveVisibility() {
    if (this.props.download) return;
    sessionStorage.setItem('visibleLayers', JSON.stringify(this.visibleLayers));
  }

  /**
   * Loads the layer visibility (eye icon state) from sessionStorage
   */
  loadVisibility() {
    if (this.props.download) return;
    let vl = JSON.parse(sessionStorage.getItem('visibleLayers'));
    if (vl) {
      this.visibleLayers = vl;

      for (const key in this.visibleLayers) {
        if (this.visibleLayers[key][1] === 'eye') {
          this.layers[key].visible = true;
        } else {
          this.layers[key].visible = false;
        }

        let elem = document.getElementById(key);
        if (this.activeLayersJSON[elem.id]) {
          let order = this.activeLayersJSON[elem.id].props['layer-order'];
          // add active layer to DOM
          this.activeLayersJSON[elem.id] = this.addActiveLayer(elem, order);
          // reorder layers
          this.layersReorder();
          // show/hide info widget
          this.checkInfoWidget();
          // update
          this.setState({});
        }
      }
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
    });
  }

  /**
   * Method to save checked layers
   */
  saveCheckedLayer(layer) {
    if (this.props.download) return;
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
  }

  deleteFilteredLayer(layer) {
    let layers = this.layers;
    if (layers['lcc_filter'] && layer.includes('all_lcc')) {
      layers['lcc_filter'].visible = false;
      delete layers['lcc_filter'];
    } else if (layers['lc_filter'] && layer.includes('all_present_lc')) {
      layers['lc_filter'].visible = false;
      delete layers['lc_filter'];
    } else if (layers['klc_filter'] && layer.includes('cop_klc')) {
      layers['klc_filter'].visible = false;
    } else if (layers['pa_filter'] && layer.includes('protected_areas')) {
      layers['pa_filter'].visible = false;
    }
  }

  /**
   * Method to load previously expanded dropdowns according to sessionStorage
   */
  expandDropdowns() {
    if (this.props.download) return;
    let expandedDropdowns = JSON.parse(
      sessionStorage.getItem('expandedDropdowns'),
    );
    if (expandedDropdowns) {
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

  showZoomMessageForDatasets() {
    if (!this.props.download) {
      let nodes = document.querySelectorAll('.zoom-in-message-dataset');
      if (nodes) {
        nodes.forEach((node) => {
          node.style.display = 'none';
        });
      }
    }
  }

  /**
   * Method to change between tabs
   */
  toggleTab(e) {
    if (!e.currentTarget.classList.contains('tab-selected')) {
      this.storePanelScroll();
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
      let activeLayer = document.querySelector('#active_' + elem.id);
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
  checkTimeLayer(dataset, checkedLayers) {
    let id = dataset.DatasetId;
    let checkbox = document
      .querySelector('[datasetid="' + id + '"]')
      .querySelector('.map-dataset-checkbox input');
    if (!checkbox.checked) {
      checkbox.click();
    }
    document.getElementById('active_label').click();
    if (!document.querySelector('.timeslider-container')) {
      let layerId = this.findCheckedLayer(dataset, checkedLayers);
      setTimeout(() => {
        // Display timeslider with no calendar.
        this.showTimeSlider(document.getElementById(layerId), true, true);
      }, 100);
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
            <div className="panels" id="paneles">
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
                  />
                </div>
              )}
              {this.props.download &&
                this.compCfg[0].Products[0].Datasets[0]
                  .MarkAsDownloadableNoServiceToVisualize === true && (
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
              onKeyDown={this.openMenu.bind(this)}
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
