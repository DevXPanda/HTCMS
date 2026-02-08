import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Droplets,
  History,
  LogOut,
  User,
  Calendar
} from 'lucide-react';

const OfficerSidebar = ({ user, logout, sidebarOpen, setSidebarOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    {
      title: 'Dashboard',
      path: '/officer/dashboard',
      icon: LayoutDashboard
    },
    {
      title: 'Property Applications',
      path: '/officer/property-applications',
      icon: FileText
    },
    {
      title: 'Water Requests',
      path: '/officer/water-requests',
      icon: Droplets
    },
    {
      title: 'Decision History',
      path: '/officer/decision-history',
      icon: History
    },
    {
      title: 'My Attendance',
      path: '/officer/attendance',
      icon: Calendar
    }
  ];

  const handleLogout = async () => {
    // Call logout function from context to clear auth data
    await logout();
    // Navigate to staff login using React Router with replace to prevent back navigation
    navigate('/staff/login', { replace: true });
  };

  // Format role for display
  const getRoleDisplay = (role) => {
    if (!role) return 'Unknown';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-30 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b">
            <h1 className="text-xl font-bold text-primary-600">HTCMS</h1>
            <p className="text-sm text-gray-500">Officer Portal</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen && setSidebarOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive
                    ? 'bg-primary-50 text-primary-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.title}
                </NavLink>
              );
            })}
          </nav>

          {/* User info and logout */}
          <div className="p-4 border-t">
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-900">
                {user?.full_name || user?.firstName || 'Staff User'}
              </p>
              <p className="text-xs text-gray-500">{getRoleDisplay(user?.role)}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default OfficerSidebar;
