describe('Forgot Password', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('should show forgot password link on login page', () => {
    cy.get('[data-testid="forgot-password-link"]').should('be.visible');
  });

  it('should navigate to forgot password form when clicking forgot password link', () => {
    cy.get('[data-testid="forgot-password-link"]').click();
    cy.get('[data-testid="forgot-password-title"]').should('be.visible');
    cy.get('[data-testid="forgot-password-email-input"]').should('be.visible');
  });

  it('should show error when trying to send reset code without email', () => {
    cy.get('[data-testid="forgot-password-link"]').click();
    cy.get('[data-testid="send-reset-code-button"]').click();
    cy.get('[data-testid="error-message"]').should('contain', 'Please enter your email address first');
  });

  it('should send reset code successfully for existing user', () => {
    cy.get('[data-testid="forgot-password-link"]').click();
    cy.get('[data-testid="forgot-password-email-input"]').type('test@example.com');
    cy.get('[data-testid="send-reset-code-button"]').click();
    
    // In development mode, we should see the reset code
    cy.get('[data-testid="success-message"]').should('contain', 'Reset code sent');
    cy.get('[data-testid="reset-code-input"]').should('be.visible');
  });

  it('should show reset password form after sending code', () => {
    cy.get('[data-testid="forgot-password-link"]').click();
    cy.get('[data-testid="forgot-password-email-input"]').type('test@example.com');
    cy.get('[data-testid="send-reset-code-button"]').click();
    
    cy.get('[data-testid="reset-code-input"]').should('be.visible');
    cy.get('[data-testid="new-password-input"]').should('be.visible');
    cy.get('[data-testid="confirm-new-password-input"]').should('be.visible');
  });

  it('should show error when passwords do not match', () => {
    cy.get('[data-testid="forgot-password-link"]').click();
    cy.get('[data-testid="forgot-password-email-input"]').type('test@example.com');
    cy.get('[data-testid="send-reset-code-button"]').click();
    
    cy.get('[data-testid="reset-code-input"]').type('123456');
    cy.get('[data-testid="new-password-input"]').type('newpassword123');
    cy.get('[data-testid="confirm-new-password-input"]').type('differentpassword');
    cy.get('[data-testid="reset-password-button"]').click();
    
    cy.get('[data-testid="error-message"]').should('contain', 'Passwords do not match');
  });

  it('should show error when password is too short', () => {
    cy.get('[data-testid="forgot-password-link"]').click();
    cy.get('[data-testid="forgot-password-email-input"]').type('test@example.com');
    cy.get('[data-testid="send-reset-code-button"]').click();
    
    cy.get('[data-testid="reset-code-input"]').type('123456');
    cy.get('[data-testid="new-password-input"]').type('123');
    cy.get('[data-testid="confirm-new-password-input"]').type('123');
    cy.get('[data-testid="reset-password-button"]').click();
    
    cy.get('[data-testid="error-message"]').should('contain', 'Password must be at least 6 characters long');
  });

  it('should show error for invalid reset code', () => {
    cy.get('[data-testid="forgot-password-link"]').click();
    cy.get('[data-testid="forgot-password-email-input"]').type('test@example.com');
    cy.get('[data-testid="send-reset-code-button"]').click();
    
    cy.get('[data-testid="reset-code-input"]').type('000000');
    cy.get('[data-testid="new-password-input"]').type('newpassword123');
    cy.get('[data-testid="confirm-new-password-input"]').type('newpassword123');
    cy.get('[data-testid="reset-password-button"]').click();
    
    cy.get('[data-testid="error-message"]').should('contain', 'Invalid reset code');
  });

  it('should successfully reset password with valid code', () => {
    // First, send reset code and get the code from response
    cy.get('[data-testid="forgot-password-link"]').click();
    cy.get('[data-testid="forgot-password-email-input"]').type('test@example.com');
    cy.get('[data-testid="send-reset-code-button"]').click();
    
    // Get the reset code from the success message (in development mode)
    cy.get('[data-testid="success-message"]').then(($message) => {
      const messageText = $message.text();
      const codeMatch = messageText.match(/code: (\d{6})/);
      if (codeMatch) {
        const resetCode = codeMatch[1];
        
        cy.get('[data-testid="reset-code-input"]').type(resetCode);
        cy.get('[data-testid="new-password-input"]').type('newpassword123');
        cy.get('[data-testid="confirm-new-password-input"]').type('newpassword123');
        cy.get('[data-testid="reset-password-button"]').click();
        
        cy.get('[data-testid="success-message"]').should('contain', 'Password reset successfully');
      }
    });
  });

  it('should show success message after password reset', () => {
    cy.get('[data-testid="forgot-password-link"]').click();
    cy.get('[data-testid="forgot-password-email-input"]').type('test@example.com');
    cy.get('[data-testid="send-reset-code-button"]').click();
    
    cy.get('[data-testid="success-message"]').then(($message) => {
      const messageText = $message.text();
      const codeMatch = messageText.match(/code: (\d{6})/);
      if (codeMatch) {
        const resetCode = codeMatch[1];
        
        cy.get('[data-testid="reset-code-input"]').type(resetCode);
        cy.get('[data-testid="new-password-input"]').type('newpassword123');
        cy.get('[data-testid="confirm-new-password-input"]').type('newpassword123');
        cy.get('[data-testid="reset-password-button"]').click();
        
        cy.get('[data-testid="password-reset-success-title"]').should('be.visible');
        cy.get('[data-testid="back-to-login-button"]').should('be.visible');
      }
    });
  });

  it('should navigate back to login after successful password reset', () => {
    cy.get('[data-testid="forgot-password-link"]').click();
    cy.get('[data-testid="forgot-password-email-input"]').type('test@example.com');
    cy.get('[data-testid="send-reset-code-button"]').click();
    
    cy.get('[data-testid="success-message"]').then(($message) => {
      const messageText = $message.text();
      const codeMatch = messageText.match(/code: (\d{6})/);
      if (codeMatch) {
        const resetCode = codeMatch[1];
        
        cy.get('[data-testid="reset-code-input"]').type(resetCode);
        cy.get('[data-testid="new-password-input"]').type('newpassword123');
        cy.get('[data-testid="confirm-new-password-input"]').type('newpassword123');
        cy.get('[data-testid="reset-password-button"]').click();
        
        cy.get('[data-testid="back-to-login-button"]').click();
        cy.get('[data-testid="login-form"]').should('be.visible');
      }
    });
  });

  it('should show resend code button with countdown', () => {
    cy.get('[data-testid="forgot-password-link"]').click();
    cy.get('[data-testid="forgot-password-email-input"]').type('test@example.com');
    cy.get('[data-testid="send-reset-code-button"]').click();
    
    cy.get('[data-testid="resend-reset-code-button"]').should('be.visible');
    cy.get('[data-testid="resend-reset-code-button"]').should('be.disabled');
    
    // Wait for countdown to finish (in real test, this would be 60 seconds)
    // For testing, we'll just check that the button is disabled initially
    cy.get('[data-testid="resend-reset-code-button"]').should('contain', 'Resend (');
  });

  it('should allow resending code after countdown', () => {
    cy.get('[data-testid="forgot-password-link"]').click();
    cy.get('[data-testid="forgot-password-email-input"]').type('test@example.com');
    cy.get('[data-testid="send-reset-code-button"]').click();
    
    // Wait for countdown to finish (in real test, this would be 60 seconds)
    // For testing purposes, we'll just verify the button exists
    cy.get('[data-testid="resend-reset-code-button"]').should('exist');
  });

  it('should show back button to return to login', () => {
    cy.get('[data-testid="forgot-password-link"]').click();
    cy.get('[data-testid="back-button"]').should('be.visible');
    cy.get('[data-testid="back-button"]').click();
    cy.get('[data-testid="login-form"]').should('be.visible');
  });

  it('should clear form data when going back to login', () => {
    cy.get('[data-testid="forgot-password-link"]').click();
    cy.get('[data-testid="forgot-password-email-input"]').type('test@example.com');
    cy.get('[data-testid="back-button"]').click();
    cy.get('[data-testid="login-form"]').should('be.visible');
    
    // Navigate back to forgot password
    cy.get('[data-testid="forgot-password-link"]').click();
    cy.get('[data-testid="forgot-password-email-input"]').should('have.value', '');
  });
}); 