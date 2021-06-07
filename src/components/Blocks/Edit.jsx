import React from 'react';
import { SidebarPortal } from '@plone/volto/components';
import InlineForm from '@plone/volto/components/manage/Form/InlineForm';
import { Schema } from './Schema';
import loadable from '@loadable/component';
import { getClassName, getExtraMenu } from '../utils';

// var cfg = require('./config.json');
import config from '../MapViewer/config';

const Edit = (props) => {
  const { block, data, onChangeBlock, selected } = props;

  // const ArcgisMap = loadable(() => import('../ArcgisMap/ArcgisMap'), {
  //   noSsr: true,
  // });
  const MapViewer = loadable(() => import('../MapViewer/MapViewer'), {
    noSsr: true,
  });
  // const ExtraComponent = getExtraMenu(data);
  return (
    <>
      {/* <ArcgisMap
        theme={data.style}
        customClass={getClassName(data)}
        extraMenu={ExtraComponent ? <ExtraComponent /> : null}
        id={block}
      /> */}
      <MapViewer
        cfg={config}
        customClass={getClassName(data)}
        id={block}
      ></MapViewer>
      <SidebarPortal selected={selected}>
        <InlineForm
          schema={Schema()}
          title="Button component block"
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
