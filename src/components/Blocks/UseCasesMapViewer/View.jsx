import React from 'react';
import loadable from '@loadable/component';
import { getClassName } from '@eeacms/volto-arcgis-block/components/utils';
import config from '@eeacms/volto-arcgis-block/components/UseCasesMapViewer/config';
const View = (props) => {
  const { data, id } = props;

  const UseCasesMapViewer = loadable(
    () =>
      import(
        '@eeacms/volto-arcgis-block/components/UseCasesMapViewer/UseCasesMapViewer'
      ),
    {
      noSsr: true,
    },
  );

  return (
    <UseCasesMapViewer
      cfg={config}
      url={props.properties.parent['@id'] + '/@mapviewer'}
      customClass={getClassName(data)}
      id={id}
    ></UseCasesMapViewer>
  );
};

export default View;
