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
          const response = await authAPI.getMe();
          // Backend returns: { success: true, data: { user } }
          const responseData = response.data;
          const userData = responseData.data?.user || responseData.user || responseData.data;
          
          if (userData && userData.id) {
            // Store role and user in localStorage
            if (userData.role) {
              localStorage.setItem('role', userData.role);
            }
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
          } else {
            throw new Error('Invalid user data received');
          }
        } catch (error) {
          console.error('Auth check failed:', error);
            // Only clear token if it's an auth error (401), not permission error
          if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            localStorage.removeItem('user');
            setToken(null);
            setUser(null);
          } else {
            // Other errors - keep token but don't set user
            // This handles cases where API is down or network issues
            console.warn('Auth check failed but keeping token:', error.message);
            // If it's a network error or API is not available, clear token to allow login
            if (!error.response) {
              // Network error - API might be down
              localStorage.removeItem('token');
              localStorage.removeItem('role');
              localStorage.removeItem('user');
              setToken(null);
              setUser(null);
            }
          }
        }
      } else {
        // No token, ensure user is null and clear role and user
        localStorage.removeItem('role');
        localStorage.removeItem('user');
        setUser(null);
      }
      // Always set loading to false after check completes
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      
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
      
      // Store token, role, and user - use exact role from API
      localStorage.setItem('token', token);
      localStorage.setItem('role', user.role);
      localStorage.setItem('user', JSON.stringify(user));
      setToken(token);
      
      // Set user state - this triggers re-render and updates isAuthenticated
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
      
      // Store token, role, and user - use exact role from API
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
      // Always clear local storage and state
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
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
