import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLanguage } from './LanguageContext';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { syncAuthState } = useLanguage();

  useEffect(() => {
    // Check for remember token to validate session
    const checkRememberToken = async () => {
      try {
        const response = await fetch('/api/auth/validate-remember-token', {
          method: 'GET',
          credentials: 'include', // Include cookies
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          syncAuthState(true);
          
          // Dispatch custom event for language preference loading
          window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: userData }));
        } else {
          // No valid session, user is not authenticated
          setUser(null);
          syncAuthState(false);
        }
      } catch (error) {
        console.error('Error checking remember token:', error);
        // On error, assume user is not authenticated
        setUser(null);
        syncAuthState(false);
      }
      setLoading(false);
    };

    checkRememberToken();
  }, [syncAuthState]);

  // Sync initial authentication state
  useEffect(() => {
    if (!loading) {
      syncAuthState(!!user);
    }
  }, [user, loading, syncAuthState]);

  const login = async (email, password, rememberMe = false) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, rememberMe }),
        credentials: 'include', // Include cookies
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const userData = await response.json();
      setUser(userData);
      syncAuthState(true);
      
      // Dispatch custom event for language preference loading
      window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: userData }));
      
      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (email, password, confirmPassword) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, confirmPassword }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }

      const userData = await response.json();
      setUser(userData);
      syncAuthState(true);
      
      // Dispatch custom event for language preference loading
      window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: userData }));
      
      return { success: true };
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Call backend logout endpoint to clear remember token
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include', // Include cookies
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      // Clear any saved credentials when logging out
      localStorage.removeItem('savedCredentials');
      syncAuthState(false);
      
      // Dispatch custom event for language preference handling
      window.dispatchEvent(new CustomEvent('userLoggedOut'));
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 