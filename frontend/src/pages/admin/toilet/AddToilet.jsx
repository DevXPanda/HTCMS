import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useBackTo } from '../../../contexts/NavigationContext';
import { Save, Camera, X, Check, MapPin, Clock, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';

const AddToilet = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  useBackTo('/toilet-management/facilities');

  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
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
    amenities: [],
    photos: [],
    notes: ''
  });

  const availableAmenities = [
    'Water Supply',
    'Electricity',
    'Soap Dispenser',
    'Hand Dryer',
    'Baby Changing Station',
    'Disabled Access',
    'Ventilation',
    'Lighting',
    'Sanitary Vending Machine',
    'Exhaust Fan',
    'Mirror',
    'Dustbin'
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
        const data = response.data.data.facility;
        setFormData({
          ...data,
          amenities: data.amenities || [],
          photos: data.photos || []
        });
      }
    } catch (error) {
      console.error('Failed to fetch toilet details:', error);
      toast.error('Failed to load toilet details.');
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

  const handleAmenityToggle = (amenity) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    const formDataUpload = new FormData();
    formDataUpload.append('photo', file);

    try {
      setUploading(true);
      const response = await api.post('/upload/toilet-photo', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data && response.data.success) {
        setFormData(prev => ({
          ...prev,
          photos: [...prev.photos, response.data.data.url]
        }));
      }
    } catch (error) {
      console.error('Failed to upload photo:', error);
      toast.error('Failed to upload photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSave = {
        ...formData,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null
      };

      if (isEditMode) {
        await api.put(`/toilet/facilities/${id}`, dataToSave);
        toast.success('Facility updated successfully!');
      } else {
        await api.post('/toilet/facilities', dataToSave);
        toast.success('Facility added successfully!');
      }
      navigate('/toilet-management/facilities');
    } catch (error) {
      console.error('Failed to save toilet:', error);
      const errorMessage = error.response?.data?.message || 'Failed to save facility. Please check if all required fields are filled.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditMode ? 'Edit Facility' : 'New Toilet Facility'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Register and manage public sanitation facilities
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-primary-600" /> General Identification
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Facility Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="e.g., Pink Toilet - Central Market"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Ward Selection *</label>
                <select
                  name="wardId"
                  value={formData.wardId}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="">Choose Ward</option>
                  {wards.map(ward => (
                    <option key={ward.id} value={ward.id}>{ward.wardName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Facility Type *</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="Public">Public (PT)</option>
                  <option value="Community">Community (CT)</option>
                  <option value="Pay & Use">Pay & Use</option>
                  <option value="Modular">Modular</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Location Address *</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="Full landmark or area details"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Operational Details */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-600" /> Operations & Capacity
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Daily Capacity</label>
                <input
                  type="number"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="Avg users"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Operating Hours</label>
                <input
                  type="text"
                  name="openingHours"
                  value={formData.openingHours}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="6:00 AM - 10:00 PM"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Status *</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Contact Name</label>
                <input
                  type="text"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">Contact Number</label>
                <input
                  type="tel"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Amenities Checklist */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" /> Amenities & Features
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {availableAmenities.map(amenity => (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => handleAmenityToggle(amenity)}
                  className={`flex items-center justify-between p-3 rounded-xl border text-[11px] font-bold transition-all ${formData.amenities.includes(amenity)
                    ? 'bg-primary-50 border-primary-200 text-primary-700 ring-2 ring-primary-100'
                    : 'bg-gray-50 border-gray-100 text-gray-500 hover:border-gray-200'
                    }`}
                >
                  {amenity}
                  {formData.amenities.includes(amenity) && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Photos */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center justify-between">
              Photos Area
              <span className="text-[10px] opacity-60">Max 5</span>
            </h2>

            <div className="grid grid-cols-2 gap-3">
              {formData.photos.map((p, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-gray-100">
                  <img src={p} alt="toilet" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    className="absolute top-1.5 right-1.5 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {formData.photos.length < 5 && (
                <label className={`aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 transition-all ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Camera className="w-6 h-6 text-gray-300" />
                  <span className="text-[10px] font-bold text-gray-400">Add Photo</span>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
              )}
            </div>
          </div>

          {/* Coordinates */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Geo Coordinates</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Latitude</label>
                <input
                  type="number"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleChange}
                  step="any"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs"
                  placeholder="28.6139..."
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Longitude</label>
                <input
                  type="number"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleChange}
                  step="any"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs"
                  placeholder="77.2090..."
                />
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Internal Notes</h2>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="w-full h-24 p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary-200 resize-none"
              placeholder="Additional details for administrative use..."
            />
          </div>

          {/* Final Actions */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || uploading}
              className="w-full btn btn-primary py-3 rounded-2xl flex items-center justify-center gap-3 font-bold text-sm shadow-xl shadow-primary-500/20"
            >
              <Save className="w-5 h-5" />
              {loading ? 'Saving...' : (isEditMode ? 'Update Facility' : 'Create Facility')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddToilet;
