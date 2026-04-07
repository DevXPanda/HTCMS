import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { X } from 'lucide-react';
import { useStaffAuth } from '../contexts/StaffAuthContext';
import Breadcrumbs from './Breadcrumbs';
import StaffPortalHeaderRow from './StaffPortalHeaderRow';

const SupervisorLayout = () => {
  const { user, logout } = useStaffAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  const userData = user || JSON.parse(localStorage.getItem('user') || 'null');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="w-full">
        {/* Top bar - hidden when printing receipt */}
        <header className="no-print bg-white shadow-sm sticky top-0 z-10 w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <StaffPortalHeaderRow
              searchRole="supervisor"
              dashboardPath="/supervisor/dashboard"
              userInitial={userData?.full_name?.charAt(0) || userData?.firstName?.charAt(0) || 'S'}
              userTitle={userData?.full_name || userData?.firstName || 'Supervisor'}
              userSubtitle={`ID: ${userData?.employee_id || userData?.id || 'N/A'}`}
              userExtra={
                userData?.assigned_modules?.length > 0 ? (
                  <span className="text-[10px] text-gray-500 mt-0.5 block truncate">
                    {userData.assigned_modules.map((m) => ({ toilet: 'Toilet', mrf: 'MRF', gaushala: 'Gau Shala' }[m] || m)).join(', ')}
                  </span>
                ) : null
              }
              onProfile={() => setShowProfileModal(true)}
              onLogout={handleLogout}
            />
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
                    {userData?.full_name?.charAt(0) || userData?.firstName?.charAt(0) || 'S'}
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">
                      {userData?.full_name || userData?.firstName || 'Supervisor'}
                    </h4>
                    <p className="text-sm text-gray-500 capitalize">{userData?.role || 'supervisor'}</p>
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

export default SupervisorLayout;
