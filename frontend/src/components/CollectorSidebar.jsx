import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  MapPin,
  Home,
  CreditCard,
  LogOut,
  History
} from 'lucide-react';

const CollectorSidebar = ({ user, logout, sidebarOpen, setSidebarOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const role = localStorage.getItem('role') || user?.role || null;
  const userData = JSON.parse(localStorage.getItem('user') || 'null') || user;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Format role for display - use exact role from localStorage, no mapping
  const getRoleDisplay = (role) => {
    if (!role) return 'Unknown';
    // Use exact role value - capitalize first letter only
    // Handle tax_collector specially for display
    if (role === 'tax_collector') return 'Tax Collector';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  // Collector menu items
  const navItems = [
    { path: '/collector/dashboard', label: 'Collector Dashboard', icon: LayoutDashboard },
    { path: '/collector/wards', label: 'Assigned Wards', icon: MapPin },
    { path: '/collector/properties', label: 'Property List', icon: Home },
    { path: '/collector/collections', label: 'Collections', icon: CreditCard },
    { path: '/collector/activity-logs', label: 'Activity Logs', icon: History }
  ];

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
        className={`fixed top-0 left-0 z-30 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b">
            <h1 className="text-xl font-bold text-primary-600">HTCMS</h1>
            <p className="text-sm text-gray-500">Collector Portal</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-600 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User info and logout */}
          <div className="p-4 border-t">
            <div className="mb-3">
              <p className="text-sm font-medium text-gray-900">
                {userData?.firstName} {userData?.lastName}
              </p>
              <p className="text-xs text-gray-500">{getRoleDisplay(role)}</p>
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

export default CollectorSidebar;
