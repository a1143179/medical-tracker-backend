/* global cy */
describe('Google OAuth Login', () => {
  beforeEach(() => {
    // Clear all cookies before each test
    cy.clearCookies();
    
    // Mock the Google OAuth flow
    cy.intercept('GET', '/api/auth/login*', (req) => {
      // Simulate successful Google OAuth redirect
      req.reply({
        statusCode: 302,
        headers: {
          'Location': '/api/auth/callback?returnUrl=/dashboard'
        }
      });
    }).as('googleLogin');

    cy.intercept('GET', '/api/auth/callback*', (req) => {
      // Mock successful callback with user data
      req.reply({
        statusCode: 302,
        headers: {
          'Location': '/dashboard'
        }
      });
    }).as('googleCallback');

    cy.intercept('POST', '/api/auth/logout', {
      statusCode: 200,
      body: { message: 'Logged out successfully' }
    }).as('logout');
  });

  it('should display Google login page when not authenticated', () => {
    cy.intercept('GET', '/api/auth/me', { statusCode: 401 }).as('getUserInfo');
    cy.visit('/login');
    // Check that the Google login button is displayed
    cy.get('.google-signin-button').should('be.visible');
    cy.get('.google-signin-button').should('contain', 'Sign in with Google');
    // Check that the app title is displayed
    cy.contains('h4', 'Blood Sugar Tracker').should('be.visible');
    // Check that the subtitle is displayed (may be h6, p, or span depending on MUI version)
    cy.contains('Professional Diabetes Management').should('be.visible');
  });

  it('should redirect to Google OAuth when login button is clicked', () => {
    cy.intercept('GET', '/api/auth/me', { statusCode: 401 }).as('getUserInfo');
    cy.visit('/login');
    cy.get('.google-signin-button').click();
    // Verify that the login endpoint was called
    cy.wait('@googleLogin');
  });

  it('should redirect authenticated users to dashboard', () => {
    // Mock authenticated user
    cy.intercept('GET', '/api/auth/me', {
      statusCode: 200,
      body: {
        id: 1,
        email: 'cypressbloodsugartracker@gmail.com',
        name: 'Cypress Test User',
        createdAt: '2024-01-01T00:00:00Z',
        isEmailVerified: true,
        languagePreference: 'en'
      }
    }).as('getUserInfo');
    cy.visit('/login');
    // Should redirect to dashboard
    cy.url().should('include', '/dashboard');
  });

  it('should handle authentication errors gracefully', () => {
    // Mock authentication error
    cy.intercept('GET', '/api/auth/me', { statusCode: 401 }).as('getUserInfoError');
    cy.visit('/login');
    // Should stay on login page
    cy.url().should('include', '/login');
    cy.get('.google-signin-button').should('be.visible');
  });

  it('should handle callback errors gracefully', () => {
    cy.intercept('GET', '/api/auth/me', { statusCode: 401 }).as('getUserInfo');
    cy.intercept('GET', '/api/auth/callback*', (req) => {
      // Mock callback error
      req.reply({
        statusCode: 302,
        headers: {
          'Location': '/login?error=authentication_failed'
        }
      });
    }).as('googleCallbackError');
    cy.visit('/api/auth/callback?returnUrl=/dashboard&error=authentication_failed');
    // Should redirect back to login page
    cy.url().should('include', '/login');
  });
}); 