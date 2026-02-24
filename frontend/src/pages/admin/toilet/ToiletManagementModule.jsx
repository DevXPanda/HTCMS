import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useBackTo } from '../../../contexts/NavigationContext';
import {
    Bath,
    MapPin,
    ClipboardCheck,
    AlertCircle,
    Wrench,
    BarChart3,
    Users,
    PlusCircle,
    FileText,
    Calendar,
    CheckCircle
} from 'lucide-react';
import api from '../../../services/api';

const ToiletManagementModule = () => {
    useBackTo('/dashboard');
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchStats(); }, []);

    const fetchStats = async () => {
        try {
            const response = await api.get('/toilet/reports/stats');
            if (response.data && response.data.success) {
                setStats(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch toilet stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const modules = [
        {
            title: 'Toilet Facilities',
            description: 'View and manage all public toilet facilities',
            icon: Bath,
            link: '/toilet-management/facilities',
            color: 'bg-pink-500'
        },
        {
            title: 'Inspections',
            description: 'Schedule and track toilet inspections',
            icon: ClipboardCheck,
            link: '/toilet-management/inspections',
            color: 'bg-blue-500'
        },
        {
            title: 'Complaints',
            description: 'Manage citizen complaints and feedback',
            icon: AlertCircle,
            link: '/toilet-management/complaints',
            color: 'bg-red-500'
        },
        {
            title: 'Maintenance',
            description: 'Schedule and track maintenance activities',
            icon: Wrench,
            link: '/toilet-management/maintenance',
            color: 'bg-orange-500'
        },
        {
            title: 'Staff Assignment',
            description: 'Assign staff to toilet facilities',
            icon: Users,
            link: '/toilet-management/staff',
            color: 'bg-green-500'
        },
        {
            title: 'Reports & Analytics',
            description: 'View reports and analytics',
            icon: BarChart3,
            link: '/toilet-management/reports',
            color: 'bg-purple-500'
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Toilet Management Module</h1>
                    <p className="text-gray-600">Manage all public toilet facilities and operations</p>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
                {loading || !stats ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="bg-white rounded-lg shadow p-4 border-l-4 border-gray-200 animate-pulse">
                            <div className="flex items-center justify-between">
                                <div className="space-y-2">
                                    <div className="h-3 w-20 bg-gray-200 rounded"></div>
                                    <div className="h-6 w-16 bg-gray-200 rounded"></div>
                                </div>
                                <div className="h-5 w-5 bg-gray-200 rounded"></div>
                            </div>
                            <div className="h-3 w-24 bg-gray-200 rounded mt-2"></div>
                        </div>
                    ))
                ) : (<>
                    <div className="bg-white rounded-lg shadow p-4 border-l-4 border-pink-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-medium">Facilities</p>
                                <p className="text-xl font-bold text-gray-900">{stats.totalFacilities || 0}</p>
                            </div>
                            <Bath className="w-5 h-5 text-pink-500" />
                        </div>
                        <p className="text-xs text-green-600 mt-1">{stats.activeFacilities || 0} operational</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-medium">Inspections</p>
                                <p className="text-xl font-bold text-gray-900">{stats.totalInspections || 0}</p>
                            </div>
                            <ClipboardCheck className="w-5 h-5 text-blue-500" />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">total conducted</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-medium">Complaints</p>
                                <p className="text-xl font-bold text-gray-900">{stats.activeComplaints || stats.pendingComplaints || 0}</p>
                            </div>
                            <AlertCircle className="w-5 h-5 text-red-500" />
                        </div>
                        <p className="text-xs text-red-600 mt-1">pending resolution</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-medium">Maintenance</p>
                                <p className="text-xl font-bold text-gray-900">{stats.totalMaintenance || stats.maintenanceRecords || 0}</p>
                            </div>
                            <Wrench className="w-5 h-5 text-orange-500" />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">records logged</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-medium">Hygiene Score</p>
                                <p className="text-xl font-bold text-green-600">
                                    {stats.avgHygieneScore || stats.averageRating
                                        ? parseFloat(stats.avgHygieneScore || stats.averageRating || 0).toFixed(1)
                                        : 'N/A'}
                                </p>
                            </div>
                            <CheckCircle className="w-5 h-5 text-green-500" />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">average rating</p>
                    </div>
                </>)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modules.map((module, index) => (
                    <Link
                        key={index}
                        to={module.link}
                        className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
                    >
                        <div className="flex items-center space-x-4">
                            <div className={`p-3 rounded-full ${module.color} text-white`}>
                                <module.icon className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">{module.title}</h3>
                                <p className="text-sm text-gray-500">{module.description}</p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="bg-white rounded-lg shadow p-6 mt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="flex flex-wrap gap-4">
                    <Link
                        to="/toilet-management/facilities/new"
                        className="btn btn-primary flex items-center"
                    >
                        <PlusCircle className="h-4 w-4 mr-2" /> Add New Toilet Facility
                    </Link>
                    <Link
                        to="/toilet-management/inspections/new"
                        className="btn btn-secondary flex items-center"
                    >
                        <ClipboardCheck className="h-4 w-4 mr-2" /> Schedule Inspection
                    </Link>
                    <Link
                        to="/toilet-management/maintenance/new"
                        className="btn btn-secondary flex items-center"
                    >
                        <Wrench className="h-4 w-4 mr-2" /> Schedule Maintenance
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ToiletManagementModule;
