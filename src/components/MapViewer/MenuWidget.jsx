import ReactDOM from 'react-dom';
import React, { createRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { loadModules, loadCss } from 'esri-loader';
import useCartState from '@eeacms/volto-clms-utils/cart/useCartState';
import { useHistory } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { Message, Modal } from 'semantic-ui-react';
import AreaWidget from './AreaWidget';
import TimesliderWidget from './TimesliderWidget';
var WMSLayer, WMTSLayer, FeatureLayer;

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
          <Modal size="tiny" open={modal} className="map-download-modal">
            <Modal.Content>
              <p>Do you want to add this dataset to the cart?</p>
            </Modal.Content>
            <Modal.Actions>
              <div className="map-download-buttons">
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
              </div>
            </Modal.Actions>
          </Modal>
          <div className={'map-menu-icons' + (isLoggedIn ? '' : ' locked')}>
            <FontAwesomeIcon
              className="map-menu-icon"
              icon={['fas', 'download']}
              onClick={() => {
                isLoggedIn && showModal();
              }}
            />
          </div>
        </>
      )}
    </>
  );
};

export const CheckLogin = () => {
  const { isLoggedIn } = useCartState();
  const { locale } = useIntl();
  return (
    <>
      {!isLoggedIn && (
        <div className="login-block">
          <div className="login-content">
            <a
              className="ccl-button ccl-button--default"
              href={'/' + locale + '/login'}
            >
              Login to download the data
            </a>
            <p className="login-block-new">
              New user?{' '}
              <a href={'/' + locale + '/register'}>
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
    this.layers = {};
    this.activeLayers = [];
    this.activeLayersJSON = {};
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
        .classList.replace('esri-icon-left-arrow', 'esri-icon-drag-horizontal');
      if (document.contains(document.querySelector('.timeslider-container')))
        document.querySelector('.timeslider-container').style.display = 'none';

      // By invoking the setState, we notify the state we want to reach
      // and ensure that the component is rendered again
      this.setState({ showMapMenu: false });
    } else {
      this.container.current.querySelector('#tabcontainer').style.display =
        'block';
      this.container.current.querySelector('#paneles').style.display = 'block';
      this.container.current
        .querySelector('.esri-widget--button')
        .classList.replace('esri-icon-drag-horizontal', 'esri-icon-left-arrow');
      if (document.contains(document.querySelector('.timeslider-container')))
        document.querySelector('.timeslider-container').style.display = 'block';

      // By invoking the setState, we notify the state we want to reach
      // and ensure that the component is rendered again
      this.setState({ showMapMenu: true });
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
      document.querySelector('.area-panel').style.display = 'block';
      document.querySelector('.area-panel input:checked').click();
    }
    //to watch the component
    this.setState({});
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
          {component.ComponentTitle}
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
                    {product.ProductTitle}
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

    for (var i in dataset.Layer) {
      if (dataset.Layer[i].Default_active === true) {
        layer_default.push(
          dataset.Layer[i].LayerId + '_' + inheritedIndexDataset + '_' + i,
        );
      }

      layers.push(
        this.metodProcessLayer(
          dataset.Layer[i],
          index,
          inheritedIndexDataset,
          dataset.ViewService,
          checkIndex,
          dataset.IsTimeSeries,
          layer_default,
        ),
      );
      index++;
    }

    if (!layer_default.length) {
      layer_default.push(
        dataset.Layer[0].LayerId + '_' + inheritedIndexDataset + '_0',
      );
    }
    // ./dataset-catalogue/dataset-info.html
    // ./dataset-catalogue/dataset-download.html

    return (
      <div
        className="ccl-form-group map-menu-dataset"
        id={'dataset_' + inheritedIndexDataset}
        datasetid={dataset.DatasetId}
        key={'a' + datIndex}
      >
        <div className="map-dataset-checkbox" key={'b' + datIndex}>
          <input
            type="checkbox"
            id={checkIndex}
            parentid={checkProduct}
            name=""
            value="name"
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
            <span>{dataset.DatasetTitle}</span>
          </label>
          {!this.props.download && (
            <AddCartItem
              cartData={this.compCfg}
              props={this.props}
              mapViewer={this.props.mapViewer}
              download={this.props.download}
              areaData={this.props.area}
              dataset={dataset}
            />
          )}
        </div>
        <div
          className="ccl-form map-menu-layers-container"
          id={'layer_container_' + dataset.DatasetId}
        >
          {layers}
        </div>
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
    //solo tiene que tener alguno length >0
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
    parentIndex,
    isTimeSeries,
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
            },
          ],
        });
      } else if (urlWMS.toLowerCase().includes('wmts')) {
        this.layers[layer.LayerId + '_' + inheritedIndexLayer] = new WMTSLayer({
          url: urlWMS,
          //id: layer.LayerId,
          title: '',
          activeLayer: {
            id: layer.LayerId,
            title: layer.Title,
          },
        });
      } else {
        this.layers[
          layer.LayerId + '_' + inheritedIndexLayer
        ] = new FeatureLayer({
          url: urlWMS + (urlWMS.endsWith('/') ? '' : '/') + layer.LayerId,
          id: layer.LayerId,
          title: layer.Title,
          popupEnabled: true,
        });
      }
    }

    return (
      <div
        className="ccl-form-group map-menu-layer"
        id={'layer_' + inheritedIndexLayer}
        key={'a' + layerIndex}
        data-timeseries={isTimeSeries}
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
    let layerId = elem.getAttribute('layerid');
    if (elem.checked) {
      this.map.add(this.layers[elem.id]);
      this.visibleLayers[elem.id] = ['fas', 'eye'];
      this.timeLayers[elem.id] = ['fas', 'step-forward'];
      this.activeLayersJSON[elem.id] = this.addActiveLayer(
        elem,
        Object.keys(this.activeLayersJSON).length,
      );
      let nuts = this.map.layers.items.find((layer) => layer.title === 'nuts');
      if (nuts) {
        this.map.reorder(nuts, this.map.layers.items.length + 1);
      }
    } else {
      let checkboxes = document.getElementsByName('layerCheckbox');
      let repeatedLayers = [];
      for (let checkbox = 0; checkbox < checkboxes.length - 1; checkbox++) {
        if (checkboxes[checkbox].getAttribute('layerid') === layerId) {
          if (checkboxes[checkbox].checked) repeatedLayers.push(repeatedLayers);
        }
      }
      if (repeatedLayers.length === 0) {
        this.map.remove(this.layers[elem.id]);
        delete this.activeLayersJSON[elem.id];
        delete this.visibleLayers[elem.id];
        delete this.timeLayers[elem.id];
      }
    }
    this.updateCheckDataset(parentId);
    this.setState({});
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
    return activeLayersArray.reverse();
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
    var aria = e.target.getAttribute('aria-expanded');
    e.target.setAttribute('aria-expanded', aria === 'true' ? 'false' : 'true');
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
        onDrop={(e) => this.onDrop(e)}
        onDragOver={(e) => this.onDragOver(e)}
        onDragStart={(e) => this.onDragStart(e)}
      >
        <div className="active-layer-name" name={elem.id} key={'b_' + elem.id}>
          {elem.title}
        </div>
        <div className="active-layer-options" key={'c_' + elem.id}>
          {elem.parentElement.dataset.timeseries === 'true' && (
            <span className="active-layer-time">
              <FontAwesomeIcon
                className="map-menu-icon"
                icon={this.timeLayers[elem.id]}
                onClick={(e) => this.showTimeSlider(elem)}
              />
            </span>
          )}
          <span className="active-layer-hide">
            <FontAwesomeIcon
              className="map-menu-icon"
              icon={this.visibleLayers[elem.id]}
              onClick={(e) => this.eyeLayer(elem)}
            />
          </span>
          <span className="active-layer-delete">
            <FontAwesomeIcon
              className="map-menu-icon"
              icon={['fas', 'times']}
              onClick={() => this.deleteCrossEvent(elem)}
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
    this.draggingElement.parentElement.removeChild(this.draggingElement);
    if (init_ord > dst_ord) {
      dst.parentElement.insertBefore(this.draggingElement, dst);
    } else {
      dst.parentElement.insertBefore(this.draggingElement, dst.nextSibling);
    }

    this.layersReorder();
  }

  /**
   * Reorders the layers depending on the state of active layers panel
   * @returns
   */
  layersReorder() {
    let counter = 0;
    let reorder_elem = document.querySelector('#active_layers').firstChild;
    if (!reorder_elem) return;
    reorder_elem.setAttribute('layer-order', counter++);
    this.layerReorder(reorder_elem.id, counter);
    while ((reorder_elem = reorder_elem.nextSibling)) {
      reorder_elem.setAttribute('layer-order', counter++);
      this.layerReorder(this.layers[reorder_elem.id], counter);
    }
  }

  /**
   * Assigns an index to a layer
   * (depending on its position on active layers panel)
   * @param {*} layer
   * @param {*} index
   */
  layerReorder(layer, index) {
    let lastNum = Object.keys(this.activeLayersJSON).length - 1;
    this.map.reorder(layer, lastNum - index);
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
   * Method to show/hide time slider
   * @param {*} e From the click event
   * @param {*} id id from elem
   */
  showTimeSlider(elem) {
    let activeLayers = document.querySelectorAll('.active-layer');
    if (this.timeLayers[elem.id][1] === 'step-forward') {
      activeLayers.forEach((layer) => {
        let layerId = layer.getAttribute('layer-id');
        let order = this.activeLayersJSON[elem.id].props['layer-order'];
        if (elem.id === layerId) {
          this.timeLayers[elem.id] = ['fas', 'stop'];
          if (this.visibleLayers[elem.id][1] === 'eye-slash') {
            this.layers[elem.id].visible = true;
            this.visibleLayers[elem.id] = ['fas', 'eye'];
          }
          document
            .querySelector(
              '.active-layer[layer-id="' + elem.id + '"] .active-layer-hide',
            )
            .classList.add('locked');
          document
            .querySelector(
              '.active-layer[layer-id="' + elem.id + '"] .active-layer-delete',
            )
            .classList.add('locked');
          document.querySelector('#products_label').classList.add('locked');
          if (this.props.download)
            document.querySelector('#download_label').classList.add('locked');
          this.activeLayersJSON[elem.id] = this.addActiveLayer(elem, order);
        } else {
          if (this.visibleLayers[elem.id][1] === 'eye') {
            this.layers[elem.id].visible = false;
            this.visibleLayers[elem.id] = ['fas', 'eye-slash'];
          }
          document
            .querySelector('.active-layer[layer-id="' + elem.id + '"]')
            .classList.add('locked');
          this.activeLayersJSON[elem.id] = this.addActiveLayer(
            document.getElementById(elem.id),
            order,
          );
        }
      });
    } else {
      activeLayers.forEach((layer) => {
        let layerId = layer.getAttribute('layer-id');
        let order = this.activeLayersJSON[elem.id].props['layer-order'];
        if (elem.id === layerId) {
          this.timeLayers[elem.id] = ['fas', 'step-forward'];
          this.activeLayersJSON[elem.id] = this.addActiveLayer(elem, order);
          document
            .querySelector(
              '.active-layer[layer-id="' + elem.id + '"] .active-layer-hide',
            )
            .classList.remove('locked');
          document
            .querySelector(
              '.active-layer[layer-id="' + elem.id + '"] .active-layer-delete',
            )
            .classList.remove('locked');
          document.querySelector('#products_label').classList.remove('locked');
          if (this.props.download)
            document
              .querySelector('#download_label')
              .classList.remove('locked');
          if (
            document.contains(document.querySelector('.timeslider-container'))
          )
            ReactDOM.unmountComponentAtNode(
              document.querySelector('.esri-ui-bottom-right'),
            );
        } else {
          if (this.visibleLayers[elem.id][1] === 'eye-slash') {
            this.layers[elem.id].visible = true;
            this.visibleLayers[elem.id] = ['fas', 'eye'];
            this.activeLayersJSON[elem.id] = this.addActiveLayer(
              document.getElementById(elem.id),
              order,
            );
          }
          document
            .querySelector('.active-layer[layer-id="' + elem.id + '"]')
            .classList.remove('locked');
        }
      });
    }
    this.setState({});
  }

  /**
   * Method to show/hide layer from "Active Layers"
   * @param {*} e From the click event
   * @param {*} id id from elem
   */
  eyeLayer(elem) {
    // let elementId = elem.getAttribute('layerid');
    if (this.visibleLayers[elem.id][1] === 'eye') {
      this.layers[elem.id].visible = false;
      this.visibleLayers[elem.id] = ['fas', 'eye-slash'];
    } else {
      this.map.add(this.layers[elem.id]);
      this.layers[elem.id].visible = true;
      this.visibleLayers[elem.id] = ['fas', 'eye'];
    }
    this.activeLayersJSON[elem.id] = this.addActiveLayer(elem, 0);
    this.layersReorder();
    this.setState({});
  }

  /**
   * Method to delete layer from "Active Layers" and uncheck dataset and products
   * @param {*} e From the click event
   * @param {*} id id from elem
   */
  deleteCrossEvent(elem) {
    // elem has to be unchecked
    elem.checked = false;
    this.toggleLayer(elem);
    delete this.activeLayersJSON[elem.id];
    this.setState({});
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
                {!this.props.download && <CheckLogin />}
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
          <div
            className={this.menuClass}
            id="map_manu_button"
            role="button"
            title="Menu of products"
            onClick={this.openMenu.bind(this)}
            onKeyDown={this.openMenu.bind(this)}
            tabIndex="0"
          ></div>
        </div>
      </>
    );
  }
}

export default MenuWidget;
