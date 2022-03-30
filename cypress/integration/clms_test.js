/// <reference types="cypress">

import X2JS from "./xml2json"

//const { verify } = require("crypto")
function parseCapabilities(xml, tag) {
    return xml.getElementsByTagName(tag);
}
function parseFormat(xml) {
    let format,
      formats = Array.from(
        Array.from(parseCapabilities(xml, "getFeatureInfo")).map(
          (f) => f.children
        )[0]
      ).map((v) => v.textContent);
    format = formats.filter((v) => v.includes("json"))[0];
    if (!format) format = formats.filter((v) => v.includes("html"))[0];
    if (!format)
      format = formats.filter((v) => v.includes("text/xml"))[0];
    if (!format) format = formats[0];

    return format;
  }
describe("Clms Test", () => {

    beforeEach('Open CLMS Portal',()=>{
        cy.openClmsPortal()
    })

    it("product dataset map viewer test", () => {
        cy.wait(20000)
        cy.get('[class="ccl-header-main-menu"]')
            .contains('Product portfolio')
            .click()
            // By Class value - Product List
            cy.get('[class="left-menu"]')
            .contains('Product list')
            .click()
                // Corine Land Cover
                cy.get('[class="card-title"]') 
                    cy.get('[href="/en/products/corine-land-cover"]').click()
                        // Dataset
                        cy.get('[class="card-title"]') 
                        cy.get('[href="/en/products/corine-land-cover/clc2018"]').click()
                            // Map Viewer
                            cy.get('[class="menu-detail-button"]') 
                                cy.get('[href="/en/map-viewer?dataset=0407d497d3c44bcd93ce8fd5bf78596a"]').click()
                                    // Panels 
                                    cy.get('[class="esri-icon-drag-horizontal esri-widget--button esri-widget esri-interactive"]').click()
                                        // Land cover and land user mapping
                                        cy.get('#products_panel').get('#component_4').find('div.ccl-expandable__button').eq(0).click({force:true})
                                            cy.get('#product_4_0').find('div.ccl-expandable__button').eq(0).click({force:true}) 
                                            // Validate
                                            cy.contains('.map-dataset-checkbox','CLC 2018').find('[type="checkbox"]').then(ncheck =>{
                                                cy.wrap(ncheck)
                                                  .first()
                                                  .should('be.checked')
                                            })  
                                       
     })
    // Widget Legend Test
    it.skip("map viewer legend widget test", () => {
        // Map viewer
        cy.get('[href="/en/map-viewer"]').click()
        // Panels
        cy.get('[class="esri-icon-drag-horizontal esri-widget--button esri-widget esri-interactive"]').click()
           // Hot spot monitoring 
           cy.get('#products_panel').get('#component_2').find('div.ccl-expandable__button').eq(0).click({force:true})
              cy.get('#product_2_0').find('div.ccl-expandable__button').eq(0).click({force:true})
              // Check   
              cy.get('#product_2_0').get('#map_product_2_0').click({force:true})
              // Validate 
              cy.contains('.map-dataset-checkbox','Urban Atlas 2018').find('[type="checkbox"]').then(ncheck =>{
                 cy.wrap(ncheck)
                   .first()
                   .should('be.checked')
              })
              // Widget Legend
              cy.get('[class="esri-icon-legend esri-widget--button esri-widget esri-interactive"]').click()
                cy.contains('.esri-legend__layer-caption','Land Use Raster')
                    .get('[class="esri-legend__layer-cell esri-legend__layer-cell--symbols"]').find('img').should('have.attr', 'src') 
                    .and('include', 'UA_UrbanAtlas_2018') 

    })
    
    // Widget Area Test
    it.skip("map viewer area widget test", () => {
        // Map viewer
        cy.get('[href="/en/map-viewer"]').click()
        // Panels
        cy.get('[class="esri-icon-drag-horizontal esri-widget--button esri-widget esri-interactive"]').click()
            // Hot spot monitoring 
            cy.get('#products_panel').get('#component_2').find('div.ccl-expandable__button').eq(0).click({force:true})
               cy.get('#product_2_0').find('div.ccl-expandable__button').eq(0).click({force:true})
               // Check   
               cy.get('#product_2_0').get('#map_product_2_0').click({force:true})
               // Validate 
               cy.contains('.map-dataset-checkbox','Urban Atlas 2018').find('[type="checkbox"]').then(ncheck =>{
                    cy.wrap(ncheck)
                      .first()
                      .should('be.checked')
               })
               // Widget Legend
               cy.get('[class="esri-icon-cursor-marquee esri-widget--button esri-widget esri-interactive"]').click()
                    cy.contains('.map-download-header-title','Select area')
                    cy.contains('.ccl-form-group','NUTS 0').find('[type="radio"]').then(ncheck =>{
                        cy.wrap(ncheck)
                          .first()
                          .should('be.checked')
                   })

                    //   .get('[class="esri-legend__layer-cell esri-legend__layer-cell--symbols"]').find('img').should('have.attr', 'src') 
                    //   .and('include', 'UA_UrbanAtlas_2018')
                        //.eq(6).should('include','<img src="https://image.discomap.eea.europa.eu/arcgis/services/UrbanAtlas/UA_UrbanAtlas_2018/MapServer/WmsServerrequest=GetLegendGraphic&amp;version=1.0.0&amp;format=image/png&amp;layer=Land_Use_Raster1402" border="0" class="esri-legend__symbol" style="opacity: 1;">')
                    // cy.get('[class="esri-legend__layer-cell esri-legend__layer-cell--symbols"]').find('img').should('have.attr', 'src')
             
                //cy.get('#product_2_0').get('#map_product_2_0').find('.ccl-fieldset').find('div.ccl-expandable__button').eq(0).click({force:true})
                
        

    })

    // Widget Measurement Test
    it.skip("map viewer measurement widget test", () => {
        // Map viewer
        cy.get('[href="/en/map-viewer"]').click()
        // Panels
        cy.get('[class="esri-icon-drag-horizontal esri-widget--button esri-widget esri-interactive"]').click()
            // Hot spot monitoring 
            cy.get('#products_panel').get('#component_2').find('div.ccl-expandable__button').eq(0).click({force:true})
               cy.get('#product_2_0').find('div.ccl-expandable__button').eq(0).click({force:true})
               // Check   
               cy.get('#product_2_0').get('#map_product_2_0').click({force:true})
               // Validate 
               cy.contains('.map-dataset-checkbox','Urban Atlas 2018').find('[type="checkbox"]').then(ncheck =>{
                    cy.wrap(ncheck)
                      .first()
                      .should('be.checked')
               })
               // Widget Measurement
               cy.get('[class="esri-icon-measure esri-widget--button esri-widget esri-interactive"]').click()
                    cy.get('.measurement-buttons').should('have.length',1)
                       .get('.esri-icon-measure-area').should('have.class', 'esri-widget--button') 
                       .get('.esri-icon-measure-line').should('have.class', 'esri-widget--button') 
                       .get('.esri-icon-map-pin').should('have.class','esri-widget--button')
                                              
                    cy.contains('.esri-area-measurement-2d__container','Start to measure by clicking in the map to place your first point')
                              
                       
    })

    // Widget Print Test
    it.skip("map viewer Print widget test", () => {
        // Map viewer
        cy.get('[href="/en/map-viewer"]').click()
        // Panels
        cy.get('[class="esri-icon-drag-horizontal esri-widget--button esri-widget esri-interactive"]').click()
            // Hot spot monitoring 
            cy.get('#products_panel').get('#component_2').find('div.ccl-expandable__button').eq(0).click({force:true})
               cy.get('#product_2_0').find('div.ccl-expandable__button').eq(0).click({force:true})
               // Check   
               cy.get('#product_2_0').get('#map_product_2_0').click({force:true})
               // Validate 
               cy.contains('.map-dataset-checkbox','Urban Atlas 2018').find('[type="checkbox"]').then(ncheck =>{
                    cy.wrap(ncheck)
                      .first()
                      .should('be.checked')
               })
               // Widget Print 
               cy.get('[class="print-container esri-component"]').find('.esri-icon-printer').click()
                  cy.get('.esri-print__header-title').should('have.text','Export')
                    cy.wait(5000) 
                    cy.get('.esri-print__layout-tab-list li').eq(0).should('contain','Layout')
                    cy.get('.esri-print__layout-tab-list li').next().click().should('contain','Map only') 
                                                  
                       
    })

    // Widget Basemap Gallery Test
    it.skip("map viewer Basemap Gallery widget test", () => {
        // Map viewer
        cy.get('[href="/en/map-viewer"]').click()
        // Panels
        cy.get('[class="esri-icon-drag-horizontal esri-widget--button esri-widget esri-interactive"]').click()
            // Hot spot monitoring 
            cy.get('#products_panel').get('#component_2').find('div.ccl-expandable__button').eq(0).click({force:true})
            cy.get('#product_2_0').find('div.ccl-expandable__button').eq(0).click({force:true})
            // Check   
            cy.get('#product_2_0').get('#map_product_2_0').click({force:true})
            // Validate 
            cy.contains('.map-dataset-checkbox','Urban Atlas 2018').find('[type="checkbox"]').then(ncheck =>{
                cy.wrap(ncheck)
                  .first()
                  .should('be.checked')
            })
            // Widget Basemap Gallery
            cy.get('[class="basemap-container esri-component"]').find('.esri-icon-basemap')
                .wait(5000) 
                .click()
                cy.get('[class="esri-basemap-gallery__item"]').find('img').should('have.attr', 'src') 
                    cy.contains('.esri-basemap-gallery__item-title', 'Híbrido de imágenes')
                
    })


    // Widget Info Test
    it.skip("map viewer Widget Info Test", () => {
        // Map viewer
        cy.get('[href="/en/map-viewer"]').click()
        // Panels
        cy.get('[class="esri-icon-drag-horizontal esri-widget--button esri-widget esri-interactive"]').click()
            // Hot spot monitoring 
            cy.get('#products_panel').get('#component_2').find('div.ccl-expandable__button').eq(0).click({force:true})
               cy.get('#product_2_0').find('div.ccl-expandable__button').eq(0).click({force:true})
               // Check   
               cy.get('#product_2_0').get('#map_product_2_0').click({force:true})
               // Validate 
               cy.contains('.map-dataset-checkbox','Urban Atlas 2018').find('[type="checkbox"]').then(ncheck =>{
                    cy.wrap(ncheck)
                      .first()
                      .should('be.checked')
               })
               // Widget Info
                cy.get('[class="esri-icon-description esri-widget--button esri-widget esri-interactive"]').click()
                  cy.get('.info-panel').should('have.text','Click on the map to get pixel info')
                                                             
                       
    })

    // Time series Test
    it.skip("map viewer Time series Test", () => {
        // Map viewer
        cy.get('[href="/en/map-viewer"]').click()
        // Panels
        cy.get('[class="esri-icon-drag-horizontal esri-widget--button esri-widget esri-interactive"]').click()
            // Biophysical Parameter 
            cy.get('#products_panel').get('#component_0').find('div.ccl-expandable__button').eq(0).click({force:true})
                // High Resolution Vegetation Phenology and Productivity Parameters 
                cy.get('#product_0_2').find('div.ccl-expandable__button').eq(0).click({force:true})  
                    // Check 
                    cy.get('#product_0_2').get('#map_product_0_2').click({force:true})
        
        //  Tab List
        cy.get('.tabs')
            cy.wait(5000) 
            cy.get('#active_label').click().should('contain','Active on map') 
                cy.get('.active-layer-time').click()
    })

    // Corine Land Cover 2018 layer test
    it.skip("map viewer Corine Land Cover 2018 layer test", () => {
        // Map viewer
        cy.get('[href="/en/map-viewer"]').click()
        // Panels
        cy.get('[class="esri-icon-drag-horizontal esri-widget--button esri-widget esri-interactive"]').click()
            // Land Cover Land Use Parameter 
            cy.get('#products_panel').get('#component_4').find('div.ccl-expandable__button').eq(0).click({force:true})
                // Corine Land Cover Parameters 
                cy.get('#product_4_0').find('div.ccl-expandable__button').eq(0).click({force:true})  
                    // Check CLC 2018
                    cy.get('#product_4_0').get('#map_product_4_0').click({force:true})


                    cy.intercept({method : 'GET',path : '**/Corine/**'}).as('call')
                    cy.wait('@call').then((interception) => {
                        console.log(typeof interception.response.body)
                        var x2js = new X2JS();
                        let xmlDoc = interception.response.body
                        var jsonObj = x2js.xml_str2json(xmlDoc) // Convert XML to JSON
                        console.log(jsonObj);
                        console.log(typeof jsonObj);
                        let test = Object.keys(jsonObj).map(key => {
                            for (var x = 0; x<jsonObj[key]["Capability"]["Layer"]["Layer"].length; x++) {
                                expect(jsonObj[key]["Capability"]["Layer"]["Layer"][x]["Title"]).include("Corine Land Cover 2018")
                            }
                            return jsonObj[key]["Service"];
                          })
                    })
    })


})