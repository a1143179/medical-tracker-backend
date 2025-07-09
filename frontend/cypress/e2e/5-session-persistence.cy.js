/* global Cypress, cy */
/* eslint-env cypress */

describe('5. Session Persistence and Logout', () => {
  beforeEach(() => {
    // Mock authenticated user
    cy.intercept('GET', '/api/auth/me', {
      statusCode: 200,
      body: {
        id: 1,
        email: 'testuser@example.com',
        name: 'Test User',
        createdAt: '2024-01-01T00:00:00Z',
        isEmailVerified: true,
        languagePreference: 'en'
      }
    }).as('getUserInfo');

    cy.intercept('POST', '/api/auth/logout', {
      statusCode: 200,
      body: { message: 'Logged out successfully' }
    }).as('logout');

    cy.visit('/dashboard');
    cy.ensureEnglishLanguage();
  });

  it('should persist session after reload', () => {
    // Should be on dashboard
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="add-record-button"]').should('be.visible');
    
    // Reload page
    cy.reload();
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="add-record-button"]').should('be.visible');
  });

  it('should persist selected language after reload', () => {
    // Change language to Chinese
    cy.get('[data-testid="language-selector"]').click();
    cy.get('[data-value="zh"]').click();
    
    // Reload and verify language persists
    cy.reload();
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="language-selector"]').should('contain', '中文');
  });

  it('should logout properly and clear session', () => {
    // Logout
    cy.get('[data-testid="logout-button"]').click();
    cy.wait('@logout');
    
    // Should redirect to login page
    cy.url().should('include', '/login');
    
    // Try to access dashboard - should redirect to login
    cy.visit('/dashboard');
    cy.url().should('include', '/login');
  });

  it('should handle session expiration gracefully', () => {
    // Mock session expiration (unauthorized response)
    cy.intercept('GET', '/api/auth/me', {
      statusCode: 401
    }).as('getUserInfoUnauthorized');

    cy.reload();
    
    // Should redirect to login page
    cy.url().should('include', '/login');
    cy.get('.google-signin-button').should('be.visible');
  });
}); 