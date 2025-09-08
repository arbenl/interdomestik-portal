describe('Profile Page', () => {
  beforeEach(() => {
    cy.clearDatabase();
    cy.seedDatabase();
    cy.signInUI('member1@example.com', 'password123');
    cy.visit('/profile');
  });

  it("should display the user's profile", () => {
    cy.get('input[type="email"]', { timeout: 15000 }).should('exist');
    cy.contains('h2', /My Profile/i, { timeout: 15000 }).should('be.visible');
  });
});
