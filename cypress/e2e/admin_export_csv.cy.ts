/// <reference types="cypress" />

describe('Admin CSV Export', () => {
  const PROJECT_ID = Cypress.env('FB_PROJECT_ID') || 'demo-interdomestik';

  before(() => {
    cy.task('resetAuth');
    cy.task('resetFirestore');
    cy.request(`http://127.0.0.1:5001/${PROJECT_ID}/europe-west1/seedDatabase`);
  });

  it('downloads members.csv with expected content', () => {
    const EMAIL = 'admin@example.com';
    const PASS = 'password123';
    cy.signInUI(EMAIL, PASS);
    cy.visit('/admin');

    cy.intercept('GET', '**/exportMembersCsv*').as('csv');
    cy.contains('button', /Download Members CSV/i).click();
    cy.wait('@csv').its('response.body').then((text: string) => {
      expect(text).to.include('memberNo,name,email');
      expect(text).to.match(/INT-2025-000001|INT-2025-000002/);
    });
  });
});
