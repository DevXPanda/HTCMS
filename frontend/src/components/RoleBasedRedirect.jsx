import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useStaffAuth } from '../contexts/StaffAuthContext';

const RoleBasedRedirect = () => {
  const { user: adminUser, loading: adminLoading } = useAuth();
  let staffAuth;
  
  try {
    staffAuth = useStaffAuth();
  } catch (error) {
    staffAuth = null;
  }

  const loading = adminLoading || (staffAuth?.loading ?? false);

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

  // Get role from localStorage or user object - prioritize staff auth for staff roles
  const role = staffAuth?.user?.role || localStorage.getItem('role') || adminUser?.role;

  // Helper functions to check role groups
  const isAdminRole = (role) => role === 'admin' || role === 'assessor' || role === 'cashier';
  const isCollectorRole = (role) => role === 'collector' || role === 'tax_collector';
  const isCitizenRole = (role) => role === 'citizen';
  const isClerkRole = (role) => role === 'clerk';
  const isInspectorRole = (role) => role === 'inspector';
  const isOfficerRole = (role) => role === 'officer';

  // Redirect based on role - exact role matching
  if (role === 'citizen') {
    return <Navigate to="/citizen/dashboard" replace />;
  } else if (role === 'clerk') {
    return <Navigate to="/clerk/dashboard" replace />;
  } else if (role === 'collector' || role === 'tax_collector') {
    return <Navigate to="/collector/dashboard" replace />;
  } else if (role === 'inspector') {
    return <Navigate to="/inspector/dashboard" replace />;
  } else if (role === 'officer') {
    return <Navigate to="/officer/dashboard" replace />;
  } else if (role === 'admin' || role === 'assessor' || role === 'cashier') {
    return <Navigate to="/dashboard" replace />;
  }

  // Default fallback - redirect to citizen login
  return <Navigate to="/citizen/login" replace />;
};

export default RoleBasedRedirect;
