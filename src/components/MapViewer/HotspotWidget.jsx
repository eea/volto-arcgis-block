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
      activeLayers: sessionStorage.checkedLayers,
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
    this.checkedLayers = {};
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
    this.mapCfg = this.props.mapCfg;
    //this.getLayerParameters();
    this.selectedArea = null;
    this.lcYear = null;
    this.lccYear = null;
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
    const url = 'https://land.copernicus.eu/global/hsm/php/klc_bbox.php';
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
    const legendLinkUrl =
      'https://geospatial.jrc.ec.europa.eu/geoserver/hotspots/ows?service=WMS&request=GetLegendGraphic&format=image%2Fpng&width=20&height=20&layer=';
    return legendLinkUrl + legend;
  }

  layerModelInit() {
    const serviceUrl =
      'https://geospatial.jrc.ec.europa.eu/geoserver/hotspots/wms';

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

  handleApplyFilter(typeFilter) {
    let checkedLayers =
      JSON.parse(sessionStorage.getItem('checkedLayers')) || {};
    let typeLegend;

    if (this.props.selectedLayers) {
      //Clear previous selections when applying a new filter
      var currentLccLayer = Object.keys(this.props.selectedLayers).find((e) =>
        e.includes('lcc_filter'),
      );
      if (currentLccLayer) delete this.props.selectedLayers[currentLccLayer];

      var currentLcLayer = Object.keys(this.props.selectedLayers).find((e) =>
        e.includes('lc_filter'),
      );
      if (currentLcLayer) delete this.props.selectedLayers[currentLcLayer];

      var currentKlcLayer = Object.keys(this.props.selectedLayers).find((e) =>
        e.includes('klc_filter'),
      );
      if (currentKlcLayer) delete this.props.selectedLayers[currentKlcLayer];

      var currentPaLayer = Object.keys(this.props.selectedLayers).find((e) =>
        e.includes('pa_filter'),
      );
      if (currentPaLayer) delete this.props.selectedLayers[currentPaLayer];

      var currentLcckey = Object.keys(this.props.selectedLayers).find((e) =>
        e.includes('all_lcc'),
      );
      var currentLckey = Object.keys(this.props.selectedLayers).find((e) =>
        e.includes('all_present_lc'),
      );
      var currentKlckey = Object.keys(this.props.selectedLayers).find((e) =>
        e.includes('cop_klc'),
      );
      var currentPakey = Object.keys(this.props.selectedLayers).find((e) =>
        e.includes('protected_areas'),
      );
      if (currentLcckey) {
        //this.props.map.remove(this.props.selectedLayers[currentLcckey]);
        this.props.selectedLayers[currentLcckey].visible = false;
      }
      if (currentLckey) {
        //this.props.map.remove(this.props.selectedLayers[currentLckey]);
        this.props.selectedLayers[currentLckey].visible = false;
      }
      if (currentKlckey) {
        //this.props.map.remove(this.props.selectedLayers[currentKlckey]);
        this.props.selectedLayers[currentKlckey].visible = false;
      }
      if (currentPakey) {
        //this.props.map.remove(this.props.selectedLayers[currentPakey]);
        this.props.selectedLayers[currentPakey].visible = false;
      }
    }
    typeFilter.forEach((type) => {
      if (type === 'lcc') {
        let selectLccBoxTime = document.getElementById('select-klc-lccTime')
          .value;
        this.lccYear = selectLccBoxTime;
        var selectBoxHighlightsLcc = document
          .getElementById('select-klc-lccTime')
          .value.match(/\d+/g)
          .map(Number)[0];
        checkedLayers.forEach((layer) => {
          layer.includes('all_lcc_a_pol')
            ? (typeLegend = 'all_lcc_a_pol')
            : (typeLegend = 'all_lcc_b_pol');
        });
        if (this.esriLayer_lcc !== null) {
          if (this.esriLayer_lcc2 !== null) {
            this.props.map.remove(this.esriLayer_lcc2);
          }

          this.esriLayer_lcc.sublayers.items[0].name = this.addLegendName(
            typeLegend,
          );
          this.esriLayer_lcc.sublayers.items[0].legendUrl = this.addLegendNameToUrl(
            typeLegend,
          );
          this.esriLayer_lcc.customLayerParameters['CQL_FILTER'] =
            'klc_code LIKE ' +
            "'" +
            this.dataKlc_code +
            "'" +
            " AND in_pa = 'not_defined' AND date = " +
            selectBoxHighlightsLcc;
          this.props.map.add(this.esriLayer_lcc);
          this.props.selectedLayers['lcc_filter'] = this.esriLayer_lcc;
          this.props.selectedLayers['lcc_filter'].visible = true;
          this.esriLayer_lcc2 = this.esriLayer_lcc;
          this.layerModelInit();
        }
      }
      if (type === 'lc') {
        checkedLayers.forEach((layer) => {
          layer.includes('all_present_lc_a_pol')
            ? (typeLegend = 'all_present_lc_a_pol')
            : (typeLegend = 'all_present_lc_b_pol');
        });
        let selectLcBoxTime = document.getElementById('select-klc-lcTime')
          .value;
        this.lcYear = selectLcBoxTime;
        var selectBoxHighlightsLc = document
          .getElementById('select-klc-lcTime')
          .value.match(/\d+/g)
          .map(Number)[0];
        if (this.esriLayer_lc !== null) {
          if (this.esriLayer_lc2 !== null) {
            this.props.map.remove(this.esriLayer_lc2);
          }
          this.esriLayer_lc.sublayers.items[0].name = this.addLegendName(
            typeLegend,
          );
          this.esriLayer_lc.sublayers.items[0].legendUrl = this.addLegendNameToUrl(
            typeLegend,
          );
          this.esriLayer_lc.customLayerParameters['CQL_FILTER'] =
            'klc_code LIKE ' +
            "'" +
            this.dataKlc_code +
            "'" +
            " AND in_pa = 'not_defined' AND date = " +
            selectBoxHighlightsLc;
          this.props.map.add(this.esriLayer_lc);
          this.props.selectedLayers['lc_filter'] = this.esriLayer_lc;
          this.props.selectedLayers['lc_filter'].visible = true;
          this.esriLayer_lc2 = this.esriLayer_lc;
          this.layerModelInit();
        }
      }
      this.esriLayer_klc.customLayerParameters['CQL_FILTER'] =
        "klc_code LIKE '" + this.dataKlc_code + "'";
      this.props.selectedLayers['klc_filter'] = this.esriLayer_klc;
      if (type === 'klc') {
        if (this.esriLayer_klc !== null) {
          if (this.esriLayer_klc2 !== null) {
            this.props.map.remove(this.esriLayer_klc2);
          }
          this.props.map.add(this.esriLayer_klc);
          this.props.selectedLayers['klc_filter'].visible = true;
          this.esriLayer_klc2 = this.esriLayer_klc;
          this.layerModelInit();
        }
      }
      this.esriLayer_pa.customLayerParameters['CQL_FILTER'] =
        "klc_code LIKE '" + this.dataKlc_code + "'";
      this.props.selectedLayers['pa_filter'] = this.esriLayer_pa;
      if (type === 'pa') {
        if (this.esriLayer_pa !== null) {
          if (this.esriLayer_pa2 !== null) {
            this.props.map.remove(this.esriLayer_pa2);
          }
          this.props.map.add(this.esriLayer_pa);
          this.props.selectedLayers['pa_filter'].visible = true;
          this.esriLayer_pa2 = this.esriLayer_pa;
          this.layerModelInit();
        }
      }
      this.setBBoxCoordinates(this.dataBBox);
    });
    //set sessionStorage value to keep the widget open
    sessionStorage.setItem('hotspotFilterApplied', 'true');
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
      this.getKLCNames(this.dataJSONNames, this.selectedArea);
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
      this.getLayerParameters();
      if (this.getLayerParameters.length !== 0)
        this.getKLCNames(this.dataJSONNames, this.selectedArea);
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
    fetch('https://land.copernicus.eu/global/hsm/all_geo_klc_json')
      .then((data) => {
        if (data.status === 200) {
          return data.json();
        } else {
          throw new Error(data.status);
        }
      })
      .then((data) => {
        this.dataJSONNames = data.nodes;
        //if (this.selectedArea == null) {
        //  this.selectedArea = data.nodes[0].node.klc_name;
        //}
        this.getKLCNames(data.nodes, this.selectedArea);
      })
      .catch(function (error) {
        /* console.log('error while getting data'); */
      });
  }

  renderApplyFilterButton() {
    let typeFilter = [];

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
    let checkedLayers =
      JSON.parse(sessionStorage.getItem('checkedLayers')) || {};
    checkedLayers.forEach((layer) => {
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
    let checkedLayers =
      JSON.parse(sessionStorage.getItem('checkedLayers')) || {};

    selectBox = document.getElementById('select-klc-area');
    selectBoxLccTime = document.getElementById('select-klc-lccTime');
    selectBoxLcTime = document.getElementById('select-klc-lcTime');

    if (selectedOption !== this.selectedArea) {
      this.lcYear = null;
      this.lccYear = null;
    }

    this.selectedArea = selectedOption;

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
    if (checkedLayers.length) {
      for (let a = 0; a < checkedLayers.length; a++) {
        if (
          checkedLayers[a].includes('all_lcc_b_pol') ||
          checkedLayers[a].includes('all_present_lc_b_pol')
        ) {
          for (let i = 0; i < modularKLCAreas.length; i++) {
            let option = modularKLCAreas[i];
            selectBox.options.add(new Option(option, option, option));
          }
          this.checkedLayers = checkedLayers;
          for (let u = 0; u < selectBox.options.length; u++) {
            if (selectBox.options[u].label.includes(this.selectedArea)) {
              selectBox.value = this.selectedArea;
              if (this.lcYear === null) selectBoxLcTime.value = 'default';
              else if (this.lccYear === null)
                selectBoxLccTime.value = 'default';
              else {
                selectBoxLcTime.value = this.lcYear;
                selectBoxLccTime.value = this.lccYear;
              }
              break;
            } else {
              selectBox.value = 'default';
              selectBoxLcTime.value = 'default';
              selectBoxLccTime.value = 'default';
            }
          }
          break;
        } else if (
          checkedLayers[a].includes('all_lcc_a_pol') ||
          checkedLayers[a].includes('all_present_lc_a_pol')
        ) {
          for (let i = 0; i < dichotomousKLCAreas.length; i++) {
            let option = dichotomousKLCAreas[i];
            selectBox.options.add(new Option(option, option, option));
          }
          this.checkedLayers = checkedLayers;
          for (let u = 0; u < selectBox.options.length; u++) {
            if (selectBox.options[u].label.includes(this.selectedArea)) {
              selectBox.value = this.selectedArea;
              //selectBoxLcTime.value = this.lcYear;
              //selectBoxLccTime.value = this.lccYear;
              break;
            } else {
              selectBox.value = 'default';
              //selectBoxLcTime.value = 'default';
              //selectBoxLccTime.value = 'default';
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
    return (
      <>
        <div ref={this.container} className="hotspot-container">
          <div tooltip="Filter Hot Spots" direction="left" type="widget">
            <div
              className={this.menuClass}
              id="hotspot_button"
              aria-label="Hotspot"
              onClick={this.openMenu.bind(this)}
              onKeyDown={this.openMenu.bind(this)}
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
                onKeyDown={this.openMenu.bind(this)}
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
                          this.getKLCNames(this.dataJSONNames, e.target.value);
                          this.disableButton();
                        }}
                        id="select-klc-area"
                        className="esri-select"
                      ></select>
                    </label>
                  </div>
                </div>
                <div className="presentLandCoverContainer">
                  {this.renderPresentLandCover()}
                </div>
                <div className="landCoverChangeContainer">
                  {this.renderLandCoverChange()}
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
   * This method is executed after the rener method is executed
   */
  async componentDidMount() {
    this.checkedLayers =
      JSON.parse(sessionStorage.getItem('checkedLayers')) || {};
    await this.getLayerParameters();
    await this.loader();
    this.props.view.ui.add(this.container.current, 'top-right');
    this.layerModelInit();
    this.getBBoxData();
    // Listen for changes to sessionStorage
    window.addEventListener('storage', this.handleStorageChange);
  }

  componentWillUnmount() {
    // Remove the event listener when the component is unmounted
    window.removeEventListener('storage', this.handleStorageChange);
  }

  handleStorageChange = () => {
    this.checkedLayers =
      JSON.parse(sessionStorage.getItem('checkedLayers')) || {};
    this.forceUpdate();
  };
}
export default HotspotWidget;
