import React from 'react';
import loadable from '@loadable/component';
import { getClassName } from '../utils';

const View = (props) => {
  const { data } = props;
  const ArcgisMap = loadable(() => import('../ArcgisMap/ArcgisMap'), {
    noSsr: true,
  });
  return <ArcgisMap theme={data.style} customClass={getClassName(data)} />;
};

export default View;
