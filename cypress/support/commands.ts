/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable<Subject = any> {
      clearDatabase(): Chainable<Subject>;
      seedDatabase(): Chainable<Subject>;
      login(email: string, password: string): Chainable<Subject>;
      signInUI(email: string, password: string): Chainable<Subject>;
    }
  }
}
export {};

Cypress.Commands.add("clearDatabase", () => {
  cy.task("resetAuth");
  cy.task("resetFirestore");
});

Cypress.Commands.add("seedDatabase", () => {
  const PROJECT_ID = Cypress.env('FB_PROJECT_ID') || 'demo-interdomestik';
  // Seed via Functions emulator if available
  return cy.request(`http://127.0.0.1:5001/${PROJECT_ID}/europe-west1/seedDatabase`);
});

// Signs in using the app's SignIn form (modular SDK handled by the app)
Cypress.Commands.add("signInUI", (email: string, password: string) => {
  cy.visit('/signin');
  cy.get('input[type="email"]').clear().type(email);
  cy.get('input[type="password"]').clear().type(password);
  cy.contains('button', /sign in/i).click();
  // Wait for redirect to profile page or other authenticated route
  cy.location('pathname', { timeout: 8000 }).should('match', /\/profile|\/portal|\//);
});

/**
 * Prepares the user account in the Auth emulator.
 * NOTE: This does NOT sign into the page (page not loaded yet).
 * After cy.visit(...), call cy.uiSignIn(email, password).
 */
Cypress.Commands.add("login", (email: string, password: string) => {
  cy.task("createUser", { email, password }).its("localId").should("be.a", "string");
});
