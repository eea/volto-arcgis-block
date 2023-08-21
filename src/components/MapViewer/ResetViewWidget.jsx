import React, { createRef } from 'react';
import { loadModules } from 'esri-loader';
var Map, MapView, SceneView, Zoom, Extent;

class ResetViewWidget extends React.Component {
  /**
   * Creator of the Basemap widget class
   * @param {*} props
   */
  constructor(props) {
    super(props);
    //We create a reference to a DOM element to be mounted
    this.container = createRef();
    //Initially, we set the state of the component to
    //not be showing the basemap panel
    this.state = {};
    this.PIXELS_TO_PAN = 50;
    this.props.mapViewer.resetView_enabled = true;
  }


  loader() {
    return loadModules([
      'esri/WebMap',
      'esri/views/MapView',
      'esri/views/SceneView',
      'esri/widgets/Zoom',     
      'esri/geometry/Extent',
    ]).then(
      ([
        _Map,
        _MapView,
        _SceneView,
        _Zoom,        
        _Extent
      ]) => {
        [Map, MapView, SceneView, Zoom, Extent] = [
          _Map,
          _MapView,
          _SceneView,
          _Zoom,        
          _Extent
        ];
      },
    );
  }




  /**
   * This method is executed after the rener method is executed
   */
  async componentDidMount() {
    this.props.view.ui.add({
      component: this.container.current,
      position: 'top-right',
      // index: 0,
    });
  }  

  async resetView() {
    await this.props.mapViewer.view.goTo({
      center: this.props.mapViewer.mapCfg.center,
      zoom: this.props.mapViewer.mapCfg.zoom
    });
  }

  /**
   * This method renders the component
   * @returns jsx
   */
  render() {
    return (
      <>
        <div ref={this.container} className="resetView-container">
          <div>
            <div
              id="resetView_buttom"
              className="esri-icon-left-arrow-circled esri-widget--button"
              role="button"
              tabIndex="0"
              onClick={this.resetView.bind(this)}
              onKeyDown={this.resetView.bind(this)}
            ></div>
          </div>         
        </div>
      </>
    );
  }
}

export default ResetViewWidget;
