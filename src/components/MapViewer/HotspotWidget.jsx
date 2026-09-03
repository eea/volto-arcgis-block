import React, { createRef } from 'react';
import { loadModules } from 'esri-loader';

var WMSLayer, esriRequest, Extent;

class HotspotWidget extends React.Component {
  /**
   * Creator of the Hotspot widget class
   * @param {*} props
   */
  constructor(props) {
    super(props);
    //We create a reference to a DOM element to be mounted
    this.container = createRef();
    //Initially, we set the state of the component to
    //not be showing the basemap panel
    this.state = {
      showMapMenu: false,
      activeLayers: {},
      selectedArea: null,
      lcYear: null,
      lccYear: null,
      activeLayersArray: [],
    };
    this.menuClass =
      'esri-icon-filter esri-widget--button esri-widget esri-interactive';
    this.dataKlc_code = null;
    this.esriLayer_lcc = null;
    this.esriLayer_lcc2 = null;
    this.esriLayer_lc = null;
    this.esriLayer_lc2 = null;
    this.esriLayer_klc = null;
    this.esriLayer_klc2 = null;
    this.esriLayer_pa = null;
    this.esriLayer_pa2 = null;
    this.subscribedLayers = sessionStorage;
    this.dataBBox = [];
    this.dataJSONNames = [];
    this.klcHighlightsArray = [];
    this.renderPresentLandCover = this.renderPresentLandCover.bind(this);
    this.renderLandCoverChange = this.renderLandCoverChange.bind(this);
    this.getLayerParameters = this.getLayerParameters.bind(this);
    this.getKLCNames = this.getKLCNames.bind(this);
    this.layerModelInit = this.layerModelInit.bind(this);
    this.getBBoxData = this.getBBoxData.bind(this);
    this.handleApplyFilter = this.handleApplyFilter.bind(this);
    this.filteredLayersToHotspotData =
      this.filteredLayersToHotspotData.bind(this);
    this.mapCfg = this.props.mapCfg;
    this.selectedArea = null;
    this.lcYear = null;
    this.lccYear = null;
    this.urls = this.props.urls;
    this.layers = this.props.selectedLayers;
    this.arcgisEventHandles = [];
    this._isMounted = false;
  }

  loader() {
    return loadModules([
      'esri/layers/WMSLayer',
      'esri/request',
      'esri/geometry/Extent',
    ]).then(([_WMSLayer, _esriRequest, _Extent]) => {
      WMSLayer = _WMSLayer;
      esriRequest = _esriRequest;
      Extent = _Extent;
    });
  }

  getBBoxData = () => {
    const url =
      window.location.href.replace(window.location.pathname.substring(3), '') +
      this.props.urls.klc_bbox;
    return esriRequest(url, {
      responseType: 'json',
    })
      .then((response) => {
        const responseJSON = response.data;
        if (Array.isArray(responseJSON)) {
          this.dataBBox = responseJSON;
        } else {
          this.dataBBox = [];
        }
      })
      .catch(async () => {
        try {
          const res = await fetch(url, { credentials: 'same-origin' });
          const text = await res.text();
          const start = text.indexOf('[');
          const end = text.lastIndexOf(']');
          if (start !== -1 && end !== -1) {
            const json = JSON.parse(text.substring(start, end + 1));
            this.dataBBox = Array.isArray(json) ? json : [];
          } else {
            this.dataBBox = [];
          }
        } catch (_) {
          this.dataBBox = [];
        }
      });
  };

  setBBoxCoordinates = (data) => {
    if (!data || !Array.isArray(data)) return;
    let klc_array = data.find((e) => e.klc_code === this.dataKlc_code);
    if (!klc_array || !klc_array.bbox) return;
    let klc_bbox_coordinates = klc_array.bbox.split(',');
    let xmin_ymin = klc_bbox_coordinates[0].split(' ');
    let xmax_ymax = klc_bbox_coordinates[1].split(' ');

    let constraintExtent = new Extent({
      xmin: this.mapCfg.geometryZoomIn.xmin,
      ymin: this.mapCfg.geometryZoomIn.ymin,
      xmax: this.mapCfg.geometryZoomIn.xmax,
      ymax: this.mapCfg.geometryZoomIn.ymax,
      spatialReference: 4326,
    });
    this.props.view.constraints.geometry = constraintExtent;

    const regionExtent = new Extent({
      xmin: Number(xmin_ymin[0]) * 0.99,
      ymin: Number(xmin_ymin[1]) * 0.99,
      xmax: Number(xmax_ymax[0]) * 1.01,
      ymax: Number(xmax_ymax[1]) * 1.01,
    });
    this.props.view.goTo(regionExtent);
  };

  addLegendName(legend) {
    let name = legend;
    return name;
  }

  addLegendNameToUrl(legend) {
    const legendLinkUrl = this.urls.legendLinkUrl;
    return legendLinkUrl + legend;
  }

  getHotspotWmsConfig() {
    return {
      endpoint:
        this.urls.hotspotWmsEndpoint ||
        'https://geospatial.jrc.ec.europa.eu/geoserver/hsm/wms',
      version: this.urls.hotspotWmsVersion || '1.1.0',
      srs: this.urls.hotspotWmsSrs || 'EPSG:3857',
      layerNames: this.urls.hotspotWmsLayerNames || {
        lcc: {
          a: 'hsm:lcc_a_pols',
          b: 'hsm:lcc_b_pols',
        },
        lc: {
          a: 'hsm:present_lc_a_pols',
          b: 'hsm:present_lc_b_pols',
        },
        klc: 'hsm:cop_klc',
        pa: 'hsm:protected_areas',
      },
    };
  }

  resolveLayerVariant(activeLayers, type) {
    if (!Array.isArray(activeLayers) || !activeLayers.length) return 'b';
    const hasVariantA = activeLayers.some((layer) =>
      layer.includes(type === 'lcc' ? 'all_lcc_a_pol' : 'all_present_lc_a_pol'),
    );
    return hasVariantA ? 'a' : 'b';
  }

  resolveWmsLayerName(type, variant) {
    const config = this.getHotspotWmsConfig();
    if (type === 'lcc') {
      return config.layerNames.lcc[variant] || config.layerNames.lcc.b;
    }
    if (type === 'lc') {
      return config.layerNames.lc[variant] || config.layerNames.lc.b;
    }
    if (type === 'klc') {
      return config.layerNames.klc;
    }
    if (type === 'pa') {
      return config.layerNames.pa;
    }
    return null;
  }

  buildCqlFilter(klcCode, date) {
    const baseFilter = "klc_code LIKE '" + klcCode + "' AND in_pa LIKE 'not_defined'";
    if (!Number.isFinite(Number(date))) {
      return baseFilter;
    }
    return baseFilter + ' AND date=' + Number(date);
  }

  buildWmsCustomLayerParameters(cqlFilter) {
    const config = this.getHotspotWmsConfig();
    return {
      SERVICE: 'WMS',
      REQUEST: 'GetMap',
      FORMAT: 'image/png',
      TRANSPARENT: 'true',
      tiled: 'true',
      STYLES: '',
      VERSION: config.version,
      SRS: config.srs,
      CQL_FILTER: cqlFilter,
    };
  }

  resolveLccDateOptions(klcCode, selectedLcYear, lccDatesByLcYear, lccDateList) {
    const klcLcDateMap = {
      CAF_02: {
        2016: [2000, 2019],
        2019: [2024],
      },
      CAF_05: {
        2015: [2000, 2019],
        2019: [2024],
      },
    };

    const mappedByKlc = klcLcDateMap[klcCode] || null;
    if (mappedByKlc && Number.isFinite(Number(selectedLcYear))) {
      const mapped = mappedByKlc[Number(selectedLcYear)];
      if (Array.isArray(mapped) && mapped.length) {
        return Array.from(new Set(mapped)).sort((a, b) => a - b);
      }
    }

    const mappedByData = Number.isFinite(Number(selectedLcYear))
      ? lccDatesByLcYear[Number(selectedLcYear)]
      : null;
    if (Array.isArray(mappedByData) && mappedByData.length) {
      return mappedByData;
    }

    return lccDateList;
  }

  layerModelInit() {
    const serviceUrl = this.getHotspotWmsConfig().endpoint;
    this.esriLayer_lcc = new WMSLayer({
      url: serviceUrl,
      version: this.getHotspotWmsConfig().version,
      title: '',
      //featureInfoFormat: "application/json",
      customLayerParameters: this.buildWmsCustomLayerParameters(''),
      sublayers: [
        // LAND COVER CHANGE DATASET ________________________________________________________________________________________________________________
        {
          name: this.addLegendName(this.resolveWmsLayerName('lcc', 'a')),
          legendUrl: this.addLegendNameToUrl('all_lcc_a_pol'),
        },
      ],
    });
    this.esriLayer_lcc = new WMSLayer({
      url: serviceUrl,
      version: this.getHotspotWmsConfig().version,
      title: '',
      //featureInfoFormat: "application/json",
      customLayerParameters: this.buildWmsCustomLayerParameters(''),
      sublayers: [
        // LAND COVER CHANGE DATASET ________________________________________________________________________________________________________________
        {
          name: this.addLegendName(this.resolveWmsLayerName('lcc', 'b')),
          legendUrl: this.addLegendNameToUrl('all_lcc_b_pol'),
        },
      ],
    });
    this.esriLayer_lc = new WMSLayer({
      url: serviceUrl,
      version: this.getHotspotWmsConfig().version,
      title: '',
      //featureInfoFormat: "application/json",
      customLayerParameters: this.buildWmsCustomLayerParameters(''),
      sublayers: [
        // PRESENT LAND COVER DATASET ________________________________________________________________________________________________________________
        {
          name: this.addLegendName(this.resolveWmsLayerName('lc', 'a')),
          legendUrl: this.addLegendNameToUrl('all_present_lc_a_pol'),
        },
      ],
    });
    this.esriLayer_lc = new WMSLayer({
      url: serviceUrl,
      version: this.getHotspotWmsConfig().version,
      title: '',
      //featureInfoFormat: "application/json",
      customLayerParameters: this.buildWmsCustomLayerParameters(''),
      sublayers: [
        // PRESENT LAND COVER DATASET ________________________________________________________________________________________________________________
        {
          name: this.addLegendName(this.resolveWmsLayerName('lc', 'b')),
          legendUrl: this.addLegendNameToUrl('all_present_lc_b_pol'),
        },
      ],
    });
    this.esriLayer_klc = new WMSLayer({
      url: serviceUrl,
      version: this.getHotspotWmsConfig().version,
      title: '',
      //featureInfoFormat: "application/json",
      customLayerParameters: this.buildWmsCustomLayerParameters(''),
      sublayers: [
        {
          name: this.addLegendName(this.resolveWmsLayerName('klc')),
          legendUrl: this.addLegendNameToUrl('cop_klc'),
        },
      ],
    });
    this.esriLayer_pa = new WMSLayer({
      url: serviceUrl,
      version: this.getHotspotWmsConfig().version,
      title: '',
      //featureInfoFormat: "application/json",
      customLayerParameters: this.buildWmsCustomLayerParameters(''),
      sublayers: [
        {
          name: this.addLegendName(this.resolveWmsLayerName('pa')),
          legendUrl: this.addLegendNameToUrl('protected_areas'),
        },
      ],
    });
  }

  addFilteredLayersData(
    filteredLayersData,
    bboxData,
    typeLegend,
    selectBoxTime,
  ) {
    if (!bboxData || !Array.isArray(bboxData)) return;
    if (filteredLayersData[typeLegend] !== undefined) {
      delete filteredLayersData[typeLegend];
    }
    let klc_array = bboxData.find((e) => e.klc_code === this.dataKlc_code);
    if (!klc_array || !klc_array.bbox) return;
    let klc_bbox_coordinates = klc_array.bbox.split(',');
    let xmin_ymin = klc_bbox_coordinates[0].split(' ');
    let xmax_ymax = klc_bbox_coordinates[1].split(' ');
    filteredLayersData[typeLegend] = {
      klc_code: this.dataKlc_code,
      year: selectBoxTime,
      bboxData: {
        klc_array: klc_array,
        klc_bbox_coordinates: {
          xmin_ymin: xmin_ymin,
          xmax_ymax: xmax_ymax,
        },
      },
    };
  }

  async handleApplyFilter(typeFilter) {
    let typeLegend;
    let title;
    let activeLayers =
      this.props.hotspotData && this.props.hotspotData['activeLayers']
        ? Object.keys(this.props.hotspotData['activeLayers'])
        : [];
    let filteredLayers =
      this.props.hotspotData && this.props.hotspotData['filteredLayers']
        ? Object.keys(this.props.hotspotData['filteredLayers'])
        : [];
    let filteredLayersData =
      (this.props.hotspotData && this.props.hotspotData['filteredLayerData']) ||
      [];
    let layersToAdd = {};
    let bookmarkHotspotFilter = JSON.parse(
      localStorage.getItem('bookmarkHotspotFilter'),
    );
    typeFilter.forEach((type) => {
      let filterLayer;

      if (type === 'lcc') {
        let selectLccBoxTime =
          document.getElementById('select-klc-lccTime').value;
        //this.lccYear = selectLccBoxTime;
        this.setState({ lccYear: selectLccBoxTime });
        if (document.getElementById('select-klc-lccTime').value.match(/\d+/g)) {
          var selectBoxHighlightsLcc = document
            .getElementById('select-klc-lccTime')
            .value.match(/\d+/g)
            .map(Number)[0];
        }
        const layerVariant = this.resolveLayerVariant(activeLayers, 'lcc');
        typeLegend =
          layerVariant === 'a' ? 'all_lcc_a_pol' : 'all_lcc_b_pol';
        title =
          layerVariant === 'a'
            ? 'Dichotomous Land Cover Change in selected Hot Spots'
            : 'Modular Land Cover Change in selected Hot Spots';

        this.addFilteredLayersData(
          filteredLayersData,
          this.dataBBox,
          typeLegend,
          selectLccBoxTime,
        );

        filterLayer = this.esriLayer_lcc;

        filterLayer.sublayers.items[0].name = this.addLegendName(
          this.resolveWmsLayerName('lcc', layerVariant),
        );
        filterLayer.sublayers.items[0].legendUrl =
          this.addLegendNameToUrl(typeLegend);
        filterLayer.sublayers.items[0].title = title;
        if (
          bookmarkHotspotFilter !== null &&
          bookmarkHotspotFilter.filteredLayers &&
          bookmarkHotspotFilter.filteredLayers['lcc_filter'] !== undefined
        ) {
          filterLayer.customLayerParameters = this.buildWmsCustomLayerParameters(
            bookmarkHotspotFilter.filteredLayers['lcc_filter'],
          );
        } else {
          filterLayer.customLayerParameters = this.buildWmsCustomLayerParameters(
            this.buildCqlFilter(this.dataKlc_code, selectBoxHighlightsLcc),
          );
        }
      }
      if (type === 'lc') {
        const layerVariant = this.resolveLayerVariant(activeLayers, 'lc');
        typeLegend =
          layerVariant === 'a'
            ? 'all_present_lc_a_pol'
            : 'all_present_lc_b_pol';
        title =
          layerVariant === 'a'
            ? 'Dichotomous Present Land Cover in selected Hot Spots'
            : 'Modular Present Land Cover in selected Hot Spots';

        let selectLcBoxTime =
          document.getElementById('select-klc-lcTime').value;

        this.addFilteredLayersData(
          filteredLayersData,
          this.dataBBox,
          typeLegend,
          selectLcBoxTime,
        );

        //this.lcYear = selectLcBoxTime;
        this.setState({ lcYear: selectLcBoxTime });
        if (document.getElementById('select-klc-lcTime').value.match(/\d+/g)) {
          var selectBoxHighlightsLc = document
            .getElementById('select-klc-lcTime')
            .value.match(/\d+/g)
            .map(Number)[0];
        }

        filterLayer = this.esriLayer_lc;

        filterLayer.sublayers.items[0].name = this.addLegendName(
          this.resolveWmsLayerName('lc', layerVariant),
        );
        filterLayer.sublayers.items[0].legendUrl =
          this.addLegendNameToUrl(typeLegend);
        filterLayer.sublayers.items[0].title = title;
        if (
          bookmarkHotspotFilter !== null &&
          bookmarkHotspotFilter.filteredLayers &&
          bookmarkHotspotFilter.filteredLayers['lc_filter'] !== undefined
        ) {
          filterLayer.customLayerParameters = this.buildWmsCustomLayerParameters(
            bookmarkHotspotFilter.filteredLayers['lc_filter'],
          );
        } else {
          filterLayer.customLayerParameters = this.buildWmsCustomLayerParameters(
            this.buildCqlFilter(this.dataKlc_code, selectBoxHighlightsLc),
          );
        }
      }
      if (type === 'klc') {
        title = 'Key Landscapes for Conservation borders in selected Hot Spots';
        if (
          bookmarkHotspotFilter !== null &&
          bookmarkHotspotFilter.filteredLayers &&
          bookmarkHotspotFilter.filteredLayers['klc_filter'] !== undefined
        ) {
          this.esriLayer_klc.customLayerParameters =
            this.buildWmsCustomLayerParameters(
              bookmarkHotspotFilter.filteredLayers['klc_filter'],
            );
        } else {
          this.esriLayer_klc.customLayerParameters =
            this.buildWmsCustomLayerParameters(
              "klc_code LIKE '" + this.dataKlc_code + "'",
            );
        }
        filterLayer = this.esriLayer_klc;
        filterLayer.sublayers.items[0].name = this.addLegendName(
          this.resolveWmsLayerName('klc'),
        );
        filterLayer.sublayers.items[0].title = title;
      }
      if (type === 'pa') {
        title =
          'Protected Areas in Key Landscapes for Conservation borders in selected Hot Spots';
        if (
          bookmarkHotspotFilter !== null &&
          bookmarkHotspotFilter.filteredLayers &&
          bookmarkHotspotFilter.filteredLayers['pa_filter'] !== undefined
        ) {
          this.esriLayer_pa.customLayerParameters =
            this.buildWmsCustomLayerParameters(
              bookmarkHotspotFilter.filteredLayers['pa_filter'],
            );
        } else {
          this.esriLayer_pa.customLayerParameters =
            this.buildWmsCustomLayerParameters(
              "klc_code LIKE '" + this.dataKlc_code + "'",
            );
        }
        filterLayer = this.esriLayer_pa;
        filterLayer.sublayers.items[0].name = this.addLegendName(
          this.resolveWmsLayerName('pa'),
        );
        filterLayer.sublayers.items[0].title = title;
      }
      layersToAdd[type + '_filter'] = filterLayer;
    });
    activeLayers.forEach((activeLayer) => {
      let layerId = Object.keys(this.layers).find((key) =>
        key.includes(activeLayer),
      );
      if (layerId !== undefined) this.layers[layerId].visible = false;
      let layer = this.props.map.findLayerById(layerId);
      if (layer !== undefined) {
        layer.clear();
        layer.destroy();
        this.props.map.remove(layer);
      }
    });
    filteredLayers.forEach((filteredLayer) => {
      let layerId = Object.keys(this.layers).find((key) =>
        key.includes(filteredLayer),
      );
      if (layerId !== undefined) this.layers[layerId].visible = false;
      let layer = this.props.map.findLayerById(layerId);
      if (layer !== undefined) {
        layer.clear();
        layer.destroy();
        this.props.map.remove(layer);
      }
    });
    this.props.map.addMany(Object.values(layersToAdd));
    Object.keys(layersToAdd).forEach((key) => {
      this.layers[key] = layersToAdd[key];
      this.layers[key].visible = true;
    });
    if (
      bookmarkHotspotFilter === null ||
      Object.keys(bookmarkHotspotFilter?.filteredLayers).length === 0
    ) {
      this.setBBoxCoordinates(this.dataBBox);
    }
    //set sessionStorage value to keep the widget open
    sessionStorage.setItem('hotspotFilterApplied', 'true');
    this.disableButton();
    this.props.mapLayersHandler(this.layers);
    this.filteredLayersToHotspotData(
      Object.keys(layersToAdd),
      filteredLayersData,
    );
  }

  filteredLayersToHotspotData(layerIds, layersData) {
    let updatedFilteredLayers =
      (this.props.hotspotData && this.props.hotspotData['filteredLayers']) ||
      {};
    let filteredLayersData =
      (this.props.hotspotData &&
        this.props.hotspotData['filteredLayersData']) ||
      {};
    let newHotspotData = this.props.hotspotData || {};
    layerIds.forEach((layerId) => {
      let layer = Object.entries(this.layers).find(
        ([key, value]) => key === layerId,
      )?.[1];

      Object.keys(updatedFilteredLayers).forEach((key) => {
        if (key === layerId) {
          delete updatedFilteredLayers[key];
        }
      });
      updatedFilteredLayers[layerId] = layer;
    });

    Object.keys(layersData).forEach((layersDataKey) => {
      Object.keys(filteredLayersData).forEach((filteredLayersDataKey) => {
        if (layersDataKey === filteredLayersDataKey) {
          delete filteredLayersData[filteredLayersDataKey];
        }
      });
      filteredLayersData[layersDataKey] = layersData[layersDataKey];
    });

    newHotspotData['filteredLayers'] = updatedFilteredLayers;
    newHotspotData['filteredLayersData'] = filteredLayersData;
    return this.props.hotspotDataHandler(newHotspotData);
  }

  dropdownAnimation() {
    var button = this.container.current.querySelector(
      '.ccl-expandable__button',
    );

    if (button.ariaExpanded === 'true') button.ariaExpanded = 'false';
    else button.ariaExpanded = 'true';
  }

  /**
   * Method that will be invoked when the
   * button is clicked. It controls the open
   * and close actions of the component
   */

  openMenu() {
    if (this.state.showMapMenu) {
      this.props.mapViewer.setActiveWidget();
      this.container.current.querySelector('.right-panel').style.display =
        'none';
      this.container.current
        .querySelector('.esri-widget--button')
        .classList.remove('active-widget');
      document
        .querySelector('.esri-ui-top-right.esri-ui-corner')
        .classList.remove('show-panel');
      // By invoking the setState, we notify the state we want to reach
      // and ensure that the component is rendered again
      this.setState({ showMapMenu: false });
    } else {
      this.props.mapViewer.setActiveWidget(this);
      this.container.current.querySelector('.right-panel').style.display =
        'flex';
      this.container.current
        .querySelector('.esri-widget--button')
        .classList.add('active-widget');
      document
        .querySelector('.esri-ui-top-right.esri-ui-corner')
        .classList.add('show-panel');
      // By invoking the setState, we notify the state we want to reach
      // and ensure that the component is rendered again
      this.setState({ showMapMenu: true });
    }
  }

  getLayerParameters() {
    const url =
      window.location.href.replace(window.location.pathname.substring(3), '') +
      this.props.urls.all_geo_klc;
    fetch(url)
      .then((data) => {
        if (data.status === 200) {
          return data.json();
        } else {
          throw new Error(data.status);
        }
      })
      .then((data) => {
        this.dataJSONNames = data.nodes;
      })
      .catch(function (error) {});
  }

  renderApplyFilterButton() {
    let typeFilter = [];
    const activeLayers =
      this.props.hotspotData && this.props.hotspotData['activeLayers']
        ? Object.keys(this.props.hotspotData['activeLayers'])
        : [];

    if (
      this.container.current.querySelector('.presentLandCoverContainer').style
        .display === 'block'
    ) {
      typeFilter.push('lc');
    }

    if (
      this.container.current.querySelector('.landCoverChangeContainer').style
        .display === 'block'
    ) {
      typeFilter.push('lcc');
    }
    activeLayers.forEach((layer) => {
      if (layer.match('cop_klc')) {
        typeFilter.push('klc');
      }
      if (layer.match('protected_areas')) {
        typeFilter.push('pa');
      }
    });
    return this.handleApplyFilter(typeFilter);
  }

  disableButton() {
    let klcSelect = document.querySelector('#select-klc-area');
    let lcContainer = document.querySelector('.presentLandCoverContainer');
    let lccContainer = document.querySelector('.landCoverChangeContainer');
    let lccTimeSelect = document.querySelector('#select-klc-lccTime');
    let lcTimeSelect = document.querySelector('#select-klc-lcTime');
    if (lcContainer === null || lccContainer === null) return;
    if (
      (lcContainer.style.display === 'block' &&
        (lcTimeSelect.value === 'default' || lcTimeSelect.value === '')) ||
      (lccContainer.style.display === 'block' &&
        (lccTimeSelect.value === 'default' || lccTimeSelect.value === '')) ||
      klcSelect.value === 'default'
    ) {
      document.querySelector('#applyFilterButton').disabled = true;
    } else {
      document.querySelector('#applyFilterButton').disabled = false;
    }
  }

  renderPresentLandCover() {
    return (
      <div className="measurement-dropdown" id="PresentLandCoverDropdown">
        <div
          className="ccl-expandable__button"
          aria-expanded="true"
          tabIndex="0"
          role="button"
          onClick={this.dropdownAnimation.bind(this)}
          onKeyDown={this.dropdownAnimation.bind(this)}
        >
          <span>Reference Land Cover</span>
          <span className="dropdown-icon ccl-icon-chevron-thin-down"></span>
        </div>
        <div className="measurement-dropdown-container">
          <br></br>
          <div className="esri-print__form-section-container">
            <label>
              Year
              <select
                id="select-klc-lcTime"
                className="esri-select"
                data-target-property="layout"
                onBlur={() => {}}
                onChange={(e) => {
                  this.setState(
                    { lcYear: e.target.value, lccYear: null },
                    () => {
                      this.updateLccOptionsForSelectedLc();
                      this.disableButton();
                    },
                  );
                }}
              ></select>
            </label>
          </div>
        </div>
      </div>
    );
  }

  getKLCNames(data, selectedOption) {
    var selectBox;
    var selectBoxLcTime;
    var selectBoxLccTime;
    let modularKLCAreas = [];
    let dichotomousKLCAreas = [];
    let activeLayers = [];

    if (
      this.props.hotspotData &&
      this.props.hotspotData['activeLayers'] !== undefined
    ) {
      activeLayers = Object.keys(this.props.hotspotData['activeLayers']);
    } else {
      activeLayers = [];
    }

    if (selectedOption === undefined) return;

    selectBox = document.getElementById('select-klc-area');
    selectBoxLccTime = document.getElementById('select-klc-lccTime');
    selectBoxLcTime = document.getElementById('select-klc-lcTime');

    //this.selectedArea = selectedOption;

    for (let i = 0; i < data.length; i++) {
      var option = data[i].node.klc_name;

      let rawKeymapInfo = data[i].node.keymap_info;
      let keyMapInfoObj = {};
      if (typeof rawKeymapInfo === 'string') {
        try {
          keyMapInfoObj = JSON.parse(rawKeymapInfo) || {};
        } catch (e) {
          keyMapInfoObj = {};
        }
      } else if (rawKeymapInfo && typeof rawKeymapInfo === 'object') {
        keyMapInfoObj = rawKeymapInfo;
      }

      if (keyMapInfoObj.b_classes === true) {
        modularKLCAreas.push(option);
      }
      if (keyMapInfoObj.a_classes === true) {
        dichotomousKLCAreas.push(option);
      }
      if (option === selectedOption) {
        this.dataKlc_code = data[i].node.klc_code;
        //reset all selected options
        if (selectBoxLcTime) {
          this.removeOptions(selectBoxLcTime);
          selectBoxLcTime.options.add(
            new Option('Select a year', 'default', true, true),
          );
          selectBoxLcTime.options[0].disabled = true;
        }
        if (selectBoxLccTime) {
          this.removeOptions(selectBoxLccTime);
          selectBoxLccTime.options.add(
            new Option('Select a year', 'default', true, true),
          );
          selectBoxLccTime.options[0].disabled = true;
        }

        let lccDateList = [];
        let lcDateList = [];
        let lccDatesByLcYear = {};

        if (Array.isArray(keyMapInfoObj.dates)) {
          keyMapInfoObj.dates.forEach((entry) => {
            const lccDate = Number(
              entry && typeof entry === 'object' ? entry?.date : entry,
            );
            const lcDate = Number(
              entry && typeof entry === 'object' ? entry?.lc_date : undefined,
            );
            if (Number.isFinite(lccDate)) {
              lccDateList.push(lccDate);
            }
            if (Number.isFinite(lcDate)) {
              lcDateList.push(lcDate);
              if (!lccDatesByLcYear[lcDate]) {
                lccDatesByLcYear[lcDate] = [];
              }
              if (Number.isFinite(lccDate)) {
                lccDatesByLcYear[lcDate].push(lccDate);
              }
            }
          });
        }

        if (Array.isArray(keyMapInfoObj.multiple_lc_dates)) {
          lcDateList = lcDateList.concat(
            keyMapInfoObj.multiple_lc_dates
              .map((yearEntry) =>
                Number(
                  yearEntry && typeof yearEntry === 'object'
                    ? yearEntry?.date
                    : yearEntry,
                ),
              )
              .filter((year) => Number.isFinite(year)),
          );
        }

        const dynamicYearValues = Object.keys(keyMapInfoObj)
          .filter((key) => /^year\d+$/.test(key))
          .map((key) => Number(keyMapInfoObj[key]))
          .filter((year) => Number.isFinite(year));
        if (dynamicYearValues.length) {
          lccDateList = lccDateList.concat(dynamicYearValues);
        }

        const presentLcYearFromKeymap = Number(keyMapInfoObj.year_present_lc);
        if (Number.isFinite(presentLcYearFromKeymap)) {
          lcDateList.push(presentLcYearFromKeymap);
        }

        if (
          !lccDateList.length &&
          Number.isFinite(Number(data[i].node.lcc_year))
        ) {
          lccDateList = [Number(data[i].node.lcc_year)];
        }
        if (
          !lcDateList.length &&
          Number.isFinite(Number(data[i].node.present_lc_year))
        ) {
          lcDateList = [Number(data[i].node.present_lc_year)];
        }

        lccDateList = Array.from(new Set(lccDateList)).sort((a, b) => a - b);
        lcDateList = Array.from(new Set(lcDateList)).sort((a, b) => a - b);

        Object.keys(lccDatesByLcYear).forEach((lcDateKey) => {
          lccDatesByLcYear[lcDateKey] = Array.from(
            new Set(lccDatesByLcYear[lcDateKey]),
          ).sort((a, b) => a - b);
        });

        lcDateList.forEach((element) => {
          selectBoxLcTime.options.add(new Option(element, element, element));
        });

        if (this.state.lcYear !== null) {
          const hasLcYearOption = Array.from(selectBoxLcTime.options).some(
            (option) => option.value === this.state.lcYear,
          );
          selectBoxLcTime.value = hasLcYearOption
            ? this.state.lcYear
            : 'default';
        }

        const selectedLcYear = Number(this.state.lcYear);
        const lccOptionsToUse = this.resolveLccDateOptions(
          data[i].node.klc_code,
          selectedLcYear,
          lccDatesByLcYear,
          lccDateList,
        );

        lccOptionsToUse.forEach((element) => {
          selectBoxLccTime.options.add(new Option(element, element, element));
        });
      }
    }
    if (selectBox) {
      this.removeOptions(selectBox);
      selectBox.options.add(
        new Option(
          'Select a KLC Area from the dropdown list',
          'default',
          true,
          true,
        ),
      );
      selectBox.options[0].disabled = true;
    }
    if (activeLayers.length) {
      for (let a = 0; a < activeLayers.length; a++) {
        if (
          activeLayers[a].includes('all_lcc_b_pol') ||
          activeLayers[a].includes('all_present_lc_b_pol')
        ) {
          for (let i = 0; i < modularKLCAreas.length; i++) {
            let option = modularKLCAreas[i];
            selectBox.options.add(new Option(option, option, option));
          }
          for (let u = 0; u < selectBox.options.length; u++) {
            if (!selectBox.options[u].label.includes(this.state.selectedArea)) {
              selectBox.value = 'default';
              continue;
            } else {
              selectBox.value = this.state.selectedArea;
              if (this.state.lcYear !== null) {
                const hasLcYearOption = Array.from(
                  selectBoxLcTime.options,
                ).some((option) => option.value === this.state.lcYear);
                selectBoxLcTime.value = hasLcYearOption
                  ? this.state.lcYear
                  : 'default';
              }
              if (this.state.lccYear !== null) {
                const hasLccYearOption = Array.from(
                  selectBoxLccTime.options,
                ).some((option) => option.value === this.state.lccYear);
                selectBoxLccTime.value = hasLccYearOption
                  ? this.state.lccYear
                  : 'default';
              }
              break; // move break statement inside the if block
            }
          }
          break;
        } else if (
          activeLayers[a].includes('all_lcc_a_pol') ||
          activeLayers[a].includes('all_present_lc_a_pol')
        ) {
          for (let i = 0; i < dichotomousKLCAreas.length; i++) {
            let option = dichotomousKLCAreas[i];
            selectBox.options.add(new Option(option, option, option));
          }
          for (let u = 0; u < selectBox.options.length; u++) {
            if (!selectBox.options[u].label.includes(this.state.selectedArea)) {
              selectBox.value = 'default';
              continue;
            } else {
              selectBox.value = this.state.selectedArea;
              if (this.state.lcYear !== null) {
                const hasLcYearOption = Array.from(
                  selectBoxLcTime.options,
                ).some((option) => option.value === this.state.lcYear);
                selectBoxLcTime.value = hasLcYearOption
                  ? this.state.lcYear
                  : 'default';
              }
              if (this.state.lccYear !== null) {
                const hasLccYearOption = Array.from(
                  selectBoxLccTime.options,
                ).some((option) => option.value === this.state.lccYear);
                selectBoxLccTime.value = hasLccYearOption
                  ? this.state.lccYear
                  : 'default';
              }
              break;
            }
          }
          break;
        }
      }
    } else if (selectBox) {
      const allKLCAreas = Array.from(
        new Set(modularKLCAreas.concat(dichotomousKLCAreas)),
      ).sort((a, b) => a.localeCompare(b));
      for (let i = 0; i < allKLCAreas.length; i++) {
        let option = allKLCAreas[i];
        selectBox.options.add(new Option(option, option, option));
      }
      if (this.state.selectedArea !== null) {
        const hasSelectedOption = Array.from(selectBox.options).some(
          (option) => option.value === this.state.selectedArea,
        );
        selectBox.value = hasSelectedOption
          ? this.state.selectedArea
          : 'default';
      }
    }
    if (selectBox.value === 'default') {
      if (selectBoxLcTime) {
        this.removeOptions(selectBoxLcTime);
        selectBoxLcTime.options.add(
          new Option('Select a region first', 'default', true, true),
        );
        selectBoxLcTime.options[0].disabled = true;
      }
      if (selectBoxLccTime) {
        this.removeOptions(selectBoxLccTime);
        selectBoxLccTime.options.add(
          new Option('Select a region first', 'default', true, true),
        );
        selectBoxLccTime.options[0].disabled = true;
      }
    }
  }

  removeOptions(selectElement) {
    if (selectElement.options.length > 0) {
      var i,
        L = selectElement.options.length - 1;
      for (i = L; i >= 0; i--) {
        selectElement.remove(i);
      }
    }
  }

  updateLccOptionsForSelectedLc() {
    const selectBoxLccTime = document.getElementById('select-klc-lccTime');
    if (
      !selectBoxLccTime ||
      !this.state.selectedArea ||
      !Array.isArray(this.dataJSONNames)
    ) {
      return;
    }

    const selectedNode = this.dataJSONNames.find(
      (entry) => entry?.node?.klc_name === this.state.selectedArea,
    )?.node;

    if (!selectedNode) {
      return;
    }

    let rawKeymapInfo = selectedNode.keymap_info;
    let keyMapInfoObj = {};
    if (typeof rawKeymapInfo === 'string') {
      try {
        keyMapInfoObj = JSON.parse(rawKeymapInfo) || {};
      } catch (e) {
        keyMapInfoObj = {};
      }
    } else if (rawKeymapInfo && typeof rawKeymapInfo === 'object') {
      keyMapInfoObj = rawKeymapInfo;
    }

    let lccDateList = [];
    let lccDatesByLcYear = {};

    if (Array.isArray(keyMapInfoObj.dates)) {
      keyMapInfoObj.dates.forEach((entry) => {
        const lccDate = Number(
          entry && typeof entry === 'object' ? entry?.date : entry,
        );
        const lcDate = Number(
          entry && typeof entry === 'object' ? entry?.lc_date : undefined,
        );
        if (Number.isFinite(lccDate)) {
          lccDateList.push(lccDate);
        }
        if (Number.isFinite(lcDate)) {
          if (!lccDatesByLcYear[lcDate]) {
            lccDatesByLcYear[lcDate] = [];
          }
          if (Number.isFinite(lccDate)) {
            lccDatesByLcYear[lcDate].push(lccDate);
          }
        }
      });
    }

    const dynamicYearValues = Object.keys(keyMapInfoObj)
      .filter((key) => /^year\d+$/.test(key))
      .map((key) => Number(keyMapInfoObj[key]))
      .filter((year) => Number.isFinite(year));
    if (dynamicYearValues.length) {
      lccDateList = lccDateList.concat(dynamicYearValues);
    }

    if (!lccDateList.length && Number.isFinite(Number(selectedNode.lcc_year))) {
      lccDateList = [Number(selectedNode.lcc_year)];
    }

    lccDateList = Array.from(new Set(lccDateList)).sort((a, b) => a - b);
    Object.keys(lccDatesByLcYear).forEach((lcDateKey) => {
      lccDatesByLcYear[lcDateKey] = Array.from(
        new Set(lccDatesByLcYear[lcDateKey]),
      ).sort((a, b) => a - b);
    });

    const selectedLcYear = Number(this.state.lcYear);
    const lccOptionsToUse = this.resolveLccDateOptions(
      selectedNode.klc_code,
      selectedLcYear,
      lccDatesByLcYear,
      lccDateList,
    );

    this.removeOptions(selectBoxLccTime);
    selectBoxLccTime.options.add(
      new Option('Select a year', 'default', true, true),
    );
    selectBoxLccTime.options[0].disabled = true;
    lccOptionsToUse.forEach((element) => {
      selectBoxLccTime.options.add(new Option(element, element, element));
    });
  }

  renderLandCoverChange() {
    return (
      <div className="measurement-dropdown" id="LandCoverChangeDropdown">
        <div
          className="ccl-expandable__button"
          aria-expanded="true"
          tabIndex="0"
          role="button"
          onClick={this.dropdownAnimation.bind(this)}
          onKeyDown={this.dropdownAnimation.bind(this)}
        >
          <span>Land Cover Change</span>
          <span className="dropdown-icon ccl-icon-chevron-thin-down"></span>
        </div>
        <div className="measurement-dropdown-container">
          <br></br>
          <div className="esri-print__form-section-container">
            <label>
              Year
              <select
                id="select-klc-lccTime"
                className="esri-select"
                data-target-property="layout"
                onBlur={() => {}}
                onChange={(e) => {
                  this.disableButton();
                }}
              ></select>
            </label>
          </div>
        </div>
      </div>
    );
  }

  render() {
    let divs = [
      {
        id: 'all_present_lc',
        func: this.renderPresentLandCover,
        className: 'presentLandCoverContainer',
      },
      {
        id: 'all_lcc',
        func: this.renderLandCoverChange,
        className: 'landCoverChangeContainer',
      },
    ];

    divs.sort((a, b) => {
      let indexA = this.state.activeLayersArray.findIndex((layer) =>
        layer.getAttribute('layer-id').includes(a.id),
      );
      let indexB = this.state.activeLayersArray.findIndex((layer) =>
        layer.getAttribute('layer-id').includes(b.id),
      );
      if (indexA === -1 || indexB === -1) return 0;
      return indexA - indexB;
    });
    return (
      <>
        <div ref={this.container} className="hotspot-container">
          <div tooltip="Filter Hot Spots" direction="left" type="widget">
            <div
              className={this.menuClass}
              id="hotspot_button"
              aria-label="Hotspot"
              onClick={this.openMenu.bind(this)}
              onKeyDown={(e) => {
                if (
                  !e.altKey &&
                  e.code !== 'Tab' &&
                  !e.ctrlKey &&
                  e.code !== 'Delete' &&
                  !e.shiftKey &&
                  !e.code.startsWith('F')
                ) {
                  this.openMenu(this);
                }
              }}
              tabIndex="0"
              role="button"
            ></div>
          </div>
          <div className="right-panel">
            <div className="right-panel-header">
              <span>Hot Spots outside Europe filtering options</span>
              <span
                className="map-menu-icon esri-icon-close"
                onClick={this.openMenu.bind(this)}
                onKeyDown={(e) => {
                  if (
                    !e.altKey &&
                    e.code !== 'Tab' &&
                    !e.ctrlKey &&
                    e.code !== 'Delete' &&
                    !e.shiftKey &&
                    !e.code.startsWith('F')
                  ) {
                    this.openMenu(this);
                  }
                }}
                tabIndex="0"
                role="button"
              ></span>
            </div>
            <div className="right-panel-content">
              <div className="hotspot-panel">
                <div className="measurement-dropdown-container">
                  <div className="esri-print__form-section-container">
                    <label>
                      Key Landscape for Conservation (KLC) area
                      <select
                        onBlur={() => {}}
                        onChange={(e) => {
                          this.setState({
                            selectedArea: e.target.value,
                            lcYear: null,
                            lccYear: null,
                          });
                        }}
                        id="select-klc-area"
                        className="esri-select"
                      ></select>
                    </label>
                  </div>
                </div>
                <div>
                  {divs.map((div, i) => (
                    <div key={i} className={div.className}>
                      {div.func()}
                    </div>
                  ))}
                </div>
                <button
                  id="applyFilterButton"
                  className="esri-button"
                  onClick={() => this.renderApplyFilterButton()}
                >
                  Apply filter
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  /**
   * This method is executed after the render method is executed
   */

  async componentDidMount() {
    this._isMounted = true;
    await this.getLayerParameters();
    await this.loader();
    if (!this.container.current) return;
    this.props.view.when(() => {
      this.props.view.ui.add(this.container.current, 'top-right');
    });
    this.layerModelInit();
    this.getBBoxData();
    this.getKLCNames(this.dataJSONNames, this.state.selectedArea);
    this.disableButton();
    this.arcgisEventHandles = [];
    this.props.view.when(() => {
      const handle = this.props.view.map.layers.on('change', () => {
        let bookmarkHotspotFilter = null;
        if (localStorage.getItem('bookmarkHotspotFilter')) {
          bookmarkHotspotFilter = JSON.parse(
            localStorage.getItem('bookmarkHotspotFilter'),
          );
        } else {
          return;
        }
        let shouldUpdate = false;
        if (
          bookmarkHotspotFilter !== null &&
          Object.keys(bookmarkHotspotFilter?.filteredLayers).length !== 0 &&
          this.props.bookmarkData &&
          this.props.bookmarkData.active === true
        ) {
          let activeLayers = [];
          let filteredLayers = [];
          Object.keys(bookmarkHotspotFilter.activeLayers).forEach((key) => {
            activeLayers[key] = this.layers[key];
          });
          Object.keys(bookmarkHotspotFilter.filteredLayers).forEach((key) => {
            filteredLayers[key] = null;
          });
          if (this.props.hotspotData) {
            this.props.hotspotData['activeLayers'] = activeLayers;
            this.props.hotspotData['filteredLayers'] = filteredLayers;
          }
          this.renderApplyFilterButton();
          localStorage.setItem('bookmarkHotspotFilter', null);
          shouldUpdate = true;
        } else if (
          bookmarkHotspotFilter !== null &&
          Object.keys(bookmarkHotspotFilter?.filteredLayers).length === 0 &&
          this.props.bookmarkData &&
          this.props.bookmarkData.active === true
        ) {
          this.lcYear = null;
          this.lccYear = null;
          this.selectedArea = null;
          if (this._isMounted) {
            this.setState({ lcYear: null, lccYear: null, selectedArea: null });
          }
          shouldUpdate = true;
        }
        if (shouldUpdate && this._isMounted) {
          this.setState({
            activeLayersArray: Array.from(
              document.querySelectorAll('.active-layer'),
            ),
          });
          const newHotspotData = this.props.hotspotData;
          this.props.hotspotDataHandler(newHotspotData);
        }
      });
      this.arcgisEventHandles.push(handle);
    });
  }

  componentWillUnmount() {
    this._isMounted = false;
    if (this.arcgisEventHandles) {
      this.arcgisEventHandles.forEach(
        (handle) => handle && handle.remove && handle.remove(),
      );
      this.arcgisEventHandles = [];
    }
  }

  getHotspotLayerSignature(hotspotData) {
    if (!hotspotData || typeof hotspotData !== 'object') {
      return '';
    }
    const activeLayers = hotspotData.activeLayers;
    if (!activeLayers || typeof activeLayers !== 'object') {
      return '';
    }
    return Object.keys(activeLayers)
      .filter(
        (key) => key.includes('all_present_lc_') || key.includes('all_lcc_'),
      )
      .sort()
      .join('|');
  }

  componentDidUpdate(prevProps, prevState) {
    const prevHotspotLayerSignature = this.getHotspotLayerSignature(
      prevProps.hotspotData,
    );
    const nextHotspotLayerSignature = this.getHotspotLayerSignature(
      this.props.hotspotData,
    );

    if (
      prevHotspotLayerSignature !== nextHotspotLayerSignature &&
      (this.state.selectedArea !== null ||
        this.state.lcYear !== null ||
        this.state.lccYear !== null)
    ) {
      this.setState({
        selectedArea: null,
        lcYear: null,
        lccYear: null,
      });
      return;
    }

    if (
      prevProps.hotspotData !== this.props.hotspotData ||
      prevState.selectedArea !== this.state.selectedArea
    ) {
      this.getKLCNames(this.dataJSONNames, this.state.selectedArea);
      this.disableButton();
    }
    if (prevState.lcYear !== this.state.lcYear) {
      this.disableButton();
    }
  }
}
export default HotspotWidget;
