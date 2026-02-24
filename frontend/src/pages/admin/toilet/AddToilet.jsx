import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useBackTo } from '../../../contexts/NavigationContext';
import { Save } from 'lucide-react';
import api from '../../../services/api';

const AddToilet = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  useBackTo('/toilet-management/facilities');
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    wardId: '',
    type: 'Public',
    status: 'active',
    capacity: '',
    latitude: '',
    longitude: '',
    openingHours: '6:00 AM - 10:00 PM',
    contactPerson: '',
    contactNumber: '',
    amenities: []
  });

  const availableAmenities = [
    'Water Supply',
    'Electricity',
    'Soap Dispenser',
    'Hand Dryer',
    'Baby Changing Station',
    'Disabled Access',
    'Ventilation',
    'Lighting'
  ];


  useEffect(() => {
    fetchWards();
    if (isEditMode) {
      fetchToiletDetails();
    }
  }, [id]);

  const fetchToiletDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/toilet/facilities/${id}`);
      if (response.data && response.data.success) {
        setFormData(response.data.data.facility);
      }
    } catch (error) {
      console.error('Failed to fetch toilet details:', error);
      alert('Failed to load toilet details.');
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
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAmenityToggle = (amenity) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEditMode) {
        await api.put(`/toilet/facilities/${id}`, formData);
        alert('Toilet facility updated successfully!');
      } else {
        await api.post('/toilet/facilities', formData);
        alert('Toilet facility added successfully!');
      }
      navigate('/toilet-management/facilities');
    } catch (error) {
      console.error('Failed to save toilet:', error);
      alert('Failed to save toilet facility. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditMode ? 'Edit Toilet Facility' : 'Add New Toilet Facility'}
        </h1>
        <p className="text-gray-600 text-sm">
          {isEditMode ? 'Update existing toilet facility details' : 'Register a new public toilet facility'}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Basic Information */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Facility Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Public Toilet - Ward 1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location *
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Near Market Square"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ward *
              </label>
              <select
                name="wardId"
                value={formData.wardId}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select Ward</option>
                {wards.map(ward => (
                  <option key={ward.id} value={ward.id}>
                    {ward.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type *
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="Public">Public</option>
                <option value="Community">Community</option>
                <option value="Pay & Use">Pay & Use</option>
                <option value="Mobile">Mobile</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status *
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="active">Active</option>
                <option value="maintenance">Under Maintenance</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capacity (users) *
              </label>
              <input
                type="number"
                name="capacity"
                value={formData.capacity}
                onChange={handleChange}
                required
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., 20"
              />
            </div>
          </div>
        </div>

        {/* Location Coordinates */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Location Coordinates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Latitude
              </label>
              <input
                type="number"
                name="latitude"
                value={formData.latitude}
                onChange={handleChange}
                step="any"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., 28.6139"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Longitude
              </label>
              <input
                type="number"
                name="longitude"
                value={formData.longitude}
                onChange={handleChange}
                step="any"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., 77.2090"
              />
            </div>
          </div>
        </div>

        {/* Operating Hours & Contact */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Operating Hours & Contact</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Opening Hours
              </label>
              <input
                type="text"
                name="openingHours"
                value={formData.openingHours}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., 6:00 AM - 10:00 PM"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Person
              </label>
              <input
                type="text"
                name="contactPerson"
                value={formData.contactPerson}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Number
              </label>
              <input
                type="tel"
                name="contactNumber"
                value={formData.contactNumber}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., +91 9876543210"
              />
            </div>
          </div>
        </div>

        {/* Amenities */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Amenities</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {availableAmenities.map(amenity => (
              <label key={amenity} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.amenities.includes(amenity)}
                  onChange={() => handleAmenityToggle(amenity)}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">{amenity}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
          <Link
            to="/toilet-management/facilities"
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary flex items-center"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Facility'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddToilet;
