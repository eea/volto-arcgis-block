import React, { createRef } from 'react';
import { loadModules } from 'esri-loader';
var MapView, SceneView, Zoom, Extent, Camera;

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
      'esri/Camera',
    ]).then(([_Map, _MapView, _SceneView, _Zoom, _Extent, _Camera]) => {
      [Map, MapView, SceneView, Zoom, Extent, Camera] = [
        _Map,
        _MapView,
        _SceneView,
        _Zoom,
        _Extent,
        _Camera,
      ];
    });
  }

  /**
   * This method is executed after the rener method is executed
   */
  async componentDidMount() {
    await this.loader();
    this.props.view.ui.add({
      component: this.container.current,
      position: 'top-right',
      // index: 0,
    });
  }

  async resetView() {
    if (this.props.mapViewer.view.type === '3d') {
      var myCamera = new Camera({
        position: {
          latitude: this.props.mapViewer.mapCfg.center[1],
          longitude: this.props.mapViewer.mapCfg.center[0],
          z: 250000000,
        },
        heading: 0,
        tilt: 0,
      });
      await this.props.mapViewer.sceneView.goTo({ target: myCamera });
    } else {
      await this.props.mapViewer.mapView.goTo({
        target: this.props.mapViewer.mapCfg.center,
        zoom: this.props.mapViewer.mapCfg.zoom,
        rotation: 0,
      });
    }
  }

  /**
   * This method renders the component
   * @returns jsx
   */
  render() {
    return (
      <>
        <div ref={this.container} className="resetView-container">
          {this.props.view.type === '3d' ? (
            <>
              <div tooltip="Reset view" direction="left" type="widget">
                <div
                  id="resetView_buttom-3d"
                  className="esri-icon-globe esri-widget--button"
                  role="button"
                  tabIndex="0"
                  onClick={this.resetView.bind(this)}
                  onKeyDown={this.resetView.bind(this)}
                ></div>
              </div>
            </>
          ) : (
            <>
              <div tooltip="Reset view" direction="left" type="widget">
                <div
                  id="resetView_buttom-2d"
                  className="esri-icon-maps esri-widget--button"
                  role="button"
                  tabIndex="0"
                  onClick={this.resetView.bind(this)}
                  onKeyDown={this.resetView.bind(this)}
                ></div>
              </div>
            </>
          )}
        </div>
      </>
    );
  }
}

export default ResetViewWidget;
