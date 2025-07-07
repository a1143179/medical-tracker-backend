/* global cy, Cypress */
/* eslint-env cypress */
describe('Language Preference', () => {
  beforeEach(() => {
    cy.loginAndEnsureEnglish('weiwangfly@hotmail.com', 'AsDfJkL123');
  });

  it('should change language preference to Chinese', () => {
    cy.get('[data-testid="language-selector"]').click();
    cy.get('[role="option"]').contains('中文').click();
    // Verify language change is reflected in the selector
    cy.get('[data-testid="language-selector"]').should('contain', '中文');
  });

  it('should change language preference to English', () => {
    cy.get('[data-testid="language-selector"]').click();
    cy.get('[role="option"]').contains('English').click();
    cy.get('[data-testid="language-selector"]').should('contain', 'English');
  });

  it('should revert to English language', () => {
    cy.get('[data-testid="language-selector"]').click();
    cy.get('[role="option"]').contains('English').click();
    cy.get('[data-testid="language-selector"]').should('contain', 'English');
  });

  it('should persist language preference after logout and login', () => {
    // Set language to Chinese
    cy.get('[data-testid="language-selector"]').click();
    cy.get('[role="option"]').contains('中文').click();
    cy.get('[data-testid="language-selector"]').should('contain', '中文');
    
    // Logout
    cy.get('[data-testid="profile-menu"]').click();
    cy.get('[data-testid="logout-button"]').click();
    cy.url().should('include', '/login');
    
    // Login again
    cy.get('input[name="email"]').type('weiwangfly@hotmail.com');
    cy.get('input[name="password"]').type('AsDfJkL123');
    cy.get('form').submit();
    cy.url().should('include', '/dashboard');
    
    // Verify language preference is still Chinese
    cy.get('[data-testid="language-selector"]').should('contain', '中文');
  });

  it('should handle invalid language selection', () => {
    // This test is not applicable since Material-UI Select only shows valid options
    // The dropdown only contains valid language options
    cy.get('[data-testid="language-selector"]').click();
    cy.get('[role="option"]').should('have.length', 2); // Only English and Chinese
  });
}); 