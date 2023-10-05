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
    this.layers = this.props.layers;
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
        this.loadVisibleLayers();
        this.swipe.leadingLayers.removeAll();
        this.swipe.trailingLayers.removeAll();
        this.props.view.ui.remove(this.swipe);
        this.loadOptions();
      });
      this.setState({ showMapMenu: true });
    }
  }
  /**
   * This method is executed after the rener method is executed
   */
  async componentDidMount() {
    this.props.view.ui.add(this.container.current, 'top-right');
    await this.loader();
    this.swipe = new Swipe({
      view: this.props.view,
      direction: 'horizontal',
      position: 50,
    });
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
    var selectLeadingLayer = document.getElementById('select-leading-layer');
    var selectTrailingLayer = document.getElementById('select-trailing-layer');
    this.removeOptions(selectLeadingLayer);
    this.removeOptions(selectTrailingLayer);
    selectLeadingLayer.options.add(
      new Option('Select a leading layer', 'default', true, true),
    );
    selectLeadingLayer.options[0].disabled = true;
    selectTrailingLayer.options.add(
      new Option('Select a trailing layer', 'default', true, true),
    );
    selectTrailingLayer.options[0].disabled = true;
    this.map.layers.forEach((layer) => {
      selectLeadingLayer.options.add(
        new Option(this.getLayerTitle(layer), layer.id, layer.id),
      );
      selectTrailingLayer.options.add(
        new Option(this.getLayerTitle(layer), layer.id, layer.id),
      );
    });
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
    this.props.view.ui.remove(this.swipe);
    this.props.view.ui.add(this.swipe);
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
    this.map.layers.forEach((layer) => {
      layer.visible = false;
      if (layer.id === selectedLeadingLayer) {
        layer.visible = true;
        this.swipe.leadingLayers.add(layer);
      }
      if (layer.id === selectedTrailingLayer) {
        layer.visible = true;
        this.swipe.trailingLayers.add(layer);
      }
    });
  }
  loadVisibleLayers() {
    let vl = JSON.parse(sessionStorage.getItem('visibleLayers'));
    if (vl) {
      for (const key in vl) {
        if (vl[key][1] === 'eye') {
          this.layers[key].visible = true;
        } else {
          this.layers[key].visible = false;
        }
      }
    } else {
      this.map.layers.forEach((layer) => {
        layer.visible = true;
      });
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
              onKeyDown={this.openMenu.bind(this)}
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
                onKeyDown={this.openMenu.bind(this)}
                tabIndex="0"
                role="button"
              ></span>
            </div>
            <div className="right-panel-content">
              <div className="swipe-panel">
                <span>Leading Layer</span>
                <select id="select-leading-layer" class="esri-select"></select>
                <br></br>
                <span>Trailing Layer</span>
                <select id="select-trailing-layer" class="esri-select"></select>
                <br></br>
                <span>Swipe Direction</span>
                <select id="select-swipe-direction" class="esri-select">
                  <option value="horizontal">Horizontal</option>
                  <option value="vertical">Vertical</option>
                </select>
                <br></br>
                <button
                  id="applySwipeButton"
                  class="esri-button"
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
