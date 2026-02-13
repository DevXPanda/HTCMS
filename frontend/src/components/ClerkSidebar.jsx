import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    FileText,
    FilePlus,
    Droplet,
    PlusCircle,
    AlertCircle,
    History,
    LogOut,
    ChevronDown,
    ChevronRight,
    Building,
    Home,
    Calendar,
    Store,
    FileCheck
} from 'lucide-react';

const ClerkSidebar = ({ user, logout, sidebarOpen, setSidebarOpen }) => {
    const navigate = useNavigate();
    const location = useLocation();

    // Use only the user prop - no localStorage fallback to prevent cached data issues
    const role = user?.role || null;
    const userData = user || null;
    const [waterDropdownOpen, setWaterDropdownOpen] = useState(false);
    const [propertiesDropdownOpen, setPropertiesDropdownOpen] = useState(false);
    const [shopTaxDropdownOpen, setShopTaxDropdownOpen] = useState(false);

    // Auto-open dropdowns when on related pages
    useEffect(() => {
        if (location.pathname.includes('/water-applications') || location.pathname.includes('/water-connections')) {
            setWaterDropdownOpen(true);
        }
        if (location.pathname.includes('/property-applications') || location.pathname.includes('/property-connections')) {
            setPropertiesDropdownOpen(true);
        }
        if (location.pathname.includes('/shop-tax') || location.pathname.includes('/shop-registration-requests')) {
            setShopTaxDropdownOpen(true);
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

    // Clerk menu items
    const navItems = [
        { path: '/clerk/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        {
            label: 'Property',
            icon: Building,
            dropdown: true,
            children: [
                // { path: '/clerk/property-applications/new', label: 'New Property Application', icon: FilePlus },
                { path: '/clerk/property-connections', label: 'Existing Property Connection', icon: Home }
            ]
        },
        {
            label: 'Water Applications',
            icon: Droplet,
            dropdown: true,
            children: [
                { path: '/clerk/water-applications', label: 'Connection Requests', icon: Droplet },
                // { path: '/clerk/water-applications/new', label: 'New Water Application', icon: PlusCircle },
                { path: '/clerk/existing-water-connections', label: 'Existing Water Connections', icon: Building }
            ]
        },
        {
            label: 'Shop Tax',
            icon: Store,
            dropdown: true,
            children: [
                { path: '/clerk/shop-tax', label: 'Shop Tax Module', icon: Store },
                { path: '/clerk/shop-registration-requests', label: 'Registration Requests', icon: FileCheck }
            ]
        },
        { path: '/clerk/returned-applications', label: 'Returned Applications', icon: AlertCircle },
        { path: '/clerk/attendance', label: 'My Attendance', icon: Calendar },
        // { path: '/clerk/activity-history', label: 'Activity History', icon: History }
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
                        <p className="text-sm text-gray-500">Clerk Portal</p>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                        {navItems.map((item) => {
                            const Icon = item.icon;

                            if (item.dropdown) {
                                const isDropdownOpen = item.label === 'Water Applications'
                                    ? waterDropdownOpen
                                    : item.label === 'Property'
                                        ? propertiesDropdownOpen
                                        : item.label === 'Shop Tax'
                                            ? shopTaxDropdownOpen
                                            : false;
                                const hasActiveChild = item.children?.some(child =>
                                    location.pathname === child.path || location.pathname.startsWith(child.path + '/')
                                );

                                return (
                                    <div key={item.label}>
                                        <button
                                            onClick={() => {
                                                if (item.label === 'Water Applications') {
                                                    setWaterDropdownOpen(!waterDropdownOpen);
                                                } else if (item.label === 'Property') {
                                                    setPropertiesDropdownOpen(!propertiesDropdownOpen);
                                                } else if (item.label === 'Shop Tax') {
                                                    setShopTaxDropdownOpen(!shopTaxDropdownOpen);
                                                }
                                            }}
                                            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${hasActiveChild
                                                ? 'bg-primary-50 text-primary-600 font-medium'
                                                : 'text-gray-700 hover:bg-gray-100'
                                                }`}
                                        >
                                            <div className="flex items-center">
                                                <Icon className="w-5 h-5 mr-3" />
                                                {item.label}
                                            </div>
                                            {isDropdownOpen ? (
                                                <ChevronDown className="w-4 h-4" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4" />
                                            )}
                                        </button>

                                        {isDropdownOpen && (
                                            <div className="ml-4 mt-1 space-y-1">
                                                {item.children.map((child) => {
                                                    const ChildIcon = child.icon;
                                                    const isActive = location.pathname === child.path ||
                                                        (child.path === '/clerk/shop-tax' && location.pathname.startsWith('/clerk/shop-tax')) ||
                                                        (child.path === '/clerk/shop-registration-requests' && location.pathname.includes('/shop-registration-requests'));

                                                    return (
                                                        <Link
                                                            key={child.path}
                                                            to={child.path}
                                                            onClick={() => setSidebarOpen(false)}
                                                            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${isActive
                                                                ? 'bg-primary-50 text-primary-600 font-medium'
                                                                : 'text-gray-600 hover:bg-gray-100'
                                                                }`}
                                                        >
                                                            <ChildIcon className="w-4 h-4 mr-3" />
                                                            {child.label}
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            }

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

export default ClerkSidebar;
