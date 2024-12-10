import React, { createRef } from 'react';
//import "@arcgis/core/assets/esri/css/main.css";
//import "./css/ArcgisMap.css";
import { loadModules } from 'esri-loader';
var Print;

class PrintWidget extends React.Component {
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
    this.menuClass =
      'esri-icon-printer esri-widget--button esri-widget esri-interactive';
    this.titleMaxLength = 50;
    this.authorMaxLength = 60;
    this.textMaxLength = 180;
    this.sizeMax = 15000;
    this.dpiMax = 1200;
    this.scaleMax = 600000000;
  }

  loader() {
    return loadModules(['esri/widgets/Print']).then(([_Print]) => {
      Print = _Print;
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

  // waitForContainer(mapdiv) {
  //   while (mapdiv === null) {
  //     new Promise((resolve) => setTimeout(resolve, 100)); // wait for 100ms
  //   }
  //   return mapdiv;
  // }

  /**
   * This method is executed after the rener method is executed
   */
  async componentDidMount() {
    await this.loader();
    //this.waitForContainer(this.container.current);
    if (!this.container.current) return;
    this.props.view.when(() => {
      this.props.view.ui.add(this.container.current, 'top-right');
      this.print = new Print({
        view: this.props.view,
        container: this.container.current.querySelector('.print-panel'),
      });
    });
  }

  componentDidUpdate() {
    this.setLayoutConstraints();
    this.setMapOnlyConstraints();
  }

  /**
   * Sets constrictions on text inputs
   */
  setMapOnlyConstraints() {
    let mapOnly = document.querySelector("[data-tab-id='mapOnlyTab']");

    //If map only options are deployed, same restriction for all the text inputs
    var observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'aria-selected') {
          let currentExpand = mutation.target.getAttribute('aria-selected');
          if (currentExpand === 'true') {
            this.setTextFilters();
            let optSVGZ = document.querySelector("[value='svgz']");
            optSVGZ && optSVGZ.parentElement.removeChild(optSVGZ);
            /*let advanceOptions = document.querySelector(
              '.esri-print__advanced-options-button',
            );*/
            let fileName = document.querySelector(
              "[data-input-name='fileName']",
            );
            fileName.parentElement.setAttribute('style', 'display:none');
          } else {
            this.setLayoutConstraints();
          }
        }
      });
    });
    mapOnly && observer.observe(mapOnly, { attributes: true });
  }

  setLayoutConstraints() {
    this.setTextFilters();
    let advanceOptions = document.querySelector(
      '.esri-print__advanced-options-button',
    );
    let optSVGZ = document.querySelector("[value='svgz']");
    optSVGZ && optSVGZ.parentElement.removeChild(optSVGZ);

    //If advanced options are deployed, same restriction for all the text inputs
    var advancedFunction = (mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'aria-expanded') {
          let currentExpand = mutation.target.getAttribute('aria-expanded');
          if (currentExpand) {
            this.setTextFilters();
          }
        }
      });
    };
    var observer = new MutationObserver((m) => {
      advancedFunction(m);
    });
    advanceOptions && observer.observe(advanceOptions, { attributes: true });
  }

  noSpecialChars(elem) {
    let c = elem.selectionStart;
    let r = /[^a-z0-9 .]/gi;
    let v = elem.value;
    if (r.test(v)) {
      elem.value = v.replace(r, '');
      c--;
    }
    elem.setSelectionRange(c, c);
  }

  imposeMax(elem) {
    if (elem.value !== '') {
      if (parseInt(elem.value) < parseInt(elem.min)) {
        elem.value = elem.min;
      }
      if (parseInt(elem.value) > parseInt(elem.max)) {
        elem.value = elem.max;
      }
    } else {
      elem.value = elem.value.replace(/[^e+-,.]/gi, '');
    }
  }

  noSpecialNumbs(e) {
    var invalidChars = ['-', '+', 'e', ',', '.'];
    if (invalidChars.includes(e.key)) {
      e.preventDefault();
    }
  }

  setTextFilters() {
    let inputs = document.querySelectorAll('input.esri-print__input-text');
    inputs.forEach((input) => {
      if (input.type === 'text' && !input.oninput) {
        if (
          input.getAttribute('data-input-name') === 'title' ||
          input.getAttribute('data-input-name') === 'fileName'
        ) {
          input.setAttribute('maxlength', '' + this.titleMaxLength);
        } else if (input.getAttribute('data-input-name') === 'author') {
          input.setAttribute('maxlength', '' + this.authorMaxLength);
        } else {
          input.setAttribute('maxlength', '' + this.textMaxLength);
        }
        input.oninput = () => {
          this.noSpecialChars(input);
        };
      } else if (input.type === 'number' && !input.oninput) {
        if (
          input.getAttribute('data-input-name') === 'width' ||
          input.getAttribute('data-input-name') === 'height'
        ) {
          input.setAttribute('max', '' + this.sizeMax);
        } else if (input.getAttribute('data-input-name') === 'dpi') {
          input.setAttribute('max', '' + this.dpiMax);
        } else if (input.getAttribute('data-input-name') === 'scale') {
          input.setAttribute('max', '' + this.scaleMax);
        }
        input.oninput = () => {
          this.imposeMax(input);
        };
        input.onkeydown = (e) => {
          this.noSpecialNumbs(e);
        };
      }
    });
  }

  /**
   * This method renders the component
   * @returns jsx
   */
  render() {
    return (
      <>
        <div ref={this.container} className="print-container">
          <div tooltip="Print" direction="left" type="widget">
            <div
              className={this.menuClass}
              id="map_print_button"
              aria-label="Print"
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
              <span>Print</span>
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
              <div className="print-panel"></div>
            </div>
          </div>
        </div>
      </>
    );
  }
}

export default PrintWidget;
