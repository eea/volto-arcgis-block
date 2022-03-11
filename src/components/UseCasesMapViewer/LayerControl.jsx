let FeatureLayer, Extent, mapViewer;
class LayerControl {
  constructor(props) {
    this.map = props.map;
    this.view = props.view;
    this.worldDimensions = props.worldDimensions;
    this.maxZoom = props.maxZoom;
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
    let newLayer = new FeatureLayer({
      url: layerInfo.url,
      id: layerInfo.id,
      outFields: ['*'],
      legendEnabled: layerInfo.legend,
      popupEnabled: layerInfo.popup !== undefined ? layerInfo.popup : true,
    });

    return newLayer;
  }

  getGeometry(country, layer) {
    layer.definitionExpression = `(`;
    if (country === 'EU' || country === 'EEA') {
      let states = mapViewer.props.cfg.Codes[country];
      for (let i = 0; i < states.length; i++) {
        layer.definitionExpression += `CNTR_ID = '${states[i]}'`;
        if (i < states.length - 1) {
          layer.definitionExpression += ' OR ';
        } else {
          layer.definitionExpression += ')';
        }
      }
    } else {
      layer.definitionExpression += `CNTR_ID = '${country}')`;
    }
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
    let items = this.map.layers.items;
    for (let layer in items)
      items[layer].id === id && (items[layer].visible = true);
  }

  /**
   * This method will hide a layer from the map, without removing it.
   * @param {String} id
   */
  hideLayer(id) {
    let items = this.map.layers.items;
    for (let layer in items) {
      items[layer].id === id && (items[layer].visible = false);
    }
  }

  /**
   * This method removes the layer from the map.
   * @param {String} id
   */
  removeLayer(id) {
    let items = this.map.layers.items;
    for (let layer in items)
      items[layer].id === id && this.map.remove(items[layer]);
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
    let zoomOnBounding = this.getBoundsZoomLevel(boundingBox);
    this.view.zoom = zoomOnBounding;
    this.view.extent = newExtent;
  }

  getBoundsZoomLevel(bounds) {
    let mapDim = { height: this.view.height, width: this.view.width };

    let ne = [bounds[2], bounds[3]];
    let sw = [bounds[0], bounds[1]];

    let latFraction = (this.latRad(ne[1]) - this.latRad(sw[1])) / Math.PI;

    let lngDiff = ne[0] - sw[0];
    let lngFraction = (lngDiff < 0 ? lngDiff + 360 : lngDiff) / 360;

    let latZoom = this.zoom(
      mapDim.height,
      this.worldDimensions.height,
      latFraction,
    );
    let lngZoom = this.zoom(
      mapDim.width,
      this.worldDimensions.width,
      lngFraction,
    );

    return Math.min(latZoom, lngZoom, this.zoomMax);
    //TODO calculate the corresponding level of zoom automatically
  }
  latRad(lat) {
    let sin = Math.sin((lat * Math.PI) / 180);
    let radX2 = Math.log((1 + sin) / (1 - sin)) / 2;
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
    let pointInformation = await this.view
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

  getRegionInfo(region, callback) {
    let xmlhttp = new XMLHttpRequest();
    const url = `${mapViewer.spatialConfig.url}/query?where=Region+%3D+%27${region}%27&text=&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&relationParam=&outFields=*&returnGeometry=true&returnTrueCurves=false&maxAllowableOffset=&geometryPrecision=&outSR=&having=&returnIdsOnly=false&returnCountOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&gdbVersion=&historicMoment=&returnDistinctValues=false&resultOffset=&resultRecordCount=&queryByDistance=&returnExtentOnly=false&datumTransformation=&parameterValues=&rangeValues=&quantizationParameters=&featureEncoding=esriDefault&f=pjson`;
    xmlhttp.onreadystatechange = () => {
      if (xmlhttp.readyState === 4 && xmlhttp.status === 200)
        callback(this.returnData(xmlhttp), mapViewer);
    };
    xmlhttp.open('GET', url, true);
    xmlhttp.send();
  }

  checkIfMorePoints(latLon, callback) {
    let xmlhttp = new XMLHttpRequest();
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
        let country_code =
          response.results[0].graphic.attributes.Spatial_coverage;
        document
          .querySelectorAll('.use-case-element-description .use-case-coverage')
          .forEach((element) => {
            if (element.dataset.countryCode === country_code) {
              element.closest('.use-case-element').classList.add('selected');
            }
          });
      }
    } else {
      mapViewer.popupOnce = true;
      document.querySelector('.map').style.cursor = '';
      if (document.querySelector('.use-case-element.selected'))
        document
          .querySelectorAll('.use-case-element.selected')
          .forEach((element) => {
            element.closest('.use-case-element').classList.remove('selected');
          });
    }
  }

  /**
   * Order retreived features by Service product name
   * @param {Object} features
   * @returns features ordered
   */
  orderFeatures(features, countries) {
    features.map((feature) => {
      let country = countries
        .map((a) => {
          return a.attributes;
        })
        .find((b) => {
          return b.CNTR_ID === feature.attributes.Spatial_coverage;
        });
      if (country) {
        feature.attributes.Origin_name = country.NAME_ENGL;
      }
      return feature;
    });

    features.sort(function (a, b) {
      if (
        a.attributes.Copernicus_Land_Monitoring_Service_products_used <
        b.attributes.Copernicus_Land_Monitoring_Service_products_used
      )
        return -1;
      else if (
        a.attributes.Copernicus_Land_Monitoring_Service_products_used >
        b.attributes.Copernicus_Land_Monitoring_Service_products_used
      )
        return 1;
      else {
        if (a.attributes.Use_case_title < b.attributes.Use_case_title)
          return -1;
        else if (a.attributes.Use_case_title > b.attributes.Use_case_title)
          return 1;
        else {
          if (
            a.attributes.Use_case_submitting_production_year >
            b.attributes.Use_case_submitting_production_year
          ) {
            return -1;
          } else if (
            a.attributes.Use_case_submitting_production_year <
            b.attributes.Use_case_submitting_production_year
          ) {
            return 1;
          } else {
            var sortOrder = ['EEA', 'EU'];
            if (
              !sortOrder.includes(a.attributes.Origin_name) &&
              !sortOrder.includes(b.attributes.Origin_name)
            ) {
              return a.attributes.Origin_name.localeCompare(
                b.attributes.Origin_name,
              );
            } else {
              return (
                -sortOrder.indexOf(a.attributes.Origin_name) -
                -sortOrder.indexOf(b.attributes.Origin_name)
              );
            }
          }
        }
      }
    });
    return features;
  }
}

export default LayerControl;
