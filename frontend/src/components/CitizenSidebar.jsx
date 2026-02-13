import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Home,
  FileText,
  CreditCard,
  LogOut,
  Bell,
  History,
  Droplet,
  PlusCircle,
  Store,
  FileCheck
} from 'lucide-react';

const CitizenSidebar = ({ user, logout, sidebarOpen, setSidebarOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Use only the user prop - no localStorage fallback to prevent cached data issues
  const role = user?.role || null;
  const userData = user || null;

  const handleLogout = async () => {
    // Call logout function from context to clear auth data
    await logout();
    // Navigate to citizen login using React Router with replace to prevent back navigation
    navigate('/citizen/login', { replace: true });
  };

  // Format role for display - use exact role from localStorage, no mapping
  const getRoleDisplay = (role) => {
    if (!role) return 'Unknown';
    // Use exact role value - capitalize first letter only
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  // Citizen menu items
  const navItems = [
    { path: '/citizen/dashboard', label: 'My Dashboard', icon: LayoutDashboard },
    { path: '/citizen/properties', label: 'My Properties', icon: Home },
    { path: '/citizen/demands', label: 'My Demands', icon: FileText },
    { path: '/citizen/water-connections', label: 'Water Connections', icon: Droplet },
    { path: '/citizen/water-connection-request', label: 'Request Water Connection', icon: PlusCircle },
    { path: '/citizen/shops', label: 'My Shops', icon: Store },
    { path: '/citizen/shop-registration-requests', label: 'Shop Registration Requests', icon: FileCheck },
    { path: '/citizen/notices', label: 'My Notices', icon: Bell },
    { path: '/citizen/payments', label: 'Payment History', icon: CreditCard },
    { path: '/citizen/activity-history', label: 'Activity History', icon: History }
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
            <p className="text-sm text-gray-500">Citizen Portal</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path ||
                (item.path === '/citizen/shop-registration-requests' && location.pathname.includes('/shop-registration-requests'));
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

export default CitizenSidebar;
