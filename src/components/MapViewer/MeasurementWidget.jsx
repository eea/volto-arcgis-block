import React, { createRef } from "react";
//import "@arcgis/core/assets/esri/css/main.css";
import "./ArcgisMap.css";
import { loadModules } from 'esri-loader';
var Measurement;

class MeasurementWidget extends React.Component {
    /**
     * Creator of the Measurement widget class
     * @param {*} props 
     */
    constructor(props) {
        super(props);
        //We create a reference to a DOM element to be mounted
        this.container = createRef();
        //Initially, we set the state of the component to 
        //not be showing the basemap panel
        this.state = {showMapMenu: false};
        this.menuClass = 'esri-icon-measure esri-widget--button esri-widget esri-interactive';
    }

    loader() {
        return loadModules(['esri/widgets/Measurement']).then(
          ([_Measurement]) => {
            Measurement = _Measurement
          }
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
            this.container.current.querySelector(".measurement-panel").style.display = 'none';
            this.container.current.querySelector(".esri-widget--button").classList.replace('esri-icon-right-arrow','esri-icon-measure');
            // By invoking the setState, we notify the state we want to reach
            // and ensure that the component is rendered again
            this.setState({showMapMenu: false});
            this.container.current.querySelector('.active').classList.remove("active");
            this.container.current.querySelector('.esri-icon-measure-area').classList.add("active");
            this.clearMeasurements();
            this.clearCoordinates();
        } else {
            this.props.mapViewer.setActiveWidget(this);
            this.container.current.querySelector(".measurement-panel").style.display = 'block';
            this.container.current.querySelector(".esri-widget--button").classList.replace('esri-icon-measure','esri-icon-right-arrow');
            // By invoking the setState, we notify the state we want to reach
            // and ensure that the component is rendered again
            this.setState({showMapMenu: true});
            this.areaMeasurement();
        }
    };

    areaMeasurementHandler(e) {
        this.clearMeasurements();
        this.clearCoordinates();
        this.areaMeasurement();
        this.container.current.querySelector('.active').classList.remove("active");
        e.target.classList.add("active");
    }

    distanceMeasurementHandler(e) {
        this.clearMeasurements();
        this.clearCoordinates();
        this.distanceMeasurement();
        this.container.current.querySelector('.active').classList.remove("active");
        e.target.classList.add("active");
    }
    
    coordsMeasurementHandler(e) {
        this.clearMeasurements();
        this.container.current.querySelector('.active').classList.remove("active");
        e.target.classList.add("active");
        
        //*** Add event to show mouse coordinates on click and move ***//
        var getCoordinates = this.props.view.on(["pointer-down","pointer-move"], function(evt) {
            this.showCoordinates(this.props.view.toMap({ x: evt.x, y: evt.y }));
        }.bind(this));
        this.setState({ShowCoords:getCoordinates});
        this.container.current.querySelector(".measurement-coords").style.display = "block";
    }

    areaMeasurement() {
        this.measurement.activeTool = "area";
    }

    distanceMeasurement() {
        this.measurement.activeTool = "distance";
    }

    clearMeasurements() {
        this.measurement.clear();
    }

    showCoordinates(pt) {
        this.setState({latlong:pt.latitude.toFixed(3) +" "+ pt.longitude.toFixed(3)});
    }

    clearCoordinates() {
        this.container.current.querySelector(".measurement-coords").style.display = 'none';
        this.setState({latlong: false});
        if (this.state.ShowCoords) {
            this.state.ShowCoords.remove();
            this.setState({ShowCoords:null});
        }
    }
    /**
     * This method is executed after the rener method is executed
     */
     async componentDidMount() {
        await this.loader();
        this.props.view.ui.add(this.container.current, "top-right");
        this.measurement = new Measurement({
            view: this.props.view,
            container: this.container.current.querySelector(".measurement-area")
        })
    }
    /**
     * This method renders the component
     * @returns jsx
     */
    render(){
        return(
            <>
                <div ref={this.container} className="measurement-container">
                    <div
                        className={this.menuClass}
                        id="map_measurement_button"
                        role="button"
                        title="Measurement"
                        onClick={this.openMenu.bind(this)}>
                    </div>
                    <div className="measurement-panel">
                        <div className="measurement-buttons">
                            <div className="esri-icon-measure-area esri-widget--button esri-widget esri-interactive active" onClick={this.areaMeasurementHandler.bind(this)}></div>
                            <div className="esri-icon-measure-line esri-widget--button esri-widget esri-interactive" onClick={this.distanceMeasurementHandler.bind(this)}></div>
                            <div className="esri-icon-map-pin esri-widget--button esri-widget esri-interactive" onClick={this.coordsMeasurementHandler.bind(this)}></div>
                        </div>
                        <div className="measurement-area"></div>
                        <div className="measurement-coords">{this.state.latlong? <b>Lat/long: </b>:"Hover over the map to get the coordinates"}{this.state.latlong && this.state.latlong}</div>
                    </div>
                </div>
            </>
        );
    }
}

export default MeasurementWidget;