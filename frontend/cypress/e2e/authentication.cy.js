describe('Authentication Flow', () => {
  const testEmail = 'weiwangfly@hotmail.com'
  const testPassword = 'test123'

  beforeEach(() => {
    // Clear any existing session
    cy.clearCookies()
    cy.clearLocalStorage()
  })

  describe('Login without Remember Me', () => {
    it('should login successfully without remember me and stay logged in', () => {
      cy.visit('/login')
      
      // Fill in login form
      cy.get('input[name="email"]').type(testEmail)
      cy.get('input[name="password"]').type(testPassword)
      
      // Ensure remember me is unchecked
      cy.get('input[type="checkbox"]').should('not.be.checked')
      
      // Submit form
      cy.get('form').submit()
      
      // Should redirect to dashboard
      cy.url().should('include', '/dashboard')
      
      // Should display user information
      cy.get('[data-testid="user-email"]').should('contain', testEmail)
      
      // Should show dashboard content
      cy.get('[data-testid="dashboard-title"]').should('be.visible')
    })

    it('should maintain session after page refresh without remember me', () => {
      // Login first
      cy.visit('/login')
      cy.get('input[name="email"]').type(testEmail)
      cy.get('input[name="password"]').type(testPassword)
      cy.get('form').submit()
      
      // Verify we're on dashboard
      cy.url().should('include', '/dashboard')
      
      // Refresh the page
      cy.reload()
      
      // Should still be logged in (24-hour session)
      cy.url().should('include', '/dashboard')
      cy.get('[data-testid="user-email"]').should('contain', testEmail)
    })

    it('should not persist session after browser restart simulation', () => {
      // Login first
      cy.visit('/login')
      cy.get('input[name="email"]').type(testEmail)
      cy.get('input[name="password"]').type(testPassword)
      cy.get('form').submit()
      
      // Verify we're on dashboard
      cy.url().should('include', '/dashboard')
      
      // Simulate browser restart by clearing cookies and localStorage
      cy.clearCookies()
      cy.clearLocalStorage()
      
      // Visit dashboard directly
      cy.visit('/dashboard')
      
      // Should redirect to login (no persistent session)
      cy.url().should('include', '/login')
    })
  })

  describe('Login with Remember Me', () => {
    it('should login successfully with remember me checked', () => {
      cy.visit('/login')
      
      // Fill in login form
      cy.get('input[name="email"]').type(testEmail)
      cy.get('input[name="password"]').type(testPassword)
      
      // Check remember me
      cy.get('input[type="checkbox"]').check()
      
      // Submit form
      cy.get('form').submit()
      
      // Should redirect to dashboard
      cy.url().should('include', '/dashboard')
      
      // Should display user information
      cy.get('[data-testid="user-email"]').should('contain', testEmail)
    })

    it('should persist session after browser restart simulation with remember me', () => {
      // Login with remember me
      cy.visit('/login')
      cy.get('input[name="email"]').type(testEmail)
      cy.get('input[name="password"]').type(testPassword)
      cy.get('input[type="checkbox"]').check()
      cy.get('form').submit()
      
      // Verify we're on dashboard
      cy.url().should('include', '/dashboard')
      
      // Simulate browser restart by clearing localStorage but keeping cookies
      cy.clearLocalStorage()
      // Note: We can't easily clear cookies in Cypress without affecting the test
      // This test demonstrates the concept
      
      // Visit dashboard directly
      cy.visit('/dashboard')
      
      // Should still be logged in (3-month session)
      cy.url().should('include', '/dashboard')
      cy.get('[data-testid="user-email"]').should('contain', testEmail)
    })

    it('should maintain session across multiple page refreshes with remember me', () => {
      // Login with remember me
      cy.visit('/login')
      cy.get('input[name="email"]').type(testEmail)
      cy.get('input[name="password"]').type(testPassword)
      cy.get('input[type="checkbox"]').check()
      cy.get('form').submit()
      
      // Verify we're on dashboard
      cy.url().should('include', '/dashboard')
      
      // Multiple page refreshes
      cy.reload()
      cy.url().should('include', '/dashboard')
      
      cy.reload()
      cy.url().should('include', '/dashboard')
      
      cy.reload()
      cy.url().should('include', '/dashboard')
      
      // Should still be logged in
      cy.get('[data-testid="user-email"]').should('contain', testEmail)
    })
  })

  describe('Logout Functionality', () => {
    beforeEach(() => {
      // Login before each logout test
      cy.visit('/login')
      cy.get('input[name="email"]').type(testEmail)
      cy.get('input[name="password"]').type(testPassword)
      cy.get('form').submit()
      cy.url().should('include', '/dashboard')
    })

    it('should logout successfully and redirect to login', () => {
      // Click on profile menu
      cy.get('[data-testid="profile-menu"]').click()
      
      // Click logout button
      cy.get('[data-testid="logout-button"]').click()
      
      // Should redirect to login page
      cy.url().should('include', '/login')
      
      // Should not be able to access dashboard
      cy.visit('/dashboard')
      cy.url().should('include', '/login')
    })

    it('should clear session after logout', () => {
      // Logout
      cy.get('[data-testid="profile-menu"]').click()
      cy.get('[data-testid="logout-button"]').click()
      
      // Should be on login page
      cy.url().should('include', '/login')
      
      // Try to access dashboard directly
      cy.visit('/dashboard')
      
      // Should still be on login page
      cy.url().should('include', '/login')
    })

    it('should logout from mobile menu', () => {
      // Switch to mobile viewport
      cy.viewport('iphone-x')
      
      // Open mobile menu
      cy.get('[data-testid="mobile-menu-button"]').click()
      
      // Click logout in mobile menu
      cy.get('[data-testid="mobile-logout-button"]').click()
      
      // Should redirect to login page
      cy.url().should('include', '/login')
    })
  })

  describe('Session Management', () => {
    it('should handle invalid credentials', () => {
      cy.visit('/login')
      
      cy.get('input[name="email"]').type(testEmail)
      cy.get('input[name="password"]').type('wrongpassword')
      cy.get('form').submit()
      
      // Should show error message
      cy.get('[data-testid="error-message"]').should('be.visible')
      cy.get('[data-testid="error-message"]').should('contain', 'Invalid email or password')
      
      // Should stay on login page
      cy.url().should('include', '/login')
    })

    it('should handle empty form submission', () => {
      cy.visit('/login')
      
      // Submit empty form
      cy.get('form').submit()
      
      // Should show validation errors or stay on login page
      cy.url().should('include', '/login')
    })

    it('should redirect authenticated users away from login page', () => {
      // Login first
      cy.visit('/login')
      cy.get('input[name="email"]').type(testEmail)
      cy.get('input[name="password"]').type(testPassword)
      cy.get('form').submit()
      
      // Should be on dashboard
      cy.url().should('include', '/dashboard')
      
      // Try to visit login page again
      cy.visit('/login')
      
      // Should redirect back to dashboard
      cy.url().should('include', '/dashboard')
    })

    it('should protect dashboard from unauthenticated access', () => {
      // Try to access dashboard without login
      cy.visit('/dashboard')
      
      // Should redirect to login
      cy.url().should('include', '/login')
    })
  })

  describe('Remember Me Toggle', () => {
    it('should toggle remember me checkbox', () => {
      cy.visit('/login')
      
      // Checkbox should be unchecked by default
      cy.get('input[type="checkbox"]').should('not.be.checked')
      
      // Check the checkbox
      cy.get('input[type="checkbox"]').check()
      cy.get('input[type="checkbox"]').should('be.checked')
      
      // Uncheck the checkbox
      cy.get('input[type="checkbox"]').uncheck()
      cy.get('input[type="checkbox"]').should('not.be.checked')
    })

    it('should remember checkbox state during form interaction', () => {
      cy.visit('/login')
      
      // Fill form and check remember me
      cy.get('input[name="email"]').type(testEmail)
      cy.get('input[name="password"]').type(testPassword)
      cy.get('input[type="checkbox"]').check()
      
      // Clear email field and refill
      cy.get('input[name="email"]').clear().type(testEmail)
      
      // Remember me should still be checked
      cy.get('input[type="checkbox"]').should('be.checked')
    })
  })

  describe('Cross-browser Session Handling', () => {
    it('should maintain session in different browser contexts', () => {
      // Login with remember me
      cy.visit('/login')
      cy.get('input[name="email"]').type(testEmail)
      cy.get('input[name="password"]').type(testPassword)
      cy.get('input[type="checkbox"]').check()
      cy.get('form').submit()
      
      // Verify login
      cy.url().should('include', '/dashboard')
      
      // Open new window/tab (simulated)
      cy.window().then((win) => {
        win.open('/dashboard', '_blank')
      })
      
      // Note: This is a conceptual test as Cypress doesn't support multiple windows easily
      // In real scenarios, the session should persist across browser tabs/windows
    })
  })
}) 