import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const RoleBasedRedirect = () => {
  const { user, loading } = useAuth();

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

  // Get role from localStorage or user object
  const role = localStorage.getItem('role') || user?.role;

  // Helper functions to check role groups
  const isAdminRole = (role) => role === 'admin' || role === 'assessor' || role === 'cashier';
  const isCollectorRole = (role) => role === 'collector' || role === 'tax_collector';
  const isCitizenRole = (role) => role === 'citizen';

  // Redirect based on role - exact role matching
  if (role === 'citizen') {
    return <Navigate to="/citizen/dashboard" replace />;
  } else if (role === 'collector' || role === 'tax_collector') {
    return <Navigate to="/collector/dashboard" replace />;
  } else if (role === 'admin' || role === 'assessor' || role === 'cashier') {
    return <Navigate to="/dashboard" replace />;
  }

  // Default fallback - redirect to citizen login
  return <Navigate to="/citizen/login" replace />;
};

export default RoleBasedRedirect;
