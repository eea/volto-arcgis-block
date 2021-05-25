import React from 'react';
// import ArcgisMap from '../ArcgisMap/ArcgisMap';
import { SidebarPortal } from '@plone/volto/components';
import InlineForm from '@plone/volto/components/manage/Form/InlineForm';
import { Schema } from './Schema';
import loadable from '@loadable/component';

const Edit = (props) => {
  const { block, data, onChangeBlock, selected } = props;
  console.log("Data: ", data)
  const ArcgisMap = loadable(() => import('../ArcgisMap/ArcgisMap'), {
    noSsr: true,
  });
  return (
    <>
      <ArcgisMap darkMode={data.style === 'dark' ? true : false} />
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
