let FeatureLayer, Extent, mapViewer;
class LayerControl {
  constructor(props) {
    this.map = props.map;
    this.view = props.view;
    mapViewer = props.mapViewer;
    FeatureLayer = props.FeatureLayer;
    Extent = props.Extent;
  }

  /**
   * This method will receive the information required to create a new layer .
   * @param {Object} layerInfo
   * @returns FeatureLayer
   */
  createLayer(layerInfo) {
    const newLayer = new FeatureLayer({
      url: layerInfo.url,
      id: layerInfo.id,
      outFields: ['*'],
      popupEnabled: layerInfo.popup !== undefined ? layerInfo.popup : true,
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
   * @param {String} id
   */
  showLayer(id) {
    const items = this.map.layers.items;
    for (let layer in items)
      items[layer].id === id && (items[layer].visible = true);
  }

  /**
   * This method will hide a layer from the map, without removing it.
   * @param {String} id
   */
  hideLayer(id) {
    const items = this.map.layers.items;
    for (let layer in items) {
      items[layer].id === id && (items[layer].visible = false);
    }
  }

  /**
   * This method removes the layer from the map.
   * @param {String} id
   */
  removeLayer(id) {
    const items = this.map.layers.items;
    for (let layer in items)
      items[layer].id === id && this.map.remove(items[layer]);
  }

  /**
   * This method zooms the map to a certain extent specified by a bounding box
   * @param {Array} boundingBox
   */
  zoomToExtent(boundingBox) {
    const newExtent = new Extent(
      boundingBox[0],
      boundingBox[1],
      boundingBox[2],
      boundingBox[3],
    );
    const zoomOnBounding = this.getBoundsZoomLevel(boundingBox);
    this.view.zoom = zoomOnBounding;
    this.view.extent = newExtent;
  }

  getBoundsZoomLevel(bounds) {
    const mapDim = { height: this.view.height, width: this.view.width };
    const WORLD_DIM = { height: 256, width: 256 };
    const ZOOM_MAX = 5;

    const ne = [bounds[2], bounds[3]];
    const sw = [bounds[0], bounds[1]];

    const latFraction = (this.latRad(ne[1]) - this.latRad(sw[1])) / Math.PI;

    const lngDiff = ne[0] - sw[0];
    const lngFraction = (lngDiff < 0 ? lngDiff + 360 : lngDiff) / 360;

    const latZoom = this.zoom(mapDim.height, WORLD_DIM.height, latFraction);
    const lngZoom = this.zoom(mapDim.width, WORLD_DIM.width, lngFraction);

    return Math.min(latZoom, lngZoom, ZOOM_MAX);
    //TODO calculate the corresponding level of zoom automatically
  }
  latRad(lat) {
    const sin = Math.sin((lat * Math.PI) / 180);
    const radX2 = Math.log((1 + sin) / (1 - sin)) / 2;
    return Math.max(Math.min(radX2, Math.PI), -Math.PI) / 2;
  }

  zoom(mapPx, worldPx, fraction) {
    return Math.floor(Math.log(mapPx / worldPx / fraction) / Math.LN2);
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
          const graphic = response.results.filter(function (result) {
            return result.graphic;
          });
          return graphic[0].graphic.attributes;
        }
      });
    return pointInformation;
  }

  getRegionInfo(region, callback) {
    const xmlhttp = new XMLHttpRequest();
    const url = `${mapViewer.spatialConfig.url}/query?where=Region+%3D+%27${region}%27&text=&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&relationParam=&outFields=*&returnGeometry=true&returnTrueCurves=false&maxAllowableOffset=&geometryPrecision=&outSR=&having=&returnIdsOnly=false&returnCountOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&gdbVersion=&historicMoment=&returnDistinctValues=false&resultOffset=&resultRecordCount=&queryByDistance=&returnExtentOnly=false&datumTransformation=&parameterValues=&rangeValues=&quantizationParameters=&featureEncoding=esriDefault&f=pjson`;
    xmlhttp.onreadystatechange = () => {
      if (xmlhttp.readyState === 4 && xmlhttp.status === 200)
        callback(this.returnData(xmlhttp), mapViewer);
    };
    xmlhttp.open('GET', url, true);
    xmlhttp.send();
  }

  checkIfMorePoints(latLon, callback) {
    const xmlhttp = new XMLHttpRequest();
    const url = `${mapViewer.spatialConfig.url}/query?where=Latitude%3D+${latLon.latitude}+AND+Longitude%3D+${latLon.longitude}&text=&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&relationParam=&outFields=*&returnGeometry=true&returnTrueCurves=false&maxAllowableOffset=&geometryPrecision=&outSR=&having=&returnIdsOnly=false&returnCountOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&gdbVersion=&historicMoment=&returnDistinctValues=false&resultOffset=&resultRecordCount=&queryByDistance=&returnExtentOnly=false&datumTransformation=&parameterValues=&rangeValues=&quantizationParameters=&featureEncoding=esriDefault&f=pjson`;
    xmlhttp.onreadystatechange = () => {
      if (xmlhttp.readyState === 4 && xmlhttp.status === 200)
        callback(this.returnData(xmlhttp), mapViewer);
    };
    xmlhttp.open('GET', url, true);
    xmlhttp.send();
  }

  returnData(xmlhttp) {
    return JSON.parse(xmlhttp.responseText);
  }

  /**
   * It highlights the information displayed for a use case on the infoWidget.
   * */
  highlightInfo(response) {
    if (response.results.length > 1) {
      if (
        response.results[0].graphic.geometry !== null &&
        mapViewer.popupOnce
      ) {
        mapViewer.popupOnce = false;
        document.querySelector('.map').style.cursor = 'pointer';
        document
          .querySelector(
            '#use_case_' + response.results[0].graphic.attributes.OBJECTID,
          )
          .classList.add('selected');
      }
    } else {
      mapViewer.popupOnce = true;
      document.querySelector('.map').style.cursor = '';
      if (document.querySelector('.use-case-element.selected'))
        document
          .querySelector('.use-case-element.selected')
          .classList.remove('selected');
    }
  }

  /**
   * Order retreived features by Service product name
   * @param {Object} features
   * @returns features ordered
   */
  orderFeatures(features) {
    features.sort(function (a, b) {
      if (
        a.attributes.Copernicus_Land_Monitoring_Service_products_used <
        b.attributes.Copernicus_Land_Monitoring_Service_products_used
      )
        return -1;

      if (
        a.attributes.Copernicus_Land_Monitoring_Service_products_used >
        b.attributes.Copernicus_Land_Monitoring_Service_products_used
      )
        return 1;

      return 0;
    });
    return features;
  }
}

export default LayerControl;
