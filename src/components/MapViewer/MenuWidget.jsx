import ReactDOM from 'react-dom';
import React, { createRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { loadModules, loadCss } from 'esri-loader';
import useCartState from '@eeacms/volto-clms-utils/cart/useCartState';
import { useHistory } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { Message, Modal, Popup } from 'semantic-ui-react';
import AreaWidget from './AreaWidget';
import TimesliderWidget from './TimesliderWidget';
var WMSLayer, WMTSLayer, FeatureLayer;

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
  const [message, setMessage] = useState(0);
  const [showMessage, setShowMessage] = useState(false);
  const [modal, setModal] = useState(false);
  const history = useHistory();
  const { locale } = useIntl();

  const checkArea = () => {
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
    if (download) {
      setMessage(area ? 'Added to cart' : 'Select an area');
      showMessageTimer();
      if (area) {
        let data = checkCartData(cartData, area);
        addCartItem(data).then(() => {
          history.push('/' + locale + '/cart');
        });
      }
    } else {
      setModal(false);
      let data = checkCartData(cartData, area, dataset);
      addCartItem(data).then(() => {
        setMessage('Added to cart');
        showMessageTimer();
      });
    }
  };

  const checkCartData = (cartData, area, dataset) => {
    if (!dataset) {
      dataset = cartData[0].Products[0].Datasets[0];
    }
    let id = dataset.DatasetId;
    let datasetElem = document.querySelector('div[datasetid="' + id + '"]');
    let datasetData = {
      id: id,
      UID: id,
      unique_id: `${id}-${new Date().getTime()}`,
      area: area,
    };
    if (
      dataset.IsTimeSeries &&
      datasetElem
        .querySelector('.map-dataset-checkbox input')
        .hasAttribute('time-start')
    ) {
      let datasetInput = datasetElem.querySelector(
        '.map-dataset-checkbox input',
      );
      let time = {
        start: parseInt(datasetInput.getAttribute('time-start')),
        end: parseInt(datasetInput.getAttribute('time-end')),
      };
      datasetData.timeExtent = [time.start, time.end];
    }
    let data = [datasetData];
    return data;
  };

  const downloadCancel = (mapViewer) => {
    mapViewer.view.popup.close();
    mapViewer.view.graphics.removeAll();
    props.updateArea('');
  };

  const showMessageTimer = () => {
    setShowMessage(true);
    setTimeout(() => {
      setShowMessage(false);
    }, 4000);
  };

  const showModal = () => {
    setModal(true);
  };

  const closeModal = () => {
    setModal(false);
  };

  const checkScrollPosition = () => {
    let dt = document.querySelector(
      '.map-menu-dataset[datasetid="' +
        dataset.DatasetId +
        '"] .map-dataset-checkbox',
    );
    if (
      dt.offsetTop + dt.offsetHeight + 4 * 16 >
      document.querySelector('.panels').offsetHeight +
        document.querySelector('.panels').scrollTop
    ) {
      return 'translate(1rem, -5rem)';
    } else {
      return 'translate(1rem, 2rem)';
    }
  };

  const selectBBox = () => {
    if (
      !mapViewer.activeWidget ||
      !mapViewer.activeWidget.container.current.classList.contains(
        'area-container',
      )
    ) {
      let event = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: false,
      });
      let node = document.getElementById('map_area_button');
      node.dispatchEvent(event);
    }
    closeModal();
  };

  const showLogin = (e) => {
    e.stopPropagation();
    document.querySelector('.login-panel').style.display = 'block';
    let left = e.currentTarget.offsetLeft + 48;
    document.querySelector('.login-panel').style.left = left + 'px';
    let top =
      document.querySelector('.tabs').offsetHeight +
      15 -
      document.querySelector('.panels').scrollTop +
      e.currentTarget.closest('.ccl-expandable__button').offsetTop +
      e.currentTarget.closest('.ccl-expandable__button').offsetHeight / 2 -
      document.querySelector('.login-panel').offsetHeight / 2;
    document.querySelector('.login-panel').style.top = top + 'px';
  };

  return (
    <>
      {showMessage && (
        <Message
          floating
          size="small"
          style={{
            transform: download
              ? 'translate(1rem, 4rem)'
              : checkScrollPosition(),
          }}
        >
          {message}
        </Message>
      )}
      {download ? (
        <div className="map-download-buttons">
          <button
            id="map_download_add"
            className="ccl-button ccl-button-green"
            onClick={() => checkArea()}
          >
            Add to cart
          </button>
          <button
            id="map_download_cancel"
            className="ccl-button ccl-button--default"
            onClick={() => downloadCancel(mapViewer)}
          >
            Cancel
          </button>
        </div>
      ) : (
        <>
          <Modal
            size="tiny"
            onClose={() => closeModal()}
            onOpen={() => showModal()}
            open={modal}
            className="map-download-modal"
          >
            <div className="modal-close modal-clms-close">
              <span
                className="ccl-icon-close"
                aria-label="Close"
                onClick={() => closeModal()}
                onKeyDown={() => closeModal()}
                tabIndex="0"
                role="button"
              ></span>
            </div>
            <Modal.Content>
              <p>Do you want to add this dataset to the cart?</p>
              {!areaData && (
                <ul>
                  <li>
                    <p>
                      Add full dataset (Note: Download process will take longer
                      and for some very large datasets, a Bounding box for
                      Europe is selected by default).
                    </p>
                  </li>
                  <li>
                    <p>
                      Select bounding box if you would like to download one or
                      several datasets for area(s) of interest.
                    </p>
                  </li>
                  {dataset.IsTimeSeries && (
                    <li>
                      <p>
                        If you need to select a time period for the dataset go
                        to{' '}
                        <a href={dataset.DatasetURL + '/download-by-area'}>
                          Download by area
                        </a>
                        .
                      </p>
                    </li>
                  )}
                </ul>
              )}
            </Modal.Content>
            <Modal.Actions>
              <div className="map-download-buttons">
                {!areaData ? (
                  <>
                    <button
                      className="ccl-button ccl-button-green"
                      onClick={() => checkArea()}
                    >
                      Add full dataset
                    </button>
                    <button
                      className="ccl-button ccl-button--default"
                      onClick={() => selectBBox()}
                    >
                      Select bounding box
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="ccl-button ccl-button-green"
                      onClick={() => checkArea()}
                    >
                      Add to cart
                    </button>
                    <button
                      className="ccl-button ccl-button--default"
                      onClick={() => closeModal()}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </Modal.Actions>
          </Modal>
          <Popup
            trigger={
              <span
                className={'map-menu-icon map-menu-icon-login'}
                onClick={(e) => {
                  isLoggedIn ? showModal() : showLogin(e);
                }}
                onKeyDown={(e) => {
                  isLoggedIn ? showModal() : showLogin(e);
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
        </>
      )}
    </>
  );
};

export const CheckLogin = () => {
  const { isLoggedIn } = useCartState();
  return (
    <>
      {!isLoggedIn && (
        <div className="login-block">
          <div className="login-content">
            <a
              className="ccl-button ccl-button--default"
              href={'https://ecas.acceptance.ec.europa.eu/cas/'}
            >
              Login to download the data
            </a>
            <p className="login-block-new">
              New user?{' '}
              <a
                href={
                  'https://ecas.acceptance.ec.europa.eu/cas/eim/external/register.cgi'
                }
              >
                Follow this link to register
              </a>
            </p>
          </div>
        </div>
      )}
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
    this.state = { showMapMenu: false };
    // call the props of the layers list (mapviewer.jsx)
    this.compCfg = this.props.conf;
    this.map = this.props.map;
    this.menuClass =
      'esri-icon-drag-horizontal esri-widget--button esri-widget esri-interactive';
    this.loadFirst = true;
    this.layers = {};
    this.activeLayersJSON = {};
    this.layerGroups = {};
  }

  loader() {
    return loadModules([
      'esri/layers/WMSLayer',
      'esri/layers/WMTSLayer',
      'esri/layers/FeatureLayer',
    ]).then(([_WMSLayer, _WMTSLayer, _FeatureLayer]) => {
      WMSLayer = _WMSLayer;
      WMTSLayer = _WMTSLayer;
      FeatureLayer = _FeatureLayer;
    });
  }

  /**
   * Method that will be invoked when the
   * button is clicked. It controls the open
   * and close actions of the component
   */
  openMenu() {
    if (this.state.showMapMenu) {
      this.container.current.querySelector('#tabcontainer').style.display =
        'none';
      this.container.current.querySelector('#paneles').style.display = 'none';
      this.container.current
        .querySelector('.esri-widget--button')
        .classList.replace('esri-icon-close', 'esri-icon-drag-horizontal');
      if (document.contains(document.querySelector('.timeslider-container'))) {
        document.querySelector('.timeslider-container').style.display = 'none';
      }
      if (document.querySelector('.opacity-panel').style.display === 'block') {
        this.closeOpacity();
      }
      if (document.querySelector('.login-panel').style.display === 'block') {
        this.closeLogin();
      }

      // By invoking the setState, we notify the state we want to reach
      // and ensure that the component is rendered again
      this.setState({ showMapMenu: false });
    } else {
      this.container.current.querySelector('#tabcontainer').style.display =
        'block';
      this.container.current.querySelector('#paneles').style.display = 'block';
      this.container.current
        .querySelector('.esri-widget--button')
        .classList.replace('esri-icon-drag-horizontal', 'esri-icon-close');
      if (document.contains(document.querySelector('.timeslider-container')))
        document.querySelector('.timeslider-container').style.display = 'block';

      // By invoking the setState, we notify the state we want to reach
      // and ensure that the component is rendered again
      this.setState({ showMapMenu: true });
    }
    if (this.loadFirst) {
      this.checkUrl();
      this.loadFirst = false;
      this.zoomTooltips();
    }
  }
  /**
   * This method is executed after the rener method is executed
   */
  async componentDidMount() {
    loadCss();
    await this.loader();
    this.props.view.ui.add(this.container.current, 'top-left');
    if (this.props.download) {
      // document.querySelector('.area-panel').style.display = 'block';
      document.querySelector('.area-panel input:checked').click();
      document.querySelector('.map-product-checkbox input').click();
      let dropdown = document.querySelector(
        '.map-menu-dropdown .ccl-expandable__button',
      );
      dropdown.setAttribute('aria-expanded', 'true');
      dropdown = document.querySelector(
        '.map-menu-product-dropdown .ccl-expandable__button',
      );
      dropdown.setAttribute('aria-expanded', 'true');
    }
    //to watch the component
    this.setState({});
    this.openMenu();
    this.loadLayers();
  }

  checkUrl() {
    let url = new URL(window.location.href);
    let product = url.searchParams.get('product');
    let dataset = url.searchParams.get('dataset');
    if (product || dataset) {
      let event = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: false,
      });
      let elem = product
        ? '[productid="' + product + '"]'
        : '[datasetid="' + dataset + '"]';
      let node = document.querySelector(elem + ' input');
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
        scrollPosition = document
          .querySelector(elem + ' input')
          .closest('.map-menu-dataset').offsetTop;
      }
      document.querySelector('.panels').scrollTop = scrollPosition;
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

  /**
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
      products.push(
        this.metodProcessProduct(
          component.Products[i],
          index,
          inheritedIndexComponent,
        ),
      );
      index++;
    }

    return (
      <div
        className="map-menu-dropdown"
        id={'component_' + inheritedIndexComponent}
        key={'a' + compIndex}
      >
        <div
          className="ccl-expandable__button"
          aria-expanded="false"
          key={'b' + compIndex}
          onClick={this.toggleDropdownContent.bind(this)}
          onKeyDown={this.toggleDropdownContent.bind(this)}
          tabIndex="0"
          role="button"
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

    // Empty vector, add the first dataset
    if (!dataset_def.length) {
      var idDatasetB = 'map_dataset_' + inheritedIndexProduct + '_0';
      dataset_def.push(idDatasetB);
    }
    return (
      <div
        className="map-menu-product-dropdown"
        id={'product_' + inheritedIndexProduct}
        productid={product.ProductId}
        key={'a' + prodIndex}
      >
        <fieldset className="ccl-fieldset" key={'b' + prodIndex}>
          <div
            className="ccl-expandable__button"
            aria-expanded="false"
            key={'c' + prodIndex}
            onClick={this.toggleDropdownContent.bind(this)}
            onKeyDown={this.toggleDropdownContent.bind(this)}
            tabIndex="0"
            role="button"
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
      document.querySelectorAll('[parentid=' + productid + ']'),
    );
    let productCheck = document.querySelector('#' + productid);
    let trueCheck = datasetChecks.filter((elem) => elem.checked).length;

    productCheck.checked = trueCheck > 0;
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
    var description =
      dataset.DatasetDescription && dataset.DatasetDescription.length >= 300
        ? dataset.DatasetDescription.substr(0, 300) + '...'
        : dataset.DatasetDescription;

    if (dataset.HandlingLevel) {
      this.layerGroups[dataset.DatasetId] = [];
    }
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
          layer_default,
          dataset.HandlingLevel,
        ),
      );
      index++;
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
            className="ccl-expandable__button"
            aria-expanded="false"
            key={'c' + datIndex}
            onClick={this.toggleDropdownContent.bind(this)}
            onKeyDown={this.toggleDropdownContent.bind(this)}
            tabIndex="0"
            role="button"
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
                  {description ? (
                    <Popup
                      trigger={<span>{dataset.DatasetTitle}</span>}
                      content={description}
                      basic
                      className="custom"
                      style={{ transform: 'translateX(-5.5rem)' }}
                    />
                  ) : (
                    <span>{dataset.DatasetTitle}</span>
                  )}
                </label>
                <div className="map-menu-icons">
                  <a href={dataset.DatasetURL} target="_blank" rel="noreferrer">
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
                  {!this.props.download && dataset.Downloadable ? (
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
      document.querySelectorAll('[parentid=' + id + ']'),
    );

    let trueChecks = layerChecks.filter((elem) => elem.checked).length;
    datasetCheck.checked = trueChecks > 0;

    this.updateCheckProduct(datasetCheck.getAttribute('parentid'));
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
    urlWMS,
    featureInfoUrl,
    parentIndex,
    isTimeSeries,
    layer_default,
    handlingLevel,
  ) {
    //For Legend request
    const legendRequest =
      'request=GetLegendGraphic&version=1.0.0&format=image/png&layer=';
    //For each layer
    var inheritedIndexLayer = inheritedIndex + '_' + layerIndex;
    //Add sublayers and popup enabled for layers
    if (
      !this.layers.hasOwnProperty(layer.LayerId + '_' + inheritedIndexLayer)
    ) {
      if (urlWMS.toLowerCase().includes('wms')) {
        urlWMS = urlWMS.endsWith('?') ? urlWMS : urlWMS + '?';
        this.layers[layer.LayerId + '_' + inheritedIndexLayer] = new WMSLayer({
          url: urlWMS,
          featureInfoFormat: 'text/html',
          featureInfoUrl: urlWMS,
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
              legendUrl: urlWMS + legendRequest + layer.LayerId,
              featureInfoUrl: featureInfoUrl,
            },
          ],
          isTimeSeries: isTimeSeries,
        });
      } else if (urlWMS.toLowerCase().includes('wmts')) {
        this.layers[layer.LayerId + '_' + inheritedIndexLayer] = new WMTSLayer({
          url: urlWMS.endsWith('?') ? urlWMS : urlWMS + '?',
          //id: layer.LayerId,
          title: '',
          activeLayer: {
            id: layer.LayerId,
            title: layer.Title,
            featureInfoUrl: featureInfoUrl,
          },
          isTimeSeries: isTimeSeries,
        });
      } else {
        this.layers[
          layer.LayerId + '_' + inheritedIndexLayer
        ] = new FeatureLayer({
          url: urlWMS + (urlWMS.endsWith('/') ? '' : '/') + layer.LayerId,
          id: layer.LayerId,
          title: layer.Title,
          featureInfoUrl: featureInfoUrl,
          popupEnabled: true,
          isTimeSeries: isTimeSeries,
        });
      }
    }
    let style = handlingLevel ? { display: 'none' } : {};
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
   * Method to show/hide a layer. Update checkboxes from dataset and products
   * @param {*} elem Is the checkbox
   */
  toggleLayer(elem) {
    if (!this.visibleLayers) this.visibleLayers = {};
    if (!this.timeLayers) this.timeLayers = {};
    let parentId = elem.getAttribute('parentid');
    let group = this.getGroup(elem);
    if (elem.checked) {
      this.map.add(this.layers[elem.id]);
      this.layers[elem.id].visible = true; //layer id
      this.visibleLayers[elem.id] = ['fas', 'eye'];
      this.timeLayers[elem.id] = ['far', 'clock'];
      if (group) {
        let dataset = document
          .querySelector('[datasetid="' + group + '"]')
          .querySelector('input');
        elem.title = dataset.title;
        let groupLayers = this.getGroupLayers(group);
        if (groupLayers.length > 0 && !this.activeLayersJSON[groupLayers[0]]) {
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
        this.saveLayer(elem.id);
      }
      let nuts = this.map.layers.items.find((layer) => layer.title === 'nuts');
      if (nuts) {
        this.map.reorder(nuts, this.map.layers.items.length + 1);
      }
    } else {
      this.deleteLayer(elem.id);
      this.layers[elem.id].opacity = 1;
      this.map.remove(this.layers[elem.id]);
      delete this.activeLayersJSON[elem.id];
      delete this.visibleLayers[elem.id];
      delete this.timeLayers[elem.id];
    }
    this.updateCheckDataset(parentId);
    this.checkInfoWidget();
    this.setState({});
    this.layersReorder();
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
      element.checked = value;
      this.toggleLayer(element);
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
      element.checked = value;
      this.toggleDataset(value, element.id, element);
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
  }

  /**
   * Method to show Active Layers of the map
   * @param {*} elem From the click event
   */
  addActiveLayer(elem, order) {
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
              onClick={() => this.showTimeSlider(elem)}
              onKeyDown={() => this.showTimeSlider(elem)}
              tabIndex="0"
              role="button"
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
            this.renderTimeslider(elem, this.layers[elem.id])}
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
    let group = this.getGroup(
      document.getElementById(this.draggingElement.getAttribute('layer-id')),
    )
      ? this.getGroup(
          document.getElementById(
            this.draggingElement.getAttribute('layer-id'),
          ),
        )
      : this.getGroup(document.getElementById(dst.getAttribute('layer-id')));
    let groupLayers = this.getGroupLayers(group);
    if (init_ord > dst_ord) {
      dst.parentElement.insertBefore(this.draggingElement, dst.nextSibling);
    } else {
      dst.parentElement.insertBefore(this.draggingElement, dst);
    }
    if (group && groupLayers.length > 1) {
      groupLayers.forEach((item, index) => {
        if (
          this.draggingElement.getAttribute('layer-id') !== item ||
          dst.getAttribute('layer-id') !== item
        ) {
          dst.parentElement.insertBefore(
            document.getElementById('active_' + item),
            this.draggingElement.nextSibling,
          );
        }
      });
    }
    this.layersReorder();
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
  showTimeSlider(elem) {
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
          this.activeLayersJSON[elem.id] = this.addActiveLayer(elem, order);
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
          this.activeLayersJSON[elem.id] = this.addActiveLayer(elem, order);
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
          if (this.props.download)
            document
              .querySelector('#download_label')
              .classList.remove('locked');
          if (
            document.contains(
              document.querySelector('.timeslider-container'),
            ) &&
            !this.props.download
          )
            ReactDOM.unmountComponentAtNode(
              document.querySelector('.esri-ui-bottom-right'),
            );
        } else {
          if (this.visibleLayers[layerId][1] === 'eye-slash') {
            this.layers[layerId].visible = true;
            this.visibleLayers[layerId] = ['fas', 'eye'];
            this.activeLayersJSON[layerId] = this.addActiveLayer(
              document.getElementById(layerId),
              order,
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
    if (layers.length === 0 && document.querySelector('.info-container')) {
      this.props.mapViewer.closeActiveWidget();
      document.querySelector('.info-container').style.display = 'none';
    } else if (layers.length > 0) {
      document.querySelector('.info-container').style.display = 'flex';
    }
  }

  getLayerTitle(layer) {
    let title;
    if (layer.sublayers) {
      title = layer.sublayers.items[0].title;
    } else if (layer.activeLayer) {
      title = layer.activeLayer.title;
    } else {
      title = layer.title;
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
  }

  setOpacity() {
    let layer = document.querySelector('.opacity-slider input').dataset.layer;
    let value = document.querySelector('.opacity-panel input').value;
    let group = this.getGroup(document.getElementById(layer));
    let groupLayers = this.getGroupLayers(group);
    if (group && groupLayers.length > 1) {
      groupLayers.forEach((item) => {
        this.layers[item].opacity = value / 100;
        document.querySelector(
          '.active-layer[layer-id="' + item + '"] .active-layer-opacity',
        ).dataset.opacity = value;
      });
    } else {
      this.layers[layer].opacity = value / 100;
      document.querySelector(
        '.active-layer[layer-id="' + layer + '"] .active-layer-opacity',
      ).dataset.opacity = value;
    }
  }

  closeOpacity() {
    document.querySelector('.opacity-panel').style.display = '';
    document.querySelector('.opacity-panel input').dataset.layer = '';
  }

  closeLogin() {
    document.querySelector('.login-panel').style.display = '';
  }

  /**
   * Method to show/hide layer from "Active Layers"
   * @param {*} e From the click event
   * @param {*} id id from elem
   */
  eyeLayer(elem) {
    let group = this.getGroup(elem);
    let groupLayers = this.getGroupLayers(group);
    if (this.visibleLayers[elem.id][1] === 'eye') {
      if (group && groupLayers.length > 1) {
        groupLayers.forEach((item) => {
          this.layers[item].visible = false;
          this.visibleLayers[item] = ['fas', 'eye-slash'];
        });
      } else {
        this.layers[elem.id].visible = false;
        this.visibleLayers[elem.id] = ['fas', 'eye-slash'];
      }
    } else {
      if (group && groupLayers.length > 1) {
        groupLayers.forEach((item) => {
          this.map.add(this.layers[item]);
          this.layers[item].visible = true;
          this.visibleLayers[item] = ['fas', 'eye'];
        });
      } else {
        this.map.add(this.layers[elem.id]);
        this.layers[elem.id].visible = true;
        this.visibleLayers[elem.id] = ['fas', 'eye'];
      }
    }
    if (group && groupLayers.length > 1) {
      groupLayers.forEach((item) => {
        elem = document.getElementById(item);
        this.activeLayersJSON[item] = this.addActiveLayer(elem, 0);
      });
    } else {
      this.activeLayersJSON[elem.id] = this.addActiveLayer(elem, 0);
    }
    this.layersReorder();
    this.checkInfoWidget();
    this.setState({});
  }

  /**
   * Method to delete layer from "Active Layers" and uncheck dataset and products
   * @param {*} e From the click event
   * @param {*} id id from elem
   */
  deleteCrossEvent(elem) {
    let group = this.getGroup(elem);
    let groupLayers = this.getGroupLayers(group);
    if (group && groupLayers.length > 1) {
      groupLayers.forEach((item) => {
        elem = document.getElementById(item);
        // elem has to be unchecked
        elem.checked = false;
        this.toggleLayer(elem);
        delete this.activeLayersJSON[elem.id];
      });
    } else {
      // elem has to be unchecked
      elem.checked = false;
      this.toggleLayer(elem);
      delete this.activeLayersJSON[elem.id];
    }
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
  saveLayer(layer) {
    let checkedLayers = JSON.parse(sessionStorage.getItem('checkedLayers'));
    if (checkedLayers === null) {
      checkedLayers = [layer];
      sessionStorage.setItem('checkedLayers', JSON.stringify(checkedLayers));
    } else {
      if (!checkedLayers.includes(layer)) {
        checkedLayers.push(layer);
      }
      sessionStorage.setItem('checkedLayers', JSON.stringify(checkedLayers));
    }
  }

  /**
   * Method to delete checked layers
   */
  deleteLayer(layer) {
    let checkedLayers = JSON.parse(sessionStorage.getItem('checkedLayers'));
    for (var i = 0; i < checkedLayers.length; i++) {
      if (checkedLayers[i] === layer) {
        checkedLayers.splice(i, 1);
      }
    }
    sessionStorage.setItem('checkedLayers', JSON.stringify(checkedLayers));
  }
  /**
   * Method to load previously checked layers
   */
  loadLayers() {
    let event = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: false,
    });

    let layers = JSON.parse(sessionStorage.getItem('checkedLayers'));
    if (layers) {
      for (let i = 0; i < layers.length; i++) {
        let elem = layers[i];
        let node = document.getElementById(elem);
        node.dispatchEvent(event);
        let dropdown = document
          .getElementById(elem)
          .closest('.map-menu-dropdown');
        dropdown
          .querySelector('.ccl-expandable__button')
          .setAttribute('aria-expanded', 'true');
        let scrollPosition = document
          .getElementById(elem)
          .closest('.map-menu-product-dropdown').offsetTop;
        document.querySelector('.panels').scrollTop = scrollPosition;
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

      if (document.querySelector('.opacity-panel').style.display === 'block') {
        this.closeOpacity();
      }
      if (document.querySelector('.login-panel').style.display === 'block') {
        this.closeLogin();
      }
    }
  }

  renderTimeslider(elem, layer) {
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
      ReactDOM.render(
        <TimesliderWidget
          view={this.props.view}
          map={this.map}
          layer={layer}
          download={this.props.download}
          time={time}
        />,
        document.querySelector('.esri-ui-bottom-right'),
      );
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
                className="tab tab-selected"
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
                Active on map
              </span>
              {this.props.download && (
                <span
                  className="tab"
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
                className="panel panel-selected"
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
                  className="panel"
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
        <div className="login-panel">
          <div
            className="esri-icon-close"
            id="login_close"
            role="button"
            onClick={() => this.closeLogin()}
            onKeyDown={() => this.closeLogin()}
            tabIndex="0"
          ></div>
          {!this.props.download && <CheckLogin />}
        </div>
      </>
    );
  }
}

export default MenuWidget;
