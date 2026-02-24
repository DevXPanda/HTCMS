import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useBackTo } from '../../../contexts/NavigationContext';
import { Save } from 'lucide-react';
import api from '../../../services/api';

const AddGauShala = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = !!id;
    useBackTo('/gaushala/facilities');
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

    const fetchFacilityDetails = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/gaushala/facilities/${id}`);
            if (response.data && response.data.success) {
                setFormData(response.data.data.facility);
            }
        } catch (error) {
            console.error('Failed to fetch Gaushala details:', error);
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
        setLoading(true);
        try {
            if (isEditMode) {
                await api.put(`/gaushala/facilities/${id}`, formData);
                alert('Gaushala updated successfully!');
            } else {
                await api.post('/gaushala/facilities', formData);
                alert('Gaushala added successfully!');
            }
            navigate('/gaushala/management');
        } catch (error) {
            console.error('Failed to save Gaushala:', error);
            alert('Failed to save. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">{isEditMode ? 'Edit Gaushala' : 'Add New Gaushala'}</h1>

            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Facility Name *</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} required className="input mt-1 w-full border border-gray-300 rounded-lg px-3 py-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Ward *</label>
                        <select name="ward_id" value={formData.ward_id} onChange={handleChange} required className="input mt-1 w-full border border-gray-300 rounded-lg px-3 py-2">
                            <option value="">Select Ward</option>
                            {wards.map(ward => (
                                <option key={ward.id} value={ward.id}>
                                    {ward.wardNumber} - {ward.wardName}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Location *</label>
                        <input type="text" name="location" value={formData.location} onChange={handleChange} required className="input mt-1 w-full border border-gray-300 rounded-lg px-3 py-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Status *</label>
                        <select name="status" value={formData.status} onChange={handleChange} className="input mt-1 w-full border border-gray-300 rounded-lg px-3 py-2">
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </div>
                <div className="flex justify-end gap-4 border-t pt-4">
                    <Link to="/gaushala/management" className="btn btn-secondary px-4 py-2 border rounded-lg text-gray-700">Cancel</Link>
                    <button type="submit" disabled={loading} className="btn btn-primary px-4 py-2 bg-blue-600 text-white rounded-lg">{loading ? 'Saving...' : 'Save Gaushala'}</button>
                </div>
            </form>
        </div>
    );
};

export default AddGauShala;
