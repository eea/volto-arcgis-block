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
  showUseCase(UseCase) { }

  /**
   * Shows summarized information of a given use case.
   * @param {*} UseCase
   */

  getDataBrief(data) {
    const children = data.map((val) => {
      return (
        <>
          <div className="use-cases-element-container">
            <div key={val.Use_case_title} className="use-cases-element">
              <div className="use-case-element-title">{val.Use_case_title}</div>
              <div className="use-case-element-description">
                <span>{val.Use_case_topics}</span>
                <span>{val.Use_case_submitting_production_year}</span>
                <span>{val.Spatial_coverage}</span>
              </div>
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
            <div
              role="button"
              tabIndex="0"
              onClick={navigation.returnToPrevious.bind(navigation, this)}
            >
              Back
            </div>
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
          <div className="use-cases-element-container">
            <div key={val.Use_case_title} className="use-cases-element">
              <div className="use-case-element-title">{val.Use_case_title}</div>
              <div className="use-case-element-description">
                <span>{val.Use_case_topics}</span>
                <span>{val.Use_case_submitting_production_year}</span>
                <span>{val.Spatial_coverage}</span>
              </div>
            </div>
          </div>
        </>);
    });
    return (
      <>
        <div key={Copernicus_Land_Monitoring_Service_products_used} className="use-cases-dropdown">
          <div className="ccl-expandable__button" role="button" tabIndex="0">
            {Copernicus_Land_Monitoring_Service_products_used}
          </div>
          {children}
        </div>
      </>
    )
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
