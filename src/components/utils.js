import { useState, useCallback } from 'react';
import config from '@plone/volto/registry';

export const isServer = !(
  typeof window !== 'undefined' &&
  window.document &&
  window.document.createElement
);

export function useForceUpdate() {
  const [, setTick] = useState(0);
  const update = useCallback(() => {
    setTick((tick) => tick + 1);
  }, []);
  return update;
}

export function getClassName(data) {
  const class_style = data.customClass || 'default';
  return config.blocks.blocksConfig['arcgis_block'].styles?.[class_style]
    ?.customClass;
}
