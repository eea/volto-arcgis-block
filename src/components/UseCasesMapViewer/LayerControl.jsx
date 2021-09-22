let FeatureLayer, Extent;
class LayerControl {
  //props es un json con los diferentes parametros (map, etc...)
  constructor(props) {
    this.map = props.map;
    this.view = props.view;
    FeatureLayer = props.FeatureLayer;
    Extent = props.Extent;
  }

  /**
   * This method will receive the information required to create a new layer .
   * @param {Object} layerInfo
   * @returns FeatureLayer
   */
  createLayer(layerInfo) {
    let newLayer = new FeatureLayer({
      url: layerInfo.url,
      id: layerInfo.id,
      outFields: ['*'],
      popupEnabled: layerInfo.popup != undefined ? layerInfo.popup : true,
    });

    return newLayer;
  }

  /**
   * This method adds a layer to the map.
   * @param {FeatureLayer} layer
   */
  addLayer(layer) {
    this.map.add(layer);
  }

  /**
   * This method will show the layer on the map.
   * @param {string} id
   */
  showLayer(id) {
    let items = this.map.layers.items;
    for (let layer in items)
      items[layer].id == id && (items[layer].visible = true);

  }

  /**
   * This method will hide a layer from the map, without removing it.
   * @param {string} id
   */
  hideLayer(id) {
    let items = this.map.layers.items;
    for (let layer in items)
      items[layer].id == id && (items[layer].visible = false);

  }

  /**
   * This method removes the layer from the map.
   * @param {string} id
   */
  removeLayer(id) {
    let items = this.map.layers.items;
    for (let layer in items)
      items[layer].id == id && this.map.remove(items[layer]);

  }

  /**
   * This method zooms the map to a certain extent specified by a bounding box
   * @param {Array} boundingBox
   */

  zoomToExtent(boundingBox) {
    let newExtent = new Extent(
      boundingBox[0],
      boundingBox[1],
      boundingBox[2],
      boundingBox[3],
    );
    this.view.extent = newExtent;
  }

  /**
   * This method retrieves the information of a certain point, allowing filters or queries.
   * @param {Object{x, y}} screenPoint
   * @param {Object{geometryType, geometry, outField, orderByFields, format}} options
   * @returns
   */
  async getPointInfo(screenPoint, options) {
    const pointInformation = await this.view
      .hitTest(screenPoint, options && options)
      .then(function (response) {
        if (response.results.length) {
          let graphic = response.results.filter(function (result) {
            return result.graphic;
          });
          return graphic[0].graphic.attributes;
        }
      });
    return pointInformation;
  }

  orderFeatures(features) {
    features.sort(function (a, b) {
      if (a.attributes.Copernicus_Land_Monitoring_Service_products_used < b.attributes.Copernicus_Land_Monitoring_Service_products_used)
        return -1;

      if (a.attributes.Copernicus_Land_Monitoring_Service_products_used > b.attributes.Copernicus_Land_Monitoring_Service_products_used)
        return 1;

      return 0;
    });
    return features;
  }
}

export default LayerControl;
