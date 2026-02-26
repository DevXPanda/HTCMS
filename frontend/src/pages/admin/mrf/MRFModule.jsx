import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useBackTo } from '../../../contexts/NavigationContext';
import {
    Recycle,
    BarChart3,
    Users,
    PlusCircle,
    Package,
    Wrench,
    TrendingUp,
    CheckCircle
} from 'lucide-react';
import api from '../../../services/api';

const MRFModule = () => {
    useBackTo('/dashboard');
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await api.get('/mrf/reports/stats');
            if (response.data && response.data.success) {
                setStats(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch MRF stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const modules = [
        {
            title: 'MRF Centers',
            description: 'View and manage all material recovery facilities',
            icon: Recycle,
            link: '/mrf/management',
            color: 'bg-green-500'
        },
        {
            title: 'Worker Assignment',
            description: 'Assign workers to MRF facilities',
            icon: Users,
            link: '/mrf/worker-assignment',
            color: 'bg-blue-500'
        },
        {
            title: 'Reports & Analytics',
            description: 'View reports and analytics',
            icon: BarChart3,
            link: '/mrf/reports',
            color: 'bg-purple-500'
        }
    ];

    return (
        <div className="space-y-6">
            <div className="ds-page-header">
                <div>
                    <h1 className="ds-page-title">Material Recovery Facility (MRF)</h1>
                    <p className="ds-page-subtitle">Manage recycling and waste processing centers</p>
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
                ) : (
                    <>
                        <div className="stat-card border-l-4 border-green-500">
                            <div className="stat-card-title flex items-center justify-between">
                                <span>Centers</span>
                                <Recycle className="w-5 h-5 text-green-500" />
                            </div>
                            <p className="stat-card-value">{stats.totalFacilities || 0}</p>
                            <p className="text-xs text-green-600 mt-1">{stats.activeFacilities || 0} active</p>
                        </div>
                        <div className="stat-card border-l-4 border-orange-500">
                            <div className="stat-card-title flex items-center justify-between">
                                <span>Maintenance</span>
                                <Wrench className="w-5 h-5 text-orange-500" />
                            </div>
                            <p className="stat-card-value">{stats.maintenanceFacilities || 0}</p>
                            <p className="text-xs text-gray-500 mt-1">under maintenance</p>
                        </div>
                        <div className="stat-card border-l-4 border-blue-500">
                            <div className="stat-card-title flex items-center justify-between">
                                <span>Processing</span>
                                <Package className="w-5 h-5 text-blue-500" />
                            </div>
                            <p className="stat-card-value">
                                {typeof stats.totalProcessing === 'number'
                                    ? stats.totalProcessing.toFixed(1)
                                    : (stats.totalProcessing || 0)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">tonnes processed</p>
                        </div>
                        <div className="stat-card border-l-4 border-purple-500">
                            <div className="stat-card-title flex items-center justify-between">
                                <span>Efficiency</span>
                                <TrendingUp className="w-5 h-5 text-purple-500" />
                            </div>
                            <p className="stat-card-value text-purple-600">
                                {stats.efficiency != null ? `${stats.efficiency}%` : 'N/A'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">overall</p>
                        </div>
                        <div className="stat-card border-l-4 border-teal-500">
                            <div className="stat-card-title flex items-center justify-between">
                                <span>Status</span>
                                <CheckCircle className="w-5 h-5 text-teal-500" />
                            </div>
                            <p className="stat-card-value text-teal-600">
                                {stats.activeFacilities || 0}/{stats.totalFacilities || 0}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">operational</p>
                        </div>
                    </>
                )}
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
                        to="/mrf/facilities/new"
                        className="btn btn-primary flex items-center"
                    >
                        <PlusCircle className="h-4 w-4 mr-2" /> Add MRF Center
                    </Link>
                    <Link
                        to="/mrf/management"
                        className="btn btn-secondary flex items-center"
                    >
                        <Recycle className="h-4 w-4 mr-2" /> View All Centers
                    </Link>
                    <Link
                        to="/mrf/reports"
                        className="btn btn-secondary flex items-center"
                    >
                        <BarChart3 className="h-4 w-4 mr-2" /> View Reports
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default MRFModule;
