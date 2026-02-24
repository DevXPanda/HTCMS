import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useBackTo } from '../../../contexts/NavigationContext';
import { Save, ClipboardCheck, AlertCircle, Calendar } from 'lucide-react';
import api from '../../../services/api';

const AddGauShalaInspection = () => {
    const navigate = useNavigate();
    const { id } = useParams(); // For edit mode
    const isEditMode = !!id;

    useBackTo('/gaushala/inspections');

    const [facilities, setFacilities] = useState([]);
    const [inspectors, setInspectors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        gau_shala_facility_id: '',
        inspector_id: '',
        inspection_date: new Date().toISOString().split('T')[0],
        findings: '',
        veterinary_notes: '',
        next_inspection_due: '',
        status: 'pending'
    });

    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            await Promise.all([
                fetchFacilities(),
                fetchInspectors()
            ]);
            if (isEditMode) {
                await fetchInspectionDetails();
            }
            setLoading(false);
        };
        loadInitialData();
    }, [id]);

    const fetchFacilities = async () => {
        try {
            const response = await api.get('/gaushala/facilities');
            if (response.data && response.data.success) {
                setFacilities(response.data.data.facilities);
            }
        } catch (error) {
            console.error('Failed to fetch Gaushala facilities:', error);
        }
    };

    const fetchInspectors = async () => {
        try {
            const response = await api.get('/admin-management/employees?status=active&role=INSPECTOR,OFFICER');
            if (response.data && response.data.employees) {
                setInspectors(response.data.employees);
            }
        } catch (error) {
            console.error('Failed to fetch inspectors:', error);
        }
    };

    const fetchInspectionDetails = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/gaushala/inspections/${id}`);
            if (response.data && response.data.success) {
                const inspection = response.data.data.inspection;
                setFormData({
                    gau_shala_facility_id: inspection.gau_shala_facility_id,
                    inspector_id: inspection.inspector_id || '',
                    inspection_date: inspection.inspection_date,
                    findings: inspection.findings || '',
                    veterinary_notes: inspection.veterinary_notes || '',
                    next_inspection_due: inspection.next_inspection_due || '',
                    status: inspection.status
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

        // Validation logic
        if (formData.status === 'completed' && !formData.next_inspection_due) {
            alert('Next inspection due date is required when status is Completed');
            return;
        }

        if (!formData.inspector_id) {
            alert('Inspector is required');
            return;
        }

        const submitData = {
            ...formData,
            next_inspection_due: formData.next_inspection_due || null,
            findings: formData.findings || null,
            veterinary_notes: formData.veterinary_notes || null,
            inspector_id: formData.inspector_id ? parseInt(formData.inspector_id) : null,
            gau_shala_facility_id: formData.gau_shala_facility_id ? parseInt(formData.gau_shala_facility_id) : null
        };

        setSaving(true);
        try {
            if (isEditMode) {
                await api.put(`/gaushala/inspections/${id}`, submitData);
                alert('Gaushala inspection updated successfully!');
            } else {
                await api.post('/gaushala/inspections', submitData);
                alert('Gaushala inspection scheduled successfully!');
            }
            navigate('/gaushala/inspections');
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
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">
                    {isEditMode ? 'Edit Inspection' : 'Schedule New Inspection'}
                </h1>
                <p className="text-gray-600 text-sm">Record veterinary and facility inspection details for Gaushala</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-8 space-y-8">
                    {/* Primary Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        {/* Gaushala Facility */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Gaushala Facility *</label>
                            <select
                                name="gau_shala_facility_id"
                                value={formData.gau_shala_facility_id}
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

                        {/* Inspector */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Inspector *</label>
                            <select
                                name="inspector_id"
                                value={formData.inspector_id}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all outline-none font-medium text-gray-900"
                            >
                                <option value="">Choose an inspector...</option>
                                {inspectors.map(inspector => (
                                    <option key={inspector.id} value={inspector.id}>
                                        {inspector.full_name} – {inspector.role}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Inspection Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Inspection Date *</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="date"
                                    name="inspection_date"
                                    value={formData.inspection_date}
                                    onChange={handleChange}
                                    required
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                                />
                            </div>
                        </div>

                        {/* Status */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                            >
                                <option value="pending">Pending</option>
                                <option value="completed">Completed</option>
                                <option value="critical">Critical</option>
                                <option value="follow_up">Follow Up</option>
                            </select>
                        </div>

                        {/* Next Due Date */}
                        <div className={formData.status !== 'completed' && !isEditMode ? 'opacity-50' : ''}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Next Inspection Due {formData.status === 'completed' && '*'}
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="date"
                                    name="next_inspection_due"
                                    value={formData.next_inspection_due}
                                    onChange={handleChange}
                                    required={formData.status === 'completed'}
                                    disabled={formData.status !== 'completed' && !isEditMode}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                                />
                            </div>
                        </div>

                        {/* Info Box */}
                        <div className="flex items-center">
                            <div className="p-4 bg-primary-50 border border-primary-100 rounded-xl w-full flex items-center space-x-4">
                                <div className="p-2 bg-white rounded-lg shadow-sm">
                                    <ClipboardCheck className="text-primary-600 w-5 h-5" />
                                </div>
                                <p className="text-xs text-primary-700 leading-relaxed font-medium">
                                    Regular inspections ensure cattle health and facility hygiene standards.
                                </p>
                            </div>
                        </div>
                    </div>

                    <hr className="border-gray-100" />

                    {/* Findings & Notes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Findings / Observations *</label>
                            <textarea
                                name="findings"
                                value={formData.findings}
                                onChange={handleChange}
                                required
                                rows="4"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all outline-none resize-none"
                                placeholder="Describe facility conditions, cattle health issues, etc."
                            ></textarea>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Veterinary Notes</label>
                            <textarea
                                name="veterinary_notes"
                                value={formData.veterinary_notes}
                                onChange={handleChange}
                                rows="4"
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all outline-none resize-none"
                                placeholder="Specific medical or dietary notes from the veterinarian..."
                            ></textarea>
                        </div>
                    </div>
                </div>

                <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="px-6 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="btn btn-primary px-8 py-2 rounded-lg flex items-center gap-2"
                    >
                        {saving ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {isEditMode ? 'Update Inspection' : 'Schedule Inspection'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddGauShalaInspection;
