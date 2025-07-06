// Email Service for Development and Production Environments
// Best practices for email sending in different environments

class EmailService {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.apiBaseUrl = process.env.REACT_APP_API_URL || '';
  }

  /**
   * Send verification code to user's email
   * @param {string} email - User's email address
   * @param {string} code - Verification code to send
   * @returns {Promise<Object>} Response with success status and message
   */
  async sendVerificationCode(email, code) {
    try {
      if (this.isDevelopment) {
        return await this.sendVerificationCodeDev(email, code);
      }
      
      return await this.sendVerificationCodeProd(email, code);
    } catch (error) {
      console.error('Email sending error:', error);
      throw error;
    }
  }

  /**
   * Production: Send verification code via backend API
   */
  async sendVerificationCodeProd(email, code) {
    const response = await fetch(`${this.apiBaseUrl}/api/auth/send-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to send verification code');
    }

    const result = await response.json();

    return {
      success: true,
      message: result.message,
      code: result.code // Backend returns code in development
    };
  }

  /**
   * Development environment: Simulate email sending
   * Best practices for development:
   * - Use email testing services (Mailtrap, Ethereal)
   * - Log emails to console for debugging
   * - Use mock email services
   * - Store codes in localStorage for testing
   */
  async sendVerificationCodeDev(email, code) {
    console.log('=== DEVELOPMENT EMAIL SERVICE ===');
    console.log(`To: ${email}`);
    console.log(`Subject: Blood Sugar Tracker - Email Verification`);
    console.log(`Body: Your verification code is: ${code}`);
    console.log('=====================================');

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Call backend API which will return the code in development
    const response = await fetch('/api/auth/send-verification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to send verification code');
    }

    const result = await response.json();

    return {
      success: true,
      message: result.message,
      code: result.code, // Backend returns code in development
      email: email
    };
  }

  /**
   * Verify the code entered by user
   * @param {string} email - User's email
   * @param {string} code - Code entered by user
   * @returns {Promise<boolean>} Whether code is valid
   */
  async verifyCode(email, code) {
    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          code: code
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Invalid verification code');
      }

      return true;
    } catch (error) {
      console.error('Code verification error:', error);
      throw error;
    }
  }

  /**
   * Clear verification data (for cleanup)
   */
  clearVerificationData() {
    // No longer needed since we're using backend storage
  }

  /**
   * Get email usage information (for monitoring)
   * @returns {Promise<Object>} Usage statistics
   */
  async getEmailUsage() {
    if (this.isDevelopment) {
      return {
        sent: 0,
        limit: 100,
        remaining: 100,
        resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/api/auth/email-usage`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Failed to get email usage:', error);
    }

    return null;
  }
}

// Create singleton instance
const emailService = new EmailService();

export default emailService; 