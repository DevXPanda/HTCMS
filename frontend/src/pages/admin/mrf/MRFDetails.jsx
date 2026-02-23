import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Recycle,
    MapPin,
    CheckCircle,
    XCircle,
    Edit,
    BarChart3,
    Clock,
    Trash2
} from 'lucide-react';
import api from '../../../services/api';
import MrfSalesLedger from './MrfSalesLedger';

const MRFDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [facility, setFacility] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMRFDetails();
    }, [id]);

    const fetchMRFDetails = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/mrf/facilities/${id}`);
            if (response.data && response.data.success) {
                setFacility(response.data.data.facility);
            }
        } catch (error) {
            console.error('Failed to fetch MRF details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to deactivate this MRF facility?')) {
            try {
                await api.delete(`/mrf/facilities/${id}`);
                alert('Facility deactivated successfully');
                navigate('/mrf/management');
            } catch (error) {
                console.error('Failed to delete facility:', error);
            }
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (!facility) {
        return (
            <div className="text-center p-12 bg-white rounded-xl border border-gray-100 shadow-sm">
                <p className="text-gray-500">MRF facility not found.</p>
                <button onClick={() => navigate(-1)} className="mt-4 text-primary-600 font-semibold underline">Go Back</button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <Recycle className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{facility.name}</h1>
                            <p className="text-gray-500 text-sm flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" /> {facility.location}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Link
                        to={`/mrf/facilities/${id}/edit`}
                        className="btn btn-secondary flex items-center gap-2 text-sm"
                    >
                        <Edit className="w-4 h-4" /> Edit
                    </Link>
                    <button
                        onClick={handleDelete}
                        className="btn btn-outline border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-2 text-sm"
                    >
                        <Trash2 className="w-4 h-4" /> Deactivate
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Summary */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Status</p>
                            <div className="flex items-center gap-1.5 mt-1">
                                {facility.status === 'active' ? (
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                    <XCircle className="w-4 h-4 text-red-500" />
                                )}
                                <span className={`text-sm font-bold uppercase ${facility.status === 'active' ? 'text-green-700' : 'text-red-700'}`}>
                                    {facility.status}
                                </span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Ward</p>
                            <p className="text-sm font-bold text-gray-900 mt-1">{facility.ward?.wardName || 'N/A'}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Daily Capacity</p>
                            <p className="text-sm font-bold text-gray-900 mt-1">5.0 Tons (Est)</p>
                        </div>
                        <div className="space-y-1 text-right">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Commissioned</p>
                            <p className="text-sm font-bold text-gray-900 mt-1">{new Date(facility.created_at).toLocaleDateString()}</p>
                        </div>
                    </div>

                    {/* Placeholders for Processing & Inventory */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-50 bg-gray-50 flex justify-between items-center">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-primary-600" />
                                Material Processing History
                            </h3>
                            <button className="text-xs font-semibold text-primary-600 hover:underline">View All Logs</button>
                        </div>
                        <div className="p-12 text-center text-gray-400">
                            <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p className="text-sm font-medium">No processing logs available for this period.</p>
                            <button className="mt-4 px-4 py-2 bg-primary-50 text-primary-600 rounded-lg text-xs font-bold">
                                Log New Processing Batch
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Insights */}
                <div className="space-y-6">
                    <div className="bg-primary-900 rounded-2xl p-6 text-white shadow-xl shadow-primary-900/10">
                        <h3 className="text-xs font-bold uppercase tracking-widest mb-6 opacity-60">Inventory Breakdown</h3>
                        <div className="space-y-5">
                            {[
                                { name: 'Plastic', pct: 45, color: 'bg-blue-400' },
                                { name: 'Paper/Cardboard', pct: 30, color: 'bg-amber-400' },
                                { name: 'Glass', pct: 15, color: 'bg-cyan-400' },
                                { name: 'Metal', pct: 10, color: 'bg-rose-400' }
                            ].map((item, idx) => (
                                <div key={idx} className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold uppercase">
                                        <span>{item.name}</span>
                                        <span>{item.pct}%</span>
                                    </div>
                                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                        <div className={`h-full ${item.color}`} style={{ width: `${item.pct}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm text-center">
                        <h3 className="text-xs font-bold text-gray-400 uppercase mb-4">Cumulative Impact</h3>
                        <div className="space-y-1">
                            <p className="text-3xl font-black text-gray-900">124.5</p>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Tons Produced</p>
                        </div>
                        <hr className="my-6 border-gray-50" />
                        <div className="space-y-1">
                            <p className="text-3xl font-black text-green-600">88%</p>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Efficiency Rate</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MRFDetails;
