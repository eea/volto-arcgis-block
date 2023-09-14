import React, { createRef } from 'react';
//import "@arcgis/core/assets/esri/css/main.css";
//import "./css/ArcgisMap.css";
import { loadModules } from 'esri-loader';
var Legend, LegendViewModel;

class LegendWidget extends React.Component {
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
    this.state = {
      showMapMenu: false,
    };
    this.mapViewer = this.props.mapViewer;
    this.menuClass =
      'esri-icon-legend esri-widget--button esri-widget esri-interactive';
    this.urls = this.props.urls;
  }

  hideNutsLegend() {
    const collection = document.getElementsByClassName('esri-legend__symbol');

    Array.prototype.forEach.call(collection, (element) => {
      let img = {};

      if (element.hasChildNodes()) img = element.childNodes[0];
      else img = element;

      //if img is type of svg
      if (img?.children?.[0]?.localName?.includes('svg') ?? false) {
        img.closest(
          '.esri-legend__service.esri-legend__group-layer',
        ).style.display = 'none';
        //img.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode.firstElementChild.style.display = 'none';
        //img.style.display = 'none';
      }
    });
  }

  brokenLegendImagePatch() {
    const collection = document.getElementsByClassName('esri-legend__symbol');
    Array.prototype.forEach.call(collection, (element) => {
      let img = {};
      const titles = document.getElementsByClassName('esri-legend__service-label');
      console.log("title: ", titles);

      if (element.hasChildNodes()) img = element.childNodes[0];
      else img = element;

      if (!(img.complete && img.naturalHeight !== 0)) {
        // If img src returns a broken link
        if (img?.src?.includes('all_present_lc_a_pol')) {
          img.src = this.urls.all_present_lc_a_pol;

          img.parentNode.parentNode.parentNode.parentNode.firstElementChild.textContent =
            'Dichotomous Present Land Cover hot spots globally';
          return;
        } else if (img?.src?.includes('all_present_lc_b_pol')) {
          //img.src ='none';
          const legends =document.getElementsByClassName('esri-legend__service');
          for (let i = 0; i < legends.length; i++) {
            const legend = legends[i];
            //find the legend that contains a broken img
            if (legend.querySelector('img')?.src?.includes('all_present_lc_b_pol')) {
              const img = legend.querySelector('img');
              //set this legend to display none
              if (!(img.complete && img.naturalHeight !== 0)) {
                legend.style.display = 'none';
              }
              break; // break out of the loop after the first match
            }
          }
          img.parentNode.parentNode.parentNode.parentNode.firstElementChild.textContent =
            'Modular Present Land Cover hot spots globally';
        } else if (img?.src?.includes('all_lcc_a_pol')) {
          img.src = this.urls.all_lcc_a_pol;

          img.parentNode.parentNode.parentNode.parentNode.firstElementChild.style.display =
            'none';
        } else if (img?.src?.includes('all_lcc_b_pol')) {
          img.src = this.urls.all_lcc_b_pol;

          img.parentNode.parentNode.parentNode.parentNode.firstElementChild.style.display =
            'none';
        } else if (img?.src?.includes('cop_klc')) {
          img.src = this.urls.cop_klc;

          img.parentNode.parentNode.parentNode.parentNode.firstElementChild.style.display =
            'none';
        } else if (img.style) {
          img.parentNode.parentNode.parentNode.parentNode.firstElementChild.style.display =
            'none';
          img.style.display = 'none';

          if (element.parentNode.querySelector('span')) return;

          let span = document.createElement('span');
          span.innerHTML = 'No legend available';
          element.parentNode.appendChild(span);
        }
      }
    });
  }

  loader() {
    return loadModules([
      'esri/widgets/Legend',
      'esri/widgets/Legend/LegendViewModel',
    ]).then(([_Legend, _LegendViewModel]) => {
      Legend = _Legend;
      LegendViewModel = _LegendViewModel;
    });
  }

  /**
   * Method that will be invoked when the
   * button is clicked. It controls the open
   * and close actions of the component
   */
  openMenu() {
    if (this.state.showMapMenu) {
      this.props.mapViewer.setActiveWidget();
      this.container.current.querySelector('.right-panel').style.display =
        'none';
      this.container.current
        .querySelector('.esri-widget--button')
        .classList.remove('active-widget');
      document
        .querySelector('.esri-ui-top-right.esri-ui-corner')
        .classList.remove('show-panel');
      // By invoking the setState, we notify the state we want to reach
      // and ensure that the component is rendered again
      this.setState({ showMapMenu: false });
    } else {
      this.props.mapViewer.setActiveWidget(this);
      this.container.current.querySelector('.right-panel').style.display =
        'flex';
      this.container.current
        .querySelector('.esri-widget--button')
        .classList.add('active-widget');
      document
        .querySelector('.esri-ui-top-right.esri-ui-corner')
        .classList.add('show-panel');
      // By invoking the setState, we notify the state we want to reach
      // and ensure that the component is rendered again
      this.setState({ showMapMenu: true });
    }
  }

  /**
   * This method is executed after the rener method is executed
   */
  async componentDidMount() {
    await this.loader();
    this.props.view.ui.add(this.container.current, 'top-right');
    this.LegendWidget = new Legend({
      view: this.props.view,
      viewModel: new LegendViewModel({
        view: this.props.view,
      }),
      container: document.querySelector('.legend-panel'),
    });
    this.props.view.allLayerViews.watch('length', () => {
      setTimeout(() => {
        this.brokenLegendImagePatch();
        if (this.props.download) {
          this.hideNutsLegend();
        }
      }, 1000);
    });
  }

  /**
   * This method renders the component
   * @returns jsx
   */
  render() {
    return (
      <>
        <div ref={this.container} className="legend-container">
          <div tooltip="Legend" direction="left" type="widget">
            <div
              className={this.menuClass}
              id="legend_button"
              aria-label="Legend"
              onClick={this.openMenu.bind(this)}
              onKeyDown={this.openMenu.bind(this)}
              tabIndex="0"
              role="button"
            ></div>
          </div>
          <div className="right-panel">
            <div className="right-panel-header">
              <span>Legend</span>
              <span
                className="map-menu-icon esri-icon-close"
                onClick={this.openMenu.bind(this)}
                onKeyDown={this.openMenu.bind(this)}
                tabIndex="0"
                role="button"
              ></span>
            </div>
            <div className="right-panel-content">
              <div className="legend-panel"></div>
            </div>
          </div>
        </div>
      </>
    );
  }
}

export default LegendWidget;
