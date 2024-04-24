import React, { createRef } from 'react';
//import "@arcgis/core/assets/esri/css/main.css";
//import "./css/ArcgisMap.css";
import { loadModules } from 'esri-loader';

export const BOOKMARK_SESSION_KEY = 'bookmark_session';

var Bookmarks;
class BookmarkWidget extends React.Component {
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
    this.map = this.props.map;
    this.layers = this.props.layers;
    this.userID = this.props.userID;
    this.menuClass =
      'esri-icon-bookmark esri-widget--button esri-widget esri-interactive';
    this.sessionBookmarks = [];
    this.sessionBookmarkLayers = [];
    this.sessionBookmarkOpacity = [];
    this.sessionBookmarkVisible = [];
    this.sessionBookmarkHotspot = [];
  }

  loader() {
    return loadModules(['esri/widgets/Bookmarks']).then(([_Bookmarks]) => {
      Bookmarks = _Bookmarks;
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

  limitMaxLenth() {
    if (
      document.querySelector('.esri-bookmarks__authoring-label .esri-input')
    ) {
      document.querySelector(
        '.esri-bookmarks__authoring-label .esri-input',
      ).maxLength = 150;
    }
  }

  async componentDidMount() {
    await this.loader();
    this.props.view.ui.add(this.container.current, 'top-right');
    if (this.userID != null) {
      this.sessionBookmarks =
        JSON.parse(
          localStorage.getItem(BOOKMARK_SESSION_KEY + '_' + this.userID),
        ) || [];
      this.sessionBookmarkLayers =
        JSON.parse(
          localStorage.getItem(
            BOOKMARK_SESSION_KEY + '_' + this.userID + '_layers',
          ),
        ) || [];
      while (this.sessionBookmarkLayers.length < this.sessionBookmarks.length) {
        this.sessionBookmarkLayers.push([]);
      }
      this.sessionBookmarkOpacity =
        JSON.parse(
          localStorage.getItem(
            BOOKMARK_SESSION_KEY + '_' + this.userID + '_opacity',
          ),
        ) || [];
      while (
        this.sessionBookmarkOpacity.length < this.sessionBookmarks.length
      ) {
        this.sessionBookmarkOpacity.push([]);
      }
      this.sessionBookmarkVisible =
        JSON.parse(
          localStorage.getItem(
            BOOKMARK_SESSION_KEY + '_' + this.userID + '_visible',
          ),
        ) || [];
      while (
        this.sessionBookmarkVisible.length < this.sessionBookmarks.length
      ) {
        this.sessionBookmarkVisible.push([]);
      }
      this.sessionBookmarkHotspot =
        JSON.parse(
          localStorage.getItem(
            BOOKMARK_SESSION_KEY + '_' + this.userID + '_hotspot',
          ),
        ) || [];
      while (
        this.sessionBookmarkHotspot.length < this.sessionBookmarks.length
      ) {
        this.sessionBookmarkHotspot.push([]);
      }
    }
    this.Bookmarks = new Bookmarks({
      view: this.props.view,
      // allows bookmarks to be added, edited, or deleted
      editingEnabled: true,
      visibleElements: {
        time: false, // don't show the time (h:m:s) next to the date
      },
      container: document.querySelector('.bookmark-panel'),
      bookmarks: this.sessionBookmarks,
    });
    this.sessionBookmarks = [];
    this.Bookmarks.bookmarks.items.forEach((bookmark) => {
      this.sessionBookmarks.push(bookmark);
    });
    this.Bookmarks.when(() => {
      this.Bookmarks.bookmarks.on('change', (e) => {
        if (e.added[0]) {
          let check = JSON.parse(sessionStorage.getItem('checkedLayers')) || [];
          let visibleLayers =
            JSON.parse(sessionStorage.getItem('visibleLayers')) || [];
          let opacity = [];
          let visible = [];
          check.forEach((layer) => {
            opacity.push(this.layers[layer].opacity);
            if (
              visibleLayers[layer] &&
              visibleLayers[layer][1] === 'eye-slash'
            ) {
              visible.push(false);
            } else {
              visible.push(true);
            }
          });
          this.sessionBookmarks.push(e.added[0]);
          this.sessionBookmarkLayers.push(check);
          this.sessionBookmarkOpacity.push(opacity);
          this.sessionBookmarkVisible.push(visible);
          let hotspotFilters = {
            activeLayers: {},
            filteredLayers: {},
          };
          if (this.props.hotspotData && this.props.hotspotData.activeLayers) {
            Object.keys(this.props.hotspotData.activeLayers).forEach((key) => {
              hotspotFilters.activeLayers[key] = null;
            });
          }
          if (this.props.hotspotData && this.props.hotspotData.filteredLayers) {
            Object.keys(this.props.hotspotData.filteredLayers).forEach(
              (key) => {
                hotspotFilters.filteredLayers[
                  key
                ] = this.props.hotspotData.filteredLayers[
                  key
                ].customLayerParameters['CQL_FILTER'];
              },
            );
          }
          this.sessionBookmarkHotspot.push(hotspotFilters);
        } else if (e.removed[0]) {
          if (this.sessionBookmarks.length === 0) {
            this.sessionBookmarkLayers = [];
            this.sessionBookmarkOpacity = [];
            this.sessionBookmarkVisible = [];
            this.sessionBookmarkHotspot = [];
            this.props.bookmarkHandler(false);
          } else {
            for (let index = 0; index < this.sessionBookmarks.length; index++) {
              if (e.removed[0] === this.sessionBookmarks[index]) {
                this.sessionBookmarks.splice(index, 1);
                this.sessionBookmarkLayers.splice(index, 1);
                this.sessionBookmarkOpacity.splice(index, 1);
                this.sessionBookmarkVisible.splice(index, 1);
                this.sessionBookmarkHotspot.splice(index, 1);
              }
            }
          }
        } else {
          let newSessionBookmark = [];
          let newSessionBookmarkLayers = [];
          let newSessionBookmarkOpacity = [];
          let newSessionBookmarkVisible = [];
          let newSessionBookmarkHotspot = [];
          for (let i = 0; i < this.Bookmarks.bookmarks.items.length; i++) {
            for (let j = 0; j < this.sessionBookmarks.length; j++) {
              if (
                this.Bookmarks.bookmarks.items[i] === this.sessionBookmarks[j]
              ) {
                newSessionBookmark.push(this.sessionBookmarks[j]);
                newSessionBookmarkLayers.push(this.sessionBookmarkLayers[j]);
                newSessionBookmarkOpacity.push(this.sessionBookmarkOpacity[j]);
                newSessionBookmarkVisible.push(this.sessionBookmarkVisible[j]);
                newSessionBookmarkHotspot.push(this.sessionBookmarkHotspot[j]);
              }
            }
          }
          this.sessionBookmarks = newSessionBookmark;
          this.sessionBookmarkLayers = newSessionBookmarkLayers;
          this.sessionBookmarkOpacity = newSessionBookmarkOpacity;
          this.sessionBookmarkVisible = newSessionBookmarkVisible;
          this.sessionBookmarkHotspot = newSessionBookmarkHotspot;
        }
        if (this.userID != null) {
          localStorage.setItem(
            BOOKMARK_SESSION_KEY + '_' + this.userID,
            JSON.stringify(this.Bookmarks.bookmarks.items),
          );
          localStorage.setItem(
            BOOKMARK_SESSION_KEY + '_' + this.userID + '_layers',
            JSON.stringify(this.sessionBookmarkLayers),
          );
          localStorage.setItem(
            BOOKMARK_SESSION_KEY + '_' + this.userID + '_opacity',
            JSON.stringify(this.sessionBookmarkOpacity),
          );
          localStorage.setItem(
            BOOKMARK_SESSION_KEY + '_' + this.userID + '_visible',
            JSON.stringify(this.sessionBookmarkVisible),
          );
          localStorage.setItem(
            BOOKMARK_SESSION_KEY + '_' + this.userID + '_hotspot',
            JSON.stringify(this.sessionBookmarkHotspot),
          );
        }
      });
      this.Bookmarks.on('bookmark-edit', (e) => {
        let check = JSON.parse(sessionStorage.getItem('checkedLayers')) || [];
        let visibleLayers =
          JSON.parse(sessionStorage.getItem('visibleLayers')) || [];
        let opacity = [];
        let visible = [];
        check.forEach((layer) => {
          opacity.push(this.layers[layer].opacity);
          if (visibleLayers[layer] && visibleLayers[layer][1] === 'eye-slash') {
            visible.push(false);
          } else {
            visible.push(true);
          }
        });
        let hotspotFilters = {
          activeLayers: {},
          filteredLayers: {},
        };
        if (this.props.hotspotData && this.props.hotspotData.activeLayers) {
          Object.keys(this.props.hotspotData.activeLayers).forEach((key) => {
            hotspotFilters.activeLayers[key] = null;
          });
        }
        if (this.props.hotspotData && this.props.hotspotData.activeLayers) {
          Object.keys(this.props.hotspotData.filteredLayers).forEach((key) => {
            hotspotFilters.filteredLayers[
              key
            ] = this.props.hotspotData.filteredLayers[
              key
            ].customLayerParameters['CQL_FILTER'];
          });
        }
        for (let index = 0; index < this.sessionBookmarks.length; index++) {
          if (e.bookmark === this.sessionBookmarks[index]) {
            this.sessionBookmarks[index] = e.bookmark;
            this.sessionBookmarkLayers[index] = check;
            this.sessionBookmarkOpacity[index] = opacity;
            this.sessionBookmarkVisible[index] = visible;
            this.sessionBookmarkHotspot[index] = hotspotFilters;
          }
        }
        if (this.userID != null) {
          localStorage.setItem(
            BOOKMARK_SESSION_KEY + '_' + this.userID,
            JSON.stringify(this.Bookmarks.bookmarks.items),
          );
          localStorage.setItem(
            BOOKMARK_SESSION_KEY + '_' + this.userID + '_layers',
            JSON.stringify(this.sessionBookmarkLayers),
          );
          localStorage.setItem(
            BOOKMARK_SESSION_KEY + '_' + this.userID + '_opacity',
            JSON.stringify(this.sessionBookmarkOpacity),
          );
          localStorage.setItem(
            BOOKMARK_SESSION_KEY + '_' + this.userID + '_visible',
            JSON.stringify(this.sessionBookmarkVisible),
          );
          localStorage.setItem(
            BOOKMARK_SESSION_KEY + '_' + this.userID + '_hotspot',
            JSON.stringify(this.sessionBookmarkHotspot),
          );
        }
      });
      this.Bookmarks.on('bookmark-select', (e) => {
        let selectLayers = [];
        let selectOpacity = [];
        let selectVisible = [];
        for (let index = 0; index < this.Bookmarks.bookmarks.length; index++) {
          if (e.bookmark === this.Bookmarks.bookmarks.items[index]) {
            selectLayers = this.sessionBookmarkLayers[index];
            selectOpacity = this.sessionBookmarkOpacity[index];
            selectVisible = this.sessionBookmarkVisible[index];
            localStorage.setItem(
              'bookmarkHotspotFilter',
              JSON.stringify(this.sessionBookmarkHotspot[index]),
            );
          }
        }
        this.map.layers.removeAll();
        this.props.bookmarkHandler(true);
        let layerOpacities = {};
        for (let index = 0; index < selectLayers.length; index++) {
          if (selectOpacity[index]) {
            this.layers[selectLayers[index]].opacity = selectOpacity[index];
            layerOpacities[selectLayers[index]] = selectOpacity[index];
          }
          if (selectVisible[index] !== null) {
            this.layers[selectLayers[index]].visible = selectVisible[index];
          }
        }
        sessionStorage.setItem('checkedLayers', JSON.stringify(selectLayers));
        sessionStorage.setItem(
          'layerOpacities',
          JSON.stringify(layerOpacities),
        );
        //this.props.mapLayersHandler(this.layers);
      });
    });
  }
  componentDidUpdate() {
    this.props.view.when(() => {
      this.Bookmarks.when(() => {
        this.Bookmarks.container.addEventListener(
          'keydown',
          this.limitMaxLenth,
        );
        this.Bookmarks.container.addEventListener('paste', this.limitMaxLenth);
      });
    });
  }
  /**
   * This method renders the component
   * @returns jsx
   */
  render() {
    return (
      <>
        <div ref={this.container} className="bookmark-container">
          <div tooltip="Bookmark" direction="left" type="widget">
            <div
              className={this.menuClass}
              id="bookmark_button"
              aria-label="Bookmark"
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
              <span>Bookmark</span>
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
              <div className="bookmark-panel"></div>
            </div>
          </div>
        </div>
      </>
    );
  }
}

export default BookmarkWidget;
