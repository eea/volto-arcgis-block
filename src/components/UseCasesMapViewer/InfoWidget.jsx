import React, { createRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { loadModules, loadCss } from 'esri-loader';

var FeatureLayer, layerControl, navigation, map, view, layerRegion, layerSpatial, processedData = [];

class InfoWidget extends React.Component {
  constructor(props) {
    super(props);
    map = props.map;
    view = props.view;
    this.state = { useCaseLevel: 1, region: '' };
    FeatureLayer = props.FeatureLayer;
    navigation = props.navigation;
    layerControl = props.layerControl;
    layerRegion = props.layerRegion;
    layerSpatial = props.layerSpatial;
    this.container = createRef();
  }

  /**
   * Shows detailed information of a given use case.
   * @param {*} UseCase
   */
   showUseCase(UseCase) {
    return (
      <>
        <div className="use-cases-products-title">
          <span>x </span>
          use cases
        </div>
        <div className="use-case-detail">
          <div className="use-case-detail-close">
            <span className="ccl-icon-close" aria-label="Close" role="button"></span>
          </div>
          <div className="use-case-detail-image">
            <img
              src={
                'https://eu-copernicus.github.io/copernicus-component-library/assets/images/image_placeholder.jpg'
              }
              alt="Placeholder"
            />
          </div>
          <div className="use-case-detail-content">
            <div className="use-case-detail-product">Product 1</div>
            <div className="use-case-detail-title">Use case 1</div>
            <div className="use-case-detail-info">
              <span>Topic</span>
              <span>Year</span>
              <span>Organisation</span>
            </div>
            <div className="use-case-detail-description">
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
              </p>
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  /**
   * Shows summarized information of a given use case.
   * @param {*} UseCase
   */

  getDataBrief(data) {
    const children = data.map((val) => {
      return (
        <>
          <div key={val.Use_case_title} className="use-case-element" id={'use_case_'+val.OBJECTID}>
            <div className="use-case-element-title">{val.Use_case_title}</div>
            <div className="use-case-element-description">
              <span>{val.Use_case_topics}</span>
              <span>{val.Use_case_submitting_production_year}</span>
              <span>{val.Spatial_coverage}</span>
            </div>
          </div>
        </>);
    });

    return (
      <>
        {children}
      </>
    )
  }


  showBrief(selectedRegion) {
    var regionFeatures = []

    for (var feature in this.features) {
      if (this.features[feature].attributes.Region == selectedRegion) {
        regionFeatures.push(this.features[feature].attributes)
      }
    }
    return (
      <>
        <div className="use-cases-products-title">
          <span>{regionFeatures.length} </span>
          use cases
        </div>
        <div className="use-cases-products-list">
          <div key="{index}" className="use-cases-dropdown">
            <a
              className="use-case-button-back"
              role="button"
              tabIndex="0"
              onClick={navigation.returnToPrevious.bind(navigation, this)}
            >
              <span className="esri-icon-left-arrow"></span>
              Back
            </a>
            {this.getDataBrief(regionFeatures)}
          </div>
        </div>
      </>
    );
  }

  proccessDataSummary() {
    var serviceProducts = this.getDifferentproductUsed(this.features);
    var elements = [];

    for (var serviceProduct in serviceProducts) {
      processedData[serviceProducts[serviceProduct]] = [];
    }

    for (var feature in this.features) {
      elements.push(this.features[feature].attributes);
    }

    for (var element in elements) {
      processedData[elements[element].Copernicus_Land_Monitoring_Service_products_used].push(elements[element]);
    }

  }

  getDataSummary(data, Copernicus_Land_Monitoring_Service_products_used) {
    const children = data.map((val) => {
      return (
        <>
          <div key={val.Use_case_title} className="use-case-element">
            <div className="use-case-element-title">{val.Use_case_title}</div>
            <div className="use-case-element-description">
              <span>{val.Use_case_topics}</span>
              <span>{val.Use_case_submitting_production_year}</span>
              <span>{val.Spatial_coverage}</span>
            </div>
          </div>
        </>);
    });
    return (
      <>
        <div key={Copernicus_Land_Monitoring_Service_products_used} className="use-cases-dropdown">
          <div
            className="ccl-expandable__button"
            aria-expanded="false"
            onClick={this.toggleDropdownContent.bind(this)}
            onKeyDown={this.toggleDropdownContent.bind(this)}
            tabIndex="0"
            role="button"
          >
            {Copernicus_Land_Monitoring_Service_products_used}
          </div>
          <div className="use-cases-element-container">
            {children}
          </div>
        </div>
      </>
    )
  }

    /**
   * Method to toggle dropdown content
   * @param {*} e
   */
     toggleDropdownContent(e) {
      var aria = e.target.getAttribute('aria-expanded');
      e.target.setAttribute('aria-expanded', aria === 'true' ? 'false' : 'true');
    }

  setDOMSummary() {
    this.proccessDataSummary();
    var DOMElements = []
    for (var product_use_name in processedData)
      DOMElements.push(this.getDataSummary(processedData[product_use_name], product_use_name))

    return (
      <>
        {DOMElements}
      </>
    )
  }

  getDifferentproductUsed(features) {
    var serviceProducts = [], oldFeatureName = '';

    for (var feature in features) {
      var currentCLMS = features[feature].attributes.Copernicus_Land_Monitoring_Service_products_used;
      if (currentCLMS != oldFeatureName && !serviceProducts.includes(currentCLMS)) {
        serviceProducts.push(currentCLMS);
        oldFeatureName = currentCLMS;
      }
    }
    return serviceProducts;
  }

  /**
  * Shows summarized information of a whole set of use cases.
  */
  showSummary() {
    if (view !== undefined && this.features === undefined) {
      (async () => {
        var query = layerRegion.createQuery();
        query.set({
          where: '1=1',
          geometryType: 'esriGeometryEnvelope',
          outField: [
            'Copernicus_Land_Monitoring_Service_products_used, Use_case_title, Use_case_topics, Use_case_submitting_production_year, Spatial_coverage',
          ],
          orderByFields: 'Copernicus_Land_Monitoring_Service_products_used',
          format: 'JSON',
        });
        var features = await layerRegion.queryFeatures().then((featureSet) => {
          return featureSet.features;
        });

        features = layerControl.orderFeatures(features);

        this.features = features;

        this.setState({ useCaseLevel: 1, region: '' });
      })();

    } else if (this.features !== undefined) {

      return (
        <>
          <div className="use-cases-products-title">
            <span>{this.features.length} </span>
            use cases
          </div>
          <div className="use-cases-products-list">
            {this.setDOMSummary()}
          </div>
        </>
      );
    } else {
      return (
        <>
        </>
      );
    }
  }

  /**
  * It highlights the information displayed for a use case on the infoWidget.
  * */
  highligtInfo() { }

  /**
  * Highlights the point on the map corresponding to the use case
  * @param {*} coords
  */
  highligtPoint(coords) { }

  /**
  * This methos will update the component.
  * @param {*} nextProps
  */
  componentWillReceiveProps(nextProps) {
    this.setState({ useCaseLevel: nextProps.mapViewer.state.useCaseLevel, region: nextProps.mapViewer.state.region });
  }

  /**
  * This method will return the corresponding lateral menu depending on layers.
  * @returns HTML
  */
  useCasesInformationPanel() {

    if (this.state.useCaseLevel == 1)
      return this.showSummary();

    else if (this.state.useCaseLevel == 2)
      return this.showBrief(this.state.region);


    else return true;
  }

  /**
  * This method renders the component
  * @returns jsx
  */
  render() {

    return (
      <>
        <div className="use-cases-products-block cont-w-50">
          {this.useCasesInformationPanel()}
        </div>
      </>
    );
  }

}

export default InfoWidget;
