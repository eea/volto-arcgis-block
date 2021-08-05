import React from 'react';
import { SidebarPortal } from '@plone/volto/components';
import InlineForm from '@plone/volto/components/manage/Form/InlineForm';
import { Schema } from './Schema';
import loadable from '@loadable/component';
import { getClassName } from '@eeacms/volto-arcgis-block/components/utils';

// var cfg = require('./config.json');
import config from '@eeacms/volto-arcgis-block/components/MapViewer/config';

const Edit = (props) => {
  const { block, data, onChangeBlock, selected } = props;

  const MapViewer = loadable(
    () => import('@eeacms/volto-arcgis-block/components/MapViewer/MapViewer'),
    {
      noSsr: true,
    },
  );
  // const ExtraComponent = getExtraMenu(data);
  return (
    <>
      <MapViewer
        cfg={config}
        url={props.properties.parent['@id'] + '/@mapviewer'}
        customClass={getClassName(data)}
        id={block}
        // extraComponent={ExtraComponent ? <ExtraComponent /> : null}
      ></MapViewer>
      <SidebarPortal selected={selected}>
        <InlineForm
          schema={Schema()}
          title="Arcgis map component block"
          onChangeField={(id, value) => {
            onChangeBlock(block, {
              ...data,
              [id]: value,
            });
          }}
          formData={data}
        />
      </SidebarPortal>
    </>
  );
};

export default Edit;