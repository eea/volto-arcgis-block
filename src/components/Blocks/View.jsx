import React from 'react';
import loadable from '@loadable/component';

const View = (props) => {
  const { data } = props;
  const ArcgisMap = loadable(() => import('../ArcgisMap/ArcgisMap'), {
    noSsr: true,
  });
  return <ArcgisMap darkMode={data.style === 'dark' ? true : false} />;
};

export default View;
