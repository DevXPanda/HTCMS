import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    AlertTriangle,
    User,
    Phone,
    Mail,
    Clock,
    CheckCircle2,
    UserPlus,
    MessageSquare,
    Image as ImageIcon
} from 'lucide-react';
import { useBackTo } from '../../../contexts/NavigationContext';
import api from '../../../services/api';

const ComplaintDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    useBackTo('/toilet-management/complaints');
    const [complaint, setComplaint] = useState(null);
    const [loading, setLoading] = useState(true);
    const [staffList, setStaffList] = useState([]);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        fetchComplaintDetails();
        fetchStaff();
    }, [id]);

    const fetchComplaintDetails = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/toilet/complaints/${id}`);
            if (response.data && response.data.success) {
                setComplaint(response.data.data.complaint);
            }
        } catch (error) {
            console.error('Failed to fetch complaint details:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStaff = async () => {
        try {
            const response = await api.get('/admin-management/users');
            setStaffList(response.data || []);
        } catch (error) {
            console.error('Failed to fetch staff:', error);
        }
    };

    const handleUpdateStatus = async (status) => {
        try {
            setUpdating(true);
            await api.put(`/toilet/complaints/${id}`, { status });
            fetchComplaintDetails();
        } catch (error) {
            console.error('Failed to update status:', error);
        } finally {
            setUpdating(false);
        }
    };

    const handleAssign = async (staffId) => {
        try {
            setUpdating(true);
            await api.put(`/toilet/complaints/${id}`, { assignedTo: staffId, status: 'in-progress' });
            fetchComplaintDetails();
        } catch (error) {
            console.error('Failed to assign staff:', error);
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return <div className="p-12 text-center">Loading complaint details...</div>;
    }

    if (!complaint) {
        return <div className="p-12 text-center text-gray-500">Complaint not found.</div>;
    }

    const statusColors = {
        pending: 'bg-amber-100 text-amber-700 border-amber-200',
        'in-progress': 'bg-blue-100 text-blue-700 border-blue-200',
        resolved: 'bg-green-100 text-green-700 border-green-200',
        rejected: 'bg-gray-100 text-gray-700 border-gray-200'
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Complaint #{complaint.id}</h1>
                <div className="flex items-center gap-3 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${statusColors[complaint.status]}`}>
                        {complaint.status}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Filed: {new Date(complaint.createdAt).toLocaleString()}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    {/* Main Description */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Complaint Details</h2>
                        <div className="flex gap-4 items-start">
                            <div className="p-3 bg-red-50 rounded-xl">
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-bold text-gray-900 uppercase tracking-wide">{complaint.complaintType}</p>
                                <p className="text-sm text-gray-600 leading-relaxed">{complaint.description}</p>
                            </div>
                        </div>

                        {complaint.photos?.length > 0 && (
                            <div className="mt-8 pt-6 border-t border-gray-50">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4" /> Evidence Photos
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {complaint.photos.map((photo, idx) => (
                                        <img key={idx} src={photo} alt="Evidence" className="h-32 w-full object-cover rounded-xl border border-gray-100 shadow-sm" />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* User Info */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Reporter Information</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-gray-50 rounded-full flex items-center justify-center">
                                    <User className="w-5 h-5 text-gray-400" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase">Citizen Name</p>
                                    <p className="text-sm font-bold text-gray-900">{complaint.citizenName}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-gray-50 rounded-full flex items-center justify-center">
                                    <Phone className="w-5 h-5 text-gray-400" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase">Phone Number</p>
                                    <p className="text-sm font-bold text-gray-900">{complaint.citizenPhone}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Actions */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <UserPlus className="w-4 h-4 text-primary-600" /> Assignment
                        </h3>
                        {complaint.status === 'pending' ? (
                            <div className="space-y-3">
                                <p className="text-xs text-gray-500 italic">No staff assigned yet.</p>
                                <select
                                    onChange={(e) => handleAssign(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary-500"
                                    defaultValue=""
                                >
                                    <option value="" disabled>Select Staff to Assign</option>
                                    {staffList.map(s => (
                                        <option key={s.id} value={s.id}>{s.full_name}</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 bg-primary-50 rounded-full flex items-center justify-center text-primary-700 text-xs font-bold">
                                        {complaint.assignedStaff?.full_name?.[0]}
                                    </div>
                                    <p className="text-sm font-bold text-gray-900">{complaint.assignedStaff?.full_name}</p>
                                </div>
                                {complaint.status === 'in-progress' && (
                                    <button
                                        onClick={() => handleUpdateStatus('resolved')}
                                        className="w-full py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle2 className="w-4 h-4" /> Mark as Resolved
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="p-6 bg-primary-900 rounded-2xl text-white shadow-xl shadow-primary-900/10">
                        <h3 className="text-xs font-bold uppercase tracking-widest mb-4 opacity-60">Resolution Activity</h3>
                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center">
                                    <MessageSquare className="w-3 h-3" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase opacity-50">Resolution Notes</p>
                                    <p className="text-xs leading-relaxed opacity-90 italic">
                                        {complaint.resolutionNotes || "Wait for staff to provide resolution details..."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default ComplaintDetails;
