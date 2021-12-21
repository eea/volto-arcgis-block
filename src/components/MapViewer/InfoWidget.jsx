import React, { createRef } from 'react';
import { loadModules } from 'esri-loader';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
var GeometryEngine, Graphic;

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
    //this.chartOptions;
  }

  loader() {
    return loadModules(['esri/geometry/geometryEngine', 'esri/Graphic']).then(
      ([_GeometryEngine, _Graphic]) => {
        [GeometryEngine, Graphic] = [_GeometryEngine, _Graphic];
      },
    );
  }

  /**
   * Method that will be invoked when the
   * button is clicked. It controls the open
   * and close actions of the component
   */
  openMenu() {
    if (this.state.showMapMenu) {
      this.props.mapViewer.setActiveWidget();
      this.container.current.querySelector('.info-panel').style.display =
        'none';
      this.container.current
        .querySelector('.esri-widget--button')
        .classList.replace('esri-icon-right-arrow', 'esri-icon-description');
      // By invoking the setState, we notify the state we want to reach
      // and ensure that the component is rendered again
      this.setState({ showMapMenu: false, pixelInfo: false });
      this.props.view.popup.autoOpenEnabled = true;
      this.removeMarker();
    } else {
      this.props.mapViewer.setActiveWidget(this);
      this.container.current
        .querySelector('.esri-widget--button')
        .classList.replace('esri-icon-description', 'esri-icon-right-arrow');
      this.container.current.querySelector('.info-panel').style.display =
        'block';
      // By invoking the setState, we notify the state we want to reach
      // and ensure that the component is rendered again
      this.setState({ showMapMenu: true });
      this.props.mapViewer.view.popup.close();
      this.props.view.popup.autoOpenEnabled = false;
    }
  }
  /**
   * This method is executed after the rener method is executed
   */
  async componentDidMount() {
    await this.loader();
    this.props.view.ui.add(this.container.current, 'top-right');
    this.props.view.on('click', (e) => {
      if (this.props.mapViewer.activeWidget === this) {
        let timeLayers = this.map.layers.items.filter(
          (a) => a.timeInfo && a.visible,
        );
        let layer = timeLayers[timeLayers.length - 1];
        let title;
        if (layer.sublayers) {
          title = layer.sublayers.items[0].title;
        } else if (layer.activeLayer) {
          title = layer.activeLayer.title;
        } else {
          title = layer.title;
        }
        this.identify(layer, e).then((response) => {
          let variables = response.variables.options;
          let variable = response.variables.selected;
          if (
            this.state.variables
              ? variables.includes(this.state.variables.selected)
              : false
          ) {
            variable = this.state.variables.selected;
          }
          let data = {
            x: response.timeFields.values
              .map((a) => {
                return a[response.timeFields.start];
              })
              .sort((a, b) => {
                return new Date(a).getTime() - new Date(b).getTime();
              }),
            y: response.data.values.map((a) => {
              return Math.round(a[variable] * 100) / 100;
            }),
          };
          let chartData = this.createChart(title, variable, data);
          this.addMarker(e);
          this.setState({
            pixelInfo: true,
            data: response,
            options: chartData,
            variables: { options: variables, selected: variable, title: title },
          });
        });
      }
    });
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
        return a.attributes ? a.attributes.id == 'pixel-info' : false;
      })
    ) {
      let marker = this.props.view.graphics.items.find((a) => {
        return a.attributes && a.attributes.id == 'pixel-info';
      });
      this.props.view.graphics.remove(marker);
    }

    let marker = this.props.view.graphics.items.find((a) => {
      return a.attributes ? a.attributes.id == 'pixel-info' : false;
    });
    this.props.view.graphics.remove(marker);
  }

  identify(layer, evt) {
    let values = { timeFields: {}, data: {}, variables: {} };
    //Complete time data
    values.timeFields['start'] = layer.timeInfo.startField;
    values.timeFields['end'] = layer.timeInfo.endField;
    let timeQuery = layer.createQuery();
    timeQuery.outFields = [layer.timeInfo.startField];
    let fields = layer.fields
      .filter((a) => {
        return (
          a.type != 'date' &&
          a.type != 'geometry' &&
          a.type != 'string' &&
          a.type != 'oid'
        );
      })
      .map((b) => {
        return b.name;
      });
    let field = layer.displayField in fields ? layer.displayField : fields[0];
    values.variables = { options: fields, selected: field };
    if (layer.timeInfo.fullTimeExtent.endField) {
      timeQuery.outFields.push(layer.timeInfo.endField);
    }
    timeQuery.returnDistinctValues = true;
    timeQuery.returnGeometry = false;
    let p1 = layer.queryFeatures(timeQuery).then((r) => {
      let timevals = [];
      r.features.forEach((e) => timevals.push(e.attributes));
      values.timeFields['values'] = timevals;
    });

    //Query for data
    let query = layer.createQuery();
    query.geometry = this.props.view.toMap(evt); // the point location of the pointer
    query.distance = 1000;
    query.units = 'meters';
    query.spatialRelationship = 'intersects'; // this is the default
    query.returnGeometry = true;
    query.outFields = [fields.toString()]; // Information to be returned
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
      values.data['values'] = info.map((e) => {
        return e.attributes;
      });
    });

    return Promise.all([p1, p2]).then(() => {
      return values;
    });
  }

  createChart(title, variable, chartData) {
    let chartOptions = {
      chart: {
        height: 208,
      },
      title: {
        text: title,
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
        headerFormat:
          '{point.x:%d/%m/%Y}<br>' + '<b>{point.point.symbolName}</b>',
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
    let variables = this.state.variables.options;
    let variable = option;
    let title = this.state.variables.title;
    let data = {
      x: this.state.data.timeFields.values
        .map((a) => {
          return a[this.state.data.timeFields.start];
        })
        .sort((a, b) => {
          return new Date(a).getTime() - new Date(b).getTime();
        }),
      y: this.state.data.data.values.map((a) => {
        return Math.round(a[variable] * 100) / 100;
      }),
    };
    let chartData = this.createChart(title, variable, data);
    this.setState({
      options: chartData,
      variables: { options: variables, selected: variable, title: title },
    });
  }

  /**
   * This method renders the component
   * @returns jsx
   */
  render() {
    let isEmpty;
    if (this.state.data) {
      isEmpty =
        this.state.data.data.values.map((a) => {
          return a[this.state.variables.selected];
        }).length === 0;
    }
    return (
      <>
        <div ref={this.container} className="info-container">
          <div
            className={this.menuClass}
            id="info_button"
            title="Info"
            onClick={this.openMenu.bind(this)}
            onKeyDown={this.openMenu.bind(this)}
            tabIndex="0"
            role="button"
          ></div>
          <div className="info-panel">
            {this.state.pixelInfo ? (
              <>
                <select
                  className="esri-select"
                  value={this.state.variables.selected}
                  onChange={(e) => this.selectVariable(e.target.value)}
                >
                  {this.state.variables.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {isEmpty ? (
                  <span className="info-panel-empty">No data</span>
                ) : (
                  <HighchartsReact
                    highcharts={Highcharts}
                    options={this.state.options}
                  />
                )}
              </>
            ) : (
              <span className="info-panel-empty">
                Click on the map to get pixel info
              </span>
            )}
          </div>
        </div>
      </>
    );
  }
}

export default InfoWidget;
