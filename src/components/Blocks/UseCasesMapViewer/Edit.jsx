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
