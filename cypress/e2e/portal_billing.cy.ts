/// <reference types="cypress" />

describe('Portal + Billing smoke', () => {
  const EMAIL = 'member1@example.com';
  const PASS = 'password123';
  const PROJECT_ID = Cypress.env('FB_PROJECT_ID') || 'demo-interdomestik';

  before(() => {
    cy.task('resetAuth');
    cy.task('resetFirestore');
    // Seed demo data via function in emulator
    cy.request(`http://127.0.0.1:5001/${PROJECT_ID}/europe-west1/seedDatabase`);
  });

  it('shows portal and adds a paid invoice in Billing', () => {
    // Seeded user signs in via app form
    cy.signInUI(EMAIL, PASS);

    // Basic portal cards
    cy.visit('/portal');
    cy.contains(/Your digital card/i, { timeout: 8000 }).should('exist');
    cy.contains(/Upcoming events/i).should('exist');
    cy.contains(/Billing & Subscription/i).should('exist');

    // Go to Billing and add test invoice
    cy.contains('a', /Open billing/i).click();
    cy.contains('button', /Add test paid invoice/i).click();

    // Verify invoice appears
    cy.contains(/Invoices/i).should('exist');
    cy.contains(/paid/i).should('exist');
  });
});
