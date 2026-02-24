import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Clock,
    CheckCircle,
    AlertCircle,
    Calendar,
    User,
    ArrowLeft,
    Save,
    MapPin,
    MessageSquare,
    ClipboardList,
    Send,
    PlusCircle
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useStaffAuth } from '../../contexts/StaffAuthContext';

const ToiletComplaintsSupervisor = () => {
    const { user } = useStaffAuth();
    const navigate = useNavigate();

    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [notes, setNotes] = useState({});

    useEffect(() => {
        if (user?.id) {
            fetchAssignedComplaints();
        }
    }, [user?.id]);

    const fetchAssignedComplaints = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/toilet/complaints/assigned/${user.id}`);
            if (response.data && response.data.success) {
                setComplaints(response.data.data.complaints);
                // Initialize notes
                const initialNotes = {};
                response.data.data.complaints.forEach(c => {
                    initialNotes[c.id] = c.resolutionNotes || '';
                });
                setNotes(initialNotes);
            }
        } catch (error) {
            console.error('Failed to fetch assigned complaints:', error);
            toast.error('Failed to load assigned complaints.');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (complaintId, newStatus) => {
        try {
            setUpdatingId(complaintId);
            const updateData = {
                status: newStatus,
                resolutionNotes: notes[complaintId]
            };

            const response = await api.put(`/toilet/complaints/${complaintId}`, updateData);
            if (response.data && response.data.success) {
                toast.success(`Complaint status updated to ${newStatus}`);
                fetchAssignedComplaints();
            }
        } catch (error) {
            console.error('Failed to update status:', error);
            toast.error('Failed to update status.');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleNoteChange = (id, value) => {
        setNotes(prev => ({ ...prev, [id]: value }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    const getStatusStyle = (status) => {
        const s = status?.toLowerCase();
        if (s === 'resolved') return 'bg-green-100 text-green-700 border-green-200';
        if (s === 'in progress') return 'bg-blue-100 text-blue-700 border-blue-200';
        return 'bg-amber-100 text-amber-700 border-amber-200';
    };

    const getPriorityStyle = (priority) => {
        const p = priority?.toLowerCase();
        if (p === 'high') return 'text-red-600 font-black';
        if (p === 'medium') return 'text-amber-600 font-bold';
        return 'text-green-600 font-bold';
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <ClipboardList className="w-6 h-6 text-primary-600" />
                        My Assigned Complaints
                    </h1>
                    <p className="text-gray-500 text-sm font-medium">Manage and resolve issues assigned to you</p>
                </div>
                <div className="bg-primary-50 px-4 py-2 rounded-lg border border-primary-100">
                    <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest">Active Tasks</p>
                    <p className="text-xl font-black text-primary-900">{complaints.filter(c => c.status !== 'Resolved').length}</p>
                </div>
            </div>

            {complaints.length === 0 ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-gray-100 p-12 text-center">
                    <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">All Clear!</h3>
                    <p className="text-gray-500">No complaints currently assigned to you.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {complaints.map((complaint) => (
                        <div key={complaint.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                            <div className="p-5 sm:p-6">
                                <div className="flex flex-col md:flex-row gap-6">
                                    {/* Left: Info */}
                                    <div className="flex-1 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(complaint.createdAt).toLocaleDateString()}
                                                <span className="text-gray-200">|</span>
                                                <span className={getPriorityStyle(complaint.priority)}>{complaint.priority} Priority</span>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase border shadow-sm ${getStatusStyle(complaint.status)}`}>
                                                {complaint.status}
                                            </span>
                                        </div>

                                        <div>
                                            <h3 className="text-lg font-black text-gray-900 mb-1">{complaint.complaintType}</h3>
                                            <div className="flex items-center gap-1.5 text-gray-600 text-sm font-bold">
                                                <MapPin className="w-4 h-4 text-primary-500" />
                                                {complaint.facility?.name}
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Citizen's Message</p>
                                            <p className="text-sm text-gray-700 font-medium leading-relaxed italic line-clamp-3">
                                                "{complaint.description}"
                                            </p>
                                        </div>

                                        {complaint.photos?.length > 0 && (
                                            <div className="flex gap-2 overflow-x-auto pb-1">
                                                {complaint.photos.map((p, i) => (
                                                    <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="h-16 w-16 rounded-lg border border-gray-200 overflow-hidden flex-shrink-0">
                                                        <img src={p} alt="" className="w-full h-full object-cover" />
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Right: Actions */}
                                    <div className="md:w-80 space-y-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                <MessageSquare className="w-3 h-3" /> Resolution Notes
                                            </label>
                                            <textarea
                                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary-500 outline-none resize-none bg-white min-h-[100px]"
                                                placeholder="Add steps taken to resolve..."
                                                value={notes[complaint.id] || ''}
                                                onChange={(e) => handleNoteChange(complaint.id, e.target.value)}
                                            ></textarea>
                                        </div>

                                        <div className="space-y-2">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Update Status</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    onClick={() => handleStatusUpdate(complaint.id, 'In Progress')}
                                                    disabled={updatingId === complaint.id || complaint.status === 'Resolved'}
                                                    className="btn border-blue-200 text-blue-700 hover:bg-blue-50 text-[10px] font-black py-2 rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50"
                                                >
                                                    {updatingId === complaint.id ? '...' : <Clock className="w-3 h-3" />}
                                                    IN PROGRESS
                                                </button>
                                                <button
                                                    onClick={() => handleStatusUpdate(complaint.id, 'Resolved')}
                                                    disabled={updatingId === complaint.id || complaint.status === 'Resolved'}
                                                    className="btn bg-green-600 text-white hover:bg-green-700 text-[10px] font-black py-2 rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-md shadow-green-100"
                                                >
                                                    {updatingId === complaint.id ? '...' : <CheckCircle2 className="w-3 h-3" />}
                                                    RESOLVE
                                                </button>
                                            </div>
                                        </div>

                                        {complaint.resolvedAt && (
                                            <div className="text-center pt-2">
                                                <p className="text-[10px] font-bold text-green-600 uppercase">Resolved On</p>
                                                <p className="text-[10px] font-medium text-gray-500">{new Date(complaint.resolvedAt).toLocaleString()}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ToiletComplaintsSupervisor;
