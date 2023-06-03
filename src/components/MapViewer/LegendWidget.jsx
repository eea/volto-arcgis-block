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
  }

  hideNutsLegend() {
    //debugger;
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

      if (element.hasChildNodes()) img = element.childNodes[0];
      else img = element;

      if (!(img.complete && img.naturalHeight !== 0)) {
        // If img src returns a broken link
        if (img?.src?.includes('all_present_lc_a_pol')) {
          //img.src =
          //  'https://clmsdemo.devel6cph.eea.europa.eu/en/products/lclcc-hot-spots/static-legends/dichotomous-reference-land-cover.png/@@images/image-283-df1c7b022cfd505c9bab4b4be08cd4f5.png';

          //prod
          img.src =
            'https://clms-prod.eea.europa.eu/en/products/lclcc-hot-spots/static-legends/dichotomous-reference-land-cover.png/@@images/image-800-8e5528b4247acef813af4b91d30a22d1.png';

          img.parentNode.parentNode.parentNode.parentNode.firstElementChild.style.display =
            'none';
          return;
        } else if (img?.src?.includes('all_present_lc_b_pol')) {
          //img.src =
          //  'https://clmsdemo.devel6cph.eea.europa.eu/en/products/lclcc-hot-spots/static-legends/modular-reference-land-cover.png/@@images/image-312-a552fdf4af5b831c1af6cd039ad9ae2b.png';

          //prod
          img.src =
            'https://clmsdemo.devel6cph.eea.europa.eu/en/products/lclcc-hot-spots/static-legends/modular-reference-land-cover.png/@@images/image-800-97f58b15239b2b3ea85d701e171eaf64.png';

          img.parentNode.parentNode.parentNode.parentNode.firstElementChild.style.display =
            'none';
        } else if (img?.src?.includes('all_lcc_a_pol')) {
          //img.src =
          //  'https://clmsdemo.devel6cph.eea.europa.eu/en/products/lclcc-hot-spots/static-legends/dichotomous-land-cover-change.png/@@images/image-324-83819bb107020e7fdab5764d199b000d.png';

          //prod
          img.src =
            'https://clms-prod.eea.europa.eu/en/products/lclcc-hot-spots/static-legends/dichotomous-land-cover-change.png/@@images/image-800-e77885afc5da8e0535f648b563e60408.png';

          img.parentNode.parentNode.parentNode.parentNode.firstElementChild.style.display =
            'none';
        } else if (img?.src?.includes('all_lcc_b_pol')) {
          //img.src =
          //  'https://clmsdemo.devel6cph.eea.europa.eu/en/products/lclcc-hot-spots/static-legends/modular-land-cover-change.png/@@images/image-314-30a9e6f64333da441b830fc31875c011.png';

          //prod
          img.src =
            'https://clms-prod.eea.europa.eu/en/products/lclcc-hot-spots/static-legends/modular-land-cover-change.png/@@images/image-800-7e36e74d09ddd7e3f94fb502f0b5be8e.png';

          img.parentNode.parentNode.parentNode.parentNode.firstElementChild.style.display =
            'none';
        } else if (img?.src?.includes('cop_klc')) {
          //img.src =
          //  'https://clmsdemo.devel6cph.eea.europa.eu/en/products/lclcc-hot-spots/static-legends/key-landscapes-for-conservation-borders.png/@@images/image-278-ebd9539bdc95d6a1028a01cd59efd680.png';

          //prod
          img.src =
            'https://clms-prod.eea.europa.eu/en/products/lclcc-hot-spots/static-legends/key-landscapes-for-conservation-borders.png/@@images/image-800-28ced0e8616b9a414ea5076399a5ba4e.png';

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
