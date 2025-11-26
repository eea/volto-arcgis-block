import React, { createRef } from 'react';
import { loadModules } from 'esri-loader';

class ErrorReport extends React.Component {
  constructor(props) {
    super(props);
    this.container = createRef();
    this.originalParent = null;
    this.state = {
      showMapMenu: false,
      latlong: null,
      selecting: false,
      datasets: [],
      instructionsText: 'First select a pixel in the data viewer',
    };
    this.menuClass =
      'esri-icon-notice-round esri-widget--button esri-widget esri-interactive';
    this.helpdeskUrl = 'https://land.copernicus.eu/en/contact-service-helpdesk';
  }

  loader() {
    return loadModules([]).then(() => {});
  }

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
      this.setState({ showMapMenu: false });
      this.resetData();
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
      this.setState({ showMapMenu: true });
      this.startSelection();
    }
  }

  startSelection() {
    if (this.state.selecting) return;
    var handler = this.props.view.on(
      'pointer-down',
      function (evt) {
        let pt = this.props.view.toMap({ x: evt.x, y: evt.y });
        let ds = this.getCheckedDatasets();
        let message =
          'Selected coordinate: Lat ' +
          pt.latitude.toFixed(4) +
          ' Lon ' +
          pt.longitude.toFixed(4) +
          '. Active layers: ' +
          ds.join(', ');
        try {
          if (
            navigator &&
            navigator.clipboard &&
            navigator.clipboard.writeText
          ) {
            navigator.clipboard.writeText(message);
          } else {
            let ta = document.createElement('textarea');
            ta.value = message;
            ta.setAttribute('readonly', '');
            ta.style.position = 'absolute';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
          }
        } catch {}
        this.setState({
          latlong: { x: pt.latitude.toFixed(4), y: pt.longitude.toFixed(4) },
          datasets: ds,
          instructionsText:
            "The error report data has been added to your clipboard. Click the 'Service Desk' button and paste the clipboard content inside the Helpdesk's message box",
        });
      }.bind(this),
    );
    this.setState({ selecting: handler });
  }

  getLayerTitle(layer) {
    let title;
    if (layer.ViewService && layer.ViewService.toLowerCase().includes('cdse')) {
      title = layer.title;
    } else if (layer.url.toLowerCase().includes('wmts')) {
      title = layer._wmtsTitle;
    } else if (layer.url.toLowerCase().toLowerCase().endsWith('mapserver')) {
      title = layer.title;
    } else {
      if (layer.sublayers) {
        title = layer.sublayers.items[0].title;
      } else if (layer.activeLayer) {
        title = layer.activeLayer.title;
      } else {
        title = layer.title;
      }
    }
    return title;
  }

  getLayerName(layer) {
    let title;
    if (layer.sublayers) {
      title = layer.sublayers.items[0].name;
    } else if (layer.activeLayer) {
      title = layer.activeLayer.name;
    } else {
      title = layer.name;
    }
    return title;
  }

  getCheckedDatasets() {
    let items = [];
    try {
      let view = this.props.view;
      let coll = view && view.map && view.map.layers;
      if (coll && coll.items) {
        items = coll.items;
      } else if (coll && coll.toArray) {
        items = coll.toArray();
      }
    } catch {}
    let layers = items.filter((a) => a && a.visible && a.title !== 'nuts');
    let titles = [];
    layers.forEach((layer) => {
      let title;
      try {
        if (this && this.props && this.props.hotspotData) {
          let layerId = this.getLayerName(layer);
          outerLoop: for (let key in this.props.hotspotData) {
            let item = this.props.hotspotData[key];
            for (let prop in item) {
              if (prop === layerId) {
                if (this.props.hotspotData[key][prop].Title !== undefined) {
                  title = this.props.hotspotData[key][prop].Title;
                  break outerLoop;
                }
              }
            }
          }
        }
      } catch {}
      if (!title) {
        title = this.getLayerTitle(layer);
      }
      if (title) titles.push(title);
    });
    return [...new Set(titles)];
  }

  serviceDeskRedirect() {
    if (!this.state.latlong) return;
    let datasets =
      this.state.datasets && this.state.datasets.length > 0
        ? this.state.datasets
        : this.getCheckedDatasets();
    let message =
      'Selected coordinate: Lat ' +
      this.state.latlong.x +
      ' Lon ' +
      this.state.latlong.y +
      '. Active layers: ' +
      datasets.join(', ');
    try {
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(message);
      } else {
        let ta = document.createElement('textarea');
        ta.value = message;
        ta.setAttribute('readonly', '');
        ta.style.position = 'absolute';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
    } catch {}
    window.open(this.helpdeskUrl, '_blank');
  }

  resetData() {
    if (this.state.selecting) {
      this.state.selecting.remove();
    }
    this.setState({
      latlong: null,
      selecting: false,
      datasets: [],
      instructionsText: 'First select a pixel in the data viewer',
    });
  }

  async componentDidMount() {
    await this.loader();
    if (!this.container.current) return;
    try {
      this.originalParent = this.container.current.parentNode;
    } catch {}
    this.props.view.when(() => {
      if (!this.container.current) return;
      var group = document.querySelector('.esri-ui-top-right.esri-ui-corner');
      var addSelf = () => {
        this.props.view.ui.add(this.container.current, {
          position: 'top-right',
          // index: 9999,
        });
      };
      if (group && group.children && group.children.length > 0) {
        addSelf();
      } else if (group) {
        var observer = new MutationObserver((m) => {
          if (group.children.length > 0) {
            addSelf();
            observer.disconnect();
          }
        });
        observer.observe(group, { childList: true });
      } else {
        addSelf();
      }
    });
  }

  componentWillUnmount() {
    try {
      if (this.state && this.state.selecting) {
        this.state.selecting.remove();
      }
    } catch {}
    try {
      if (
        this.container &&
        this.container.current &&
        this.originalParent &&
        this.container.current.parentNode !== this.originalParent
      ) {
        this.originalParent.appendChild(this.container.current);
      }
    } catch {}
  }

  render() {
    return (
      <>
        <div ref={this.container} className="error-report-container">
          <div tooltip="Report an issue" direction="left" type="widget">
            <div
              className={this.menuClass}
              id="map_error_report_button"
              aria-label="Report an issue"
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
              <span>Report an issue</span>
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
              <div className="error-report-panel">
                <div className="error-report-instructions">
                  {this.state.instructionsText}
                </div>
                <button
                  className="error-report-button"
                  disabled={!this.state.latlong}
                  onClick={this.serviceDeskRedirect.bind(this)}
                >
                  Service desk
                </button>
                {this.state.latlong && (
                  <>
                    <h3 className="error-report-coords-heading">Coordinates</h3>
                    <div className="error-report-coords">
                      Lat {this.state.latlong.x} Lon {this.state.latlong.y}
                    </div>
                  </>
                )}
                {this.state.datasets && this.state.datasets.length > 0 && (
                  <>
                    <div className="error-report-datasets-title">
                      Active layers
                    </div>
                    <ul className="error-report-datasets">
                      {this.state.datasets.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
}

export default ErrorReport;
