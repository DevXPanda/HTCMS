import React, { useState, useEffect } from 'react';
import {
    BarChart3,
    TrendingUp,
    Recycle,
    CheckCircle,
    AlertCircle,
    Calendar,
    Layers,
    Zap,
    Download,
    FileSpreadsheet,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    Filter
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie
} from 'recharts';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const MRFReports = () => {
    const [stats, setStats] = useState({
        totalFacilities: 0,
        activeFacilities: 0,
        maintenanceFacilities: 0,
        totalProcessing: 0,
        efficiency: 0
    });
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    const [chartData, setChartData] = useState([
        { name: 'Plastic', value: 45 },
        { name: 'Paper', value: 25 },
        { name: 'Organic', value: 30 },
        { name: 'Metal', value: 15 },
        { name: 'Glass', value: 10 }
    ]);

    const COLORS = ['#0f172a', '#2563eb', '#10b981', '#f59e0b', '#ef4444'];

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
            toast.error('Failed to load system analytics');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            toast.loading('Preparing CSV export...');
            const response = await api.get(`/mrf/reports/export?startDate=${dateRange.start}&endDate=${dateRange.end}`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `mrf_operational_report_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.dismiss();
            toast.success('Report downloaded successfully');
        } catch (error) {
            console.error('Export failed:', error);
            toast.dismiss();
            toast.error('Failed to export CSV');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50/50">
                <div className="space-y-4 text-center">
                    <div className="relative w-16 h-16 mx-auto">
                        <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-primary-900 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse">Synthesizing Operational Intelligence...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">MRF System Analytics</h1>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary-600" /> Operational efficiency and sustainability impact
                    </p>
                </div>

                <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex gap-2 px-3">
                        <div className="space-y-1">
                            <p className="text-[8px] font-black text-gray-400 uppercase">From</p>
                            <input
                                type="date"
                                value={dateRange.start}
                                onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                                className="text-[10px] font-bold text-gray-900 outline-none w-24 bg-gray-50 rounded px-1"
                            />
                        </div>
                        <div className="space-y-1">
                            <p className="text-[8px] font-black text-gray-400 uppercase">To</p>
                            <input
                                type="date"
                                value={dateRange.end}
                                onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                                className="text-[10px] font-bold text-gray-900 outline-none w-24 bg-gray-50 rounded px-1"
                            />
                        </div>
                    </div>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-5 py-3 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-600 transition-all shadow-lg shadow-gray-900/10 active:scale-95"
                    >
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Active Facilities', val: `${stats.activeFacilities} / ${stats.totalFacilities}`, sub: '92% Operational', icon: Recycle, color: 'text-green-600', bg: 'bg-green-50' },
                    { label: 'Monthly Processing', val: `${stats.totalProcessing} Tons`, sub: '+12.4% vs Prev Month', icon: Layers, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'System Efficiency', val: `${stats.efficiency}%`, sub: 'Above benchmark (85%)', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Carbon Offset', val: '14.2 Tons', sub: 'Equivalent to 645 trees', icon: TrendingUp, color: 'text-primary-600', bg: 'bg-primary-50' }
                ].map((card, i) => (
                    <div key={i} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                            <div className={`p-3 ${card.bg} rounded-2xl`}>
                                <card.icon className={`w-6 h-6 ${card.color}`} />
                            </div>
                            <div className="flex items-center gap-1 text-[10px] font-black text-green-500 uppercase tracking-tighter">
                                <ArrowUpRight className="w-3 h-3" /> 4.2%
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{card.label}</p>
                            <p className="text-2xl font-black text-gray-900 mt-1">{card.val}</p>
                            <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">{card.sub}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-[32px] border border-gray-100 shadow-sm p-8 space-y-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Material Breakdown</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Processed quantity distribution by type</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-primary-900"></div>
                                <span className="text-[8px] font-black text-gray-400 uppercase">Plastic</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                <span className="text-[8px] font-black text-gray-400 uppercase">Paper</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }}
                                />
                                <RechartsTooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-gray-900 text-white p-3 rounded-xl border border-white/10 shadow-xl">
                                                    <p className="text-[10px] font-black uppercase tracking-widest mb-1">{payload[0].payload.name}</p>
                                                    <p className="text-lg font-black">{payload[0].value}% <span className="text-[10px] font-bold opacity-60">Distribution</span></p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Bar dataKey="value" radius={[12, 12, 12, 12]} barSize={40}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="bg-primary-900 rounded-[32px] p-8 text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                            <TrendingUp className="w-24 h-24" />
                        </div>
                        <h3 className="text-xs font-black uppercase tracking-widest opacity-60 mb-8 border-b border-white/10 pb-4">Sustainability Audit</h3>
                        <div className="space-y-6">
                            {[
                                { label: 'Landfill Diversion', val: '92.4%', sub: '+3.1% YOY' },
                                { label: 'Energy Recovery', val: '4.2 MWh', sub: 'Last 30 Days' },
                                { label: 'Revenue Generated', val: '₹ 1.24 Cr', sub: 'Service Sales' }
                            ].map((item, i) => (
                                <div key={i} className="flex justify-between items-end">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase opacity-40">{item.label}</p>
                                        <p className="text-[10px] font-bold opacity-60">{item.sub}</p>
                                    </div>
                                    <p className="text-xl font-black">{item.val}</p>
                                </div>
                            ))}
                        </div>
                        <button className="mt-8 w-full py-4 bg-white text-primary-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/90 transition-all">
                            View Compliance Report
                        </button>
                    </div>

                    <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8 space-y-6">
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Efficiency Benchmarks</h3>
                        <div className="space-y-6">
                            {[
                                { label: 'Sorting Speed', val: 78, color: 'bg-primary-900' },
                                { label: 'Baling Compression', val: 94, color: 'bg-blue-500' },
                                { label: 'Dispatch Lead', val: 65, color: 'bg-indigo-500' }
                            ].map((item, idx) => (
                                <div key={idx} className="space-y-2">
                                    <div className="flex justify-between text-[10px] font-black uppercase">
                                        <span className="text-gray-900">{item.label}</span>
                                        <span className="text-gray-400">{item.val}%</span>
                                    </div>
                                    <div className="h-2 bg-gray-50 rounded-full overflow-hidden">
                                        <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.val}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MRFReports;
