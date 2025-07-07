/* global cy, Cypress */
/* eslint-env cypress */
describe('Registration Flow', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.ensureEnglishLanguage();
    cy.get('button[role="tab"]').eq(1).click();
  });

  function uniqueEmail() {
    const ts = Date.now();
    return `a1143179+${ts}@gmail.com`;
  }

  it('should register a new user', () => {
    const email = uniqueEmail();
    cy.intercept('POST', '/api/auth/send-verification', {
      statusCode: 200,
      body: { message: 'Verification code sent', code: '123456' }
    }).as('sendVerificationCode');
    cy.intercept('POST', '/api/auth/verify-code', {
      statusCode: 200,
      body: { message: 'Email verified successfully' }
    }).as('verifyCode');
    cy.get('input[name="email"]').type(email);
    cy.contains('Send Verification Code').click();
    cy.wait('@sendVerificationCode');
    cy.get('input[type="text"]').should('be.visible').type('123456');
    cy.contains('Verify Code').click();
    cy.wait('@verifyCode');
    cy.get('input[name="password"]').should('be.visible').type('TestPassword123');
    cy.get('input[name="confirmPassword"]').should('be.visible').type('TestPassword123');
    cy.get('form').submit();
    cy.url().should('include', '/login');
    cy.get('button[role="tab"]').eq(0).click();
    cy.get('input[name="email"]').should('be.visible').clear().type(email);
    cy.get('input[name="password"]').should('be.visible').clear().type('TestPassword123');
    cy.get('form').submit();
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="add-record-button"]').should('be.visible');
  });

  it('should show error for mismatched passwords', () => {
    const email = uniqueEmail();
    cy.intercept('POST', '/api/auth/send-verification', {
      statusCode: 200,
      body: { message: 'Verification code sent', code: '123456' }
    }).as('sendVerificationCode');
    cy.intercept('POST', '/api/auth/verify-code', {
      statusCode: 200,
      body: { message: 'Email verified successfully' }
    }).as('verifyCode');
    cy.get('input[name="email"]').type(email);
    cy.contains('Send Verification Code').click();
    cy.wait('@sendVerificationCode');
    cy.get('input[type="text"]').should('be.visible').type('123456');
    cy.contains('Verify Code').click();
    cy.wait('@verifyCode');
    cy.get('input[name="password"]').should('be.visible').type('TestPassword123');
    cy.get('input[name="confirmPassword"]').should('be.visible').type('WrongPassword');
    cy.get('form').submit();
    cy.get('[data-testid="error-message"]').should('be.visible');
  });

  it('should show error for existing email', () => {
    cy.intercept('POST', '/api/auth/send-verification', {
      statusCode: 200,
      body: { message: 'Verification code sent', code: '123456' }
    }).as('sendVerificationCode');
    cy.intercept('POST', '/api/auth/verify-code', {
      statusCode: 400,
      body: { message: 'User with this email already exists' }
    }).as('verifyCode');
    cy.get('input[name="email"]').type('weiwangfly@hotmail.com');
    cy.contains('Send Verification Code').click();
    cy.wait('@sendVerificationCode');
    cy.get('input[type="text"]').should('be.visible').type('123456');
    cy.contains('Verify Code').click();
    cy.wait('@verifyCode');
    cy.get('[data-testid="error-message"]').should('be.visible').and('contain', 'already exists');
  });
}); 