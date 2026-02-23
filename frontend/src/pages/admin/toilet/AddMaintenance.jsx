import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Clock, ShieldAlert, CheckCircle2 } from 'lucide-react';
import api from '../../../services/api';

const AddMaintenance = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const preSelectedFacilityId = searchParams.get('facilityId');

    const isEditMode = !!id;
    const [facilities, setFacilities] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

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
        }
    };

    const fetchStaff = async () => {
        try {
            const response = await api.get('/admin-management/users');
            if (response.data) {
                setStaffList(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch staff:', error);
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
                    completedDate: record.completedDate ? new Date(record.completedDate).toISOString().split('T')[0] : ''
                });
            }
        } catch (error) {
            console.error('Failed to fetch maintenance details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (isEditMode) {
                await api.put(`/toilet/maintenance/${id}`, formData);
                alert('Maintenance record updated successfully!');
            } else {
                await api.post('/toilet/maintenance', formData);
                alert('Maintenance scheduled successfully!');
            }
            navigate('/toilet-management/maintenance');
        } catch (error) {
            console.error('Failed to save maintenance:', error);
            alert('Failed to save maintenance record.');
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
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isEditMode ? 'Edit Maintenance Record' : 'Schedule Maintenance'}
                    </h1>
                    <p className="text-gray-600 text-sm">Manage repairs and routine maintenance for toilet facilities</p>
                </div>
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Cost (₹)</label>
                                <input
                                    type="number"
                                    name="cost"
                                    value={formData.cost}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                    placeholder="0.00"
                                />
                            </div>
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
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
