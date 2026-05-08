import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, staffAuthAPI } from '../services/api';
import { normalizeRole } from '../utils/roleUtils';

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
  const [userType, setUserType] = useState(localStorage.getItem('userType')); // 'user' or 'admin_management'

  // Helper function to clear all auth data
  const clearAllAuthData = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('staffToken'); // Clean up legacy key
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    localStorage.removeItem('userType');
    setToken(null);
    setUser(null);
    setUserType(null);
  };

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUserType = localStorage.getItem('userType');
      
      if (!storedToken) {
        clearAllAuthData();
        setLoading(false);
        return;
      }

      setToken(storedToken);
      setUserType(storedUserType);

      try {
        // Try getting profile. We use storedUserType to prioritize the correct API.
        // But we fall back to the other one if the first one fails, in case of role switches or data migrations.
        
        const tryUserAuth = async () => {
          const response = await authAPI.getMe();
          const responseData = response.data;
          const userData = responseData.data?.user || responseData.user || responseData.data;
          if (userData && userData.id) return userData;
          throw new Error('Invalid user data');
        };

        const tryStaffAuth = async () => {
          const response = await staffAuthAPI.getProfile();
          const employee = response.data?.employee || response.data?.data?.employee;
          if (employee && employee.id) return employee;
          throw new Error('Invalid staff data');
        };

        let userData = null;
        let finalType = storedUserType || 'user';

        if (storedUserType === 'admin_management') {
          try {
            userData = await tryStaffAuth();
            finalType = 'admin_management';
          } catch (e) {
            userData = await tryUserAuth();
            finalType = 'user';
          }
        } else {
          try {
            userData = await tryUserAuth();
            finalType = 'user';
          } catch (e) {
            userData = await tryStaffAuth();
            finalType = 'admin_management';
          }
        }

        if (userData) {
          setUser(userData);
          setUserType(finalType);
          localStorage.setItem('userType', finalType);
          localStorage.setItem('role', userData.role);
          localStorage.setItem('user', JSON.stringify(userData));
        } else {
          throw new Error('No valid user found');
        }
      } catch (error) {
        console.error('Check auth error:', error);
        clearAllAuthData();
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [token]);

  const login = async (identifier, password) => {
    try {
      // 1. Try primary login (Citizens/Admins)
      try {
        const response = await authAPI.login(identifier, password);
        const responseData = response.data;

        // Handle OTP flow for citizens
        if (responseData.requiresOtp && responseData.pendingToken) {
          return {
            success: true,
            requiresOtp: true,
            pendingToken: responseData.pendingToken,
            emailMasked: responseData.emailMasked,
            message: responseData.message
          };
        }

        const { user: userData, token: newToken } = responseData.data || responseData;

        if (userData && newToken) {
          saveAuthData(userData, newToken, 'user');
          return { success: true, user: userData };
        }
      } catch (authError) {
        // Fallback to staff auth
        const staffResponse = await staffAuthAPI.login(identifier, password);
        const { token: staffToken, employee } = staffResponse.data || {};

        if (employee && staffToken) {
          saveAuthData(employee, staffToken, 'admin_management');
          return { success: true, user: employee };
        }
      }
      
      throw new Error('Invalid credentials');
    } catch (error) {
      console.error('Unified Login error:', error);
      return {
        success: false,
        message: error.response?.data?.error || error.response?.data?.message || error.message || 'Login failed'
      };
    }
  };

  const saveAuthData = (userData, newToken, type) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('role', userData.role);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('userType', type);
    setToken(newToken);
    setUser(userData);
    setUserType(type);
  };

  const completeCitizenLogin = async (pendingToken, otp) => {
    try {
      const response = await authAPI.verifyCitizenLogin(pendingToken, otp);
      const responseData = response.data;
      const { user: userData, token: newToken } = responseData.data || responseData;

      if (userData && newToken) {
        saveAuthData(userData, newToken, 'user');
        return { success: true, user: userData };
      }
      throw new Error('Verification failed');
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

      const { user: newUser, token: newToken } = responseData.data || responseData;

      if (newUser && newToken) {
        saveAuthData(newUser, newToken, 'user');
        return { success: true, user: newUser };
      }
      throw new Error('Registration failed');
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

  const forgotPassword = async (identifier) => {
    try {
      // 1. Try citizen/admin forgot password first
      try {
        const response = await authAPI.forgotPassword(identifier);
        const data = response.data;
        
        // If success but no email, it means user not found in User table.
        // Try Staff table (AdminManagement).
        if (data.success && !data.email) {
          try {
            const staffResponse = await staffAuthAPI.forgotPassword(identifier);
            return { ...staffResponse.data, isStaff: true };
          } catch (staffError) {
            // If staff check fails too, return the original generic success message
            // or the specific staff error if it's a real error (not 404).
            return data;
          }
        }
        
        return data;
      } catch (authError) {
        // Handle explicit 400/isStaff error from backend if applicable
        if (authError.response?.data?.isStaff) {
          try {
            const response = await staffAuthAPI.forgotPassword(identifier);
            return { ...response.data, isStaff: true };
          } catch (e) {
            throw authError;
          }
        }
        throw authError;
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || error.response?.data?.message || error.message || 'Request failed'
      };
    }
  };

  const verifyResetOtp = async (identifier, otp) => {
    try {
      const response = await authAPI.verifyResetOtp(identifier, otp);
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || error.response?.data?.message || error.message || 'Verification failed'
      };
    }
  };

  const resetPassword = async (identifier, otp, newPassword) => {
    try {
      const response = await authAPI.resetPassword(identifier, otp, newPassword);
      return response.data;
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error || error.response?.data?.message || error.message || 'Reset failed'
      };
    }
  };

  const logout = async () => {
    try {
      if (userType === 'admin_management') {
        await staffAuthAPI.logout();
      } else {
        await authAPI.logout();
      }
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      clearAllAuthData();
    }
  };

  const updateUser = (userData) => {
    const newUser = { ...user, ...userData };
    setUser(newUser);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const value = {
    user,
    token,
    loading,
    userType,
    login,
    completeCitizenLogin,
    register,
    verifyCitizenRegistration,
    resendCitizenRegistrationOtp,
    forgotPassword,
    verifyResetOtp,
    resetPassword,
    logout,
    updateUser,
    isAuthenticated: !!user,
    // Role helpers using normalized roles
    isAdmin: normalizeRole(user?.role) === 'ADMIN',
    isAssessor: normalizeRole(user?.role) === 'ASSESSOR',
    isCashier: normalizeRole(user?.role) === 'CASHIER',
    isCollector: ['COLLECTOR', 'TAX_COLLECTOR'].includes(normalizeRole(user?.role)),
    isCitizen: normalizeRole(user?.role) === 'CITIZEN'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
