import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, MapPin, Recycle, Shield } from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const AddMRF = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = !!id;
    const [wards, setWards] = useState([]);
    const [supervisors, setSupervisors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        ward_id: '',
        capacity: '',
        operating_hours: '',
        contact_person: '',
        contact_number: '',
        supervisor_id: '',
        waste_types: [],
        latitude: '',
        longitude: '',
        status: 'active'
    });

    const wasteTypeOptions = [
        'Plastic', 'Paper', 'Organic', 'Glass', 'Metal', 'Electronic', 'Hazardous', 'Dry Waste', 'Wet Waste'
    ];

    useEffect(() => {
        fetchWards();
        fetchSupervisors();
        if (isEditMode) {
            fetchFacilityDetails();
        }
    }, [id]);

    const fetchFacilityDetails = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/mrf/facilities/${id}`);
            if (response.data && response.data.success) {
                const facility = response.data.data.facility;
                setFormData({
                    name: facility.name || '',
                    location: facility.location || '',
                    ward_id: facility.ward_id || '',
                    capacity: facility.capacity || '',
                    operating_hours: facility.operating_hours || '',
                    contact_person: facility.contact_person || '',
                    contact_number: facility.contact_number || '',
                    supervisor_id: facility.supervisor_id || '',
                    waste_types: Array.isArray(facility.waste_types) ? facility.waste_types : [],
                    latitude: facility.latitude || '',
                    longitude: facility.longitude || '',
                    status: facility.status || 'active'
                });
            }
        } catch (error) {
            console.error('Failed to fetch MRF details:', error);
            toast.error('Failed to load MRF center details.');
        } finally {
            setLoading(false);
        }
    };

    const fetchWards = async () => {
        try {
            const response = await api.get('/wards');
            if (response.data && response.data.success) {
                setWards(response.data.data.wards || []);
            }
        } catch (error) {
            console.error('Failed to fetch wards:', error);
            toast.error('Failed to fetch wards list.');
        }
    };

    const fetchSupervisors = async () => {
        try {
            const response = await api.get('/admin-management/employees?role=SUPERVISOR&limit=100');
            setSupervisors(response.data.employees || []);
        } catch (error) {
            console.error('Failed to fetch supervisors:', error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const toggleWasteType = (type) => {
        setFormData(prev => ({
            ...prev,
            waste_types: prev.waste_types.includes(type)
                ? prev.waste_types.filter(t => t !== type)
                : [...prev.waste_types, type]
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                ...formData,
                capacity: parseFloat(formData.capacity) || 0,
                latitude: formData.latitude ? parseFloat(formData.latitude) : null,
                longitude: formData.longitude ? parseFloat(formData.longitude) : null,
                supervisor_id: formData.supervisor_id ? parseInt(formData.supervisor_id) : null
            };

            if (isEditMode) {
                await api.put(`/mrf/facilities/${id}`, payload);
                toast.success('MRF center updated successfully!');
            } else {
                await api.post('/mrf/facilities', payload);
                toast.success('MRF center added successfully!');
            }
            navigate('/mrf/management');
        } catch (error) {
            console.error('Failed to save MRF center:', error);
            toast.error(error.response?.data?.message || 'Failed to save MRF center. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (loading && isEditMode && !formData.name) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-2">
                <Link to="/mrf/management" className="p-2 bg-white rounded-xl border border-gray-100 shadow-sm text-gray-400 hover:text-primary-600 transition-all">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                        {isEditMode ? 'Edit MRF Center' : 'Add New MRF Center'}
                    </h1>
                    <p className="text-gray-500 font-medium flex items-center gap-1.5 mt-1">
                        {isEditMode ? 'Update existing facility details' : 'Register a new waste processing center'}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Information */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-8 space-y-6">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b border-gray-50 pb-4">
                            <Recycle className="w-5 h-5 text-primary-500" />
                            Basic Information
                        </h3>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Center Name *</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-medium"
                                placeholder="e.g., MRF Center South"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ward *</label>
                            <select
                                name="ward_id"
                                value={formData.ward_id}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-medium"
                            >
                                <option value="">Select Ward</option>
                                {(wards || []).map(ward => (
                                    <option key={ward.id} value={ward.id}>
                                        Ward {ward.wardNumber} - {ward.wardName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Location *</label>
                            <textarea
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-medium h-24 resize-none"
                                placeholder="Enter street address or descriptive location"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Latitude</label>
                                <input
                                    type="number"
                                    step="any"
                                    name="latitude"
                                    value={formData.latitude}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-medium"
                                    placeholder="26.1234"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Longitude</label>
                                <input
                                    type="number"
                                    step="any"
                                    name="longitude"
                                    value={formData.longitude}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-medium"
                                    placeholder="85.1234"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Operational Data */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-8 space-y-6">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b border-gray-50 pb-4">
                            <Shield className="w-5 h-5 text-primary-500" />
                            Operational Data
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Capacity (TPD) *</label>
                                <input
                                    type="number"
                                    step="any"
                                    name="capacity"
                                    value={formData.capacity}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-medium"
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Operating Hours</label>
                                <input
                                    type="text"
                                    name="operating_hours"
                                    value={formData.operating_hours}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-medium"
                                    placeholder="9 AM - 6 PM"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Assign Supervisor</label>
                            <select
                                name="supervisor_id"
                                value={formData.supervisor_id}
                                onChange={handleChange}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-medium"
                            >
                                <option value="">Select Supervisor</option>
                                {supervisors.map(sup => (
                                    <option key={sup.id} value={sup.id}>
                                        {sup.full_name} ({sup.employee_id})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Contact Person</label>
                                <input
                                    type="text"
                                    name="contact_person"
                                    value={formData.contact_person}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-medium"
                                    placeholder="Name"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Contact Number</label>
                                <input
                                    type="text"
                                    name="contact_number"
                                    value={formData.contact_number}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-medium"
                                    placeholder="Phone/Mobile"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status *</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-medium"
                            >
                                <option value="active">Active</option>
                                <option value="maintenance">Maintenance</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Waste Types Handled</label>
                            <div className="flex flex-wrap gap-2">
                                {wasteTypeOptions.map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => toggleWasteType(type)}
                                        className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all border ${formData.waste_types.includes(type)
                                            ? 'bg-primary-50 border-primary-200 text-primary-600 shadow-sm'
                                            : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                                            }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-4 p-8 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <Link
                        to="/mrf/management"
                        className="px-6 py-3 text-sm font-bold text-gray-500 uppercase tracking-widest hover:text-gray-900 transition-colors"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-12 py-4 bg-gray-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-primary-600 transition-all shadow-lg hover:shadow-primary-500/25 active:scale-[0.98] flex items-center gap-3 disabled:opacity-50"
                    >
                        <Save className="h-4 w-4" />
                        {loading ? 'Saving center...' : 'Save MRF Center'}
                    </button>
                </div>
            </form>

            <div className="p-4 bg-primary-50 rounded-2xl border border-primary-100 flex gap-3">
                <Shield className="w-5 h-5 text-primary-600 shrink-0" />
                <p className="text-xs text-primary-800 leading-relaxed font-medium">
                    <strong>Production Note:</strong> Ensure the facility capacity and coordinate data are accurate as they directly impact logistics planning and monthly performance reports.
                </p>
            </div>
        </div>
    );
};

export default AddMRF;
