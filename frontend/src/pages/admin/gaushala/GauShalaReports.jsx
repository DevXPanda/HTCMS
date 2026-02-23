import React, { useState, useEffect } from 'react';
import {
    Beef,
    TrendingUp,
    Activity,
    CheckCircle,
    AlertCircle,
    Calendar,
    Heart,
    Stethoscope,
    PieChart
} from 'lucide-react';
import api from '../../../services/api';

const GauShalaReports = () => {
    const [stats, setStats] = useState({
        totalFacilities: 0,
        activeFacilities: 0,
        totalCattle: 0,
        healthyCattle: 0,
        healthRate: 0,
        activeComplaints: 0,
        totalInspections: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReports();
    }, []);

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
                <h1 className="text-2xl font-bold text-gray-900">Gaushala Health & Census Report</h1>
                <p className="text-gray-600 text-sm flex items-center gap-2 italic">
                    <Activity className="w-4 h-4 text-orange-600" /> Automated Welfare Tracking
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Herd Size</p>
                    <div className="flex justify-between items-end">
                        <p className="text-3xl font-black text-gray-900">{stats.totalCattle}</p>
                        <div className="h-8 w-8 bg-orange-50 rounded-lg flex items-center justify-center">
                            <Beef className="w-4 h-4 text-orange-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Health Index</p>
                    <div className="flex justify-between items-end">
                        <p className="text-3xl font-black text-green-600">{stats.healthRate}%</p>
                        <div className="h-8 w-8 bg-green-50 rounded-lg flex items-center justify-center">
                            <Heart className="w-4 h-4 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Inspections</p>
                    <div className="flex justify-between items-end">
                        <p className="text-3xl font-black text-blue-600">{stats.totalInspections}</p>
                        <div className="h-8 w-8 bg-blue-50 rounded-lg flex items-center justify-center">
                            <Stethoscope className="w-4 h-4 text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Pending issues</p>
                    <div className="flex justify-between items-end">
                        <p className="text-3xl font-black text-amber-600">{stats.activeComplaints}</p>
                        <div className="h-8 w-8 bg-amber-50 rounded-lg flex items-center justify-center">
                            <AlertCircle className="w-4 h-4 text-amber-600" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                {/* Census Breakdown */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-50 bg-gray-50 flex justify-between items-center">
                        <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                            <PieChart className="w-4 h-4 text-orange-600" /> Breed & Type Distribution
                        </h3>
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Last updated: Today</span>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="h-2 w-2 rounded-full bg-orange-600"></div>
                            <div className="flex-1 text-sm font-semibold text-gray-700">Holestein Friesian</div>
                            <div className="text-sm font-black text-gray-900">45%</div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="h-2 w-2 rounded-full bg-orange-400"></div>
                            <div className="flex-1 text-sm font-semibold text-gray-700">Gir (Indigenous)</div>
                            <div className="text-sm font-black text-gray-900">30%</div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="h-2 w-2 rounded-full bg-orange-200"></div>
                            <div className="flex-1 text-sm font-semibold text-gray-700">Sahiwal</div>
                            <div className="text-sm font-black text-gray-900">25%</div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-gray-50 text-center">
                            <button className="text-xs font-bold text-primary-600 uppercase tracking-widest hover:underline">
                                Full Census Audit Report
                            </button>
                        </div>
                    </div>
                </div>

                {/* Feeding History Placeholder */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex flex-col justify-between">
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Resource Consumption</h3>
                        <div className="flex items-center gap-6">
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center flex-1">
                                <p className="text-2xl font-black text-gray-900">1.2 T</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Daily Fodder</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center flex-1">
                                <p className="text-2xl font-black text-gray-900">4.5 KL</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Water Supply</p>
                            </div>
                        </div>
                        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3 mt-4">
                            <TrendingUp className="w-5 h-5 text-amber-600" />
                            <p className="text-[10px] text-amber-800 leading-relaxed font-medium">
                                <strong>Inventory Warning:</strong> Fodder stock is below threshold for 3 facilities.
                                <span className="underline ml-1 cursor-pointer">Reorder now.</span>
                            </p>
                        </div>
                    </div>
                    <button className="mt-8 w-full py-4 bg-primary-900 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-colors shadow-xl shadow-primary-900/10">
                        Generate Supply Forecasting
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GauShalaReports;
