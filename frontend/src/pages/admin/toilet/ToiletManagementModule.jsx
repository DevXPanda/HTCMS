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
            <div className="ds-page-header">
                <div>
                    <h1 className="ds-page-title">Toilet Management Module</h1>
                    <p className="ds-page-subtitle">Manage all public toilet facilities and operations</p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {loading || !stats ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="stat-card border-l-4 border-gray-200 animate-pulse">
                            <div className="h-4 w-20 bg-gray-200 rounded" />
                            <div className="h-6 w-12 bg-gray-200 rounded mt-2" />
                        </div>
                    ))
                ) : (<>
                    <div className="stat-card border-l-4 border-pink-500">
                        <div className="stat-card-title flex items-center justify-between">
                            <span>Facilities</span>
                            <Bath className="w-5 h-5 text-pink-500" />
                        </div>
                        <p className="stat-card-value">{stats.totalFacilities || 0}</p>
                        <p className="text-xs text-green-600 mt-1">{stats.activeFacilities || 0} operational</p>
                    </div>
                    <div className="stat-card border-l-4 border-blue-500">
                        <div className="stat-card-title flex items-center justify-between">
                            <span>Inspections</span>
                            <ClipboardCheck className="w-5 h-5 text-blue-500" />
                        </div>
                        <p className="stat-card-value">{stats.totalInspections || 0}</p>
                        <p className="text-xs text-gray-500 mt-1">total conducted</p>
                    </div>
                    <div className="stat-card border-l-4 border-red-500">
                        <div className="stat-card-title flex items-center justify-between">
                            <span>Complaints</span>
                            <AlertCircle className="w-5 h-5 text-red-500" />
                        </div>
                        <p className="stat-card-value">{stats.activeComplaints || stats.pendingComplaints || 0}</p>
                        <p className="text-xs text-red-600 mt-1">pending resolution</p>
                    </div>
                    <div className="stat-card border-l-4 border-orange-500">
                        <div className="stat-card-title flex items-center justify-between">
                            <span>Maintenance</span>
                            <Wrench className="w-5 h-5 text-orange-500" />
                        </div>
                        <p className="stat-card-value">{stats.totalMaintenance || stats.maintenanceRecords || 0}</p>
                        <p className="text-xs text-gray-500 mt-1">records logged</p>
                    </div>
                    <div className="stat-card border-l-4 border-green-500">
                        <div className="stat-card-title flex items-center justify-between">
                            <span>Hygiene Score</span>
                            <CheckCircle className="w-5 h-5 text-green-500" />
                        </div>
                        <p className="stat-card-value text-green-600">
                            {stats.avgHygieneScore || stats.averageRating
                                ? parseFloat(stats.avgHygieneScore || stats.averageRating || 0).toFixed(1)
                                : 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">average rating</p>
                    </div>
                </>)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modules.map((module, index) => (
                    <Link
                        key={index}
                        to={module.link}
                        className="card card-hover flex items-center gap-4 p-6"
                    >
                        <div className={`p-3 rounded-full ${module.color} text-white shrink-0`}>
                            <module.icon className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="ds-section-title">{module.title}</h3>
                            <p className="text-sm text-gray-500">{module.description}</p>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="card">
                <h2 className="ds-section-title mb-4">Quick Actions</h2>
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
