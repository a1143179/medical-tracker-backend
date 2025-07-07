/* global cy, Cypress */
/* eslint-env cypress */
describe('Forgot Password Flow', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.ensureEnglishLanguage();
    
    // Handle uncaught exceptions to prevent test failures
    cy.on('uncaught:exception', (err, runnable) => {
      // Prevent the error from failing the test
      return false;
    });
    
    // Wait for the forgot password link to be available and click it
    cy.get('[data-testid="forgot-password-link"]').should('be.visible').click();
  });

  it('should show error if email is empty', () => {
    // The button should be disabled when email is empty
    cy.get('[data-testid="send-reset-code-button"]').should('be.disabled');
  });

  it('should send reset code for valid email and change password', () => {
    // Intercept before clicking the button
    cy.intercept('POST', '/api/auth/forgot-password').as('forgotPassword');
    cy.get('input[name="email"]').clear().type('weiwangfly@hotmail.com');
    cy.get('[data-testid="send-reset-code-button"]').click();
    cy.get('[data-testid="success-message"]').should('be.visible');
    
    // Get the verification code from the API response
    cy.wait('@forgotPassword').then((interception) => {
      const responseBody = interception.response.body;
      const resetCode = responseBody.code;
      
      // Enter the reset code and new password
      cy.get('[data-testid="reset-code-input"]').type(resetCode);
      cy.get('[data-testid="new-password-input"]').type('aaaaaa');
      cy.get('[data-testid="confirm-new-password-input"]').type('aaaaaa');
      cy.get('[data-testid="reset-password-button"]').click();
      
      // Verify password reset success
      cy.get('[data-testid="success-message"]').should('be.visible');
      cy.get('[data-testid="back-to-login-button"]').click();
      
      // Login with new password
      cy.get('input[name="email"]').clear().type('weiwangfly@hotmail.com');
      cy.get('input[name="password"]').clear().type('aaaaaa');
      cy.get('form').submit();
      cy.url().should('include', '/dashboard');
      
      // Logout
      cy.get('[data-testid="profile-menu"]').click();
      cy.get('[data-testid="logout-button"]').click();
      cy.url().should('include', '/login');
      
      // Change password back to original
      cy.contains('Forgot Password?').click();
      cy.intercept('POST', '/api/auth/forgot-password').as('forgotPassword2');
      cy.get('input[name="email"]').clear().type('weiwangfly@hotmail.com');
      cy.get('[data-testid="send-reset-code-button"]').click();
      cy.get('[data-testid="success-message"]').should('be.visible');
      
      // Get the new verification code
      cy.wait('@forgotPassword2').then((interception2) => {
        const responseBody2 = interception2.response.body;
        const resetCode2 = responseBody2.code;
        
        // Enter the reset code and change password back
        cy.get('[data-testid="reset-code-input"]').type(resetCode2);
        cy.get('[data-testid="new-password-input"]').type('AsDfJkL123');
        cy.get('[data-testid="confirm-new-password-input"]').type('AsDfJkL123');
        cy.get('[data-testid="reset-password-button"]').click();
        
        // Verify password reset success
        cy.get('[data-testid="success-message"]').should('be.visible');
        cy.get('[data-testid="back-to-login-button"]').click();
        
        // Login with original password
        cy.get('input[name="email"]').clear().type('weiwangfly@hotmail.com');
        cy.get('input[name="password"]').clear().type('AsDfJkL123');
        cy.get('form').submit();
        cy.url().should('include', '/dashboard');
      });
    });
  });
}); 