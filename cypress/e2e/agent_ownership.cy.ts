/// <reference types="cypress" />

describe('Agent Ownership', () => {
  const PROJECT_ID = Cypress.env('FB_PROJECT_ID') || 'demo-interdomestik';

  before(() => {
    cy.task('resetAuth');
    cy.task('resetFirestore');
    cy.request(`http://127.0.0.1:5001/${PROJECT_ID}/europe-west1/seedDatabase`);
  });

  it('lists only my members and allows safe edits', () => {
    const EMAIL = 'agent1@example.com';
    const PASS = 'password123';
    cy.signInUI(EMAIL, PASS);
    cy.visit('/agent');
    cy.contains('h2', /Agent Tools/i, { timeout: 15000 }).should('be.visible');
    cy.contains('h3', /My Members/i).should('be.visible');

    // There should be some members assigned (seed distributes by region)
    cy.get('table tbody tr', { timeout: 15000 }).its('length').should('be.gte', 1);

    // Edit first row safe fields (name/phone/orgId)
    cy.get('table tbody tr').first().as('row');
    cy.get('@row').contains('button', /Edit/i).click();
    cy.get('@row').find('input').eq(0).clear().type('Updated Name');
    cy.get('@row').find('input').eq(1).clear().type('+38349111222');
    cy.get('@row').find('input').eq(2).clear().type('ORG-TEST');
    cy.get('@row').contains('button', /Save/i).click();
    cy.contains(/Member updated/i, { timeout: 8000 }).should('exist');
  });
});

