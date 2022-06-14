/// <reference types="cypress">

const { get } = require("http")


describe("Clms nologin Test", () => {
    //Define variables
    let num1
    let num2

    //Visit CLMS Portal
    beforeEach('Open CLMS Portal',()=>{
        cy.visit('/')
    })

    // CLMS-282: Map Viewer / Layer menu / Active on map / X button - When X button is clicked all the related datasets are erased
    it("CLMS-282: map viewer active on map x button test", () => {
        // Map viewer
        cy.get('.ccl-header-main-menu').find('[href="/en/map-viewer"]').click()
        //Wait to render
        cy.wait(2000)
        // Panels
        //cy.get('[class="esri-icon-drag-horizontal esri-widget--button esri-widget esri-interactive"]')//.click()
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
        //  Tab List
        cy.get('.tabs')
            //Wait to render
            cy.wait(5000) 
            cy.get('#active_label').click().should('contain','Active on map') 
            // 
            cy.get('.map-active-layers').find('.active-layer').should('have.length',6).then($num =>{
                num1 =$num.length
                cy.log(num1)
                cy.wait(1000)
                cy.get('#active_Land_Use_Raster1402_2_0_0_0').find('.active-layer-delete').click()
                cy.get('.map-active-layers').find('.active-layer').should('have.length',5).then($nume =>{
                    num2 =$nume.length
                    //cy.log(num2)
                    expect(num1-1).to.eq(num2) 
                })
            })
        cy.wait(5000)      
    })
})
