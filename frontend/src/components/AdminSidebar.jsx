import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Home,
  FileText,
  Receipt,
  CreditCard,
  MapPin,
  Users,
  BarChart3,
  LogOut,
  Bell,
  Shield,
  Clock,
  Droplet,
  ChevronDown,
  ChevronRight,
  Link2,
  FileCheck,
  Wallet,
  TrendingUp,
  Plus
} from 'lucide-react';

const AdminSidebar = ({ user, logout, sidebarOpen, setSidebarOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const role = localStorage.getItem('role') || user?.role || null;
  const userData = JSON.parse(localStorage.getItem('user') || 'null') || user;
  // Auto-expand menus if on relevant routes
  const [waterTaxOpen, setWaterTaxOpen] = useState(location.pathname.startsWith('/water'));
  const [propertiesOpen, setPropertiesOpen] = useState(
    location.pathname.startsWith('/properties')
  );

  // Keep menus open when navigating between relevant routes
  useEffect(() => {
    if (location.pathname.startsWith('/water')) {
      setWaterTaxOpen(true);
    }
    if (location.pathname.startsWith('/properties')) {
      setPropertiesOpen(true);
    }
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Format role for display - use exact role from localStorage, no mapping
  const getRoleDisplay = (role) => {
    if (!role) return 'Unknown';
    // Use exact role value - capitalize first letter only
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  // Check if any water tax route is active
  const isWaterTaxActive = location.pathname.startsWith('/water');
  const isPropertiesActive = location.pathname.startsWith('/properties');

  // Properties submenu items
  const propertiesItems = [
    { path: '/properties', label: 'All Properties', icon: Home },
    { path: '/properties/new', label: 'Add Property', icon: Plus }
  ];

  // Water Tax submenu items
  const waterTaxItems = [
    { path: '/water/connections', label: 'Water Connections', icon: Link2 },
    { path: '/water/connection-requests', label: 'Connection Requests', icon: FileText },
    { path: '/water/assessments', label: 'Water Assessments', icon: FileText }
  ];

  // Admin menu items (admin, assessor, cashier)
  // Note: Dashboard is rendered separately above, so it's not included here
  const navItems = [
    { path: '/assessments', label: 'Tax Assessment', icon: FileText },
    { path: '/demands', label: 'Tax Demand', icon: Receipt },
    { path: '/notices', label: 'Notices & Enforcement', icon: Bell },
    { path: '/payments', label: 'Payments', icon: CreditCard },
    { path: '/wards', label: 'Wards', icon: MapPin },
    { path: '/users', label: 'Collector Management', icon: Users },
    { path: '/attendance', label: 'Attendance', icon: Clock },
    { path: '/field-monitoring', label: 'Field Monitoring', icon: MapPin },
    { path: '/reports', label: 'Reports', icon: BarChart3 },
    { path: '/audit-logs', label: 'Audit Logs', icon: Shield }
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
        className={`fixed top-0 left-0 z-30 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b">
            <h1 className="text-xl font-bold text-primary-600">HTCMS</h1>
            <p className="text-sm text-gray-500">Tax Management System</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {/* Dashboard */}
            <Link
              to="/dashboard"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center px-4 py-3 rounded-lg transition-colors ${location.pathname === '/dashboard'
                ? 'bg-primary-50 text-primary-600 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
              <LayoutDashboard className="w-5 h-5 mr-3" />
              Dashboard
            </Link>

            {/* Properties - Collapsible Menu */}
            <div>
              <button
                onClick={() => setPropertiesOpen(!propertiesOpen)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${isPropertiesActive
                  ? 'bg-primary-50 text-primary-600 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                <div className="flex items-center">
                  <Home className="w-5 h-5 mr-3" />
                  <span>Properties</span>
                </div>
                {propertiesOpen ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {/* Properties Submenu */}
              {propertiesOpen && (
                <div className="ml-4 mt-1 space-y-1">
                  {propertiesItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center px-4 py-2 rounded-lg transition-colors text-sm ${isActive
                          ? 'bg-primary-50 text-primary-600 font-medium'
                          : 'text-gray-600 hover:bg-gray-100'
                          }`}
                      >
                        <Icon className="w-4 h-4 mr-3" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Water Tax Module - Collapsible Menu */}
            <div>
              <button
                onClick={() => setWaterTaxOpen(!waterTaxOpen)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${isWaterTaxActive
                  ? 'bg-primary-50 text-primary-600 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                <div className="flex items-center">
                  <Droplet className="w-5 h-5 mr-3" />
                  <span>Water Tax</span>
                </div>
                {waterTaxOpen ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {/* Water Tax Submenu */}
              {waterTaxOpen && (
                <div className="ml-4 mt-1 space-y-1">
                  {waterTaxItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center px-4 py-2 rounded-lg transition-colors text-sm ${isActive
                          ? 'bg-primary-50 text-primary-600 font-medium'
                          : 'text-gray-600 hover:bg-gray-100'
                          }`}
                      >
                        <Icon className="w-4 h-4 mr-3" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Other menu items */}
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive
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

export default AdminSidebar;
