import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { User, LogOut, Home, LayoutDashboard, X } from 'lucide-react';
import { useStaffAuth } from '../contexts/StaffAuthContext';

const SupervisorLayout = () => {
  const { user, logout } = useStaffAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname === '/supervisor/dashboard';

  const handleLogout = async () => {
    await logout();
    navigate('/staff/login', { replace: true });
  };

  const userData = user || JSON.parse(localStorage.getItem('user') || 'null');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="w-full">
        <header className="bg-white shadow-sm sticky top-0 z-10 w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold text-primary-600">Supervisor Portal</h1>
                <nav className="flex gap-2">
                  <button
                    onClick={() => navigate('/supervisor/dashboard')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isDashboard ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    <LayoutDashboard className="w-5 h-5" />
                    Dashboard
                  </button>
                </nav>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/supervisor/dashboard')}
                  className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-full transition-colors"
                  title="Dashboard"
                >
                  <Home className="w-5 h-5" />
                </button>
                <div className="hidden md:flex items-center space-x-3 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-sm font-bold">
                    {userData?.full_name?.charAt(0) || 'S'}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-900">{userData?.full_name || 'Supervisor'}</span>
                    <span className="text-xs text-gray-500">ID: {userData?.employee_id || userData?.id || 'N/A'}</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-full transition-colors"
                  title="Profile"
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
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SupervisorLayout;
