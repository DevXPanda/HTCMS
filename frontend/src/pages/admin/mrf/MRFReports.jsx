import React, { useState, useEffect } from 'react';
import {
    BarChart3,
    TrendingUp,
    Recycle,
    CheckCircle,
    AlertCircle,
    Calendar,
    Layers,
    Zap
} from 'lucide-react';
import api from '../../../services/api';

const MRFReports = () => {
    const [stats, setStats] = useState({
        totalFacilities: 0,
        activeFacilities: 0,
        maintenanceFacilities: 0,
        totalProcessing: 0,
        efficiency: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const response = await api.get('/mrf/reports/stats');
            if (response.data && response.data.success) {
                setStats(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch MRF reports:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">MRF Operations Report</h1>
                <p className="text-gray-600 text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Live System Analytics
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active Centers</p>
                            <p className="text-3xl font-black text-gray-900 mt-2">{stats.activeFacilities} / {stats.totalFacilities}</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-xl">
                            <Recycle className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                    <div className="mt-4 h-1.5 bg-gray-50 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${(stats.activeFacilities / stats.totalFacilities) * 100}%` }}></div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Processing Volume</p>
                            <p className="text-3xl font-black text-gray-900 mt-2">{stats.totalProcessing} T</p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-xl">
                            <Layers className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                    <p className="text-[10px] text-blue-600 font-bold mt-4 uppercase tracking-wider flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> 12% increase from last month
                    </p>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Efficiency Rate</p>
                            <p className="text-3xl font-black text-gray-900 mt-2">{stats.efficiency}%</p>
                        </div>
                        <div className="p-3 bg-amber-50 rounded-xl">
                            <Zap className="w-6 h-6 text-amber-600" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase tracking-tighter">Optimal</span>
                        <span className="text-[10px] text-gray-400 font-medium">Industry standard: 85%</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-primary-900 rounded-2xl p-8 text-white flex flex-col justify-between">
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest opacity-60 mb-8 text-white">Sustainability Impact</h3>
                        <div className="space-y-6">
                            <div className="flex justify-between items-end border-b border-white/10 pb-4">
                                <span className="text-sm font-medium opacity-80">CO2 Emissions Saved</span>
                                <span className="text-xl font-bold">14.2 Tons</span>
                            </div>
                            <div className="flex justify-between items-end border-b border-white/10 pb-4">
                                <span className="text-sm font-medium opacity-80">Waste Diverted from Landfill</span>
                                <span className="text-xl font-bold">92%</span>
                            </div>
                            <div className="flex justify-between items-end">
                                <span className="text-sm font-medium opacity-80">Revenue Generated</span>
                                <span className="text-xl font-bold">₹ 1.2M</span>
                            </div>
                        </div>
                    </div>
                    <button className="mt-8 w-full py-3 bg-white/10 hover:bg-white/20 transition-colors border border-white/20 rounded-xl text-xs font-bold uppercase tracking-widest">
                        Download Environmental Audit
                    </button>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Resource Allocation</h3>
                    <div className="space-y-6 pt-4">
                        {[
                            { label: 'Energy Usage', val: 78, color: 'bg-primary-600' },
                            { label: 'Water Usage', val: 45, color: 'bg-blue-500' },
                            { label: 'Personnel', val: 92, color: 'bg-indigo-500' }
                        ].map((item, idx) => (
                            <div key={idx} className="space-y-2">
                                <div className="flex justify-between text-xs font-bold uppercase overflow-hidden">
                                    <span className="text-gray-900">{item.label}</span>
                                    <span className="text-gray-400">{item.val}% Utilization</span>
                                </div>
                                <div className="h-2 bg-gray-50 rounded-full overflow-hidden">
                                    <div className={`h-full ${item.color}`} style={{ width: `${item.val}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MRFReports;
