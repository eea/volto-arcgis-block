import React from 'react';
import loadable from '@loadable/component';
import { getClassName } from '@eeacms/volto-arcgis-block/components/utils';
import config from '@eeacms/volto-arcgis-block/components/MapViewer/config';
const View = (props) => {
  const { data, id } = props;

  const MapViewer = loadable(
    () => import('@eeacms/volto-arcgis-block/components/MapViewer/MapViewer'),
    {
      noSsr: true,
    },
  );

  return (
    <MapViewer
      cfg={config}
      url={props.properties.parent['@id']}
      customClass={getClassName(data)}
      id={id}
    ></MapViewer>
  );
};

export default View;
