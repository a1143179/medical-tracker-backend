describe('Dashboard', () => {
  beforeEach(() => {
    // Login before each test
    cy.login('weiwangfly@hotmail.com', 'test123')
  })

  it('should display dashboard after login', () => {
    cy.url().should('include', '/dashboard')
    cy.get('[data-testid="dashboard-title"]').should('be.visible')
  })

  it('should display blood sugar records', () => {
    cy.get('[data-testid="blood-sugar-records"]').should('be.visible')
  })

  it('should have add record functionality', () => {
    cy.get('[data-testid="add-record-button"]').should('be.visible')
  })

  it('should add a new blood sugar record', () => {
    const testLevel = 125
    const testNotes = 'Cypress test record'
    
    cy.get('[data-testid="add-record-button"]').click()
    cy.get('input[name="level"]').type(testLevel)
    cy.get('input[name="notes"]').type(testNotes)
    cy.get('form').submit()
    
    // Verify the record was added
    cy.get('[data-testid="blood-sugar-records"]').should('contain', testLevel)
    cy.get('[data-testid="blood-sugar-records"]').should('contain', testNotes)
  })

  it('should display charts and statistics', () => {
    cy.get('[data-testid="blood-sugar-chart"]').should('be.visible')
    cy.get('[data-testid="statistics-panel"]').should('be.visible')
  })

  it('should have responsive design on mobile', () => {
    cy.viewport('iphone-x')
    cy.get('[data-testid="mobile-menu-button"]').should('be.visible')
    cy.get('[data-testid="mobile-menu-button"]').click()
    cy.get('[data-testid="mobile-sidebar"]').should('be.visible')
  })

  it('should allow language switching', () => {
    cy.get('[data-testid="language-selector"]').should('be.visible')
    cy.switchLanguage('zh')
    // Verify some text changed to Chinese
    cy.get('[data-testid="dashboard-title"]').should('contain', '仪表盘')
  })

  it('should have logout functionality', () => {
    cy.get('[data-testid="profile-menu"]').click()
    cy.get('[data-testid="logout-button"]').should('be.visible')
    cy.get('[data-testid="logout-button"]').click()
    cy.url().should('include', '/login')
  })

  it('should handle navigation between sections', () => {
    cy.get('[data-testid="navigation-menu"]').should('be.visible')
    // Test navigation to different sections if they exist
    cy.get('[data-testid="navigation-menu"]').within(() => {
      cy.get('a').first().click()
    })
  })

  it('should display user information', () => {
    cy.get('[data-testid="user-email"]').should('be.visible')
    cy.get('[data-testid="user-email"]').should('contain', 'weiwangfly@hotmail.com')
  })
}) 