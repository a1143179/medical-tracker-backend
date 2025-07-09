/* global Cypress, cy */
/* eslint-env cypress */
import { formatLocalDateForInput } from '../support/commands';

describe('Dashboard CRUD', () => {
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

    cy.visit('/dashboard');
    cy.ensureEnglishLanguage();
  });

  it('should display dashboard and records table', () => {
    cy.get('[data-testid="blood-sugar-records"]').should('be.visible');
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
    // Records are ordered by measurement time descending (newest first)
    // So first() will be the most recent record
    cy.get('[data-testid="blood-sugar-records"] tr').first().within(() => {
      cy.get('button[title="delete"]').click();
    });
    cy.on('window:confirm', () => true);
    cy.get('[data-testid="success-message"]').should('be.visible');
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