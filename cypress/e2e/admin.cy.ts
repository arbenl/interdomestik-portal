const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASS = "password123";

describe("Admin dashboard", () => {
  const PROJECT_ID = Cypress.env('FB_PROJECT_ID') || 'demo-interdomestik';
  before(() => {
    cy.task('assertEmulators');
    cy.task('resetAuth');
    cy.task('resetFirestore');
    cy.request(`http://127.0.0.1:5001/${PROJECT_ID}/europe-west1/seedDatabase`);
  });

  it("shows admin controls for an admin user", () => {
    cy.signInUI(ADMIN_EMAIL, ADMIN_PASS);
    cy.visit("/admin");
    cy.reload();

    // Assert admin controls are visible (adjust to your DOM)
    cy.contains(/Activate Membership|Download Members CSV/i).should("exist");
  });
});
