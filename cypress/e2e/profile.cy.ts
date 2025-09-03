describe('Profile Page', () => {
  beforeEach(() => {
    cy.clearDatabase();
    cy.seedDatabase();
    cy.login('testuser@example.com', 'password123');
    cy.visit('/profile.html');
  });

  it("should display the user's profile", () => {
    cy.contains('h1', 'User Profile');
    cy.get('#name').should('have.value', 'Test User');
  });
});