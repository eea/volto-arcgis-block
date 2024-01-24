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
    this.filteredLayersToHotspotData = this.filteredLayersToHotspotData.bind(
      this,
    );
    this.mapCfg = this.props.mapCfg;
    this.selectedArea = null;
    this.lcYear = null;
    this.lccYear = null;
    this.urls = this.props.urls;
    this.layers = this.props.selectedLayers;
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
    }).then((response) => {
      const responseJSON = response.data;
      this.dataBBox = responseJSON;
    });
  };

  setBBoxCoordinates = (data) => {
    let klc_array = data.find((e) => e.klc_code === this.dataKlc_code);
    let klc_bbox_coordinates = klc_array.bbox.split(',');
    let xmin_ymin = klc_bbox_coordinates[0].split(' ');
    let xmax_ymax = klc_bbox_coordinates[1].split(' ');

    let constraintExtent = new Extent({
      xmin: this.mapCfg.geometryZoomIn.xmin,
      ymin: this.mapCfg.geometryZoomIn.ymin,
      xmax: this.mapCfg.geometryZoomIn.xmax,
      ymax: this.mapCfg.geometryZoomIn.ymax,
      // xmin: -200,
      // ymin: -85,
      // xmax: 200,
      // ymax: 85,
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

  layerModelInit() {
    const serviceUrl = this.urls.serviceUrl;
    this.esriLayer_lcc = new WMSLayer({
      url: serviceUrl,
      //featureInfoFormat: "application/json",
      customLayerParameters: {},
      sublayers: [
        // LAND COVER CHANGE DATASET ________________________________________________________________________________________________________________
        {
          name: this.addLegendName('all_lcc_a_pol'),
          legendUrl: this.addLegendNameToUrl('all_lcc_a_pol'),
        },
      ],
    });
    this.esriLayer_lcc = new WMSLayer({
      url: serviceUrl,
      //featureInfoFormat: "application/json",
      customLayerParameters: {},
      sublayers: [
        // LAND COVER CHANGE DATASET ________________________________________________________________________________________________________________
        {
          name: this.addLegendName('all_lcc_b_pol'),
          legendUrl: this.addLegendNameToUrl('all_lcc_b_pol'),
        },
      ],
    });
    this.esriLayer_lc = new WMSLayer({
      url: serviceUrl,
      //featureInfoFormat: "application/json",
      customLayerParameters: {},
      sublayers: [
        // PRESENT LAND COVER DATASET ________________________________________________________________________________________________________________
        {
          name: this.addLegendName('all_present_lc_a_pol'),
          legendUrl: this.addLegendNameToUrl('all_present_lc_a_pol'),
        },
      ],
    });
    this.esriLayer_lc = new WMSLayer({
      url: serviceUrl,
      //featureInfoFormat: "application/json",
      customLayerParameters: {},
      sublayers: [
        // PRESENT LAND COVER DATASET ________________________________________________________________________________________________________________
        {
          name: this.addLegendName('all_present_lc_b_pol'),
          legendUrl: this.addLegendNameToUrl('all_present_lc_b_pol'),
        },
      ],
    });
    this.esriLayer_klc = new WMSLayer({
      url: serviceUrl,
      //featureInfoFormat: "application/json",
      customLayerParameters: {},
      sublayers: [
        {
          name: this.addLegendName('cop_klc'),
          legendUrl: this.addLegendNameToUrl('cop_klc'),
        },
      ],
    });
    this.esriLayer_pa = new WMSLayer({
      url: serviceUrl,
      //featureInfoFormat: "application/json",
      customLayerParameters: {},
      sublayers: [
        {
          name: this.addLegendName('protected_areas'),
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
    //sweep the old filtered data
    if (filteredLayersData[typeLegend] !== undefined) {
      delete filteredLayersData[typeLegend];
    }
    //Find the bbox data for the chosen region
    let klc_array = bboxData.find((e) => e.klc_code === this.dataKlc_code);

    //Parse the bbox data into finer detail
    let klc_bbox_coordinates = klc_array.bbox.split(',');
    let xmin_ymin = klc_bbox_coordinates[0].split(' ');
    let xmax_ymax = klc_bbox_coordinates[1].split(' ');

    //Add the filtered data to the filteredLayersData object
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
    let activeLayers =
      this.props.hotspotData && this.props.hotspotData['activeLayers']
        ? Object.keys(this.props.hotspotData['activeLayers'])
        : [];
    let filteredLayers =
      this.props.hotspotData && this.props.hotspotData['filteredLayers']
        ? Object.keys(this.props.hotspotData['filteredLayers'])
        : [];
    let filteredLayersData = this.props.hotspotData['filteredLayerData'] || [];
    let layersToAdd = {};
    let bookmarkHotspotFilter = JSON.parse(
      localStorage.getItem('bookmarkHotspotFilter'),
    );
    typeFilter.forEach((type) => {
      let filterLayer;

      if (type === 'lcc') {
        let selectLccBoxTime = document.getElementById('select-klc-lccTime')
          .value;
        //this.lccYear = selectLccBoxTime;
        this.setState({ lccYear: selectLccBoxTime });
        if (document.getElementById('select-klc-lccTime').value.match(/\d+/g)) {
          var selectBoxHighlightsLcc = document
            .getElementById('select-klc-lccTime')
            .value.match(/\d+/g)
            .map(Number)[0];
        }
        for (let i = 0; activeLayers[i]; i++) {
          let layer = activeLayers[i];
          if (layer.includes('all_lcc_a_pol')) {
            typeLegend = 'all_lcc_a_pol';
            break;
          } else {
            typeLegend = 'all_lcc_b_pol';
          }
        }

        this.addFilteredLayersData(
          filteredLayersData,
          this.dataBBox,
          typeLegend,
          selectLccBoxTime,
        );

        filterLayer = this.esriLayer_lcc;

        filterLayer.sublayers.items[0].name = this.addLegendName(typeLegend);
        filterLayer.sublayers.items[0].legendUrl = this.addLegendNameToUrl(
          typeLegend,
        );
        if (bookmarkHotspotFilter !== null) {
          filterLayer.customLayerParameters['CQL_FILTER'] =
            bookmarkHotspotFilter.filteredLayers['lcc_filter'];
        } else {
          filterLayer.customLayerParameters['CQL_FILTER'] =
            'klc_code LIKE ' +
            "'" +
            this.dataKlc_code +
            "'" +
            " AND in_pa = 'not_defined' AND date = " +
            selectBoxHighlightsLcc;
        }
      }
      if (type === 'lc') {
        for (let i = 0; i < activeLayers.length; i++) {
          let layer = activeLayers[i];
          if (layer.includes('all_present_lc_a_pol')) {
            typeLegend = 'all_present_lc_a_pol';
            break;
          } else {
            typeLegend = 'all_present_lc_b_pol';
          }
        }

        let selectLcBoxTime = document.getElementById('select-klc-lcTime')
          .value;

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

        filterLayer.sublayers.items[0].name = this.addLegendName(typeLegend);
        filterLayer.sublayers.items[0].legendUrl = this.addLegendNameToUrl(
          typeLegend,
        );
        if (bookmarkHotspotFilter !== null) {
          filterLayer.customLayerParameters['CQL_FILTER'] =
            bookmarkHotspotFilter.filteredLayers['lc_filter'];
        } else {
          filterLayer.customLayerParameters['CQL_FILTER'] =
            'klc_code LIKE ' +
            "'" +
            this.dataKlc_code +
            "'" +
            " AND in_pa = 'not_defined' AND date = " +
            selectBoxHighlightsLc;
        }
      }
      if (type === 'klc') {
        if (bookmarkHotspotFilter !== null) {
          this.esriLayer_klc.customLayerParameters['CQL_FILTER'] =
            bookmarkHotspotFilter.filteredLayers['klc_filter'];
        } else {
          this.esriLayer_klc.customLayerParameters['CQL_FILTER'] =
            "klc_code LIKE '" + this.dataKlc_code + "'";
        }
        filterLayer = this.esriLayer_klc;
      }
      if (type === 'pa') {
        if (bookmarkHotspotFilter !== null) {
          this.esriLayer_pa.customLayerParameters['CQL_FILTER'] =
            bookmarkHotspotFilter.filteredLayers['pa_filter'];
        } else {
          this.esriLayer_pa.customLayerParameters['CQL_FILTER'] =
            "klc_code LIKE '" + this.dataKlc_code + "'";
        }
        filterLayer = this.esriLayer_pa;
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
    if (bookmarkHotspotFilter === null) {
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
    let updatedFilteredLayers = this.props.hotspotData['filteredLayers'] || {};
    let filteredLayersData = this.props.hotspotData['filteredLayersData'] || {};
    let newHotspotData = this.props.hotspotData;
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
      .catch(function (error) {
        /* console.log('error while getting data'); */
      });
  }

  renderApplyFilterButton() {
    let typeFilter = [];
    const activeLayers = Object.keys(this.props.hotspotData['activeLayers']);

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
        lcTimeSelect.value === 'default') ||
      (lccContainer.style.display === 'block' &&
        lccTimeSelect.value === 'default') ||
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
                  this.disableButton();
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

    if (this.props.hotspotData['activeLayers'] === undefined) return;

    activeLayers = Object.keys(this.props.hotspotData['activeLayers']);

    if (selectedOption === undefined) return;

    selectBox = document.getElementById('select-klc-area');
    selectBoxLccTime = document.getElementById('select-klc-lccTime');
    selectBoxLcTime = document.getElementById('select-klc-lcTime');

    if (selectedOption !== this.state.selectedArea) {
      this.setState({
        lcYear: null,
        lccYear: null,
      });
    }

    //this.selectedArea = selectedOption;

    for (let i = 0; i < data.length; i++) {
      var option = data[i].node.klc_name;

      let keyMapInfoObj = JSON.parse(data[i].node.keymap_info) || {};

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

        if (
          data[i].node.keymap_info
            .toLowerCase()
            .includes('multiple_dates":true')
        ) {
          //new select year options values
          var optionLcTime = data[i].node.present_lc_year;
          var indexStart = data[i].node.keymap_info
            .toLowerCase()
            .indexOf('"dates":[ {');
          var indexEnd = data[i].node.keymap_info.toLowerCase().indexOf(' }],');
          var strOut = data[i].node.keymap_info.substring(indexStart, indexEnd);
          var numbers = strOut.match(/\d+/g).map(Number);
          numbers.forEach((element) => {
            selectBoxLccTime.options.add(new Option(element, element, element));
          });
          selectBoxLcTime.options.add(
            new Option(optionLcTime, optionLcTime, optionLcTime),
          );
        } else {
          //new select year options values
          var optionLccTime = data[i].node.lcc_year;
          selectBoxLccTime.options.add(
            new Option(optionLccTime, optionLccTime, optionLccTime),
          );
          optionLcTime = data[i].node.present_lc_year;
          selectBoxLcTime.options.add(
            new Option(optionLcTime, optionLcTime, optionLcTime),
          );
        }
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
                selectBoxLcTime.value = this.state.lcYear;
              }
              if (this.state.lccYear !== null) {
                selectBoxLccTime.value = this.state.lccYear;
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
                selectBoxLcTime.value = this.state.lcYear;
              }
              if (this.state.lccYear !== null) {
                selectBoxLccTime.value = this.state.lccYear;
              }
              break;
            }
          }
          break;
        }
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
                          this.setState({ selectedArea: e.target.value });
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
    await this.getLayerParameters();
    await this.loader();
    this.props.view.ui.add(this.container.current, 'top-right');
    this.layerModelInit();
    this.getBBoxData();
    this.props.view.when(() => {
      this.props.view.map.layers.on('change', () => {
        let bookmarkHotspotFilter = null;
        if (localStorage.getItem('bookmarkHotspotFilter')) {
          bookmarkHotspotFilter = JSON.parse(
            localStorage.getItem('bookmarkHotspotFilter'),
          );
        }
        if (
          bookmarkHotspotFilter !== null &&
          this.props.view.map.layers.items[0] !== 'bookmark'
        ) {
          let activeLayers = [];
          let filteredLayers = [];
          Object.keys(bookmarkHotspotFilter.activeLayers).forEach((key) => {
            activeLayers[key] = this.layers[key];
          });
          Object.keys(bookmarkHotspotFilter.filteredLayers).forEach((key) => {
            filteredLayers[key] = null;
          });
          this.props.hotspotData['activeLayers'] = activeLayers;
          this.props.hotspotData['filteredLayers'] = filteredLayers;
          this.renderApplyFilterButton();
          localStorage.setItem('bookmarkHotspotFilter', null);
        }
        this.setState({
          activeLayersArray: Array.from(
            document.querySelectorAll('.active-layer'),
          ),
        });
        const newHotspotData = this.props.hotspotData;
        this.props.hotspotDataHandler(newHotspotData);
      });
    });
  }

  componentDidUpdate(prevState, prevProps) {
    if (prevProps.hotspotData !== this.props.hotspotData) {
      this.getKLCNames(this.dataJSONNames, this.state.selectedArea);
      this.disableButton();
    }
  }
}
export default HotspotWidget;
