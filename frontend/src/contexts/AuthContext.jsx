import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

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
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const storedRole = localStorage.getItem('role');
          const staffRoles = ['clerk', 'inspector', 'officer', 'collector'];
          if (storedRole && staffRoles.includes(storedRole)) {
            setLoading(false);
            return;
          }

          const response = await authAPI.getMe();
          // Backend returns: { success: true, data: { user } }
          const responseData = response.data;
          const userData = responseData.data?.user || responseData.user || responseData.data;
          
          if (userData && userData.id) {
            // Completely overwrite user state - don't merge with cached data
            setUser(userData);
          } else {
            throw new Error('Invalid user data received');
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          // Clear all cached data on any auth error
          clearAllAuthData();
        }
      } else {
        // No token, ensure all auth data is cleared
        clearAllAuthData();
      }
      // Always set loading to false after check completes
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  // Helper function to clear all auth data
  const clearAllAuthData = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    localStorage.removeItem('userType');
    setToken(null);
    setUser(null);
  };

  const login = async (emailOrPhone, password) => {
    try {
      const response = await authAPI.login(emailOrPhone, password);
      
      // Backend returns: { token, user: sanitizedUser } or { success: true, data: { user, token } }
      const responseData = response.data;
      const { user, token } = responseData.data || responseData;
      
      if (!user || !token) {
        throw new Error('Invalid response from server');
      }
      
      // Ensure role is present in user object
      if (!user.role) {
        throw new Error('User role not found in response');
      }
      
      // Clear any existing cached data first
      clearAllAuthData();
      
      // Store fresh token and user data
      localStorage.setItem('token', token);
      localStorage.setItem('role', user.role);
      localStorage.setItem('user', JSON.stringify(user));
      setToken(token);
      
      // Completely overwrite user state - don't merge with existing data
      setUser(user);
      
      // Return user immediately for navigation
      return { success: true, user };
    } catch (error) {
      console.error('Login API error:', error);
      return {
        success: false,
        message: error.response?.data?.error || error.response?.data?.message || error.message || 'Login failed'
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      
      // Backend returns: { success: true, data: { user, token } }
      const responseData = response.data;
      const { user, token } = responseData.data || responseData;
      
      if (!user || !token) {
        throw new Error('Invalid response from server');
      }
      
      // Ensure role is present in user object
      if (!user.role) {
        throw new Error('User role not found in response');
      }
      
      // Clear any existing cached data first
      clearAllAuthData();
      
      // Store fresh token and user data
      localStorage.setItem('token', token);
      localStorage.setItem('role', user.role);
      localStorage.setItem('user', JSON.stringify(user));
      setToken(token);
      setUser(user);
      
      return { success: true, user };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || error.response?.data?.message || error.message || 'Registration failed'
      };
    }
  };

  const logout = async () => {
    try {
      // Call logout API to capture attendance (punch out for collectors)
      await authAPI.logout();
    } catch (error) {
      // Log error but continue with logout even if API call fails
      console.error('Logout API error:', error);
    } finally {
      // Always clear all auth data completely
      clearAllAuthData();
    }
  };

  const updateUser = (userData) => {
    setUser({ ...user, ...userData });
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isAssessor: user?.role === 'assessor',
    isCashier: user?.role === 'cashier',
    isCollector: user?.role === 'collector' || user?.role === 'tax_collector',
    isTaxCollector: user?.role === 'tax_collector' || user?.role === 'collector', // Backward compatibility
    isCitizen: user?.role === 'citizen'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
