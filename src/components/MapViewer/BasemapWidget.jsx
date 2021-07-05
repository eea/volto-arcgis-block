import React, { createRef } from 'react';
// import './ArcgisMap.css';
import { loadModules } from 'esri-loader';
var BasemapGallery;

class BasemapWidget extends React.Component {
  /**
   * Creator of the Basemap widget class
   * @param {*} props
   */
  constructor(props) {
    super(props);
    this.loader();
    //We create a reference to a DOM element to be mounted
    this.basemaps = createRef();
    //Initially, we set the state of the component to
    //not be showing the basemap panel
    this.state = { showMapMenu: false };
    this.menuClass =
    'esri-icon-basemap esri-widget--button esri-widget esri-interactive esri-icon-basemap';
  }

  async loader(){
    await loadModules(['esri/widgets/BasemapGallery']).then(([_BasemapGallery]) => {
        BasemapGallery = _BasemapGallery;
      });
  }

  /**
   * Method that will be invoked when the
   * button is clicked. It controls the open
   * and close actions of the component
   */
  openMenu() {
    if (this.state.showMapMenu) {
      this.basemapGallery.domNode.style.display = 'none';
      this.basemaps.current.classList.replace(
        'esri-icon-right-arrow',
        'esri-icon-basemap',
      );
      // By invoking the setState, we notify the state we want to reach
      // and ensure that the component is rendered again
      this.setState({ showMapMenu: false });
    } else {
      this.basemapGallery.domNode.classList.add('basemap-gallery-container');
      this.basemapGallery.domNode.style.display = 'block';
      this.basemaps.current.classList.replace(
        'esri-icon-basemap',
        'esri-icon-right-arrow',
      );
      // By invoking the setState, we notify the state we want to reach
      // and ensure that the component is rendered again
      this.setState({ showMapMenu: true });
    }
  }
  /**
   * This method is executed after the rener method is executed
   */
  componentDidMount() {
    this.basemapGallery = new BasemapGallery({
      view: this.props.view,
    });
    this.props.view.ui.add(this.basemaps.current, 'top-right');
    this.props.view.ui.add(this.basemapGallery, 'top-right');
  }
  /**
   * This method renders the component
   * @returns jsx
   */
  render() {
    return (
      <>
        <div
          ref={this.basemaps}
          className={this.menuClass}
          id="map_basemap_button"
          role="button"
          title="Basemap gallery"
          onClick={this.openMenu.bind(this)}
          onKeyDown={() => this.openMenu.bind(this)}
          tabIndex={0}
        ></div>
      </>
    );
    //</div>
  }
}

export default BasemapWidget;
