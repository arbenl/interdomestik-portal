/// <reference types="cypress" />

/// <reference types="cypress" />

describe("Profile Page", () => {
  const EMAIL = "member1@example.com";
  const PASS = "password123";

  beforeEach(() => {
    cy.clearDatabase();
    cy.seedDatabase();
  });

  it("logs in and shows profile", () => {
    cy.signInUI(EMAIL, PASS);
    // App often lands on /profile after sign-in; assert by checking the heading or email field
    cy.visit('/profile');
    cy.get('input[type="email"]', { timeout: 15000 }).should('exist');
    cy.contains('h2', /My Profile/i, { timeout: 15000 }).should('be.visible');
  });
});
