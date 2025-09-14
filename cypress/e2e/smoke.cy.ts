describe('Smoke Test', () => {
  it('should load the home page', () => {
    cy.visit('/');
    cy.contains('Home').should('be.visible');
  });

  it('should login and redirect to the portal', () => {
    cy.visit('/signin');
    cy.get('input[type="email"]').type('member@example.com');
    cy.get('input[type="password"]').type('password');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/portal');
  });

  it('should navigate to the admin page', () => {
    cy.visit('/admin');
    cy.contains('Admin Panel').should('be.visible');
  });
});
