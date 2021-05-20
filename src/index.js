import BlocksConfig from '@eeacms/volto-arcgis-block/components/Blocks/BlocksConfig';
const applyConfig = (config) => {
  config.blocks = {
    ...config.blocks,
    blocksConfig: { ...BlocksConfig(config) },
  };
  return config;
};

export default applyConfig;
