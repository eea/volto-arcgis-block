import React, { createRef } from 'react';
import { Loader } from 'semantic-ui-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

let layerControl,
  navigationControl,
  view,
  mapViewer,
  layerSpatial,
  layerHighlight,
  processedData = [];
class InfoWidget extends React.Component {
  constructor(props) {
    super(props);
    view = props.view;
    mapViewer = props.mapViewer;
    navigationControl = props.navigationControl;
    layerControl = props.layerControl;
    layerSpatial = props.layerSpatial;
    layerHighlight = props.layerHighlight;
    this.container = createRef();
    this.loadOnce = true;
  }

  /**
   * Renders lateral menu when a specific use case is selected
   * @param {Object} UseCase
   * @returns lateralMenu DOM
   */
  showUseCase(UseCase) {
    let responsibleOrganizationOrPerson = UseCase.Responsible_organisation
      ? UseCase.Responsible_organisation
      : UseCase.Contact_person_name_
      ? UseCase.Contact_person_name_
      : '';
    return (
      <>
        <div className="use-cases-products-title">Use case detail</div>
        <div className="use-case-detail">
          <div className="use-case-detail-close">
            <span
              className="ccl-icon-close"
              aria-label="Close"
              aria-hidden="true"
              role="button"
              onClick={() => navigationControl.returnToPrevious()}
            ></span>
          </div>
          <div className="use-case-detail-image">
            <img
              src={
                UseCase.Link_to_image
                  ? UseCase.Link_to_image
                  : this.props.thumbnail
              }
              alt="Use Case"
            />
          </div>
          <div className="use-case-detail-content">
            <div className="use-case-detail-product">
              {UseCase.Use_case_topics}
            </div>
            <div className="use-case-detail-title">
              <h3>{UseCase.Use_case_title}</h3>
            </div>
            <div className="use-case-detail-info">
              <span>{UseCase.Use_case_submitting_production_year}</span>
              <span>{UseCase.Origin_name}</span>
              <span>{responsibleOrganizationOrPerson}</span>
            </div>
            <div className="use-case-detail-info">
              <b>{UseCase.Copernicus_Land_Monitoring_Service_products_used}</b>
            </div>
            <div className="use-case-detail-description">
              <p>{UseCase.Use_case_summary}</p>
              {UseCase.Links_to_web_sites && (
                <div className="use-case-detail-link">
                  <p>
                    For further information
                    <a
                      href={UseCase.Links_to_web_sites.split(' ')[0]}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {' '}
                      here
                      <FontAwesomeIcon
                        className="map-menu-icon"
                        icon={['fas', 'external-link-alt']}
                      />
                    </a>
                    .
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  /**
   * Generates the DOM for selected region
   * @param {Object} data
   * @returns useCasesRegion
   */
  getDataBrief(data) {
    let titles = [];
    let children = data.map((val) => {
      let hideTitle = false;
      let responsibleOrganizationOrPerson = val.Responsible_organisation
        ? val.Responsible_organisation
        : val.Contact_person_name_
        ? val.Contact_person_name_
        : '';
      if (
        titles
          .map((a) => {
            return a.title;
          })
          .includes(val.Use_case_title) &&
        titles[
          titles
            .map((a) => {
              return a.title;
            })
            .indexOf(val.Use_case_title)
        ].component === val.Copernicus_Land_Monitoring_Service_products_used
      ) {
        hideTitle = true;
      } else {
        titles.push({
          title: val.Use_case_title,
          component: val.Copernicus_Land_Monitoring_Service_products_used,
        });
      }
      return (
        <div
          key={val.OBJECTID}
          className="use-case-element"
          aria-hidden="true"
          onClick={() => {
            view.popup.close();
            layerControl.getGeometry(val.Spatial_coverage, layerHighlight);
            layerControl.showLayer(layerHighlight.id);
            mapViewer.setState((prevState) => ({
              useCaseLevel: 4,
              selectedUseCase: val,
              previousState: prevState.useCaseLevel,
            }));
          }}
          id={`use_case_${val.OBJECTID}`}
        >
          <div
            className="use-case-element-title"
            style={{ display: hideTitle && 'none' }}
          >
            {val.Use_case_title}
          </div>
          <div className="use-case-element-description">
            <span>{val.Use_case_topics}</span>
            <span>{val.Use_case_submitting_production_year}</span>
            <span
              className="use-case-coverage"
              data-country-code={val.Spatial_coverage}
            >
              {val.Origin_name}
            </span>
            <span>{responsibleOrganizationOrPerson}</span>
          </div>
        </div>
      );
    });
    return children;
  }

  /**
   * Shows use cases brief information of selected region
   * @param {String} selectedRegion
   * @returns useCasesDOM
   */
  showBrief(selectedRegion) {
    let regionFeatures = [];
    if (mapViewer.state.useCaseLevel === 2) {
      for (let feature in this.features) {
        if (this.features[feature].attributes.Region === selectedRegion) {
          regionFeatures.push(this.features[feature].attributes);
        }
      }
      let count = [...new Set(regionFeatures.map((item) => item.Use_case_id))]
        .length;

      return (
        <div>
          <div className="use-cases-products-title">
            <span>{count} </span>
            use cases
          </div>
          <div className="use-case-button-back">
            <button
              tabIndex="0"
              onClick={() => {
                navigationControl.showWorld();
              }}
            >
              <span className="esri-icon-left-arrow"></span>
              See all use cases
            </button>
          </div>
          <div className="use-cases-products-list">
            <div key={selectedRegion} className="use-cases-dropdown">
              {this.getDataBrief(regionFeatures)}
            </div>
          </div>
        </div>
      );
    } else if (mapViewer.state.useCaseLevel === 3) {
      layerSpatial.definitionExpression !== null
        ? (layerSpatial.definitionExpression += ` AND Latitude = ${mapViewer.state.selectedUseCases[0].attributes.Latitude} AND Longitude = ${mapViewer.state.selectedUseCases[0].attributes.Longitude}`)
        : (layerSpatial.definitionExpression = `Latitude = ${mapViewer.state.selectedUseCases[0].attributes.Latitude} AND Longitude = ${mapViewer.state.selectedUseCases[0].attributes.Longitude}`);

      for (let feature in mapViewer.state.selectedUseCases) {
        regionFeatures.push(
          mapViewer.state.selectedUseCases[feature].attributes,
        );
      }
      let count = [...new Set(regionFeatures.map((item) => item.Use_case_id))]
        .length;
      return (
        <>
          <div className="use-cases-products-title">
            <span>{count} </span>
            use cases
          </div>
          <div className="use-case-button-back">
            <button
              tabIndex="0"
              onClick={() => {
                navigationControl.returnToPrevious();
              }}
            >
              <span className="esri-icon-left-arrow"></span>
              Back
            </button>
          </div>
          <div className="use-cases-products-list">
            <div key={selectedRegion} className="use-cases-dropdown">
              {this.getDataBrief(regionFeatures)}
            </div>
          </div>
        </>
      );
    }
  }

  /**
   * Transfrom raw data to ordered data by environmental topics
   */
  proccessDataSummary() {
    let topicProducts = this.getDifferentTopicUsed(this.features);

    for (let topicProduct in topicProducts) {
      processedData[topicProducts[topicProduct]] = [];
    }

    for (let feature in this.features) {
      let topics = this.features[feature].attributes.Use_case_topics.split(',');

      for (let topic in topics) {
        processedData[topics[topic]].push(this.features[feature].attributes);
      }
    }
  }

  /**
   * Creates lateral menu ordered by specified environmental topic
   * @param {Object} data
   * @param {String} topic_name
   * @returns lateralMenuDOM
   */
  getDataSummary(data, topic_name) {
    let children = this.getDataBrief(data);

    return (
      <div key={topic_name} className="use-cases-dropdown">
        <div
          className="ccl-expandable__button"
          aria-expanded="false"
          onClick={this.toggleDropdownContent.bind(this)}
          onKeyDown={this.toggleDropdownContent.bind(this)}
          tabIndex="0"
          role="button"
        >
          {topic_name}
        </div>
        <div className="use-cases-element-container">{children}</div>
      </div>
    );
  }

  /**
   * Method to toggle dropdown content
   * @param {Event} e
   */
  toggleDropdownContent(e) {
    let aria = e.target.getAttribute('aria-expanded');
    e.target.setAttribute('aria-expanded', aria === 'true' ? 'false' : 'true');
    if (aria === 'false') {
      document.querySelector('.use-cases-products-list').scrollTo({
        top:
          e.currentTarget.offsetTop -
          document.querySelector('.use-cases-products-list').offsetTop,
        behavior: 'smooth',
      });
    }
  }

  /**
   * Returns lateral menu
   * @returns lateralMenuDOM
   */
  setDOMSummary() {
    this.proccessDataSummary();
    let DOMElements = [];
    for (let topic_name in processedData)
      DOMElements.push(
        this.getDataSummary(processedData[topic_name], topic_name),
      );
    return <>{DOMElements}</>;
  }

  getCountryNames(countries) {
    let url =
      this.props.layerHighlight.url +
      '/0/query?where=CNTR_ID+in+%28' +
      countries +
      '%29&text=&objectIds=&time=&timeRelation=esriTimeRelationOverlaps&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&distance=&units=esriSRUnit_Foot&relationParam=&outFields=CNTR_ID%2C+NAME_ENGL&returnGeometry=false&returnTrueCurves=false&maxAllowableOffset=&geometryPrecision=&outSR=&havingClause=&returnIdsOnly=false&returnCountOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&gdbVersion=&historicMoment=&returnDistinctValues=false&resultOffset=&resultRecordCount=&returnExtentOnly=false&sqlFormat=none&datumTransformation=&parameterValues=&rangeValues=&quantizationParameters=&featureEncoding=esriDefault&f=pjson';
    return fetch(url);
  }

  /**
   * Returns all different Environmental Topic names
   * @param {Array} features
   * @returns allTopicNames
   */
  getDifferentTopicUsed(features) {
    let topicProducts = [];

    for (let feature in features) {
      let topics = features[feature].attributes.Use_case_topics.split(',');

      for (let topic in topics) {
        if (!topicProducts.includes(topics[topic])) {
          topicProducts.push(topics[topic]);
        }
      }
    }
    return topicProducts.sort();
  }

  /**
   * Shows summarized information of a whole set of use cases.
   */
  showSummary() {
    if (view !== undefined && this.features === undefined && this.loadOnce) {
      this.loadOnce = false;
      (async () => {
        let features = await layerSpatial
          .queryFeatures()
          .then((featureSet) => featureSet.features);
        let countryCodes = features
          .map((a) => {
            return a.attributes;
          })
          .map((b) => {
            return "'" + b.Spatial_coverage + "'";
          })
          .filter((v, i, a) => a.indexOf(v) === i);
        this.getCountryNames(countryCodes)
          .then((response) => response.json())
          .then((data) => {
            features = layerControl.orderFeatures(features, data.features);
            this.features = features;

            mapViewer.setState((prevState) => ({
              useCaseLevel: 1,
              region: '',
              selectedUseCase: '',
              previousState: prevState.useCaseLevel,
            }));
          });
      })();
    } else if (this.features !== undefined) {
      if (mapViewer.state.useCaseLevel !== 1) {
        mapViewer.setState((prevState) => ({
          useCaseLevel: 1,
          region: '',
          selectedUseCase: '',
          previousState: prevState.useCaseLevel,
        }));
      } else {
        return (
          <>
            <div className="use-cases-products-title">
              <span>
                {
                  [
                    ...new Set(
                      this.features.map((item) => item.attributes.Use_case_id),
                    ),
                  ].length
                }{' '}
              </span>
              use cases
            </div>
            <div className="use-cases-products-list">
              {this.setDOMSummary()}
            </div>
          </>
        );
      }
    } else {
      return <></>;
    }
  }

  /**
   * This method will return the corresponding lateral menu depending on layers.
   * @returns HTML
   */
  useCasesInformationPanel() {
    switch (mapViewer.state.useCaseLevel) {
      case 1:
        return this.showSummary();
      case 2:
        return this.showBrief(mapViewer.state.region);
      case 3:
        return this.showBrief(mapViewer.state.selectedUseCases);
      case 4:
        let title = mapViewer.state.selectedUseCase.Use_case_title;
        let bbox = mapViewer.state.selectedUseCase.BBOX;
        let region = mapViewer.state.selectedUseCase.Region;
        let country = mapViewer.state.selectedUseCase.Spatial_coverage;
        navigationControl.navigateToLocation(
          bbox,
          title,
          region,
          country,
          layerSpatial,
        );
        try {
          document
            .querySelector('.use-cases-products-list')
            .scrollTo({ top: 0, behavior: 'smooth' });
        } catch {}
        return this.showUseCase(mapViewer.state.selectedUseCase);
      default:
        return 0;
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
          {!this.features && (
            <Loader active inline="centered" indeterminate size="small" />
          )}
        </div>
      </>
    );
  }
}

export default InfoWidget;
