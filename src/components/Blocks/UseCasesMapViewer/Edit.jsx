import React from 'react';
import loadable from '@loadable/component';
import config from '@eeacms/volto-arcgis-block/components/USeCasesMapViewer/config';

const Edit = (props) => {
  const { block, data, onChangeBlock, selected } = props;

  const UseCasesMapViewer = loadable(
    () => import('../../UseCasesMapViewer/UseCasesMapViewer'),
    {
      noSsr: true,
    },
  );

  return (
    <>
      <UseCasesMapViewer cfg={config} />{' '}
    </>
  );
};

export default Edit;
