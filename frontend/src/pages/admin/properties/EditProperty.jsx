import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { propertyAPI, wardAPI, uploadAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import Loading from '../../../components/Loading';
import { Save, Upload, X, Image as ImageIcon } from 'lucide-react';

const EditProperty = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingProperty, setLoadingProperty] = useState(true);
  const [wards, setWards] = useState([]);
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset
  } = useForm();

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoadingProperty(true);
      const [propertyRes, wardsRes] = await Promise.all([
        propertyAPI.getById(id),
        wardAPI.getAll()
      ]);

      const property = propertyRes.data.data.property;
      setWards(wardsRes.data.data.wards);

      // Set form values
      reset({
        propertyNumber: property.propertyNumber,
        ownerName: property.ownerName || '',
        ownerPhone: property.ownerPhone || '',
        wardId: property.wardId,
        propertyType: property.propertyType,
        usageType: property.usageType || property.propertyType,
        address: property.address,
        city: property.city,
        state: property.state,
        pincode: property.pincode,
        area: property.area,
        builtUpArea: property.builtUpArea || '',
        floors: property.floors || 1,
        constructionType: property.constructionType || 'RCC',
        constructionYear: property.constructionYear || '',
        occupancyStatus: property.occupancyStatus,
        status: property.status || 'active',
        remarks: property.remarks || '',
        latitude: property.geolocation?.latitude || '',
        longitude: property.geolocation?.longitude || '',
        photos: property.photos?.join(', ') || ''
      });
      
      // Set existing photos for preview
      setUploadedPhotos(property.photos || []);
    } catch (error) {
      toast.error('Failed to load property data');
      navigate('/properties');
    } finally {
      setLoadingProperty(false);
    }
  };

  const handlePhotoUpload = async (file) => {
    try {
      setUploadingPhoto(true);
      const formData = new FormData();
      formData.append('photo', file);
      
      const response = await uploadAPI.uploadPropertyPhoto(formData);
      const photoUrl = response.data.data.url;
      
      setUploadedPhotos(prev => [...prev, photoUrl]);
      toast.success('Photo uploaded successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = (index) => {
    setUploadedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);

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

      // Combine uploaded photos with manual URLs
      let photos = [...uploadedPhotos];
      if (data.photos && typeof data.photos === 'string') {
        const manualUrls = data.photos.split(',').map(url => url.trim()).filter(url => url);
        photos = [...photos, ...manualUrls];
      }
      data.photos = photos.length > 0 ? photos : [];

      const response = await propertyAPI.update(id, data);

      if (response.data.success) {
        toast.success('Property updated successfully!');
        navigate(`/properties/${id}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update property');
    } finally {
      setLoading(false);
    }
  };

  if (loadingProperty) {
    return <Loading message="Loading property data..." />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="ds-page-title">Edit Property</h1>
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
                className="input bg-gray-100"
                readOnly
              />
              <p className="text-xs text-gray-500 mt-1">Property number cannot be changed</p>
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
              />
            </div>

            <div>
              <label className="label">City <span className="text-red-500">*</span></label>
              <input
                type="text"
                {...register('city', { required: 'City is required' })}
                className="input"
              />
            </div>

            <div>
              <label className="label">State <span className="text-red-500">*</span></label>
              <input
                type="text"
                {...register('state', { required: 'State is required' })}
                className="input"
              />
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
              />
            </div>

            <div>
              <label className="label">Longitude</label>
              <input
                type="number"
                step="any"
                {...register('longitude', { valueAsNumber: true })}
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Photos */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Property Photos (Optional)</h2>
          
          {/* Image Upload */}
          <div className="mb-4">
            <label className="label flex items-center">
              <ImageIcon className="w-4 h-4 mr-2" />
              Upload Photos from Local Storage
            </label>
            <div className="flex items-center gap-4">
              <label className="btn btn-secondary cursor-pointer">
                <Upload className="w-4 h-4 mr-2" />
                {uploadingPhoto ? 'Uploading...' : 'Choose File'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) {
                        toast.error('File size must be less than 5MB');
                        return;
                      }
                      handlePhotoUpload(file);
                    }
                    e.target.value = ''; // Reset input
                  }}
                  disabled={uploadingPhoto}
                />
              </label>
              <span className="text-sm text-gray-500">Max 5MB per image (JPEG, PNG, GIF, WebP)</span>
            </div>
          </div>

          {/* Uploaded Photos Preview */}
          {uploadedPhotos.length > 0 && (
            <div className="mb-4">
              <label className="label">Property Photos</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {uploadedPhotos.map((photoUrl, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={photoUrl}
                      alt={`Property photo ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border border-gray-200"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/200x150?text=Image+Not+Found';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Manual Photo URLs */}
          <div>
            <label className="label">Or Enter Photo URLs (comma-separated)</label>
            <input
              type="text"
              {...register('photos')}
              className="input"
              placeholder="https://example.com/photo1.jpg, https://example.com/photo2.jpg"
            />
            <p className="text-sm text-gray-500 mt-1">
              Enter photo URLs separated by commas (optional if uploading files)
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
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4 pt-4 border-t">
          <Link to={`/properties/${id}`} className="btn btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Updating...' : 'Update Property'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditProperty;
