import React, { createRef } from 'react';
//import "@arcgis/core/assets/esri/css/main.css";
//import "./css/ArcgisMap.css";
import { loadModules } from 'esri-loader';
var Legend;

class LegendWidget extends React.Component {
  /**
   * Creator of the Basemap widget class
   * @param {*} props
   */
  constructor(props) {
    super(props);
    this.view = props.view;
    this.mapViewer = props.mapViewer;
    this.container = createRef();
    this.menuClass =
      'esri-icon-legend esri-widget--button esri-widget esri-interactive';
  }

  loader() {
    return loadModules(['esri/widgets/Legend']).then(([_Legend]) => {
      Legend = _Legend;
    });
  }

  /**
   * Method that will be invoked when the
   * button is clicked. It controls the open
   * and close actions of the component
   */
  openMenu() {
    if (this.mapViewer.state.showMapMenu) {
      this.container.current.querySelector('.legend-panel').style.display =
        'none';
      this.container.current
        .querySelector('.esri-widget--button')
        .classList.replace('esri-icon-right-arrow', 'esri-icon-legend');
      // By invoking the setState, we notify the state we want to reach
      // and ensure that the component is rendered again
      this.mapViewer.setState({ showMapMenu: false });
    } else {
      this.container.current
        .querySelector('.esri-widget--button')
        .classList.replace('esri-icon-legend', 'esri-icon-right-arrow');
      this.container.current.querySelector('.legend-panel').style.display =
        'block';

      this.container.current.children[1].querySelector(
        '.esri-legend__service-label',
      ).textContent = 'Use Cases Legend';

      try {
        this.container.current.children[1]
          .querySelector('.esri-legend__layer-caption')
          .remove();
      } catch {}
      let legendCells = this.container.current.children[1].querySelectorAll(
        '.esri-legend__layer-cell--info',
      );

      for (let i = 0; i < legendCells.length; i++) {
        let currentValue = legendCells[i].textContent;
        switch (currentValue.toLowerCase()) {
          case 'eu':
            legendCells[i].textContent = 'EU27+UK';
            break;
          case 'eea':
            legendCells[i].textContent = 'EEA 38';
            break;
          case 'others':
            legendCells[i].textContent = 'Country';
            break;
          default:
            break;
        }
      }
      // By invoking the setState, we notify the state we want to reach
      // and ensure that the component is rendered again
      this.mapViewer.setState({ showMapMenu: true });
    }
  }
  /**
   * This method is executed after the rener method is executed
   */
  async componentDidMount() {
    await this.loader();
    this.view.ui.add(this.container.current, 'top-right');
    this.LegendWidget = new Legend({
      view: this.view,
      container: document.querySelector('.legend-panel'),
    });
  }
  /**
   * This method renders the component
   * @returns jsx
   */
  render() {
    return (
      <>
        <div
          hidden={this.mapViewer.state.useCaseLevel === 1}
          ref={this.container}
          className="legend-container"
        >
          <div
            className={this.menuClass}
            id="legend_button"
            title="Legend"
            onClick={this.openMenu.bind(this)}
            onKeyDown={this.openMenu.bind(this)}
            tabIndex="0"
            role="button"
          ></div>
          <div className="legend-panel"></div>
        </div>
      </>
    );
  }
}

export default LegendWidget;
