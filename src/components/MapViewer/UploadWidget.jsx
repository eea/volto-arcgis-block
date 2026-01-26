import React, { createRef } from 'react';
import { loadModules } from 'esri-loader';
// import { FontAwesomeIcon } from '@eeacms/volto-clms-utils/components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

var WMSLayer, WMTSLayer, WFSLayer, esriRequest;

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
      serviceUrl: '',
      selectedServiceType: '',
      wfsFeatures: {},
    };
    this.menuClass =
      'esri-icon-sketch-rectangle esri-widget--button esri-widget esri-interactive';
    this.mapviewer_config = this.props.mapviewer_config;
    this.fileInput = createRef();
    this.uploadUrlServiceHandler = this.props.uploadUrlServiceHandler;
    this.uploadFileErrorHandler = this.props.uploadFileErrorHandler;
    this.errorPopup = this.errorPopup.bind(this);
    this.selectedFeatures = {};
  }

  loader() {
    return loadModules([
      'esri/layers/WMSLayer',
      'esri/layers/WMTSLayer',
      'esri/layers/WFSLayer',
      'esri/request',
    ]).then(([_WMSLayer, _WMTSLayer, _WFSLayer, _esriRequest]) => {
      [WMSLayer, WMTSLayer, WFSLayer, esriRequest] = [
        _WMSLayer,
        _WMTSLayer,
        _WFSLayer,
        _esriRequest,
      ];
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
    //  serviceUrl: '',
    //});

    document.querySelector('.esri-attribution__powered-by').style.display =
      'none';
  }

  handleserviceUrlChange = (event) => {
    this.setState({ serviceUrl: event.target.value });
  };

  handleServiceTypeChange = (event) => {
    this.setState({ selectedServiceType: event.target.value });
  };

  getNormalizedUrlForType = (serviceUrl, serviceType) => {
    if (serviceType === 'WMTS') {
      try {
        const parsedUrl = new URL(serviceUrl);
        const pathName = parsedUrl.pathname;
        const searchQuery = parsedUrl.search.toLowerCase();
        if (
          pathName.includes('/wmts/') &&
          searchQuery.includes('request=gettile')
        ) {
          const pathParts = pathName.split('/').filter(Boolean);
          const wmtsIndex = pathParts.indexOf('wmts');
          const projection = pathParts[wmtsIndex + 1] || '';
          const variant = pathParts[wmtsIndex + 2] || '';
          if (projection && variant) {
            return (
              parsedUrl.origin +
              '/wmts/' +
              projection +
              '/' +
              variant +
              '/1.0.0/WMTSCapabilities.xml'
            );
          }
        }
      } catch (error) {}
    }
    return serviceUrl;
  };

  getCapabilities = (url, serviceType) => {
    // Get the coordinates of the click on the view
    return esriRequest(url, {
      responseType: 'html',
      sync: 'true',
      query: {
        request: 'GetCapabilities',
        service: serviceType,
        version: serviceType === 'WFS' ? '2.0.0' : '1.3.0',
      },
    })
      .then((response) => {
        const xmlDoc = response.data;
        const parser = new DOMParser();
        this.xml = parser.parseFromString(xmlDoc, 'text/html');
      })
      .catch(() => {});
  };

  parseWFSFeatures = (xml) => {
    let doc = xml;
    try {
      if (typeof xml === 'string') {
        const parser = new DOMParser();
        doc = parser.parseFromString(xml, 'text/xml');
      }
      const features = {};
      const featureTypes = doc.querySelectorAll('FeatureType, featuretype');
      featureTypes.forEach((ft) => {
        const titleEl =
          ft.querySelector('Title') ||
          ft.querySelector('title') ||
          ft.querySelector('ows\\:Title');
        const nameEl =
          ft.querySelector('Name') ||
          ft.querySelector('name') ||
          ft.querySelector('wfs\\:Name') ||
          ft.querySelector('ows\\:Identifier');
        const key = nameEl ? (nameEl.textContent || '').trim() : null;
        const title = titleEl ? (titleEl.textContent || '').trim() : null;
        if (key) {
          features[key] = title ?? null;
        }
      });
      return features;
    } catch (e) {
      return {};
    }
  };

  handleFeatureCheckboxChange = (event) => {
    const key = event.target.value;
    const { wfsFeatures } = this.state;
    if (event.target.checked) {
      this.selectedFeatures[key] =
        wfsFeatures && wfsFeatures[key] ? wfsFeatures[key] : key;
    } else {
      if (
        this.selectedFeatures &&
        Object.prototype.hasOwnProperty.call(this.selectedFeatures, key)
      ) {
        delete this.selectedFeatures[key];
      }
    }
    this.setState({});
  };

  handleSelectLayers = async () => {
    const { serviceUrl, selectedServiceType } = this.state;
    if (
      selectedServiceType === 'WFS' &&
      serviceUrl &&
      serviceUrl.trim() !== ''
    ) {
      const normalizedUrl = this.getNormalizedUrlForType(
        serviceUrl,
        selectedServiceType,
      );
      await this.getCapabilities(normalizedUrl, selectedServiceType);
      const result = this.parseWFSFeatures(this.xml);
      this.setState(() => ({
        wfsFeatures: result,
      }));
    } else {
      this.errorPopup();
    }
  };

  handleUploadService = async () => {
    const { serviceUrl, selectedServiceType } = this.state;
    if (selectedServiceType && serviceUrl && serviceUrl.trim() !== '') {
      const normalizedUrl = this.getNormalizedUrlForType(
        serviceUrl,
        selectedServiceType,
      );
      if (selectedServiceType === 'WMS') {
        this.uploadWMSService(normalizedUrl);
        this.setState({ serviceUrl: '' });
      } else if (selectedServiceType === 'WMTS') {
        this.uploadWMTSService(normalizedUrl);
        this.setState({ serviceUrl: '' });
      } else if (selectedServiceType === 'WFS') {
        this.uploadWFSService(normalizedUrl);
      } else {
        this.errorPopup();
        this.setState({ serviceUrl: '' });
        return;
      }
    } else {
      this.errorPopup();
      this.setState({ serviceUrl: '' });
    }
  };

  uploadWMSService = (url) => {
    this.uploadUrlServiceHandler(url, 'WMS');
  };

  uploadWMTSService = (url) => {
    this.uploadUrlServiceHandler(url, 'WMTS');
  };

  uploadWFSService = (url) => {
    this.uploadUrlServiceHandler(url, 'WFS', this.selectedFeatures);
    this.selectedFeatures = {};
    this.setState({ wfsFeatures: {}, serviceUrl: '' });
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

  componentDidUpdate(prevProps, prevState) {
    if (!prevProps.showErrorPopup && this.props.showErrorPopup) {
      this.errorPopup();
    }
  }

  /**
   * This method renders the component
   * @returns jsx
   */
  render() {
    const { selectedServiceType, serviceUrl, wfsFeatures } = this.state;
    const isUploadDisabled =
      !selectedServiceType ||
      !(serviceUrl && serviceUrl.trim() !== '') ||
      (selectedServiceType === 'WFS' &&
        Object.keys(wfsFeatures || {}).length > 0 &&
        Object.keys(this.selectedFeatures || {}).length === 0);
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
                        onChangeCapture={this.handleServiceTypeChange}
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
                        value={this.state.serviceUrl}
                        onChange={this.handleserviceUrlChange}
                      />
                    </label>
                  </div>
                  {this.state.selectedServiceType === 'WFS' &&
                  Object.keys(this.state.wfsFeatures || {}).length === 0 ? (
                    <button
                      className="esri-button"
                      onClick={this.handleSelectLayers}
                      disabled={
                        !this.state.selectedServiceType ||
                        !(
                          this.state.serviceUrl &&
                          this.state.serviceUrl.trim() !== ''
                        )
                      }
                    >
                      Select Layers
                    </button>
                  ) : (
                    <button
                      className="esri-button"
                      onClick={this.handleUploadService}
                      disabled={isUploadDisabled}
                    >
                      Upload service
                    </button>
                  )}
                  {Object.keys(this.state.wfsFeatures || {}).length > 0 && (
                    <div
                      className="wfs-features-list"
                      style={{
                        overflowY: 'auto',
                        overflowX: 'auto',
                        maxHeight: '280px',
                        width: '100%',
                      }}
                    >
                      {Object.entries(this.state.wfsFeatures).map(
                        ([key, title]) => (
                          <label
                            key={key}
                            className="field"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              margin: '6px 0',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <input
                              type="checkbox"
                              value={key}
                              onChange={this.handleFeatureCheckboxChange}
                              checked={Boolean(this.selectedFeatures[key])}
                              style={{ width: '18px', height: '18px' }}
                            />
                            <span>{title || key}</span>
                          </label>
                        ),
                      )}
                    </div>
                  )}
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
