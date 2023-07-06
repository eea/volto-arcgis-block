import React, { createRef } from 'react';
import { loadModules } from 'esri-loader';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

var Graphic,
  Extent,
  FeatureLayer,
  GroupLayer,
  Color,
  SimpleLineSymbol,
  SimpleFillSymbol;

class AreaWidget extends React.Component {
  /**
   * Creator of the Measurement widget class
   * @param {*} props
   */
  constructor(props) {
    super(props);
    //We create a reference to a DOM element to be mounted
    this.container = this.props.download
      ? document.querySelector('#download_panel')
      : createRef();
    //Initially, we set the state of the component to
    //not be showing the basemap panel
    this.state = {
      showMapMenu: false,
      showInfoPopup: this.props.download ? true : false,
      infoPopupType: 'area',
    };
    this.menuClass =
      'esri-icon-cursor-marquee esri-widget--button esri-widget esri-interactive';
    // Enable defaultPopup option to charge popup and highlifght feature
    this.props.mapViewer.view.popup.defaultPopupTemplateEnabled = true;
  }

  loader() {
    return loadModules([
      'esri/Graphic',
      'esri/geometry/Extent',
      'esri/layers/FeatureLayer',
      'esri/layers/GroupLayer',
      'esri/Color',
      'esri/symbols/SimpleLineSymbol',
      'esri/symbols/SimpleFillSymbol',
    ]).then(
      ([
        _Graphic,
        _Extent,
        _FeatureLayer,
        _GroupLayer,
        _Color,
        _SimpleLineSymbol,
        _SimpleFillSymbol,
      ]) => {
        [
          Graphic,
          Extent,
          FeatureLayer,
          GroupLayer,
          Color,
          SimpleLineSymbol,
          SimpleFillSymbol,
        ] = [
          _Graphic,
          _Extent,
          _FeatureLayer,
          _GroupLayer,
          _Color,
          _SimpleLineSymbol,
          _SimpleFillSymbol,
        ];
      },
    );
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
        infoPopupType: 'area',
      });
      this.clearWidget();
      this.container.current.querySelector(
        '#download_area_select_nuts0',
      ).checked = true;
    } else {
      this.props.mapViewer.setActiveWidget(this);
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
      this.setState({
        showMapMenu: true,
        showInfoPopup: true,
        infoPopupType: 'area',
      });
      this.container.current.querySelector('input:checked').click();
    }
  }
  nuts0handler(e) {
    this.loadNutsService(e.target.value, [0]);
  }
  nuts1handler(e) {
    this.loadNutsService(e.target.value, [1, 2]);
  }
  nuts2handler(e) {
    this.loadNutsService(e.target.value, [3, 4, 5]);
  }
  nuts3handler(e) {
    this.loadNutsService(e.target.value, [6, 7, 8]);
  }
  countriesHandler(e) {
    this.loadCountriesService(e.target.value);
  }

  loadNutsService(id, levels) {
    this.clearWidget();

    // This symbol and renderer if view is 3D
    let symbol = {
      type: 'simple-fill', // autocasts as new SimpleFillSymbol()
      color: [51, 51, 204, 0.2],
      style: 'solid',
      outline: {
        // autocasts as new SimpleLineSymbol()
        color: 'grey',
        width: 1,
      },
    };
    // Set a basic symbol on a layer to visualize all features the same way
    let renderer = {
      type: 'simple', // autocasts as new SimpleRenderer()
      symbol: symbol,
    };

    levels.forEach((level) => {
      var layer = new FeatureLayer({
        id: id,
        //url: this.props.urls.nutsHandler,
        // [ NOTA ] Llevar la URL a config
        url:
          'https://land.discomap.eea.europa.eu/arcgis/rest/services/CLMS_Portal/NUTS_2021_Improved/MapServer/', // nuevo
        // 'https://trial.discomap.eea.europa.eu/arcgis/services/CLMS/NUTS_2021/MapServer/', // antiguo
        layerId: level,
        outFields: ['*'],
        popupEnabled: false,
        //definitionExpression: 'LEVL_CODE=' + level,
      });
      if (this.props.view.type === '3d') {
        layer.renderer = renderer;
      }

      // [ NOTA ] Añadir un refresh o algo que elimine todos los features antes de cargar los siguientes.
      this.nutsGroupLayer.add(layer);

      let index = this.getHighestIndex();

      this.props.map.reorder(this.nutsGroupLayer, index + 1);
    }); // for
  }

  loadCountriesService(id) {
    this.clearWidget();

    let symbol = {
      type: 'simple-fill', // autocasts as new SimpleFillSymbol()
      color: [0, 163, 108, 0.3],
      style: 'solid',
      outline: {
        // autocasts as new SimpleLineSymbol()
        color: 'white',
        width: 1,
      },
    };
    // Set a basic symbol on a layer to visualize all features the same way
    let renderer = {
      type: 'simple', // autocasts as new SimpleRenderer()
      symbol: symbol,
    };

    var layer = new FeatureLayer({
      id: id,
      //url: this.props.urls.outsideEu,
      // [ NOTA ] Llevar la URL a config
      url:
        'https://land.discomap.eea.europa.eu/arcgis/rest/services/CLMS_Portal/World_countries_except_EU37/MapServer',
      layerId: 0,
      outFields: ['*'],
      popupEnabled: false,
    });

    if (this.props.view.type === '3d') {
      layer.renderer = renderer;
    }

    this.nutsGroupLayer.add(layer);

    let index = this.getHighestIndex();

    this.props.map.reorder(this.nutsGroupLayer, index + 1);
  }

  getHighestIndex() {
    let index = 0;
    document.querySelectorAll('.active-layer').forEach((layer) => {
      let value = parseInt(layer.getAttribute('layer-order'));
      if (value > index) {
        index = value;
      }
    });
    return index;
  }
  rectanglehandler() {
    this.clearWidget();
    window.document.querySelector('.pan-container').style.display = 'flex';
    var fillSymbol = {
      type: 'simple-fill',
      color: [255, 255, 255, 0.5],
      outline: {
        color: [0, 0, 0],
        width: 1,
      },
    };

    let extentGraphic = null;
    let origin = null;
    const drawGraphics = this.props.view.on('drag', (e) => {
      if (this.props.mapViewer.pan_enabled) return;
      e.stopPropagation();
      if (e.action === 'start') {
        if (extentGraphic) this.props.view.graphics.remove(extentGraphic);
        origin = this.props.view.toMap(e);
        this.setState({
          showInfoPopup: true,
          infoPopupType: 'download',
        });
        if (this.props.download) {
          document.querySelector('.drawRectanglePopup-block').style.display =
            'none';
        }
      } else if (e.action === 'update') {
        if (extentGraphic) this.props.view.graphics.remove(extentGraphic);
        let p = this.props.view.toMap(e);
        extentGraphic = new Graphic({
          geometry: new Extent({
            xmin: Math.min(p.x, origin.x),
            xmax: Math.max(p.x, origin.x),
            ymin: Math.min(p.y, origin.y),
            ymax: Math.max(p.y, origin.y),
            spatialReference: { wkid: 102100 },
          }),
          symbol: fillSymbol,
        });
        this.props.updateArea({
          origin: { x: origin.longitude, y: origin.latitude },
          end: { x: p.longitude, y: p.latitude },
        });
        this.props.view.graphics.add(extentGraphic);
      }
    });
    this.setState({
      ShowGraphics: drawGraphics,
    });
  }
  clearWidget() {
    window.document.querySelector('.pan-container').style.display = 'none';
    this.props.mapViewer.view.popup.close();
    if (this.state.ShowGraphics) {
      this.state.ShowGraphics.remove();
      this.setState({ ShowGraphics: null });
      this.props.updateArea();
    }
    this.nutsGroupLayer.removeAll();
    this.props.view.graphics.removeAll();
    this.props.updateArea();
    this.setState({
      infoPopupType: 'area',
    });
    if (this.props.download) {
      document.querySelector('.drawRectanglePopup-block').style.display =
        'block';
    }
  }

  /**
   * This method is executed after the rener method is executed
   */
  async componentDidMount() {
    await this.loader();
    this.nutsGroupLayer = new GroupLayer({
      title: 'nuts',
      //opacity: 0.5,
    });
    this.props.map.add(this.nutsGroupLayer);
    this.props.view.on('click', (event) => {
      if (
        (this.props.mapViewer.activeWidget === this || this.props.download) &&
        (this.props.mapViewer.activeWidget
          ? !this.props.mapViewer.activeWidget.container.current.classList.contains(
              'info-container',
            )
          : true)
      ) {
        this.props.view.hitTest(event).then((response) => {
          if (response.results.length > 0) {
            let graphic = response.results.filter((result) => {
              let layer;
              if (
                'nuts0 nuts1 nuts2 nuts3 countries'.includes(
                  result.graphic.layer.id,
                )
              ) {
                layer = result.graphic;
              }
              return layer;
            })[0].graphic;
            if (graphic) {
              let geometry = graphic.geometry;
              if (geometry.type === 'polygon') {
                let nuts;
                if ('countries'.includes(graphic.layer.id)) {
                  nuts = graphic.attributes.ISO_2DIGIT;
                } else {
                  nuts = graphic.attributes.NUTS_ID;
                }
                this.props.updateArea(nuts);
                let symbol = new SimpleFillSymbol(
                  'solid',
                  new SimpleLineSymbol('solid', new Color([232, 104, 80]), 2),
                  new Color([232, 104, 80, 0.25]),
                );
                let highlight = new Graphic(geometry, symbol);
                this.props.view.graphics.removeAll();
                this.props.view.graphics.add(highlight);
                this.setState({
                  showInfoPopup: true,
                  infoPopupType: 'download',
                });
                if (this.props.download) {
                  document.querySelector(
                    '.drawRectanglePopup-block',
                  ).style.display = 'none';
                }
              }
            }
          }
        });
      }
    });

    this.props.download
      ? this.container !== null && this.props.view.ui.add(this.container)
      : this.props.view.ui.add(this.container.current, 'top-right');

    var popup = document.createElement('div');
    popup.className = 'drawRectanglePopup-block';
    popup.innerHTML =
      '<div class="drawRectanglePopup-content">' +
      '<span class="drawRectanglePopup-icon"><span class="esri-icon-cursor-marquee"></span></span>' +
      '<div class="drawRectanglePopup-text">Select or draw an area of interest in the map to continue</div>' +
      '</div>';
    this.props.download && this.props.view.ui.add(popup, 'top-right');
  }

  /**
   * This method renders the component
   * @returns jsx
   */
  render() {
    return (
      <>
        <div ref={this.container} className="area-container">
          {!this.props.download && (
            <div tooltip="Area selection" direction="left" type="widget">
              <div
                className={this.menuClass}
                id="map_area_button"
                aria-label="Area selection"
                onClick={this.openMenu.bind(this)}
                onKeyDown={this.openMenu.bind(this)}
                tabIndex="0"
                role="button"
              ></div>
            </div>
          )}
          <div className={this.props.download ? '' : 'right-panel'}>
            {!this.props.download && (
              <div className="right-panel-header">
                <span>Area selection</span>
                <span
                  className="map-menu-icon esri-icon-close"
                  onClick={this.openMenu.bind(this)}
                  onKeyDown={this.openMenu.bind(this)}
                  tabIndex="0"
                  role="button"
                ></span>
              </div>
            )}
            <div className="right-panel-content">
              <div className="area-panel">
                <div className="area-header">
                  For areas of interest in the EU, EFTA, candidate countries or
                  the United Kingdom: choose NUTS classification or draw a
                  rectangle on the map.
                </div>
                <div className="ccl-form">
                  <fieldset className="ccl-fieldset">
                    <div className="ccl-form-group">
                      <input
                        type="radio"
                        id="download_area_select_nuts0"
                        name="downloadAreaSelect"
                        value="nuts0"
                        className="ccl-checkbox cl-required ccl-form-check-input"
                        defaultChecked
                        onClick={this.nuts0handler.bind(this)}
                      ></input>
                      <label
                        className="ccl-form-radio-label"
                        htmlFor="download_area_select_nuts0"
                      >
                        <span>NUTS 0</span>
                      </label>
                    </div>
                    <div className="ccl-form-group">
                      <input
                        type="radio"
                        id="download_area_select_nuts1"
                        name="downloadAreaSelect"
                        value="nuts1"
                        className="ccl-checkbox ccl-required ccl-form-check-input"
                        onClick={this.nuts1handler.bind(this)}
                      ></input>
                      <label
                        className="ccl-form-radio-label"
                        htmlFor="download_area_select_nuts1"
                      >
                        <span>NUTS 1</span>
                      </label>
                    </div>
                    <div className="ccl-form-group">
                      <input
                        type="radio"
                        id="download_area_select_nuts2"
                        name="downloadAreaSelect"
                        value="nuts2"
                        className="ccl-checkbox ccl-required ccl-form-check-input"
                        onClick={this.nuts2handler.bind(this)}
                      ></input>
                      <label
                        className="ccl-form-radio-label"
                        htmlFor="download_area_select_nuts2"
                      >
                        <span>NUTS 2</span>
                      </label>
                    </div>
                    <div className="ccl-form-group">
                      <input
                        type="radio"
                        id="download_area_select_nuts3"
                        name="downloadAreaSelect"
                        value="nuts3"
                        className="ccl-radio ccl-required ccl-form-check-input"
                        onClick={this.nuts3handler.bind(this)}
                      ></input>
                      <label
                        className="ccl-form-radio-label"
                        htmlFor="download_area_select_nuts3"
                      >
                        <span>NUTS 3</span>
                      </label>
                    </div>
                    <div className="ccl-form-group">
                      <div>
                        For areas of interest outside{' '}
                        <b>the above ones, choose a country or</b> draw a
                        rectangle on the map.
                      </div>
                      <br></br>
                      <input
                        type="radio"
                        id="download_area_select_countries"
                        name="downloadAreaSelect"
                        value="countries"
                        className="ccl-radio ccl-required ccl-form-check-input"
                        onClick={this.countriesHandler.bind(this)}
                      ></input>
                      <label
                        className="ccl-form-radio-label"
                        htmlFor="download_area_select_countries"
                      >
                        <span>Country</span>
                      </label>
                    </div>
                    <br></br>
                    <div className="ccl-form-group">
                      <input
                        type="radio"
                        id="download_area_select_rectangle"
                        name="downloadAreaSelect"
                        value="area"
                        className="ccl-radio ccl-required ccl-form-check-input"
                        onClick={this.rectanglehandler.bind(this)}
                      ></input>
                      <label
                        className="ccl-form-radio-label"
                        htmlFor="download_area_select_rectangle"
                      >
                        <span>Draw by rectangle</span>
                        <div>
                          (Click and drag your mouse on the map. As you move
                          your mouse, you’ll see the area of the rectangle next
                          to your cursor. Finish the rectangle by releasing your
                          mouse.)
                        </div>
                      </label>
                    </div>
                  </fieldset>
                </div>
              </div>
            </div>
          </div>
          {!this.props.download && this.state.showInfoPopup && (
            <div className="map-container popup-block">
              <div className="drawRectanglePopup-block">
                <div className="drawRectanglePopup-content">
                  {this.state.infoPopupType === 'area' && (
                    <>
                      <span className="drawRectanglePopup-icon">
                        <span className="esri-icon-cursor-marquee"></span>
                      </span>
                      <div className="drawRectanglePopup-text">
                        Select or draw an area of interest in the map to
                        continue
                      </div>
                    </>
                  )}
                  {this.state.infoPopupType === 'download' && (
                    <>
                      <span className="drawRectanglePopup-icon">
                        <FontAwesomeIcon icon={['fas', 'download']} />
                      </span>
                      <div className="drawRectanglePopup-text">
                        Click on the download icon on “Products and datasets” to
                        add to cart
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
export default AreaWidget;
