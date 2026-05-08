import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { normalizeRole } from '../utils/roleUtils';

const PrivateRoute = ({ children, allowedRoles }) => {
  const location = useLocation();
  const { isAuthenticated, loading, user } = useAuth();

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
    // Determine which auth type to suggest in the landing page URL
    const pathname = location.pathname;
    let authType = 'login';
    
    if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) {
      authType = 'admin';
    } else if (pathname.startsWith('/citizen')) {
      authType = 'citizen';
    } else if (
      pathname.startsWith('/collector') || 
      pathname.startsWith('/inspector') || 
      pathname.startsWith('/clerk') ||
      pathname.startsWith('/officer') ||
      pathname.startsWith('/eo') ||
      pathname.startsWith('/supervisor') ||
      pathname.startsWith('/sfi') ||
      pathname.startsWith('/sbm') ||
      pathname.startsWith('/account-officer')
    ) {
      authType = 'staff';
    }

    return <Navigate to={`/?auth=${authType}`} state={{ from: location }} replace />;
  }

  // Get role from user object
  const role = user?.role;
  
  // If no role found, something is wrong with the session
  if (!role) {
    return <Navigate to="/?auth=login" replace />;
  }

  // Check if role is in allowedRoles array
  if (allowedRoles && Array.isArray(allowedRoles)) {
    const normalizedUserRole = normalizeRole(role);
    const normalizedAllowedRoles = allowedRoles.map(r => normalizeRole(r));
    
    // Special handling for legacy role mappings if needed (none identified yet that roleUtils doesn't handle)
    if (!normalizedAllowedRoles.includes(normalizedUserRole)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
};

export default PrivateRoute;
