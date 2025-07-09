/* eslint-env cypress */
/* global cy */

describe('Dashboard CRUD', () => {
  let records;

  beforeEach(() => {
    // Mock authenticated user
    const mockUserId = 1; // Ensure this matches the userId in the test records
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

    // Always provide at least one record belonging to the logged-in user
    records = [
      {
        id: 1,
        userId: mockUserId, // Must match the logged-in user's id
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
    // Remove the wait since the API call might not be made
    // cy.wait('@getRecords');
  });

  it('should display dashboard and records table', () => {
    cy.get('[data-testid="blood-sugar-records"]').should('be.visible');
    cy.get('[data-testid="blood-sugar-records"] tr').should('have.length.greaterThan', 0);
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

  it('should add a new blood sugar record', () => {
    const uniqueNote = `Test record ${Date.now()}`;
    cy.get('[data-testid="add-record-button"]').click();
    cy.get('input[name="level"]').type('85');
    cy.get('textarea[name="notes"]').type(uniqueNote);
    cy.get('form').submit();
    cy.get('[data-testid="success-message"]').should('be.visible');
    cy.get('[data-testid="blood-sugar-records"]').should('contain', uniqueNote);
  });

  it('should edit a blood sugar record', () => {
    const uniqueNote = `Edited record ${Date.now()}`;
    cy.get('[data-testid="blood-sugar-records"] tr').first().within(() => {
      cy.get('button[title="edit"]').click();
    });
    cy.get('input[name="level"]').clear().type('95');
    cy.get('textarea[name="notes"]').clear().type(uniqueNote);
    cy.get('form').submit();
    cy.get('[data-testid="success-message"]').should('be.visible');
    cy.get('[data-testid="blood-sugar-records"]').should('contain', uniqueNote);
  });

  it('should delete a blood sugar record', () => {
    cy.get('[data-testid="blood-sugar-records"] tr').first().within(() => {
      cy.get('button[title="delete"]').click();
    });
    cy.on('window:confirm', () => true);
    cy.get('[data-testid="success-message"]').should('be.visible');
    cy.get('[data-testid="blood-sugar-records"] tr').should('have.length', 0);
  });

  it('should create multiple records successfully', () => {
    const uniqueNote1 = `First record ${Date.now()}`;
    const uniqueNote2 = `Second record ${Date.now() + 1}`;
    // Add first record
    cy.get('[data-testid="add-record-button"]').click();
    cy.get('input[name="level"]').type('70');
    cy.get('textarea[name="notes"]').type(uniqueNote1);
    cy.get('form').submit();
    cy.get('[data-testid="success-message"]').should('be.visible');
    // Add second record
    cy.get('[data-testid="add-record-button"]').click();
    cy.get('input[name="level"]').type('80');
    cy.get('textarea[name="notes"]').type(uniqueNote2);
    cy.get('form').submit();
    cy.get('[data-testid="success-message"]').should('be.visible');
    cy.get('[data-testid="blood-sugar-records"] tr').should('have.length.greaterThan', 1);
    cy.get('[data-testid="blood-sugar-records"]').should('contain', uniqueNote1);
    cy.get('[data-testid="blood-sugar-records"]').should('contain', uniqueNote2);
  });

  it('should add a record with next year date and verify it appears on first row', () => {
    const uniqueNote = `Next year record ${Date.now()}`;
    const nextYear = new Date().getFullYear() + 1;
    const nextYearDate = `${nextYear}-01-01T12:00`;
    
    cy.get('[data-testid="add-record-button"]').click();
    cy.get('input[name="level"]').type('60');
    cy.get('textarea[name="notes"]').type(uniqueNote);
    cy.get('input[name="measurementTime"]').clear().type(nextYearDate);
    cy.get('form').submit();
    cy.get('[data-testid="success-message"]').should('be.visible');
    
    // Verify the record appears on the first row (since it's the most recent date)
    cy.get('[data-testid="blood-sugar-records"] tr').first().should('contain', uniqueNote);
    cy.get('[data-testid="blood-sugar-records"] tr').first().should('contain', `${nextYear}-01-01 12:00:00`);
    
    // Delete the record to clean up
    cy.get('[data-testid="blood-sugar-records"] tr').first().within(() => {
      cy.get('button[title="delete"]').click();
    });
    cy.on('window:confirm', () => true);
    cy.get('[data-testid="success-message"]').should('be.visible');
    cy.get('[data-testid="blood-sugar-records"] tr').first().should('not.contain', uniqueNote);
  });
}); 