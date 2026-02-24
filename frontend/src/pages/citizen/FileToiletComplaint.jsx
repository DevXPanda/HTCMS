import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Send, Camera, AlertCircle, X, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const FileToiletComplaint = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [facilities, setFacilities] = useState([]);
    const [loading, setLoading] = useState(false);
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
                citizenName: `${user?.firstName} ${user?.lastName}`,
                citizenPhone: user?.phone || user?.phoneNumber,
                citizenEmail: user?.email,
                status: 'Pending'
            };

            const response = await api.post('/toilet/complaints', payload);

            if (response.data && response.data.success) {
                toast.success('Complaint filed successfully!');
                navigate('/citizen/toilet/complaint-history');
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
        <div className="max-w-4xl mx-auto space-y-6">
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
        </div>
    );
};

export default FileToiletComplaint;
