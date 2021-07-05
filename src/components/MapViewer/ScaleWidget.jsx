import React, { createRef } from "react";
import "@arcgis/core/assets/esri/css/main.css";
import "./ArcgisMap.css";
var ScaleBar;

class ScaleWidget extends React.Component {
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
        this.menuClass = 'esri-icon-printer esri-widget--button esri-widget esri-interactive';
    }

    loader() {
        return loadModules(['esri/widgets/ScaleBar']).then(
          ([_ScaleBar]) => {
            ScaleBar = _ScaleBar;
          }
        );
      }

    /**
     * This method is executed after the rener method is executed
     */
     async componentDidMount() {
        await this.loader();
        this.scaleBar = new ScaleBar({
            view: this.props.view,
            unit: "dual"
        });
        this.props.view.ui.add(this.scaleBar, "bottom-left");
    }
    /**
     * This method renders the component
     * @returns jsx
     */
    render(){
        return(
            <>
                
            </>
        );
    }
}

export default ScaleWidget;