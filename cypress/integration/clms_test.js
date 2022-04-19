/// <reference types="cypress">

//import { get } from "http"
//import { hasUncaughtExceptionCaptureCallback } from "process"

//const { verify } = require("crypto")

describe("Clms Test", () => {
    let handlingLevel

    beforeEach('Open CLMS Portal',()=>{
    //before('Open CLMS Portal',()=>{
        cy.openClmsPortal()
    })

    it("product dataset map viewer test", () => {
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
    it("map viewer legend widget test", () => {
        // Map viewer
        cy.get('[href="/en/map-viewer"]').click()
        //Wait to render
        cy.wait(2000)
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
    it("map viewer area widget test", () => {
        // Map viewer
        cy.get('[href="/en/map-viewer"]').click()
        //Wait to render
        cy.wait(2000)
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
                
        

    })

    // Widget Measurement Test
    it("map viewer measurement widget test", () => {
        // Map viewer
        cy.get('[href="/en/map-viewer"]').click()
        //Wait to render
        cy.wait(2000)
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
    it("map viewer Print widget test", () => {
        // Map viewer
        cy.get('[href="/en/map-viewer"]').click()
        //Wait to render
        cy.wait(2000)
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
    it("map viewer Basemap Gallery widget test", () => {      
        // Map viewer
        cy.get('[href="/en/map-viewer"]').click()
        //Wait to render
        cy.wait(2000)
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
                    cy.get('.esri-basemap-gallery__item-title').eq(1).click()
               
    })


    // Widget Info Test
    it("map viewer Basemap Gallery widget test", () => {
        // Map viewer
        cy.get('.ccl-header-main-menu').find('[href="/en/map-viewer"]').click()
        //Wait to render
        cy.wait(2000)
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
    it("map viewer Basemap Gallery widget test", () => {
        // Map viewer
        cy.get('[href="/en/map-viewer"]').click()
        //Wait to render
        cy.wait(2000)
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


    // CLMS-680
    it("map viewer Handling level check is on test", () => {
        cy.get('[class="ccl-header-main-menu"]')
            .contains('Product portfolio')
            .click()
        // By Class value - Product List
        cy.get('[class="left-menu"]')
            .contains('Product list')
            .click()
            // Granularity testing product
            cy.get('[class="card-title"]') 
                //Wait to render
                cy.wait(2000)
                cy.get('[href="/en/products/granularity-testing-product"]').click()
                //Wait to render
                cy.wait(2000)
                // Get Dataset            
                cy.get('[class="card-title"]') 
                //Wait to render
                cy.wait(2000)
                cy.get('[href="/en/products/granularity-testing-product/granularity-testing-dataset"]').click()
                    //Wait to render
                    cy.wait(2000)
                    // Edition mode 
                    cy.get('[href="/en/products/granularity-testing-product/granularity-testing-dataset/edit"]').click()
                        cy.get('[class="ui pointing secondary attached tabular formtabs menu"]')
                        // Mapviewer tab 
                        cy.contains('Mapviewer').click()
                            cy.get('[class="inline field field-wrapper-mapviewer_handlinglevel"]')
                                .find('input')
                                .as('checkbox')
                                .invoke('is', ':checked') // use jQuery $.is(...)
                                .then((initial) => {
                                    cy.log(`Initial checkbox: **${initial}**`)
                                    if (initial) {
                                        //Cancel button
                                        cy.get('[class="ui button cancel"]').click()
                                        // Map viewer
                                        cy.get('[href="/en/map-viewer?dataset=2ffcdd9ebb7748f0bc514a14b3780de7"]').click()
                                        // Panels 
                                        cy.get('[class="esri-icon-drag-horizontal esri-widget--button esri-widget esri-interactive"]').click()
                                        // Default
                                        cy.get('#products_panel').get('#component_1').find('div.ccl-expandable__button').eq(0).click({force:true})
                                            cy.get('#product_1_2').find('div.ccl-expandable__button').eq(0).click({force:true}) 
                                            // Validate
                                            cy.contains('.map-dataset-checkbox','Granularity testing dataset').find('[type="checkbox"]').then(ncheck =>{
                                                cy.wrap(ncheck)
                                                  .first()
                                                  .should('be.checked')
                                                  .and('have.length', 1)
                                            })  
                                            // Check layers not display 
                                            cy.get('[class="ccl-form map-menu-layers-container"]').find('#layer_1_2_0_0')                                         
                                                .should('have.attr', 'style')
                                                .should('equal', 'display: none;')
                
                                    } else {
                                        //Cancel button
                                        cy.get('[class="ui button cancel"]').click()
                                        // Map viewer
                                        cy.get('[href="/en/map-viewer?dataset=2ffcdd9ebb7748f0bc514a14b3780de7"]').click()
                                        // Panels 
                                        cy.get('[class="esri-icon-drag-horizontal esri-widget--button esri-widget esri-interactive"]').click()
                                        // Default
                                        cy.get('#products_panel').get('#component_1').find('div.ccl-expandable__button').eq(0).click({force:true})
                                            cy.get('#product_1_2').find('div.ccl-expandable__button').eq(0).click({force:true}) 
                                                // Validate
                                                cy.contains('.map-dataset-checkbox','Granularity testing dataset').find('[type="checkbox"]').then(ncheck =>{
                                                    cy.wrap(ncheck)
                                                        .first()
                                                        .should('be.checked')
                                                }) 
                                                // Check layers display because not have attribute style= display: none;
                                                cy.get('[class="ccl-form map-menu-layers-container"]').find('#layer_1_2_0_0')
                                                    .should('not.have.attr', 'style') // string attribute
                                               
                                    }
                                })
                                                        

    })

})