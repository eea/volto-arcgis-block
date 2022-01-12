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
    this.state = {
      showMapMenu: false,
      styles: { bottom: '0', right: '0' },
    };
    this.map = this.props.map;
    this.layer = this.props.layer;
    this.drag = {};
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
   * Needed to get the desired drag-and-drop behavior
   * @param {*} e
   */
  onDragStart(e) {
    this.drag.frame = document.getElementById('slide_frame');
    this.drag.frame.style.visibility = 'visible';
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
