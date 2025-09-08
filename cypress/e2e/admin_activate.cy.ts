/// <reference types="cypress" />

describe('Admin Activate Flow', () => {
  const PROJECT_ID = Cypress.env('FB_PROJECT_ID') || 'demo-interdomestik';

  before(() => {
    cy.task('assertEmulators');
    cy.task('resetAuth');
    cy.task('resetFirestore');
    cy.request(`http://127.0.0.1:5001/${PROJECT_ID}/europe-west1/seedDatabase`);
  });

  it('lists users and activates membership for a seeded user', () => {
    const EMAIL = 'admin@example.com';
    const PASS = 'password123';
    cy.signInUI(EMAIL, PASS);
    cy.visit('/admin');
    cy.reload();
    cy.contains('h2', /Admin Panel/i, { timeout: 15000 }).should('be.visible');
    // Register a fresh member to ensure a row exists
    const NEW_EMAIL = `e2e_act_${Date.now()}@example.com`;
    cy.get('input[placeholder="Email"]', { timeout: 10000 }).type(NEW_EMAIL);
    cy.get('input[placeholder="Full name"]').type('E2E Activate');
    // Choose the Region select specifically to avoid matching other selects on the page
    cy.contains('label', /Region/i).parent().find('select').select('PRISHTINA');
    cy.contains('button', /Register Member/i).click();
    cy.contains(/Member registered successfully/i, { timeout: 10000 }).should('exist');
    // Manually refresh users list if button exists; otherwise fallback to reload
    cy.get('body').then(($b) => {
      const btn = $b.find('[data-testid="refresh-users"]');
      if (btn.length) {
        cy.wrap(btn).click();
      } else {
        cy.reload();
      }
    });

    // Ensure table has at least one row, then click activate
    cy.get('table tbody tr', { timeout: 15000 }).should('have.length.at.least', 1);
    cy.get('[data-testid="activate-btn"]', { timeout: 15000 }).first().click();

    // Modal submit
    cy.contains('button', /^Activate$/i).click();
    // Success message visible on page
    cy.contains(/Membership activated/i).should('exist');
  });
});
