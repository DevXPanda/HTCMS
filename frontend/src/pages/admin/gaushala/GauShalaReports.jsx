import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useBackTo } from '../../../contexts/NavigationContext';
import {
    Beef,
    TrendingUp,
    Activity,
    CheckCircle,
    AlertCircle,
    Calendar,
    Heart,
    Stethoscope,
    BarChart3,
    ClipboardList,
    MapPin,
    Eye,
    RefreshCw
} from 'lucide-react';
import api from '../../../services/api';

const GauShalaReports = () => {
    useBackTo('/gaushala/management');
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchReports(); }, []);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const response = await api.get('/gaushala/reports/stats');
            if (response.data && response.data.success) {
                setStats(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch Gaushala reports:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading || !stats) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    const facilityRate = stats.totalFacilities > 0
        ? ((stats.activeFacilities / stats.totalFacilities) * 100).toFixed(1) : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
                    <p className="text-gray-600 text-sm">Comprehensive overview of municipal Gaushala operations</p>
                </div>
                <button
                    onClick={fetchReports}
                    className="btn btn-secondary flex items-center gap-2 text-sm"
                >
                    <RefreshCw className="w-4 h-4" /> Refresh
                </button>
            </div>

            {/* Overview Cards — 4 stat cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total Facilities</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.totalFacilities}</p>
                        </div>
                        <BarChart3 className="w-8 h-8 text-blue-500" />
                    </div>
                    <div className="mt-2 flex items-center text-xs">
                        <span className="text-green-600 font-medium">{stats.activeFacilities} Active</span>
                        <span className="text-gray-400 mx-1">•</span>
                        <span className="text-gray-500">{stats.inactiveFacilities} Inactive</span>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total Cattle</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.totalCattle}</p>
                        </div>
                        <Beef className="w-8 h-8 text-orange-500" />
                    </div>
                    <div className="mt-2 flex items-center text-xs">
                        <span className="text-green-600 font-medium">{stats.healthyCattle} Healthy</span>
                        <span className="text-gray-400 mx-1">•</span>
                        <span className="text-gray-500">{stats.healthRate}% Rate</span>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Active Complaints</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.activeComplaints}</p>
                        </div>
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <div className="mt-2 flex items-center text-xs">
                        <span className="text-yellow-600 font-medium">{stats.pendingComplaints} Pending</span>
                        <span className="text-gray-400 mx-1">•</span>
                        <span className="text-blue-600">{stats.inProgressComplaints} In Progress</span>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total Inspections</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.totalInspections}</p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-purple-500" />
                    </div>
                    <div className="mt-2 flex items-center text-xs">
                        <span className="text-purple-600 font-medium">Health & Safety Logs</span>
                    </div>
                </div>
            </div>

            {/* Detailed Breakdown — Two column grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Cattle Health Breakdown */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                            <Heart className="w-4 h-4 text-red-500" />
                            Cattle Health Breakdown
                        </h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">Healthy</span>
                                <span className="font-bold text-green-600">{stats.healthyCattle}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${stats.totalCattle > 0 ? (stats.healthyCattle / stats.totalCattle * 100) : 0}%` }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">Sick</span>
                                <span className="font-bold text-red-600">{stats.sickCattle}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                                <div className="bg-red-500 h-2 rounded-full" style={{ width: `${stats.totalCattle > 0 ? (stats.sickCattle / stats.totalCattle * 100) : 0}%` }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">Under Treatment</span>
                                <span className="font-bold text-blue-600">{stats.underTreatmentCattle}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${stats.totalCattle > 0 ? (stats.underTreatmentCattle / stats.totalCattle * 100) : 0}%` }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">Critical</span>
                                <span className="font-bold text-purple-600">{stats.criticalCattle}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                                <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${stats.totalCattle > 0 ? (stats.criticalCattle / stats.totalCattle * 100) : 0}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Operations & Feeding */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                            <Activity className="w-4 h-4 text-blue-500" />
                            Operations Overview
                        </h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">Facility Activation Rate</span>
                                <span className="font-bold text-gray-900">{facilityRate}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                                <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${facilityRate}%` }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">Today's Fodder</span>
                                <span className="font-bold text-green-600">{stats.todayFodder} KG</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                                <div className="bg-green-500 h-2 rounded-full" style={{ width: stats.todayFodder > 0 ? '60%' : '0%' }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">Monthly Fodder Consumed</span>
                                <span className="font-bold text-orange-600">{stats.monthlyFodder} KG</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                                <div className="bg-orange-500 h-2 rounded-full" style={{ width: stats.monthlyFodder > 0 ? '80%' : '0%' }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">Complaints Resolved</span>
                                <span className="font-bold text-green-600">{stats.resolvedComplaints} / {stats.totalComplaints}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                                <div className="bg-green-500 h-2 rounded-full" style={{ width: `${stats.totalComplaints > 0 ? (stats.resolvedComplaints / stats.totalComplaints * 100) : 0}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Facility-wise Breakdown Table */}
            {stats.facilityStats && stats.facilityStats.length > 0 && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary-600" />
                            Facility-wise Breakdown
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Facility Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cattle</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Healthy</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Health Rate</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feeding Logs</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Fodder (KG)</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {stats.facilityStats.map((f) => {
                                    const healthPct = f.cattleCount > 0 ? ((f.healthyCattle / f.cattleCount) * 100).toFixed(0) : 'N/A';
                                    return (
                                        <tr key={f.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm font-medium text-gray-900">{f.name}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase ${f.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {f.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{f.cattleCount}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">{f.healthyCattle}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`text-sm font-bold ${healthPct === 'N/A' ? 'text-gray-400' : parseFloat(healthPct) >= 80 ? 'text-green-600' : parseFloat(healthPct) >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                    {healthPct === 'N/A' ? 'N/A' : `${healthPct}%`}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{f.feedingCount}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{f.totalFodder}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <Link to={`/gaushala/facilities/${f.id}`} className="p-1.5 text-gray-400 hover:text-primary-600 inline-block">
                                                    <Eye className="w-4 h-4" />
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GauShalaReports;
