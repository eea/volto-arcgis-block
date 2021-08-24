var FeatureLayer, Extent;
class LayerControl {
  //props es un json con los diferentes parametros (map, etc...)
  constructor(props) {
    this.map = props.map;
    this.view = props.view;
    FeatureLayer = props.FeatureLayer;
    Extent = props.Extent;
  }

  createLayer(info) {
    var newLayer = new FeatureLayer({
      url: info.url,
      id: info.id,
      outFields: ['*'],
      popupEnabled: info.popup != undefined ? info.popup : true,
    });

    return newLayer;
  }

  getPointInfo(data) {
    var lat = "data.lat";
    var lng = "data.lng";

    var geometry = [lng, lat];
    var url =
      'https://bm-eugis.tk/arcgis/rest/services/CLMS/UseCasesSpatialCoverage/MapServer/0/query';

    var parameters = [
      'where',
      'text',
      'objectIds',
      'time',
      'geometry',
      'geometryType',
      'inSR',
      'spatialRel',
      'relationParam',
      'outFields',
      'returnGeometry',
      'returnTrueCurves',
      'maxAllowableOffset',
      'geometryPrecision',
      'outSR',
      'having',
      'returnIdsOnly',
      'returnCountOnly',
      'orderByFields',
      'groupByFieldsForStatistics',
      'outStatistics',
      'returnZ',
      'returnM',
      'gdbVersion',
      'historicMoment',
      'returnDistinctValues',
      'resultOffset',
      'resultRecordCount',
      'queryByDistance',
      'returnExtentOnly',
      'datumTransformation',
      'parameterValues',
      'rangeValues',
      'quantizationParameters',
      'featureEncoding',
      'f',
    ];

    var urlQuery = new URL(url);

    for (var param in parameters) {
      urlQuery.searchParams.set(parameters[param], (data.parameters[param] != undefined ? data.parameters[param] : ''));
    }

    console.log(urlQuery);
  }

  showLayer(id) {
    var items = this.map.layers.items;
    for (var layer in items) {
      items[layer].id == id ? (items[layer].visible = true) : '';
    }
  }

  hideLayer(id) {
    var items = this.map.layers.items;
    for (var layer in items) {
      items[layer].id == id ? (items[layer].visible = false) : '';
    }
  }

  removeLayer(id) {
    var items = this.map.layers.items;
    for (var layer in items) {
      items[layer].id == id ? this.map.remove(items[layer]) : '';
    }
  }

  addLayer(layer) {
    this.map.add(layer);
  }

  zoomToExtent(bbox) {
    var newExtent = new Extent(bbox.maxX, bbox.minX, bbox.maxY, bbox.minY);
    this.view.extent = newExtent;
  }
}

export default LayerControl;
