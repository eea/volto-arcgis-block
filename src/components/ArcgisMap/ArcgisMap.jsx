import React, { useRef, useEffect } from 'react';

import { isServer } from '../utils';
// import Map from '@arcgis/core/Map';
// import MapView from '@arcgis/core/views/MapView';
// import BasemapGallery from '@arcgis/core/widgets/BasemapGallery';
// import Zoom from '@arcgis/core/widgets/Zoom';
// import ScaleBar from '@arcgis/core/widgets/ScaleBar';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import '@arcgis/core/assets/esri/css/main.css';
import './ArcgisMap.less';
import MenuContainer from './MenuContainer';
import LayerSelector from './LayerSelector';
import ReactDOM from 'react-dom';

let view;
function ArcgisMap() {
  // const [Map, MapView, BasemapGallery, Zoom, ScaleBar] = await loadModules([
  //   'esri/Map',
  //   'esri/views/MapView',
  //   'esri/widgets/BasemapGallery',
  //   'esri/widgets/Zoom',
  //   'esri/widgets/ScaleBar',
  // ]);
  const mapDiv = useRef(null);
  useEffect(() => {
    loadMap();
    async function loadMap() {
      // console.log("ISSERVER: ", isServer);
      // if (!isServer) {
      const Map = await (await import('@arcgis/core/Map')).default;
      const MapView = await (await import('@arcgis/core/views/MapView'))
        .default;
      const BasemapGallery = await (
        await import('@arcgis/core/widgets/BasemapGallery')
      ).default;
      const Zoom = await (await import('@arcgis/core/widgets/Zoom')).default;
      const ScaleBar = await (await import('@arcgis/core/widgets/ScaleBar'))
        .default;

      console.log('Map: ', Map);
      // }
      if (mapDiv.current) {
        const map = new Map({
          basemap: 'topo-vector',
          slider: false,
        });
        view = new MapView({
          container: mapDiv.current,
          map: map,
          center: [15, 50],
          zoom: 3,
          ui: {
            components: ['attribution'], // removes default widgets except for attribution
          },
        });
        if (view) {
          view.constraints = {
            minZoom: 3,
          };
          var zoom = new Zoom({
            view: view,
          });
          view.ui.add(zoom, {
            position: 'top-right',
          });

          // LAYER SELECTOR
          const baseMapNode = document.createElement('div');
          baseMapNode.className = 'basemap-gallery-container';
          // Parse React Component to DOM
          ReactDOM.render(<LayerSelector />, baseMapNode);
          view.ui.add(baseMapNode, 'top-right');

          const basemapGallery = new BasemapGallery({
            view: view,
          });
          view.ui.add(basemapGallery, 'top-right');

          // Print
          var print_button = document.createElement('div');
          print_button.className =
            'esri-icon-printer esri-widget--button esri-widget esri-interactive';
          print_button.setAttribute('role', 'button');
          print_button.setAttribute('title', 'Print');
          print_button.addEventListener('click', function (evt) {
            // action
          });
          view.ui.add(print_button, 'top-right');

          // Area selection
          var area_button = document.createElement('div');
          area_button.className =
            'esri-icon-cursor-marquee esri-widget--button esri-widget esri-interactive';
          area_button.setAttribute('role', 'button');
          area_button.setAttribute('title', 'Select area');
          area_button.addEventListener('click', function (evt) {
            // action
          });
          view.ui.add(area_button, 'top-right');

          // Legend
          var legend_button = document.createElement('div');
          legend_button.className =
            'esri-icon-legend esri-widget--button esri-widget esri-interactive';
          legend_button.setAttribute('role', 'button');
          legend_button.setAttribute('title', 'Legend');
          legend_button.addEventListener('click', function (evt) {
            // action
          });
          view.ui.add(legend_button, 'top-right');

          // Menu
          const menuContainerNode = document.createElement('div');
          menuContainerNode.className = 'map-left-menu-container';
          // Parse React Component to DOM
          ReactDOM.render(<MenuContainer />, menuContainerNode);
          view.ui.add(menuContainerNode, 'top-left');

          // loadTestProducts();

          // Scalebar
          var scaleBar = new ScaleBar({
            view: view,
            unit: 'dual',
          });
          view.ui.add(scaleBar, 'bottom-left');

          // Loading icon
          view.watch('updating', function (evt) {
            if (evt === true) {
              document.querySelector('.loading').style.display = 'flex';
            } else {
              document.querySelector('.loading').style.display = 'none';
            }
          });
        }
      }
    }
  }, []);

  return (
    <>
      <div className="map-container">
        <div ref={mapDiv} className="map"></div>
        <div className="loading">
          {' '}
          <FontAwesomeIcon icon={faSpinner} pulse />
        </div>
      </div>
    </>
  );
}

export default ArcgisMap;
