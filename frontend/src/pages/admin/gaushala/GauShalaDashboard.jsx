import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useBackTo } from '../../../contexts/NavigationContext';
import {
    Beef,
    MapPin,
    ClipboardCheck,
    AlertCircle,
    FileText,
    BarChart3,
    PlusCircle,
    Heart,
    Activity,
    TrendingUp
} from 'lucide-react';
import api from '../../../services/api';

const GauShalaDashboard = () => {
    useBackTo('/dashboard');
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchStats(); }, []);

    const fetchStats = async () => {
        try {
            const response = await api.get('/gaushala/reports/stats');
            if (response.data && response.data.success) {
                setStats(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const modules = [
        {
            title: 'Gaushala Facilities',
            description: 'View and manage all municipal cattle shelters',
            icon: MapPin,
            link: '/gaushala/facilities',
            color: 'bg-orange-500'
        },
        {
            title: 'Cattle Management',
            description: 'Registry of all animals across facilities',
            icon: Beef,
            link: '/gaushala/all-cattle',
            color: 'bg-amber-600'
        },
        {
            title: 'Health & Inspections',
            description: 'Schedule and track veterinary inspections',
            icon: ClipboardCheck,
            link: '/gaushala/inspections',
            color: 'bg-blue-500'
        },
        {
            title: 'Feeding & Inventory',
            description: 'Track fodder distribution and feeding logs',
            icon: FileText,
            link: '/gaushala/feeding',
            color: 'bg-green-500'
        },
        {
            title: 'Complaints',
            description: 'Manage citizen complaints and feedback',
            icon: AlertCircle,
            link: '/gaushala/complaints',
            color: 'bg-red-500'
        },
        {
            title: 'Reports & Analytics',
            description: 'View gaushala reports and analytics',
            icon: BarChart3,
            link: '/gaushala/reports',
            color: 'bg-purple-500'
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gaushala Management Module</h1>
                    <p className="text-gray-600">Manage all municipal cattle shelters, cattle health, and feeding operations</p>
                </div>
            </div>

            {/* Module Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
                {!loading && stats ? (<>
                    <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-medium">Facilities</p>
                                <p className="text-xl font-bold text-gray-900">{stats.totalFacilities}</p>
                            </div>
                            <MapPin className="w-5 h-5 text-blue-500" />
                        </div>
                        <p className="text-xs text-green-600 mt-1">{stats.activeFacilities} active</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4 border-l-4 border-amber-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-medium">Total Cattle</p>
                                <p className="text-xl font-bold text-gray-900">{stats.totalCattle}</p>
                            </div>
                            <Beef className="w-5 h-5 text-amber-600" />
                        </div>
                        <p className="text-xs text-green-600 mt-1">{stats.healthyCattle} healthy</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-medium">Health Rate</p>
                                <p className="text-xl font-bold text-green-600">{stats.healthRate}%</p>
                            </div>
                            <Heart className="w-5 h-5 text-green-500" />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{stats.sickCattle || 0} sick / {stats.criticalCattle || 0} critical</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-medium">Inspections</p>
                                <p className="text-xl font-bold text-gray-900">{stats.totalInspections}</p>
                            </div>
                            <ClipboardCheck className="w-5 h-5 text-purple-500" />
                        </div>
                        <p className="text-xs text-purple-600 mt-1">completed</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-medium">Complaints</p>
                                <p className="text-xl font-bold text-gray-900">{stats.activeComplaints}</p>
                            </div>
                            <AlertCircle className="w-5 h-5 text-red-500" />
                        </div>
                        <p className="text-xs text-red-600 mt-1">{stats.pendingComplaints} pending</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-medium">Today's Fodder</p>
                                <p className="text-xl font-bold text-gray-900">{stats.todayFodder} <span className="text-sm font-normal text-gray-500">KG</span></p>
                            </div>
                            <Activity className="w-5 h-5 text-orange-500" />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{stats.monthlyFodder} KG this month</p>
                    </div>
                </>) : (
                    Array.from({ length: 6 }).map((_, i) => (
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
                )}
            </div>

            {/* Module Cards */}
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

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="flex flex-wrap gap-4">
                    <Link to="/gaushala/facilities/new" className="btn btn-primary flex items-center">
                        <PlusCircle className="h-4 w-4 mr-2" /> Add New Gaushala
                    </Link>
                    <Link to="/gaushala/facilities" className="btn btn-secondary flex items-center">
                        <Beef className="h-4 w-4 mr-2" /> Register New Animal
                    </Link>
                    <Link to="/gaushala/inspections/new" className="btn btn-secondary flex items-center">
                        <ClipboardCheck className="h-4 w-4 mr-2" /> Schedule Inspection
                    </Link>
                    <Link to="/gaushala/feeding" className="btn btn-secondary flex items-center">
                        <FileText className="h-4 w-4 mr-2" /> Add Feeding Record
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default GauShalaDashboard;
