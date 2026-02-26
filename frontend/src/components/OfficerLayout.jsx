import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { User, LogOut, Home, ArrowLeft, X } from 'lucide-react';
import { useStaffAuth } from '../contexts/StaffAuthContext';

const OfficerLayout = () => {
  const { user, logout } = useStaffAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname === '/officer/dashboard';

  const handleLogout = async () => {
    await logout();
    navigate('/officer/login', { replace: true });
  };

  const userData = user || JSON.parse(localStorage.getItem('user') || 'null');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Main content */}
      <div className="w-full">
        {/* Top bar */}
        <header className="bg-white shadow-sm sticky top-0 z-10 w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center gap-4">
                {!isDashboard && (
                  <button
                    onClick={() => navigate(-1)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                    title="Go Back"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                <h1 className="text-xl font-bold text-primary-600">ULB System</h1>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/officer/dashboard')}
                  className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-full transition-colors"
                  title="Dashboard Home"
                >
                  <Home className="w-5 h-5" />
                </button>

                <div className="hidden md:flex items-center space-x-3 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-sm font-bold">
                    {userData?.full_name?.charAt(0) || userData?.firstName?.charAt(0) || 'O'}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-900">
                      {userData?.full_name || userData?.firstName || 'Officer'}
                    </span>
                    <span className="text-xs text-gray-500">ID: {userData?.id || userData?.employee_id || 'N/A'}</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowProfileModal(true)}
                  className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-full transition-colors"
                  title="My Profile"
                >
                  <User className="w-5 h-5" />
                </button>

                <button
                  onClick={handleLogout}
                  className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </main>

        {/* Profile Modal */}
        {showProfileModal && (
          <div className="modal-overlay">
            <div className="modal-panel max-w-md">
              <div className="modal-header">
                <h3 className="modal-title">My Profile</h3>
                <button type="button" onClick={() => setShowProfileModal(false)} className="modal-close" aria-label="Close">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="modal-body space-y-4">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-xl font-bold">
                    {userData?.full_name?.charAt(0) || userData?.firstName?.charAt(0) || 'O'}
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">
                      {userData?.full_name || userData?.firstName || 'Officer'}
                    </h4>
                    <p className="text-sm text-gray-500 capitalize">{userData?.role || 'officer'}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-xs text-gray-500 uppercase">Email</p>
                    <p className="text-sm font-medium text-gray-900">{userData?.email || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-xs text-gray-500 uppercase">Phone</p>
                    <p className="text-sm font-medium text-gray-900">{userData?.phone || userData?.phoneNumber || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-xs text-gray-500 uppercase">Employee ID</p>
                    <p className="text-sm font-medium text-gray-900">{userData?.employee_id || userData?.id || 'N/A'}</p>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-primary" onClick={() => setShowProfileModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OfficerLayout;
