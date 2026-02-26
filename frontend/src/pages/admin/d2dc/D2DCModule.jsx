import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Truck, User, LogOut, X, Home, FileText } from 'lucide-react';
import D2DCLayout from './D2DCLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { useStaffAuth } from '../../../contexts/StaffAuthContext';

const D2DCModule = () => {
    const navigate = useNavigate();
    const { user: authUser, logout: authLogout } = useAuth();
    const { user: staffUser, logout: staffLogout } = useStaffAuth();
    const [showProfileModal, setShowProfileModal] = useState(false);

    const user = authUser || staffUser;

    const handleLogout = async () => {
        if (authUser) {
            await authLogout();
            navigate('/admin/login');
        } else if (staffUser) {
            await staffLogout();
            navigate('/staff/login');
        } else {
            navigate('/login');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Standard Header matching AdminLayout */}
            <header className="bg-white shadow-sm sticky top-0 z-10 w-full">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center gap-4">
                            <h1 className="text-xl font-bold text-primary-600">Bizwoke Management System</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => navigate(authUser ? '/admin/dashboard' : (staffUser ? `/${staffUser.role}/dashboard` : '/'))}
                                className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-full transition-colors"
                                title="Dashboard Home"
                            >
                                <Home className="w-5 h-5" />
                            </button>

                            <span className="text-sm text-gray-600 hidden md:block">
                                Welcome, <span className="font-medium">{user?.firstName}</span>
                            </span>

                            <button
                                onClick={() => setShowProfileModal(true)}
                                className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-full transition-colors"
                                title="My Profile"
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

            {/* Profile Modal */}
            {showProfileModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h3 className="text-lg font-semibold text-gray-900">My Profile</h3>
                            <button
                                onClick={() => setShowProfileModal(false)}
                                className="text-gray-400 hover:text-gray-500"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center space-x-4 mb-6">
                                <div className="h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-xl font-bold">
                                    {user?.firstName?.charAt(0) || 'U'}
                                </div>
                                <div>
                                    <h4 className="text-lg font-medium text-gray-900">
                                        {user?.firstName} {user?.lastName}
                                    </h4>
                                    <p className="text-sm text-gray-500 capitalize">{user?.role}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="bg-gray-50 p-3 rounded-md">
                                    <p className="text-xs text-gray-500 uppercase">Email</p>
                                    <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-md">
                                    <p className="text-xs text-gray-500 uppercase">Phone</p>
                                    <p className="text-sm font-medium text-gray-900">{user?.phoneNumber || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 px-4 py-3 sm:px-6 flex flex-row-reverse">
                            <button
                                type="button"
                                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
                                onClick={() => setShowProfileModal(false)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="space-y-6">
                    {/* D2DC Module Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="ds-page-title">D2DC Module</h1>
                            <p className="ds-page-subtitle">Door-to-door collection and field monitoring</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link
                                to="/demands?module=D2DC"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium"
                            >
                                <FileText className="w-4 h-4" /> View D2DC Demands
                            </Link>
                            <div className="p-3 bg-purple-100 rounded-full">
                                <Truck className="w-6 h-6 text-purple-600" />
                            </div>
                        </div>
                    </div>

                    {/* Content Area - Renders the Role-Based Layout */}
                    <div className="min-h-[600px]">
                        <D2DCLayout />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default D2DCModule;
