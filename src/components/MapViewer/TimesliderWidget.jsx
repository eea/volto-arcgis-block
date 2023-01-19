import React, { createRef } from 'react';
import { loadModules } from 'esri-loader';
var TimeSlider;
var TimeExtent;
var esriRequest;
var timeDict = {};

class TimesliderWidget extends React.Component {
  /**
   * Creator of the TimeSlider widget class
   * @param {*} props
   */
  constructor(props) {
    super(props);
    //We create a reference to a DOM element to be mounted
    this.container = createRef();
    //Initially, we set the state of the component to
    //not be showing the basemap panel
    this.state = {
      showMapMenu: false,
      styles: { bottom: '0', right: '0' },
      timeSelectedValues: [], //To store time slider values [min, max]
      timeSelectedValuesC: [], //To compare time slider stored values with new selected values
    };
    this.map = this.props.map;
    this.layer = this.props.layer;
    if (this.layer.type === 'feature') {
      this.layerName = this.layer.id; //FEATURE
    } else if (this.layer.type === 'wms') {
      this.layerName = this.layer.sublayers.items[0].name;
    } else if (this.layer.type === 'wmts') {
      this.layerName = this.layer.activeLayer.id; //WMTS
    }
    this.drag = {};
  }

  loader() {
    return loadModules([
      'esri/widgets/TimeSlider',
      'esri/TimeExtent',
      'esri/request',
    ]).then(([_TimeSlider, _TimeExtent, _esriRequest]) => {
      [TimeSlider] = [_TimeSlider];
      [TimeExtent] = [_TimeExtent];
      [esriRequest] = [_esriRequest];
    });
  }

  getCapabilities(url, serviceType) {
    // Get the coordinates of the click on the view
    return esriRequest(url, {
      responseType: 'html',
      sync: 'true',
      query: {
        request: 'GetCapabilities',
        service: serviceType,
      },
    }).then((response) => {
      let parser = new DOMParser();
      let xml = parser.parseFromString(response.data, 'text/html');
      return xml;
    });
  }

  parseTimeWMS(xml) {
    let layers = Array.from(xml.querySelectorAll('Layer')).filter(
      (v) => v.querySelectorAll('Layer').length === 0,
    );
    let times = {};
    for (let i in layers) {
      if (layers[i].querySelector('Dimension') !== null) {
        if (layers[i].querySelector('Dimension').innerText.includes('/P')) {
          // START-END-PERIOD
          const [startDate, endDate, period] = layers[i]
            .querySelector('Dimension')
            .innerText.replace(/\s/g, '')
            .split('/');
          times[layers[i].querySelector('Name').innerText] = {
            period: period,
            start: startDate,
            end: endDate,
          };
        } else {
          // DATES ARRAY
          times[layers[i].querySelector('Name').innerText] = {
            array: layers[i].querySelector('Dimension').innerText.split(','),
          };
        }
      } else {
        times[layers[i].querySelector('Name').innerText] = {
          dimension: false,
        };
      }
    }
    return times;
  }

  parseTimeWMTS(xml) {
    let layers = Array.from(xml.querySelectorAll('Layer')).filter(
      (v) => v.querySelectorAll('Layer').length === 0,
    );
    let times = {};
    for (let i in layers) {
      if (layers[i].querySelector('Dimension') !== null) {
        if (
          this.parseCapabilities(layers[i], 'value')[0].innerText.includes('/P')
        ) {
          // START-END-PERIOD
          const [startDate, endDate, period] = layers[i]
            .querySelector('Dimension')
            .innerText.replace(/\s/g, '')
            .split('/');
          times[this.parseCapabilities(layers[i], 'ows:title')[0].innerText] = {
            period: period,
            start: startDate,
            end: endDate,
          };
        } else {
          // DATES ARRAY
          let array = [];
          Array.from(this.parseCapabilities(layers[i], 'value')).forEach(
            function (item) {
              array.push(item.innerText.replace(/\s/g, ''));
            },
          );
          times[this.parseCapabilities(layers[i], 'ows:title')[0].innerText] = {
            array: array,
          };
        }
      } else {
        times[this.parseCapabilities(layers[i], 'ows:title')[0].innerText] = {
          dimension: false,
        };
      }
    }
    return times;
  }

  parseCapabilities(xml, tag) {
    return xml.getElementsByTagName(tag);
  }

  parserPeriod(iso8601Duration) {
    var iso8601DurationRegex = /(-)?P(?:([.,\d]+)Y)?(?:([.,\d]+)M)?(?:([.,\d]+)W)?(?:([.,\d]+)D)?T?(?:([.,\d]+)H)?(?:([.,\d]+)M)?(?:([.,\d]+)S)?/;
    var matches = iso8601Duration.match(iso8601DurationRegex);
    return {
      sign: matches[1] === undefined ? '+' : '-',
      years: parseInt(matches[2] === undefined ? 0 : matches[2]),
      months: parseInt(matches[3] === undefined ? 0 : matches[3]),
      weeks: parseInt(matches[4] === undefined ? 0 : matches[4]),
      days: parseInt(matches[5] === undefined ? 0 : matches[5]),
      hours: parseInt(matches[6] === undefined ? 0 : matches[6]),
      minutes: parseInt(matches[7] === undefined ? 0 : matches[7]),
      seconds: parseFloat(matches[8] === undefined ? 0 : matches[8]),
    };
  } // parserPeriod

  /**
   * This method is executed after the rener method is executed
   */
  async componentDidMount() {
    await this.loader();
    this.TimesliderWidget = new TimeSlider({
      view: this.props.view,
      container: document.querySelector('.timeslider-panel'),
      timeVisible: true,
      mode: /*this.props.download ? 'time-window' : 'instant'*/ 'time-window',
      loop: false,
      labelFormatFunction: (value, type, element, layout) => {
        if (!this.TimesliderWidget.fullTimeExtent) {
          element.innerText = 'loading...';
          return;
        }
        if (value) {
          const normal = new Intl.DateTimeFormat('en-gb');
          switch (type) {
            case 'min':
              if (this.state.timeSelectedValuesC == null)
                // In case of first iteration
                this.state.timeSelectedValuesC[0] = value;
              element.innerText = normal.format(value).replaceAll('/', '.');
              break;
            case 'max':
              if (this.state.timeSelectedValuesC == null)
                // In case of first iteration
                this.state.timeSelectedValuesC[1] = value;
              element.innerText = normal.format(value).replaceAll('/', '.');
              break;
            case 'extent':
              this.state.timeSelectedValues = value;
              if (
                normal
                  .format(this.state.timeSelectedValues[0])
                  .replaceAll('/', '.') !==
                normal
                  .format(this.state.timeSelectedValuesC[0])
                  .replaceAll('/', '.')
              ) {
                this.state.timeSelectedValuesC[0] = value[0];
                element.innerText = normal
                  .format(value[0])
                  .replaceAll('/', '.');
              } else if (
                normal
                  .format(this.state.timeSelectedValues[1])
                  .replaceAll('/', '.') !==
                normal
                  .format(this.state.timeSelectedValuesC[1])
                  .replaceAll('/', '.')
              ) {
                this.state.timeSelectedValuesC[1] = value[1];
                element.innerText = normal
                  .format(value[1])
                  .replaceAll('/', '.');
              }
              break;
            default:
              element.innerText = normal.format(value).replaceAll('/', '.');
              break;
          }
        }
      },
      values: this.props.time.start
        ? /*this.props.download
          ? [new Date(this.props.time.start), new Date(this.props.time.end)]
          : [new Date(this.props.time.start)]*/
          [new Date(this.props.time.start), new Date(this.props.time.end)]
        : null,
    });
    this.props.view.ui.add(this.container.current, 'bottom-right');
    this.container.current.insertAdjacentHTML(
      'beforeend',
      '<div class="esri-icon-close" id="timeslider_close" role="button"></div>',
    );
    this.container.current.style.display = 'block';

    document
      .querySelector('#timeslider_close')
      .addEventListener('click', () => {
        this.props.time.elem.querySelector('.active-layer-time').click();
      });

    this.props.view
      .whenLayerView(this.layer, this.TimesliderWidget)
      .then((lv) => {
        if (this.layer.type === 'feature') {
          this.TimesliderWidget.fullTimeExtent = this.layer.timeInfo.fullTimeExtent;
          this.TimesliderWidget.stops = {
            interval: this.layer.timeInfo.interval,
          };
          this.TimesliderWidget.watch('timeExtent', (timeExtent) => {
            if (!this.container.current ? true : false) {
              this.TimesliderWidget.stop();
            }
            let start = new Date(timeExtent.start).getTime();
            let end = new Date(timeExtent.end).getTime();
            this.props.time.elem.setAttribute('time-start', start);
            this.props.time.elem.setAttribute('time-end', end);
            if (this.props.download) {
              this.props.time.dataset.setAttribute('time-start', start);
              this.props.time.dataset.setAttribute('time-end', end);
            }
            /*this.props.time.dataset.setAttribute('time-start', start);
            this.props.time.dataset.setAttribute('time-end', end);*/
          });
        } else {
          let serviceType = '';
          if (this.layer.type === 'wms') {
            serviceType = 'wms';
          } else if (this.layer.type === 'wmts') {
            serviceType = 'wmts';
          }

          this.getCapabilities(this.layer.url, serviceType).then((xml) => {
            let times = {};
            if (this.layer.type === 'wms') {
              times = this.parseTimeWMS(xml);
            } else if (this.layer.type === 'wmts') {
              times = this.parseTimeWMTS(xml);
            }
            // Capabilities have time enabled
            if (times[this.layerName].hasOwnProperty('dimension') === false) {
              // Start-End-Period
              if (times[this.layerName].hasOwnProperty('period')) {
                this.TimesliderWidget.fullTimeExtent = new TimeExtent({
                  start: new Date(times[this.layerName].start),
                  end: new Date(times[this.layerName].end),
                });

                const period = this.parserPeriod(times[this.layerName].period);

                this.TimesliderWidget.stops = {
                  interval: {
                    value:
                      period.years * 365 * 24 * 60 +
                      period.months * 31 * 24 * 60 +
                      period.weeks * 7 * 24 * 60 +
                      period.days * 24 * 60 +
                      period.hours * 60 +
                      period.minutes +
                      period.seconds / 60,
                    unit: 'minutes',
                  },
                };
              } else if (times[this.layerName].hasOwnProperty('array')) {
                // Dates array
                this.TimesliderWidget.fullTimeExtent = new TimeExtent({
                  start: new Date(times[this.layerName].array[0]),
                  end: new Date(
                    times[this.layerName].array[
                      times[this.layerName].array.length - 1
                    ],
                  ),
                });
                this.TimesliderWidget.stops = {
                  dates: times[this.layerName].array.map((e) => new Date(e)),
                };

                if (this.layer.type === 'wmts') {
                  this.layer.customParameters = {};
                  const time = times[this.layerName].array.map(
                    (d) => new Date(d),
                  );

                  for (let i in time) {
                    timeDict[time[i]] = times[this.layerName].array[i];
                  }
                }
              }
              this.TimesliderWidget.watch('timeExtent', (timeExtent) => {
                if (!this.container.current ? true : false) {
                  this.TimesliderWidget.stop();
                  console.log(this.TimesliderWidget.stop());
                }
                let start = new Date(timeExtent.start).getTime();
                let end = new Date(timeExtent.end).getTime();
                this.props.time.elem.setAttribute('time-start', start);
                this.props.time.elem.setAttribute('time-end', end);
                if (this.props.download) {
                  this.props.time.dataset.setAttribute('time-start', start);
                  this.props.time.dataset.setAttribute('time-end', end);
                }
                /*this.props.time.dataset.setAttribute('time-start', start);
                this.props.time.dataset.setAttribute('time-end', end);*/
                if (this.layer.type === 'wmts') {
                  this.layer.customParameters = {};
                  this.layer.customParameters['TIME'] =
                    timeDict[this.TimesliderWidget.timeExtent.end];
                  this.layer.refresh();
                }
              });
            } // if there is dimension time
            else {
              this.TimesliderWidget.disabled = true;
            }
          });
        } // is feature or WMS/WMTS
      });
  } //componentDidMount

  /**
   * Needed to get the desired drag-and-drop behavior
   * @param {*} e
   */
  onDragStart(e) {
    this.drag.frame = document.getElementById('slide_frame');
    this.drag.frame.style.visibility = 'visible';
    document.querySelector(
      '.esri-ui-bottom-right.esri-ui-corner',
    ).style.pointerEvents = 'auto';
    this.drag.x = e.screenX - e.currentTarget.getBoundingClientRect().left;
    this.drag.y = e.screenY - e.currentTarget.getBoundingClientRect().top;
  }

  onDragOver(e) {
    e.preventDefault();
  }

  onDrop(e) {
    let left =
      e.screenX -
      this.drag.x -
      e.currentTarget.getBoundingClientRect().left +
      'px';
    let top =
      e.screenY -
      this.drag.y -
      e.currentTarget.getBoundingClientRect().top +
      'px';
    this.setState({ styles: { left: left, top: top } });
    this.drag.frame.style.visibility = 'hidden';
    document.querySelector(
      '.esri-ui-bottom-right.esri-ui-corner',
    ).style.pointerEvents = '';
  }

  /**
   * This method renders the component
   * @returns jsx
   */
  render() {
    return (
      <>
        <div
          id="slide_frame"
          onDrop={(e) => this.onDrop(e)}
          onDragOver={(e) => this.onDragOver(e)}
        ></div>
        <div
          ref={this.container}
          className="timeslider-container"
          draggable="true"
          onDragStart={(e) => this.onDragStart(e)}
          style={this.state.styles}
        >
          <div className="timeslider-panel"></div>
        </div>
      </>
    );
  }
}

export default TimesliderWidget;
