import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { useBackTo } from '../../../contexts/NavigationContext';
import { Save, Clock, ShieldAlert, CheckCircle2, X, Camera, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';

const AddMaintenance = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const preSelectedFacilityId = searchParams.get('facilityId');
    useBackTo('/toilet-management/maintenance');

    const isEditMode = !!id;
    const [facilities, setFacilities] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [newMaterial, setNewMaterial] = useState({ name: '', quantity: '', cost: '' });

    const [formData, setFormData] = useState({
        toiletFacilityId: preSelectedFacilityId || '',
        type: 'Regular Cleaning',
        scheduledDate: new Date().toISOString().split('T')[0],
        completedDate: '',
        assignedStaffId: '',
        status: 'scheduled',
        priority: 'normal',
        notes: '',
        cost: 0,
        materialsUsed: [],
        photos: []
    });

    useEffect(() => {
        fetchFacilities();
        fetchStaff();
        if (isEditMode) {
            fetchMaintenanceDetails();
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

    const fetchStaff = async () => {
        try {
            const response = await api.get('/toilet/supervisors');
            if (response.data && response.data.success) {
                setStaffList(response.data.data.supervisors);
            }
        } catch (error) {
            console.error('Failed to fetch supervisors:', error);
            toast.error('Failed to load supervisor list.');
        }
    };

    const fetchMaintenanceDetails = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/toilet/maintenance/${id}`);
            if (response.data && response.data.success) {
                const record = response.data.data.maintenanceRecord;
                setFormData({
                    ...record,
                    scheduledDate: new Date(record.scheduledDate).toISOString().split('T')[0],
                    completedDate: record.completedDate ? new Date(record.completedDate).toISOString().split('T')[0] : '',
                    materialsUsed: record.materialsUsed || [],
                    photos: record.photos || []
                });
            }
        } catch (error) {
            console.error('Failed to fetch maintenance details:', error);
            toast.error('Failed to load maintenance details.');
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

    const addMaterial = () => {
        if (!newMaterial.name || !newMaterial.quantity) return;
        setFormData(prev => ({
            ...prev,
            materialsUsed: [...prev.materialsUsed, { ...newMaterial, cost: Number(newMaterial.cost) || 0 }]
        }));
        setNewMaterial({ name: '', quantity: '', cost: '' });
    };

    const removeMaterial = (index) => {
        setFormData(prev => ({
            ...prev,
            materialsUsed: prev.materialsUsed.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (isEditMode) {
                await api.put(`/toilet/maintenance/${id}`, formData);
                toast.success('Maintenance record updated successfully!');
            } else {
                await api.post('/toilet/maintenance', formData);
                toast.success('Maintenance scheduled successfully!');
            }
            navigate('/toilet-management/maintenance');
        } catch (error) {
            console.error('Failed to save maintenance:', error);
            const errorMessage = error.response?.data?.message || 'Failed to save maintenance record.';
            toast.error(errorMessage);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner spinner-md" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="ds-page-title">
                    {isEditMode ? 'Edit Maintenance Record' : 'Schedule Maintenance'}
                </h1>
                <p className="text-gray-600 text-sm">Manage repairs and routine maintenance for toilet facilities</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Facility & Type */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Toilet Facility *</label>
                                <select
                                    name="toiletFacilityId"
                                    value={formData.toiletFacilityId}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                >
                                    <option value="">Select Facility...</option>
                                    {facilities.map(f => (
                                        <option key={f.id} value={f.id}>{f.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Type *</label>
                                <select
                                    name="type"
                                    value={formData.type}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                >
                                    <option value="Regular Cleaning">Regular Cleaning</option>
                                    <option value="Plumbing Repair">Plumbing Repair</option>
                                    <option value="Electrical Repair">Electrical Repair</option>
                                    <option value="Deep Restoration">Deep Restoration</option>
                                    <option value="Civil Work">Civil Work</option>
                                </select>
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date *</label>
                                <input
                                    type="date"
                                    name="scheduledDate"
                                    value={formData.scheduledDate}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Completed Date (If done)</label>
                                <input
                                    type="date"
                                    name="completedDate"
                                    value={formData.completedDate}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                />
                            </div>
                        </div>

                        {/* Staff & Priority */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Assign Staff *</label>
                                <select
                                    name="assignedStaffId"
                                    value={formData.assignedStaffId}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                >
                                    <option value="">Select Staff...</option>
                                    {staffList.map(s => (
                                        <option key={s.id} value={s.id}>{s.full_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                                <div className="flex gap-2">
                                    {['normal', 'high', 'low'].map(p => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, priority: p }))}
                                            className={`px-3 py-1.5 text-xs font-bold uppercase rounded-full border transition-all ${formData.priority === p
                                                ? (p === 'high' ? 'bg-red-600 border-red-600' : p === 'normal' ? 'bg-blue-600 border-blue-600' : 'bg-gray-600 border-gray-600') + ' text-white'
                                                : 'bg-white border-gray-200 text-gray-600'
                                                }`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Status & Cost */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                >
                                    <option value="scheduled">Scheduled</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Total Cost (₹)</label>
                                <input
                                    type="number"
                                    name="cost"
                                    value={formData.cost}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none font-bold text-primary-700"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        {/* Photos Upload */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Photos (Optional)</label>
                            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
                                {formData.photos.map((photo, index) => (
                                    <div key={index} className="relative group aspect-square">
                                        <img
                                            src={photo}
                                            alt="Maintenance"
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
                                {formData.photos.length < 8 && (
                                    <label className={`aspect-square bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors ${uploading ? 'opacity-50' : ''}`}>
                                        <Camera className="w-6 h-6 text-gray-400 mb-1" />
                                        <span className="text-[10px] text-gray-500 font-medium">{uploading ? 'Uploading...' : 'Add'}</span>
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

                    <hr className="border-gray-100" />

                    {/* Materials Used */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Materials Used</h3>
                            <span className="text-xs text-gray-500">Add materials and their costs</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-medium text-gray-600 mb-1">Material Name</label>
                                <input
                                    type="text"
                                    value={newMaterial.name}
                                    onChange={(e) => setNewMaterial(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="e.g. PVC Pipe 2 inch"
                                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md outline-none focus:ring-1 focus:ring-primary-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Qty</label>
                                <input
                                    type="text"
                                    value={newMaterial.quantity}
                                    onChange={(e) => setNewMaterial(prev => ({ ...prev, quantity: e.target.value }))}
                                    placeholder="e.g. 5 meters"
                                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md outline-none focus:ring-1 focus:ring-primary-500"
                                />
                            </div>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Cost (₹)</label>
                                    <input
                                        type="number"
                                        value={newMaterial.cost}
                                        onChange={(e) => setNewMaterial(prev => ({ ...prev, cost: e.target.value }))}
                                        placeholder="0"
                                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md outline-none focus:ring-1 focus:ring-primary-500"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={addMaterial}
                                    className="p-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors mt-auto"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {formData.materialsUsed.map((m, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                                    <div className="flex-1 grid grid-cols-3 gap-4">
                                        <div className="font-medium text-gray-900">{m.name}</div>
                                        <div className="text-sm text-gray-500">Qty: {m.quantity}</div>
                                        <div className="text-sm font-semibold text-primary-600">₹{m.cost}</div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeMaterial(index)}
                                        className="text-red-500 hover:text-red-700 p-1"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {formData.materialsUsed.length === 0 && (
                                <p className="text-center py-4 text-xs text-gray-400 italic">No materials added yet.</p>
                            )}
                        </div>
                    </div>

                    <hr className="border-gray-100" />

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Instructions / Notes</label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            rows="4"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all outline-none resize-none"
                            placeholder="Describe what needs to be fixed or what was done..."
                        ></textarea>
                    </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="px-6 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2 text-sm font-semibold bg-primary-600 text-white hover:bg-primary-700 rounded-lg shadow-sm flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {isEditMode ? 'Update Record' : 'Schedule Maintenance'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddMaintenance;
