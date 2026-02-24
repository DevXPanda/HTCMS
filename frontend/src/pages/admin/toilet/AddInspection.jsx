import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { useBackTo } from '../../../contexts/NavigationContext';
import { Save, Camera, CheckCircle2, AlertCircle } from 'lucide-react';
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
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        toiletFacilityId: preSelectedFacilityId || '',
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
                    inspectionDate: new Date(inspection.inspectionDate).toISOString().split('T')[0]
                });
            }
        } catch (error) {
            console.error('Failed to fetch inspection details:', error);
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
                await api.put(`/toilet/inspections/${id}`, formData);
                alert('Inspection updated successfully!');
            } else {
                await api.post('/toilet/inspections', formData);
                alert('Inspection recorded successfully!');
            }
            navigate('/toilet-management/inspections');
        } catch (error) {
            console.error('Failed to save inspection:', error);
            alert('Failed to save inspection. Please check all fields.');
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
            <div>
                <h1 className="text-2xl font-bold text-gray-900">
                    {isEditMode ? 'Edit Inspection' : 'Record New Inspection'}
                </h1>
                <p className="text-gray-600 text-sm">Fill in the details for the toilet facility inspection</p>
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
                        </div>

                        {/* Overall Status & Photos Placeholders */}
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
                            <div className="p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
                                <Camera className="w-8 h-8 text-gray-400 mb-2" />
                                <span className="text-xs text-gray-500 font-medium text-center">Upload Photos (Optional)</span>
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
                        {isEditMode ? 'Update Inspection' : 'Record Inspection'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddInspection;
