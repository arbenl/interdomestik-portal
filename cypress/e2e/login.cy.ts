/// <reference types="cypress" />

describe("Profile Page", () => {
  const EMAIL = "testuser@example.com";
  const PASS = "password123";

  beforeEach(() => {
    cy.clearDatabase();                 // your custom command -> resets auth+firestore
    cy.login(EMAIL, PASS);              // your custom command -> creates user in Auth emulator
  });

  it("logs in and shows profile", () => {
    // Go straight to the profile page served by Hosting emulator
    cy.visit("/profile.html");

    // Sign in using the page’s Firebase SDK (custom command)
    cy.uiSignIn(EMAIL, PASS);

    // Force token refresh (helps when user was created via emulator task)
    cy.window().then(async (win) => {
      await win.firebase.auth().currentUser?.getIdToken(true);
    });

    // Assert we are on the profile page and important UI is visible
    cy.location("pathname").should("eq", "/profile.html");
    cy.contains("h1", /profile|user profile/i).should("be.visible"); // adjust text to your DOM
  });
});