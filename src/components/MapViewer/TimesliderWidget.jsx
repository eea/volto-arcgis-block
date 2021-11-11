import React, { createRef } from 'react';
import { loadModules } from 'esri-loader';
var TimeSlider, WMSLayer;

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
    return loadModules([
      'esri/widgets/TimeSlider',
      'esri/layers/WMSLayer',
    ]).then(([_TimeSlider, _WMSLayer]) => {
      [TimeSlider, WMSLayer] = [_TimeSlider, _WMSLayer];
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
    });
    this.props.view.ui.add(this.container.current, 'bottom-right');
    this.container.current.style.display = 'block';

    this.props.view.whenLayerView(this.layer).then((lv) => {
      this.TimesliderWidget.fullTimeExtent = this.layer.timeInfo.fullTimeExtent;
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
