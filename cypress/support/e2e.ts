/// <reference types="cypress" />
import "./commands";

// Fail test fast on client-side errors
Cypress.on("uncaught:exception", () => false);

// Simple helper to sign in via web SDK on pages that load Firebase scripts
declare global {
  // we expect firebase to be a global if you include CDN scripts
  interface Window { firebase: any; }
}

export {};