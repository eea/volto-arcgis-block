var FeatureLayer, Extent;
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
    var newLayer = new FeatureLayer({
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
    var items = this.map.layers.items;
    for (var layer in items) {
      items[layer].id == id ? (items[layer].visible = true) : '';
    }
  }

  /**
   * This method will hide a layer from the map, without removing it.
   * @param {string} id
   */
  hideLayer(id) {
    var items = this.map.layers.items;
    for (var layer in items) {
      items[layer].id == id ? (items[layer].visible = false) : '';
    }
  }

  /**
   * This method removes the layer from the map.
   * @param {string} id
   */
  removeLayer(id) {
    var items = this.map.layers.items;
    for (var layer in items) {
      items[layer].id == id ? this.map.remove(items[layer]) : '';
    }
  }

  /**
   * This method zooms the map to a certain extent specified by a bounding box
   * @param {Array} boundingBox
   */

  zoomToExtent(boundingBox) {
    var newExtent = new Extent(
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
      .hitTest(screenPoint, options ? options : '')
      .then(function (response) {
        if (response.results.length) {
          var graphic = response.results.filter(function (result) {
            return result.graphic;
          });
          return graphic[0].graphic.attributes;
        }
      });
    return pointInformation;
  }

  // getData() {
  //   var layer = new FeatureLayer({
  //     url:
  //       'https://bm-eugis.tk/arcgis/rest/services/CLMS/UseCasesSpatialCoverage/MapServer/0/query',
  //     geometryType: 'esriGeometryEnvelope',
  //     geometry: '0, 0',
  //     outField: [
  //       'Copernicus_Land_Monitoring_Service_products_used, Use_case_title, Use_case_topics, Use_case_submitting_production_year, Spatial_coverage',
  //     ],
  //     format: 'JSON',
  //     orderByFields: 'Copernicus_Land_Monitoring_Service_products_used',
  //   });

  //   this.map.add(layer);

  //   return 1;
  // }
}

export default LayerControl;
