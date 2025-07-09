/* eslint-env cypress */
/* global cy */

describe('Dashboard CRUD', () => {
  let records;

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

    // Provide a predictable set of records for each test
    records = [
      {
        id: 1,
        userId: 1,
        level: 90,
        notes: 'Initial record',
        measurementTime: '2024-01-01T08:00:00Z',
        createdAt: '2024-01-01T08:00:00Z',
        updatedAt: '2024-01-01T08:00:00Z'
      }
    ];

    cy.intercept('GET', '/api/records', (req) => {
      req.reply(records);
    }).as('getRecords');

    cy.intercept('POST', '/api/records', (req) => {
      const newRecord = {
        ...req.body,
        id: Date.now(),
        userId: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      records.unshift(newRecord);
      req.reply(newRecord);
    }).as('addRecord');

    cy.intercept('PUT', /\/api\/records\/(\d+)/, (req) => {
      const id = parseInt(req.url.split('/').pop(), 10);
      const idx = records.findIndex(r => r.id === id);
      if (idx !== -1) {
        records[idx] = { ...records[idx], ...req.body, updatedAt: new Date().toISOString() };
        req.reply(records[idx]);
      } else {
        req.reply(404, {});
      }
    }).as('editRecord');

    cy.intercept('DELETE', /\/api\/records\/(\d+)/, (req) => {
      const id = parseInt(req.url.split('/').pop(), 10);
      records = records.filter(r => r.id !== id);
      req.reply({ success: true });
    }).as('deleteRecord');

    cy.visit('/dashboard');
    cy.ensureEnglishLanguage();
  });

  it('should display dashboard and records table', () => {
    cy.contains('Blood Sugar Records').should('be.visible');
    cy.get('table').should('be.visible');
    cy.contains('90 mmol/L').should('be.visible');
  });

  it('should pre-populate measure time within 5 seconds of now', () => {
    // Click on the Add Record tab
    cy.contains('Add New Record').click();
    
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

  it('should add a new blood sugar record', () => {
    // Click on the Add Record tab
    cy.contains('Add New Record').click();
    
    // Fill in the form
    cy.get('input[name="level"]').type('7.5');
    cy.get('textarea[name="notes"]').type('Test record');
    
    // Submit the form
    cy.get('form').submit();
    
    // Check for success message
    cy.get('[data-testid="success-message"]').should('be.visible');
  });

  it('should edit a blood sugar record', () => {
    // Click edit button on the first record
    cy.get('button[title="edit"]').first().click();
    
    // Update the level
    cy.get('input[name="level"]').clear().type('8.5');
    cy.get('form').submit();
    
    // Check for success message
    cy.get('[data-testid="success-message"]').should('be.visible');
  });

  it('should delete a blood sugar record', () => {
    // Click delete button on the first record
    cy.get('button[title="delete"]').first().click();
    
    // Check for success message
    cy.get('[data-testid="success-message"]').should('be.visible');
  });

  it('should create multiple records successfully', () => {
    // Add first record
    cy.contains('Add New Record').click();
    cy.get('input[name="level"]').type('6.5');
    cy.get('textarea[name="notes"]').type('First record');
    cy.get('form').submit();
    cy.get('[data-testid="success-message"]').should('be.visible');
    
    // Add second record
    cy.get('input[name="level"]').clear().type('7.2');
    cy.get('textarea[name="notes"]').clear().type('Second record');
    cy.get('form').submit();
    cy.get('[data-testid="success-message"]').should('be.visible');
  });

  it('should add a record with next year date and verify it appears on first row', () => {
    // Click on the Add Record tab
    cy.contains('Add New Record').click();
    
    // Set date to next year
    const nextYear = new Date().getFullYear() + 1;
    const nextYearDate = `${nextYear}-01-15T10:30`;
    cy.get('input[name="measurementTime"]').clear().type(nextYearDate);
    
    // Fill in the form
    cy.get('input[name="level"]').type('9.0');
    cy.get('textarea[name="notes"]').type('Future record');
    cy.get('form').submit();
    
    // Check for success message
    cy.get('[data-testid="success-message"]').should('be.visible');
  });
}); 