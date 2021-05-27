import React from 'react';
import loadable from '@loadable/component';
import { getClassName, getExtraMenu } from '../utils';

const View = (props) => {
  const { data, id } = props;
  const ArcgisMap = loadable(() => import('../ArcgisMap/ArcgisMap'), {
    noSsr: true,
  });
  const ExtraComponent = getExtraMenu(data);
  return (
    <ArcgisMap
      theme={data.style}
      customClass={getClassName(data)}
      id={id}
      extraMenu={ExtraComponent ? <ExtraComponent /> : null}
    />
  );
};

export default View;
