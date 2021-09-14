import React, { createRef } from 'react';

class NavigationControl extends React.Component {
  constructor(props) {
    super(props);
    this.map = props.map;
    this.view = props.view;
    this.center = props.center;
    this.layerControl = props.layerControl;
  }

  /**
   *  Establish the initial behavior
   * @param {*} infoWidget
   */
  showWorld(infoWidget) {
    this.layerControl.hideLayer('layerSpatial');
    this.layerControl.showLayer('layerRegion');
    this.view.center = this.center;
    this.view.zoom = 1;
    infoWidget.setState({ lateralOption: 1 });
  }

  /**
   * When the user clicks on a region point, the map zooms to region.
   * The layer changes to use cases level.
   * InfoWidget shows the summary of use cases for the region
   * @param {*} infoWidget
   */
  navigateToRegion(bbox) {
    this.layerControl.zoomToExtent(bbox);
  }

  /**
   * When the user clicks on a use case location, the layers are deactivated, only a point at the location is shown and the contour of the country/organization.
   * The information about use cases is displayed on infoWidget.
   */
  navigateToLocation() {}

  /**
   * Returns to the previous status.
   */
  returnToPrevious() {}
}

export default NavigationControl;
