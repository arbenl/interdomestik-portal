/// <reference types="cypress" />

describe('Renewal Badge and Token QR', () => {
  const EMAIL = 'member1@example.com';
  const PASS = 'password123';
  const PROJECT_ID = Cypress.env('FB_PROJECT_ID') || 'demo-interdomestik';

  before(() => {
    cy.task('resetAuth');
    cy.task('resetFirestore');
    cy.request(`http://127.0.0.1:5001/${PROJECT_ID}/europe-west1/seedDatabase`);
  });

  it('shows renewed badge and verifies via token link', () => {
    cy.signInUI(EMAIL, PASS);
    cy.visit('/billing');
    cy.contains('button', /Add test paid invoice/i).click();
    cy.contains(/Payment recorded|succeeded/i, { timeout: 10000 }).should('exist');

    // Navigate back to portal and expect RENEWED badge
    cy.visit('/portal');
    cy.contains(/RENEWED/i, { timeout: 10000 }).should('be.visible');

    // Extract Verify link, derive token or memberNo, and call function endpoint
    cy.contains('Verify').parent().find('a').first().invoke('attr', 'href').then((href) => {
      const url = new URL(href!, 'http://localhost:5000');
      const token = url.searchParams.get('token');
      const memberNo = url.searchParams.get('memberNo');
      if (token) {
        cy.request(`/verifyMembership?token=${encodeURIComponent(token)}`).its('body').then((b:any) => {
          expect(b).to.have.property('ok', true);
          expect(b).to.have.property('valid');
        });
      } else if (memberNo) {
        cy.request(`/verifyMembership?memberNo=${encodeURIComponent(memberNo)}`).its('body').then((b:any) => {
          expect(b).to.have.property('ok', true);
          expect(b).to.have.property('valid');
        });
      } else {
        throw new Error('Verify link missing token/memberNo');
      }
    });
  });
});
