import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Droplet, FileText, Receipt, ClipboardList, CreditCard, PlusCircle, TrendingUp, AlertCircle, Zap } from 'lucide-react';
import api from '../../services/api';

const WaterTaxModule = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchStats(); }, []);

    const fetchStats = async () => {
        try {
            const response = await api.get('/reports/dashboard');
            if (response.data && response.data.success) {
                setStats(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch water tax stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const modules = [
        {
            title: 'Water Connections',
            description: 'Manage water connection records',
            icon: Droplet,
            link: '/water/connections',
            color: 'bg-blue-500'
        },
        {
            title: 'Assessments',
            description: 'View and manage water tax assessments',
            icon: FileText,
            link: '/water/assessments',
            color: 'bg-green-500'
        },
        {
            title: 'Water Bills',
            description: 'Track water bills and demands',
            icon: Receipt,
            link: '/water/bills',
            color: 'bg-yellow-500'
        },
        {
            title: 'Demands',
            description: 'View and manage water tax demands',
            icon: Receipt,
            link: '/demands?module=WATER',
            color: 'bg-amber-500'
        },
        {
            title: 'Generate Water Tax Demands',
            description: 'Bulk generate water tax demands only',
            icon: Zap,
            link: '/demands/generate/water',
            color: 'bg-cyan-600'
        },
        {
            title: 'Connection Requests',
            description: 'Manage new connection applications',
            icon: ClipboardList,
            link: '/water/connection-requests',
            color: 'bg-orange-500'
        },
        {
            title: 'Payments',
            description: 'Record and track water payments',
            icon: CreditCard,
            link: '/water/payments',
            color: 'bg-purple-500'
        }
    ];

    const fmtCur = (val) => '₹' + parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Water Tax Module</h1>
                    <p className="text-gray-600">Manage all water tax related activities</p>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-4">
                {loading || !stats ? (
                    Array.from({ length: 4 }).map((_, i) => (
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
                    <div className="bg-white rounded-lg shadow p-4 border-l-4 border-cyan-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-medium">Connections</p>
                                <p className="text-xl font-bold text-gray-900">{(stats.totalWaterConnections || 0).toLocaleString()}</p>
                            </div>
                            <Droplet className="w-5 h-5 text-cyan-500" />
                        </div>
                        <p className="text-xs text-green-600 mt-1">active connections</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-medium">Revenue</p>
                                <p className="text-xl font-bold text-green-600">{fmtCur(stats.totalWaterRevenue)}</p>
                            </div>
                            <TrendingUp className="w-5 h-5 text-green-500" />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">total collected</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-medium">Outstanding</p>
                                <p className="text-xl font-bold text-red-600">{fmtCur(stats.waterOutstanding)}</p>
                            </div>
                            <AlertCircle className="w-5 h-5 text-red-500" />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">unpaid bills</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-medium">Collection Rate</p>
                                <p className="text-xl font-bold text-purple-600">
                                    {(parseFloat(stats.totalWaterRevenue || 0) + parseFloat(stats.waterOutstanding || 0)) > 0
                                        ? ((parseFloat(stats.totalWaterRevenue || 0) / (parseFloat(stats.totalWaterRevenue || 0) + parseFloat(stats.waterOutstanding || 0))) * 100).toFixed(1)
                                        : 0}%
                                </p>
                            </div>
                            <CreditCard className="w-5 h-5 text-purple-500" />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">revenue vs outstanding</p>
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
                    <Link to="/water/assessments/new" className="btn btn-primary flex items-center">
                        <PlusCircle className="h-4 w-4 mr-2" /> New Assessment
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default WaterTaxModule;
