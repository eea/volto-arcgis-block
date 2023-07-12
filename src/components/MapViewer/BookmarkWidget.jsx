import React, { createRef, useEffect, useState  } from 'react';
import { useDispatch, useSelector } from 'react-redux';
//import "@arcgis/core/assets/esri/css/main.css";
//import "./css/ArcgisMap.css";
import { loadModules } from 'esri-loader';

export const BOOKMARK_SESSION_KEY = 'bookmark_session';

var Legend, LegendViewModel, Bookmarks, Bookmark, Expand, WebMap, MapView, TimeSlider;
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
    this.menuClass =
      'esri-icon-bookmark esri-widget--button esri-widget esri-interactive';
  }

  loader() {
    return loadModules([
      'esri/widgets/Legend',
      'esri/widgets/Legend/LegendViewModel',
      "esri/widgets/Bookmarks",
      "esri/webmap/Bookmark",
      "esri/widgets/Expand",
      "esri/WebMap",
      "esri/views/MapView",
      "esri/widgets/TimeSlider",
    ]).then(([_Legend, _LegendViewModel, _Bookmarks, _Bookmark, _Expand, _WebMap, _MapView, _TimeSlider]) => {
      Legend = _Legend;
      LegendViewModel = _LegendViewModel;
      Bookmarks = _Bookmarks;
      Bookmark = _Bookmark;
      Expand = _Expand;
      WebMap = _WebMap;
      MapView = _MapView;
      TimeSlider = _TimeSlider
    });
  }
  funciondebug(){
    debugger;
  }

  /**
   * Method that will be invoked when the
   * button is clicked. It controls the open
   * and close actions of the component
   */
  openMenu() {
    let addBookmarkButton = document.getElementsByClassName('esri-bookmarks__add-bookmark');
    //addBookmarkButton.onClick(this.funciondebug);
    addBookmarkButton[0].onclick = function(event){
      debugger;
      localStorage.setItem('admin', JSON.stringify(this.Bookmark.bookmarks));
      debugger;
    };
    debugger;
    addBookmarkButton;
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
    let savedBookmark = null;
    //const user_id = useSelector((state) => state.users.user.id);
    //const BOOKMARK_SESSION_USER_KEY = BOOKMARK_SESSION_KEY.concat(`_${user_id}`)
    let localbookmark = localStorage.getItem('admin');
    if (localbookmark && localbookmark !== null) {
      savedBookmark = JSON.parse(localbookmark);
    }
    
    this.Bookmarks = new Bookmarks({
      view: this.props.view,
      // allows bookmarks to be added, edited, or deleted
      editingEnabled: true,
      visibleElements: {
        time: false // don't show the time (h:m:s) next to the date
      },
      container: document.querySelector('.bookmark-panel'),
      bookmarks: [ // array of bookmarks defined manually
        /*new Bookmark({
          name: "Angeles National Forest",
          viewpoint: {
            targetGeometry: {
              type: "extent",
              spatialReference: {
                wkid: 102100
              },
              xmin: -13139131.948889678,
              ymin: 4047767.23531948,
              xmax: -13092887.54677721,
              ymax: 4090610.189673263
            }
          }
        }),*/
        savedBookmark
      ]
    });
    /*let map3 = this.props.map;*/
    let bookmark = this.Bookmarks;
    this.props.view.when(function () {
      //const layer = map3.layers.getItemAt(0);
      bookmark.on("bookmark-select", (event) => {
        debugger;
        localStorage.setItem('admin', JSON.stringify(event.bookmark));
        /*let hurricaneName = event.bookmark.name.toUpperCase();
        layer.featureEffect = {
          filter: {
            where: "Name = '" + hurricaneName + "'"
          },
          excludedEffect: "grayscale(100%) opacity(30%)"
        };*/
      });
      debugger;
      bookmark.endAddBookmark;
      debugger;
      /*clearBtn.addEventListener("click", () => {
        layer.featureEffect = null;
      });*/
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
          <div tooltip="Bookmark" direction="left" type="widget">
            <div
              className={this.menuClass}
              id="legend_button"
              aria-label="Bookmark"
              onClick={this.openMenu.bind(this)}
              onKeyDown={this.openMenu.bind(this)}
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
                onKeyDown={this.openMenu.bind(this)}
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