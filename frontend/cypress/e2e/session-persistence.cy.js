/* global cy, Cypress */
/* eslint-env cypress */
describe('Session Persistence and Logout (logout only on browser close)', () => {
  beforeEach(() => {
    cy.loginAndEnsureEnglish('weiwangfly@hotmail.com', 'AsDfJkL123');
  });

  it('should persist session after reload, and only logout on browser close', () => {
    cy.clearCookies();
    // Go to login page and login with remember me
    cy.visit('/login');
    cy.get('input[name="email"]').type('weiwangfly@hotmail.com');
    cy.get('input[name="password"]').type('AsDfJkL123');
    cy.get('input[type="checkbox"]').check();
    cy.get('form').submit();
    cy.url().should('include', '/dashboard');
    cy.reload();
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="add-record-button"], [data-testid="dashboard-title"]').should('exist');
    // Simulate browser close by clearing cookies
    cy.clearCookies();
    cy.visit('/dashboard');
    cy.url().should('include', '/login');
  });

  it('should logout and redirect to login', () => {
    cy.clearCookies();
    cy.get('[data-testid="profile-menu"]').click();
    cy.get('[data-testid="logout-button"]').click();
    cy.url().should('include', '/login');
  });

  it('should persist selected language after reload', () => {
    cy.visit('/dashboard');
    // Switch to Chinese (or another language)
    cy.get('[data-testid="language-selector"]').click();
    cy.contains('中文').click();
    // Check that some UI text is in Chinese (e.g., '添加新记录' for 'Add New Record')
    cy.contains('添加新记录').should('exist');
    // Reload and check language persists
    cy.reload();
    cy.contains('添加新记录').should('exist');
    // Switch back to English
    cy.get('[data-testid="language-selector"]').click();
    cy.contains('English').click();
    cy.contains('Add New Record').should('exist');
  });
}); 