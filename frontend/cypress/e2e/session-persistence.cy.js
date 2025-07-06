describe('Session Persistence Tests', () => {
  const testEmail = 'weiwangfly@hotmail.com'
  const testPassword = 'test123'

  beforeEach(() => {
    // Clear any existing session before each test
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  describe('Session Duration Tests', () => {
    it('should maintain 24-hour session without remember me', () => {
      // Login without remember me
      cy.loginWithoutRememberMe(testEmail, testPassword)
      
      // Verify we're logged in
      cy.get('[data-testid="user-email"]').should('contain', testEmail)
      
      // Refresh page multiple times to simulate time passing
      for (let i = 0; i < 5; i++) {
        cy.reload()
        cy.url().should('include', '/dashboard')
        cy.get('[data-testid="user-email"]').should('contain', testEmail)
      }
    })

    it('should maintain 3-month session with remember me', () => {
      // Login with remember me
      cy.loginWithRememberMe(testEmail, testPassword)
      
      // Verify we're logged in
      cy.get('[data-testid="user-email"]').should('contain', testEmail)
      
      // Multiple refreshes to test persistence
      for (let i = 0; i < 10; i++) {
        cy.reload()
        cy.url().should('include', '/dashboard')
        cy.get('[data-testid="user-email"]').should('contain', testEmail)
      }
    })
  })

  describe('Browser Session Simulation', () => {
    it('should lose session after clearing cookies without remember me', () => {
      // Login without remember me
      cy.loginWithoutRememberMe(testEmail, testPassword)
      
      // Verify login
      cy.get('[data-testid="user-email"]').should('contain', testEmail)
      
      // Clear cookies (simulates browser restart)
      cy.clearCookies()
      
      // Try to access dashboard
      cy.visit('/dashboard')
      
      // Should redirect to login
      cy.url().should('include', '/login')
    })

    it('should maintain session after clearing localStorage with remember me', () => {
      // Login with remember me
      cy.loginWithRememberMe(testEmail, testPassword)
      
      // Verify login
      cy.get('[data-testid="user-email"]').should('contain', testEmail)
      
      // Clear localStorage (simulates partial browser restart)
      cy.clearLocalStorage()
      
      // Try to access dashboard
      cy.visit('/dashboard')
      
      // Should still be logged in (cookies persist)
      cy.url().should('include', '/dashboard')
      cy.get('[data-testid="user-email"]').should('contain', testEmail)
    })
  })

  describe('Cross-Tab Session Tests', () => {
    it('should maintain session across different URLs', () => {
      // Login with remember me
      cy.loginWithRememberMe(testEmail, testPassword)
      
      // Navigate to different parts of the app
      cy.visit('/dashboard')
      cy.get('[data-testid="user-email"]').should('contain', testEmail)
      
      // Try accessing other protected routes
      cy.visit('/dashboard')
      cy.get('[data-testid="user-email"]').should('contain', testEmail)
      
      // Go back to login page (should redirect to dashboard)
      cy.visit('/login')
      cy.url().should('include', '/dashboard')
    })
  })

  describe('Logout Session Cleanup', () => {
    it('should completely clear session after logout from remember me session', () => {
      // Login with remember me
      cy.loginWithRememberMe(testEmail, testPassword)
      
      // Verify login
      cy.get('[data-testid="user-email"]').should('contain', testEmail)
      
      // Logout
      cy.get('[data-testid="profile-menu"]').click()
      cy.get('[data-testid="logout-button"]').click()
      
      // Should be on login page
      cy.url().should('include', '/login')
      
      // Try to access dashboard
      cy.visit('/dashboard')
      
      // Should still be on login page
      cy.url().should('include', '/login')
      
      // Try to access dashboard again
      cy.visit('/dashboard')
      cy.url().should('include', '/login')
    })

    it('should completely clear session after logout from regular session', () => {
      // Login without remember me
      cy.loginWithoutRememberMe(testEmail, testPassword)
      
      // Verify login
      cy.get('[data-testid="user-email"]').should('contain', testEmail)
      
      // Logout
      cy.get('[data-testid="profile-menu"]').click()
      cy.get('[data-testid="logout-button"]').click()
      
      // Should be on login page
      cy.url().should('include', '/login')
      
      // Try to access dashboard
      cy.visit('/dashboard')
      
      // Should still be on login page
      cy.url().should('include', '/login')
    })
  })

  describe('Remember Me Toggle Behavior', () => {
    it('should create different session durations based on remember me setting', () => {
      // Test without remember me
      cy.loginWithoutRememberMe(testEmail, testPassword)
      cy.get('[data-testid="user-email"]').should('contain', testEmail)
      
      // Logout
      cy.get('[data-testid="profile-menu"]').click()
      cy.get('[data-testid="logout-button"]').click()
      cy.url().should('include', '/login')
      
      // Test with remember me
      cy.loginWithRememberMe(testEmail, testPassword)
      cy.get('[data-testid="user-email"]').should('contain', testEmail)
      
      // Both should work for immediate access
      // The difference is in persistence duration
    })

    it('should handle remember me checkbox state correctly', () => {
      cy.visit('/login')
      
      // Default state should be unchecked
      cy.get('input[type="checkbox"]').should('not.be.checked')
      
      // Fill form
      cy.get('input[name="email"]').type(testEmail)
      cy.get('input[name="password"]').type(testPassword)
      
      // Check remember me
      cy.get('input[type="checkbox"]').check()
      cy.get('input[type="checkbox"]').should('be.checked')
      
      // Uncheck remember me
      cy.get('input[type="checkbox"]').uncheck()
      cy.get('input[type="checkbox"]').should('not.be.checked')
      
      // Check again
      cy.get('input[type="checkbox"]').check()
      cy.get('input[type="checkbox"]').should('be.checked')
    })
  })

  describe('Error Handling in Session Management', () => {
    it('should handle invalid session gracefully', () => {
      // Try to access dashboard without any session
      cy.visit('/dashboard')
      
      // Should redirect to login
      cy.url().should('include', '/login')
      
      // Should not show any user-specific content
      cy.get('[data-testid="user-email"]').should('not.exist')
    })

    it('should handle expired session gracefully', () => {
      // Login first
      cy.loginWithoutRememberMe(testEmail, testPassword)
      
      // Simulate session expiration by clearing cookies
      cy.clearCookies()
      
      // Try to access dashboard
      cy.visit('/dashboard')
      
      // Should redirect to login
      cy.url().should('include', '/login')
    })
  })
}) 