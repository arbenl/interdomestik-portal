describe('Verification Page', () => {
  beforeEach(() => {
    cy.clearDatabase();
    cy.seedDatabase();
    cy.visit('/verify.html');
  });

  it('should display the verification page', () => {
    cy.contains('h1', 'Verify Membership');
  });
});