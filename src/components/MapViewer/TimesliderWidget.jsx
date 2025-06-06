import React, { createRef } from 'react';
import DatePicker from 'react-datepicker';
import { loadModules } from 'esri-loader';
import calendarSVG from '@plone/volto/icons/calendar.svg';
import { Icon } from '@plone/volto/components';
import 'react-datepicker/dist/react-datepicker.css';
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
      showDatePanel: false,
      lockDatePanel: true,
      showCalendar:
        this.props.fromDownload && !this.props.hideCalendar ? true : false,
      dateStart: this.props.time.start ? new Date(this.props.time.start) : null,
      dateEnd: this.props.time.end ? new Date(this.props.time.end) : null,
      periodicity: null,
      inputStart: this.props.time.start
        ? new Date(this.props.time.start)
        : null,
      inputEnd: this.props.time.end ? new Date(this.props.time.end) : null,
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
    if (
      this.props.fromDownload &&
      document.querySelector('.drawRectanglePopup-block')
    ) {
      document.querySelector('.drawRectanglePopup-block').style.display =
        'none';
    }
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
    let dimension = '';
    for (let i in layers) {
      if (layers[i].querySelector('Dimension') !== null) {
        // Layer has their own time dimension
        dimension = layers[i].querySelector('Dimension').innerText;
      } else {
        if (xml.querySelector('Dimension') !== null) {
          // There is a common time dimension to all layers
          dimension = xml.querySelector('Dimension').querySelector('Extent')
            .innerText;
        } else {
          dimension = false;
        }
      }

      if (dimension) {
        if (dimension.includes('/P')) {
          // START-END-PERIOD dimension format
          const [startDate, endDate, period] = dimension
            .replace(/\s/g, '')
            .split('/');
          times[layers[i].querySelector('Name').innerText] = {
            period: period,
            start: startDate,
            end: endDate,
          };
        } else {
          // DATES ARRAY dimension format
          times[layers[i].querySelector('Name').innerText] = {
            array: dimension.split(','),
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
    let playRateValue =
      this.layer.ProductId === '8474c3b080fa42cc837f1d2338fcf096' ? 4000 : 1000;
    if (!this.container.current) return;
    this.props.view.when(() => {
      this.TimesliderWidget = new TimeSlider({
        view: this.props.view,
        container: document.querySelector('.timeslider-panel'),
        timeVisible: true,
        mode: 'instant',
        playRate: playRateValue,
        loop: false,
        labelFormatFunction: (value, type, element, layout) => {
          if (!this.TimesliderWidget.fullTimeExtent) {
            element.innerText = 'Loading...';
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
            this.setState({
              lockDatePanel: false,
            });
          }
        },
      });
      this.props.view.ui.add(this.container.current, 'bottom-right');
      this.container.current.insertAdjacentHTML(
        'beforeend',
        '<div class="esri-icon-close" id="timeslider_close" role="button"></div>',
      );
      this.container.current.style.display = 'block';
      this.setState({ showDatePanel: true });

      document
        .querySelector('#timeslider_close')
        .addEventListener('click', () => {
          this.props.time.elem.querySelector('.active-layer-time').click();
          if (this.props.fromDownload) {
            if (this.props.download) {
              document.getElementById('download_label').click();
            } else {
              document.getElementById('products_label').click();
            }
          }
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
              /*let start = new Date(timeExtent.start).getTime();
            let end = new Date(timeExtent.end).getTime();
            this.props.time.elem.setAttribute('time-start', start);
            this.props.time.elem.setAttribute('time-end', end);
            if (this.props.download) {
              this.props.time.dataset.setAttribute('time-start', start);
              this.props.time.dataset.setAttribute('time-end', end);
            }
            this.props.time.dataset.setAttribute('time-start', start);
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
              let periodicity;
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

                  const period = this.parserPeriod(
                    times[this.layerName].period,
                  );

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

                  periodicity = times[this.layerName].period;
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
                    this.layer.customLayerParameters = {};
                    const time = times[this.layerName].array.map(
                      (d) => new Date(d),
                    );

                    for (let i in time) {
                      timeDict[time[i]] = times[this.layerName].array[i];
                    }
                  }

                  periodicity = Math.floor(
                    (Date.parse(times[this.layerName].array[1]) -
                      Date.parse(times[this.layerName].array[0])) /
                      86400000,
                  );
                  if (periodicity === 0) {
                    periodicity =
                      (new Date(times[this.layerName].array[1]).getHours() -
                        new Date(times[this.layerName].array[0]).getHours()) /
                      24;
                  }
                }

                this.setState({ periodicity: periodicity });
                if (this.TimesliderWidget.effectiveStops.length === 11) {
                  let period =
                    (this.TimesliderWidget.fullTimeExtent.end -
                      this.TimesliderWidget.fullTimeExtent.start) /
                    590000000;
                  if (period > this.TimesliderWidget.stops.interval.value) {
                    this.TimesliderWidget.stops = {
                      interval: {
                        value: period,
                        unit: 'minutes',
                      },
                    };
                  }
                }
                this.TimesliderWidget.watch('timeExtent', (timeExtent) => {
                  if (!this.container.current ? true : false) {
                    this.TimesliderWidget.stop();
                  }
                  /*let start = new Date(timeExtent.start).getTime();
                let end = new Date(timeExtent.end).getTime();
                this.props.time.elem.setAttribute('time-start', start);
                this.props.time.elem.setAttribute('time-end', end);
                if (this.props.download) {
                  this.props.time.dataset.setAttribute('time-start', start);
                  this.props.time.dataset.setAttribute('time-end', end);
                }
                this.props.time.dataset.setAttribute('time-start', start);
                this.props.time.dataset.setAttribute('time-end', end);*/
                  if (this.layer.type === 'wmts') {
                    this.layer.customLayerParameters = {};
                    this.layer.customLayerParameters['TIME'] =
                      timeDict[this.TimesliderWidget.timeExtent.end];
                  } else {
                    this.layer.customLayerParameters = {};
                    if (times[this.layerName].hasOwnProperty('array')) {
                      this.layer.customLayerParameters['TIME'] =
                        timeDict[this.TimesliderWidget.timeExtent.end];
                    } else {
                      const newDateTimeObject = new Date(
                        this.TimesliderWidget.timeExtent.start.toISOString(),
                      );
                      newDateTimeObject.setMinutes(
                        this.TimesliderWidget.timeExtent.start.getMinutes() +
                          this.TimesliderWidget.stops['interval'].value,
                      );
                      this.layer.customLayerParameters['TIME'] =
                        this.TimesliderWidget.timeExtent.start.toISOString() +
                        '/' +
                        newDateTimeObject.toISOString(); //OK
                    }
                  }
                  this.layer.refresh();
                });
              } // if there is dimension time
              else {
                this.TimesliderWidget.disabled = true;
              }
            });
          } // is feature or WMS/WMTS
        });
    });
  } //componentDidMount

  getPeriodicity() {
    let period = this.state.periodicity;
    if (period === 1 / 24 || period === 'PT1H') {
      return 'hourly';
    } else if (period === 1 || period === 'P1D') {
      return 'daily';
    } else if (period === 7 || period === 'P7D' || period === 'P1W') {
      return 'weekly';
    } else if (period === 10 || period === 'P10D') {
      return '10-daily';
    } else if ((period >= 28 && period <= 31) || period === 'P1M') {
      return 'monthly';
    } else if (period === 365 || period === 366 || period === 'P1Y') {
      return 'yearly';
    } else {
      return 'not regular';
    }
  }

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
    this.drag.x = e.screenX - e.currentTarget.getBoundingClientRect().right;
    this.drag.y = e.screenY - e.currentTarget.getBoundingClientRect().bottom;
  }

  onDragOver(e) {
    e.preventDefault();
  }

  onDrop(e) {
    let right =
      this.drag.x -
      e.screenX +
      e.currentTarget.getBoundingClientRect().right +
      'px';
    let bottom =
      this.drag.y -
      e.screenY +
      e.currentTarget.getBoundingClientRect().bottom +
      'px';
    this.setState({ styles: { right: right, bottom: bottom } });
    this.drag.frame.style.visibility = 'hidden';
    document.querySelector(
      '.esri-ui-bottom-right.esri-ui-corner',
    ).style.pointerEvents = '';
  }

  showCalendar() {
    if (this.state.showCalendar) {
      this.setState({ showCalendar: false });
      if (
        document.querySelector('.drawRectanglePopup-block') &&
        !this.props.area
      ) {
        document.querySelector('.drawRectanglePopup-block').style.display =
          'block';
      }
    } else {
      this.setState({ showCalendar: true });
      if (document.querySelector('.drawRectanglePopup-block')) {
        document.querySelector('.drawRectanglePopup-block').style.display =
          'none';
      }
    }
  }

  applyDate() {
    let start = this.state.inputStart;
    start = start ? start : this.TimesliderWidget.fullTimeExtent.start;
    let end = this.state.inputEnd;
    end = end ? end : this.TimesliderWidget.fullTimeExtent.end;
    this.props.time.elem.setAttribute('time-start', new Date(start).getTime());
    this.props.time.elem.setAttribute('time-end', new Date(end).getTime());
    this.setState({
      dateStart: start,
      dateEnd: end,
    });
    this.showCalendar();
    if (this.props.download) {
      if (this.props.fromDownload) {
        this.props.time.elem.querySelector('.active-layer-time').click();
        document.getElementById('download_label').click();
      }
    } else {
      if (this.props.fromDownload) {
        this.props.time.elem.querySelector('.active-layer-time').click();
        document.getElementById('products_label').click();
        if (
          !this.props.mapViewer.activeWidget ||
          !this.props.mapViewer.activeWidget.container.current.classList.contains(
            'area-container',
          )
        ) {
          document.getElementById('map_area_button').click();
        }
      }
    }
  }

  handleInputChange(e, input) {
    if (input === 'date_start') {
      this.setState({ inputStart: this.formatDate(e) });
    } else if (input === 'date_end') {
      this.setState({ inputEnd: this.formatDate(e) });
    }
  }

  formatDate(date) {
    return new Date(date).toISOString().split('T')[0].toString();
  }

  setDatepick(date) {
    if (this.TimesliderWidget.fullTimeExtent.end < date) {
      date = this.TimesliderWidget.fullTimeExtent.end;
    }
    if (this.TimesliderWidget.fullTimeExtent.start > date) {
      date = this.TimesliderWidget.fullTimeExtent.start;
    }
    while (this.TimesliderWidget.timeExtent.end > date) {
      this.TimesliderWidget.previous();
    }
    while (this.TimesliderWidget.timeExtent.end < date) {
      this.TimesliderWidget.next();
    }
  }
  openCalendar() {
    if (
      document.querySelector('.datepicker').style.display === 'inline-block'
    ) {
      document.querySelector('.datepicker').style.display = 'none';
    } else {
      document.querySelector('.datepicker').style.display = 'inline-block';
    }
  }

  /**
   * This method renders the component
   * @returns jsx
   */
  render() {
    /* eslint-disable no-unused-vars */
    let inputStart;
    let inputEnd;
    let timeStart;
    let timeEnd;
    /* eslint-disable no-unused-vars */
    if (!this.state.lockDatePanel && this.state.showCalendar) {
      inputStart = this.formatDate(
        this.state.inputStart
          ? this.state.inputStart
          : this.TimesliderWidget.fullTimeExtent.start,
      );
      inputEnd = this.formatDate(
        this.state.inputEnd
          ? this.state.inputEnd
          : this.TimesliderWidget.fullTimeExtent.end,
      );
      timeStart = this.formatDate(this.TimesliderWidget.fullTimeExtent.start);
      timeEnd = this.formatDate(this.TimesliderWidget.fullTimeExtent.end);
    }
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
          <div className="datepicker">
            <DatePicker
              id="start_date"
              showIcon
              inline
              onChange={(date) => this.setDatepick(date)}
              openToDate={this.TimesliderWidget?.fullTimeExtent?.start}
              dateFormat="dd.MM.yyyy"
              dropdownMode="select"
              showMonthDropdown
              showYearDropdown
              minDate={this.TimesliderWidget?.fullTimeExtent?.start}
              maxDate={this.TimesliderWidget?.fullTimeExtent?.end}
              includeDates={
                this.state.periodicity < 30
                  ? this.TimesliderWidget?.stops?.dates
                  : null
              }
              disabledKeyboardNavigation
            ></DatePicker>
          </div>
          <div className="datetime-picker">
            <button
              className="calendar-button"
              onClick={() => this.openCalendar()}
              onKeyDown={() => this.openCalendar()}
            >
              <Icon name={calendarSVG} size={25} />
            </button>
          </div>
          <div className="timeslider-panel"></div>
        </div>
      </>
    );
  }
}

export default TimesliderWidget;
