import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { useBackTo } from '../../../contexts/NavigationContext';
import { Save, Camera, CheckCircle2, AlertCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';

const AddInspection = () => {
    const navigate = useNavigate();
    const { id } = useParams(); // For edit mode
    const [searchParams] = useSearchParams();
    const preSelectedFacilityId = searchParams.get('facilityId');
    useBackTo('/toilet-management/inspections');

    const isEditMode = !!id;
    const [facilities, setFacilities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [inspectors, setInspectors] = useState([]);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [formData, setFormData] = useState({
        toiletFacilityId: preSelectedFacilityId || '',
        inspectorId: '',
        inspectionDate: new Date().toISOString().split('T')[0],
        status: 'good',
        cleanliness: 'Satisfactory',
        maintenance: 'Satisfactory',
        waterSupply: 'Working',
        electricity: 'Working',
        ventilation: 'Good',
        lighting: 'Good',
        notes: '',
        photos: []
    });

    useEffect(() => {
        fetchFacilities();
        fetchInspectors();
        if (isEditMode) {
            fetchInspectionDetails();
        }
    }, [id]);

    const fetchFacilities = async () => {
        try {
            const response = await api.get('/toilet/facilities');
            if (response.data && response.data.success) {
                setFacilities(response.data.data.facilities);
            }
        } catch (error) {
            console.error('Failed to fetch facilities:', error);
            toast.error('Failed to load facilities.');
        }
    };

    const fetchInspectors = async () => {
        try {
            const response = await api.get('/toilet/inspectors');
            if (response.data && response.data.success) {
                setInspectors(response.data.data.inspectors);
            }
        } catch (error) {
            console.error('Failed to fetch inspectors:', error);
            toast.error('Failed to load inspectors list.');
        }
    };

    const fetchInspectionDetails = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/toilet/inspections/${id}`);
            if (response.data && response.data.success) {
                const inspection = response.data.data.inspection;
                setFormData({
                    ...inspection,
                    inspectionDate: new Date(inspection.inspectionDate).toISOString().split('T')[0],
                    photos: inspection.photos || []
                });
            }
        } catch (error) {
            console.error('Failed to fetch inspection details:', error);
            toast.error('Failed to load inspection details.');
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
        setSaving(true);
        if (!formData.inspectorId) {
            toast.error('Please select an inspector.');
            setSaving(false);
            return;
        }

        try {
            const payload = {
                ...formData,
                inspectorId: Number(formData.inspectorId)
            };
            console.log('[DEBUG] Submitting inspection payload:', payload);

            if (isEditMode) {
                await api.put(`/toilet/inspections/${id}`, payload);
                toast.success('Inspection updated successfully!');
            } else {
                await api.post('/toilet/inspections', payload);
                toast.success('Inspection recorded successfully!');
            }
            navigate('/toilet-management/inspections');
        } catch (error) {
            console.error('Failed to save inspection:', error);
            const errorMessage = error.response?.data?.message || 'Failed to save inspection. Please check all fields.';
            toast.error(errorMessage);
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
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isEditMode ? 'Edit Inspection' : 'Record New Inspection'}
                    </h1>
                    <p className="text-gray-500 text-sm">Fill in the details for the toilet facility inspection</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Facility & Date */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Select Toilet Facility *</label>
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Inspection Date *</label>
                                <input
                                    type="date"
                                    name="inspectionDate"
                                    value={formData.inspectionDate}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Select Inspector *</label>
                                <select
                                    name="inspectorId"
                                    value={formData.inspectorId}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                                >
                                    <option value="">Choose an inspector...</option>
                                    {inspectors.map(inspector => (
                                        <option key={inspector.id} value={inspector.id}>{inspector.full_name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Overall Status & Photos */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Overall Status *</label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                                >
                                    <option value="good">Good</option>
                                    <option value="satisfactory">Satisfactory</option>
                                    <option value="poor">Poor / Needs Maintenance</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Photos (Optional)</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {formData.photos.map((photo, index) => (
                                        <div key={index} className="relative group aspect-square">
                                            <img
                                                src={photo}
                                                alt="Inspection"
                                                className="w-full h-full object-cover rounded-lg border border-gray-200"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removePhoto(index)}
                                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                    {formData.photos.length < 5 && (
                                        <label className={`aspect-square bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors ${uploading ? 'opacity-50' : ''}`}>
                                            <Camera className="w-6 h-6 text-gray-400 mb-1" />
                                            <span className="text-[10px] text-gray-500 font-medium">{uploading ? 'Uploading...' : 'Add Photo'}</span>
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
                            </div>
                        </div>
                    </div>

                    <hr className="border-gray-100" />

                    {/* Detailed Parameters */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Inspection Checklist</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Cleanliness */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Cleanliness</label>
                                <div className="flex flex-wrap gap-2">
                                    {['Poor', 'Satisfactory', 'Good'].map(option => (
                                        <button
                                            key={option}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, cleanliness: option }))}
                                            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${formData.cleanliness === option
                                                ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                                                : 'bg-white border-gray-200 text-gray-600 hover:border-primary-300'
                                                }`}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Maintenance */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Maintenance</label>
                                <div className="flex flex-wrap gap-2">
                                    {['Poor', 'Satisfactory', 'Good'].map(option => (
                                        <button
                                            key={option}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, maintenance: option }))}
                                            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${formData.maintenance === option
                                                ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                                                : 'bg-white border-gray-200 text-gray-600 hover:border-primary-300'
                                                }`}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Water Supply */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Water Supply</label>
                                <div className="flex gap-2">
                                    {['Working', 'Not Working'].map(option => (
                                        <button
                                            key={option}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, waterSupply: option }))}
                                            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${formData.waterSupply === option
                                                ? 'bg-cyan-600 border-cyan-600 text-white shadow-sm'
                                                : 'bg-white border-gray-200 text-gray-600 hover:border-cyan-300'
                                                }`}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Electricity */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Electricity</label>
                                <div className="flex gap-2">
                                    {['Working', 'Not Working'].map(option => (
                                        <button
                                            key={option}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, electricity: option }))}
                                            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${formData.electricity === option
                                                ? 'bg-amber-600 border-amber-600 text-white shadow-sm'
                                                : 'bg-white border-gray-200 text-gray-600 hover:border-amber-300'
                                                }`}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Ventilation */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Ventilation</label>
                                <div className="flex gap-2">
                                    {['Good', 'Poor'].map(option => (
                                        <button
                                            key={option}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, ventilation: option }))}
                                            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${formData.ventilation === option
                                                ? 'bg-purple-600 border-purple-600 text-white shadow-sm'
                                                : 'bg-white border-gray-200 text-gray-600 hover:border-purple-300'
                                                }`}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Lighting */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Lighting</label>
                                <div className="flex gap-2">
                                    {['Good', 'Poor'].map(option => (
                                        <button
                                            key={option}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, lighting: option }))}
                                            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${formData.lighting === option
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                                : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'
                                                }`}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr className="border-gray-100" />

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Observation Notes</label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            rows="4"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all outline-none resize-none"
                            placeholder="Enter details about toilet condition, broken fixtures, or positive feedback..."
                        ></textarea>
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
                            <Save className="w-4 h-4" />
                        )}
                        {isEditMode ? 'Update Inspection' : 'Record Inspection'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddInspection;
