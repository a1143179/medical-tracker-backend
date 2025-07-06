describe('Registration', () => {
  beforeEach(() => {
    cy.visit('/login')
    // Switch to registration tab
    cy.get('[role="tab"]').last().click()
  })

  it('should display registration form', () => {
    cy.get('input[name="email"]').should('be.visible')
    cy.get('input[name="password"]').should('be.visible')
    cy.get('input[name="confirmPassword"]').should('be.visible')
  })

  it('should show registration stepper', () => {
    cy.get('[data-testid="registration-stepper"]').should('be.visible')
    cy.get('[data-testid="registration-step-0"]').should('have.class', 'Mui-active')
  })

  it('should validate email format', () => {
    cy.get('input[name="email"]').type('invalid-email')
    cy.get('form').submit()
    
    // Should show validation error
    cy.get('[data-testid="error-message"]').should('be.visible')
  })

  it('should validate password confirmation', () => {
    cy.get('input[name="email"]').type('test@example.com')
    cy.get('input[name="password"]').type('password123')
    cy.get('input[name="confirmPassword"]').type('differentpassword')
    cy.get('form').submit()
    
    cy.get('[data-testid="error-message"]').should('be.visible')
    cy.get('[data-testid="error-message"]').should('contain', 'Passwords do not match')
  })

  it('should validate password length', () => {
    cy.get('input[name="email"]').type('test@example.com')
    cy.get('input[name="password"]').type('123')
    cy.get('input[name="confirmPassword"]').type('123')
    cy.get('form').submit()
    
    cy.get('[data-testid="error-message"]').should('be.visible')
    cy.get('[data-testid="error-message"]').should('contain', 'at least 6 characters')
  })

  it('should send verification code', () => {
    cy.get('input[name="email"]').type('newuser@example.com')
    cy.get('[data-testid="send-verification-button"]').click()
    
    // Should move to verification step
    cy.get('[data-testid="registration-step-1"]').should('have.class', 'Mui-active')
    cy.get('[data-testid="verification-code-input"]').should('be.visible')
  })

  it('should verify email with code', () => {
    // First send verification code
    cy.get('input[name="email"]').type('newuser@example.com')
    cy.get('[data-testid="send-verification-button"]').click()
    
    // Enter verification code (in development, this might be shown in the response)
    cy.get('[data-testid="verification-code-input"]').type('123456')
    cy.get('[data-testid="verify-code-button"]').click()
    
    // Should move to password step
    cy.get('[data-testid="registration-step-2"]').should('have.class', 'Mui-active')
  })

  it('should complete registration process', () => {
    // This is a comprehensive test that goes through the entire registration flow
    const testEmail = `test${Date.now()}@example.com`
    
    // Step 1: Enter email
    cy.get('input[name="email"]').type(testEmail)
    cy.get('[data-testid="send-verification-button"]').click()
    
    // Step 2: Verify email (assuming code is 123456 in development)
    cy.get('[data-testid="verification-code-input"]').type('123456')
    cy.get('[data-testid="verify-code-button"]').click()
    
    // Step 3: Set password
    cy.get('input[name="password"]').type('password123')
    cy.get('input[name="confirmPassword"]').type('password123')
    cy.get('form').submit()
    
    // Should show success message and switch to login tab
    cy.get('[data-testid="success-message"]').should('be.visible')
    cy.get('[role="tab"]').first().should('have.attr', 'aria-selected', 'true')
  })

  it('should handle resend verification code', () => {
    cy.get('input[name="email"]').type('test@example.com')
    cy.get('[data-testid="send-verification-button"]').click()
    
    // Wait for countdown to finish
    cy.get('[data-testid="resend-button"]').should('be.disabled')
    cy.wait(60000) // Wait for 60 seconds (countdown)
    cy.get('[data-testid="resend-button"]').should('not.be.disabled')
    
    cy.get('[data-testid="resend-button"]').click()
    cy.get('[data-testid="success-message"]').should('be.visible')
  })

  it('should show error for existing email', () => {
    cy.get('input[name="email"]').type('existing@example.com')
    cy.get('[data-testid="send-verification-button"]').click()
    
    cy.get('[data-testid="error-message"]').should('be.visible')
    cy.get('[data-testid="error-message"]').should('contain', 'already exists')
  })
}) 