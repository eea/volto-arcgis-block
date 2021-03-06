import React from 'react';
import { SidebarPortal } from '@plone/volto/components';
import InlineForm from '@plone/volto/components/manage/Form/InlineForm';
import { UseCaseListSchema } from './UseCaseListSchema';
import loadable from '@loadable/component';
import config from '@eeacms/volto-arcgis-block/components/UseCasesMapViewer/config';

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
      <SidebarPortal selected={selected}>
        <InlineForm
          schema={UseCaseListSchema()}
          title="UseCase List block"
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
