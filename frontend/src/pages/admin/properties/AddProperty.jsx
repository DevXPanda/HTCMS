import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { propertyAPI, wardAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Save } from 'lucide-react';
import { Link } from 'react-router-dom';

const AddProperty = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [wards, setWards] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm({
    defaultValues: {
      propertyType: 'residential',
      usageType: 'residential',
      occupancyStatus: 'owner_occupied',
      status: 'active',
      floors: 1,
      constructionType: 'RCC'
    }
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoadingData(true);
      const wardsRes = await wardAPI.getAll();
      setWards(wardsRes.data.data.wards);
    } catch (error) {
      toast.error('Failed to load initial data');
    } finally {
      setLoadingData(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);

      // Convert wardId to number
      if (data.wardId) {
        data.wardId = parseInt(data.wardId, 10);
      }

      // Ensure area is a number
      if (data.area) {
        data.area = parseFloat(data.area);
      }

      // Ensure builtUpArea is a number if provided
      if (data.builtUpArea) {
        data.builtUpArea = parseFloat(data.builtUpArea);
      }

      // Ensure floors is a number if provided
      if (data.floors) {
        data.floors = parseInt(data.floors, 10);
      }

      // Ensure constructionYear is a number if provided
      if (data.constructionYear) {
        data.constructionYear = parseInt(data.constructionYear, 10);
      }

      // Format geolocation if provided
      if (data.latitude && data.longitude) {
        data.geolocation = {
          latitude: parseFloat(data.latitude),
          longitude: parseFloat(data.longitude)
        };
        delete data.latitude;
        delete data.longitude;
      } else {
        delete data.geolocation;
      }

      // Format photos if provided
      if (data.photos && typeof data.photos === 'string') {
        data.photos = data.photos.split(',').map(url => url.trim()).filter(url => url);
      } else if (!data.photos || (Array.isArray(data.photos) && data.photos.length === 0)) {
        delete data.photos;
      }

      const response = await propertyAPI.create(data);

      if (response.data.success) {
        toast.success('Property created successfully!');
        navigate('/properties');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to create property';
      console.error('Property creation error:', error.response?.data || error);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link to="/properties" className="mr-4 text-primary-600 hover:text-primary-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Add New Property</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
        {/* Basic Information */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">
                Property Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('propertyNumber', { required: 'Property number is required' })}
                className="input"
                placeholder="PROP-001"
              />
              {errors.propertyNumber && (
                <p className="text-red-500 text-sm mt-1">{errors.propertyNumber.message}</p>
              )}
            </div>

            <div>
              <label className="label">Ward <span className="text-red-500">*</span></label>
              <select
                {...register('wardId', { required: 'Ward is required' })}
                className="input"
              >
                <option value="">Select Ward</option>
                {wards.map(ward => (
                  <option key={ward.id} value={ward.id}>
                    {ward.wardNumber} - {ward.wardName}
                  </option>
                ))}
              </select>
              {errors.wardId && (
                <p className="text-red-500 text-sm mt-1">{errors.wardId.message}</p>
              )}
            </div>

            <div>
              <label className="label">
                Owner Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('ownerName', { required: 'Owner name is required' })}
                className="input"
                placeholder="Enter owner's full name"
              />
              {errors.ownerName && (
                <p className="text-red-500 text-sm mt-1">{errors.ownerName.message}</p>
              )}
            </div>

            <div>
              <label className="label">
                Owner Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                {...register('ownerPhone', { required: 'Owner phone is required' })}
                className="input"
                placeholder="+91 1234567890"
              />
              {errors.ownerPhone && (
                <p className="text-red-500 text-sm mt-1">{errors.ownerPhone.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Property Details */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Property Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Property Type <span className="text-red-500">*</span></label>
              <select
                {...register('propertyType', { required: 'Property type is required' })}
                className="input"
              >
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="industrial">Industrial</option>
                <option value="agricultural">Agricultural</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>

            <div>
              <label className="label">Usage Type</label>
              <select {...register('usageType')} className="input">
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="industrial">Industrial</option>
                <option value="agricultural">Agricultural</option>
                <option value="mixed">Mixed</option>
                <option value="institutional">Institutional</option>
              </select>
            </div>

            <div>
              <label className="label">Construction Type</label>
              <select {...register('constructionType')} className="input">
                <option value="RCC">RCC</option>
                <option value="Pucca">Pucca</option>
                <option value="Semi-Pucca">Semi-Pucca</option>
                <option value="Kutcha">Kutcha</option>
              </select>
            </div>

            <div>
              <label className="label">Number of Floors</label>
              <input
                type="number"
                {...register('floors', { min: 1, valueAsNumber: true })}
                className="input"
                min="1"
              />
            </div>

            <div>
              <label className="label">Construction Year</label>
              <input
                type="number"
                {...register('constructionYear', { valueAsNumber: true })}
                className="input"
                placeholder="2020"
              />
            </div>

            <div>
              <label className="label">Occupancy Status</label>
              <select {...register('occupancyStatus')} className="input">
                <option value="owner_occupied">Owner Occupied</option>
                <option value="tenant_occupied">Tenant Occupied</option>
                <option value="vacant">Vacant</option>
              </select>
            </div>

            <div>
              <label className="label">Status</label>
              <select {...register('status')} className="input">
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
                <option value="disputed">Disputed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Address */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Address</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Address <span className="text-red-500">*</span></label>
              <textarea
                {...register('address', { required: 'Address is required' })}
                className="input"
                rows="3"
                placeholder="Complete address"
              />
              {errors.address && (
                <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>
              )}
            </div>

            <div>
              <label className="label">City <span className="text-red-500">*</span></label>
              <input
                type="text"
                {...register('city', { required: 'City is required' })}
                className="input"
              />
              {errors.city && (
                <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>
              )}
            </div>

            <div>
              <label className="label">State <span className="text-red-500">*</span></label>
              <input
                type="text"
                {...register('state', { required: 'State is required' })}
                className="input"
              />
              {errors.state && (
                <p className="text-red-500 text-sm mt-1">{errors.state.message}</p>
              )}
            </div>

            <div>
              <label className="label">Pincode <span className="text-red-500">*</span></label>
              <input
                type="text"
                {...register('pincode', {
                  required: 'Pincode is required',
                  pattern: {
                    value: /^\d{6}$/,
                    message: 'Pincode must be 6 digits'
                  }
                })}
                className="input"
                maxLength="6"
              />
              {errors.pincode && (
                <p className="text-red-500 text-sm mt-1">{errors.pincode.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Area Information */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Area Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Total Area (sq. meters) <span className="text-red-500">*</span></label>
              <input
                type="number"
                step="0.01"
                {...register('area', {
                  required: 'Area is required',
                  min: { value: 0.01, message: 'Area must be greater than 0' },
                  valueAsNumber: true
                })}
                className="input"
              />
              {errors.area && (
                <p className="text-red-500 text-sm mt-1">{errors.area.message}</p>
              )}
            </div>

            <div>
              <label className="label">Built-up Area (sq. meters)</label>
              <input
                type="number"
                step="0.01"
                {...register('builtUpArea', { valueAsNumber: true })}
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Geolocation */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Geolocation (Optional)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Latitude</label>
              <input
                type="number"
                step="any"
                {...register('latitude', { valueAsNumber: true })}
                className="input"
                placeholder="28.6139"
              />
            </div>

            <div>
              <label className="label">Longitude</label>
              <input
                type="number"
                step="any"
                {...register('longitude', { valueAsNumber: true })}
                className="input"
                placeholder="77.2090"
              />
            </div>
          </div>
        </div>

        {/* Photos */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Photos (Optional)</h2>
          <div>
            <label className="label">Photo URLs (comma-separated)</label>
            <input
              type="text"
              {...register('photos')}
              className="input"
              placeholder="https://example.com/photo1.jpg, https://example.com/photo2.jpg"
            />
            <p className="text-sm text-gray-500 mt-1">
              Enter photo URLs separated by commas
            </p>
          </div>
        </div>

        {/* Remarks */}
        <div>
          <label className="label">Remarks</label>
          <textarea
            {...register('remarks')}
            className="input"
            rows="3"
            placeholder="Any additional notes..."
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4 pt-4 border-t">
          <Link to="/properties" className="btn btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Creating...' : 'Create Property'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddProperty;
