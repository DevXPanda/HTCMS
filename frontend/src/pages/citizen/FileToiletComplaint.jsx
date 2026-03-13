import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Send, Camera, X, ClipboardList, CheckCircle2, AlertCircle, Clock, Calendar, MessageSquare, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDateIST, formatDateTimeIST } from '../../utils/dateUtils';
import api from '../../services/api';

const FileToiletComplaint = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [facilities, setFacilities] = useState([]);
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [formData, setFormData] = useState({
        toiletFacilityId: '',
        complaintType: '',
        description: '',
        priority: 'Medium',
        photos: []
    });

    useEffect(() => {
        fetchFacilities();
    }, []);

    useEffect(() => {
        if (user?.phone || user?.phoneNumber || user?.email) {
            fetchHistory();
        } else {
            setHistoryLoading(false);
        }
    }, [user?.phone, user?.phoneNumber, user?.email]);

    const fetchHistory = async () => {
        try {
            setHistoryLoading(true);
            const params = {
                phone: user?.phone || user?.phoneNumber,
                email: user?.email
            };
            const response = await api.get('/toilet/complaints/citizen', { params });
            if (response.data && response.data.success) {
                setComplaints(response.data.data.complaints || []);
            }
        } catch (error) {
            console.error('Failed to fetch complaint history:', error);
        } finally {
            setHistoryLoading(false);
        }
    };

    const getStatusStyle = (status) => {
        const s = status?.toLowerCase();
        if (s === 'resolved') return 'bg-green-100 text-green-700 border-green-200';
        if (s === 'in progress') return 'bg-blue-100 text-blue-700 border-blue-200';
        return 'bg-amber-100 text-amber-700 border-amber-200';
    };

    const getStatusIcon = (status) => {
        const s = status?.toLowerCase();
        if (s === 'resolved') return <CheckCircle2 className="w-3 h-3" />;
        if (s === 'in progress') return <Clock className="w-3 h-3" />;
        return <AlertCircle className="w-3 h-3" />;
    };

    const fetchFacilities = async () => {
        try {
            setLoading(true);
            const response = await api.get('/toilet/facilities');
            if (response.data && response.data.success) {
                setFacilities(response.data.data.facilities);
            }
        } catch (error) {
            console.error('Failed to fetch facilities:', error);
            toast.error('Failed to load toilet facilities.');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size must be less than 5MB');
            return;
        }

        const formDataUpload = new FormData();
        formDataUpload.append('photo', file);

        try {
            setUploading(true);
            const response = await api.post('/upload/toilet-photo', formDataUpload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data && response.data.success) {
                setFormData(prev => ({
                    ...prev,
                    photos: [...prev.photos, response.data.data.url]
                }));
            }
        } catch (error) {
            console.error('Failed to upload photo:', error);
            toast.error('Failed to upload photo. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const removePhoto = (index) => {
        setFormData(prev => ({
            ...prev,
            photos: prev.photos.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.toiletFacilityId) {
            toast.error('Please select a toilet facility.');
            return;
        }

        if (!formData.complaintType) {
            toast.error('Please select a complaint type.');
            return;
        }

        try {
            setSaving(true);

            const payload = {
                ...formData,
                priority: formData.priority.toLowerCase(),
                citizenName: `${user?.firstName} ${user?.lastName}`,
                citizenPhone: user?.phone || user?.phoneNumber,
                citizenEmail: user?.email,
                status: 'pending'
            };

            const response = await api.post('/toilet/complaints', payload);

            if (response.data && response.data.success) {
                toast.success('Complaint filed successfully!');
                setFormData({ toiletFacilityId: '', complaintType: '', description: '', priority: 'Medium', photos: [] });
                fetchHistory();
            }
        } catch (error) {
            console.error('Failed to file complaint:', error);
            toast.error(error.response?.data?.message || 'Failed to file complaint. Please try again.');
        } finally {
            setSaving(false);
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
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 text-left">File Toilet Complaint</h1>
                    <p className="text-gray-500 text-sm">Submit your feedback or report issues regarding toilet facilities</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 space-y-6">
                    {/* User Info Readonly */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Your Name</p>
                            <p className="text-sm font-semibold text-gray-900">{user?.firstName} {user?.lastName}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Contact Number</p>
                            <p className="text-sm font-semibold text-gray-900">{user?.phone || user?.phoneNumber}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Email Address</p>
                            <p className="text-sm font-semibold text-gray-900">{user?.email}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Select Toilet Facility *</label>
                                <select
                                    name="toiletFacilityId"
                                    value={formData.toiletFacilityId}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                                >
                                    <option value="">Choose a facility...</option>
                                    {facilities.map(facility => (
                                        <option key={facility.id} value={facility.id}>{facility.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Complaint Type *</label>
                                <select
                                    name="complaintType"
                                    value={formData.complaintType}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                                >
                                    <option value="">Select type...</option>
                                    <option value="Cleanliness">Cleanliness Issue</option>
                                    <option value="Water Supply">Water Supply Issue</option>
                                    <option value="Electricity">Electricity/Lighting</option>
                                    <option value="Maintenance">Maintenance/Broken Fixture</option>
                                    <option value="Odor">Bad Odor</option>
                                    <option value="Security">Security Concern</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Priority Level *</label>
                                <div className="flex gap-2">
                                    {['Low', 'Medium', 'High'].map(p => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, priority: p }))}
                                            className={`flex-1 py-2 text-sm font-bold rounded-lg border transition-all ${formData.priority === p
                                                ? (p === 'High' ? 'bg-red-600 border-red-600 text-white shadow-sm' : p === 'Medium' ? 'bg-amber-500 border-amber-500 text-white shadow-sm' : 'bg-green-600 border-green-600 text-white shadow-sm')
                                                : 'bg-white border-gray-200 text-gray-600 hover:border-primary-300'
                                                }`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Description *</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    required
                                    rows="4"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all outline-none resize-none"
                                    placeholder="Please provide details about the issue..."
                                ></textarea>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Upload Photos (Optional)</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {formData.photos.map((photo, index) => (
                                        <div key={index} className="relative group aspect-square">
                                            <img
                                                src={photo}
                                                alt="Complaint"
                                                className="w-full h-full object-cover rounded-lg border border-gray-200"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removePhoto(index)}
                                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                    {formData.photos.length < 5 && (
                                        <label className={`aspect-square bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors ${uploading ? 'opacity-50' : ''}`}>
                                            <Camera className="w-6 h-6 text-gray-400 mb-1" />
                                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">{uploading ? 'Wait...' : 'Add Photo'}</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                disabled={uploading}
                                                onChange={handlePhotoUpload}
                                            />
                                        </label>
                                    )}
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">Upload up to 5 photos as evidence.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="btn btn-secondary text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="btn btn-primary text-sm flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                        Submit Complaint
                    </button>
                </div>
            </form>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                    <div className="p-2 rounded-full bg-pink-100 text-pink-600">
                        <ClipboardList className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">Toilet Complaint History</h2>
                </div>
                <div className="p-4">
                    {historyLoading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
                        </div>
                    ) : complaints.length === 0 ? (
                        <div className="py-8 text-center text-gray-500">
                            <ClipboardList className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm font-medium">No complaints yet. Your submitted complaints will appear here.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {complaints.map((complaint) => (
                                <div key={complaint.id} className="rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
                                    <div className="flex flex-col md:flex-row justify-between gap-4">
                                        <div className="space-y-3 flex-1">
                                            <div className="flex items-center gap-3">
                                                <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusStyle(complaint.status)}`}>
                                                    {getStatusIcon(complaint.status)}
                                                    {complaint.status}
                                                </span>
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${complaint.priority === 'High' ? 'bg-red-50 text-red-600 border-red-100' :
                                                    complaint.priority === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                        'bg-green-50 text-green-600 border-green-100'
                                                    }`}>
                                                    {complaint.priority} Priority
                                                </span>
                                            </div>
                                            <div>
                                                <h3 className="text-base font-bold text-gray-900 leading-tight mb-1">{complaint.complaintType}</h3>
                                                <div className="flex items-center gap-4 text-xs text-gray-500 font-medium">
                                                    <div className="flex items-center gap-1">
                                                        <MapPin className="w-3.5 h-3.5 text-primary-500" />
                                                        {complaint.facility?.name}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                        {formatDateIST(complaint.createdAt)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-gray-50 p-3 rounded-lg">
                                                <p className="text-sm text-gray-600 leading-relaxed">{complaint.description}</p>
                                            </div>
                                            {complaint.resolutionNotes && (
                                                <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <MessageSquare className="w-4 h-4 text-green-600" />
                                                        <p className="text-xs font-bold text-green-800 uppercase tracking-wider">Resolution Details</p>
                                                    </div>
                                                    <p className="text-sm text-green-700 font-medium">{complaint.resolutionNotes}</p>
                                                    {complaint.resolvedAt && (
                                                        <p className="text-[10px] text-green-600 mt-2 font-bold uppercase">
                                                            Resolved on: {formatDateTimeIST(complaint.resolvedAt)}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        {complaint.photos?.length > 0 && (
                                            <div className="md:w-40 space-y-2">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Evidence Photos</p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {complaint.photos.map((p, idx) => (
                                                        <a key={idx} href={p} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-lg overflow-hidden border border-gray-200">
                                                            <img src={p} alt="complaint" className="w-full h-full object-cover hover:scale-110 transition-transform" />
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FileToiletComplaint;
