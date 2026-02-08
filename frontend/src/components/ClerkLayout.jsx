import { Outlet } from 'react-router-dom';
import { useStaffAuth } from '../contexts/StaffAuthContext';
import ClerkSidebar from './ClerkSidebar';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

const ClerkLayout = () => {
    const { user, logout } = useStaffAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50">
            <ClerkSidebar
                user={user}
                logout={logout}
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
            />

            {/* Main content */}
            <div className="lg:ml-64">
                {/* Top bar */}
                <header className="bg-white shadow-sm sticky top-0 z-10">
                    <div className="flex items-center justify-between px-6 py-4">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="lg:hidden text-gray-600 hover:text-gray-900"
                        >
                            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                        <div className="flex-1" />
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-600">
                                Welcome, <span className="font-medium">{user?.firstName || user?.full_name || 'User'}</span>
                            </span>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default ClerkLayout;
