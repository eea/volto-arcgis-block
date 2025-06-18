import React, { createRef } from 'react';
//import "@arcgis/core/assets/esri/css/main.css";
//import "./css/ArcgisMap.css";
import { loadModules } from 'esri-loader';

export const BOOKMARK_SESSION_KEY = 'bookmark_session';

var Bookmarks, Extent;
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
    this.arcgisEventHandles = [];
    this.boundLimitMaxLenth = this.limitMaxLenth.bind(this);
    this._isMounted = false;
  }

  loader() {
    return loadModules(['esri/widgets/Bookmarks', 'esri/geometry/Extent']).then(
      ([_Bookmarks, _Extent]) => {
        Bookmarks = _Bookmarks;
        Extent = _Extent;
      },
    );
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

  processReorder(newOrder) {
    const oldBookmarks = this.sessionBookmarks;
    const reorderedBookmarks = newOrder.map((uid) => {
      const index = oldBookmarks.findIndex(
        (bookmark) => bookmark && bookmark.uid === uid,
      );
      return index !== -1 ? oldBookmarks[index] : null;
    });

    const hasEqualLength =
      oldBookmarks.length === newOrder.length &&
      newOrder.length === reorderedBookmarks.length;
    const hasNullValues = reorderedBookmarks.some((item) => item === null);

    if (hasEqualLength && !hasNullValues) {
      return reorderedBookmarks;
    }

    let missingBookmark = null;
    let missingIndex = -1;

    for (let i = 0; i < oldBookmarks.length; i++) {
      const oldBookmark = oldBookmarks[i];
      const newUid = i < newOrder.length ? newOrder[i] : null;

      if (
        oldBookmark &&
        newUid &&
        oldBookmark.uid === newUid &&
        !reorderedBookmarks.includes(oldBookmark)
      ) {
        missingBookmark = oldBookmark;
        missingIndex = i;
        break;
      }
    }

    if (missingBookmark && missingIndex !== -1) {
      if (reorderedBookmarks.length !== oldBookmarks.length) {
        const finalBookmarks = [];
        let reorderIndex = 0;

        for (let i = 0; i < oldBookmarks.length; i++) {
          if (i === missingIndex) {
            finalBookmarks[i] = missingBookmark;
          } else {
            finalBookmarks[i] =
              reorderIndex < reorderedBookmarks.length
                ? reorderedBookmarks[reorderIndex]
                : null;
            reorderIndex++;
          }
        }
        return finalBookmarks;
      } else if (hasNullValues) {
        const nullIndex = reorderedBookmarks.findIndex((item) => item === null);
        if (nullIndex === missingIndex) {
          reorderedBookmarks[nullIndex] = missingBookmark;
        }
        return reorderedBookmarks;
      }
    }

    return reorderedBookmarks;
  }

  async componentDidMount() {
    this._isMounted = true;
    await this.loader();
    if (!this.container.current) return;
    this.props.view.when(() => {
      this.props.view.ui.add(this.container.current, 'top-right');
    });
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
      bookmarks: this.sessionBookmarks.map((bm) => {
        if (bm.extent) {
          const { extent, ...rest } = bm;
          let geometry;
          if (extent && typeof extent === 'object') {
            geometry = extent.type ? extent : new Extent(extent);
          }
          return {
            ...rest,
            viewpoint: {
              targetGeometry: geometry,
            },
          };
        }
        return bm;
      }),
    });
    this.sessionBookmarks = [];
    this.Bookmarks.bookmarks.items.forEach((bookmark) => {
      this.sessionBookmarks.push(bookmark);
    });
    this.Bookmarks.when(() => {
      this.arcgisEventHandles.push(
        this.Bookmarks.bookmarks.on('change', (e) => {
          if (!this._isMounted) return;
          let shouldUpdate = false;
          if (e.added[0]) {
            let check =
              JSON.parse(sessionStorage.getItem('checkedLayers')) || [];
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
              Object.keys(this.props.hotspotData.activeLayers).forEach(
                (key) => {
                  hotspotFilters.activeLayers[key] = null;
                },
              );
            }
            if (
              this.props.hotspotData &&
              this.props.hotspotData.filteredLayers
            ) {
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
            shouldUpdate = true;
          } else if (e.removed[0]) {
            for (let index = 0; index < this.sessionBookmarks.length; index++) {
              if (e.removed[0] === this.sessionBookmarks[index]) {
                this.sessionBookmarks.splice(index, 1);
                this.sessionBookmarkLayers.splice(index, 1);
                this.sessionBookmarkOpacity.splice(index, 1);
                this.sessionBookmarkVisible.splice(index, 1);
                if (
                  this.sessionBookmarkHotspot &&
                  Array.isArray(this.sessionBookmarkHotspot)
                ) {
                  this.sessionBookmarkHotspot.splice(index, 1);
                }
                shouldUpdate = true;
                break;
              }
            }
          } else if (e.moved) {
            const newOrder = e.target?.items.map((bookmark) => bookmark.uid);
            const reorderedBookmarks = this.processReorder(newOrder);

            const reorderedLayers = [];
            const reorderedOpacity = [];
            const reorderedVisible = [];
            const reorderedHotspot = [];

            reorderedBookmarks.forEach((bookmark) => {
              const originalIndex = this.sessionBookmarks.findIndex(
                (original) => original && original.uid === bookmark.uid,
              );
              if (originalIndex !== -1) {
                reorderedLayers.push(this.sessionBookmarkLayers[originalIndex]);
                reorderedOpacity.push(
                  this.sessionBookmarkOpacity[originalIndex],
                );
                reorderedVisible.push(
                  this.sessionBookmarkVisible[originalIndex],
                );
                reorderedHotspot.push(
                  this.sessionBookmarkHotspot[originalIndex],
                );
              }
            });

            this.sessionBookmarks = reorderedBookmarks;
            this.sessionBookmarkLayers = reorderedLayers;
            this.sessionBookmarkOpacity = reorderedOpacity;
            this.sessionBookmarkVisible = reorderedVisible;
            this.sessionBookmarkHotspot = reorderedHotspot;
            shouldUpdate = true;
          }
          // } else {
          // let newSessionBookmark = [];
          // let newSessionBookmarkLayers = [];
          // let newSessionBookmarkOpacity = [];
          // let newSessionBookmarkVisible = [];
          // let newSessionBookmarkHotspot = [];
          // for (let i = 0; i < this.Bookmarks.bookmarks.items.length; i++) {
          // for (let j = 0; j < this.sessionBookmarks.length; j++) {
          // if (
          // this.Bookmarks.bookmarks.items[i] === this.sessionBookmarks[j]
          // ) {
          // newSessionBookmark.push(this.sessionBookmarks[j]);
          // newSessionBookmarkLayers.push(this.sessionBookmarkLayers[j]);
          // newSessionBookmarkOpacity.push(
          // this.sessionBookmarkOpacity[j],
          // );
          // newSessionBookmarkVisible.push(
          // this.sessionBookmarkVisible[j],
          // );
          // newSessionBookmarkHotspot.push(
          // this.sessionBookmarkHotspot[j],
          // );
          // }
          // }
          // }
          // }
          // if (
          // newSessionBookmark.length !== this.sessionBookmarks.length ||
          // newSessionBookmarkLayers.length !==
          // this.sessionBookmarkLayers.length ||
          // newSessionBookmarkOpacity.length !==
          // this.sessionBookmarkOpacity.length ||
          // newSessionBookmarkVisible.length !==
          // this.sessionBookmarkVisible.length ||
          // newSessionBookmarkHotspot.length !==
          // this.sessionBookmarkHotspot.length
          // ) {
          // this.sessionBookmarks = newSessionBookmark;
          // this.sessionBookmarkLayers = newSessionBookmarkLayers;
          // this.sessionBookmarkOpacity = newSessionBookmarkOpacity;
          // this.sessionBookmarkVisible = newSessionBookmarkVisible;
          // this.sessionBookmarkHotspot = newSessionBookmarkHotspot;
          // shouldUpdate = true;
          // }
          if (shouldUpdate && this.userID != null) {
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
          if (shouldUpdate) {
            let bookmarkData = {
              ...(this.props.bookmarkData || {}),
              active: false,
              layers: this.sessionBookmarkLayers,
              opacity: this.sessionBookmarkOpacity,
              visible: this.sessionBookmarkVisible,
              position: null,
            };
            this.props.bookmarkHandler(bookmarkData);
          }
        }),
        this.Bookmarks.on('bookmark-edit', (e) => {
          if (!this._isMounted) return;
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
          let hotspotFilters = {
            activeLayers: {},
            filteredLayers: {},
          };
          if (
            this.props.hotspotData &&
            this.props.hotspotData.activeLayers &&
            Object.keys(this.props.hotspotData.activeLayers).length !== 0
          ) {
            Object.keys(this.props.hotspotData.activeLayers).forEach((key) => {
              hotspotFilters.activeLayers[key] = null;
            });
          }
          if (
            this.props.hotspotData &&
            this.props.hotspotData.filteredLayers &&
            Object.keys(this.props.hotspotData.filteredLayers).length !== 0
          ) {
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

          let bookmarkData = {
            ...(this.props.bookmarkData || {}),
            active: false,
            layers: this.sessionBookmarkLayers,
            opacity: this.sessionBookmarkOpacity,
            visible: this.sessionBookmarkVisible,
            position: null,
          };

          this.props.bookmarkHandler(bookmarkData);
        }),
        this.Bookmarks.on('bookmark-select', (e) => {
          if (!this._isMounted) return;
          let selectLayers = [];
          let selectOpacity = [];
          let selectVisible = [];
          let selectPosition;
          for (
            let index = 0;
            index < this.Bookmarks.bookmarks.length;
            index++
          ) {
            if (e.bookmark === this.Bookmarks.bookmarks.items[index]) {
              selectLayers = this.sessionBookmarkLayers[index];
              selectOpacity = this.sessionBookmarkOpacity[index];
              selectVisible = this.sessionBookmarkVisible[index];
              selectPosition = index;
              localStorage.setItem(
                'bookmarkHotspotFilter',
                JSON.stringify(this.sessionBookmarkHotspot[index]),
              );
            }
          }
          if (
            !Array.isArray(selectLayers) ||
            !Array.isArray(selectOpacity) ||
            !Array.isArray(selectVisible)
          ) {
            return;
          }
          let layerOpacities = {};
          const layerKeys = {
            lcc_filter: 'all_lcc',
            lc_filter: 'all_present',
            klc_filter: 'cop_klc',
            pa_filter: 'protected_areas',
          };
          let i = 0;
          const chunkSize = 10;
          const processChunk = () => {
            let end = Math.min(i + chunkSize, selectLayers.length);
            for (; i < end; i++) {
              const opacityIndex = i;
              if (selectOpacity[opacityIndex]) {
                Object.entries(layerKeys).forEach(([key, val]) => {
                  if (
                    this.props.hotspotData?.filteredLayers?.hasOwnProperty(
                      key,
                    ) &&
                    this.layers[key] &&
                    selectLayers[opacityIndex].includes(val)
                  ) {
                    this.layers[key].opacity = selectOpacity[opacityIndex];
                  } else {
                    this.layers[selectLayers[opacityIndex]].opacity =
                      selectOpacity[opacityIndex];
                    layerOpacities[selectLayers[opacityIndex]] =
                      selectOpacity[opacityIndex];
                  }
                });
              }
              if (selectVisible[opacityIndex] !== null) {
                Object.entries(layerKeys).forEach(([key, val]) => {
                  if (
                    this.props.hotspotData?.filteredLayers?.hasOwnProperty(
                      key,
                    ) &&
                    this.layers[key] &&
                    selectLayers[opacityIndex].includes(val)
                  ) {
                    this.layers[key].visible = selectVisible[opacityIndex];
                  } else {
                    this.layers[selectLayers[opacityIndex]].visible =
                      selectVisible[opacityIndex];
                  }
                });
              }
            }
            if (i < selectLayers.length) {
              requestAnimationFrame(processChunk);
            } else {
              sessionStorage.setItem(
                'checkedLayers',
                JSON.stringify(selectLayers),
              );
              sessionStorage.setItem(
                'layerOpacities',
                JSON.stringify(layerOpacities),
              );
              let bookmarkData = {
                ...(this.props.bookmarkData || {}),
                active: true,
                layers: this.sessionBookmarkLayers,
                opacity: this.sessionBookmarkOpacity,
                visible: this.sessionBookmarkVisible,
                position: selectPosition,
              };

              this.props.bookmarkHandler(bookmarkData);
              this.map.layers.removeAll();
              let firstLayer = Object.values(this.layers)[0];
              this.map.add(firstLayer);
            }
          };
          processChunk();
        }),
      );
    });
  }
  componentDidUpdate() {
    this.props.view.when(() => {
      this.Bookmarks.when(() => {
        this.Bookmarks.container.addEventListener(
          'keydown',
          this.boundLimitMaxLenth,
        );
        this.Bookmarks.container.addEventListener(
          'paste',
          this.boundLimitMaxLenth,
        );
      });
    });
  }
  componentWillUnmount() {
    this._isMounted = false;
    if (this.arcgisEventHandles) {
      this.arcgisEventHandles.forEach((handle) => handle.remove());
      this.arcgisEventHandles = [];
    }
    if (this.Bookmarks && this.Bookmarks.container) {
      this.Bookmarks.container.removeEventListener(
        'keydown',
        this.boundLimitMaxLenth,
      );
      this.Bookmarks.container.removeEventListener(
        'paste',
        this.boundLimitMaxLenth,
      );
    }
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
