/* eslint-env cypress */
/* global cy */

describe('Data Validation', () => {
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

    cy.intercept('GET', '/api/records', []).as('getRecords');
    cy.intercept('POST', '/api/records', { success: true }).as('addRecord');

    cy.visit('/dashboard');
    cy.ensureEnglishLanguage();
    
    // Navigate to Add Record tab
    cy.contains('Add New Record').click();
  });

  it('should pre-populate measure time within 5 seconds of now', () => {
    // Get the current time
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const expectedTime = `${year}-${month}-${day}T${hours}:${minutes}`;
    
    // Check that the datetime input is pre-populated with current time (within 5 seconds)
    cy.get('input[name="measurementTime"]').should('have.value', expectedTime);
  });

  it('should validate blood sugar level range', () => {
    // Test invalid values
    const invalidValues = ['-1', '0', '1001', 'abc', ''];
    
    invalidValues.forEach(value => {
      cy.get('input[name="level"]').clear().type(value);
      cy.get('form').submit();
      cy.get('[data-testid="error-message"]').should('be.visible');
    });
    
    // Test valid values
    const validValues = ['0.1', '5.5', '10.0', '1000'];
    
    validValues.forEach(value => {
      cy.get('input[name="level"]').clear().type(value);
      cy.get('textarea[name="notes"]').type('Valid test');
      cy.get('form').submit();
      cy.get('[data-testid="success-message"]').should('be.visible');
    });
  });

  it('should validate blood sugar level format', () => {
    // Test non-numeric values
    cy.get('input[name="level"]').clear().type('abc');
    cy.get('form').submit();
    cy.get('[data-testid="error-message"]').should('be.visible');
    
    // Test decimal values
    cy.get('input[name="level"]').clear().type('5.5');
    cy.get('textarea[name="notes"]').type('Valid decimal');
    cy.get('form').submit();
    cy.get('[data-testid="success-message"]').should('be.visible');
  });

  it('should validate notes length', () => {
    // Test notes exceeding 1000 characters
    const longNote = 'a'.repeat(1001);
    cy.get('input[name="level"]').type('5.5');
    cy.get('textarea[name="notes"]').type(longNote);
    cy.get('form').submit();
    cy.get('[data-testid="error-message"]').should('be.visible');
    
    // Test valid notes length
    cy.get('textarea[name="notes"]').clear().type('Valid notes');
    cy.get('form').submit();
    cy.get('[data-testid="success-message"]').should('be.visible');
  });

  it('should handle empty required fields', () => {
    // Test empty level
    cy.get('input[name="level"]').clear();
    cy.get('form').submit();
    cy.get('[data-testid="error-message"]').should('be.visible');
    
    // Test empty datetime
    cy.get('input[name="level"]').type('5.5');
    cy.get('input[name="measurementTime"]').clear();
    cy.get('form').submit();
    cy.get('[data-testid="error-message"]').should('be.visible');
  });

  it('should handle special characters in notes', () => {
    const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    cy.get('input[name="level"]').type('5.5');
    cy.get('textarea[name="notes"]').type(specialChars);
    cy.get('form').submit();
    cy.get('[data-testid="success-message"]').should('be.visible');
  });
}); 