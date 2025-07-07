/* global cy, Cypress */
/* eslint-env cypress */
describe('Login Flow', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.ensureEnglishLanguage();
  });

  it('should login successfully and redirect to dashboard', () => {
    cy.get('input[name="email"]').type('weiwangfly@hotmail.com');
    cy.get('input[name="password"]').type('AsDfJkL123');
    cy.get('form').submit();
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="add-record-button"]').should('be.visible');
  });

  it('should show error on invalid credentials', () => {
    cy.get('input[name="email"]').type('invalid@example.com');
    cy.get('input[name="password"]').type('wrongpassword');
    cy.get('form').submit();
    cy.get('[data-testid="error-message"]').should('be.visible');
  });

  it('should login with remember me and persist after reload', () => {
    cy.get('input[name="email"]').type('weiwangfly@hotmail.com');
    cy.get('input[name="password"]').type('AsDfJkL123');
    cy.get('input[type="checkbox"]').check();
    cy.get('form').submit();
    cy.url().should('include', '/dashboard');
    cy.reload();
    cy.url().should('include', '/dashboard');
  });

  it('should login without remember me and persist after reload, but logout after browser close', () => {
    // Login without remember me
    cy.get('input[name="email"]').type('weiwangfly@hotmail.com');
    cy.get('input[name="password"]').type('AsDfJkL123');
    cy.get('input[type="checkbox"]').should('not.be.checked');
    cy.get('form').submit();
    cy.url().should('include', '/dashboard');
    // Reload: should still be logged in
    cy.reload();
    cy.url().should('include', '/dashboard');
    // Simulate browser close by clearing cookies/session
    cy.clearCookies();
    cy.reload();
    // Should redirect to login after session is cleared
    cy.url().should('include', '/login');
  });
}); 