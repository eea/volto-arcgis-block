// <reference types="cypress">

//import { get } from "http"
//import { hasUncaughtExceptionCaptureCallback } from "process"

//const { verify } = require("crypto")

describe("Clms Widget Test", () => {
    let handlingLevel

    beforeEach('Open CLMS Portal',()=>{
        cy.openClmsPortal()
    })

    // Widget Legend Test
    it("map viewer legend widget test", () => {
        // Map viewer
        //cy.get('[href="/en/map-viewer"]').should('contain','Map viewer')
        cy.get('[href="/en/map-viewer"]').click()
        //Wait to render
        cy.wait(2000)
        // Panels
        cy.get('[class="esri-icon-drag-horizontal esri-widget--button esri-widget esri-interactive"]').contains
  
            // // Hot spot monitoring 
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
            cy.contains('.esri-legend__layer-caption','Greater City Boundary')
              .get('[class="esri-legend__layer-cell esri-legend__layer-cell--symbols"]').find('img').should('have.attr', 'src') 
              .and('include', 'UA_UrbanAtlas_2018') 

    })
})