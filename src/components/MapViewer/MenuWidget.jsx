import React, { createRef } from "react";
import "@arcgis/core/assets/esri/css/main.css";
import "./lib/font-awesome/css/all.min.css";
import "./ArcgisMap.css";
var WMSLayer;

class MenuWidget extends React.Component {
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
        // call the props of the layers list (mapviewer.jsx)
        this.compCfg = this.props.conf;
        this.map = this.props.map;
        this.menuClass = 'esri-icon-drag-horizontal esri-widget--button esri-widget esri-interactive';
        this.layers = {};
        this.activeLayers = []
        this.activeLayersJSON = {}

    }

    loader() {
        return loadModules(['esri/layers/WMSLayer']).then(
          ([_WMSLayer]) => {
            WMSLayer = _WMSLayer;
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
            this.container.current.querySelector('#tabcontainer').style.display = 'none';
            this.container.current.querySelector('#paneles').style.display = 'none';
            this.container.current.querySelector(".esri-widget--button").classList.replace('esri-icon-left-arrow', 'esri-icon-drag-horizontal');


            // By invoking the setState, we notify the state we want to reach
            // and ensure that the component is rendered again
            this.setState({ showMapMenu: false });
        } else {
            this.props.mapViewer.setActiveWidget(this);
            this.container.current.querySelector("#tabcontainer").style.display = 'block';
            this.container.current.querySelector('#paneles').style.display = 'block';
            this.container.current.querySelector(".esri-widget--button").classList.replace('esri-icon-drag-horizontal', 'esri-icon-left-arrow');


            // By invoking the setState, we notify the state we want to reach
            // and ensure that the component is rendered again
            this.setState({ showMapMenu: true });
        }
    };
    /**
     * This method is executed after the rener method is executed
     */
     async componentDidMount() {
        await this.loader();
        this.props.view.ui.add(this.container.current, "top-left");

        //to watch the component
        this.setState({});


    }

    /**
     * Processes the JSON file containing layers info
     * @returns 
     */
    metodprocessJSON() {
        var components = [];
        var index = 0;
        for (var i in this.compCfg) {
            components.push(this.metodProcessComponent(this.compCfg[i], index));
            index++;
        }
        return components;
    }


    /**
     * Processes each component
     * @param {*} component 
     * @param {*} compIndex 
     * @returns 
     */
    metodProcessComponent(component, compIndex) {
        var products = [];
        var index = 0;
        var inheritedIndex = compIndex;
        for (var i in component.Products) {
            products.push(this.metodProcessProduct(component.Products[i], index, inheritedIndex));
            index++;
        }
        return (
            <div className="map-menu-dropdown" id={"component_" + inheritedIndex} key={"a" + compIndex}>
                <div className="ccl-expandable__button" aria-expanded="false" key={"b" + compIndex} onClick={this.toggleDropdownContent.bind(this)}>
                    {component.ComponentTitle}
                </div>
                <div className="map-menu-components-container">
                    {products}
                </div>
            </div>
        );
    }


    /**
     * Processes each product (of each component)
     * @param {*} product 
     * @param {*} prodIndex 
     * @param {*} inheritedIndex 
     * @returns 
     */
    metodProcessProduct(product, prodIndex, inheritedIndex) {
        var datasets = [];
        var index = 0;
        var inheritedIndex = inheritedIndex + "_" + prodIndex;
        var checkProduct = "map_product_" + inheritedIndex
        for (var i in product.Datasets) {
            datasets.push(this.metodProcessDataset(product.Datasets[i], index, inheritedIndex, checkProduct));
            index++;

        }

        return (
            <div className="map-menu-product-dropdown" id={"product_" + inheritedIndex} key={"a" + prodIndex}>
                <fieldset className="ccl-fieldset" key={"b" + prodIndex}>
                    <div className="ccl-expandable__button" aria-expanded="false" key={"c" + prodIndex} onClick={this.toggleDropdownContent.bind(this)}>
                        <div className="ccl-form map-product-checkbox" key={"d" + prodIndex}>
                            <div className="ccl-form-group" key={"e" + prodIndex}>
                                <input type="checkbox" id={checkProduct} name="" value="name" className="ccl-checkbox ccl-required ccl-form-check-input" key={"h" + prodIndex} onChange={(e) => this.toggleProduct(e.target.checked, checkProduct)}></input>
                                <label className="ccl-form-check-label" htmlFor={"map_product_" + inheritedIndex} key={"f" + prodIndex}>
                                    <legend className="ccl-form-legend">
                                        {product.ProductTitle}
                                    </legend>
                                </label>
                            </div>
                        </div>
                    </div>
                    <div className="ccl-form map-menu-products-container" id={"datasets_container" + prodIndex}>
                        {datasets}
                    </div>
                </fieldset>
            </div>
        );
    }

    /**
     * Method to uncheck Product checkbox if not all dataset are checked
     * @param {*} productid  
     */
    updateCheckProduct(productid) {
        let datasetChecks = Array.from(document.querySelectorAll("[parentid=" + productid + "]"));
        let productCheck = document.querySelector("#" + productid)
        let trueCheck = datasetChecks.filter(elem => elem.checked).length;
        productCheck.checked = (datasetChecks.length === trueCheck)
    }

    /**
     * Processes each dataset (for each product)
     * @param {*} dataset 
     * @param {*} datIndex 
     * @param {*} inheritedIndex 
     * @param {*} checkProduct 
     * @returns 
     */
    metodProcessDataset(dataset, datIndex, inheritedIndex, checkProduct) {
        var layers = [];
        var index = 0;
        var inheritedIndex = inheritedIndex + "_" + datIndex;
        var checkIndex = "map_dataset_" + inheritedIndex

        for (var i in dataset.Layer) {
            layers.push(this.metodProcessLayer(dataset.Layer[i], index, inheritedIndex, dataset.ViewService, checkIndex));
            index++;
        }

        // ./dataset-catalogue/dataset-info.html
        // ./dataset-catalogue/dataset-download.html

        return (
            <div className="ccl-form-group map-menu-dataset" id={"dataset_ " + inheritedIndex} key={"a" + datIndex}>
                <div className="map-dataset-checkbox" key={"b" + datIndex}>
                    <input type="checkbox" id={checkIndex} parentid={checkProduct} name="" value="name" className="ccl-checkbox ccl-required ccl-form-check-input" key={"c" + datIndex} onChange={(e) => { this.toggleDataset(e.target.checked, checkIndex) }}></input>
                    <label className="ccl-form-check-label" htmlFor={"map_dataset_" + inheritedIndex} key={"d" + datIndex} >
                        <span>{dataset.DatasetTitle}</span>
                    </label>
                    <div className="map-menu-icons">
                        {/*
                        <a href="#" className="map-menu-icon" aria-label="Dataset info">
                            <i className="fas fa-info-circle"></i></a>
                        <a href="#" className="map-menu-icon" aria-label="Dataset download">
                            <i className="fas fa-download"></i></a>
                        */}
                        <span className="map-menu-icon" aria-label="Dataset info">
                            <i className="fas fa-info-circle"></i></span>
                        <span className="map-menu-icon" aria-label="Dataset download">
                            <i className="fas fa-download"></i></span>
                    </div>
                </div>
                <div className="ccl-form map-menu-layers-container" id={"layer_container_" + dataset.DatasetId}>
                    {layers}
                </div>
            </div>
        );
    }

    /**
     * Method to uncheck dataset checkbox if not all layers are checked
     * @param {*} id  
     */

    updateCheckDataset(id) {
        let datasetCheck = document.querySelector("#" + id);
        let layerChecks = Array.from(document.querySelectorAll("[parentid=" + id + "]"));
        let trueChecks = layerChecks.filter(elem => elem.checked).length;
        datasetCheck.checked = (layerChecks.length === trueChecks);
        this.updateCheckProduct(datasetCheck.getAttribute("parentid"));
    }

    /**
     * Processes each layer (of each dataset)
     * @param {*} layer 
     * @param {*} layerIndex 
     * @param {*} inheritedIndex 
     * @param {*} urlWMS 
     * @param {*} parentIndex 
     * @returns 
     */
    metodProcessLayer(layer, layerIndex, inheritedIndex, urlWMS, parentIndex) {
        //For Legend request
        const legendRequest = "request=GetLegendGraphic&version=1.0.0&format=image/png&layer=";
        //For each layer
        var inheritedIndex = inheritedIndex + "_" + layerIndex;

        //Add sublayers and popup enabled for layers 
        if (!this.layers.hasOwnProperty(layer.LayerId)) {
            this.layers[layer.LayerId] = new WMSLayer({
                url: urlWMS,
                featureInfoFormat: "text/html",
                featureInfoUrl: urlWMS,
                //id: layer.LayerId,
                title: "",
                legendEnabled: true,
                sublayers: [
                    {
                        name: layer.LayerId,
                        title: layer.Title,
                        popupEnabled: true,
                        queryable: true,
                        visble: true,
                        legendEnabled: true,
                        legendUrl: urlWMS + legendRequest + layer.LayerId
                    }
                ]
            });
        }

        return (
            <div className="ccl-form-group map-menu-layer" id={"layer_" + inheritedIndex} key={"a" + layerIndex}>
                <input type="checkbox" id={layer.LayerId} parentid={parentIndex} name="" value="name" className="ccl-checkbox ccl-required ccl-form-check-input" key={"c" + layerIndex} title={layer.Title} onChange={(e) => { this.toggleLayer(e.target) }}></input>
                <label className="ccl-form-check-label" htmlFor={layer.LayerId} key={"d" + layerIndex} >
                    <span>{layer.Title}</span>
                </label>
            </div>
        )
    };

    /**
     * Method to show/hide a layer. Update checkboxes from dataset and products
     * @param {*} elem Is the checkbox 
     */
    toggleLayer(elem) {
        var parentId = elem.getAttribute("parentid")

        if (elem.checked) {
            this.map.add(this.layers[elem.id])
            this.activeLayersJSON[elem.id] = this.addActiveLayer(elem, Object.keys(this.activeLayersJSON).length);
        }
        else {
            this.map.remove(this.layers[elem.id])
            delete (this.activeLayersJSON[elem.id])
        }
        this.updateCheckDataset(parentId);
        this.setState({});
    }

    /**
     * Returns the DOM elements for active layers
     * just in the order they were added to map
     */
    activeLayersAsArray() {
        let activeLayersArray = []
        for (var i in this.activeLayersJSON) {
            activeLayersArray.push(this.activeLayersJSON[i])
        }

        return activeLayersArray.reverse();
    }

    /**
     * Method to show/hide all the layers of a dataset
     * @param {*} value 
     * @param {*} id 
     */
    toggleDataset(value, id) {
        var layerChecks = document.querySelectorAll("[parentid=" + id + "]");
        layerChecks.forEach(
            element => {
                element.checked = value;
                this.toggleLayer(element);
            }
        )
    }

    /**
     * Method to show/hide all the datasets of a product
     * @param {*} value 
     * @param {*} id 
     */
    toggleProduct(value, id) {
        var datasetChecks = document.querySelectorAll("[parentid=" + id + "]");
        datasetChecks.forEach(
            element => {
                element.checked = value;
                this.toggleDataset(value, element.id);
            }
        )
    }

    /**
     * Method to toggle dropdown content (datasets and layers)
     * @param {*} e 
     */

    toggleDropdownContent(e) {
        var aria = e.target.getAttribute('aria-expanded');
        e.target.setAttribute("aria-expanded", aria === 'true' ? 'false' : 'true');
    }



    /**
     * Method to show Active Layers of the map
     * @param {*} elem From the click event  
     */
    addActiveLayer(elem, order) {
        return (
            <div className="active-layer" id={'active_' + elem.id} key={"a_" + elem.id} layer-id={elem.id} layer-order={order} draggable="true"
                onDrop={(e) => this.onDrop(e)} onDragOver={(e) => this.onDragOver(e)} onDragStart={(e) => this.onDragStart(e)} >
                <div className="active-layer-name" name={elem.id} key={"b_" + elem.id}>{elem.title}</div>
                <div className="active-layer-options" key={"c_" + elem.id}>
                    <span className="active-layer-position" key={"d_" + elem.id}>
                        <span className="active-layer-position-up"><i className="fas fa-long-arrow-alt-up"></i></span>
                        <span className="active-layer-position-down"><i className="fas fa-long-arrow-alt-down"></i></span>
                    </span>
                    <span className="active-layer-hide"><i className="fas fa-eye" onClick={(e) => this.eyeLayer(e, elem.id)}></i></span>
                    <span className="active-layer-delete"><i className="fas fa-times" onClick={() => this.deleteCrossEvent(elem)}></i></span>
                </div>
            </div>
        );
    }

    /**
     * Behavior for drag-and-drop of active layers
     * when dropping a layer upon another
     * @param {*} e 
     * @returns 
     */
    onDrop(e) {
        let dst = e.target.closest("div.active-layer");
        if (dst === this.draggingElement) return;

        //First, we decide how to insert the element in the DOM
        let init_ord = this.draggingElement.getAttribute("layer-order");
        let dst_ord = dst.getAttribute("layer-order");
        this.draggingElement.parentElement.removeChild(this.draggingElement);
        if (init_ord > dst_ord) {

            dst.parentElement.insertBefore(this.draggingElement, dst);
        } else {
            dst.parentElement.insertBefore(this.draggingElement, dst.nextSibling);
        }

        this.layersReorder();
    }

    /**
     * Reorders the layers depending on the state of active layers panel
     * @returns 
     */
    layersReorder() {
        let counter = 0;
        let reorder_elem = document.querySelector("#active_layers").firstChild;
        if (!reorder_elem) return;
        reorder_elem.setAttribute("layer-order", counter++)
        this.layerReorder(reorder_elem.id, counter);
        while (reorder_elem = reorder_elem.nextSibling) {
            reorder_elem.setAttribute("layer-order", counter++)
            this.layerReorder(this.layers[reorder_elem.getAttribute("layer-id")], counter);
        }
    }

    /**
     * Assigns an index to a layer 
     * (depending on its position on active layers panel)
     * @param {*} layer 
     * @param {*} index 
     */
    layerReorder(layer, index) {
        let lastNum = Object.keys(this.activeLayersJSON).length - 1;
        this.map.reorder(layer, lastNum - index);
    }

    /**
     * Needed to get the desired drag-and-drop behavior
     * @param {*} e 
     */
    onDragOver(e) {
        e.preventDefault();
    }

    /**
     * Needed to get the desired drag-and-drop behavior
     * @param {*} e 
     */
    onDragStart(e) {
        this.draggingElement = e.target;
    }

    /**
     * Method to show/hide layer from "Active Layers"
     * @param {*} e From the click event  
     * @param {*} id id from elem 
     */
    eyeLayer(e, id) {
        var eye = e.target
        if (eye.className === 'fas fa-eye') {
            eye.className = 'fas fa-eye fa-eye-slash';
            this.layers[id].visible = false;
        }
        else {
            eye.className = 'fas fa-eye';
            this.map.add(this.layers[id])
            this.layers[id].visible = true;
        }
        this.layersReorder();
    }

    /**
     * Method to delete layer from "Active Layers" and uncheck dataset and products
     * @param {*} e From the click event  
     * @param {*} id id from elem 
     */
    deleteCrossEvent(elem) {
        // elem has to be unchecked
        elem.checked = false;
        this.toggleLayer(elem)
        delete (this.activeLayersJSON[elem.id])
        this.setState({})
    }

    /**
     * Method to change between tabs
     */
    toggleTab() {
        var tabsel = document.querySelector('.tab-selected');
        var tab = document.querySelector('span.tab:not(.tab-selected)');
        var panelsel = document.querySelector('.panel-selected');
        var panel = document.querySelector('div.panel:not(.panel-selected)');

        tabsel.className = 'tab';
        tabsel.setAttribute('aria-selected', 'false');
        panelsel.className = 'panel';
        panelsel.setAttribute('aria-hidden', 'false');

        tab.className = 'tab tab-selected'
        tab.setAttribute('aria-selected', 'true');
        panel.className = 'panel panel-selected';
        panel.setAttribute('aria-hidden', 'true');
        if (tab.id === "active_label") {
            this.layersReorder();
        }
    }

    /** 
     * This method renders the component
     * @returns jsx
     */
    render() {
        return (
            <>
                <div ref={this.container} className="map-left-menu-container">
                    <div className="map-menu tab-container" id='tabcontainer'>
                        <div className="tabs" role="tablist">
                            <span className="tab tab-selected" id="products_label" role="tab" aria-controls="products_panel" aria-selected="true" onClick={() => this.toggleTab()}>Products and datasets</span>
                            <span className="tab" id="active_label" role="tab" aria-controls="active_panel" aria-selected="false" onClick={() => this.toggleTab()}>Active on map</span>
                        </div>
                        <div className="panels" id='paneles'>
                            <div className="panel panel-selected" id="products_panel" role="tabpanel" aria-hidden="false">
                                {
                                    this.metodprocessJSON()
                                }
                            </div>
                            <div className="panel" id="active_panel" role="tabpanel" aria-hidden="true">
                                <div id="active_layers" className="map-active-layers">
                                    {
                                        this.activeLayersAsArray()
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                    <div
                        className={this.menuClass}
                        id="map_manu_button"
                        role="button"
                        title="Menu of products"
                        onClick={this.openMenu.bind(this)}>
                    </div>
                </div>
            </>
        );
    }
}

export default MenuWidget;