import React, { useState } from 'react';
import classNames from 'classnames';

// import './styles/ArcgisMap.less';
// const loadStyle = async (classStyle) => {
//   if (classStyle) {
//     await classStyle;
//     console.log('classStyle: ', classStyle);
//   }
// };

function LayerSelector() {
  const [showMapMenu, setShowMapMenu] = useState(false);
  // console.log('LayerSelector classStyle: ', classStyle);
  // loadStyle(classStyle);
  var menuClass = classNames(
    'esri-icon-basemap esri-widget--button esri-widget esri-interactive',
    {
      'esri-icon-right-arrow': showMapMenu,
      'esri-icon-basemap': !showMapMenu,
    },
  );

  function openMenu() {
    if (showMapMenu) {
      document.getElementsByClassName('esri-basemap-gallery')[0].style.display =
        'none';
      setShowMapMenu(false);
    } else {
      document
        .getElementsByClassName('esri-basemap-gallery')[0]
        .classList.add('basemap-gallery-container');
      document.getElementsByClassName('esri-basemap-gallery')[0].style.display =
        'block';
      setShowMapMenu(true);
    }
  }
  return (
    <div
      className={menuClass}
      id="map_basemap_button"
      role="button"
      title="Basemap gallery"
      onClick={() => openMenu()}
      onKeyDown={() => openMenu()}
      tabIndex={0}
    ></div>
  );
}

export default LayerSelector;
