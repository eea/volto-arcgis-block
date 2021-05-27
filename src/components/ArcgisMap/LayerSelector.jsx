import React, { useState } from 'react';
import classNames from 'classnames';

function LayerSelector({ id }) {
  const [showMapMenu, setShowMapMenu] = useState(false);

  const menuClass = classNames(
    'esri-icon-basemap esri-widget--button esri-widget esri-interactive',
    {
      'esri-icon-right-arrow': showMapMenu,
      'esri-icon-basemap': !showMapMenu,
    },
  );

  function openMenu() {
    if (showMapMenu) {
      document
        .getElementById(id)
        .getElementsByClassName('esri-basemap-gallery')[0].style.display =
        'none';
      setShowMapMenu(false);
    } else {
      document
        .getElementById(id)
        .getElementsByClassName('esri-basemap-gallery')[0]
        .classList.add('basemap-gallery-container');
      document
        .getElementById(id)
        .getElementsByClassName('esri-basemap-gallery')[0].style.display =
        'block';
      setShowMapMenu(true);
    }
  }
  return (
    <div
      className={menuClass}
      role="button"
      title="Basemap gallery"
      onClick={() => openMenu()}
      onKeyDown={() => openMenu()}
      tabIndex={id}
    ></div>
  );
}

export default LayerSelector;
