import React, { useState, useEffect } from 'react';
import { useBackTo } from '../../../contexts/NavigationContext';
import {
    AlertCircle,
    Search,
    Filter,
    Clock,
    CheckCircle,
    XCircle,
    Eye,
    Edit,
    Trash2,
    X,
    Save,
    User,
    Phone,
    MapPin,
    Calendar,
    FileText
} from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { useConfirm } from '../../../components/ConfirmModal';

const GauShalaComplaints = () => {
    const { confirm } = useConfirm();
    useBackTo('/gaushala/management');
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    // Detail / Edit modal states
    const [selectedComplaint, setSelectedComplaint] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ status: '', priority: '', resolution_notes: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchComplaints(); }, []);

    const fetchComplaints = async () => {
        try {
            setLoading(true);
            const response = await api.get('/gaushala/complaints');
            if (response.data && response.data.success) {
                setComplaints(response.data.data.complaints);
            }
        } catch (error) {
            console.error('Failed to fetch gaushala complaints:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleView = (complaint) => {
        setSelectedComplaint(complaint);
        setIsEditing(false);
        setShowDetailModal(true);
    };

    const handleEdit = (complaint) => {
        setSelectedComplaint(complaint);
        setEditForm({
            status: complaint.status,
            priority: complaint.priority || 'medium',
            resolution_notes: complaint.resolution_notes || ''
        });
        setIsEditing(true);
        setShowDetailModal(true);
    };

    const handleSaveEdit = async () => {
        try {
            setSaving(true);
            await api.put(`/gaushala/complaints/${selectedComplaint.id}`, editForm);
            setShowDetailModal(false);
            setSelectedComplaint(null);
            fetchComplaints();
        } catch (error) {
            console.error('Failed to update complaint:', error);
            toast.error('Failed to update complaint.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (complaintId) => {
        const ok = await confirm({ title: 'Delete complaint', message: 'Are you sure you want to delete this complaint?', confirmLabel: 'Delete', variant: 'danger' });
        if (!ok) return;
        try {
            await api.delete(`/gaushala/complaints/${complaintId}`);
            fetchComplaints();
        } catch (error) {
            console.error('Failed to delete complaint:', error);
            toast.error('Failed to delete complaint.');
        }
    };

    const closeModal = () => {
        setShowDetailModal(false);
        setSelectedComplaint(null);
        setIsEditing(false);
    };

    const filteredComplaints = complaints.filter(complaint => {
        const facilityName = complaint.facility?.name || '';
        const complainantName = (complaint.complainant_name || '').toLowerCase();
        const description = (complaint.description || '').toLowerCase();
        const phone = (complaint.complainant_phone || '').toLowerCase();
        const matchesSearch =
            facilityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            complainantName.includes(searchTerm.toLowerCase()) ||
            description.includes(searchTerm.toLowerCase()) ||
            phone.includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || complaint.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (status) => {
        const statusConfig = {
            pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
            in_progress: { color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
            resolved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
            closed: { color: 'bg-gray-100 text-gray-800', icon: XCircle }
        };
        const config = statusConfig[status] || statusConfig.pending;
        const Icon = config.icon;
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
                <Icon className="w-3 h-3 mr-1" />
                {(status || '').replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}
            </span>
        );
    };

    const getPriorityBadge = (priority) => {
        const priorityConfig = {
            high: 'bg-red-100 text-red-800',
            medium: 'bg-yellow-100 text-yellow-800',
            low: 'bg-green-100 text-green-800'
        };
        const displayPriority = priority || 'medium';
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityConfig[displayPriority]}`}>
                {displayPriority.charAt(0).toUpperCase() + displayPriority.slice(1)}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gaushala Complaints</h1>
                    <p className="text-gray-600 text-sm">Manage citizen reports and facility issues</p>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-gray-400">
                    <div className="text-sm text-gray-500">Total Complaints</div>
                    <div className="text-2xl font-bold text-gray-900">{complaints.length}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
                    <div className="text-sm text-gray-500">Pending</div>
                    <div className="text-2xl font-bold text-yellow-600">
                        {complaints.filter(c => c.status === 'pending').length}
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                    <div className="text-sm text-gray-500">In Progress</div>
                    <div className="text-2xl font-bold text-blue-600">
                        {complaints.filter(c => c.status === 'in_progress').length}
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                    <div className="text-sm text-gray-500">Resolved</div>
                    <div className="text-2xl font-bold text-green-600">
                        {complaints.filter(c => c.status === 'resolved' || c.status === 'closed').length}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search by facility, citizen, or description..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Complainant</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gaushala</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredComplaints.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="px-6 py-8 text-center text-gray-500">No complaints found</td>
                                </tr>
                            ) : (
                                filteredComplaints.map((complaint) => (
                                    <tr key={complaint.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center text-sm font-medium text-gray-900">
                                                <User className="w-4 h-4 mr-1 text-gray-400" />
                                                {complaint.complainant_name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {complaint.complainant_phone || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {complaint.facility?.name || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 line-clamp-2 max-w-xs">{complaint.description}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getPriorityBadge(complaint.priority)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(complaint.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(complaint.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleView(complaint)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all" title="View Details">
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleEdit(complaint)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Edit">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(complaint.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail / Edit Modal */}
            {showDetailModal && selectedComplaint && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden">
                        {/* Modal Header */}
                        <div className="px-6 py-4 bg-gray-50 flex justify-between items-center border-b border-gray-100">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">
                                {isEditing ? 'Edit Complaint' : 'Complaint Details'}
                            </h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Complainant Info — always read-only */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs font-medium text-gray-400 uppercase mb-1">Complainant</p>
                                    <p className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                                        <User className="w-3.5 h-3.5 text-gray-400" />
                                        {selectedComplaint.complainant_name}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-400 uppercase mb-1">Phone</p>
                                    <p className="text-sm text-gray-700 flex items-center gap-1">
                                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                                        {selectedComplaint.complainant_phone || 'N/A'}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs font-medium text-gray-400 uppercase mb-1">Gaushala Facility</p>
                                    <p className="text-sm text-gray-700 flex items-center gap-1">
                                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                        {selectedComplaint.facility?.name || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-400 uppercase mb-1">Filed On</p>
                                    <p className="text-sm text-gray-700 flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                        {new Date(selectedComplaint.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-medium text-gray-400 uppercase mb-1">Description</p>
                                <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">
                                    {selectedComplaint.description}
                                </div>
                            </div>

                            {isEditing ? (
                                <>
                                    {/* Editable fields */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-400 uppercase mb-1">Status</label>
                                            <select
                                                value={editForm.status}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="in_progress">In Progress</option>
                                                <option value="resolved">Resolved</option>
                                                <option value="closed">Closed</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-400 uppercase mb-1">Priority</label>
                                            <select
                                                value={editForm.priority}
                                                onChange={(e) => setEditForm(prev => ({ ...prev, priority: e.target.value }))}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
                                            >
                                                <option value="low">Low</option>
                                                <option value="medium">Medium</option>
                                                <option value="high">High</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 uppercase mb-1">Resolution Notes</label>
                                        <textarea
                                            value={editForm.resolution_notes}
                                            onChange={(e) => setEditForm(prev => ({ ...prev, resolution_notes: e.target.value }))}
                                            rows="3"
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                                            placeholder="Add resolution notes..."
                                        ></textarea>
                                    </div>
                                    <div className="pt-2 flex gap-3">
                                        <button
                                            type="button"
                                            onClick={closeModal}
                                            className="flex-1 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSaveEdit}
                                            disabled={saving}
                                            className="flex-1 py-2 bg-primary-600 text-white rounded-lg text-sm font-bold hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            <Save className="w-4 h-4" />
                                            {saving ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Read-only view */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs font-medium text-gray-400 uppercase mb-1">Status</p>
                                            {getStatusBadge(selectedComplaint.status)}
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-gray-400 uppercase mb-1">Priority</p>
                                            {getPriorityBadge(selectedComplaint.priority)}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-400 uppercase mb-1">Resolution Notes</p>
                                        <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                                            {selectedComplaint.resolution_notes || 'No resolution notes yet.'}
                                        </div>
                                    </div>
                                    <div className="pt-2 flex gap-3">
                                        <button
                                            onClick={closeModal}
                                            className="flex-1 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                            Close
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditForm({
                                                    status: selectedComplaint.status,
                                                    priority: selectedComplaint.priority || 'medium',
                                                    resolution_notes: selectedComplaint.resolution_notes || ''
                                                });
                                                setIsEditing(true);
                                            }}
                                            className="flex-1 py-2 bg-primary-600 text-white rounded-lg text-sm font-bold hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Edit className="w-4 h-4" />
                                            Edit Complaint
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GauShalaComplaints;
