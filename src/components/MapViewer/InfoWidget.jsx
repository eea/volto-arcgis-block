import React, { createRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { loadModules } from 'esri-loader';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { Loader } from 'semantic-ui-react';
var GeometryEngine, Graphic, esriRequest;

class InfoWidget extends React.Component {
  /**
   * Creator of the InfoWidget widget class
   * @param {*} props
   */
  constructor(props) {
    super(props);
    //We create a reference to a DOM element to be mounted
    this.container = createRef();
    //Initially, we set the state of the component to
    //not be showing the basemap panel
    this.state = { showMapMenu: false };
    this.map = this.props.map;
    this.menuClass =
      'esri-icon-description esri-widget--button esri-widget esri-interactive';
    this.infoData = {};
  }

  loader() {
    return loadModules([
      'esri/geometry/geometryEngine',
      'esri/Graphic',
      'esri/request',
    ]).then(([_GeometryEngine, _Graphic, _esriRequest]) => {
      [GeometryEngine, Graphic, esriRequest] = [
        _GeometryEngine,
        _Graphic,
        _esriRequest,
      ];
    });
  }

  /**
   * Method that will be invoked when the
   * button is clicked. It controls the open
   * and close actions of the component
   */
  openMenu() {
    if (this.state.showMapMenu) {
      this.props.mapViewer.setActiveWidget();
      this.container.current.querySelector('.right-panel').style.display =
        'none';
      this.container.current
        .querySelector('.esri-widget--button')
        .classList.remove('active-widget');
      document
        .querySelector('.esri-ui-top-right.esri-ui-corner')
        .classList.remove('show-panel');
      // By invoking the setState, we notify the state we want to reach
      // and ensure that the component is rendered again
      this.setState({
        showMapMenu: false,
        pixelInfo: false,
        popup: false,
      });
      //this.props.view.popup.autoOpenEnabled = true;
      this.removeMarker();
    } else {
      this.props.mapViewer.setActiveWidget(this);
      this.container.current.querySelector('.right-panel').style.display =
        'flex';
      this.container.current
        .querySelector('.esri-widget--button')
        .classList.add('active-widget');
      document
        .querySelector('.esri-ui-top-right.esri-ui-corner')
        .classList.add('show-panel');
      // By invoking the setState, we notify the state we want to reach
      // and ensure that the component is rendered again
      this.setState({ showMapMenu: true });
      this.props.mapViewer.view.popup.close();
    }
  }
  /**
   * This method is executed after the rener method is executed
   */ async componentDidMount() {
    await this.loader();
    this.props.view.ui.add(this.container.current, 'top-right');
    this.props.view.on('click', (e) => {
      let screenPoint = {
        x: e.x,
        y: e.y,
      };
      let layers;
      if (this.props.mapViewer.activeWidget === this) {
        this.setState({
          loading: true,
        });
        layers = this.map.layers.items.filter(
          (a) => a.visible && a.title !== 'nuts',
        );
        this.infoData = {};
        let promises = [];
        let layerTypes = [];
        layers.forEach((layer, index) => {
          let title = this.getLayerTitle(layer);
          if (layer.isTimeSeries) {
            if (layer.url.toLowerCase().includes('wms')) {
              layerTypes.push({
                isTimeSeries: true,
                type: 'wms',
                title: title,
                fields: layer.fields,
              });
              promises.push(this.identifyWMS(layer, e));
            } else if (layer.url.toLowerCase().includes('wmts')) {
              layerTypes.push({
                isTimeSeries: true,
                type: 'wmts',
                title: title,
                fields: layer.fields,
              });
              promises.push(Promise.reject());
            } else {
              layerTypes.push({
                isTimeSeries: true,
                type: 'featureLayer',
                title: title,
                fields: layer.fields,
              });
              promises.push(this.identify(layer, e));
            }
          } else {
            if (layer.url.toLowerCase().includes('wms')) {
              layerTypes.push({
                isTimeSeries: false,
                type: 'wms',
                title: title,
                fields: layer.fields,
              });
              promises.push(this.identifyWMS(layer, e));
            } else if (layer.url.toLowerCase().includes('wmts')) {
              layerTypes.push({
                isTimeSeries: false,
                type: 'wmts',
                title: title,
                fields: layer.fields,
              });
              promises.push(Promise.reject());
            } else {
              layerTypes.push({
                isTimeSeries: false,
                type: 'featureLayer',
                title: title,
                fields: layer.fields,
              });
              promises.push(this.props.view.hitTest(screenPoint));
            }
          }
          Promise.allSettled(promises).then((values) => {
            if (promises.length === values.length) {
              values.forEach((response, index) => {
                let data = response.value;
                let layer = layerTypes[index];
                let properties = [];
                let message = 'No data available for this point in this layer';
                if (response.status === 'rejected') {
                  this.infoData[index] = {
                    title: layer.title,
                    data: properties,
                    message: 'No data avaliable for this layer',
                    fields: layer.fields,
                  };
                } else {
                  if (layer.isTimeSeries) {
                    switch (layer.type) {
                      case 'wms':
                        if (data.type === 'FeatureCollection') {
                          if (data.features.length) {
                            let obj = data.features.map((a) => {
                              return a.properties;
                            });
                            properties = this.transformWmsData(obj);
                          }
                        } else if (
                          data.doctype &&
                          data.doctype.name === 'html'
                        ) {
                          let th = data.querySelectorAll('tbody th');
                          let tr = data.querySelectorAll(
                            'tbody tr:not(:first-of-type)',
                          );
                          if (th.length) {
                            let obj = Array.from(tr).map((a) => {
                              let x = [];
                              a.querySelectorAll('td').forEach((td, index) => {
                                x[th[index].textContent] = td.textContent;
                              });
                              return x;
                            });
                            properties = this.transformWmsData(obj);
                          }
                        } else if (
                          data.getElementsByTagName('FIELDS').length &&
                          typeof data !== 'undefined'
                        ) {
                          let fields = data.getElementsByTagName('FIELDS');
                          if (fields.length) {
                            let obj = Array.from(fields).map((a) => {
                              let x = [];
                              Object.entries(a.attributes).forEach((b) => {
                                x[b[1].name] = b[1].value;
                              });
                              return x;
                            });
                            properties = this.transformWmsData(obj);
                          }
                        }
                        this.infoData[index] = {
                          title: layer.title,
                          data: properties,
                          time: true,
                          message: message,
                          fields: layer.fields,
                        };
                        break;
                      case 'wmts':
                        this.infoData[index] = {
                          title: layer.title,
                          data: properties,
                          time: true,
                          message: message,
                          fields: layer.fields,
                        };
                        break;
                      case 'featureLayer':
                        this.infoData[index] = {
                          title: layer.title,
                          data: data,
                          time: true,
                          message: message,
                          fields: layer.fields,
                        };
                        break;
                      default:
                        break;
                    }
                  } else {
                    switch (layer.type) {
                      case 'wms':
                        if (data.type === 'FeatureCollection') {
                          if (data.features.length) {
                            properties = data.features[0].properties;
                            properties = Object.entries(properties);
                          }
                        } else if (
                          data.doctype &&
                          data.doctype.name === 'html'
                        ) {
                          let th = data.querySelectorAll('tbody th');
                          let td = data.querySelectorAll('tbody td');
                          if (th.length) {
                            let fields = [];
                            th.forEach((item, index) => {
                              fields.push([
                                item.textContent,
                                td[index].textContent,
                              ]);
                            });
                            properties = fields;
                          }
                        } else if (
                          data.getElementsByTagName('FIELDS').length &&
                          typeof data !== 'undefined'
                        ) {
                          let fields = data.getElementsByTagName('FIELDS');
                          if (fields.length) {
                            properties = Object.entries(
                              fields[0].attributes,
                            ).map((a) => {
                              return [a[1].name, a[1].value];
                            });
                          }
                        }
                        this.infoData[index] = {
                          title: layer.title,
                          data: properties,
                          message: message,
                          fields: layer.fields,
                        };
                        break;
                      case 'wmts':
                        this.infoData[index] = {
                          title: layer.title,
                          data: properties,
                          message: message,
                          fields: layer.fields,
                        };
                        break;
                      case 'featureLayer':
                        if (data.results.length) {
                          var graphics = data.results.filter((result) => {
                            return result.graphic.layer === layers[index];
                          });
                          if (graphics[0]) {
                            let graphic = graphics[0].graphic;
                            if (graphic) {
                              properties = graphic.attributes;
                            }
                          }
                        }
                        this.infoData[index] = {
                          title: layer.title,
                          data: Object.entries(properties),
                          message: message,
                          fields: layer.fields,
                        };
                        break;
                      default:
                        break;
                    }
                  }
                }
              });
              let layerIndex = layers.length - 1;
              this.setState({
                layerIndex: layerIndex,
                pixelInfo: layerTypes[layerIndex].isTimeSeries ? true : false,
                popup: !layerTypes[layerIndex].isTimeSeries ? true : false,
                loading: false,
              });
            }
          });
          this.addMarker(e);
        });
      }
    });
  }

  getLayerTitle(layer) {
    let title;
    if (layer.url.toLowerCase().includes('wmts')) {
      // CLMS-1105
      title = layer._wmtsTitle;
    } else {
      if (layer.sublayers) {
        title = layer.sublayers.items[0].title;
      } else if (layer.activeLayer) {
        title = layer.activeLayer.title;
      } else {
        title = layer.title;
      }
    }
    return title;
  }

  getLayerName(layer) {
    let title;
    if (layer.sublayers) {
      title = layer.sublayers.items[0].name;
    } else if (layer.activeLayer) {
      title = layer.activeLayer.name;
    } else {
      title = layer.name;
    }
    return title;
  }

  identifyWMS(layer, event) {
    let layerId = this.getLayerName(layer);
    let url = layer.featureInfoUrl ? layer.featureInfoUrl : layer.url;
    return this.wmsCapabilities(url).then((xml) => {
      let version = this.parseCapabilities(xml, 'wms_capabilities')[0]
        .attributes['version'];
      let format = this.parseFormat(xml, layerId);
      let times = '';
      let nTimes = 1;
      if (layer.isTimeSeries) {
        times = this.parseTime(xml, layerId);
        nTimes = times.length;
      }
      return esriRequest(url, {
        responseType: 'html',
        sync: 'true',
        query: {
          request: 'GetFeatureInfo',
          service: 'WMS',
          version: version,
          SRS: 'EPSG:' + this.props.view.spatialReference.latestWkid,
          CRS: 'EPSG:' + this.props.view.spatialReference.latestWkid,
          BBOX:
            '' +
            this.props.view.extent.xmin +
            ', ' +
            this.props.view.extent.ymin +
            ', ' +
            this.props.view.extent.xmax +
            ', ' +
            this.props.view.extent.ymax,
          HEIGHT: this.props.view.height,
          WIDTH: this.props.view.width,
          X: event.screenPoint.x,
          Y: event.screenPoint.y,
          QUERY_LAYERS: layerId,
          INFO_FORMAT: format,
          TIME: times ? times[0] + '/' + times[nTimes - 1] : '',
          FEATURE_COUNT: '' + nTimes,
        },
      })
        .then((response) => {
          let format = response.requestOptions.query.INFO_FORMAT;
          let data;
          if (format.includes('text')) {
            data = new window.DOMParser().parseFromString(
              response.data,
              'text/html',
            );
          } else if (format.includes('json')) {
            data = JSON.parse(response.data);
          }
          return data;
        })
        .then((data) => {
          return data;
        });
    });
  }

  wmsCapabilities(url) {
    return esriRequest(url, {
      responseType: 'html',
      sync: 'true',
      query: {
        request: 'GetCapabilities',
        service: 'WMS',
      },
    }).then((response) => {
      let parser = new DOMParser();
      let xml = parser.parseFromString(response.data, 'text/html');
      return xml;
    });
  }

  parseCapabilities(xml, tag) {
    return xml.getElementsByTagName(tag);
  }

  parseFormat(xml) {
    let formats = Array.from(
      Array.from(this.parseCapabilities(xml, 'getFeatureInfo')).map(
        (f) => f.children,
      )[0],
    ).map((v) => v.textContent);
    let format = formats.filter((v) => v.includes('json'))[0];
    if (!format) format = formats.filter((v) => v.includes('html'))[0];
    if (!format) format = formats.filter((v) => v.includes('text/xml'))[0];
    if (!format) format = formats[0];
    return format;
  }

  parseTime(xml, layerId) {
    let layers = Array.from(xml.querySelectorAll('Layer')).filter(
      (v) => v.querySelectorAll('Layer').length === 0,
    );
    let layer = layers.find((a) => {
      return a.querySelector('Name').innerText === layerId;
    });
    let times = layer.querySelector('Dimension').innerText.split(',');
    return times;
  }

  transformWmsData(obj) {
    let values = { timeFields: {}, data: {}, variables: {}, tableData: {} };
    let startField = Object.keys(obj[0]).find(
      (a, i) =>
        a.toUpperCase().includes('DATE') &&
        !isNaN(parseInt(Object.values(obj[0])[i])),
    );
    values.timeFields['start'] = startField;
    values.tableData['fields'] = Object.keys(obj[0]);
    values.tableData['values'] = obj.map((a) => {
      return Object.entries(a);
    });
    let fields = Object.keys(obj[0]).filter((a, i) => {
      return (
        !isNaN(parseInt(Object.values(obj[0])[i])) &&
        a.toUpperCase() !== 'OBJECTID' &&
        !a.toUpperCase().includes('DATE')
      );
    });
    let field = fields[0];
    values.variables = { options: fields, selected: field };
    values.timeFields['values'] = obj.map((a, i) => {
      let date = {};
      Object.entries(obj[i]).forEach(([key, value]) => {
        if (key === startField) {
          date[key] = value;
        }
      });
      return date;
    });
    values.data['outFields'] = field;
    values.data['values'] = obj.map((a, i) => {
      let x = {};
      Object.entries(obj[i]).forEach(([key, value]) => {
        if (fields.includes(key)) {
          x[key] = parseFloat(value);
        }
      });
      return x;
    });
    return values;
  }

  addMarker(evt) {
    this.removeMarker();
    let lat = evt.mapPoint.latitude;
    let long = evt.mapPoint.longitude;
    var point = {
      type: 'point',
      longitude: long,
      latitude: lat,
    };
    var markerSymbol = {
      type: 'simple-marker',
      color: [255, 255, 255, 0.75],
      outline: {
        color: 'black',
        width: '2px',
      },
    };
    var pointGraphic = new Graphic({
      geometry: point,
      symbol: markerSymbol,
      attributes: { long, lat, id: 'pixel-info' },
    });
    this.props.view.graphics.add(pointGraphic);
  }

  removeMarker() {
    if (
      this.props.view.graphics.items.find((a) => {
        return a.attributes ? a.attributes.id === 'pixel-info' : false;
      })
    ) {
      let marker = this.props.view.graphics.items.find((a) => {
        return a.attributes && a.attributes.id === 'pixel-info';
      });
      this.props.view.graphics.remove(marker);
    }
  }

  identify(layer, evt) {
    let values = { timeFields: {}, data: {}, variables: {}, tableData: {} };
    //Complete time data
    values.timeFields['start'] = layer.timeInfo.startField;
    values.timeFields['end'] = layer.timeInfo.endField;
    values.tableData['fields'] = layer.fields.map((a) => {
      return a.name;
    });
    let timeQuery = layer.createQuery();
    timeQuery.outFields = [layer.timeInfo.startField];
    let fields = layer.fields
      .filter((a) => {
        return (
          a.type !== 'date' &&
          a.type !== 'geometry' &&
          a.type !== 'string' &&
          a.type !== 'oid'
        );
      })
      .map((b) => {
        return b.name;
      });
    let field = fields.includes(layer.displayField)
      ? layer.displayField
      : fields[0];
    values.variables = { options: fields, selected: field };
    if (layer.timeInfo.fullTimeExtent.endField) {
      timeQuery.outFields.push(layer.timeInfo.endField);
    }
    timeQuery.returnDistinctValues = true;
    timeQuery.returnGeometry = false;
    let p1 = layer.queryFeatures(timeQuery).then((r) => {
      let timevals = [];
      r.features.forEach((e) => timevals.push(e.attributes));
      values.timeFields['values'] = timevals.sort((a, b) => {
        return a[values.timeFields.start] - b[values.timeFields.start];
      });
    });

    //Query for data
    let query = layer.createQuery();
    query.geometry = this.props.view.toMap(evt); // the point location of the pointer
    query.distance = 1000;
    query.units = 'meters';
    query.spatialRelationship = 'intersects'; // this is the default
    query.returnGeometry = true;
    query.outFields = [values.tableData.fields.toString()]; // Information to be returned
    values.data['outFields'] = [fields.toString()];

    let p2 = layer.queryFeatures(query).then((response) => {
      //First of all, we get all the points with its distance to click point
      let points = response.features.map((e) => {
        return {
          latitude: e.geometry.latitude,
          longitude: e.geometry.longitude,
          distance: GeometryEngine.distance(
            this.props.view.toMap(evt),
            e.geometry,
            'meters',
          ),
        };
      });
      let min_distance = Math.min.apply(
        null,
        points.map((e) => e.distance),
      ); //minimum distance
      let point = points.find((e) => e.distance <= min_distance); //minimum distance point
      //get de info of the minimum distance point at all the times possible
      let info = response.features.filter(
        (e) =>
          e.geometry.latitude === point.latitude &&
          e.geometry.longitude === point.longitude,
      );
      values.tableData['values'] = values.data['values'] = info.map((e) => {
        return Object.entries(e.attributes);
      });
      values.data['values'] = info.map((e) => {
        let attributes = e.attributes;
        return Object.fromEntries(
          Object.entries(attributes).filter(([key]) =>
            values.data.outFields[0].split(',').includes(key),
          ),
        );
      });
    });

    return Promise.all([p1, p2]).then(() => {
      return values;
    });
  }

  loadInfoChart(index) {
    let response = this.infoData[index].data;
    let variable = response.variables.selected;
    let data = {
      x: response.timeFields.values.map((a) => {
        return a[response.timeFields.start];
      }),
      y: response.data.values.map((a) => {
        return Math.round(a[variable] * 100) / 100;
      }),
    };
    return this.createChart(variable, data);
  }

  createChart(variable, chartData) {
    let chartOptions = {
      chart: {
        height: 208,
      },
      title: {
        text: '',
        style: {},
      },
      subtitle: {
        text: '',
        style: {
          display: 'none',
        },
      },
      plotOptions: {
        line: {
          pointPlacement: 'between',
        },
      },
      xAxis: {
        title: {
          text: null,
        },
        labels: {
          format: '{value:%d/%m/%Y}',
        },
        type: 'datetime',
        categories: chartData.x,
        tickmarkPlacement: 'between',
        startOnTick: true,
        endOnTick: true,
      },
      legend: {
        enabled: false,
      },
      tooltip: {
        shared: true,
        useHTML: true,
        headerFormat: '{point.x:%d/%m/%Y}<br><b>{point.point.symbolName}</b>',
      },
      series: [
        {
          marker: {
            enabled: false,
          },
          name: variable,
          data: chartData.y,
          shadow: false,
          zIndex: 1,
          color: '#a0b128',
        },
      ],
      exporting: {
        buttons: {
          contextButton: {
            enabled: false,
          },
        },
      },
      credits: {
        enabled: false,
      },
    };
    return chartOptions;
  }

  selectVariable(option) {
    this.infoData[0].data.variables.selected = option;
    this.setState({
      pixelInfo: true,
    });
  }

  loadInfoTable(index) {
    let properties;
    // set aliases using fields configured in the CMS
    if (this.infoData[index].fields) {
      let f = JSON.parse(this.infoData[index].fields);
      if (f && f.length > 0) {
        let data = this.infoData[index].data;
        if (data) {
          properties = [];
          data.forEach((row) => {
            for (const field in f) {
              if (row[0] === f[field].name) {
                // alias, value
                properties.push([f[field].alias, row[1]]);
              }
            }
          });
        }
      } else {
        properties = this.infoData[index].data;
      }
    } else {
      properties = this.infoData[index].data;
    }
    let table = properties.map((item) => {
      return (
        <tr key={item}>
          {Object.values(item).map((val) => (
            <td key={val}>{val}</td>
          ))}
        </tr>
      );
    });
    return (
      <table className="info-table">
        <tbody>{table}</tbody>
      </table>
    );
  }

  loadTimeInfoTable(index) {
    let properties = this.infoData[index].data.tableData.values;
    let table = properties.map((item) => {
      let rows = item.map((row) => {
        return (
          <tr key={row}>
            {Object.values(row).map((val) => (
              <td key={val}>{val}</td>
            ))}
          </tr>
        );
      });
      return (
        <table className="info-table">
          <tbody>{rows}</tbody>
        </table>
      );
    });
    return <>{table}</>;
  }

  loadVariableSelector(index) {
    let response = this.infoData[index].data;
    let variables = response.variables.options;
    let variable = response.variables.selected;
    let options = variables.map((option) => {
      return (
        <option key={option} value={option}>
          {option}
        </option>
      );
    });
    return (
      <label>
        Variable
        <select
          className="esri-select"
          id="info_variable"
          value={variable}
          onBlur={(e) => e.preventDefault()}
          onChange={(e) => this.selectVariable(e.target.value)}
        >
          {options}
        </select>
      </label>
    );
  }

  loadStatisticsSelector(index) {
    let statistics = ['Mean', 'Median', 'Variance', 'Standard deviation'];
    let selected =
      this.infoData[index].data.statistics &&
      this.infoData[index].data.statistics.selected
        ? this.infoData[index].data.statistics.selected
        : statistics[0];
    let value =
      this.infoData[index].data.statistics &&
      this.infoData[index].data.statistics.value
        ? this.infoData[index].data.statistics.value
        : this.calculateStatistics(selected);
    this.infoData[index].data.statistics = {
      selected: selected,
      value: value,
    };
    let options = statistics.map((option) => {
      return (
        <option key={option} value={option}>
          {option}
        </option>
      );
    });
    return (
      <>
        <label>
          Statistics
          <select
            className="esri-select"
            id="info_statistics"
            value={selected}
            onBlur={(e) => e.preventDefault()}
            onChange={(e) => this.selectStatistics(e.target.value)}
          >
            {options}
          </select>
        </label>
        <div className="info-statistics-panel">
          {this.infoData[index].data.statistics.value && (
            <span className="info-statistics-result">
              {this.infoData[index].data.statistics.value}
            </span>
          )}
        </div>
      </>
    );
  }

  calculateStatistics(statistic) {
    let index = this.state.layerIndex;
    let response = this.infoData[index].data;
    let variable = response.variables.selected;
    let data = response.data.values.map((a) => {
      return a[variable];
    });
    let mean = data.reduce((a, b) => a + b) / data.length;
    let result;
    switch (statistic) {
      case 'Mean':
        result = mean;
        break;
      case 'Median':
        data = data.sort((a, b) => {
          return a - b;
        });
        var i = data.length / 2;
        result =
          i % 1 === 0 ? (data[i - 1] + data[i]) / 2 : data[Math.floor(i)];
        break;
      case 'Variance':
        result =
          data.map((x) => Math.pow(x - mean, 2)).reduce((a, b) => a + b) /
          data.length;
        break;
      case 'Standard deviation':
        let variance =
          data.map((x) => Math.pow(x - mean, 2)).reduce((a, b) => a + b) /
          data.length;
        result = Math.sqrt(variance);
        break;
      default:
        break;
    }
    return result;
  }

  selectStatistics(option) {
    let index = this.state.layerIndex;
    this.infoData[index].data.statistics = {
      selected: option,
      value: this.calculateStatistics(option),
    };
    this.setState({
      pixelInfo: true,
    });
  }

  /**
   * This method renders the component
   * @returns jsx
   */
  render() {
    let noData = true;
    if (this.state.pixelInfo) {
      noData = this.infoData[this.state.layerIndex].data.data
        ? this.infoData[this.state.layerIndex].data.data.values.map((a) => {
            return a[
              this.infoData[this.state.layerIndex].data.variables.selected
            ];
          }).length === 0
        : true;
    } else if (this.state.popup) {
      noData = this.infoData[this.state.layerIndex].data.length === 0 && true;
    }
    return (
      <>
        <div ref={this.container} className="info-container">
          <div tooltip="Layer info" direction="left" type="widget">
            <div
              className={this.menuClass}
              id="info_button"
              aria-label="Layer info"
              onClick={this.openMenu.bind(this)}
              onKeyDown={this.openMenu.bind(this)}
              tabIndex="0"
              role="button"
            ></div>
          </div>
          <div className="right-panel">
            <div className="right-panel-header">
              <span>Layer info</span>
              <span
                className="map-menu-icon esri-icon-close"
                onClick={this.openMenu.bind(this)}
                onKeyDown={this.openMenu.bind(this)}
                tabIndex="0"
                role="button"
              ></span>
            </div>
            <div className="right-panel-content">
              <div className="info-panel">
                {this.state.loading ? (
                  <Loader active inline="centered" size="small" />
                ) : (
                  <>
                    {(this.state.pixelInfo || this.state.popup) && (
                      <>
                        <div className="info-panel-buttons">
                          <button
                            className="ccl-button ccl-button--default info-button-left"
                            onClick={() =>
                              this.setState({
                                layerIndex: this.state.layerIndex + 1,
                                pixelInfo: this.infoData[
                                  this.state.layerIndex + 1
                                ].time
                                  ? true
                                  : false,
                                popup: !this.infoData[this.state.layerIndex + 1]
                                  .time
                                  ? true
                                  : false,
                              })
                            }
                            disabled={
                              this.state.layerIndex ===
                              Object.keys(this.infoData).length - 1
                            }
                          >
                            <FontAwesomeIcon icon={['fas', 'chevron-left']} />
                            <span>Previous layer</span>
                          </button>
                          <button
                            className="ccl-button ccl-button--default info-button-right"
                            onClick={() =>
                              this.setState({
                                layerIndex: this.state.layerIndex - 1,
                                pixelInfo: this.infoData[
                                  this.state.layerIndex - 1
                                ].time
                                  ? true
                                  : false,
                                popup: !this.infoData[this.state.layerIndex - 1]
                                  .time
                                  ? true
                                  : false,
                              })
                            }
                            disabled={this.state.layerIndex === 0}
                          >
                            <span>Next layer</span>
                            <FontAwesomeIcon icon={['fas', 'chevron-right']} />
                          </button>
                        </div>
                        <span className="info-panel-title">
                          {this.infoData[this.state.layerIndex].title}
                        </span>
                      </>
                    )}
                    {this.state.pixelInfo && !noData && (
                      <>
                        {this.loadVariableSelector(this.state.layerIndex)}
                        <HighchartsReact
                          highcharts={Highcharts}
                          options={this.loadInfoChart(this.state.layerIndex)}
                        />
                        {this.loadStatisticsSelector(this.state.layerIndex)}
                        {this.loadTimeInfoTable(this.state.layerIndex)}
                      </>
                    )}
                    {this.state.popup &&
                      !noData &&
                      this.loadInfoTable(this.state.layerIndex)}
                    {this.state.pixelInfo || this.state.popup ? (
                      noData && (
                        <span className="info-panel-empty">
                          {this.infoData[this.state.layerIndex].message}
                        </span>
                      )
                    ) : (
                      <>
                        <span className="info-panel-empty">
                          Click on the map to get pixel info.
                        </span>
                        <br />
                        <span className="info-panel-empty">
                          Some products may not have information available to be
                          displayed.
                        </span>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
}

export default InfoWidget;
