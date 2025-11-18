import React, { createRef } from 'react';
import { loadModules } from 'esri-loader';

class ErrorReport extends React.Component {
  /**
   * Creator of the ErrorReport widget class
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
      'esri-icon-errorReport esri-widget--button esri-widget esri-interactive';
  }
}

export default ErrorReport;
