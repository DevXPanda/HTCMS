import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { X, Edit2, Save, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import Breadcrumbs from './Breadcrumbs';
import { userAPI } from '../services/api';
import toast from 'react-hot-toast';
import StaffPortalHeaderRow from './StaffPortalHeaderRow';
import useLockBodyScroll from '../hooks/useLockBodyScroll';

const CitizenLayout = () => {
  const { user, logout, updateUser } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  useLockBodyScroll(showProfileModal);
  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  const userData = user || JSON.parse(localStorage.getItem('user') || 'null');

  useEffect(() => {
    if (showProfileModal && userData) {
      setIsEditing(false);
      setEditFirstName(userData?.firstName || '');
      setEditLastName(userData?.lastName || '');
      setEditEmail(userData?.email || '');
      setEditPhone(userData?.phone_number || userData?.phoneNumber || userData?.phone || '');
    }
  }, [showProfileModal]);

  const handleUpdateProfile = async () => {
    if (!editFirstName.trim()) {
      toast.error('First Name cannot be empty');
      return;
    }
    
    setIsSaving(true);
    try {
      const response = await userAPI.update(userData.id, {
        firstName: editFirstName,
        lastName: editLastName,
        email: editEmail,
        phone: editPhone
      });
      
      if (response.data?.success) {
        toast.success('Profile updated successfully');
        const updatedUser = response.data.data?.user || { ...userData, firstName: editFirstName, lastName: editLastName, email: editEmail, phone: editPhone };
        
        // Update local storage and context
        localStorage.setItem('user', JSON.stringify(updatedUser));
        if (typeof updateUser === 'function') {
          updateUser(updatedUser);
        } else {
          // Fallback if context doesn't expose updateUser directly or effectively
          setTimeout(() => window.location.reload(), 1000);
        }
        
        setIsEditing(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Main content */}
      <div className="w-full">
        {/* Top bar - hidden when printing receipt */}
        <header className="no-print bg-white shadow-sm sticky top-0 z-10 w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <StaffPortalHeaderRow
              searchRole="citizen"
              dashboardPath="/citizen/dashboard"
              userInitial={userData?.firstName?.charAt(0) || 'C'}
              userTitle={`${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || 'Citizen'}
              userSubtitle={`ID: ${userData?.id || 'N/A'}`}
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
                <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-6 p-4 rounded-lg border border-gray-100 bg-white shadow-sm">
                  <div className="h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-xl font-bold shrink-0">
                    {userData?.firstName?.charAt(0) || 'C'}
                  </div>
                  <div className="w-full">
                    {isEditing ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editFirstName}
                          onChange={(e) => setEditFirstName(e.target.value)}
                          placeholder="First Name"
                          className="w-1/2 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                        <input
                          type="text"
                          value={editLastName}
                          onChange={(e) => setEditLastName(e.target.value)}
                          placeholder="Last Name"
                          className="w-1/2 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                        />
                      </div>
                    ) : (
                      <h4 className="text-lg font-medium text-gray-900">
                        {userData?.firstName} {userData?.lastName}
                      </h4>
                    )}
                    <p className="text-sm text-gray-500 capitalize">{userData?.role || 'citizen'}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-xs text-gray-500 uppercase">Email</p>
                    {isEditing ? (
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    ) : (
                      <p className="text-sm font-medium text-gray-900">{userData?.email || 'N/A'}</p>
                    )}
                  </div>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-xs text-gray-500 uppercase">Phone</p>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    ) : (
                      <p className="text-sm font-medium text-gray-900">{userData?.phone_number || userData?.phoneNumber || userData?.phone || 'N/A'}</p>
                    )}
                  </div>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-xs text-gray-500 uppercase">User ID</p>
                    <p className="text-sm font-medium text-gray-900">{userData?.id || 'N/A'}</p>
                  </div>
                </div>
              </div>
              <div className="modal-footer flex justify-between">
                {isEditing ? (
                  <>
                    <button type="button" className="btn btn-secondary flex items-center gap-2" onClick={() => setIsEditing(false)} disabled={isSaving}>
                      <XCircle className="w-4 h-4" /> Cancel
                    </button>
                    <button type="button" className="btn btn-primary flex items-center gap-2" onClick={handleUpdateProfile} disabled={isSaving}>
                      {isSaving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className="btn btn-secondary flex items-center gap-2" onClick={() => setIsEditing(true)}>
                      <Edit2 className="w-4 h-4" /> Edit Profile
                    </button>
                    <button type="button" className="btn btn-primary" onClick={() => setShowProfileModal(false)}>
                      Close
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CitizenLayout;
