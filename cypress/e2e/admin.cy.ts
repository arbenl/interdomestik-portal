const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASS = "Admin123!";

describe("Admin dashboard", () => {
  before(() => {
    cy.task("resetAuth");
    cy.task("resetFirestore");
  });

  it("shows admin controls for an admin user", () => {
    cy.task("createUser", { email: ADMIN_EMAIL, password: ADMIN_PASS }).then((creds: any) => {
      // Promote to admin via emulator custom claims
      return cy.task("setCustomClaims", { localId: creds.localId, claims: { role: "admin", allowedRegions: ["PRISHTINA"] } });
    });

    cy.visit("/admin.html");
    cy.uiSignIn(ADMIN_EMAIL, ADMIN_PASS);

    // After sign-in, refresh token to pick up claims (many apps do this on their own)
    cy.window().then(async (win) => {
      const user = win.firebase.auth().currentUser;
      await user?.getIdToken(true);
    });

    // Assert admin controls are visible (adjust to your DOM)
    cy.contains(/Set User Role|Activate Membership|Export CSV/i).should("exist");
  });
});