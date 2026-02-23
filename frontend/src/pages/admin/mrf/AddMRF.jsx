import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import api from '../../../services/api';

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
                setFormData(response.data.data.facility);
            }
        } catch (error) {
            console.error('Failed to fetch MRF details:', error);
            alert('Failed to load MRF center details.');
        } finally {
            setLoading(false);
        }
    };

    const fetchWards = async () => {
        try {
            const response = await api.get('/wards');
            if (response.data && response.data.success) {
                setWards(response.data.data.wards);
            }
        } catch (error) {
            console.error('Failed to fetch wards:', error);
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
                alert('MRF center updated successfully!');
            } else {
                await api.post('/mrf/facilities', formData);
                alert('MRF center added successfully!');
            }
            navigate('/mrf/management');
        } catch (error) {
            console.error('Failed to save MRF center:', error);
            alert('Failed to save MRF center. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link to="/mrf/management" className="text-gray-400 hover:text-gray-600 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isEditMode ? 'Edit MRF Center' : 'Add New MRF Center'}
                    </h1>
                    <p className="text-gray-600 text-sm">
                        {isEditMode ? 'Update existing facility details' : 'Register a new waste processing center'}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Center Name *</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g., MRF Center South"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ward *</label>
                        <select
                            name="ward_id"
                            value={formData.ward_id}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="">Select Ward</option>
                            {wards.map(ward => (
                                <option key={ward.id} value={ward.id}>{ward.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                        <input
                            type="text"
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="e.g., Industrial Area Phase 1"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                        <select
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="active">Active</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
                    <Link to="/mrf/management" className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                        Cancel
                    </Link>
                    <button type="submit" disabled={loading} className="btn btn-primary flex items-center">
                        <Save className="h-4 w-4 mr-2" />
                        {loading ? 'Saving...' : 'Save MRF Center'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddMRF;
