import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { X } from 'lucide-react';
import { useStaffAuth } from '../contexts/StaffAuthContext';
import Breadcrumbs from './Breadcrumbs';
import StaffPortalHeaderRow from './StaffPortalHeaderRow';

const SBMLayout = () => {
  const { user, logout } = useStaffAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  const userData = user || JSON.parse(localStorage.getItem('user') || 'null');
  const normalizedRole = (userData?.role || localStorage.getItem('role') || '').toString().toUpperCase().replace(/-/g, '_');
  const isAccountOfficer = normalizedRole === 'ACCOUNT_OFFICER';
  const homePath = isAccountOfficer ? '/account-officer/dashboard' : '/sbm/dashboard';
  const roleLabel = isAccountOfficer ? 'Account Officer' : 'SBM';
  const roleDescription = isAccountOfficer
    ? 'Account Officer'
    : 'SBM - read-only unless Full CRUD enabled';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="w-full">
        {/* Same header as AdminLayout */}
        <header className="no-print bg-white shadow-sm sticky top-0 z-10 w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <StaffPortalHeaderRow
              searchRole={normalizedRole || 'SBM'}
              dashboardPath={homePath}
              userInitial={userData?.full_name?.charAt(0) || userData?.firstName?.charAt(0) || 'S'}
              userTitle={userData?.full_name || userData?.firstName || roleLabel}
              userSubtitle={`ID: ${userData?.employee_id || userData?.id || 'N/A'}`}
              userExtra={
                userData?.full_crud_enabled ? (
                  <span className="text-[10px] text-primary-600 mt-0.5 block">Full CRUD</span>
                ) : null
              }
              onProfile={() => setShowProfileModal(true)}
              onLogout={handleLogout}
            />
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="no-print mb-4">
            <Breadcrumbs />
          </div>
          <Outlet />
        </main>

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
                    {userData?.full_name?.charAt(0) || userData?.firstName?.charAt(0) || 'S'}
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">
                      {userData?.full_name || userData?.firstName || roleLabel}
                    </h4>
                    <p className="text-sm text-gray-500">{roleDescription}</p>
                    {userData?.full_crud_enabled && (
                      <p className="text-xs text-primary-600 mt-1">Full CRUD enabled</p>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-xs text-gray-500 uppercase">Email</p>
                    <p className="text-sm font-medium text-gray-900">{userData?.email || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-xs text-gray-500 uppercase">Phone</p>
                    <p className="text-sm font-medium text-gray-900">{userData?.phone_number || userData?.phone || 'N/A'}</p>
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

export default SBMLayout;
