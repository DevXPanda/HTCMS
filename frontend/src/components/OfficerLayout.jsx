import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { User, LogOut, Home, X } from 'lucide-react';
import { useStaffAuth } from '../contexts/StaffAuthContext';
import Breadcrumbs from './Breadcrumbs';
import HeaderNotificationBell from './HeaderNotificationBell';
import GlobalHeaderSearch from './GlobalHeaderSearch';

const OfficerLayout = () => {
  const { user, logout } = useStaffAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/officer/login', { replace: true });
  };

  const userData = user || JSON.parse(localStorage.getItem('user') || 'null');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Main content */}
      <div className="w-full">
        {/* Top bar - hidden when printing receipt */}
        <header className="no-print bg-white shadow-sm sticky top-0 z-10 w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap justify-between items-center gap-2 h-16 min-h-[4rem]">
              <div className="flex items-center min-w-0 shrink-0">
                <h1 className="layout-header-title">ULB System</h1>
              </div>
              <GlobalHeaderSearch role="officer" />
              <div className="layout-header-actions">
                <button
                  onClick={() => navigate('/officer/dashboard')}
                  className="header-icon-btn p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center"
                  title="Dashboard Home"
                >
                  <Home className="w-5 h-5 shrink-0" />
                </button>
                <HeaderNotificationBell />

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
                  className="header-icon-btn p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-full transition-colors flex items-center justify-center"
                  title="My Profile"
                >
                  <User className="w-5 h-5 shrink-0" />
                </button>

                <button
                  onClick={handleLogout}
                  className="header-icon-btn p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors flex items-center justify-center"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5 shrink-0" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="no-print mb-4">
            <Breadcrumbs />
          </div>
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
                    <p className="text-sm font-medium text-gray-900">{userData?.phone_number || userData?.phone || userData?.phoneNumber || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-xs text-gray-500 uppercase">Employee ID</p>
                    <p className="text-sm font-medium text-gray-900">{userData?.employee_id || userData?.id || 'N/A'}</p>
                  </div>
                  {userData?.assigned_wards?.length > 0 && (
                    <div className="bg-gray-50 p-3 rounded-md">
                      <p className="text-xs text-gray-500 uppercase">{userData.assigned_wards.length === 1 ? 'Assigned Ward' : 'Assigned Wards'}</p>
                      <p className="text-sm font-medium text-gray-900">
                        {userData.assigned_wards.map((w) => `${w.wardNumber || w.id} - ${w.wardName || 'Ward'}`).join(', ')}
                      </p>
                    </div>
                  )}
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
