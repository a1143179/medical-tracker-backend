describe('Login Page', () => {
  beforeEach(() => {
    cy.visit('/login')
  })

  it('should display login form', () => {
    cy.get('input[name="email"]').should('be.visible')
    cy.get('input[name="password"]').should('be.visible')
    cy.get('button[type="submit"]').should('be.visible')
  })

  it('should show error for invalid credentials', () => {
    cy.get('input[name="email"]').type('invalid@example.com')
    cy.get('input[name="password"]').type('wrongpassword')
    cy.get('form').submit()
    
    cy.get('[data-testid="error-message"]').should('be.visible')
    cy.url().should('include', '/login')
  })

  it('should show validation errors for empty fields', () => {
    cy.get('form').submit()
    
    // Check for required field validation
    cy.get('input[name="email"]').should('have.attr', 'required')
    cy.get('input[name="password"]').should('have.attr', 'required')
  })

  it('should have remember me checkbox', () => {
    cy.get('input[type="checkbox"]').should('be.visible')
  })

  it('should have language selector', () => {
    cy.get('[data-testid="language-selector"]').should('be.visible')
  })

  it('should switch between login and register tabs', () => {
    // Check login tab is active by default
    cy.get('[role="tab"]').first().should('have.attr', 'aria-selected', 'true')
    
    // Click register tab
    cy.get('[role="tab"]').last().click()
    cy.get('[role="tab"]').last().should('have.attr', 'aria-selected', 'true')
  })

  it('should redirect authenticated users to dashboard', () => {
    // This test assumes you have a test user set up
    // You might need to create a test user in your database first
    cy.login('test@example.com', 'password123')
    cy.url().should('include', '/dashboard')
  })
}) 