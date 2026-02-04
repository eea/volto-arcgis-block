import React, { createRef } from 'react';
//import "@arcgis/core/assets/esri/css/main.css";
//import "./css/ArcgisMap.css";
import { loadModules } from 'esri-loader';
var Search;

class SearchWidget extends React.Component {
  /**
   * Creator of the Measurement widget class
   * @param {*} props
   */
  constructor(props) {
    super(props);
    //We create a reference to a DOM element to be mounted
    this.container = createRef();
    //Initially, we set the state of the component to
    //not be showing the basemap panel
    this.state = { showMapMenu: false };
  }

  loader() {
    return loadModules(['esri/widgets/Search']).then(([_Search]) => {
      Search = _Search;
    });
  }

  /**
   * This method is executed after the rener method is executed
   */
  async componentDidMount() {
    await this.loader();
    if (!this.container.current) return;
    this.props.view.when(() => {
      this.props.view.ui.add(this.container.current, 'top-left');
      this.search = new Search({
        view: this.props.view,
        locationEnabled: false,
      });
      this.props.view.ui.add(this.search);
    });
  }

  /**
   * This method renders the component
   * @returns jsx
   */
  render() {
    return (
      <>
        <div ref={this.container} className="search-container"></div>
      </>
    );
  }
}

export default SearchWidget;
