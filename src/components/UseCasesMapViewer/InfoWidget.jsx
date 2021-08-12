import React, { createRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { loadModules, loadCss } from 'esri-loader';

class InfoWidget extends React.Component {
  constructor(props) {
    super(props);
    //We create a reference to a DOM element to be mounted
    console.log('Constructed');
    this.container = createRef();
  }

  showUseCase(UseCase) {}

  showBrief(UseCase) {}

  showSummary() {}

  /**
   * This method renders the component
   * @returns jsx
   */
  render() {
    return (
      <>
        <div className="use-cases-products-block cont-w-50">
          <div className="use-cases-products-title">
            <span>x </span>
            use cases
          </div>
          <div className="use-cases-products-list">
            <div key="{index}" className="use-cases-dropdown">
              <div
                className="ccl-expandable__button"
                aria-expanded="expanded.includes(productToken)"
                onClick=""
                onKeyDown=""
                role="button"
                tabIndex="0"
              >
                productGroups[productToken].title
              </div>
              <div className="use-cases-element-container">
                <div key="{index}" className="use-cases-element">
                  <div className="use-case-element-title">useCase.title</div>
                  <div className="use-case-element-description">
                    <span>useCase.topics.map((topic) topic.title)</span>
                    <span>
                      new Date useCase?.effective, .toLocaleDateString
                    </span>
                    <span>useCase.responsibleOrganization</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
}

export default InfoWidget;
