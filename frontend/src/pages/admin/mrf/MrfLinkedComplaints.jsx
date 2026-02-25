import React, { useState, useEffect } from 'react';
import {
    AlertCircle,
    CheckCircle,
    Clock,
    MessageSquare,
    User,
    MapPin,
    Calendar,
    ArrowRight,
    ExternalLink,
    Filter,
    ShieldAlert
} from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const MrfLinkedComplaints = ({ facilityId }) => {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        if (facilityId) {
            fetchComplaints();
        }
    }, [facilityId]);

    const fetchComplaints = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/mrf/facilities/${facilityId}/complaints`);
            if (response.data.success) {
                setComplaints(response.data.data.complaints);
            }
        } catch (error) {
            console.error('Failed to fetch complaints:', error);
            toast.error('Failed to load linked complaints');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'pending': return 'bg-red-100 text-red-700 border-red-200';
            case 'assigned': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'resolved': return 'bg-green-100 text-green-700 border-green-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const filteredComplaints = filter === 'all'
        ? complaints
        : complaints.filter(c => c.status?.toLowerCase() === filter);

    if (loading) return <div className="p-12 text-center text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">Scanning Linked Complaints...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-red-600" /> Linked Citizen Grievances
                    </h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight mt-1">Issues linked to this MRF or nearby toilet clusters</p>
                </div>
                <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                    {['all', 'pending', 'assigned', 'resolved'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                {filteredComplaints.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-dashed border-gray-100 p-24 text-center space-y-4">
                        <MessageSquare className="w-16 h-16 mx-auto opacity-10 text-gray-400" />
                        <div className="space-y-1">
                            <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">No Complaints Found</h4>
                            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Facility is operating within service levels</p>
                        </div>
                    </div>
                ) : (
                    filteredComplaints.map((complaint) => (
                        <div key={complaint.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group hover:border-red-100 transition-all">
                            <div className="p-6 flex flex-col md:flex-row gap-6">
                                <div className="flex-1 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${getStatusColor(complaint.status)}`}>
                                                {complaint.status}
                                            </span>
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">#{complaint.id}</span>
                                        </div>
                                        <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">{complaint.priority} Priority</span>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">{complaint.complaintType}</h4>
                                        <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{complaint.description}</p>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-50">
                                        <div className="space-y-1">
                                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Citizen</p>
                                            <p className="text-[10px] font-bold text-gray-900">{complaint.citizenName}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Reported On</p>
                                            <p className="text-[10px] font-bold text-gray-900">{new Date(complaint.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Assigned To</p>
                                            <p className="text-[10px] font-bold text-gray-900">{complaint.assignedToUser?.full_name || 'Unassigned'}</p>
                                        </div>
                                        <div className="flex items-end justify-end">
                                            <button
                                                className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-primary-50 hover:text-primary-600 transition-all"
                                                title="View Details"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                {complaint.photos && complaint.photos.length > 0 && (
                                    <div className="md:w-32 h-32 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-100">
                                        <img src={complaint.photos[0]} alt="Complaint" className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default MrfLinkedComplaints;
