import React from 'react';

let layerRegion, layerSpatial, layerHighlight, mapViewer;
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
    layerHighlight = props.layerHighlight;
  }

  /**
   *  Establish the initial behavior
   */
  showWorld() {
    this.layerControl.hideLayer(layerSpatial.id);
    this.layerControl.showLayer(layerRegion.id);
    this.view.center = this.center;
    this.view.zoom = 0;
    layerSpatial.definitionExpression = null;
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
    let boundingBox = this.clearBBOX(bBox);
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
    this.navigateToRegion(bBox, region, layer);
    layerSpatial.definitionExpression !== null
      ? (layer.definitionExpression += ` AND Use_case_title = '${useCaseTitle}' AND Spatial_coverage = '${country}'`)
      : (layer.definitionExpression = `Use_case_title = '${useCaseTitle}' AND Spatial_coverage = '${country}'`);
  }

  /**
   * Clears the bounding box string and transfrom to Array
   * @param {String} stringBbox
   * @returns Array BBox
   */
  clearBBOX(stringBbox) {
    let floatBbox = [];
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
    // this.layerControl.hideLayer(layerHighlight.id);
    // CLMS-1489
    let productsScrollPosition;
    let pl = document.getElementById('use-cases-product-list');
    if (pl) {
      productsScrollPosition = pl.scrollTop;
    } else {
      productsScrollPosition = null;
    }
    let casesScrollPosition;
    let ucl = document.getElementById('use-cases-list');
    if (ucl) {
      casesScrollPosition = ucl.scrollTop;
    } else {
      casesScrollPosition = null;
    }
    switch (
      mapViewer.state.previousState === mapViewer.state.useCaseLevel
        ? mapViewer.state.useCaseLevel - 1
        : mapViewer.state.previousState
    ) {
      case 1:
        this.layerControl.getGeometry('none', layerHighlight);
        this.showWorld();
        break;

      case 2:
        this.layerControl.getGeometry('none', layerHighlight);
        this.navigateToRegion(
          mapViewer.state.selectedUseCase.BBOX,
          mapViewer.state.selectedUseCase.Region,
          layerSpatial,
        );
        mapViewer.setState((prevState) => ({
          useCaseLevel: 2,
          region: mapViewer.state.selectedUseCase.Region,
          productsScrollPosition: productsScrollPosition
            ? productsScrollPosition
            : prevState.productsScrollPosition,
          casesScrollPosition: casesScrollPosition
            ? casesScrollPosition
            : prevState.casesScrollPosition,
        }));
        break;
      case 3:
        mapViewer.setState((prevState) => ({
          useCaseLevel: 3,
          productsScrollPosition: productsScrollPosition
            ? productsScrollPosition
            : prevState.productsScrollPosition,
          casesScrollPosition: casesScrollPosition
            ? casesScrollPosition
            : prevState.casesScrollPosition,
        }));
        break;
      default:
        this.showWorld();
        break;
    }
  }
}

export default NavigationControl;
