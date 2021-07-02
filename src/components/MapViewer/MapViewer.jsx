import React, { createRef } from 'react';
import './ArcgisMap.css';
import classNames from 'classnames';
import BasemapWidget from './BasemapWidget';
import { loadModules, loadCss } from 'esri-loader';
const [Map, MapView, Zoom] = await loadModules([
  'esri/WebMap',
  'esri/views/MapView',
  'esri/widgets/Zoom'
]);

class MapViewer extends React.Component {
  /**
   * This method does the creation of the main component
   * @param {*} props
   */
  constructor(props) {
    super(props);
    //we create a reference to the DOM element that will
    //be later mounted. We will use the reference that we
    //create here to reference the DOM element from javascript
    //code, for example, to create later a MapView component
    //that will use the map div to show the map
    this.mapdiv = createRef();
    this.mapCfg = props.cfg.Map;
    this.map = null;
    this.id = props.id;
    this.mapClass = classNames('map-container', {
      [`${props.customClass}`]: props.customClass || null,
    });
  }

  /**
   * Once the component has been mounted in the screen, this method
   * will be executed, so we can access to the DOM elements, since
   * they are already mounted
   */
  componentDidMount() {
    loadCss();

    // this.mapdiv.current is the reference to the current DOM element of
    // this.mapdiv after it was mounted by the render() method
    this.map = new Map({
      basemap: 'topo-vector',
    });
    this.view = new MapView({
      container: this.mapdiv.current,
      map: this.map,
      center: this.mapCfg.center,
      zoom: this.mapCfg.zoom,
      ui: {
        components: ['attribution'],
      },
    });
    this.zoom = new Zoom({
      view: this.view,
    });
    this.view.ui.add(this.zoom, {
      position: 'top-right',
    });

    //Once we have created the MapView, we need to ensure that the map div
    //is refreshed in order to show the map on it. To do so, we need to
    //trigger the renderization again, and to trigger the renderization
    //we invoke the setState method, that changes the state and forces a
    //react component to render itself again
    this.setState({});
  }

  /**
   * This method evaluates the ability to render the basemaps widget and
   * returns the jsx allowing such a render (if conditions are ok)
   * @returns jsx
   */
  renderBasemap() {
    if (this.view) return <BasemapWidget view={this.view} />;
  }

  /**
   * This method renders the map viewer, invoking if necessary the methods
   * to render the other widgets to display
   * @returns jsx
   */
  render() {
    // we use a reference (ref={this.mapdiv}) in order to reference a
    // DOM element to be mounted (but not yet mounted)
    return (
      <div className={this.mapClass} id={this.id}>
        <div ref={this.mapdiv} className="map">
          {this.renderBasemap()}
        </div>
      </div>
    );
  }
}

export default MapViewer;
