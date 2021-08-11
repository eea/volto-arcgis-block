const config = {
  Map: {
    div: 'mapDiv',
    center: [15, 50],
    zoom: 3,
  },
  Services: {
    RegionLayer: 'https://bm-eugis.tk/arcgis/rest/services/CLMS/UseCasesRegion/MapServer/0',
    SpatialCoverageLayer: 'https://bm-eugis.tk/arcgis/rest/services/CLMS/UseCasesSpatialCoverage/MapServer/0',
    QueryService: 'https://bm-eugis.tk/arcgis/rest/services/CLMS/UseCasesSpatialCoverage/MapServer/0/query',
  },
};
export default config;
