import React from 'react';

let layerRegion, layerSpatial, mapViewer;
class NavigationControl extends React.Component {
  constructor(props) {
    super(props);
    this.map = props.map;
    this.view = props.view;
    this.center = props.center;
    this.layerControl = props.layerControl;
    mapViewer = props.mapViewer;
    layerRegion = props.layerRegion;
    layerSpatial = props.layerSpatial;
  }

  /**
   *  Establish the initial behavior
   */
  showWorld() {
    this.layerControl.hideLayer(layerSpatial.id);
    this.layerControl.showLayer(layerRegion.id);
    if (this.view.center) {
      this.view.center.latitude = this.center[1];
      this.view.center.longitude = this.center[0];
    } else {
      this.view.center = {
        latitude: this.center[1],
        longitude: this.center[0],
      };
    }
    this.view.zoom = 1;
    mapViewer.setState(() => ({
      useCaseLevel: 1,
    }));
  }

  /**
   * When the user clicks on a region point, the map zooms to region.
   * The layer changes to use cases level.
   * InfoWidget shows the summary of use cases for the region
   * @param {String} bBox
   * @param {String} region
   * @param {FeatureLayer} layer
   */
  navigateToRegion(bBox, region, layer) {
    const boundingBox = this.clearBBOX(bBox);
    this.layerControl.zoomToExtent(boundingBox);
    this.layerControl.hideLayer(layerRegion.id);
    this.layerControl.showLayer(layerSpatial.id);
    layer.definitionExpression = `Region = '${region}'`;
  }

  /**
   * When the user clicks on a use case location, the layers are deactivated, only a point at the location is shown and the contour of the country/organization.
   * The information about use cases is displayed on infoWidget.
   * @param {String} bBox
   * @param {String} useCaseTitle
   * @param {String} region
   * @param {FeatureLayer} layer
   */
  navigateToLocation(bBox, useCaseTitle, region, country, layer) {
    // layerSpatial.setDefinitionExpression(point);
    this.navigateToRegion(bBox, region, layer);
    const expression = `Use_case_title = '${useCaseTitle}' AND Spatial_coverage = '${country}'`;
    layer.definitionExpression = expression;
  }

  /**
   * Clears the bounding box string and transfrom to Array
   * @param {String} stringBbox
   * @returns Array BBox
   */
  clearBBOX(stringBbox) {
    const floatBbox = [];
    // typeof stringBbox !== 'string' && (stringBbox = stringBbox.toString());
    stringBbox = stringBbox.replace('[', '');
    stringBbox = stringBbox.replace(']', '');
    stringBbox = stringBbox.split(',');

    for (let number in stringBbox)
      floatBbox.push(parseFloat(stringBbox[number]));

    return floatBbox;
  }

  /**
   * Returns to the previous status.

   */
  returnToPrevious() {
    switch (
      mapViewer.state.previousState === mapViewer.state.useCaseLevel
        ? mapViewer.state.useCaseLevel - 1
        : mapViewer.state.previousState
    ) {
      case 1:
        this.showWorld();
        break;

      case 2:
        this.navigateToRegion(
          mapViewer.state.selectedUseCase.BBOX,
          mapViewer.state.selectedUseCase.Region,
          layerSpatial,
        );
        mapViewer.setState(() => ({
          useCaseLevel: 2,
          region: mapViewer.state.selectedUseCase.Region,
        }));
        break;

      default:
        this.showWorld();
        break;
    }
  }
}

export default NavigationControl;
