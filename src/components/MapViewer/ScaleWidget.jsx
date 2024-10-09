import React, { createRef } from 'react';
//import "@arcgis/core/assets/esri/css/main.css";
//import "./css/ArcgisMap.css";
import { loadModules } from 'esri-loader';
var ScaleBar;

class ScaleWidget extends React.Component {
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
      'esri-icon-printer esri-widget--button esri-widget esri-interactive';
  }

  loader() {
    return loadModules(['esri/widgets/ScaleBar']).then(([_ScaleBar]) => {
      ScaleBar = _ScaleBar;
    });
  }

  waitForContainer(mapdiv) {
    while (mapdiv === null) {
      new Promise((resolve) => setTimeout(resolve, 100)); // wait for 100ms
    }
    return mapdiv;
  }

  /**
   * This method is executed after the rener method is executed
   */
  async componentDidMount() {
    await this.loader();
    //this.waitForContainer(this.props.view);
    if (!this.container.current) return;
    this.props.view.when(() => {
      this.scaleBar = new ScaleBar({
        view: this.props.view,
        unit: 'dual',
      });
      this.props.view.ui.add(this.scaleBar, 'bottom-left');
    });
  }
  /**
   * This method renders the component
   * @returns jsx
   */
  render() {
    return <></>;
  }
}

export default ScaleWidget;
