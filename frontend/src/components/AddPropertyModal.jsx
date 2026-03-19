import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { propertyAPI, wardAPI, uploadAPI } from '../services/api';
import toast from 'react-hot-toast';
import { X, Plus, Upload, Camera, User, Image as ImageIcon } from 'lucide-react';
import Loading from './Loading';
import useLockBodyScroll from '../hooks/useLockBodyScroll';

const AddPropertyModal = ({ onClose, onSuccess }) => {
  useLockBodyScroll(true);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [wards, setWards] = useState([]);
  const [ownerPhotoUrl, setOwnerPhotoUrl] = useState('');
  const [uploadingOwnerPhoto, setUploadingOwnerPhoto] = useState(false);
  const ownerPhotoInputRef = useRef(null);
  const ownerCameraInputRef = useRef(null);

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

  const handleOwnerPhotoUpload = async (file) => {
    if (!file) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      toast.error('Please upload a JPG, PNG, WebP image or PDF (passport size).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }
    try {
      setUploadingOwnerPhoto(true);
      const formData = new FormData();
      formData.append('photo', file);
      const response = await uploadAPI.uploadOwnerPhoto(formData);
      setOwnerPhotoUrl(response.data.data.url);
      toast.success('Owner photo uploaded');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload owner photo');
    } finally {
      setUploadingOwnerPhoto(false);
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
      if (ownerPhotoUrl) data.ownerPhotoUrl = ownerPhotoUrl;

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
      <div className="modal-overlay">
        <div className="modal-panel modal-panel-lg max-w-4xl">
          <div className="flex items-center justify-center p-8">
            <Loading />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-panel modal-panel-lg max-w-4xl">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="label">Property Number</label>
                  <input
                    type="text"
                    {...register('propertyNumber')}
                    className="input"
                    placeholder="Optional – leave blank to auto-generate (e.g. PR0010001)"
                  />
                  <p className="text-xs text-gray-500 mt-1">Optional. A unique code is assigned on save.</p>
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
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
                <label className="label flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Owner Photo / Document
                </label>
                <p className="text-xs text-gray-500 mb-3">Passport-size image (JPG, PNG) or PDF</p>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-2">
                    <label className="btn btn-secondary cursor-pointer text-sm inline-flex items-center">
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingOwnerPhoto ? 'Uploading...' : 'Choose File'}
                      <input
                        ref={ownerPhotoInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleOwnerPhotoUpload(file);
                          e.target.value = '';
                        }}
                        disabled={uploadingOwnerPhoto}
                      />
                    </label>
                    <label className="btn btn-secondary cursor-pointer text-sm inline-flex items-center">
                      <Camera className="w-4 h-4 mr-2" />
                      Camera
                      <input
                        ref={ownerCameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="user"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleOwnerPhotoUpload(file);
                          e.target.value = '';
                        }}
                        disabled={uploadingOwnerPhoto}
                      />
                    </label>
                  </div>
                  {ownerPhotoUrl && (
                    <div className="mt-2 flex items-center gap-2">
                      {ownerPhotoUrl.toLowerCase().includes('pdf') || ownerPhotoUrl.endsWith('.pdf') ? (
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <ImageIcon className="w-4 h-4" /> PDF uploaded
                        </span>
                      ) : (
                        <img
                          src={ownerPhotoUrl}
                          alt="Owner"
                          className="h-20 w-20 object-cover rounded border border-gray-200"
                          onError={(e) => { e.target.src = ''; e.target.alt = 'Preview'; }}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => { setOwnerPhotoUrl(''); if (ownerPhotoInputRef.current) ownerPhotoInputRef.current.value = ''; if (ownerCameraInputRef.current) ownerCameraInputRef.current.value = ''; }}
                        className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
                      >
                        <X className="w-4 h-4" /> Remove
                      </button>
                    </div>
                  )}
                </div>
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
