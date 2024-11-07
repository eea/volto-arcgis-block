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
      loading: false,
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

  // Set event listener to all images in legend

  //  scanImages() {
  //    let img = {};
  //    const collection = document.getElementsByClassName('esri-legend__symbol');
  //    Array.prototype.forEach.call(collection, (element) => {
  //      if (element.hasChildNodes()) {
  //        for (let i = 0; i < element.childNodes.length; i++) {
  //          let child = element.childNodes[i];
  //          if (child.nodename === 'IMG') {
  //            img = child;
  //            break;
  //          }
  //        }
  //      } else img = element;
  //      if (!(img instanceof HTMLImageElement)) return;
  //
  //      img.onerror = () => this.setState({ loading: true });
  //    });
  //  }

  //  brokenLegendImagePatch() {
  //    let img = {};
  //    const collection = document.getElementsByClassName('esri-legend__symbol');
  //    if (collection.length === 0) return;
  //    Array.prototype.forEach.call(collection, (element, index) => {
  //      if (element.hasChildNodes()) {
  //        for (let i = 0; i < element.childNodes.length; i++) {
  //          let child = element.childNodes[i];
  //          if (child.nodeName === 'IMG') {
  //            img = child;
  //            //break;
  //          }
  //        }
  //      } else img = element;
  //      //if (!(img.complete && img.naturalHeight !== 0)) {
  //      // If img src returns a broken link
  //      let imgTitle = document.querySelector('div.esri-legend__layer-caption');
  //      let tag;
  //      let replacementText;
  //      if (img?.src?.includes('all_present_lc_a_pol')) {
  //        //img.src = this.props.hotspotData.all_present_lc[
  //        //  'all_present_lc_a_pol'
  //        //].FilterStaticImageLegend;
  //        tag = 'all_present_lc_a_pol';
  //        replacementText =
  //          'Dichotomous Present Land Cover in selected Hot Spots';
  //        if (imgTitle && imgTitle.textContent === tag) {
  //          imgTitle.textContent = replacementText;
  //        }
  //        //img.src = this.props.hotspotData.all_present_lc[
  //        //  'all_present_lc_b_pol'
  //        //].FilterStaticImageLegend;
  //      } else if (img?.src?.includes('all_present_lc_b_pol')) {
  //        tag = 'all_present_lc_b_pol';
  //        replacementText = 'Modular Present Land Cover in selected Hot Spots';
  //        if (imgTitle && imgTitle.textContent === tag) {
  //          imgTitle.textContent = replacementText;
  //        }
  //        //  img.parentNode.parentNode.parentNode.parentNode.firstElementChild.textContent =
  //        //  'Modular Present Land Cover in selected hot spots';
  //      } else if (img?.src?.includes('all_lcc_a_pol')) {
  //        //img.src = this.props.hotspotData.all_lcc[
  //        //  'all_lcc_a_pol'
  //        //].FilterStaticImageLegend;
  //        tag = 'all_lcc_a_pol';
  //        replacementText = 'Dichotomous Land Cover Change in selected Hot Spots';
  //        if (imgTitle && imgTitle.textContent === tag) {
  //          imgTitle.textContent = replacementText;
  //        }
  //      } else if (img?.src?.includes('all_lcc_b_pol')) {
  //        //img.src = this.props.hotspotData.all_lcc[
  //        //  'all_lcc_b_pol'
  //        //].FilterStaticImageLegend;
  //        tag = 'all_lcc_b_pol';
  //        replacementText = 'Modular Land Cover Change in selected Hot Spots';
  //        if (imgTitle && imgTitle.textContent === tag) {
  //          imgTitle.textContent = replacementText;
  //        }
  //      } else if (img?.src?.includes('cop_klc')) {
  //        //img.src = this.props.hotspotData.cop_klc[
  //        //  'cop_klc'
  //        //].FilterStaticImageLegend;
  //        tag = 'cop_klc';
  //        replacementText =
  //          'Key Landscapes for Conservation borders in selected Hot Spots';
  //        if (imgTitle && imgTitle.textContent === tag) {
  //          imgTitle.textContent = replacementText;
  //        }
  //      } else if (img?.src?.includes('protected_areas')) {
  //        //img.src = this.props.hotspotData.protected_areas[
  //        //  'protected_areas'
  //        //].FilterStaticImageLegend;
  //        tag = 'protected_areas';
  //        replacementText =
  //          'Protected Areas in Key Landscapes for Conservation borders in selected Hot Spots';
  //        if (imgTitle && imgTitle.textContent === tag) {
  //          imgTitle.textContent = replacementText;
  //        }
  //      } /*  else if (img.style) {
  //          img.parentNode.parentNode.parentNode.parentNode.firstElementChild.style.display =
  //          'none';
  //          img.style.display = 'none';
  //
  //          if (element.parentNode.querySelector('span')) return;
  //
  //          let span = document.createElement('span');
  //          span.innerHTML = 'No legend available';
  //          element.parentNode.appendChild(span);
  //        } */
  //      if (
  //        typeof img?.closest !== 'undefined' &&
  //        img?.closest('.esri-legend__service')?.firstElementChild?.nodeName ===
  //          'H3' &&
  //        img?.closest('.esri-legend__service')?.firstElementChild
  //          ?.textContent === 'WMS'
  //      ) {
  //        //img.closest('.esri-legend__service').firstElementChild.style.display =
  //        //  'none';
  //      }
  //      //}
  //      tag = '';
  //      replacementText = '';
  //    });
  //  }

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

  //  imageFixWithTimer() {
  //    this.setState({ loading: true });
  //    setTimeout(() => {
  //      //    this.brokenLegendImagePatch();
  //      if (this.props.download) {
  //        this.hideNutsLegend();
  //      }
  //      this.setState({ loading: false });
  //    }, 2000);
  //  }

  /**
   * This method is executed after the rener method is executed
   */
  async componentDidMount() {
    await this.loader();
    if (!this.container.current) return;
    this.props.view.when(() => {
      this.props.view.ui.add(this.container.current, 'top-right');
    });
    this.LegendWidget = new Legend({
      view: this.props.view,
      viewModel: new LegendViewModel({
        view: this.props.view,
      }),
      container: document.querySelector('.legend-panel'),
    });
    this.LegendWidget.when(() => {
      this.LegendWidget.activeLayerInfos.on('after-changes', (event) => {
        this.setState({ loading: true });
        //this.scanImages();
        //this.brokenLegendImagePatch();
      });
    });
  }

  /**
   * Method that returns true or false if session storage has any visible active layer
   */
  enabledVisilelayers() {
    let enabledVisilelayers = false;
    let visiblelayersFromStorage = JSON.parse(sessionStorage.visibleLayers);
    let visibleLayerKeys = Object.keys(visiblelayersFromStorage);
    for (let i = 0; i < visibleLayerKeys.length; i++) {
      let currentLayer = visibleLayerKeys[i];
      if (visiblelayersFromStorage[currentLayer][1] === 'eye')
        enabledVisilelayers = true;
    }
    return enabledVisilelayers;
  }

  /**
   * Method to handle "No legend" message visibility
   */
  handleNoLegendMessage() {
    const noLegendMessage = document.querySelectorAll(
      '.esri-legend__message',
    )[0];
    if (sessionStorage.checkedLayers && sessionStorage.checkedLayers === '[]') {
      // show no legend message
      if (noLegendMessage) {
        noLegendMessage.style.display = 'block';
      }
    } else if (
      sessionStorage.visibleLayers &&
      (this.enabledVisilelayers() || sessionStorage.visibleLayers === '{}')
    ) {
      // hide no legend message
      if (noLegendMessage) {
        noLegendMessage.style.display = 'none';
      }
    } else if (noLegendMessage) {
      if (
        sessionStorage.checkedLayers &&
        sessionStorage.checkedLayers === '[]'
      ) {
        noLegendMessage.style.display = 'block';
      } else if (sessionStorage.visibleLayers && !this.enabledVisilelayers()) {
        noLegendMessage.style.display = 'block';
      } else {
        noLegendMessage.style.display = 'none';
      }
    }
  }

  componentDidUpdate(prevState, prevProps) {
    if (prevState.loading !== this.state.loading) {
      if (this.state.loading === true) {
        setTimeout(() => {
          if (this.props.download) {
            this.hideNutsLegend();
          }
          //this.brokenLegendImagePatch();
          this.setState({ loading: false });
        }, 2000);
      }
      const collection = document.getElementsByClassName(
        'esri-legend__layer-caption',
      );

      Array.prototype.forEach.call(collection, (element) => {
        if (element?.innerText === 'LABEL3') {
          element.style.display = 'none';
        }
      });
      this.handleNoLegendMessage();
    }
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
              onKeyDown={(e) => {
                if (
                  !e.altKey &&
                  e.code !== 'Tab' &&
                  !e.ctrlKey &&
                  e.code !== 'Delete' &&
                  !e.shiftKey &&
                  !e.code.startsWith('F')
                ) {
                  this.openMenu(this);
                }
              }}
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
                onKeyDown={(e) => {
                  if (
                    !e.altKey &&
                    e.code !== 'Tab' &&
                    !e.ctrlKey &&
                    e.code !== 'Delete' &&
                    !e.shiftKey &&
                    !e.code.startsWith('F')
                  ) {
                    this.openMenu(this);
                  }
                }}
                tabIndex="0"
                role="button"
              ></span>
            </div>
            <div className="right-panel-content">
              <span
                className="loading"
                style={{ display: this.state.loading ? 'block' : 'none' }}
              >
                Loading...
              </span>
              <div
                className="legend-panel"
                style={{ display: this.state.loading ? 'none' : 'block' }}
              ></div>
            </div>
          </div>
        </div>
      </>
    );
  }
}

export default LegendWidget;
