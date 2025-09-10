/// <reference types="cypress" />

describe('Admin Bulk Renew', () => {
  const PROJECT_ID = Cypress.env('FB_PROJECT_ID') || 'demo-interdomestik';

  before(() => {
    cy.task('resetAuth');
    cy.task('resetFirestore');
    cy.request(`http://127.0.0.1:5001/${PROJECT_ID}/europe-west1/seedDatabase`);
  });

  it('renews multiple selected members', () => {
    cy.signInUI('admin@example.com', 'password123');
    cy.visit('/admin');
    cy.contains('h2', /Admin Panel/i, { timeout: 15000 }).should('be.visible');

    // Select first two members in the main users table and capture their emails
    cy.get('table[data-testid="users-table"] tbody tr', { timeout: 20000 }).then(($rows) => {
      const row0 = $rows.eq(0);
      const row1 = $rows.eq(1);
      cy.wrap(row0).find('[data-testid="row-select"]').check({ force: true });
      cy.wrap(row1).find('[data-testid="row-select"]').check({ force: true });
      // Email is typically in the 3rd data column; fall back to scanning cells for '@'
      const getEmailFromRow = ($r: JQuery<HTMLElement>) => {
        const cells = $r.find('td').toArray().map(el => (el as HTMLElement).innerText.trim());
        return cells.find(t => /@/.test(t)) || '';
      };
      const email0 = getEmailFromRow(row0 as any);
      const email1 = getEmailFromRow(row1 as any);
      cy.wrap(email0).as('email0');
      cy.wrap(email1).as('email1');
    });

    // Run bulk renew
    cy.get('[data-testid="bulk-renew"]').click();

    // Wait for refresh and verify those specific rows show Active
    cy.contains(/Bulk renew completed/i, { timeout: 20000 }).should('exist');
    cy.get<string>('@email0').then((e0) => {
      cy.get('table[data-testid="users-table"] tbody tr', { timeout: 20000 }).contains('td', e0).parents('tr').as('r0');
      cy.get('@r0').contains(/ACTIVE|Active/).should('exist');
    });
    cy.get<string>('@email1').then((e1) => {
      cy.get('table[data-testid="users-table"] tbody tr', { timeout: 20000 }).contains('td', e1).parents('tr').as('r1');
      cy.get('@r1').contains(/ACTIVE|Active/).should('exist');
    });
  });
});
