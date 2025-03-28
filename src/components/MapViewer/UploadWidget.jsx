import React, { createRef } from 'react';
import { loadModules } from 'esri-loader';
// import { FontAwesomeIcon } from '@eeacms/volto-clms-utils/components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

var WMSLayer;

class UploadWidget extends React.Component {
  /**
   * Creator of the Upload widget class
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
      showInfoPopup: false,
      infoPopupType: '',
      wmsServiceUrl: '',
    };
    this.menuClass =
      'esri-icon-sketch-rectangle esri-widget--button esri-widget esri-interactive';
    this.mapviewer_config = this.props.mapviewer_config;
    this.fileInput = createRef();
    this.uploadUrlServiceHandler = this.props.uploadUrlServiceHandler;
    this.uploadFileErrorHandler = this.props.uploadFileErrorHandler;
    this.errorPopup = this.errorPopup.bind(this);
  }

  loader() {
    return loadModules(['esri/layers/WMSLayer']).then(([_WMSLayer]) => {
      [WMSLayer] = [_WMSLayer];
    });
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
      this.container.current.querySelector(
        '.right-panel-content',
      ).style.overflowY = 'auto';
      this.container.current.querySelector(
        '.right-panel-content',
      ).style.display = 'none';
      this.container.current.querySelector(
        '.right-panel-content',
      ).style.alignItems = 'none';
      this.container.current.querySelector('.upload-panel').style.display =
        'none';
      this.container.current.querySelector('.upload-panel').style.flexWrap =
        'none';
      this.container.current
        .querySelector('.esri-widget--button')
        .classList.remove('active-widget');
      document
        .querySelector('.esri-ui-top-right.esri-ui-corner')
        .classList.remove('show-panel');
      // By invoking the setState, we notify the state we want to reach
      // and ensure that the component is rendered again
      this.setState({
        showMapMenu: false,
        showInfoPopup: false,
        infoPopupType: '',
      });
      this.clearWidget();
    } else {
      this.props.mapViewer.setActiveWidget(this);
      this.container.current.querySelector('.right-panel').style.display =
        'flex';
      this.container.current.querySelector(
        '.right-panel-content',
      ).style.overflowY = 'hidden';
      this.container.current.querySelector(
        '.right-panel-content',
      ).style.display = 'flex';
      this.container.current.querySelector(
        '.right-panel-content',
      ).style.alignItems = 'center';
      this.container.current.querySelector('.upload-panel').style.display =
        'flex';
      this.container.current.querySelector('.upload-panel').style.flexWrap =
        'wrap';
      this.container.current
        .querySelector('.esri-widget--button')
        .classList.add('active-widget');
      document
        .querySelector('.esri-ui-top-right.esri-ui-corner')
        .classList.add('show-panel');
      // By invoking the setState, we notify the state we want to reach
      // and ensure that the component is rendered again
      this.setState({
        showMapMenu: true,
        showInfoPopup: false,
        infoPopupType: '',
      });
    }
  }

  clearWidget() {
    window.document.querySelector('.pan-container').style.display = 'none';
    this.props.mapViewer.view.popup.close();
    //const { wmsLayer } = this.state;
    //if (wmsLayer) {
    //  this.props.view.map.remove(wmsLayer);
    //  // this.props.view.graphics.removeAll();
    //}
    //this.setState({
    //  wmsLayer: null,
    //  wmsServiceUrl: '',
    //});

    document.querySelector('.esri-attribution__powered-by').style.display =
      'none';
  }

  handleWmsServiceUrlChange = (event) => {
    this.setState({ wmsServiceUrl: event.target.value });
  };

  handleUploadService = () => {
    const { wmsServiceUrl } = this.state;

    if (
      wmsServiceUrl &&
      wmsServiceUrl.trim() !== '' &&
      wmsServiceUrl.toLowerCase().includes('wms')
    ) {
      this.uploadUrlServiceHandler(wmsServiceUrl);
      this.setState({
        wmsServiceUrl: '',
      });
    } else {
      this.errorPopup();
    }
  };

  errorPopup = () => {
    this.setState({
      showInfoPopup: true,
      infoPopupType: 'uploadError',
    });
    setTimeout(() => {
      this.setState({
        showInfoPopup: false,
        infoPopupType: '',
      });
    }, 3000);
  };

  /**
   * This method is executed after the render method is executed
   */
  async componentDidMount() {
    await this.loader();
    this.props.view.when(() => {
      this.container.current !== null &&
        this.props.view.ui.add(this.container.current, 'top-right');
      //load an empty wms layer to use the variable
      const wmsLayer = new WMSLayer({
        url: '',
        title: 'WMS Layer',
      });
      this.setState({
        wmsLayer: wmsLayer,
      });
    });
  }

  componentDidUpdate(prevProps) {
    if (!prevProps.showErrorPopup && this.props.showErrorPopup) {
      this.errorPopup();
    }
  }

  /**
   * This method renders the component
   * @returns jsx
   */
  render() {
    return (
      <>
        <div ref={this.container} className="upload-container">
          <div tooltip="Add Map service" direction="left" type="widget">
            <div
              className={this.menuClass}
              id="map_upload_button"
              aria-label="WMS service upload"
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
              <span>Add map service</span>
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
              <div className="upload-panel">
                <div className="ccl-form">
                  <div className="field">
                    <label>
                      Map service address
                      <input
                        type="text"
                        placeholder="Add map service URL (https://...)"
                        value={this.state.wmsServiceUrl}
                        onChange={this.handleWmsServiceUrlChange}
                      />
                    </label>
                  </div>
                  <button
                    className="esri-button"
                    onClick={this.handleUploadService}
                  >
                    Upload service
                  </button>
                </div>
              </div>
            </div>
          </div>
          {this.state.showInfoPopup && (
            <div className="map-container popup-block">
              <div className="drawRectanglePopup-block">
                <div className="drawRectanglePopup-content">
                  {this.state.infoPopupType === 'uploadError' && (
                    <>
                      <span className="drawRectanglePopup-icon">
                        <FontAwesomeIcon icon={['fas', 'info-circle']} />
                      </span>
                      <div className="drawRectanglePopup-text">
                        Error uploading the map service.
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }
}
export default UploadWidget;
