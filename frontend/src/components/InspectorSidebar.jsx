import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  FileText,
  Droplet,
  Clock,
  Eye,
  LogOut,
  ChevronDown,
  ChevronRight,
  Home,
  Building,
  Calendar
} from 'lucide-react';

const InspectorSidebar = ({ user, logout, sidebarOpen, setSidebarOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const role = localStorage.getItem('role') || user?.role || null;
  const userData = JSON.parse(localStorage.getItem('user') || 'null') || user;

  // Auto-expand menus if on relevant routes
  const [propertyOpen, setPropertyOpen] = useState(location.pathname.startsWith('/inspector/property-applications'));
  const [waterOpen, setWaterOpen] = useState(location.pathname.startsWith('/inspector/water-connections'));
  const [propertiesOpen, setPropertiesOpen] = useState(location.pathname.startsWith('/inspector/properties'));

  // Keep menus open when navigating between relevant routes
  useEffect(() => {
    if (location.pathname.startsWith('/inspector/property-applications')) {
      setPropertyOpen(true);
    }
    if (location.pathname.startsWith('/inspector/water-connections')) {
      setWaterOpen(true);
    }
    if (location.pathname.startsWith('/inspector/properties')) {
      setPropertiesOpen(true);
    }
  }, [location.pathname]);

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

  // Check if any route is active
  const isPropertyActive = location.pathname.startsWith('/inspector/property-applications');
  const isWaterActive = location.pathname.startsWith('/inspector/water-connections');
  const isPropertiesActive = location.pathname.startsWith('/inspector/properties');

  // Property inspection submenu items
  const propertyItems = [
    { path: '/inspector/property-applications', label: 'Pending Applications', icon: FileText },
    { path: '/inspector/property-applications/recent', label: 'Recent Inspections', icon: Clock }
  ];

  // Water inspection submenu items
  const waterItems = [
    { path: '/inspector/water-connections', label: 'Pending Requests', icon: Droplet },
    { path: '/inspector/water-connections/recent', label: 'Recent Inspections', icon: Clock }
  ];

  // Properties submenu items
  const propertiesItems = [
    { path: '/inspector/properties', label: 'All Ward Properties', icon: Building }
  ];

  // Inspector menu items
  const navItems = [
    { path: '/inspector/recent-inspections', label: 'All Recent Inspections', icon: Eye },
    { path: '/inspector/attendance', label: 'My Attendance', icon: Calendar }
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
            <h1 className="text-xl font-bold text-primary-600">TMS</h1>
            <p className="text-sm text-gray-500">Inspector Portal</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {/* Dashboard */}
            <Link
              to="/inspector/dashboard"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center px-4 py-3 rounded-lg transition-colors ${location.pathname === '/inspector/dashboard'
                ? 'bg-primary-50 text-primary-600 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
              <LayoutDashboard className="w-5 h-5 mr-3" />
              Dashboard
            </Link>

            {/* Property Inspections - Collapsible Menu */}
            <div>
              <button
                onClick={() => setPropertyOpen(!propertyOpen)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${isPropertyActive
                  ? 'bg-primary-50 text-primary-600 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                <div className="flex items-center">
                  <FileText className="w-4 h-4 mr-3" />
                  <span>Property Inspections</span>
                </div>
                {propertyOpen ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {/* Property Submenu */}
              {propertyOpen && (
                <div className="ml-4 mt-1 space-y-1">
                  {propertyItems.map((item) => {
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

            {/* Water Inspections - Collapsible Menu */}
            <div>
              <button
                onClick={() => setWaterOpen(!waterOpen)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${isWaterActive
                  ? 'bg-primary-50 text-primary-600 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                <div className="flex items-center">
                  <Droplet className="w-5 h-5 mr-3" />
                  <span>Water Inspections</span>
                </div>
                {waterOpen ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {/* Water Submenu */}
              {waterOpen && (
                <div className="ml-4 mt-1 space-y-1">
                  {waterItems.map((item) => {
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

export default InspectorSidebar;
