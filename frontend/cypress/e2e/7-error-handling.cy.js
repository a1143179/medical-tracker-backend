/* global Cypress, cy */
/* eslint-env cypress */

describe('7. Error Handling', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.ensureEnglishLanguage();
  });

  it('should handle authentication token expiration', () => {
    // Mock authenticated user first
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

    cy.visit('/dashboard');
    cy.url().should('include', '/dashboard');
    
    // Simulate token expiration by mocking unauthorized response
    cy.intercept('GET', '/api/auth/me', {
      statusCode: 401
    }).as('getUserInfoUnauthorized');
    
    cy.reload();
    
    // Should redirect to login page
    cy.url().should('include', '/login');
    cy.get('.google-signin-button').should('be.visible');
  });

  it('should handle browser back/forward navigation', () => {
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

    cy.visit('/dashboard');
    cy.url().should('include', '/dashboard');
    
    // Navigate to login page (should redirect to dashboard)
    cy.visit('/login');
    cy.url().should('include', '/dashboard');
    
    // Go back
    cy.go('back');
    cy.url().should('include', '/dashboard');
  });

  it('should handle concurrent requests properly', () => {
    // Mock Google OAuth login
    cy.intercept('GET', '/api/auth/login*', {
      statusCode: 302,
      headers: {
        'Location': '/api/auth/callback?returnUrl=/dashboard'
      }
    }).as('googleLogin');
    
    // Try to login multiple times quickly
    cy.get('.google-signin-button').click();
    cy.get('.google-signin-button').click(); // Click again quickly
    
    cy.wait('@googleLogin');
  });

  it('should handle network errors gracefully', () => {
    // Intercept with network error
    cy.intercept('GET', '/api/auth/login*', {
      forceNetworkError: true
    }).as('networkError');
    
    cy.get('.google-signin-button').click();
    
    cy.wait('@networkError');
    // Should stay on login page
    cy.url().should('include', '/login');
  });

  it('should handle server errors gracefully', () => {
    // Intercept with server error
    cy.intercept('GET', '/api/auth/login*', {
      statusCode: 500,
      body: { message: 'Internal server error' }
    }).as('serverError');
    
    cy.get('.google-signin-button').click();
    
    cy.wait('@serverError');
    // Should stay on login page
    cy.url().should('include', '/login');
  });

  it('should handle malformed response data', () => {
    // Intercept with malformed response
    cy.intercept('GET', '/api/auth/me', {
      statusCode: 200,
      body: 'invalid json'
    }).as('malformedResponse');
    
    cy.visit('/dashboard');
    
    cy.wait('@malformedResponse');
    // Should redirect to login due to parsing error
    cy.url().should('include', '/login');
  });

  it('should handle timeout errors', () => {
    // Intercept with delay to simulate timeout
    cy.intercept('GET', '/api/auth/login*', {
      delay: 10000, // 10 second delay
      statusCode: 302,
      headers: {
        'Location': '/api/auth/callback?returnUrl=/dashboard'
      }
    }).as('timeoutRequest');
    
    cy.get('.google-signin-button').click();
    
    // Should wait for the request
    cy.wait('@timeoutRequest');
  });

  it('should handle callback errors gracefully', () => {
    // Mock callback error
    cy.intercept('GET', '/api/auth/callback*', {
      statusCode: 302,
      headers: {
        'Location': '/login?error=authentication_failed'
      }
    }).as('callbackError');
    
    cy.visit('/api/auth/callback?returnUrl=/dashboard&error=authentication_failed');
    
    // Should redirect back to login page
    cy.url().should('include', '/login');
    cy.get('.google-signin-button').should('be.visible');
  });
}); 