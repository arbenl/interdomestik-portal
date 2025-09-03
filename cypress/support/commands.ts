/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable<Subject = any> {
      clearDatabase(): Chainable<Subject>;
      seedDatabase(): Chainable<Subject>;
      login(email: string, password: string): Chainable<Subject>;
      uiSignIn(email: string, password: string): Chainable<Subject>;
    }
  }
}
export {};

Cypress.Commands.add("clearDatabase", () => {
  cy.task("resetAuth");
  cy.task("resetFirestore");
});

Cypress.Commands.add("seedDatabase", () => {
  // No-op for now; keep for future fixtures
  return cy.wrap(null);
});

// Signs in using the page's Firebase Web SDK (requires page to be loaded)
Cypress.Commands.add("uiSignIn", (email: string, password: string) => {
  cy.window().its("firebase.auth").should("be.a", "function");
  cy.window().then(async (win) => {
    await win.firebase.auth().signInWithEmailAndPassword(email, password);
  });
});

/**
 * Prepares the user account in the Auth emulator.
 * NOTE: This does NOT sign into the page (page not loaded yet).
 * After cy.visit(...), call cy.uiSignIn(email, password).
 */
Cypress.Commands.add("login", (email: string, password: string) => {
  cy.task("createUser", { email, password }).its("localId").should("be.a", "string");
});