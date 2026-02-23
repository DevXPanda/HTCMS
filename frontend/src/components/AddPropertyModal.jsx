import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { propertyAPI, wardAPI } from '../services/api';
import toast from 'react-hot-toast';
import { X, Plus } from 'lucide-react';
import Loading from './Loading';

const AddPropertyModal = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [wards, setWards] = useState([]);

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
    fetchWards();
  }, []);

  const fetchWards = async () => {
    try {
      setLoadingData(true);
      const response = await wardAPI.getAll();
      setWards(response.data.data.wards || []);
    } catch (error) {
      toast.error('Failed to load wards');
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

      // Set photos to empty array (can be enhanced later)
      data.photos = [];

      // Send propertyNumber only when admin entered one (e.g. PR0010054); backend auto-generates when blank
      if (data.propertyNumber !== undefined && String(data.propertyNumber).trim() === '') {
        delete data.propertyNumber;
      }

      // Note: ownerId will be auto-matched by phone or use logged-in user
      const response = await propertyAPI.create(data);

      if (response.data.success) {
        toast.success('Property created successfully!');
        // Call onSuccess with the created property
        onSuccess(response.data.data.property);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to create property';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
          <div className="flex items-center justify-center p-8">
            <Loading />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Plus className="w-6 h-6 mr-2" />
            Add New Property
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Property Number</label>
                <input
                  type="text"
                  {...register('propertyNumber')}
                  className="input"
                  placeholder="Optional – leave blank to auto-generate (e.g. PR0010001)"
                />
                <p className="text-xs text-gray-500 mt-1">Optional. A unique code (e.g. PR0230055) is always assigned on save.</p>
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
            <h3 className="text-lg font-semibold mb-4">Property Details</h3>
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
                <select
                  {...register('usageType')}
                  className="input"
                >
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="industrial">Industrial</option>
                  <option value="agricultural">Agricultural</option>
                  <option value="mixed">Mixed</option>
                  <option value="institutional">Institutional</option>
                </select>
              </div>

              <div>
                <label className="label">
                  Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  {...register('address', { required: 'Address is required' })}
                  className="input"
                  rows="2"
                  placeholder="Enter full address"
                />
                {errors.address && (
                  <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>
                )}
              </div>

              <div>
                <label className="label">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('city', { required: 'City is required' })}
                  className="input"
                  placeholder="Enter city name"
                />
                {errors.city && (
                  <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>
                )}
              </div>

              <div>
                <label className="label">
                  State <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('state', { required: 'State is required' })}
                  className="input"
                  placeholder="Enter state name"
                />
                {errors.state && (
                  <p className="text-red-500 text-sm mt-1">{errors.state.message}</p>
                )}
              </div>

              <div>
                <label className="label">
                  Pincode <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('pincode', { required: 'Pincode is required' })}
                  className="input"
                  placeholder="123456"
                />
                {errors.pincode && (
                  <p className="text-red-500 text-sm mt-1">{errors.pincode.message}</p>
                )}
              </div>

              <div>
                <label className="label">
                  Area (sq. meters) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('area', { 
                    required: 'Area is required',
                    valueAsNumber: true,
                    min: { value: 0.01, message: 'Area must be greater than 0' }
                  })}
                  className="input"
                  placeholder="Enter area in square meters"
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
                  placeholder="Enter built-up area"
                />
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Creating...' : 'Create Property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPropertyModal;
