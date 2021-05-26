import React from 'react';
// import ArcgisMap from '../ArcgisMap/ArcgisMap';
import { SidebarPortal } from '@plone/volto/components';
import InlineForm from '@plone/volto/components/manage/Form/InlineForm';
import { Schema } from './Schema';
import loadable from '@loadable/component';
import config from '@plone/volto/registry';

const Edit = (props) => {
  const { block, data, onChangeBlock, selected } = props;
  console.log('DATA: ', data);
  const class_style = data.customClass || 'default';
  console.log('class_style: ', class_style);
  const customClass = () =>
    config.blocks.blocksConfig['arcgis_block'].templates?.[class_style]
      ?.customClass;
  // // console.log('config.blocks.blocksConfig: ', config.blocks.blocksConfig);
  console.log('customClass: ', customClass());

  const ArcgisMap = loadable(() => import('../ArcgisMap/ArcgisMap'), {
    noSsr: true,
  });
  return (
    <>
      <ArcgisMap
        darkMode={data.style === 'dark' ? true : false}
        // classStyle={templateSchema()}
        customClass={customClass()}
      />
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
