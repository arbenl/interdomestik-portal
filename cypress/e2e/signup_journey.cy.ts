/// <reference types="cypress" />

describe('Sign-up Journey', () => {
  before(() => {
    cy.task('assertEmulators');
    cy.task('resetAuth');
    cy.task('resetFirestore');
  });

  it('signs up a new user and lands on profile', () => {
    const email = `new_${Date.now()}@example.com`;
    const pass = 'password123';
    cy.visit('/signup');
    cy.get('input[type="email"]').type(email);
    cy.get('input[type="password"]').type(pass);
    cy.get('input[type="text"]').type('New User');
    cy.contains('label', /Region/i).parent().find('select').select('PRISHTINA');
    cy.contains('button', /Sign Up/i).click();
    // Navigate to profile after successful sign-up
    cy.visit('/profile');
    cy.contains('h2', /My Profile/i, { timeout: 10000 }).should('be.visible');
  });
});
