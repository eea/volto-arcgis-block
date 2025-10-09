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
    this._skipNextChangePersist = true;
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
      this.migrateLegacyBookmarksToUserObject();
      // this.sessionBookmarks =
      //   JSON.parse(
      //     localStorage.getItem(BOOKMARK_SESSION_KEY + '_' + this.userID),
      //   ) || [];
      // this.sessionBookmarkLayers =
      //   JSON.parse(
      //     localStorage.getItem(
      //       BOOKMARK_SESSION_KEY + '_' + this.userID + '_layers',
      //     ),
      //   ) || [];
      // while (this.sessionBookmarkLayers.length < this.sessionBookmarks.length) {
      //   this.sessionBookmarkLayers.push([]);
      // }
      // this.sessionBookmarkOpacity =
      //   JSON.parse(
      //     localStorage.getItem(
      //       BOOKMARK_SESSION_KEY + '_' + this.userID + '_opacity',
      //     ),
      //   ) || [];
      // while (
      //   this.sessionBookmarkOpacity.length < this.sessionBookmarks.length
      // ) {
      //   this.sessionBookmarkOpacity.push([]);
      // }
      // this.sessionBookmarkVisible =
      //   JSON.parse(
      //     localStorage.getItem(
      //       BOOKMARK_SESSION_KEY + '_' + this.userID + '_visible',
      //     ),
      //   ) || [];
      // while (
      //   this.sessionBookmarkVisible.length < this.sessionBookmarks.length
      // ) {
      //   this.sessionBookmarkVisible.push([]);
      // }
      // this.sessionBookmarkHotspot =
      //   JSON.parse(
      //     localStorage.getItem(
      //       BOOKMARK_SESSION_KEY + '_' + this.userID + '_hotspot',
      //     ),
      //   ) || [];
      // while (
      //   this.sessionBookmarkHotspot.length < this.sessionBookmarks.length
      // ) {
      //   this.sessionBookmarkHotspot.push([]);
      // }
      this.loadBookmarksToWidget();
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
            if (this._skipNextChangePersist) {
              this._skipNextChangePersist = false;
              if (e.added && e.added[0]) {
                this.saveBookmarksToUserObject();
              }
            } else {
              this.saveBookmarksToUserObject();
            }
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
            // localStorage.setItem(
            //   BOOKMARK_SESSION_KEY + '_' + this.userID,
            //   JSON.stringify(this.Bookmarks.bookmarks.items),
            // );
            // localStorage.setItem(
            //   BOOKMARK_SESSION_KEY + '_' + this.userID + '_layers',
            //   JSON.stringify(this.sessionBookmarkLayers),
            // );
            // localStorage.setItem(
            //   BOOKMARK_SESSION_KEY + '_' + this.userID + '_opacity',
            //   JSON.stringify(this.sessionBookmarkOpacity),
            // );
            // localStorage.setItem(
            //   BOOKMARK_SESSION_KEY + '_' + this.userID + '_visible',
            //   JSON.stringify(this.sessionBookmarkVisible),
            // );
            // localStorage.setItem(
            //   BOOKMARK_SESSION_KEY + '_' + this.userID + '_hotspot',
            //   JSON.stringify(this.sessionBookmarkHotspot),
            // );
            this.saveBookmarksToUserObject();
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
              this.saveBookmarksToUserObject();
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
  migrateLegacyBookmarksToUserObject() {
    if (this.userID == null) return;
    const storageKey = 'user_' + this.userID;
    let userObj;
    try {
      userObj = JSON.parse(localStorage.getItem(storageKey)) || {};
    } catch (e) {
      userObj = {};
    }
    const hasUserBookmarks =
      userObj &&
      userObj.bookmarks &&
      typeof userObj.bookmarks === 'object' &&
      Array.isArray(userObj.bookmarks.items) &&
      userObj.bookmarks.items.length > 0;
    if (hasUserBookmarks) return;
    let legacyItems;
    let legacyLayers;
    let legacyOpacity;
    let legacyVisible;
    let legacyHotspot;
    try {
      legacyItems =
        JSON.parse(
          localStorage.getItem(BOOKMARK_SESSION_KEY + '_' + this.userID),
        ) || [];
    } catch (e) {
      legacyItems = [];
    }
    try {
      legacyLayers =
        JSON.parse(
          localStorage.getItem(
            BOOKMARK_SESSION_KEY + '_' + this.userID + '_layers',
          ),
        ) || [];
    } catch (e) {
      legacyLayers = [];
    }
    try {
      legacyOpacity =
        JSON.parse(
          localStorage.getItem(
            BOOKMARK_SESSION_KEY + '_' + this.userID + '_opacity',
          ),
        ) || [];
    } catch (e) {
      legacyOpacity = [];
    }
    try {
      legacyVisible =
        JSON.parse(
          localStorage.getItem(
            BOOKMARK_SESSION_KEY + '_' + this.userID + '_visible',
          ),
        ) || [];
    } catch (e) {
      legacyVisible = [];
    }
    try {
      legacyHotspot =
        JSON.parse(
          localStorage.getItem(
            BOOKMARK_SESSION_KEY + '_' + this.userID + '_hotspot',
          ),
        ) || [];
    } catch (e) {
      legacyHotspot = [];
    }
    const hasLegacyData =
      (Array.isArray(legacyItems) && legacyItems.length > 0) ||
      (Array.isArray(legacyLayers) && legacyLayers.length > 0) ||
      (Array.isArray(legacyOpacity) && legacyOpacity.length > 0) ||
      (Array.isArray(legacyVisible) && legacyVisible.length > 0) ||
      (Array.isArray(legacyHotspot) && legacyHotspot.length > 0);
    if (!hasLegacyData) return;
    let selectedHotspotFilter = null;
    try {
      selectedHotspotFilter = JSON.parse(
        localStorage.getItem('bookmarkHotspotFilter'),
      );
    } catch (e) {
      selectedHotspotFilter = null;
    }
    if (!userObj.bookmarks || typeof userObj.bookmarks !== 'object') {
      userObj.bookmarks = {};
    }
    userObj.bookmarks.items = legacyItems;
    userObj.bookmarks.layers = legacyLayers;
    userObj.bookmarks.opacity = legacyOpacity;
    userObj.bookmarks.visible = legacyVisible;
    userObj.bookmarks.hotspot = legacyHotspot;
    userObj.bookmarks.selectedHotspotFilter = selectedHotspotFilter;
    localStorage.setItem(storageKey, JSON.stringify(userObj));
  }
  componentDidUpdate() {
    if (this.userID !== this.props.userID) {
      this.userID = this.props.userID;
      this._skipNextChangePersist = true;
      if (this.Bookmarks && this.Bookmarks.bookmarks) {
        this.Bookmarks.bookmarks.removeAll();
      }
      this.sessionBookmarks = [];
      this.sessionBookmarkLayers = [];
      this.sessionBookmarkOpacity = [];
      this.sessionBookmarkVisible = [];
      this.sessionBookmarkHotspot = [];
      try {
        if (!this.userID) {
          localStorage.removeItem('bookmarkHotspotFilter');
        } else {
          this.loadBookmarksToWidget();
          if (this.Bookmarks && this.Bookmarks.bookmarks) {
            const mapped = this.sessionBookmarks.map((bm) => {
              if (bm && bm.extent) {
                const { extent, ...rest } = bm;
                let geometry;
                if (extent && typeof extent === 'object') {
                  geometry = extent.type ? extent : new Extent(extent);
                }
                return {
                  ...rest,
                  viewpoint: { targetGeometry: geometry },
                };
              }
              return bm;
            });
            mapped.forEach((item) => this.Bookmarks.bookmarks.add(item));
            this.sessionBookmarks = [];
            this.Bookmarks.bookmarks.items.forEach((bookmark) => {
              this.sessionBookmarks.push(bookmark);
            });
          }
        }
      } catch (e) {}
    }
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
  loadBookmarksToWidget() {
    if (this.userID == null) return;
    const storageKey = 'user_' + this.userID;
    let userObj;
    try {
      userObj = JSON.parse(localStorage.getItem(storageKey)) || {};
    } catch (e) {
      userObj = {};
    }
    let bookmarks =
      userObj && userObj.bookmarks && typeof userObj.bookmarks === 'object'
        ? userObj.bookmarks
        : null;
    if (!bookmarks) return;
    const items = Array.isArray(bookmarks.items) ? bookmarks.items : [];
    const layers = Array.isArray(bookmarks.layers) ? bookmarks.layers : [];
    const opacity = Array.isArray(bookmarks.opacity) ? bookmarks.opacity : [];
    const visible = Array.isArray(bookmarks.visible) ? bookmarks.visible : [];
    const hotspot = Array.isArray(bookmarks.hotspot) ? bookmarks.hotspot : [];
    const selectedHotspotFilter =
      bookmarks.selectedHotspotFilter != null
        ? bookmarks.selectedHotspotFilter
        : null;
    this.sessionBookmarks = items.map((b) => {
      if (b && b.thumbnail) {
        if (b.thumbnail.url)
          return { ...b, thumbnail: { url: b.thumbnail.url } };
        return { ...b };
      }
      return b;
    });
    this.sessionBookmarkLayers = layers;
    while (this.sessionBookmarkLayers.length < this.sessionBookmarks.length) {
      this.sessionBookmarkLayers.push([]);
    }
    this.sessionBookmarkOpacity = opacity;
    while (this.sessionBookmarkOpacity.length < this.sessionBookmarks.length) {
      this.sessionBookmarkOpacity.push([]);
    }
    this.sessionBookmarkVisible = visible;
    while (this.sessionBookmarkVisible.length < this.sessionBookmarks.length) {
      this.sessionBookmarkVisible.push([]);
    }
    this.sessionBookmarkHotspot = hotspot;
    while (this.sessionBookmarkHotspot.length < this.sessionBookmarks.length) {
      this.sessionBookmarkHotspot.push([]);
    }
    if (selectedHotspotFilter !== null) {
      localStorage.setItem(
        'bookmarkHotspotFilter',
        JSON.stringify(selectedHotspotFilter),
      );
    }
  }
  saveBookmarksToUserObject() {
    if (this.userID == null) return;
    const storageKey = 'user_' + this.userID;
    let userObj;
    try {
      userObj = JSON.parse(localStorage.getItem(storageKey)) || {};
    } catch (e) {
      userObj = {};
    }
    const rawItems = this.Bookmarks?.bookmarks?.items
      ? this.Bookmarks.bookmarks.items
      : this.sessionBookmarks;
    const items = Array.isArray(rawItems)
      ? rawItems.map((b) => {
          const out = {};
          let name;
          if (b && (b.name || b.label || b.title)) {
            name = b.name || b.label || b.title;
          }
          if (name !== undefined) out.name = name;
          let g = null;
          if (b && b.viewpoint && b.viewpoint.targetGeometry) {
            g = b.viewpoint.targetGeometry;
          } else if (b && b.extent) {
            g = b.extent;
          }
          if (
            g &&
            (g.type === 'extent' ||
              (g.xmin != null &&
                g.ymin != null &&
                g.xmax != null &&
                g.ymax != null))
          ) {
            out.extent = {
              xmin: g.xmin,
              ymin: g.ymin,
              xmax: g.xmax,
              ymax: g.ymax,
              spatialReference: g.spatialReference
                ? {
                    wkid: g.spatialReference.wkid,
                    latestWkid: g.spatialReference.latestWkid,
                    wkt: g.spatialReference.wkt,
                  }
                : undefined,
            };
          }
          if (b && b.thumbnail) {
            if (b.thumbnail.url) {
              out.thumbnail = { url: b.thumbnail.url };
            } else {
              out.thumbnail = b.thumbnail;
            }
          }
          return out;
        })
      : [];
    const layers = this.sessionBookmarkLayers;
    const opacity = this.sessionBookmarkOpacity;
    const visible = this.sessionBookmarkVisible;
    const hotspot = this.sessionBookmarkHotspot;
    let selectedHotspotFilter = null;
    try {
      selectedHotspotFilter = JSON.parse(
        localStorage.getItem('bookmarkHotspotFilter'),
      );
    } catch (e) {
      selectedHotspotFilter = null;
    }
    if (!userObj.bookmarks || typeof userObj.bookmarks !== 'object') {
      userObj.bookmarks = {};
    }
    const existingItems =
      userObj.bookmarks && Array.isArray(userObj.bookmarks.items)
        ? userObj.bookmarks.items
        : [];
    if ((!items || items.length === 0) && existingItems.length > 0) {
      return;
    }
    userObj.bookmarks.items = items;
    userObj.bookmarks.layers = layers;
    userObj.bookmarks.opacity = opacity;
    userObj.bookmarks.visible = visible;
    userObj.bookmarks.hotspot = hotspot;
    userObj.bookmarks.selectedHotspotFilter = selectedHotspotFilter;
    localStorage.setItem(storageKey, JSON.stringify(userObj));
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
