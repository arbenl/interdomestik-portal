/// <reference types="cypress" />

describe('Admin Activate Flow', () => {
  const PROJECT_ID = Cypress.env('FB_PROJECT_ID') || 'demo-interdomestik';

  before(() => {
    cy.task('assertEmulators');
    cy.task('resetAuth');
    cy.task('resetFirestore');
    cy.request(`http://127.0.0.1:5001/${PROJECT_ID}/europe-west1/seedDatabase`);
  });

  // Re-enabled: verify backend state only; avoid flaky HTTP status intercepts
  it('lists users and activates membership for a seeded user', () => {
    const EMAIL = 'admin@example.com';
    const PASS = 'password123';
    cy.signInUI(EMAIL, PASS);
    cy.visit('/admin');
    cy.reload();
    cy.contains('h2', /Admin Panel/i, { timeout: 15000 }).should('be.visible');
    // Ensure the ID token carries latest claims before callables
    cy.contains('button', /Refresh my token/i).click({ force: true });
    // Register a fresh member to ensure a unique row exists
    const NEW_EMAIL = `e2e_act_${Date.now()}@example.com`;
    cy.get('input[placeholder="Email"]', { timeout: 10000 }).type(NEW_EMAIL);
    cy.get('input[placeholder="Full name"]').type('E2E Activate');
    cy.get('select[aria-label="Region"]').select('PRISHTINA');
    cy.contains('button', /Register Member/i).click();
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

    // Capture memberNo from any cell in the row by pattern (robust to column order)
    cy.get('@userRow').find('td').then(($cells) => {
      const texts = Array.from($cells).map((el) => (el as HTMLElement).innerText.trim());
      const m = texts.find((t) => /^INT-\d{4}-\d{6}$/.test(t));
      expect(m, 'member number in row').to.match(/^INT-\d{4}-\d{6}$/);
      cy.wrap(m as string).as('memberNo');
    });

    // Open activation modal for this row (ensure visible)
    cy.get('@userRow').find('[data-testid="activate-btn"]').scrollIntoView().click({ force: true });

    cy.contains('button', /^Activate$/i).click();
    // Verify via public endpoint that membership is active for that memberNo (through Hosting rewrite)
    cy.get<string>('@memberNo').then((memberNo) => {
      // Poll verification endpoint until valid (up to ~10s)
      const verifyOnce = () => cy.request(`/verifyMembership?memberNo=${encodeURIComponent(memberNo)}`).its('body');
      verifyOnce().then((b:any) => {
        if (b?.valid === true) {
          expect(b).to.have.property('ok', true);
          expect(b).to.have.property('memberNo', memberNo);
        } else {
          cy.wait(1000);
          verifyOnce().then((b2:any) => {
            expect(b2).to.have.property('ok', true);
            expect(b2).to.have.property('valid', true);
            expect(b2).to.have.property('memberNo', memberNo);
          });
        }
      });
    });
  });
});
