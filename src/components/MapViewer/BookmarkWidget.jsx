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
    this.userID = this.props.userID;
    this.menuClass =
      'esri-icon-bookmark esri-widget--button esri-widget esri-interactive';
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

  async componentDidMount() {
    await this.loader();
    this.props.view.ui.add(this.container.current, 'top-right');
    let sessionBookmarks = {};
    if (this.userID != null) {
      sessionBookmarks =
        JSON.parse(
          localStorage.getItem(BOOKMARK_SESSION_KEY + '_' + this.userID),
        ) || {};
    }
    this.Bookmarks = new Bookmarks({
      view: this.props.view,
      // allows bookmarks to be added, edited, or deleted
      editingEnabled: true,
      visibleElements: {
        time: false, // don't show the time (h:m:s) next to the date
      },
      container: document.querySelector('.bookmark-panel'),
      bookmarks: sessionBookmarks,
    });

    this.Bookmarks.when(() => {
      this.Bookmarks.bookmarks.on('change', () => {
        if (this.userID != null) {
          localStorage.setItem(
            BOOKMARK_SESSION_KEY + '_' + this.userID,
            JSON.stringify(this.Bookmarks.bookmarks.items),
          );
        }
      });
      this.Bookmarks.on('bookmark-edit', () => {
        if (this.userID != null) {
          localStorage.setItem(
            BOOKMARK_SESSION_KEY + '_' + this.userID,
            JSON.stringify(this.Bookmarks.bookmarks.items),
          );
        }
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
