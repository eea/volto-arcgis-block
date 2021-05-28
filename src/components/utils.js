// import { useState, useCallback } from 'react';
import config from '@plone/volto/registry';

// export function useForceUpdate() {
//   const [, setTick] = useState(0);
//   const update = useCallback(() => {
//     setTick((tick) => tick + 1);
//   }, []);
//   return update;
// }

export function getClassName(data) {
  const class_style = data.customClass || 'default';
  return config.blocks.blocksConfig['arcgis_block'].styles?.[class_style]
    ?.customClass;
}

export function getExtraMenu(data) {
  const extra_menu = data.extraMenu || 'default';
  return config.blocks.blocksConfig['arcgis_block'].extraMenu?.[extra_menu]
    ?.component;
}

export function getTheme(theme) {
  return `https://js.arcgis.com/4.19/@arcgis/core/assets/esri/themes/${theme}/main.css`;
}
