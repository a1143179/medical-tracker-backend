import React, { createContext, useContext, useState, useEffect } from 'react';

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

  useEffect(() => {
    // Check for remember token first
    const checkRememberToken = async () => {
      try {
        const response = await fetch('/api/auth/validate-remember-token', {
          method: 'GET',
          credentials: 'include', // Include cookies
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
          
          // Dispatch custom event for language preference loading
          window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: userData }));
        } else {
          // No valid remember token, check for stored user in localStorage
          const storedUser = localStorage.getItem('user');
          
          if (storedUser) {
            try {
              const userData = JSON.parse(storedUser);
              // Check if this is old mock data (has very large ID)
              if (userData.id && userData.id > 1000000) {
                // This is old mock data, clear it
                localStorage.removeItem('user');
                localStorage.removeItem('savedCredentials');
                setUser(null);
              } else {
                setUser(userData);
              }
            } catch (error) {
              // Invalid JSON, clear it
              localStorage.removeItem('user');
              localStorage.removeItem('savedCredentials');
              setUser(null);
            }
          }
        }
      } catch (error) {
        console.error('Error checking remember token:', error);
        // Fallback to localStorage check
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            if (userData.id && userData.id > 1000000) {
              localStorage.removeItem('user');
              localStorage.removeItem('savedCredentials');
              setUser(null);
            } else {
              setUser(userData);
            }
          } catch (error) {
            localStorage.removeItem('user');
            localStorage.removeItem('savedCredentials');
            setUser(null);
          }
        }
      }
      setLoading(false);
    };

    checkRememberToken();
  }, []);

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
      localStorage.setItem('user', JSON.stringify(userData));
      
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
      localStorage.setItem('user', JSON.stringify(userData));
      
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
      localStorage.removeItem('user');
      // Also clear saved credentials when logging out
      localStorage.removeItem('savedCredentials');
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