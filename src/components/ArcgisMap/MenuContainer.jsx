import React, { useState } from 'react';
import classNames from 'classnames';
// import './styles/ArcgisMap.less';

// const loadStyle = async (classStyle) => {
//   if (classStyle) {
//     await classStyle;
//     console.log('classStyle: ', classStyle);
//   }
// };

function MenuContainer() {
  const [showMapMenu, setShowMapMenu] = useState(false);
  // console.log('MenuContainer classStyle: ', classStyle);

  // loadStyle(classStyle);
  var menuClass = classNames(
    'esri-widget--button esri-widget esri-interactive',
    {
      'esri-icon-left-arrow': showMapMenu,
      'esri-icon-drag-horizontal': !showMapMenu,
    },
  );

  return (
    <div className="map-left-menu-container esri-component">
      <div
        className={menuClass}
        onClick={() => setShowMapMenu(!showMapMenu)}
        onKeyDown={() => setShowMapMenu(!showMapMenu)}
        tabIndex={0}
        role="button"
      ></div>
      {showMapMenu ? (
        <div className="map-menu tab-container" style={{ display: 'block' }}>
          <div className="tabs" role="tablist">
            <span
              className="tab tab-selected"
              id="products_label"
              role="tab"
              aria-controls="products_panel"
              aria-selected="true"
            >
              Products and datasets
            </span>
            <span
              className="tab"
              id="active_label"
              role="tab"
              aria-controls="active_panel"
              aria-selected="false"
            >
              Active on map
            </span>
          </div>
          <div className="panels">
            <div
              className="panel panel-selected"
              id="products_panel"
              role="tabpanel"
              aria-hidden="false"
            ></div>
            <div
              className="panel"
              id="active_panel"
              role="tabpanel"
              aria-hidden="true"
            >
              <div className="no-active-datasets">No datasets selected</div>
            </div>
          </div>
        </div>
      ) : (
        ''
      )}
    </div>
  );
}

export default MenuContainer;
