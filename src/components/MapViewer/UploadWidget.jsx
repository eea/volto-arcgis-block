import React, { createRef } from 'react';
import { loadModules } from 'esri-loader';
// import { FontAwesomeIcon } from '@eeacms/volto-clms-utils/components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

var WMSLayer, WMTSLayer, WFSLayer;

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
      selectedServiceType: '',
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
    return loadModules([
      'esri/layers/WMSLayer',
      'esri/layers/WMTSLayer',
      'esri/layers/WFSLayer',
    ]).then(([_WMSLayer, _WMTSLayer, _WFSLayer]) => {
      [WMSLayer, WMTSLayer, WFSLayer] = [_WMSLayer, _WMTSLayer, _WFSLayer];
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

  handleServiceTypeChange = (event) => {
    this.setState({ selectedServiceType: event.target.value });
  };

  handleUploadService = async () => {
    const { wmsServiceUrl, selectedServiceType } = this.state;
    try {
      // Use a CORS proxy or add mode: 'no-cors' if you just need to check if service exists
      let urlResult = await fetch(wmsServiceUrl, {
        method: 'GET',
        mode: 'cors', // You might need to change this to 'no-cors' if proxy isn't available
      });

      // Check if service is valid and properly responds
      if (!urlResult || !urlResult.ok) {
        this.errorPopup();
        this.setState({ wmsServiceUrl: '' });
        return;
      }
    } catch (error) {
      this.errorPopup();
      this.setState({ wmsServiceUrl: '' });
      return;
    }
    if (selectedServiceType && wmsServiceUrl && wmsServiceUrl.trim() !== '') {
      if (selectedServiceType === 'WMS') {
        this.uploadWMSService(wmsServiceUrl);
      } else if (selectedServiceType === 'WMTS') {
        this.uploadWMTSService(wmsServiceUrl);
      } else if (selectedServiceType === 'WFS') {
        this.uploadWFSService(wmsServiceUrl);
      } else {
        this.errorPopup();
        this.setState({ wmsServiceUrl: '' });
        return;
      }
      this.setState({ wmsServiceUrl: '' });
    } else {
      this.errorPopup();
      this.setState({ wmsServiceUrl: '' });
    }
  };

  uploadWMSService = (url) => {
    this.uploadUrlServiceHandler(url, 'WMS');
  };

  uploadWMTSService = (url) => {
    this.uploadUrlServiceHandler(url, 'WMTS');
  };

  uploadWFSService = (url) => {
    this.uploadUrlServiceHandler(url, 'WFS');
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
      const wmtsLayer = new WMTSLayer({
        url: '',
        title: 'WMTS Layer',
      });
      const wfsLayer = new WFSLayer({
        url: '',
        title: 'WFS Layer',
      });
      this.setState({
        wmsLayer: wmsLayer,
        wmtsLayer: wmtsLayer,
        wfsLayer: wfsLayer,
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
          <div tooltip="Add External Service" direction="left" type="widget">
            <div
              className={this.menuClass}
              id="map_upload_button"
              aria-label="External service upload"
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
              <span>Add external service</span>
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
                      Service type
                      <select
                        value={this.state.selectedServiceType}
                        onBlur={this.handleServiceTypeChange}
                      >
                        <option value="">Select a service</option>
                        <option value="WMS">WMS</option>
                        <option value="WMTS">WMTS</option>
                        <option value="WFS">WFS</option>
                      </select>
                    </label>
                  </div>
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
                    disabled={
                      !this.state.selectedServiceType ||
                      !(
                        this.state.wmsServiceUrl &&
                        this.state.wmsServiceUrl.trim() !== ''
                      )
                    }
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
