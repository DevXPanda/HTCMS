import { createContext, useContext, useEffect, useState } from 'react';
import { staffAuthAPI } from '../services/api';

const StaffAuthContext = createContext(null);

export const useStaffAuth = () => {
  const context = useContext(StaffAuthContext);
  if (!context) {
    throw new Error('useStaffAuth must be used within a StaffAuthProvider');
  }
  return context;
};

export const StaffAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('staffToken') || localStorage.getItem('token'));

  const clearAllAuthData = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('staffToken');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    localStorage.removeItem('userType');
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    const checkAuth = async () => {
      if (!token) {
        console.log('🔑 StaffAuthContext - No token found, clearing auth data');
        clearAllAuthData();
        setLoading(false);
        return;
      }

      // Skip staff auth check for non-staff roles
      const storedRole = localStorage.getItem('role');
      // Normalize role to uppercase for comparison
      const normalizedStoredRole = storedRole ? storedRole.toUpperCase().replace(/-/g, '_') : storedRole;
      const staffRoles = ['CLERK', 'INSPECTOR', 'OFFICER', 'COLLECTOR', 'TAX_COLLECTOR', 'EO', 'SUPERVISOR', 'FIELD_WORKER', 'CONTRACTOR'];

      if (normalizedStoredRole && !staffRoles.includes(normalizedStoredRole)) {
        console.log(`ℹ️ StaffAuthContext - Skipping staff auth for role: ${storedRole}`);
        setLoading(false);
        return;
      }

      try {
        console.log('🔑 StaffAuthContext - Checking auth with token');
        const response = await staffAuthAPI.getProfile();
        const employee = response.data?.employee || response.data?.data?.employee;
        console.log('👤 StaffAuthContext - Profile response:', employee);

        if (employee?.id) {
          console.log('✅ StaffAuthContext - Authentication successful for:', employee.employee_id, employee.role);
          setUser(employee);
        } else {
          throw new Error('Invalid staff profile response');
        }
      } catch (error) {
        console.error('❌ StaffAuthContext - Auth check failed:', error);
        clearAllAuthData();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [token]);

  const login = async (identifier, password) => {
    try {
      const response = await staffAuthAPI.login(identifier, password);
      const { token: newToken, employee } = response.data || {};

      if (!newToken || !employee?.role) {
        throw new Error('Invalid staff login response');
      }

      clearAllAuthData();
      localStorage.setItem('staffToken', newToken);
      localStorage.setItem('token', newToken);
      localStorage.setItem('role', employee.role);
      localStorage.setItem('user', JSON.stringify(employee));
      localStorage.setItem('userType', 'admin_management');
      setToken(newToken);
      setUser(employee);

      return { success: true, user: employee };
    } catch (error) {
      console.error('Staff login error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Login failed'
      };
    }
  };

  const logout = async () => {
    try {
      console.log('🔑 StaffAuthContext - Logging out staff user...');

      // Normalize role to uppercase for comparison
      const normalizedRole = user?.role ? user.role.toUpperCase().replace(/-/g, '_') : user?.role;
      
      // Call backend logout API to update attendance
      if (normalizedRole === 'COLLECTOR') {
        console.log('📝 StaffAuthContext - Calling staff logout for collector attendance...');
        await staffAuthAPI.logout();
      } else {
        // For non-collector staff users, still call logout for consistency
        await staffAuthAPI.logout();
      }

      console.log('✅ StaffAuthContext - Backend logout successful');
    } catch (error) {
      console.error('❌ StaffAuthContext - Backend logout failed:', error);
      // Continue with local logout even if backend fails
    } finally {
      // Always clear local auth data
      clearAllAuthData();
      console.log('🔑 StaffAuthContext - Local auth data cleared');
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!user
  };

  return <StaffAuthContext.Provider value={value}>{children}</StaffAuthContext.Provider>;
};
