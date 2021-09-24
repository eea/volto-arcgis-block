import React, { createRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { loadModules, loadCss } from 'esri-loader';

let FeatureLayer, layerControl, navigationControl, map, view, layerRegion, layerSpatial, processedData = [];

class InfoWidget extends React.Component {
  constructor(props) {
    super(props);
    map = props.map;
    view = props.view;
    this.state = { useCaseLevel: 1, region: '', selectedUseCase: '', previousState: 1 };
    FeatureLayer = props.FeatureLayer;
    navigationControl = props.navigationControl;
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
          use case info
        </div>
        <div className="use-case-detail">
          <div className="use-case-detail-close">
            <span className="ccl-icon-close" aria-label="Close" role="button" onClick={() => navigationControl.returnToPrevious(this)}></span>
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
            <div className="use-case-detail-product">{UseCase.Copernicus_Land_Monitoring_Service_products_used}</div>
            <div className="use-case-detail-title"><h3>{UseCase.Use_case_title}</h3></div>
            <div className="use-case-detail-info">
              <span>{UseCase.Use_case_topics}</span>
              <span>{UseCase.Use_case_submitting_production_year}</span>
              <span>{UseCase.Spatial_coverage}</span>
            </div>
            <div className="use-case-detail-description">
              <p>
                {UseCase.Use_case_summary}
              </p>
              <p>
                For further information <a href={UseCase.Links_to_web_sites}>here</a>.
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
          <div key={val.Use_case_title} className="use-case-element" onClick={() => this.setState({ useCaseLevel: 3, selectedUseCase: val, previousState: this.state.useCaseLevel })} id={`use_case_ ${val.OBJECTID}`}>
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
    const regionFeatures = []

    for (let feature in this.features) {
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
              onClick={() => navigationControl.returnToPrevious(this)}
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
    const serviceProducts = this.getDifferentproductUsed(this.features);
    const elements = [];

    for (let serviceProduct in serviceProducts) {
      processedData[serviceProducts[serviceProduct]] = [];
    }

    for (let feature in this.features) {
      elements.push(this.features[feature].attributes);
    }

    for (let element in elements) {
      processedData[elements[element].Copernicus_Land_Monitoring_Service_products_used].push(elements[element]);
    }

  }

  getDataSummary(data, Copernicus_Land_Monitoring_Service_products_used) {
    const children = this.getDataBrief(data)

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
    let aria = e.target.getAttribute('aria-expanded');
    e.target.setAttribute('aria-expanded', aria === 'true' ? 'false' : 'true');
  }

  setDOMSummary() {
    this.proccessDataSummary();
    const DOMElements = []
    for (let product_use_name in processedData)
      DOMElements.push(this.getDataSummary(processedData[product_use_name], product_use_name))

    return (
      <>
        {DOMElements}
      </>
    )
  }

  getDifferentproductUsed(features) {
    let serviceProducts = [], oldFeatureName = '';

    for (let feature in features) {
      let currentCLMS = features[feature].attributes.Copernicus_Land_Monitoring_Service_products_used;
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
        let features = await layerRegion.queryFeatures().then((featureSet) => featureSet.features);
        features = layerControl.orderFeatures(features);

        this.features = features;

        this.setState({ useCaseLevel: 1, region: '', selectedUseCase: '', previousState: this.state.useCaseLevel });
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
    this.setState({
      useCaseLevel: nextProps.mapViewer.state.useCaseLevel,
      region: nextProps.mapViewer.state.region,
      selectedUseCase: nextProps.mapViewer.state.selectedUseCase,
      previousState: this.state.useCaseLevel
    });
  }

  /**
  * This method will return the corresponding lateral menu depending on layers.
  * @returns HTML
  */
  useCasesInformationPanel() {

    switch (this.state.useCaseLevel) {

      case 1:
        return this.showSummary();

      case 2:
        return this.showBrief(this.state.region);

      case 3:
        const title = this.state.selectedUseCase.Use_case_title;
        const bbox = this.state.selectedUseCase.BBOX;
        const region = this.state.selectedUseCase.Region;
        navigationControl.navigateToLocation(bbox, title, region, layerSpatial);
        return this.showUseCase(this.state.selectedUseCase);
    }


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
