import React from 'react';
import loadable from '@loadable/component';
import { getClassName } from '../utils';
import config from '../MapViewer/config';
const View = (props) => {
  const { data, id } = props;

  const MapViewer = loadable(() => import('../MapViewer/MapViewer'), {
    noSsr: true,
  });

  return (
    <MapViewer
      cfg={config}
      url={props.properties.parent['@id'] + '/@mapviewer'}
      customClass={getClassName(data)}
      id={id}
    ></MapViewer>
  );
};

export default View;
