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
    // Register a fresh member to ensure a unique row exists
    const NEW_EMAIL = `e2e_act_${Date.now()}@example.com`;
    cy.get('input[placeholder="Email"]', { timeout: 10000 }).type(NEW_EMAIL);
    cy.get('input[placeholder="Full name"]').type('E2E Activate');
    cy.get('select[aria-label="Region"]').select('PRISHTINA');
    cy.intercept({ method: 'POST', url: /agentCreateMember/i }).as('agentCreateMember');
    cy.contains('button', /Register Member/i).click();
    cy.wait('@agentCreateMember', { timeout: 20000 }).its('response.statusCode').should('be.oneOf', [200, 204]);
    cy.contains(/Member registered successfully/i, { timeout: 15000 }).should('exist');
    // Refresh list to include the new member row
    cy.get('body').then(($b) => {
      const btn = $b.find('[data-testid="refresh-users"]');
      if (btn.length) {
        cy.wrap(btn).click();
      } else {
        cy.reload();
      }
    });

    // Locate the specific row for the new email
    cy.get('table tbody tr', { timeout: 20000 })
      .contains('td', NEW_EMAIL)
      .parents('tr')
      .as('userRow');

    // Capture memberNo from this row
    cy.get('@userRow').find('td').eq(2).invoke('text').then((txt) => {
      const memberNo = txt.trim();
      expect(memberNo).to.match(/^INT-\d{4}-\d{6}$/);
      cy.wrap(memberNo).as('memberNo');
    });

    // Open activation modal for this row
    cy.get('@userRow').find('[data-testid="activate-btn"]').click();

    // Intercept callable request and wait for success
    cy.intercept({ method: 'POST', url: /startMembership/i }).as('startMembership');
    cy.contains('button', /^Activate$/i).click();
    cy.wait('@startMembership', { timeout: 20000 }).its('response.statusCode').should('be.oneOf', [200, 204]);
    // Verify via public endpoint that membership is active for that memberNo (through Hosting rewrite)
    cy.get<string>('@memberNo').then((memberNo) => {
      cy.request(`/verifyMembership?memberNo=${encodeURIComponent(memberNo)}`).its('body').then((b:any) => {
        expect(b).to.have.property('ok', true);
        expect(b).to.have.property('valid', true);
        expect(b).to.have.property('memberNo', memberNo);
      });
    });
  });
});
