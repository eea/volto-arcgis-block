const config = {
  Map: {
    div: 'mapDiv',
    center: [15, 50],
    zoom: 3,
    minZoom: 3,
    maxZoom: 20,
  },
  Components: [
    {
      ComponentTitle: 'Land Cover and Land Use Mapping',
      Products: [],
    },
    {
      ComponentTitle: 'Thematic Hotspot Mapping',
      Products: [
        {
          ProductTitle: 'Coastal Zones',
          Datasets: [
            {
              DatasetId: 'copernicus_v_3035_10_m_cz-2012_p_2010-2014_v01_r00',
              DatasetTitle: 'Coastal Zones 2012',
              DatasetDescription:
                'The Coastal Zones (CZ) LC/LU product for 2012 is providing a detailed Land Cover / Land Use (LC/ LU) dataset for areas along the coastline of the EEA38 countries and the United Kingdom, with reference year 2012 for the classification. This product monitors landscape dynamics in European coastal territory to an inland depth of 10 km with a total area of approximately 730,000 km², with all the relevant areas (estuaries, coastal lowlands, nature reserves). The production of the coastal zone layers was coordinated by the European Environment Agency (EEA) in the frame of the EU Copernicus programme, as part of the Copernicus Land Monitoring Service (CLMS) Local Component.The Coastal Zones product covers a buffer zone of coastline derived from EU-Hydro v1.1. Land Cover/Land Use (LC/LU) layer is extracted from Very High Resolution (VHR) satellite data and other available data. The class definitions follow the pre-defined nomenclature on the basis of Mapping and Assessment of Ecosystems and their Services (MAES) typology of ecosystems (Level 1 to Level 4) and CORINE Land Cover adapted to the specific characteristics of coastal zones. The classification provides 71 distinct thematic classes with a Minimum Mapping Unit (MMU) of 0.5 ha and a Minimum Mapping Width (MMW) of 10 m. The product is available for the 2012 and 2018 reference year including change mapping.This CZ dataset is distributed in vector format, in a single OGC GeoPackage SQLite file covering the area of interest.',
              ViewService:
                'https://image.discomap.eea.europa.eu/arcgis/services/CoastalZones/CZ_CoastalZones_2012/MapServer/WmsServer?',
              Default_active: true,
              Layer: [
                {
                  LayerId: 'Coastal_Zones_2012_vector53031',
                  Title: 'Coastal Zones 2012 vector',
                  Default_active: false,
                },
                {
                  LayerId: 'Coastal_Zones_2012_raster55645',
                  Title: 'Coastal Zones 2012 raster',
                  Default_active: false,
                },
              ],
              DownloadService: 'EEA',
              DownloadType: 'ESRI REST service',
              IsTimeSeries: false,
              TimeSeriesService: '',
            },
            {
              DatasetId: 'copernicus_v_3035_10_m_cz-2018_p_2017-2019_v01_r00',
              DatasetTitle: 'Coastal Zones 2018',
              DatasetDescription:
                'The Coastal Zones (CZ) LC/LU product for 2018 is providing a detailed Land Cover / Land Use (LC/ LU) dataset for areas along the coastline of the EEA38 countries and the United Kingdom, with reference year 2018 for the classification. This product monitors landscape dynamics in European coastal territory to an inland depth of 10 km with a total area of approximately 730,000 km², with all the relevant areas (estuaries, coastal lowlands, nature reserves). The production of the coastal zone layers was coordinated by the European Environment Agency (EEA) in the frame of the EU Copernicus programme, as part of the Copernicus Land Monitoring Service (CLMS) Local Component. The Coastal Zones product covers a buffer zone of coastline derived from EU-Hydro v1.1. Land Cover/Land Use (LC/LU) layer is extracted from Very High Resolution (VHR) satellite data and other available data. The class definitions follow the pre-defined nomenclature on the basis of Mapping and Assessment of Ecosystems and their Services (MAES) typology of ecosystems (Level 1 to Level 4) and CORINE Land Cover adapted to the specific characteristics of coastal zones. The classification provides 71 distinct thematic classes with a Minimum Mapping Unit (MMU) of 0.5 ha and a Minimum Mapping Width (MMW) of 10 m. The product is available for the 2012 and 2018 reference year including change mapping. This CZ dataset is distributed in vector format, in a single OGC GeoPackage SQLite file covering the area of interest.',
              ViewService:
                'https://image.discomap.eea.europa.eu/arcgis/services/CoastalZones/CZ_CoastalZones_2018/MapServer/WmsServer?',
              Default_active: true,
              Layer: [
                {
                  LayerId: 'Coastal_Zones_2018_vector57533',
                  Title: 'Coastal Zones 2018 vector',
                  Default_active: false,
                },
                {
                  LayerId: 'Coastal_Zones_2018_raster65095',
                  Title: 'Coastal Zones 2018 raster',
                  Default_active: true,
                },
              ],
              DownloadService: 'EEA',
              DownloadType: 'ESRI REST service',
              IsTimeSeries: false,
              TimeSeriesService: '',
            },
            {
              DatasetId:
                'copernicus_v_3035_10_m_czc-2012-2018_p_2010-2019_v01_r00',
              DatasetTitle: 'Coastal Zones Change 2012-2018',
              DatasetDescription:
                'The Coastal Zones LC/LU Change (CZC) 2012-2018 is providing the Land Cover / Land Use (LC/ LU) change for areas along the coastline of the EEA38 countries and the United Kingdom, between the reference years 2012 and 2018. The Coastal Zones product monitors landscape dynamics in European coastal territory to an inland depth of 10 km with a total area of approximately 730,000 km², with all the relevant areas (estuaries, coastal lowlands, nature reserves). The production of the coastal zone layers was coordinated by the European Environment Agency (EEA) in the frame of the EU Copernicus programme, as part of the Copernicus Land Monitoring Service (CLMS) Local Component. The Coastal Zones Change product covers a buffer zone of coastline derived from EU-Hydro v1.1. The Land Cover/Land Use (LC/LU) Change layer is extracted from Very High Resolution (VHR) satellite data and other available data. The reference years for the change are 2012 and 2018. The class definitions follow the pre-defined nomenclature on the basis of Mapping and Assessment of Ecosystems and their Services (MAES) typology of ecosystems (Level 1 to Level 4) and CORINE Land Cover adapted to the specific characteristics of coastal zones. The classification provides 71 distinct thematic classes with a Minimum Mapping Unit (MMU) of 0.5 ha and a Minimum Mapping Width (MMW) of 10 m. The status product is available for the 2012 and 2018 reference years. This CZC dataset is distributed in vector format, in a single OGC GeoPackage file covering the area of interest.',
              ViewService:
                'https://image.discomap.eea.europa.eu/arcgis/services/CoastalZones/CZ_CoastalZonesChange_2012_2018/MapServer/WmsServer?',
              Default_active: false,
              Layer: [
                {
                  LayerId: 'Coastal_Zones_Change_2012-2018_vector17215',
                  Title: 'Coastal Zones Change 2012-2018 vector',
                  Default_active: false,
                },
                {
                  LayerId: 'Coastal_Zones_Change_2012-2018_raster20357',
                  Title: 'Coastal Zones Change 2012-2018 raster',
                  Default_active: false,
                },
              ],
              DownloadService: 'EEA',
              DownloadType: 'ESRI REST service',
              IsTimeSeries: false,
              TimeSeriesService: '',
            },
          ],
        },
      ],
    },
    {
      ComponentTitle: 'Biophysical Parameters',
      Products: [
        {
          ProductTitle: 'High Resolution Snow and Ice Monitoring',
          Datasets: [
            {
              DatasetId:
                'copernicus_r_utm-wgs84_20_m_fsc_p_2016-ongoing_v01_r00',
              DatasetTitle:
                'Copernicus High Resolution Snow and Ice Monitoring: Fractional Snow Cover',
              DatasetDescription:
                'The Copernicus Fractional Snow Cover (FSC) product is generated in near real-time for the entire EEA38 and the United Kingdom, based on optical satellite data from the Sentinel-2 constellation (revisit time: 5 days with Sentinel-2A and Sentinel-2B). The product provides the fraction of the surface covered by snow at the top of canopy (FSC-TOC) and on ground (FSC-OG) per pixel as a percentage (0% – 100%) with a spatial resolution of 20 m x 20 m. The FSC is one of the products of the pan-European High-Resolution Snow & Ice service (HR-S&I), which are provided at high spatial resolution (20 m x 20 m), and are derived from the Sentinel-2 constellation data. They are generated over the entire EEA38 (32 member countries and 6 cooperating countries) and the United Kingdom, from September 1, 2016 onwards. Four types of HR-S&I products are proposed to users: the Fractional Snow Cover (FSC) product, the Persistent Snow Area (PSA) product, the River and Lake Ice Extent (RLIE) product and the Aggregated River and Lake Ice Extent (ARLIE) product. The FSC product is distributed in raster files covering an area of 110 km by 110 km with a pixel size of 20 m by 20 m in UTM/WGS84 projection, which corresponds to the Sentinel-2 input L1C product tile. Each product is composed of seven separate files corresponding to the different layers of the product, and another metadata file.',
              ViewService: 'https://cryo.land.copernicus.eu/wms/FSC/?',
              Default_active: true,
              Layer: [
                {
                  LayerId: '1_FSC_TOC',
                  Title: 'FSC_TOC',
                  Default_active: true,
                },
                {
                  LayerId: '2_FSC_QC_TOC',
                  Title: 'FSC_QC_TOC',
                  Default_active: true,
                },
                {
                  LayerId: '3_FSC_OG',
                  Title: 'FSC_OG',
                  Default_active: false,
                },
                {
                  LayerId: '4_FSC_QC_OG',
                  Title: 'FSC_QC_OG',
                  Default_active: false,
                },
                {
                  LayerId: '5_FSC_NDSI',
                  Title: 'FSC_NDSI',
                  Default_active: false,
                },
                {
                  LayerId: '6_FSC_CLD',
                  Title: 'FSC_CLD',
                  Default_active: false,
                },
                {
                  LayerId: '7_FSC_QC_FLAGS',
                  Title: 'FSC_QC_FLAGS',
                  Default_active: false,
                },
              ],
              DownloadService: 'WEKEO',
              DownloadType: 'REST API',
              IsTimeSeries: true,
              TimeSeriesService: 'https://cryo.land.copernicus.eu/wms/FSC/?',
            },
            {
              DatasetId:
                'copernicus_r_utm-wgs84_20_m_rlie_p_2016-ongoing_v01_r00',
              DatasetTitle:
                'Copernicus High Resolution Snow and Ice Monitoring: River and Lake Ice Extent',
              DatasetDescription:
                'The Copernicus River and Lake Ice Extent (RLIE) product is generated in near real-time for the entire EEA38 and the United Kingdom based on optical satellite data from the Sentinel-2 constellation (revisit time: 5 days with Sentinel-2A and Sentinel-2B). The product provides the river and lake area covered by snow-covered or snow-free ice with a spatial resolution of 20 m x 20 m. The RLIE is one of the products of the pan-European High-Resolution Snow & Ice service (HR-S&I), which are provided at high spatial resolution (20 m x 20 m), and are derived from the Sentinel-2 constellation data. They are generated over the entire EEA38 (32 member countries and 6 cooperating countries) and the United Kingdom, from September 1, 2016 onwards. Four types of HR-S&I products are proposed to users: the Fractional Snow Cover (FSC) product, the Persistent Snow Area (PSA) product, the River and Lake Ice Extent (RLIE) product and the Aggregated River and Lake Ice Extent (ARLIE) product. Each RLIE product covers an area of 110 km x 110 km with a pixel size of 20 m x 20 m in UTM/WGS84, aligned with the Sentinel-2 input L1C product, over the entire EEA38 and the United Kingdom area and within the EU-Hydro polygon features. Each RLIE product is composed of three separate files corresponding to the different layers of the product, and a metadata file.',
              ViewService: 'https://cryo.land.copernicus.eu/wms/RLIE/?',
              Default_active: false,
              Layer: [
                {
                  LayerId: '1_RLIE',
                  Title: 'RLIE',
                  Default_active: true,
                },
                {
                  LayerId: '2_RLIE_QC',
                  Title: 'RLIE_QC',
                  Default_active: false,
                },
                {
                  LayerId: '3_RLIE_QC_FLAGS',
                  Title: 'RLIE_QC_FLAGS',
                  Default_active: false,
                },
              ],
              DownloadService: 'WEKEO',
              DownloadType: 'REST API',
              IsTimeSeries: true,
              TimeSeriesService: 'https://cryo.land.copernicus.eu/wms/RLIE/?',
            },
          ],
        },
      ],
    },
    {
      ComponentTitle: 'Imagery, In Situ and Reference Data',
      Products: [],
    },
    {
      ComponentTitle: 'European Ground Motion Service',
      Products: [],
    },
  ],
};
export default config;
