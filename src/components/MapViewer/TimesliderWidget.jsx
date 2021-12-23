import React, { createRef } from 'react';
import { loadModules } from 'esri-loader';
var TimeSlider;

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
    this.state = { showMapMenu: false };
    this.map = this.props.map;
    this.layer = this.props.layer;
  }

  loader() {
    return loadModules(['esri/widgets/TimeSlider']).then(([_TimeSlider]) => {
      [TimeSlider] = [_TimeSlider];
    });
  }

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
    this.container.current.style.display = 'block';

    this.props.view.whenLayerView(this.layer).then((lv) => {
      this.TimesliderWidget.fullTimeExtent = this.layer.timeInfo.fullTimeExtent;
      if (
        !this.layer.url.toLowerCase().includes('wms') &&
        !this.layer.url.toLowerCase().includes('wmts')
      ) {
        this.TimesliderWidget.stops = {
          interval: this.layer.timeInfo.interval,
        };
      }
    });

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
  }

  /**
   * This method renders the component
   * @returns jsx
   */
  render() {
    return (
      <>
        <div ref={this.container} className="timeslider-container">
          <div className="timeslider-panel"></div>
        </div>
      </>
    );
  }
}

export default TimesliderWidget;
