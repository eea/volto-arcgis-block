import React, { createRef } from 'react';
//import "@arcgis/core/assets/esri/css/main.css";
//import "./css/ArcgisMap.css";
import { loadModules } from 'esri-loader';
var Legend;

class LegendWidget extends React.Component {
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
    this.menuClass =
      'esri-icon-legend esri-widget--button esri-widget esri-interactive';
  }

  loader() {
    return loadModules(['esri/widgets/Legend']).then(([_Legend]) => {
      Legend = _Legend;
    });
  }

  /**
   * Method that will be invoked when the
   * button is clicked. It controls the open
   * and close actions of the component
   */
  openMenu() {
    if (this.state.showMapMenu) {
      //this.props.mapViewer.setActiveWidget();
      this.container.current.querySelector('.legend-panel').style.display =
        'none';
      this.container.current
        .querySelector('.esri-widget--button')
        .classList.replace('esri-icon-right-arrow', 'esri-icon-legend');
      // By invoking the setState, we notify the state we want to reach
      // and ensure that the component is rendered again
      this.setState({ showMapMenu: false });
    } else {
      //this.props.mapViewer.setActiveWidget(this);
      this.container.current
        .querySelector('.esri-widget--button')
        .classList.replace('esri-icon-legend', 'esri-icon-right-arrow');
      this.container.current.querySelector('.legend-panel').style.display =
        'block';
      // By invoking the setState, we notify the state we want to reach
      // and ensure that the component is rendered again
      this.setState({ showMapMenu: true });
    }
  }
  /**
   * This method is executed after the rener method is executed
   */
  async componentDidMount() {
    await this.loader();
    this.props.view.ui.add(this.container.current, 'top-right');
    this.LegendWidget = new Legend({
      view: this.props.view,
      container: document.querySelector('.legend-panel'),
    });
  }
  /**
   * This method renders the component
   * @returns jsx
   */
  render() {
    return (
      <>
        <div ref={this.container} className="legend-container">
          <div
            className={this.menuClass}
            id="legend_button"
            title="Legend"
            onClick={this.openMenu.bind(this)}
            onKeyDown={this.openMenu.bind(this)}
            tabIndex="0"
            role="button"
          ></div>
          <div className="legend-panel"></div>
        </div>
      </>
    );
  }
}

export default LegendWidget;
