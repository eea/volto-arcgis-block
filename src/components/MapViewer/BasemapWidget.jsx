import React, { createRef } from 'react';
import { loadModules } from 'esri-loader';
var BasemapGallery;
var Basemap;
var WebTileLayer;
var esriRequest;
// var LocalBasemapsSource;

// Configuration
const LOAD_WHOLE_SERVICE = false;
const GISCO_CAPABILITIES_URL =
  'https://gisco-services.ec.europa.eu/maps/wmts/1.0.0/WMTSCapabilities.xml';

class BasemapWidget extends React.Component {
  /**
   * Creator of the Basemap widget class
   * @param {*} props
   */
  constructor(props) {
    super(props);
    //We create a reference to a DOM element to be mounted
    this.container = createRef();
    //Initially, we set the state of the component to
    //not be showing the basemap panel
    this.state = { showMapMenu: false };
    this.menuClass =
      'esri-icon-basemap esri-widget--button esri-widget esri-interactive';
    this.loadFirst = true;
    this.urls = this.props.urls;
  }

  loader() {
    return loadModules([
      'esri/widgets/BasemapGallery',
      'esri/Basemap',
      'esri/layers/WebTileLayer',
      'esri/widgets/BasemapGallery/support/LocalBasemapsSource',
      'esri/request',
    ]).then(
      ([
        _BasemapGallery,
        _Basemap,
        _WebTileLayer,
        _LocalBasemapsSource,
        _esriRequest,
      ]) => {
        [BasemapGallery] = [_BasemapGallery];
        [Basemap] = [_Basemap];
        [WebTileLayer] = [_WebTileLayer];
        [esriRequest] = [_esriRequest];

        // [LocalBasemapsSource] = [_LocalBasemapsSource];
      },
    );
  }

  /**
   * Method that will be invoked when the
   * button is clicked. It controls the open
   * and close actions of the component
   */

  getGISCOCapabilities = (url) => {
    // Get the coordinates of the click on the view
    return esriRequest(url, {
      responseType: 'html',
      sync: 'true',
    }).then((response) => {
      let parser = new DOMParser();
      let xml = parser.parseFromString(response.data, 'text/html');
      return xml;
    });
  };

  parseCapabilities = (xml, tag) => {
    return xml.getElementsByTagName(tag);
  };

  openMenu = () => {
    // if (this.loadFirst) {
    //   // Add styles to selected basemap, but fails if not exist
    //   document
    //     .querySelectorAll('.esri-basemap-gallery__item')[0]
    //     .setAttribute('aria-selected', true);
    //   document
    //     .querySelectorAll('.esri-basemap-gallery__item')[0]
    //     .classList.add('esri-basemap-gallery__item--selected');
    //   this.loadFirst = false;

    //   document
    //     .querySelector('.esri-basemap-gallery__item-container')
    //     .addEventListener(
    //       'click',
    //       (e) => {
    //         document
    //           .querySelectorAll('.esri-basemap-gallery__item')[0]
    //           .setAttribute('aria-selected', false);
    //         document
    //           .querySelectorAll('.esri-basemap-gallery__item')[0]
    //           .classList.remove('esri-basemap-gallery__item--selected');
    //       },
    //       {
    //         once: true,
    //       },
    //   );
    // }

    if (this.state.showMapMenu) {
      this.props.mapViewer.setActiveWidget();
      this.container.current.querySelector('.right-panel').style.display =
        'none';
      this.container.current
        .querySelector('.esri-widget--button')
        .classList.remove('active-widget');
      document
        .querySelector('.esri-ui-top-right.esri-ui-corner')
        .classList.remove('show-panel');
      // By invoking the setState, we notify the state we want to reach
      // and ensure that the component is rendered again
      this.setState({ showMapMenu: false });
    } else {
      this.props.mapViewer.setActiveWidget(this);
      this.basemapGallery.domNode.classList.add('basemap-gallery-container');
      this.container.current.querySelector('.right-panel').style.display =
        'flex';
      this.container.current
        .querySelector('.esri-widget--button')
        .classList.add('active-widget');
      document
        .querySelector('.esri-ui-top-right.esri-ui-corner')
        .classList.add('show-panel');
      // By invoking the setState, we notify the state we want to reach
      // and ensure that the component is rendered again
      this.setState({ showMapMenu: true });
    }
  };
  /**
   * This method is executed after the rener method is executed
   */

  layerArray = [];
  async componentDidMount() {
    await this.loader();
    if (!this.container.current) return;

    if (LOAD_WHOLE_SERVICE) {
      // Load all layers in GISCO service as basemap
      this.getGISCOCapabilities(GISCO_CAPABILITIES_URL).then((xml) => {
        let layers = Array.from(xml.querySelectorAll('Layer')).filter(
          (v) => v.querySelectorAll('Layer').length === 0,
        );
        let url = '';

        let epsgArray = [];
        Array.from(layers[0].querySelectorAll('tilematrixset')).map(
          (element) => {
            epsgArray.push(element.innerText);
            return element;
          },
        );
        let proj = 'EPSG3857'; //default projection
        for (let i = 0; i < layers.length; i++) {
          if (!epsgArray.includes(proj)) {
            proj = epsgArray[0];
          }
          url = this.parseCapabilities(layers[i], 'ResourceURL')[0].attributes
            .template.textContent;
          let basemapCode = `
            let basemap${i} = new Basemap({
              title: this.parseCapabilities(layers[${i}], 'ows:title')[0].innerText,
              thumbnailUrl: ${url}.replace('{TileMatrixSet}/{TileMatrix}/{TileCol}/{TileRow}', '/${proj}/0/0/0'),
              baseLayers: [
                new WebTileLayer({
                  urlTemplate: ${url}.replace('{TileMatrixSet}/{TileMatrix}/{TileCol}/{TileRow}', '/${proj}/{z}/{x}/{y}'),
                  copyright: '© OpenStreetMap (and) contributors, CC-BY-SA',
                })
              ]
            });
            this.layerArray.push(basemap${i});
          `;

          Function.apply(null, [basemapCode]).call(this);
        }
        this.basemapGallery = new BasemapGallery({
          view: this.props.view,
          container: this.container.current.querySelector('.basemap-panel'),
          source: this.layerArray,
        });
      });
    } else {
      // Only 3 basemaps
      this.positronCompositeBasemap = new Basemap({
        title: 'Positron composite',
        thumbnailUrl: this.urls.positronCompositeThumbnail,
        baseLayers: [
          new WebTileLayer({
            urlTemplate: this.urls.positronCompositeTemplate,
            copyright: '© OpenStreetMap (and) contributors, CC-BY-SA',
          }),
        ],
        // referenceLayers: [
        //   new _WebTileLayer(...)
        // ],
      });

      this.blossomCompositeBasemap = new Basemap({
        title: 'Blossom composite',
        thumbnailUrl: this.urls.blossomCompositeThumbnail,
        baseLayers: [
          new WebTileLayer({
            urlTemplate: this.urls.blossomCompositeTemplate,
            copyright: '© OpenStreetMap (and) contributors, CC-BY-SA',
          }),
        ],
        // referenceLayers: [
        //   new WebTileLayer(...)
        // ],
      });

      this.worldBoundariesBasemap = new Basemap({
        title: 'World boundaries',
        thumbnailUrl: this.urls.countriesWorldThumbnail,
        baseLayers: [
          new WebTileLayer({
            urlTemplate: this.urls.countriesWorldTemplate,
            copyright: '© OpenStreetMap (and) contributors, CC-BY-SA',
          }),
        ],
        // referenceLayers: [
        //   new WebTileLayer(...)
        // ],
      });

      this.basemapGallery = new BasemapGallery({
        view: this.props.view,
        container: this.container.current.querySelector('.basemap-panel'),
        source: [
          this.worldBoundariesBasemap,
          this.blossomCompositeBasemap,
          this.positronCompositeBasemap,
        ],
      });
    }
    this.props.view.ui.add(this.container.current, 'top-right');
    document.querySelector('.esri-attribution__powered-by').style.display =
      'none';
  }
  /**
   * This method renders the component
   * @returns jsx
   */
  render() {
    return (
      <>
        <div ref={this.container} className="basemap-container">
          <div tooltip="Basemap gallery" direction="left" type="widget">
            <div
              // ref={this.basemaps}
              className={this.menuClass}
              id="map_basemap_button"
              aria-label="Basemap gallery"
              onClick={this.openMenu.bind(this)}
              onKeyDown={this.openMenu.bind(this)}
              tabIndex="0"
              role="button"
            ></div>
          </div>
          <div className="right-panel">
            <div className="right-panel-header">
              <span>Basemap gallery</span>
              <span
                className="map-menu-icon esri-icon-close"
                onClick={this.openMenu.bind(this)}
                onKeyDown={this.openMenu.bind(this)}
                tabIndex="0"
                role="button"
              ></span>
            </div>
            <div className="right-panel-content">
              <div className="basemap-panel"></div>
            </div>
          </div>
        </div>
      </>
    );
    //</div>
  }
}

export default BasemapWidget;
