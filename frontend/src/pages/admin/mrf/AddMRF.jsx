import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Save, MapPin, Recycle, Shield } from 'lucide-react';
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
                <div className="spinner spinner-md" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="ds-page-header">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="ds-page-title">
                            {isEditMode ? 'Edit MRF Center' : 'Add New MRF Center'}
                        </h1>
                        <p className="ds-page-subtitle">
                            {isEditMode ? 'Update existing facility details' : 'Register a new waste processing center'}
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="form-grid gap-6 md:grid-cols-2">
                    {/* Basic Information */}
                    <div className="card md:col-span-2">
                        <h3 className="form-section-title flex items-center gap-2">
                            <Recycle className="w-5 h-5 text-primary-500" />
                            Basic Information
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="label label-required">Center Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className="input"
                                    placeholder="e.g., MRF Center South"
                                />
                            </div>

                            <div>
                                <label className="label label-required">Ward</label>
                                <select
                                    name="ward_id"
                                    value={formData.ward_id}
                                    onChange={handleChange}
                                    required
                                    className="input"
                                >
                                <option value="">Select Ward</option>
                                {(wards || []).map(ward => (
                                    <option key={ward.id} value={ward.id}>
                                        Ward {ward.wardNumber} - {ward.wardName}
                                    </option>
                                ))}
                            </select>
                        </div>

                            <div>
                                <label className="label label-required">Location</label>
                                <textarea
                                    name="location"
                                    value={formData.location}
                                    onChange={handleChange}
                                    required
                                    className="input h-24 resize-none"
                                    placeholder="Enter street address or descriptive location"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Latitude</label>
                                    <input
                                        type="number"
                                        step="any"
                                        name="latitude"
                                        value={formData.latitude}
                                        onChange={handleChange}
                                        className="input"
                                        placeholder="26.1234"
                                    />
                                </div>
                                <div>
                                    <label className="label">Longitude</label>
                                    <input
                                        type="number"
                                        step="any"
                                        name="longitude"
                                        value={formData.longitude}
                                        onChange={handleChange}
                                        className="input"
                                        placeholder="85.1234"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Operational Data */}
                    <div className="card md:col-span-2">
                        <h3 className="form-section-title flex items-center gap-2">
                            <Shield className="w-5 h-5 text-primary-500" />
                            Operational Data
                        </h3>

                        <div className="form-grid gap-4">
                            <div>
                                <label className="label label-required">Capacity (TPD)</label>
                                <input
                                    type="number"
                                    step="any"
                                    name="capacity"
                                    value={formData.capacity}
                                    onChange={handleChange}
                                    required
                                    className="input"
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="label">Operating Hours</label>
                                <input
                                    type="text"
                                    name="operating_hours"
                                    value={formData.operating_hours}
                                    onChange={handleChange}
                                    className="input"
                                    placeholder="9 AM - 6 PM"
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="label">Assign Supervisor</label>
                            <select
                                name="supervisor_id"
                                value={formData.supervisor_id}
                                onChange={handleChange}
                                className="input"
                            >
                                <option value="">Select Supervisor</option>
                                {supervisors.map(sup => (
                                    <option key={sup.id} value={sup.id}>
                                        {sup.full_name} ({sup.employee_id})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-grid gap-4 mt-4">
                            <div>
                                <label className="label">Contact Person</label>
                                <input
                                    type="text"
                                    name="contact_person"
                                    value={formData.contact_person}
                                    onChange={handleChange}
                                    className="input"
                                    placeholder="Name"
                                />
                            </div>
                            <div>
                                <label className="label">Contact Number</label>
                                <input
                                    type="text"
                                    name="contact_number"
                                    value={formData.contact_number}
                                    onChange={handleChange}
                                    className="input"
                                    placeholder="Phone/Mobile"
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="label label-required">Status</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                required
                                className="input"
                            >
                                <option value="active">Active</option>
                                <option value="maintenance">Maintenance</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>

                        <div className="mt-4">
                            <label className="label">Waste Types Handled</label>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {wasteTypeOptions.map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => toggleWasteType(type)}
                                        className={`btn btn-sm ${formData.waste_types.includes(type)
                                            ? 'btn-primary'
                                            : 'btn-secondary'
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
                <div className="form-actions">
                    <Link to="/mrf/management" className="btn btn-secondary">
                        Cancel
                    </Link>
                    <button type="submit" disabled={loading} className="btn btn-primary">
                        <Save className="h-4 w-4" />
                        {loading ? 'Saving...' : 'Save MRF Center'}
                    </button>
                </div>
            </form>

            <div className="card-flat flex gap-3 bg-primary-50/50 border-primary-100">
                <Shield className="w-5 h-5 text-primary-600 shrink-0" />
                <p className="text-sm text-primary-800 leading-relaxed">
                    <strong>Production Note:</strong> Ensure the facility capacity and coordinate data are accurate as they directly impact logistics planning and monthly performance reports.
                </p>
            </div>
        </div>
    );
};

export default AddMRF;
