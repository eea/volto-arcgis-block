import React, { createRef } from 'react';
import { loadModules } from 'esri-loader';

class ErrorReport extends React.Component {
  constructor(props) {
    super(props);
    this.container = createRef();
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
          '. Active datasets: ' +
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
          selecting: false,
          datasets: ds,
          instructionsText:
            "The error report data has been added to your clipboard. Click the 'Service Desk' button and paste the clipboard content inside the Helpdesk's message box",
        });
        handler.remove();
      }.bind(this),
    );
    this.setState({ selecting: handler });
  }

  getCheckedDatasets() {
    let checked = [];
    try {
      let uid = sessionStorage.getItem('mv_hydrated_for');
      let key = uid ? 'user_' + uid : 'user_anonymous';
      let raw = localStorage.getItem(key);
      if (raw) {
        let obj = JSON.parse(raw);
        let cl = obj && obj.checkedLayers;
        if (typeof cl === 'string') {
          try {
            cl = JSON.parse(cl);
          } catch {}
        }
        if (Array.isArray(cl)) {
          checked = [...new Set(cl)].filter((v) => v);
        }
      }
    } catch {}
    if (!checked.length) {
      try {
        let ss = sessionStorage.getItem('checkedLayers');
        if (ss) {
          let cl = ss;
          if (typeof ss === 'string') {
            try {
              cl = JSON.parse(ss);
            } catch {}
          }
          if (Array.isArray(cl)) {
            checked = [...new Set(cl)].filter((v) => v);
          }
        }
      } catch {}
    }
    if (checked.length) {
      let titles = [];
      try {
        let esc = function (s) {
          try {
            return CSS && CSS.escape
              ? CSS.escape(s)
              : String(s).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
          } catch {
            return String(s).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
          }
        };
        let findTitleFor = function (val) {
          let v = String(val);
          let e = null;
          try {
            e = document.querySelector('[data-layer-id="' + esc(v) + '"]');
          } catch {}
          if (!e) {
            try {
              e = document.querySelector('[data-id="' + esc(v) + '"]');
            } catch {}
          }
          if (!e) {
            try {
              let sel1 = 'input[type="checkbox"][value="' + esc(v) + '"]';
              e = document.querySelector(sel1);
            } catch {}
          }
          if (!e) {
            try {
              let sel2 = 'input[type="checkbox"][id*="' + esc(v) + '"]';
              e = document.querySelector(sel2);
            } catch {}
          }
          if (e && e.tagName && e.tagName.toLowerCase() === 'input') {
            let id = e.id;
            if (id) {
              try {
                let selLab = 'label[for="' + esc(id) + '"]';
                let lab = document.querySelector(selLab);
                if (lab && lab.textContent) return lab.textContent.trim();
              } catch {}
            }
            try {
              let cont = e.closest('.toc-item,.ccl-tree__item,.layer-item');
              if (cont) {
                let selT =
                  '.toc-item-title,.ccl-tree__label,.layer-title,.title';

                let lab = cont.querySelector(selT);
                if (lab && lab.textContent) return lab.textContent.trim();
              }
            } catch {}
          }
          if (e) {
            try {
              let sel3 = '.toc-item-title,.ccl-tree__label,.layer-title,.title';
              let lab = e.querySelector(sel3);
              if (lab && lab.textContent) return lab.textContent.trim();
            } catch {}
            try {
              let t = e.getAttribute('data-title');
              if (t) return t;
            } catch {}
            try {
              if (e.textContent) return e.textContent.trim();
            } catch {}
          }
          return null;
        };
        checked.forEach(function (v) {
          let t = findTitleFor(v);
          if (t) titles.push(t);
        });
      } catch {}
      if (titles.length) return [...new Set(titles)];
      let all = [];
      try {
        let coll =
          this.props.view &&
          this.props.view.map &&
          this.props.view.map.allLayers;
        if (coll && coll.items) {
          all = coll.items;
        } else if (coll && coll.toArray) {
          all = coll.toArray();
        }
      } catch {}
      let byId = {};
      let byTitle = {};
      try {
        all.forEach(function (l) {
          if (l && l.id) byId[l.id] = l.title || l.id;
          if (l && l.title) byTitle[l.title] = l.title;
        });
      } catch {}
      let titles2 = [];
      checked.forEach(function (v) {
        if (byTitle[v]) titles2.push(byTitle[v]);
        else if (byId[v]) titles2.push(byId[v]);
      });
      if (titles2.length) return [...new Set(titles2)];
    }
    let layers = [];
    this.props.view.map.layers.forEach(function (l) {
      if (l.visible) {
        layers.push(l.title || l.id || 'layer');
      }
    });
    return layers;
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
      '. Active datasets: ' +
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
                      Active datasets
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
