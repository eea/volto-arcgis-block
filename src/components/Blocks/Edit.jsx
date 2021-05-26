import React from 'react';
import { SidebarPortal } from '@plone/volto/components';
import InlineForm from '@plone/volto/components/manage/Form/InlineForm';
import { Schema } from './Schema';
import loadable from '@loadable/component';
import { getClassName } from '../utils';

const Edit = (props) => {
  const { block, data, onChangeBlock, selected } = props;
  const ArcgisMap = loadable(() => import('../ArcgisMap/ArcgisMap'), {
    noSsr: true,
  });
  return (
    <>
      <ArcgisMap
        darkMode={data.style === 'dark' ? true : false}
        customClass={getClassName(data)}
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
