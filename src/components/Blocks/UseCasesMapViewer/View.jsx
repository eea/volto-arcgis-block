import React from 'react';
import loadable from '@loadable/component';
const View = (props) => {
  // const { data, id } = props;

  const UseCasesMapViewer = loadable(
    () =>
      import(
        '@eeacms/volto-arcgis-block/components/UseCasesMapViewer/UseCasesMapViewer'
      ),
    {
      noSsr: true,
    },
  );

  return <UseCasesMapViewer {...props}></UseCasesMapViewer>;
};

export default View;
