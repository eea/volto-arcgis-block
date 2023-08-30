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
  }

  loader() {
    return loadModules(["esri/widgets/Swipe",]).then(([_Swipe]) => {
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
      this.container.current.querySelector('.esri-widget--button').classList.remove('active-widget');
      document.querySelector('.esri-ui-top-right.esri-ui-corner').classList.remove('show-panel');

      if (
        this.props.view.type === '2d' &&
        this.props.mapViewer.mapCfg.viewType === '3d'
      ) {
        // The app is configured in 3D and the current view is 2D
        console.log('3D')
        this.props.mapViewer.switchView();
      }
      if (this.props.mapViewer.mapCfg.viewType === '2d') {
        // If the app is configured in 2D, the print panel will be closed. On the contrary it remains open in printing view.
        this.container.current.querySelector('.right-panel').style.display = 'none';
        console.log('2D');
        // By invoking the setState, we notify the state we want to reach
        // and ensure that the component is rendered again
        this.setState({ showMapMenu: false });
      }
    } else {
      // OPEN
      if (this.props.view.type === '3d') {
        this.props.mapViewer.switchView();
        console.log('Swipe view');
      }
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
      this.setState({ showMapMenu: true });
    }
  }
  /**
   * This method is executed after the rener method is executed
   */
  async componentDidMount() {
    this.props.view.ui.add(this.container.current, 'top-right');
    if (this.props.view.type === '2d') {
      await this.loader();
      this.swipe = new Swipe({
        view: this.props.mapViewer.mapView,
        position: 50,        
      });
      console.log('Swipe created')
      if (this.props.mapViewer.mapCfg.viewType === '3d') {        
        // When app is configured in 3D the print panel remains open in printing view.
        // this.container.current.querySelector('.right-panel').style.display = 'flex';
        // this.setState({ showMapMenu: true });
        
        // This popup will be displayed only when the app is configured in 3D in config.js
        var popup = document.createElement('div');
        popup.className = 'drawRectanglePopup-block';
        popup.innerHTML =
          '<div class="drawRectanglePopup-content">' +
          '<span class="drawRectanglePopup-icon"><span class="esri-icon-swap"></span></span>' +
          '<div class="drawRectanglePopup-text">This is a swipe view. Select the layers from dropdown.</div>' +
          '</div>';
        this.props.mapViewer.mapView.ui.add(popup, 'top-right');
      }
    }
  }

  componentDidUpdate() {
  }

  async changeView() {
    this.props.mapViewer.switchView();
    this.props.mapViewer.mapView.goTo({
      target: this.props.mapViewer.mapCfg.center,
      zoom: this.props.mapViewer.mapCfg.zoom,
      rotation: 0,
    });
    // this.openMenu(true);
    // this.setState({ showMapMenu: true });
  }
  /**
   * This method renders the component
   * @returns jsx
   */
  render() {
    return (
      <>
        <div ref={this.container} className="swipe-container">
          {this.props.view.type === '2d' ? (
            <>
              <div tooltip="Swipe" direction="left" type="widget">
                <div
                  className={this.menuClass}
                  id="map_swipe_button"
                  aria-label="Swipe"
                  onClick={this.openMenu.bind(this)} //aqui deberían ir ocultar panel y mas abajo cerrar (pasar a 3d)
                  onKeyDown={this.openMenu.bind(this)}
                  tabIndex="1"
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
                    tabIndex="1"
                    role="button"
                  ></span>
                </div>
                <div className="right-panel-content">
                  <div className="swipe-panel"></div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div tooltip="Swipe" direction="left">
                <div
                  className="esri-icon-swap esri-widget--button"
                  id="map_swipe_button3d"
                  aria-label="Swipe"
                  onClick={this.changeView.bind(this)}
                  onKeyDown={this.changeView.bind(this)}
                  tabIndex="1"
                  role="button"
                ></div>
              </div>
              {/* Al final el IF lo añadiremos aqui en estos OpenMenu */}
              {/* <div className="right-panel">
                <div className="right-panel-header">
                  <span>Print</span>                  
                  <span
                    className="map-menu-icon esri-icon-close"
                    onClick={this.openMenu.bind(this)}
                    onKeyDown={this.openMenu.bind(this)}
                    tabIndex="0"
                    role="button"
                  ></span>
                </div>
                <div className="right-panel-content">
                  <div className="print-panel"></div>
                </div>
              </div> */}
            </>
          )}
        </div>
      </>
    );
  }
}

export default SwipeWidget;
