import React, { useState, useEffect } from 'react';
import ArcgisMap from '../ArcgisMap/ArcgisMap';
// import ReactDOM from 'react-dom';
// import loadable from '@loadable/component';
const View = (props) => {
  // const ArcgisMap = loadable(() => import('../ArcgisMap/ArcgisMap'), {
  //   noSsr: true,
  // });
  return <ArcgisMap />;
};

export default View;
