// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Custom command to login with test credentials
Cypress.Commands.add('login', (email = 'test@example.com', password = 'password123') => {
  cy.visit('/login')
  cy.get('input[name="email"]').type(email)
  cy.get('input[name="password"]').type(password)
  cy.get('form').submit()
  cy.url().should('include', '/dashboard')
})

// Custom command to logout
Cypress.Commands.add('logout', () => {
  cy.get('[data-testid="profile-menu"]').click()
  cy.get('[data-testid="logout-button"]').click()
  cy.url().should('include', '/login')
})

// Custom command to add a blood sugar record
Cypress.Commands.add('addBloodSugarRecord', (level = 120, notes = 'Test record') => {
  cy.get('[data-testid="add-record-button"]').click()
  cy.get('input[name="level"]').type(level)
  cy.get('input[name="notes"]').type(notes)
  cy.get('form').submit()
  cy.get('[data-testid="success-message"]').should('be.visible')
})

// Custom command to switch language
Cypress.Commands.add('switchLanguage', (language) => {
  cy.get('[data-testid="language-selector"]').click()
  cy.get(`[data-value="${language}"]`).click()
})

// Custom command to check if element is visible and clickable
Cypress.Commands.add('shouldBeVisibleAndClickable', (selector) => {
  cy.get(selector).should('be.visible').should('not.be.disabled')
})

// Custom command to wait for API response
Cypress.Commands.add('waitForApi', (method, url, alias) => {
  cy.intercept(method, url).as(alias)
  cy.wait(`@${alias}`)
})

// Override visit command to handle authentication
Cypress.Commands.overwrite('visit', (originalFn, url, options) => {
  // Clear any existing session
  cy.clearCookies()
  cy.clearLocalStorage()
  
  return originalFn(url, options)
}) 