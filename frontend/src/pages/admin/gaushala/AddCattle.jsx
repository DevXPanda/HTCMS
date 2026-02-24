import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useBackTo } from '../../../contexts/NavigationContext';
import { Save } from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const AddCattle = () => {
    const navigate = useNavigate();
    useBackTo('/gaushala/all-cattle');
    const [facilities, setFacilities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        tag_number: '',
        gau_shala_facility_id: '',
        animal_type: 'cow',
        gender: 'female',
        date_of_birth: '',
        health_status: 'healthy',
        notes: ''
    });

    useEffect(() => {
        fetchFacilities();
    }, []);

    const fetchFacilities = async () => {
        try {
            const response = await api.get('/gaushala/facilities');
            if (response.data && response.data.success) {
                setFacilities(response.data.data.facilities);
            }
        } catch (error) {
            console.error('Failed to fetch facilities:', error);
            toast.error('Failed to load facilities');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await api.post('/gaushala/cattle', formData);
            if (response.data && response.data.success) {
                toast.success('Animal registered successfully!');
                navigate('/gaushala/all-cattle');
            }
        } catch (error) {
            console.error('Failed to register animal:', error);
            toast.error(error.response?.data?.message || 'Failed to register animal');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Register New Animal</h1>
                <p className="text-gray-600 text-sm">Add a new animal to the centralized registry</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Tag Number */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tag Number *
                        </label>
                        <input
                            type="text"
                            name="tag_number"
                            value={formData.tag_number}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                            placeholder="e.g. MH-G001"
                        />
                    </div>

                    {/* Gaushala Facility */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Gaushala Facility *
                        </label>
                        <select
                            name="gau_shala_facility_id"
                            value={formData.gau_shala_facility_id}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all appearance-none bg-white"
                        >
                            <option value="">Select Facility</option>
                            {facilities.map(facility => (
                                <option key={facility.id} value={facility.id}>
                                    {facility.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Animal Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Animal Type *
                        </label>
                        <select
                            name="animal_type"
                            value={formData.animal_type}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all appearance-none bg-white"
                        >
                            <option value="cow">Cow</option>
                            <option value="buffalo">Buffalo</option>
                            <option value="bull">Bull</option>
                            <option value="calf">Calf</option>
                            <option value="other">Other</option>
                        </select>
                    </div>

                    {/* Gender */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Gender *
                        </label>
                        <select
                            name="gender"
                            value={formData.gender}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all appearance-none bg-white"
                        >
                            <option value="female">Female</option>
                            <option value="male">Male</option>
                        </select>
                    </div>

                    {/* Date of Birth */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date of Birth
                        </label>
                        <input
                            type="date"
                            name="date_of_birth"
                            value={formData.date_of_birth}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                        />
                    </div>

                    {/* Health Status */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Health Status *
                        </label>
                        <select
                            name="health_status"
                            value={formData.health_status}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all appearance-none bg-white"
                        >
                            <option value="healthy">Healthy</option>
                            <option value="sick">Sick</option>
                            <option value="under_treatment">Under Treatment</option>
                            <option value="critical">Critical</option>
                            <option value="quarantined">Quarantined</option>
                        </select>
                    </div>
                </div>

                {/* Notes */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                    </label>
                    <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        rows="4"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                        placeholder="Additional details about the animal..."
                    ></textarea>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
                    <Link
                        to="/gaushala/all-cattle"
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:ring-4 focus:ring-primary-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center"
                    >
                        <Save className="h-4 w-4 mr-2" />
                        {loading ? 'Registering...' : 'Register Animal'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddCattle;
