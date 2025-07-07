/* global cy, Cypress */
/* eslint-env cypress */
describe('Mobile Analytics Navigation', () => {
  beforeEach(() => {
    // Set viewport to mobile size
    cy.viewport(375, 667);
    cy.loginAndEnsureEnglish('weiwangfly@hotmail.com', 'AsDfJkL123');
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