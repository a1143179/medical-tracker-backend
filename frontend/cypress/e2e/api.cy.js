describe('API Integration', () => {
  beforeEach(() => {
    // Intercept API calls to avoid actual network requests during tests
    cy.intercept('POST', '/api/auth/login', { fixture: 'login-success.json' }).as('login')
    cy.intercept('GET', '/api/records*', { fixture: 'blood-sugar-records.json' }).as('getRecords')
    cy.intercept('POST', '/api/records*', { fixture: 'add-record-success.json' }).as('addRecord')
    cy.intercept('POST', '/api/auth/send-verification', { fixture: 'verification-sent.json' }).as('sendVerification')
  })

  it('should handle login API call', () => {
    cy.visit('/login')
    cy.get('input[name="email"]').type('test@example.com')
    cy.get('input[name="password"]').type('password123')
    cy.get('form').submit()
    
    cy.wait('@login')
    cy.url().should('include', '/dashboard')
  })

  it('should load blood sugar records from API', () => {
    cy.login('test@example.com', 'password123')
    
    cy.wait('@getRecords')
    cy.get('[data-testid="blood-sugar-records"]').should('be.visible')
  })

  it('should add new blood sugar record via API', () => {
    cy.login('test@example.com', 'password123')
    
    cy.get('[data-testid="add-record-button"]').click()
    cy.get('input[name="level"]').type('130')
    cy.get('input[name="notes"]').type('Test record from Cypress')
    cy.get('form').submit()
    
    cy.wait('@addRecord')
    cy.get('[data-testid="success-message"]').should('be.visible')
  })

  it('should handle API errors gracefully', () => {
    // Intercept with error response
    cy.intercept('POST', '/api/auth/login', {
      statusCode: 400,
      body: { message: 'Invalid email or password' }
    }).as('loginError')
    
    cy.visit('/login')
    cy.get('input[name="email"]').type('invalid@example.com')
    cy.get('input[name="password"]').type('wrongpassword')
    cy.get('form').submit()
    
    cy.wait('@loginError')
    cy.get('[data-testid="error-message"]').should('be.visible')
    cy.get('[data-testid="error-message"]').should('contain', 'Invalid email or password')
  })

  it('should handle network errors', () => {
    // Intercept with network error
    cy.intercept('POST', '/api/auth/login', { forceNetworkError: true }).as('networkError')
    
    cy.visit('/login')
    cy.get('input[name="email"]').type('test@example.com')
    cy.get('input[name="password"]').type('password123')
    cy.get('form').submit()
    
    cy.wait('@networkError')
    cy.get('[data-testid="error-message"]').should('be.visible')
  })

  it('should send verification code via API', () => {
    cy.visit('/login')
    cy.get('[role="tab"]').last().click() // Switch to registration
    
    cy.get('input[name="email"]').type('newuser@example.com')
    cy.get('[data-testid="send-verification-button"]').click()
    
    cy.wait('@sendVerification')
    cy.get('[data-testid="success-message"]').should('be.visible')
  })

  it('should handle loading states', () => {
    // Intercept with delay to test loading states
    cy.intercept('POST', '/api/auth/login', (req) => {
      req.reply({ delay: 2000, fixture: 'login-success.json' })
    }).as('loginWithDelay')
    
    cy.visit('/login')
    cy.get('input[name="email"]').type('test@example.com')
    cy.get('input[name="password"]').type('password123')
    cy.get('form').submit()
    
    // Should show loading state
    cy.get('[data-testid="loading-indicator"]').should('be.visible')
    
    cy.wait('@loginWithDelay')
    cy.get('[data-testid="loading-indicator"]').should('not.exist')
  })

  it('should validate API responses', () => {
    cy.intercept('POST', '/api/auth/login', (req) => {
      // Validate request body
      expect(req.body).to.have.property('email')
      expect(req.body).to.have.property('password')
      expect(req.body).to.have.property('rememberMe')
      
      req.reply({ fixture: 'login-success.json' })
    }).as('loginWithValidation')
    
    cy.visit('/login')
    cy.get('input[name="email"]').type('test@example.com')
    cy.get('input[name="password"]').type('password123')
    cy.get('input[type="checkbox"]').check() // Remember me
    cy.get('form').submit()
    
    cy.wait('@loginWithValidation')
  })
}) 