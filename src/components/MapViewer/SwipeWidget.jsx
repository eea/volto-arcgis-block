import React, { createRef } from 'react';
//import "@arcgis/core/assets/esri/css/main.css";
//import "./css/ArcgisMap.css";
import { loadModules } from 'esri-loader';
var Swipe;

class SwipeWidget extends React.Component {
  /**
   * Creator of the Measurement widget class
   * @param {*} props
   */
  constructor(props) {
    super(props);
    //We create a reference to a DOM element to be mounted
    this.container = createRef();
    //Initially, we set the state of the component to
    //not be showing the basemap panel
    this.state = { showMapMenu: false };
    this.menuClass =
      'esri-icon-swap esri-widget--button esri-widget esri-interactive';
    this.titleMaxLength = 50;
    this.authorMaxLength = 60;
    this.textMaxLength = 180;
    this.sizeMax = 15000;
    this.dpiMax = 1200;
    this.scaleMax = 600000000;
    this.map = this.props.map;
    // layers = this.props.layers;
    this.hasSwipe = false;
    this.prevActiveLayers = this.props.mapViewer.activeLayers
      ? this.props.mapViewer.activeLayers
      : [];
  }

  loader() {
    return loadModules(['esri/widgets/Swipe']).then(([_Swipe]) => {
      Swipe = _Swipe;
    });
  }

  /**
   * Method that will be invoked when the
   * button is clicked. It controls the open
   * and close actions of the component
   */
  openMenu() {
    if (this.state.showMapMenu) {
      // CLOSE
      this.props.mapViewer.setActiveWidget();
      this.container.current
        .querySelector('.esri-widget--button')
        .classList.remove('active-widget');
      document
        .querySelector('.esri-ui-top-right.esri-ui-corner')
        .classList.remove('show-panel');
      this.loadVisibleLayers();
      this.swipe.leadingLayers.removeAll();
      this.swipe.trailingLayers.removeAll();
      this.props.view.ui.remove(this.swipe);
      this.hasSwipe = false;
      this.container.current.querySelector('.right-panel').style.display =
        'none';
      this.setState({ showMapMenu: false });
    } else {
      // OPEN
      this.props.mapViewer.setActiveWidget(this);
      this.container.current.querySelector('.right-panel').style.display =
        'flex';
      this.container.current
        .querySelector('.esri-widget--button')
        .classList.add('active-widget');
      document
        .querySelector('.esri-ui-top-right.esri-ui-corner')
        .classList.add('show-panel');
      // By invoking the setState, we notify the state we want to reach
      // and ensure that the component is rendered again
      this.loadOptions();
      this.map.layers.on('change', () => {
        this.loadOptions();
        if (this.hasSwipe) {
          this.map.layers.removeAll();
          if (this.swipe.leadingLayers && this.swipe.leadingLayers.items[0]) {
            this.map.layers.add(this.swipe.leadingLayers.items[0]);
          }
          if (this.swipe.trailingLayers && this.swipe.trailingLayers.items[0]) {
            this.map.layers.add(this.swipe.trailingLayers.items[0]);
          }
        }
      });
      this.setState({ showMapMenu: true });
    }
  }
  /**
   * This method is executed after the rener method is executed
   */
  async componentDidMount() {
    await this.loader();
    if (!this.container.current) return;
    this.props.view.when(() => {
      this.props.view.ui.add(this.container.current, 'top-right');
      this.swipe = new Swipe({
        view: this.props.view,
        direction: 'horizontal',
        position: 50,
      });
    });
  }

  componentDidUpdate(prevProps, prevState) {
    const curr = this.props.mapViewer.activeLayers || [];
    const prev = this.prevActiveLayers || [];
    const changed =
      curr.length !== prev.length || curr.some((layer, i) => layer !== prev[i]);
    if (this.state.showMapMenu && changed) {
      if (curr.length === 0) {
        sessionStorage.setItem('checkedLayers', JSON.stringify([]));
        this.map.layers.removeAll();
        this.props.view.ui.remove(this.swipe);
        this.hasSwipe = false;
        this.resetSwipeWidgetToDefault();
        // this.openMenu(this);
      } else if (this.hasSwipe) {
        this.loadOptions();
        this.renderApplySwipeButton();
      }
    }
    this.prevActiveLayers = curr;
  }

  getLayerTitle(layer) {
    let title;
    if (layer.url && layer.url.toLowerCase().includes('wmts')) {
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
  loadOptions() {
    const layers = this.props.layers;
    var selectLeadingLayer = document.getElementById('select-leading-layer');
    if (selectLeadingLayer) {
      this.removeOptions(selectLeadingLayer);
      selectLeadingLayer.options.add(
        new Option('Select a leading layer', 'default', false, false),
      );
      selectLeadingLayer.options[0].disabled = true;
    }
    var selectTrailingLayer = document.getElementById('select-trailing-layer');
    if (selectTrailingLayer) {
      this.removeOptions(selectTrailingLayer);
      selectTrailingLayer.options.add(
        new Option('Select a trailing layer', 'default', false, false),
      );
      selectTrailingLayer.options[0].disabled = true;
    }
    let cl = JSON.parse(sessionStorage.getItem('checkedLayers'));
    if (
      (!cl || cl.length === 0) &&
      this.map &&
      this.map.layers &&
      this.map.layers.items.length > 0
    ) {
      cl = [];
      // Find the layer ID in layers that corresponds to each map.layers item
      for (const mapLayer of this.map.layers.items) {
        for (const [layerKey, layerObj] of Object.entries(layers)) {
          if (layerObj.id === mapLayer.id) {
            cl.push(layerKey);
            break;
          }
        }
      }

      // Save the newly created checkedLayers to sessionStorage
      if (cl.length > 0) {
        sessionStorage.setItem('checkedLayers', JSON.stringify(cl));
      }
    }

    // Process the layers
    if (cl && cl.length > 0) {
      cl.forEach((layer) => {
        if (layers[layer]) {
          let layerId = layers[layer].id;
          if (layers['lcc_filter']) {
            if (
              layer === 'all_lcc_a_pol_1_4_1_0' ||
              layer === 'all_lcc_b_pol_1_4_1_1'
            ) {
              layerId = layers['lcc_filter'].id;
            }
          }
          if (layers['lc_filter']) {
            if (
              layer === 'all_present_lc_a_pol_1_4_0_0' ||
              layer === 'all_present_lc_b_pol_1_4_0_1'
            ) {
              layerId = layers['lc_filter'].id;
            }
          }
          if (layers['klc_filter']) {
            if (layer === 'cop_klc_1_4_2_0') {
              layerId = layers['klc_filter'].id;
            }
          }
          if (layers['pa_filter']) {
            if (layer === 'protected_areas_1_4_3_0') {
              layerId = layers['pa_filter'].id;
            }
          }
          if (selectLeadingLayer) {
            if (
              this.swipe.leadingLayers &&
              this.swipe.leadingLayers.items[0] &&
              this.swipe.leadingLayers.items[0].id === layerId
            ) {
              selectLeadingLayer.options.add(
                new Option(
                  this.getLayerTitle(layers[layer]),
                  layerId,
                  true,
                  true,
                ),
              );
            } else {
              selectLeadingLayer.options.add(
                new Option(this.getLayerTitle(layers[layer]), layerId, false),
              );
            }
          }
          if (selectTrailingLayer) {
            if (
              this.swipe.trailingLayers &&
              this.swipe.trailingLayers.items[0] &&
              this.swipe.trailingLayers.items[0].id === layerId
            ) {
              selectTrailingLayer.options.add(
                new Option(
                  this.getLayerTitle(layers[layer]),
                  layerId,
                  true,
                  true,
                ),
              );
            } else {
              selectTrailingLayer.options.add(
                new Option(this.getLayerTitle(layers[layer]), layerId, false),
              );
            }
          }
        }
      });
    }
  }
  resetSwipeWidgetToDefault() {
    // Remove all swipe layers
    if (this.swipe) {
      this.swipe.leadingLayers.removeAll();
      this.swipe.trailingLayers.removeAll();
      this.hasSwipe = false;
    }
    // Reset dropdowns to default
    const selectLeadingLayer = document.getElementById('select-leading-layer');
    if (selectLeadingLayer) {
      this.removeOptions(selectLeadingLayer);
      selectLeadingLayer.options.add(
        new Option('Select a leading layer', 'default', false, false),
      );
      selectLeadingLayer.options[0].disabled = true;
    }
    const selectTrailingLayer = document.getElementById(
      'select-trailing-layer',
    );
    if (selectTrailingLayer) {
      this.removeOptions(selectTrailingLayer);
      selectTrailingLayer.options.add(
        new Option('Select a trailing layer', 'default', false, false),
      );
      selectTrailingLayer.options[0].disabled = true;
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
  renderApplySwipeButton() {
    const layers = this.props.layers;
    this.props.view.ui.remove(this.swipe);
    this.props.view.ui.add(this.swipe);
    this.hasSwipe = true;
    let selectedLeadingLayer = document.getElementById('select-leading-layer')
      .value;
    let selectedTrailingLayer = document.getElementById('select-trailing-layer')
      .value;
    let selectedSwipeDirection = document.getElementById(
      'select-swipe-direction',
    ).value;
    this.swipe.leadingLayers.removeAll();
    this.swipe.trailingLayers.removeAll();
    this.swipe.direction = selectedSwipeDirection;
    let cl = JSON.parse(sessionStorage.getItem('checkedLayers'));
    if (cl) {
      cl.forEach((layer) => {
        if (layers[layer].id === selectedLeadingLayer) {
          this.swipe.leadingLayers.add(layers[layer]);
        }
        if (layers[layer].id === selectedTrailingLayer) {
          this.swipe.trailingLayers.add(layers[layer]);
        }
      });
    }
    if (layers['lcc_filter']) {
      if (layers['lcc_filter'].id === selectedLeadingLayer) {
        this.swipe.leadingLayers.add(layers['lcc_filter']);
      }
      if (layers['lcc_filter'].id === selectedTrailingLayer) {
        this.swipe.trailingLayers.add(layers['lcc_filter']);
      }
    }
    if (layers['lc_filter']) {
      if (layers['lc_filter'].id === selectedLeadingLayer) {
        this.swipe.leadingLayers.add(layers['lc_filter']);
      }
      if (layers['lc_filter'].id === selectedTrailingLayer) {
        this.swipe.trailingLayers.add(layers['lc_filter']);
      }
    }
    if (layers['klc_filter']) {
      if (layers['klc_filter'].id === selectedLeadingLayer) {
        this.swipe.leadingLayers.add(layers['klc_filter']);
      }
      if (layers['klc_filter'].id === selectedTrailingLayer) {
        this.swipe.trailingLayers.add(layers['klc_filter']);
      }
    }
    if (layers['pa_filter']) {
      if (layers['pa_filter'].id === selectedLeadingLayer) {
        this.swipe.leadingLayers.add(layers['pa_filter']);
      }
      if (layers['pa_filter'].id === selectedTrailingLayer) {
        this.swipe.trailingLayers.add(layers['pa_filter']);
      }
    }
    this.map.layers.removeAll();
    if (this.swipe.leadingLayers.items[0]) {
      this.map.layers.add(this.swipe.leadingLayers.items[0]);
    }
    if (this.swipe.trailingLayers.items[0]) {
      this.map.layers.add(this.swipe.trailingLayers.items[0]);
    }
  }

  loadVisibleLayers() {
    const layers = this.props.layers;
    let cl = JSON.parse(sessionStorage.getItem('checkedLayers'));
    if (cl) {
      cl.forEach((layer) => {
        this.map.layers.add(layers[layer]);
      });
    }
    if (layers['lcc_filter']) {
      this.map.layers.add(layers['lcc_filter']);
    }
    if (layers['lc_filter']) {
      this.map.layers.add(layers['lc_filter']);
    }
    if (layers['klc_filter']) {
      this.map.layers.add(layers['klc_filter']);
    }
    if (layers['pa_filter']) {
      this.map.layers.add(layers['pa_filter']);
    }
  }
  /**
   * This method renders the component
   * @returns jsx
   */
  render() {
    return (
      <>
        <div ref={this.container} className="swipe-container">
          <div tooltip="Swipe" direction="left" type="widget">
            <div
              className={this.menuClass}
              id="map_swipe_button"
              aria-label="Swipe"
              onClick={this.openMenu.bind(this)} //aqui deberían ir ocultar panel y mas abajo cerrar (pasar a 3d)
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
              role="button"
            ></div>
          </div>
          {/* Al final el IF lo añadiremos aqui en estos OpenMenu */}
          <div className="right-panel">
            <div className="right-panel-header">
              <span>Swipe</span>
              <span
                className="map-menu-icon esri-icon-close"
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
                role="button"
              ></span>
            </div>
            <div className="right-panel-content">
              <div className="swipe-panel">
                <span>Leading Layer</span>
                <select
                  id="select-leading-layer"
                  className="esri-select"
                ></select>
                <br></br>
                <span>Trailing Layer</span>
                <select
                  id="select-trailing-layer"
                  className="esri-select"
                ></select>
                <br></br>
                <span>Swipe Direction</span>
                <select id="select-swipe-direction" className="esri-select">
                  <option value="horizontal">Horizontal</option>
                  <option value="vertical">Vertical</option>
                </select>
                <br></br>
                <button
                  id="applySwipeButton"
                  className="esri-button"
                  onClick={() => this.renderApplySwipeButton()}
                >
                  Swipe
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
}

export default SwipeWidget;
