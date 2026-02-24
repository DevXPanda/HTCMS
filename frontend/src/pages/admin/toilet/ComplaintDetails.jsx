import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBackTo } from '../../../contexts/NavigationContext';
import {
    Clock,
    CheckCircle,
    AlertCircle,
    Calendar,
    User,
    ArrowLeft,
    Save,
    Trash2,
    MapPin,
    FileText,
    MessageSquare,
    UserPlus,
    CheckCircle2
} from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const ComplaintDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    useBackTo('/toilet-management/complaints');

    const [complaint, setComplaint] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [supervisors, setSupervisors] = useState([]);
    const [formData, setFormData] = useState({
        status: '',
        priority: '',
        assignedTo: '',
        resolutionNotes: ''
    });

    useEffect(() => {
        fetchComplaintDetails();
        fetchSupervisors();
    }, [id]);

    const fetchComplaintDetails = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/toilet/complaints/${id}`);
            if (response.data && response.data.success) {
                const data = response.data.data.complaint;
                setComplaint(data);
                setFormData({
                    status: data.status,
                    priority: data.priority,
                    assignedTo: data.assignedTo || '',
                    resolutionNotes: data.resolutionNotes || ''
                });
            }
        } catch (error) {
            console.error('Failed to fetch complaint details:', error);
            toast.error('Failed to load complaint details.');
        } finally {
            setLoading(false);
        }
    };

    const fetchSupervisors = async () => {
        try {
            const response = await api.get('/admin-management/employees', {
                params: { role: 'SUPERVISOR' }
            });
            if (response.data && response.employees) {
                setSupervisors(response.data.employees);
            }
        } catch (error) {
            console.error('Failed to fetch supervisors:', error);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            const response = await api.put(`/toilet/complaints/${id}`, formData);
            if (response.data && response.data.success) {
                toast.success('Complaint updated successfully!');
                fetchComplaintDetails();
            }
        } catch (error) {
            console.error('Failed to update complaint:', error);
            toast.error(error.response?.data?.message || 'Failed to update complaint.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this complaint? This will soft-delete the record.')) return;

        try {
            const response = await api.delete(`/toilet/complaints/${id}`);
            if (response.data && response.data.success) {
                toast.success('Complaint deleted successfully.');
                navigate('/toilet-management/complaints');
            }
        } catch (error) {
            console.error('Failed to delete complaint:', error);
            toast.error('Failed to delete complaint.');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (!complaint) return <div className="p-6 text-center">Complaint not found.</div>;

    const getStatusStyle = (status) => {
        const s = status?.toLowerCase();
        if (s === 'resolved') return 'bg-green-50 text-green-700 border-green-100';
        if (s === 'in progress') return 'bg-blue-50 text-blue-700 border-blue-100';
        return 'bg-amber-50 text-amber-700 border-amber-100';
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <button onClick={() => navigate(-1)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                            <ArrowLeft className="w-5 h-5 text-gray-500" />
                        </button>
                        <h1 className="text-2xl font-bold text-gray-900">Complaint Details</h1>
                    </div>
                    <p className="text-gray-500 text-sm font-medium ml-9">Ref: #COMP-{complaint.id} | Reported on {new Date(complaint.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleDelete}
                        className="btn border-red-100 text-red-600 hover:bg-red-50 flex items-center gap-2 text-sm"
                    >
                        <Trash2 className="w-4 h-4" /> Delete
                    </button>
                    <button
                        form="complaint-form"
                        type="submit"
                        disabled={saving}
                        className="btn btn-primary flex items-center gap-2 text-sm"
                    >
                        {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save className="w-4 h-4" />}
                        Save Changes
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Information Card */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-6">
                            <div className="flex items-center gap-2 mb-4 border-b pb-4">
                                <FileText className="w-5 h-5 text-primary-600" />
                                <h2 className="text-lg font-bold text-gray-900">Issue Description</h2>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Complaint Type</p>
                                        <p className="text-sm font-bold text-gray-900">{complaint.complaintType}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Facility Name</p>
                                        <div className="flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5 text-primary-500" />
                                            <p className="text-sm font-bold text-gray-900">{complaint.facility?.name}</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Detailed Description</p>
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-left">
                                        <p className="text-sm text-gray-700 leading-relaxed font-medium">
                                            {complaint.description}
                                        </p>
                                    </div>
                                </div>

                                {complaint.photos?.length > 0 && (
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Visual Evidence</p>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-left">
                                            {complaint.photos.map((p, i) => (
                                                <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-xl border border-gray-200 overflow-hidden group">
                                                    <img src={p} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Citizen Details */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-6">
                            <div className="flex items-center gap-2 mb-4 border-b pb-4">
                                <User className="w-5 h-5 text-primary-600" />
                                <h2 className="text-lg font-bold text-gray-900">Citizen Information</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Name</p>
                                    <p className="text-sm font-bold text-gray-900">{complaint.citizenName}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Contact Phone</p>
                                    <p className="text-sm font-bold text-gray-900">{complaint.citizenPhone}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Email Address</p>
                                    <p className="text-sm font-bold text-primary-600 underline underline-offset-2">{complaint.citizenEmail || 'Not Provided'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Management Sidebar */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-6">
                            <div className="flex items-center gap-2 mb-4 border-b pb-4">
                                <UserPlus className="w-5 h-5 text-primary-600" />
                                <h2 className="text-lg font-bold text-gray-900">Take Action</h2>
                            </div>

                            <form id="complaint-form" onSubmit={handleUpdate} className="space-y-5">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Update Status</label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary-500 outline-none"
                                        value={formData.status}
                                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                                    >
                                        <option value="Pending">Pending</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Resolved">Resolved</option>
                                        <option value="Closed">Closed</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Priority Level</label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary-500 outline-none"
                                        value={formData.priority}
                                        onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                                    >
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Assign to Supervisor</label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-primary-500 outline-none"
                                        value={formData.assignedTo}
                                        onChange={(e) => setFormData(prev => ({ ...prev, assignedTo: e.target.value }))}
                                    >
                                        <option value="">Select Supervisor...</option>
                                        {supervisors.map(s => (
                                            <option key={s.id} value={s.id}>{s.full_name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Resolution Notes</label>
                                    <textarea
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                                        rows="4"
                                        placeholder="Add notes about resolution progress..."
                                        value={formData.resolutionNotes}
                                        onChange={(e) => setFormData(prev => ({ ...prev, resolutionNotes: e.target.value }))}
                                    ></textarea>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Timeline/Audit Info */}
                    <div className="bg-primary-900 rounded-xl p-6 text-white shadow-lg shadow-primary-900/10">
                        <div className="flex items-center gap-2 mb-4">
                            <Clock className="w-5 h-5 text-primary-300" />
                            <h2 className="text-lg font-bold">System Log</h2>
                        </div>
                        <div className="space-y-4">
                            <div className="border-l-2 border-primary-700 pl-4 py-1">
                                <p className="text-[10px] font-bold text-primary-300 uppercase tracking-widest">Reported On</p>
                                <p className="text-sm font-bold">{new Date(complaint.createdAt).toLocaleString()}</p>
                            </div>
                            {complaint.resolvedAt && (
                                <div className="border-l-2 border-green-500 pl-4 py-1">
                                    <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Resolved On</p>
                                    <p className="text-sm font-bold underline decoration-green-500/50 underline-offset-4">{new Date(complaint.resolvedAt).toLocaleString()}</p>
                                </div>
                            )}
                            <div className="border-l-2 border-primary-700 pl-4 py-1">
                                <p className="text-[10px] font-bold text-primary-300 uppercase tracking-widest">Current Status</p>
                                <div className="mt-1">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase border shadow-sm ${getStatusStyle(complaint.status)}`}>
                                        {complaint.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComplaintDetails;
