/**
 * Centralized role-to-dashboard mapping for the entire application.
 * Used by UnifiedLogin, PrivateRoute, and RoleBasedRedirect.
 */
export const getRoleDashboardPath = (role) => {
  if (!role) return '/';
  
  const normalized = (role || '').toString().toUpperCase().replace(/[- ]/g, '_');
  
  const map = {
    // User Table Roles
    CITIZEN: '/citizen/dashboard',
    ADMIN: '/dashboard',
    ASSESSOR: '/dashboard',
    CASHIER: '/dashboard',
    
    // AdminManagement Table Roles (Staff)
    CLERK: '/clerk/dashboard',
    INSPECTOR: '/inspector/dashboard',
    OFFICER: '/officer/dashboard',
    COLLECTOR: '/collector/dashboard',
    TAX_COLLECTOR: '/collector/dashboard',
    EO: '/eo/dashboard',
    SUPERVISOR: '/supervisor/dashboard',
    SFI: '/sfi/dashboard',
    SBM: '/sbm/dashboard',
    ACCOUNT_OFFICER: '/account-officer/dashboard',
    FIELD_WORKER: '/field-worker/dashboard',
  };
  
  return map[normalized] || '/';
};

/**
 * Normalizes role string for comparison (handles spaces, hyphens, and case)
 */
export const normalizeRole = (role) => (role || '').toString().toUpperCase().replace(/[- ]/g, '_');
