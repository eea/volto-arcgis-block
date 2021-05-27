import React, { useState } from 'react';
import classNames from 'classnames';

function MenuContainer({ children }) {
  const [showMapMenu, setShowMapMenu] = useState(false);

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
          {children}
        </div>
      ) : (
        ''
      )}
    </div>
  );
}

export default MenuContainer;
