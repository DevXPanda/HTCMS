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
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        ward_id: '',
        status: 'active'
    });

    useEffect(() => {
        fetchWards();
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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isEditMode) {
                await api.put(`/mrf/facilities/${id}`, formData);
                toast.success('MRF center updated successfully!');
            } else {
                await api.post('/mrf/facilities', formData);
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
        <div className="max-w-4xl mx-auto space-y-6">
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

            <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Center Name */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <Recycle className="w-3.5 h-3.5 text-primary-500" />
                                Center Name *
                            </label>
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

                        {/* Ward Selection */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <Shield className="w-3.5 h-3.5 text-primary-500" />
                                Ward *
                            </label>
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

                        {/* Location */}
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <MapPin className="w-3.5 h-3.5 text-primary-500" />
                                Location *
                            </label>
                            <input
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all font-medium"
                                placeholder="e.g., Industrial Area Phase 1, Near Main Gate"
                            />
                        </div>

                        {/* Status */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                Operational Status *
                            </label>
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
                    </div>

                    {/* Form Actions */}
                    <div className="flex items-center justify-end gap-4 pt-8 border-t border-gray-50">
                        <Link
                            to="/mrf/management"
                            className="px-6 py-3 text-sm font-bold text-gray-500 uppercase tracking-widest hover:text-gray-900 transition-colors"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-8 py-3 bg-gray-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-primary-600 transition-all shadow-sm hover:shadow-md active:scale-[0.98] flex items-center gap-2 disabled:opacity-50"
                        >
                            <Save className="h-4 w-4" />
                            {loading ? 'Saving...' : 'Save MRF Center'}
                        </button>
                    </div>
                </div>
            </form>

            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex gap-3">
                <Shield className="w-5 h-5 text-blue-600 shrink-0" />
                <p className="text-xs text-blue-800 leading-relaxed">
                    <strong>Note:</strong> Wards are used to group MRF facilities for reporting and logistics optimizations. Ensure the correct ward is selected for accurate data aggregation.
                </p>
            </div>
        </div>
    );
};

export default AddMRF;
