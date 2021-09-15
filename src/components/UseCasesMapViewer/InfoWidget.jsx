import React, { createRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { loadModules, loadCss } from 'esri-loader';

var FeatureLayer, control, navigation;

class InfoWidget extends React.Component {
  constructor(props) {
    super(props);
    this.map = props.map;
    this.view = props.view;
    this.state = { useCaseLevel: 1 };

    FeatureLayer = props.FeatureLayer;
    control = props.control;
    navigation = props.navigation;

    this.container = createRef();
  }

  /**
   * Shows detailed information of a given use case.
   * @param {*} UseCase
   */
  showUseCase(UseCase) {}

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

  /**
   * Shows summarized information of a whole set of use cases.
   */
  showSummary() {
    debugger;
    if (this.view != undefined) {
      var response = this.view.hitTest().then(function (response) {
        if (response.results.length) {
          var graphic = response.results.filter(function (result) {
            return result.graphic;
          });
          debugger;
          return graphic[0].graphic.attributes;
        }
      });
    }

    return (
      <>
        <div className="use-cases-products-title">
          <span>x </span>
          use cases
        </div>
        <div className="use-cases-products-list">
          <div key="{index}" className="use-cases-dropdown">
            <div className="ccl-expandable__button" role="button" tabIndex="0">
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

  /**
   * It highlights the information displayed for a use case on the infoWidget.
   * */
  highligtInfo() {}

  /**
   * Highlights the point on the map corresponding to the use case
   * @param {*} coords
   */
  highligtPoint(coords) {}

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
