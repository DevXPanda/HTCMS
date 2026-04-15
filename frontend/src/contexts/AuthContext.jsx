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
          // Normalize role to uppercase for comparison
          const normalizedRole = storedRole ? storedRole.toUpperCase().replace(/-/g, '_') : storedRole;
          // Deprecated roles (kept for future use): Clerk, Inspector, Officer, Contractor. Included so existing users still use StaffAuth.
          const staffRoles = ['CLERK', 'INSPECTOR', 'OFFICER', 'COLLECTOR', 'EO', 'SUPERVISOR', 'FIELD_WORKER', 'CONTRACTOR', 'SFI', 'SBM', 'ACCOUNT_OFFICER'];
          if (normalizedRole && staffRoles.includes(normalizedRole)) {
            // Staff users use StaffAuthContext, skip AuthContext check
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

  const login = async (emailOrPhone, password, allowedRoles = null) => {
    try {
      const response = await authAPI.login(emailOrPhone, password);
      const responseData = response.data;

      if (responseData.requiresOtp && responseData.pendingToken) {
        return {
          success: true,
          requiresOtp: true,
          pendingToken: responseData.pendingToken,
          emailMasked: responseData.emailMasked,
          message: responseData.message
        };
      }

      const { user, token } = responseData.data || responseData;

      if (!user || !token) {
        throw new Error('Invalid response from server');
      }

      if (!user.role) {
        throw new Error('User role not found in response');
      }

      // Role validation - check before setting state to prevent flashes of dashboard
      if (allowedRoles && allowedRoles.length > 0) {
        const normalizedRole = user.role.toUpperCase().replace(/-/g, '_');
        const normalizedAllowedRoles = allowedRoles.map(r => r.toUpperCase().replace(/-/g, '_'));
        
        if (!normalizedAllowedRoles.includes(normalizedRole)) {
          throw new Error("Login Error: Incorrect portal for your account type.");
        }
      }


      clearAllAuthData();

      localStorage.setItem('token', token);
      localStorage.setItem('role', user.role);
      localStorage.setItem('user', JSON.stringify(user));
      setToken(token);
      setUser(user);

      return { success: true, user };
    } catch (error) {
      console.error('Login API error:', error);
      return {
        success: false,
        message: error.response?.data?.error || error.response?.data?.message || error.message || 'Login failed'
      };
    }
  };

  const completeCitizenLogin = async (pendingToken, otp, allowedRoles = ['citizen']) => {
    try {
      const response = await authAPI.verifyCitizenLogin(pendingToken, otp);
      const responseData = response.data;
      const { user, token } = responseData.data || responseData;

      if (!user || !token) {
        throw new Error('Invalid response from server');
      }

      // Role validation
      if (allowedRoles && allowedRoles.length > 0) {
        const normalizedRole = user.role.toUpperCase().replace(/-/g, '_');
        const normalizedAllowedRoles = allowedRoles.map(r => r.toUpperCase().replace(/-/g, '_'));
        
        if (!normalizedAllowedRoles.includes(normalizedRole)) {
          throw new Error("Login Error: This account belongs to the Management portal. Please login there.");
        }
      }


      clearAllAuthData();

      localStorage.setItem('token', token);
      localStorage.setItem('role', user.role);
      localStorage.setItem('user', JSON.stringify(user));
      setToken(token);
      setUser(user);

      return { success: true, user };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || error.response?.data?.message || error.message || 'Verification failed'
      };
    }
  };


  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);

      const responseData = response.data;

      if (responseData.requiresVerification) {
        return {
          success: true,
          requiresVerification: true,
          email: responseData.email,
          emailMasked: responseData.emailMasked,
          message: responseData.message
        };
      }

      const { user, token } = responseData.data || responseData;

      if (!user || !token) {
        throw new Error('Invalid response from server');
      }

      if (!user.role) {
        throw new Error('User role not found in response');
      }

      clearAllAuthData();

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

  const verifyCitizenRegistration = async (email, otp) => {
    try {
      const response = await authAPI.verifyRegistration(email, otp);
      return {
        success: true,
        message: response.data?.message || 'Verified successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || error.response?.data?.message || error.message || 'Verification failed'
      };
    }
  };

  const resendCitizenRegistrationOtp = async (email) => {
    try {
      await authAPI.resendRegistrationOtp(email);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || error.response?.data?.message || error.message || 'Could not resend code'
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
    completeCitizenLogin,
    register,
    verifyCitizenRegistration,
    resendCitizenRegistrationOtp,
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
