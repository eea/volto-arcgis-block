import React, { createRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { loadModules, loadCss } from 'esri-loader';

var FeatureLayer,
  layerControl,
  navigation,
  map,
  view,
  layerRegion,
  layerSpatial;

class InfoWidget extends React.Component {
  constructor(props) {
    super(props);
    map = props.map;
    view = props.view;
    this.state = { useCaseLevel: 1 };
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
  showBrief() {
    return (
      <>
        <div className="use-cases-products-title">
          <span>x </span>
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
            <div className="use-cases-element-container">
              <div key="{index}" className="use-cases-element">
                <div className="use-case-element-title">Use_case_title</div>
                <div className="use-case-element-description">
                  <span>Use_case_topics</span>
                  <span>Use_case_submitting_production_year</span>
                  <span>Spatial_coverage</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }



  proccessDataSummary() {
    var serviceProducts = this.getDifferentproductUsed(this.features);
    var elements = [];
    var processedData = [];
    for (var serviceProduct in serviceProducts) {
      processedData[serviceProducts[serviceProduct]] = [];
    }

    for (var feature in this.features) {
      elements.push(this.features[feature].attributes);
    }

    for (var element in elements) {
      processedData[elements[element].Copernicus_Land_Monitoring_Service_products_used].push(elements[element]);
    }

    return processedData;
  }


  getDataSummary(processedData, Copernicus_Land_Monitoring_Service_products_used) {
    const children = processedData.map((val) => {
      return (<>
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

    return (<>
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
    var processedData = this.proccessDataSummary();
    var DOMElements = []

    for (var data in processedData) {
      DOMElements.push(this.getDataSummary(processedData[data], data))
    }

    return (
      <>
        {this.getDataSummary(processedData[data], data)}
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

        this.setState({ useCaseLevel: 1 });
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
          <div className="use-cases-products-title">
            <span>x </span>
            use cases
          </div>
          <div className="use-cases-products-list">
            <div key="{index}" className="use-cases-dropdown">
              <div
                className="ccl-expandable__button"
                role="button"
                tabIndex="0"
              >
                Copernicus_Land_Monitoring_Service_products_used
              </div>
              <div className="use-cases-element-container">
                <div key="{index}" className="use-cases-element">
                  <div className="use-case-element-title">Use_case_title</div>
                  <div className="use-case-element-description">
                    <span>Use_case_topics</span>
                    <span>Use_case_submitting_production_year</span>
                    <span>Spatial_coverage</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
    this.setState({ useCaseLevel: nextProps.mapViewer.state.useCaseLevel });
  }

  /**
   * This method will return the corresponding lateral menu depending on layers.
   * @returns HTML
   */
  useCasesInformationPanel() {
    if (this.state.useCaseLevel == 1) {
      return this.showSummary();
    } else if (this.state.useCaseLevel == 2) {
      return this.showBrief();
    } else return true;
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
