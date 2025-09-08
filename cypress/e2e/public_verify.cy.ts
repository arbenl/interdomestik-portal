/// <reference types="cypress" />

describe('Public Verification', () => {
  const PROJECT_ID = Cypress.env('FB_PROJECT_ID') || 'demo-interdomestik';

  before(() => {
    cy.task('resetAuth');
    cy.task('resetFirestore');
    cy.request(`http://127.0.0.1:5001/${PROJECT_ID}/europe-west1/seedDatabase`);
  });

  it('verifies a valid and invalid member number', () => {
    cy.visit('/verify');
    // prime function path
    cy.request(`http://127.0.0.1:5001/${PROJECT_ID}/europe-west1/verifyMembership?memberNo=INT-2025-000001`);
    // Valid from seeding
    cy.get('input[type="text"]').clear().type('INT-2025-000001');
    cy.contains('button', /Verify/i).click();
    cy.contains(/Membership is Active/i, { timeout: 8000 }).should('exist');

    // Invalid
    cy.get('input[type="text"]').clear().type('INT-2025-123456');
    cy.contains('button', /Verify/i).click();
    cy.contains(/not valid|not found/i, { timeout: 8000 }).should('exist');
  });
});
