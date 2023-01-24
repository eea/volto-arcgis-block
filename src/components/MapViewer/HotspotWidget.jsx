import React, { createRef } from 'react';
import { loadModules } from 'esri-loader';
var Map, MapView, WMSLayer, LayerList, Legend, request, Expand, Editor;
class HotspotWidget extends React.Component {
  /**
   * Creator of the Hotspot widget class
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
      'esri-icon-filter esri-widget--button esri-widget esri-interactive';
    /*this.LandCoverCHange = Object.keys(this.props.layers).filter(
      (a) => a.includes("all_lcc_a_pol"),
    );*/
    this.subscribedLayers = this.props.layers;
  }

  loader() {
    return loadModules([
      'esri/Map',
      'esri/views/MapView',
      'esri/layers/WMSLayer',
      'esri/widgets/LayerList',
      'esri/widgets/Legend',
      'esri/request',
      'esri/widgets/Expand',
      'esri/widgets/Editor',
    ]).then(
      ([
        _MapView,
        _WMSLayer,
        _LayerList,
        _Legend,
        _request,
        _Expand,
        _Editor,
      ]) => {
        [MapView, WMSLayer, LayerList, Legend, request, Expand, Editor] = [
          _MapView,
          _WMSLayer,
          _LayerList,
          _Legend,
          _request,
          _Expand,
          _Editor,
        ];
      },
    );
  }

  dropdownAnimation(){
    var button = this.container.current
        .querySelector('.ccl-expandable__button');

    if(button.ariaExpanded==="true")
      button.ariaExpanded = "false";
    else
      button.ariaExpanded = "true";

  }

  /**
   * Method that will be invoked when the
   * button is clicked. It controls the open
   * and close actions of the component
   */
  openMenu() {
    debugger;
    if (this.state.showMapMenu) {
      this.props.mapViewer.setActiveWidget();
      this.container.current.querySelector('.right-panel').style.display =
        'none';
      this.container.current
        .querySelector('.esri-widget--button')
        .classList.remove('active-widget');
      document
        .querySelector('.esri-ui-top-right.esri-ui-corner')
        .classList.remove('show-panel');
      // By invoking the setState, we notify the state we want to reach
      // and ensure that the component is rendered again
      this.setState({ showMapMenu: false });
    } else {
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

  renderPresentLandCover() {
    if (this.props.layers)
      return (
        <div className="measurement-dropdown">
                  <div
                    className="ccl-expandable__button"
                    aria-expanded="true"
                    tabIndex="0"
                    role="button"
                    onClick={this.dropdownAnimation.bind(this)}
                  >
                    <span>Present Land Cover</span>
                    <span className="dropdown-icon ccl-icon-chevron-thin-down"></span>
                  </div>
                  <div className="measurement-dropdown-container">
                    <div className="esri-print__form-section-container">
                      <label>
                        Legend type
                        <select
                          className="esri-select"
                          data-target-property="layout"
                        ></select>
                      </label>
                    </div>
                    <div className="esri-print__form-section-container">
                      <label>
                        Year
                        <select
                          className="esri-select"
                          data-target-property="layout"
                        ></select>
                      </label>
                    </div>
                  </div>
                </div>
      );
  }

  render() {
    return (
      <>
        <div ref={this.container} className="hotspot-container">
          <div tooltip="Hotspot" direction="left" type="widget">
            <div
              className={this.menuClass}
              id="hotspot_button"
              aria-label="Hotspot"
              onClick={this.openMenu.bind(this)}
              onKeyDown={this.openMenu.bind(this)}
              tabIndex="0"
              role="button"
            ></div>
          </div>
          <div className="right-panel">
            <div className="right-panel-header">
              <span>Hot-spots outside Europe filtering options</span>
              <span
                className="map-menu-icon esri-icon-close"
                onClick={this.openMenu.bind(this)}
                onKeyDown={this.openMenu.bind(this)}
                tabIndex="0"
                role="button"
              ></span>
            </div>
            <div className="right-panel-content">
              <div className="hotspot-panel">
                {this.renderPresentLandCover()}
                <div className="measurement-dropdown">
                  <div
                    className="ccl-expandable__button"
                    aria-expanded="true"
                    tabIndex="0"
                    role="button"
                    onClick={this.dropdownAnimation.bind(this)}
                  >
                    <span>Land Cover Change</span>
                    <span className="dropdown-icon ccl-icon-chevron-thin-down"></span>
                  </div>
                  <div className="measurement-dropdown-container">
                    <div className="esri-print__form-section-container">
                      <label>
                        Legend type
                        <select
                          className="esri-select"
                          data-target-property="layout"
                        ></select>
                      </label>
                    </div>
                    <div className="esri-print__form-section-container">
                      <label>
                        Year
                        <select
                          className="esri-select"
                          data-target-property="layout"
                        ></select>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  /**
   * This method is executed after the rener method is executed
   */
  async componentDidMount() {
    await this.loader();
    this.props.view.ui.add(this.container.current, 'top-right');
  }
}
export default HotspotWidget;
