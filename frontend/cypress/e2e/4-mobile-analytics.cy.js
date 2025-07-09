/* eslint-env cypress */
/* global cy */
describe('Mobile Analytics Navigation', () => {
  let records;

  beforeEach(() => {
    // Set viewport to mobile size
    cy.viewport(375, 667);
    
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

  it('should navigate to analytics page from mobile menu', () => {
    // Open mobile menu
    cy.get('[aria-label="menu"]').click();
    
    // Click on analytics menu item
    cy.contains('Analytics').click();
    
    // Verify analytics page is displayed
    cy.contains('Analytics').should('be.visible');
    
    // Check for chart or summary regardless of record list
    cy.get('body').then(($body) => {
      if ($body.find('.recharts-wrapper').length > 0) {
        cy.get('.recharts-wrapper').should('be.visible');
      } else {
        cy.contains('No data available for analytics').should('be.visible');
      }
    });
  });

  it('should navigate to add record page from mobile menu', () => {
    // Navigate to analytics page
    cy.get('[aria-label="menu"]').click();
    cy.contains('Analytics').click();
    
    // Open hamburger menu (not language switcher) and click 'Add Record' menu item
    cy.get('[aria-label="menu"]').click();
    cy.get('[data-testid="add-record-menu-item"]').click();
    
    // Verify add record page is displayed
    cy.contains('Add New Record').should('be.visible');
    cy.get('input[name="level"]').should('be.visible');
  });

  it('should return to dashboard from mobile menu', () => {
    // Navigate to analytics page first
    cy.get('[aria-label="menu"]').click();
    cy.contains('Analytics').click();
    
    // Navigate back to dashboard
    cy.get('[aria-label="menu"]').click();
    cy.contains('Dashboard').click();
    
    // Verify dashboard is displayed
    cy.contains('Latest Reading').should('be.visible');
  });

  it('should display charts when data is available', () => {
    // Add a test record first
    cy.get('[aria-label="menu"]').click();
    cy.get('[data-testid="add-record-menu-item"]').click();
    cy.get('input[name="level"]').type('7.5');
    cy.get('textarea[name="notes"]').type('Test record for analytics');
    cy.get('form').submit();
    // Wait for form submission to complete and check for success message
    cy.get('[data-testid="success-message"]').should('be.visible');
    
    // Navigate to analytics page
    cy.get('[aria-label="menu"]').click();
    cy.contains('Analytics').click();
    
    // Verify charts are displayed
    cy.get('.recharts-wrapper').should('be.visible');
    cy.contains('Blood Sugar Trends').should('be.visible');
    cy.contains('Recent Readings').should('be.visible');
  });
}); 