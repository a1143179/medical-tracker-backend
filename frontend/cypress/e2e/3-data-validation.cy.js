/* eslint-env cypress */
/* global cy */

describe('Data Validation', () => {
  let records;

  beforeEach(() => {
    const mockUserId = 1;
    cy.intercept('GET', '/api/auth/me', {
      statusCode: 200,
      body: {
        id: mockUserId,
        email: 'testuser@example.com',
        name: 'Test User',
        createdAt: '2024-01-01T00:00:00Z',
        isEmailVerified: true,
        languagePreference: 'en'
      }
    }).as('getUserInfo');

    // Provide a predictable set of records for each test
    records = [
      {
        id: 1,
        userId: mockUserId,
        level: 90,
        notes: 'Initial record',
        measurementTime: '2024-01-01T08:00:00Z',
        createdAt: '2024-01-01T08:00:00Z',
        updatedAt: '2024-01-01T08:00:00Z'
      }
    ];

    cy.intercept({
      method: 'GET',
      url: /\/api\/records(\?.*)?$/
    }, (req) => {
      req.reply(records);
    }).as('getRecords');

    cy.intercept({
      method: 'POST',
      url: /\/api\/records(\?.*)?$/
    }, (req) => {
      const newRecord = {
        ...req.body,
        id: Date.now(),
        userId: mockUserId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      records.unshift(newRecord);
      req.reply(newRecord);
    }).as('addRecord');

    cy.intercept({
      method: 'PUT',
      url: /\/api\/records\/\d+(\?.*)?$/
    }, (req) => {
      const id = parseInt(req.url.split('/').pop(), 10);
      const idx = records.findIndex(r => r.id === id);
      if (idx !== -1) {
        records[idx] = { ...records[idx], ...req.body, updatedAt: new Date().toISOString() };
        req.reply(records[idx]);
      } else {
        req.reply(404, {});
      }
    }).as('editRecord');

    cy.intercept({
      method: 'DELETE',
      url: /\/api\/records\/\d+(\?.*)?$/
    }, (req) => {
      const id = parseInt(req.url.split('/').pop(), 10);
      records = records.filter(r => r.id !== id);
      req.reply({ success: true });
    }).as('deleteRecord');

    cy.visit('/dashboard');
    cy.ensureEnglishLanguage();
  });

  it('should pre-populate measure time within 5 seconds of now', () => {
    const now = new Date();
    now.setSeconds(0, 0); // Round to nearest minute to match input
    cy.clock(now);
    cy.visit('/');
    cy.get('[data-testid="add-record-button"]').click();
    cy.get('input[name="measurementTime"]').invoke('val').then(val => {
      const inputDate = new Date(val);
      const diff = Math.abs(inputDate.getTime() - now.getTime());
      expect(diff).to.be.lessThan(5000);
    });
  });

  it('should validate blood sugar level range', () => {
    cy.get('[data-testid="add-record-button"]').click();
    // Test below minimum value
    cy.get('input[name="level"]').type('0.05');
    cy.get('textarea[name="notes"]').type('Test below minimum');
    cy.get('form').submit();
    cy.get('[data-testid="error-message"]').should('be.visible');
    // Test minimum value (should be valid)
    cy.get('input[name="level"]').clear().type('0.1');
    cy.get('form').submit();
    cy.get('[data-testid="success-message"]').should('be.visible');
    // Test above maximum value (should fail)
    cy.get('[data-testid="add-record-button"]').click();
    cy.get('input[name="level"]').type('1001');
    cy.get('textarea[name="notes"]').type('Test above maximum');
    cy.get('form').submit();
    cy.get('[data-testid="error-message"]').should('be.visible');
    // Test maximum value (should be valid)
    cy.get('input[name="level"]').clear().type('1000');
    cy.get('form').submit();
    cy.get('[data-testid="success-message"]').should('be.visible');
    // Test valid value in middle range
    cy.get('[data-testid="add-record-button"]').click();
    cy.get('input[name="level"]').type('75');
    cy.get('textarea[name="notes"]').type('Test middle range');
    cy.get('form').submit();
    cy.get('[data-testid="success-message"]').should('be.visible');
  });

  it('should validate blood sugar level format', () => {
    cy.get('[data-testid="add-record-button"]').click();
    // Test non-numeric input
    cy.get('input[name="level"]').type('abc');
    cy.get('textarea[name="notes"]').type('Test invalid format');
    cy.get('form').submit();
    cy.get('[data-testid="error-message"]').should('be.visible');
    // Test decimal values
    cy.get('input[name="level"]').clear().type('85.5');
    cy.get('form').submit();
    cy.get('[data-testid="success-message"]').should('be.visible');
  });

  it('should validate notes length', () => {
    cy.get('[data-testid="add-record-button"]').click();
    cy.get('input[name="level"]').type('85');
    // Test maximum allowed length (1000 chars) - should pass
    const baseNotes = 'a'.repeat(999);
    cy.get('textarea[name="notes"]').clear().invoke('val', baseNotes).trigger('input');
    cy.get('textarea[name="notes"]').type('a'); // Add 1000th character
    cy.get('form').submit();
    cy.get('[data-testid="success-message"]').should('be.visible');
    // Test over limit (1001 chars) - should fail
    cy.get('[data-testid="add-record-button"]').click();
    cy.get('input[name="level"]').type('85');
    const baseNotes2 = 'a'.repeat(1000);
    cy.get('textarea[name="notes"]').clear().invoke('val', baseNotes2).trigger('input');
    cy.get('textarea[name="notes"]').type('a'); // Add 1001st character
    cy.get('form').submit();
    cy.get('[data-testid="error-message"]').should('be.visible');
    cy.get('[data-testid="error-message"]').find('button').click(); // Close error message
    cy.contains('button', 'Cancel').click(); // Close the add record dialog
    // Test realistic medical notes
    cy.get('[data-testid="add-record-button"]').click();
    cy.get('input[name="level"]').type('85');
    const realisticNotes = 'Blood sugar reading taken after breakfast. Feeling slightly dizzy. Will monitor closely.';
    cy.get('textarea[name="notes"]').clear().type(realisticNotes);
    cy.get('form').submit();
    cy.get('[data-testid="success-message"]').should('be.visible');
  });

  it('should handle empty required fields', () => {
    cy.get('[data-testid="add-record-button"]').click();
    // Submit without level
    cy.get('textarea[name="notes"]').type('Test empty level');
    cy.get('form').submit();
    cy.get('[data-testid="error-message"]').should('be.visible');
    // Submit with only level
    cy.get('input[name="level"]').type('85');
    cy.get('textarea[name="notes"]').clear();
    cy.get('form').submit();
    cy.get('[data-testid="success-message"]').should('be.visible');
  });

  it('should handle special characters in notes', () => {
    const uniqueNote = `Test with special chars: !@#$%^&*() ${Date.now()}`;
    cy.get('[data-testid="add-record-button"]').click();
    cy.get('input[name="level"]').type('85');
    // Test special characters
    cy.get('textarea[name="notes"]').type(uniqueNote);
    cy.get('form').submit();
    cy.get('[data-testid="success-message"]').should('be.visible');
    // Verify that a record was created with the unique note
    cy.get('[data-testid="blood-sugar-records"]').should('contain', uniqueNote);
  });
}); 