import React from 'react';
import loadable from '@loadable/component';
import { getClassName, getExtraMenu } from '../utils';
import config from '../MapViewer/config';
const View = (props) => {
  const { data, id } = props;
  // const ArcgisMap = loadable(() => import('../ArcgisMap/ArcgisMap'), {
  //   noSsr: true,
  // });
  // const ExtraComponent = getExtraMenu(data);
  const MapViewer = loadable(() => import('../MapViewer/MapViewer'), {
    noSsr: true,
  });
  return (
    // <ArcgisMap
    //   theme={data.style}
    //   customClass={getClassName(data)}
    //   id={id}
    //   extraMenu={ExtraComponent ? <ExtraComponent /> : null}
    // />

    <MapViewer
      cfg={config}
      customClass={getClassName(data)}
      id={id}
    ></MapViewer>
  );
};

export default View;
