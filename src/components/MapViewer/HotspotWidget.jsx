import React, { createRef } from 'react';
import { loadModules } from 'esri-loader';

var WMSLayer;

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
      avtiveLayers: sessionStorage.checkedLayers,
    };
    this.menuClass =
      'esri-icon-filter esri-widget--button esri-widget esri-interactive';
    this.dataKlc_code = null;
    this.esriLayer_lcc = null;
    this.esriLayer_lc = null;
    this.subscribedLayers = sessionStorage;
    this.checkedLayers = this.props.layers
      ? this.props.layers.checkedLayers
      : '';
    this.dataJSONNames = [];
    this.klcHighlightsArray = [];
    this.renderPresentLandCover = this.renderPresentLandCover.bind(this);
    this.renderLandCoverChange = this.renderLandCoverChange.bind(this);
    this.getLayerParameters = this.getLayerParameters.bind(this);
    this.getKLCNames = this.getKLCNames.bind(this);
    this.layerModelInit = this.layerModelInit.bind(this);
    this.handleApplyFilter = this.handleApplyFilter.bind(this);
    this.getLayerParameters();
  }

  loader() {
    return loadModules(['esri/layers/WMSLayer']).then(([_WMSLayer]) => {
      WMSLayer = _WMSLayer;
    });
  }

  layerModelInit() {
    const serviceUrl =
      'https://geospatial.jrc.ec.europa.eu/geoserver/hotspots/wms';

    this.esriLayer_lcc = new WMSLayer({
      url: serviceUrl,
      // featureInfoFormat: "text/html",
      customLayerParameters: {},
      sublayers: [
        // LAND COVER CHANGE DATASET ________________________________________________________________________________________________________________
        {
          name: 'all_lcc_a_pol',
          legendUrl:
            'https://geospatial.jrc.ec.europa.eu/geoserver/hotspots/ows?service=WMS&request=GetLegendGraphic&format=image%2Fpng&width=20&height=20&layer=all_lcc_a_pol',
        },
      ],
    });
    this.esriLayer_lc = new WMSLayer({
      url: serviceUrl,
      // featureInfoFormat: "text/html",
      customLayerParameters: {},
      sublayers: [
        // PRESENT LAND COVER DATASET ________________________________________________________________________________________________________________
        {
          name: 'all_lcc_a_pol',
          legendUrl:
            'https://geospatial.jrc.ec.europa.eu/geoserver/hotspots/ows?service=WMS&request=GetLegendGraphic&format=image%2Fpng&width=20&height=20&layer=all_lcc_a_pol',
        },
      ],
    });
  }

  handleApplyFilter(typeFilter) {
    if (this.props.selectedLayers) {
      //Clear previous selections when apply a new filter
      var currentLccLayer = Object.keys(this.props.selectedLayers).find((e) =>
        e.includes('lcc_filter'),
      );
      if (currentLccLayer) delete this.props.selectedLayers[currentLccLayer];

      var currentLcLayer = Object.keys(this.props.selectedLayers).find((e) =>
        e.includes('lc_filter'),
      );
      if (currentLcLayer) delete this.props.selectedLayers[currentLcLayer];

      var currentLcckey = Object.keys(this.props.selectedLayers).find((e) =>
        e.includes('all_lcc'),
      );
      var currentLckey = Object.keys(this.props.selectedLayers).find((e) =>
        e.includes('all_present_lc'),
      );
      if (currentLcckey) {
        //this.props.map.remove(this.props.selectedLayers[currentLcckey]);
        this.props.selectedLayers[currentLcckey].visible = false;
      }
      if (currentLckey) {
        //this.props.map.remove(this.props.selectedLayers[currentLckey]);
        this.props.selectedLayers[currentLckey].visible = false;
      }
    }
    if (typeFilter === 'lcc') {
      var selectBoxHighlightsLcc = document
        .getElementById('select-klc-lccTime')
        .value.match(/\d+/g)
        .map(Number)[0];
      /* var typeLegend =
        document.getElementById('select-klc-highlights-lcc').value ===
        'Dichotomous'
          ? 'all_lcc_a_pol'
          : 'all_lcc_b_pol'; */
      if (this.esriLayer_lcc !== null) {
        //this.esriLayer_lcc.sublayers.items[0].name = typeLegend;
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
      }
    } else {
      /* var typeLegend =
        document.getElementById('select-klc-highlights-lcc').value ===
        'Dichotomous'
          ? 'all_present_lc_a_pol'
          : 'all_present_lc_b_pol'; */
      var selectBoxHighlightsLc = document
        .getElementById('select-klc-lcTime')
        .value.match(/\d+/g)
        .map(Number)[0];
      if (this.esriLayer_lc !== null) {
        //this.esriLayer_lc.sublayers.items[0].name = typeLegend;
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
      }
    }
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
      if (this.dataJSONNames)
        this.getKLCNames(
          this.dataJSONNames,
          this.dataJSONNames[0].node.klc_name,
        );
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
      this.getKLCNames(this.dataJSONNames, this.dataJSONNames[0].node.klc_name);
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

  async getLayerParameters() {
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
        this.getKLCNames(data.nodes, data.nodes[0].node.klc_name);
      })
      .catch(function (error) {
        /* console.log('error while getting data'); */
      });
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
          <span>Present Land Cover</span>
          <span className="dropdown-icon ccl-icon-chevron-thin-down"></span>
        </div>
        <div className="measurement-dropdown-container">
          <br></br>
          <div className="esri-print__form-section-container">
            <label>
              Legend type
              <select
                id="select-klc-highlights-lc"
                className="esri-select"
              ></select>
            </label>
          </div>
          <div className="esri-print__form-section-container">
            <label>
              Year
              <select
                id="select-klc-lcTime"
                className="esri-select"
                data-target-property="layout"
              ></select>
            </label>
          </div>
          <button
            className="esri-button"
            onClick={() => this.handleApplyFilter('lc')}
          >
            Apply filter
          </button>
        </div>
      </div>
    );
  }

  getKLCNames(data, selectedOption) {
    var selectBox;
    var selectBoxHighlightsLc;
    var selectBoxLcTime;
    var selectBoxHighlightsLcc;
    var selectBoxLccTime;

    selectBox = document.getElementById('select-klc-area');
    selectBoxHighlightsLcc = document.getElementById(
      'select-klc-highlights-lcc',
    );
    selectBoxLccTime = document.getElementById('select-klc-lccTime');
    selectBoxHighlightsLc = document.getElementById('select-klc-highlights-lc');
    selectBoxLcTime = document.getElementById('select-klc-lcTime');

    for (let i = 0; i < data.length; i++) {
      var option = data[i].node.klc_name;
      if (option === selectedOption) {
        this.dataKlc_code = data[i].node.klc_code;
        //reset all selected options
        if (selectBoxLcTime && selectBoxHighlightsLc) {
          this.removeOptions(selectBoxLcTime);
          this.removeOptions(selectBoxHighlightsLc);
        }
        if (selectBoxLccTime && selectBoxHighlightsLcc) {
          this.removeOptions(selectBoxLccTime);
          this.removeOptions(selectBoxHighlightsLcc);
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
        if (
          data[i].node.keymap_info.toLowerCase().includes('a_classes":true')
        ) {
          selectBoxHighlightsLc.options.add(
            new Option('Dichotomous', 'Dichotomous', 'Dichotomous'),
          );
          selectBoxHighlightsLcc.options.add(
            new Option('Dichotomous', 'Dichotomous', 'Dichotomous'),
          );
        }
        if (
          data[i].node.keymap_info.toLowerCase().includes('b_classes":true')
        ) {
          selectBoxHighlightsLc.options.add(
            new Option('Modular', 'Modular', 'Modular'),
          );
          selectBoxHighlightsLcc.options.add(
            new Option('Modular', 'Modular', 'Modular'),
          );
        }
      }
      if (selectBox.options.length <= data.length)
        selectBox.options.add(new Option(option, option, option));
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
              Legend type
              <select
                id="select-klc-highlights-lcc"
                className="esri-select"
              ></select>
            </label>
          </div>
          <div className="esri-print__form-section-container">
            <label>
              Year
              <select
                id="select-klc-lccTime"
                className="esri-select"
                data-target-property="layout"
              ></select>
            </label>
          </div>
          <button
            className="esri-button"
            onClick={() => this.handleApplyFilter('lcc')}
          >
            Apply filter
          </button>
        </div>
      </div>
    );
  }

  render() {
    return (
      <>
        <div ref={this.container} className="hotspot-container">
          <div tooltip="Hotspot" direction="left" type="widget">
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
              <span>Hot-spots outside Europe filtering options</span>
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
                        onBlur={(e) =>
                          this.getKLCNames(this.dataJSONNames, e.target.value)
                        }
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
    await this.loader();
    this.props.view.ui.add(this.container.current, 'top-right');
    this.layerModelInit();
  }
}
export default HotspotWidget;