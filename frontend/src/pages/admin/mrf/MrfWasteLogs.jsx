import React, { useState, useEffect } from 'react';
import {
    Plus,
    Calendar,
    Trash2,
    Package,
    Clock,
    ArrowRight,
    TrendingUp,
    AlertCircle,
    CheckCircle,
    User,
    Recycle,
    Truck
} from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const MrfWasteLogs = ({ facilityId, wasteTypes = [] }) => {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        entry_date: new Date().toISOString().split('T')[0],
        waste_type: wasteTypes[0] || '',
        quantity_kg: '',
        source: '',
        received_by_id: ''
    });
    const [receivers, setReceivers] = useState([]);

    useEffect(() => {
        if (facilityId) {
            fetchEntries();
            fetchReceivers();
        }
    }, [facilityId]);

    const fetchEntries = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/mrf/waste-entries?facility_id=${facilityId}`);
            if (response.data.success) {
                setEntries(response.data.data.entries);
            }
        } catch (error) {
            console.error('Failed to fetch waste entries:', error);
            toast.error('Failed to load waste logs');
        } finally {
            setLoading(false);
        }
    };

    const fetchReceivers = async () => {
        try {
            const response = await api.get('/admin-management/employees?limit=200');
            if (response.data) {
                setReceivers(response.data.employees || []);
            }
        } catch (error) {
            console.error('Failed to fetch receivers:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/mrf/waste-entries', {
                ...formData,
                mrf_facility_id: facilityId
            });
            if (response.data.success) {
                toast.success('Waste entry logged successfully');
                setShowForm(false);
                fetchEntries();
                setFormData({
                    entry_date: new Date().toISOString().split('T')[0],
                    waste_type: wasteTypes[0] || '',
                    quantity_kg: '',
                    source: '',
                    received_by_id: ''
                });
            }
        } catch (error) {
            console.error('Failed to log waste entry:', error);
            toast.error(error.response?.data?.message || 'Failed to log entry');
        }
    };

    if (loading) return <div className="p-12 text-center text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">Synchronizing Waste Logs...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                        <Recycle className="w-5 h-5 text-primary-600" /> Material Receipt History
                    </h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight mt-1">Showing last 30 daily entries for this facility</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-600 transition-all shadow-lg shadow-gray-900/10 active:scale-95"
                >
                    {showForm ? 'Cancel' : <><Plus className="w-4 h-4" /> Log Entry</>}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-100 rounded-2xl p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Date</label>
                        <input
                            type="date"
                            required
                            value={formData.entry_date}
                            onChange={e => setFormData({ ...formData, entry_date: e.target.value })}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Material Type</label>
                        <select
                            required
                            value={formData.waste_type}
                            onChange={e => setFormData({ ...formData, waste_type: e.target.value })}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                        >
                            {wasteTypes.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Quantity (KG)</label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            placeholder="0.00"
                            value={formData.quantity_kg}
                            onChange={e => setFormData({ ...formData, quantity_kg: e.target.value })}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Source (Collector/Vendor)</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Ward 04 Collection"
                            value={formData.source}
                            onChange={e => setFormData({ ...formData, source: e.target.value })}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                        />
                    </div>
                    <div className="lg:col-span-3 space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Received By</label>
                        <select
                            required
                            value={formData.received_by_id}
                            onChange={e => setFormData({ ...formData, received_by_id: e.target.value })}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                        >
                            <option value="">Select Employee</option>
                            {receivers.map(r => <option key={r.id} value={r.id}>{r.full_name} ({r.role})</option>)}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button type="submit" className="w-full bg-primary-600 text-white rounded-xl py-3 font-black text-[10px] uppercase tracking-widest hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20">
                            Save Entry
                        </button>
                    </div>
                </form>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date / Time</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Material</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Quantity</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Source</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Received By</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {entries.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                                        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-10" />
                                        <p className="text-[10px] font-bold uppercase tracking-widest">No waste entries found for this period</p>
                                    </td>
                                </tr>
                            ) : (
                                entries.map((entry) => (
                                    <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-bold text-gray-900">{new Date(entry.entry_date).toLocaleDateString()}</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">{new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-gray-50 text-gray-400 rounded-lg">
                                                    <Package className="w-3.5 h-3.5" />
                                                </div>
                                                <span className="text-sm font-bold text-gray-700 capitalize">{entry.waste_type}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-sm font-black text-primary-600">{entry.quantity_kg} KG</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-gray-500">
                                                <Truck className="w-3.5 h-3.5" />
                                                <span className="text-xs font-bold">{entry.source}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 bg-primary-50 rounded-full flex items-center justify-center text-[10px] font-bold text-primary-600">
                                                    {entry.receiver?.full_name?.charAt(0) || 'U'}
                                                </div>
                                                <span className="text-xs font-bold text-gray-700">{entry.receiver?.full_name || 'Unknown'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                                <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">Logged</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default MrfWasteLogs;
