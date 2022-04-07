import React, { createRef } from 'react';
import { loadModules } from 'esri-loader';
var TimeSlider;
var TimeExtent;
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
    return loadModules(['esri/widgets/TimeSlider', 'esri/TimeExtent']).then(
      ([_TimeSlider, _TimeExtent]) => {
        [TimeSlider] = [_TimeSlider];
        [TimeExtent] = [_TimeExtent];
      },
    );
  }

  xmlToJson(xml) {
    // Create the return object
    var obj = {};

    if (xml.nodeType === 1) {
      // element
      // do attributes
      if (xml.attributes.length > 0) {
        obj['@attributes'] = {};
        for (var j = 0; j < xml.attributes.length; j++) {
          var attribute = xml.attributes.item(j);
          obj['@attributes'][attribute.nodeName] = attribute.nodeValue;
        }
      }
    } else if (xml.nodeType === 3) {
      // text
      obj = xml.nodeValue;
    }

    // do children
    if (xml.hasChildNodes()) {
      for (var i = 0; i < xml.childNodes.length; i++) {
        var item = xml.childNodes.item(i);
        var nodeName = item.nodeName;
        if (typeof obj[nodeName] == 'undefined') {
          obj[nodeName] = this.xmlToJson(item);
        } else {
          if (typeof obj[nodeName].push == 'undefined') {
            var old = obj[nodeName];
            obj[nodeName] = [];
            obj[nodeName].push(old);
          }
          obj[nodeName].push(this.xmlToJson(item));
        }
      }
    }
    return obj;
  }

  getTime(esriLayer, layerName) {
    let getCapabilitiesUrl = '';

    if (esriLayer.type === 'wms') {
      // WMS
      getCapabilitiesUrl =
        esriLayer.url + '?request=GetCapabilities&service=WMS';
      return fetch(getCapabilitiesUrl)
        .then((response) => response.text())
        .then((str) => new window.DOMParser().parseFromString(str, 'text/xml'))
        .then((data) => {
          let cap = this.xmlToJson(data);
          let layers = cap.WMS_Capabilities.Capability.Layer.Layer;

          let layerMetadata = {};
          if (Array.isArray(layers)) {
            layerMetadata = layers.filter(
              (l) => l['Name']['#text'] === layerName,
            )[0];
          } else {
            layerMetadata = layers;
          }

          if (layerMetadata.hasOwnProperty('Dimension')) {
            const timeString = layerMetadata.Dimension['#text'];
            return this.parserTimeDimensionWMS(timeString);
          } else {
            return false;
          }
        });
    } else if (esriLayer.type === 'wmts') {
      // WMTS
      getCapabilitiesUrl =
        esriLayer.url + '?request=GetCapabilities&service=WMTS';

      return fetch(getCapabilitiesUrl)
        .then((response) => response.text())
        .then((str) => new window.DOMParser().parseFromString(str, 'text/xml'))
        .then((data) => {
          let cap = this.xmlToJson(data);
          let layers = cap.Capabilities.Contents.Layer;
          let layerMetadata = {};

          if (Array.isArray(layers)) {
            layerMetadata = layers.filter(
              (l) => l['ows:Identifier']['#text'] === layerName,
            )[0];
          } else {
            layerMetadata = layers;
          }
          if (layerMetadata.hasOwnProperty('Dimension')) {
            return this.parserTimeDimensionWMTileS(
              layerMetadata.Dimension.Value,
            );
          } else {
            return false;
          }
        });
    }
  } // getTime

  parserTimeDimensionWMS(timeString) {
    if (timeString.includes('/P')) {
      const [startDate, endDate, period] = timeString
        .replace(/\s/g, '')
        .split('/');
      return {
        start: startDate,
        end: endDate,
        period: period,
      };
    } else if (timeString.includes(',')) {
      const datesArray = timeString.replace(/\s/g, '').split(',');
      return { array: datesArray.map((e) => e) };
    }
  } // parserTimeDimensionWMS

  parserTimeDimensionWMTileS(timeString) {
    // [ TO CHECK ] cambiar timeString por un nombre de variable mas entendible
    if (timeString.includes('/P')) {
      const [startDate, endDate, period] = timeString
        .replace(/\s/g, '')
        .split('/');
      return {
        start: startDate,
        end: endDate,
        period: period,
      };
    } else if (Array.isArray(timeString)) {
      const datesArray = timeString.map((e) => e['#text'].replace(/\s/g, ''));
      return { array: datesArray };
    }
  } // parserTimeDimensionWMTS

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
      mode: this.props.download ? 'time-window' : 'instant',
      loop: false,
      values: this.props.time.start
        ? this.props.download
          ? [new Date(this.props.time.start), new Date(this.props.time.end)]
          : [new Date(this.props.time.start)]
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
          });
        } else {
          this.getTime(this.layer, this.layerName).then((v) => {
            // Capabilities have time enabled
            if (v !== false) {
              // Start-End-Period
              if (v.hasOwnProperty('period')) {
                this.TimesliderWidget.fullTimeExtent = new TimeExtent({
                  start: new Date(v.start),
                  end: new Date(v.end),
                });

                const period = this.parserPeriod(v.period);

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
              } else if (v.hasOwnProperty('array')) {
                // Dates array
                this.TimesliderWidget.fullTimeExtent = new TimeExtent({
                  start: new Date(v.array[0]),
                  end: new Date(v.array[v.array.length - 1]),
                });
                this.TimesliderWidget.stops = {
                  dates: v.array.map((e) => new Date(e)),
                };

                if (this.layer.type === 'wmts') {
                  this.layer.customParameters = {};
                  const time = v.array.map((d) => new Date(d));

                  for (let i in time) {
                    timeDict[time[i]] = v.array[i];
                  }
                }
              }
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
          }); // GetTime
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
