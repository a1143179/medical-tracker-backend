/* global cy, Cypress */
/* eslint-env cypress */
describe('Password Reset Flow', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.ensureEnglishLanguage();
    cy.contains('Forgot Password?').click();
  });

  it('should send reset code for valid email', () => {
    cy.get('input[name="email"]').clear().type('weiwangfly@hotmail.com');
    cy.get('[data-testid="send-reset-code-button"]').click();
    cy.get('[data-testid="success-message"]').should('be.visible');
  });

  it('should show generic message for non-existent email', () => {
    cy.get('input[name="email"]').clear().type('nonexistent@example.com');
    cy.get('[data-testid="send-reset-code-button"]').click();
    cy.get('[data-testid="success-message"]').should('be.visible');
    cy.get('[data-testid="error-message"]').should('not.exist');
  });

  it('should validate reset code format', () => {
    cy.get('input[name="email"]').clear().type('weiwangfly@hotmail.com');
    cy.get('[data-testid="send-reset-code-button"]').click();
    cy.get('[data-testid="success-message"]').should('be.visible');
    cy.get('[data-testid="reset-code-input"] input').should('be.visible');
    cy.get('[data-testid="reset-code-input"] input').clear().type('invalid');
    cy.get('[data-testid="new-password-input"] input').clear().type('NewPassword123');
    cy.get('[data-testid="confirm-new-password-input"] input').clear().type('NewPassword123');
    cy.get('[data-testid="reset-password-button"]').click();
    cy.get('[data-testid="error-message"]').should('be.visible');
  });

  it('should reset password with valid code', () => {
    // Mock the reset code endpoint
    cy.intercept('POST', '/api/auth/forgot-password', {
      statusCode: 200,
      body: { message: 'Reset code sent successfully', code: '123456' }
    }).as('sendResetCode');
    
    cy.get('input[name="email"]').clear().type('weiwangfly@hotmail.com');
    cy.get('[data-testid="send-reset-code-button"]').click();
    cy.wait('@sendResetCode');
    
    // Mock the reset password endpoint
    cy.intercept('POST', '/api/auth/reset-password', {
      statusCode: 200,
      body: { message: 'Password reset successfully' }
    }).as('resetPassword');
    
    cy.get('[data-testid="reset-code-input"] input').clear().type('123456');
    cy.get('[data-testid="new-password-input"] input').clear().type('NewPassword123');
    cy.get('[data-testid="confirm-new-password-input"] input').clear().type('NewPassword123');
    cy.get('[data-testid="reset-password-button"]').click();
    cy.wait('@resetPassword');
    cy.get('[data-testid="success-message"]').should('be.visible');
  });

  it('should validate new password requirements', () => {
    cy.get('input[name="email"]').clear().type('weiwangfly@hotmail.com');
    cy.get('[data-testid="send-reset-code-button"]').click();
    cy.get('[data-testid="success-message"]').should('be.visible');
    cy.get('[data-testid="reset-code-input"] input').should('be.visible');
    cy.get('[data-testid="reset-code-input"] input').clear().type('123456');
    cy.get('[data-testid="new-password-input"] input').clear().type('weak');
    cy.get('[data-testid="confirm-new-password-input"] input').clear().type('weak');
    cy.get('[data-testid="reset-password-button"]').click();
    cy.get('[data-testid="error-message"]').should('be.visible');
  });

  it('should require password confirmation match', () => {
    cy.get('input[name="email"]').clear().type('weiwangfly@hotmail.com');
    cy.get('[data-testid="send-reset-code-button"]').click();
    cy.get('[data-testid="success-message"]').should('be.visible');
    cy.get('[data-testid="reset-code-input"] input').should('be.visible');
    cy.get('[data-testid="reset-code-input"] input').clear().type('123456');
    cy.get('[data-testid="new-password-input"] input').clear().type('NewPassword123');
    cy.get('[data-testid="confirm-new-password-input"] input').clear().type('DifferentPassword123');
    cy.get('[data-testid="reset-password-button"]').click();
    cy.get('[data-testid="error-message"]').should('be.visible');
  });

  it('should handle expired reset code', () => {
    cy.intercept('POST', '/api/auth/reset-password', {
      statusCode: 400,
      body: { message: 'Reset code has expired' }
    }).as('expiredCode');
    
    cy.get('input[name="email"]').clear().type('weiwangfly@hotmail.com');
    cy.get('[data-testid="send-reset-code-button"]').click();
    cy.get('[data-testid="success-message"]').should('be.visible');
    
    cy.get('[data-testid="reset-code-input"] input').should('be.visible');
    cy.get('[data-testid="reset-code-input"] input').clear().type('123456');
    cy.get('[data-testid="new-password-input"] input').clear().type('NewPassword123');
    cy.get('[data-testid="confirm-new-password-input"] input').clear().type('NewPassword123');
    cy.get('[data-testid="reset-password-button"]').click();
    cy.wait('@expiredCode');
    cy.get('[data-testid="error-message"]').should('be.visible');
  });

  it('should prevent reuse of old reset codes', () => {
    cy.get('input[name="email"]').clear().type('weiwangfly@hotmail.com');
    cy.get('[data-testid="send-reset-code-button"]').click();
    cy.get('[data-testid="success-message"]').should('be.visible');
    cy.get('[data-testid="reset-code-input"] input').should('be.visible');
    cy.get('[data-testid="reset-code-input"] input').clear().type('123456');
    cy.get('[data-testid="new-password-input"] input').clear().type('NewPassword123');
    cy.get('[data-testid="confirm-new-password-input"] input').clear().type('NewPassword123');
    cy.get('[data-testid="reset-password-button"]').click();
    cy.get('[data-testid="error-message"]').should('be.visible');
  });
}); 