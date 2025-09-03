describe("Smoke", () => {
  it("loads home page", () => {
    cy.visit("/");
    cy.contains("Interdomestik").should("exist"); // adjust to a real text on your page
  });
});