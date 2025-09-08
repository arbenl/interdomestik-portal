/// <reference types="cypress" />

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASS = 'password123';
const MEMBER_EMAIL = `e2e_member_${Date.now()}@example.com`;

describe('Admin Journey', () => {
  const PROJECT_ID = Cypress.env('FB_PROJECT_ID') || 'demo-interdomestik';
  before(() => {
    cy.task('assertEmulators');
    cy.task('resetAuth');
    cy.task('resetFirestore');
    cy.request(`http://127.0.0.1:5001/${PROJECT_ID}/europe-west1/seedDatabase`);
  });

  it('signs in, registers a member, and sees success', () => {
    cy.signInUI(ADMIN_EMAIL, ADMIN_PASS);
    cy.visit('/admin');
    cy.reload();

    // Fill agent/admin registration form
    cy.get('input[placeholder="Email"]').type(MEMBER_EMAIL);
    cy.get('input[placeholder="Full name"]').type('Member E2E');
    // Select the Region dropdown, not the Role selector
    cy.contains('label', /Region/i).parent().find('select').select('PRISHTINA');
    cy.contains('button', /Register Member/i).click();

    // Admin page shows success text
    cy.contains(/Member registered successfully/i).should('exist');
  });
});
