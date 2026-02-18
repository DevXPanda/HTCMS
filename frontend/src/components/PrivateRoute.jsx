import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useStaffAuth } from '../contexts/StaffAuthContext';

const PrivateRoute = ({ children, allowedRoles }) => {
  const location = useLocation();
  const { isAuthenticated: isUserAuthenticated, loading: userLoading } = useAuth();
  let staffAuth;

  try {
    staffAuth = useStaffAuth();
  } catch (error) {
    staffAuth = null;
  }

  const isStaffRoute = location.pathname.startsWith('/collector') ||
    location.pathname.startsWith('/clerk') ||
    location.pathname.startsWith('/inspector') ||
    location.pathname.startsWith('/officer') ||
    location.pathname.startsWith('/eo') ||
    location.pathname.startsWith('/supervisor');
  const isAuthenticated = isStaffRoute && staffAuth ? staffAuth.isAuthenticated : isUserAuthenticated;
  const loading = isStaffRoute && staffAuth ? staffAuth.loading : userLoading;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to appropriate login page based on route
    const pathname = location.pathname;
    if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard') || 
        pathname.startsWith('/properties') || pathname.startsWith('/assessments') ||
        pathname.startsWith('/demands') || pathname.startsWith('/payments') ||
        pathname.startsWith('/wards') || pathname.startsWith('/users') ||
        pathname.startsWith('/reports') || pathname === '/') {
      return <Navigate to="/admin/login" replace />;
    } else if (pathname.startsWith('/collector')) {
      return <Navigate to="/staff/login" replace />;
    } else if (pathname.startsWith('/inspector')) {
      return <Navigate to="/inspector/login" replace />;
    } else if (pathname.startsWith('/clerk') || pathname.startsWith('/officer') || pathname.startsWith('/eo') || pathname.startsWith('/supervisor')) {
      return <Navigate to="/staff/login" replace />;
    } else {
      return <Navigate to="/citizen/login" replace />;
    }
  }

  // Get role from localStorage only - exact value from API
  const role = staffAuth?.user?.role || localStorage.getItem('role');
  
  // If no role found, redirect to login
  if (!role) {
    const pathname = location.pathname;
    if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) {
      return <Navigate to="/admin/login" replace />;
    } else if (pathname.startsWith('/collector')) {
      return <Navigate to="/staff/login" replace />;
    } else if (pathname.startsWith('/inspector')) {
      return <Navigate to="/inspector/login" replace />;
    } else if (pathname.startsWith('/clerk') || pathname.startsWith('/officer') || pathname.startsWith('/eo') || pathname.startsWith('/supervisor')) {
      return <Navigate to="/staff/login" replace />;
    } else {
      return <Navigate to="/citizen/login" replace />;
    }
  }

  // Check if role is in allowedRoles array
  if (allowedRoles && Array.isArray(allowedRoles)) {
    // Normalize role to uppercase for comparison
    const normalizedRole = role ? role.toUpperCase().replace(/-/g, '_') : role;
    // Normalize allowed roles to uppercase and handle special cases
    const normalizedAllowedRoles = allowedRoles.map(r => {
      const normalized = r.toUpperCase().replace(/-/g, '_');
      // Handle tax_collector -> COLLECTOR mapping
      return normalized === 'TAX_COLLECTOR' ? 'COLLECTOR' : normalized;
    });
    
    // Handle special case: tax_collector -> COLLECTOR
    const finalRole = normalizedRole === 'TAX_COLLECTOR' ? 'COLLECTOR' : normalizedRole;
    
    if (!normalizedAllowedRoles.includes(finalRole)) {
      // User doesn't have required role - redirect to unauthorized or their dashboard
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
};

export default PrivateRoute;
