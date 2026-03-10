import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { propertyAPI, wardAPI, uploadAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import Loading from '../../../components/Loading';
import { Save, Upload, X, Image as ImageIcon, Trash2, Building2, Home, MapPin, Maximize2, FileText } from 'lucide-react';
import { useSelectedUlb } from '../../../contexts/SelectedUlbContext';
import { useAuth } from '../../../contexts/AuthContext';

const EditProperty = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { effectiveUlbId } = useSelectedUlb();
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingProperty, setLoadingProperty] = useState(true);
  const [wards, setWards] = useState([]);
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingOwnerPhoto, setUploadingOwnerPhoto] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
    watch
  } = useForm();
  const ownerPhotoUrl = watch('ownerPhotoUrl');

  useEffect(() => {
    fetchData();
  }, [id, effectiveUlbId]);

  const fetchData = async () => {
    try {
      setLoadingProperty(true);
      const wardParams = effectiveUlbId ? { ulb_id: effectiveUlbId } : {};
      const [propertyRes, wardsRes] = await Promise.all([
        propertyAPI.getById(id),
        wardAPI.getAll(wardParams)
      ]);

      const property = propertyRes.data.data.property;
      setWards(wardsRes.data.data.wards);

      // Set form values
      reset({
        propertyNumber: property.propertyNumber,
        ownerName: property.ownerName || '',
        ownerPhone: property.ownerPhone || '',
        ownerPhotoUrl: property.ownerPhotoUrl || '',
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
        longitude: property.geolocation?.longitude || ''
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

  const handleOwnerPhotoUpload = async (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    try {
      setUploadingOwnerPhoto(true);
      const formData = new FormData();
      formData.append('photo', file);
      const response = await uploadAPI.uploadOwnerPhoto(formData);
      const url = response.data?.data?.url;
      if (url) {
        setValue('ownerPhotoUrl', url);
        toast.success('Owner photo uploaded');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload owner photo');
    } finally {
      setUploadingOwnerPhoto(false);
      e.target.value = '';
    }
  };

  const clearOwnerPhoto = () => {
    setValue('ownerPhotoUrl', '');
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

      data.photos = uploadedPhotos;

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

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await propertyAPI.delete(id);
      toast.success('Property deleted successfully');
      navigate('/properties');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete property');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loadingProperty) {
    return <Loading message="Loading property data..." />;
  }

  return (
    <div>
      <div className="ds-page-header">
        <div>
          <h1 className="ds-page-title">Edit Property</h1>
          <p className="ds-page-subtitle">Update property and owner details below.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
        {/* Basic Information */}
        <div>
          <h2 className="ds-section-title flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary-600" />
            Basic Information
          </h2>
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

            {isAdmin && (
              <div className="md:col-span-2">
                <label className="label">Owner Photo</label>
                <input type="hidden" {...register('ownerPhotoUrl')} />
                <div className="flex flex-wrap items-center gap-4">
                  {ownerPhotoUrl && (
                    <div className="flex items-center gap-2">
                      {/\.(pdf|PDF)$/.test(ownerPhotoUrl) ? (
                        <a href={ownerPhotoUrl.startsWith('http') ? ownerPhotoUrl : `${import.meta.env.VITE_API_URL || ''}${ownerPhotoUrl}`} target="_blank" rel="noopener noreferrer" className="text-primary-600 text-sm flex items-center">
                          <ImageIcon className="w-4 h-4 mr-1" /> View document
                        </a>
                      ) : (
                        <img src={ownerPhotoUrl.startsWith('http') ? ownerPhotoUrl : `${import.meta.env.VITE_API_URL || ''}${ownerPhotoUrl}`} alt="Owner" className="h-20 w-20 object-cover rounded border border-gray-200" />
                      )}
                      <button type="button" onClick={clearOwnerPhoto} className="text-red-600 hover:text-red-700 text-sm flex items-center">
                        <Trash2 className="w-4 h-4 mr-1" /> Remove
                      </button>
                    </div>
                  )}
                  <label className="btn btn-secondary flex items-center cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadingOwnerPhoto ? 'Uploading…' : (ownerPhotoUrl ? 'Replace photo' : 'Upload photo')}
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf"
                      className="hidden"
                      onChange={handleOwnerPhotoUpload}
                      disabled={uploadingOwnerPhoto}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">Passport-size photo or PDF. Max 5MB.</p>
              </div>
            )}
          </div>
        </div>

        {/* Property Details */}
        <div>
          <h2 className="ds-section-title flex items-center gap-2">
            <Home className="w-5 h-5 text-primary-600" />
            Property Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          <h2 className="ds-section-title flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary-600" />
            Address
          </h2>
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
          <h2 className="ds-section-title flex items-center gap-2">
            <Maximize2 className="w-5 h-5 text-primary-600" />
            Area Information
          </h2>
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
          <h2 className="ds-section-title flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary-600" />
            Geolocation (Optional)
          </h2>
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

        {/* Property Photos */}
        <div>
          <h2 className="ds-section-title flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary-600" />
            Property Photos
          </h2>
          <p className="text-sm text-gray-500 mb-3">Max 5MB per image (JPEG, PNG, GIF, WebP).</p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="btn btn-primary cursor-pointer inline-flex items-center">
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
                  e.target.value = '';
                }}
                disabled={uploadingPhoto}
              />
            </label>
          </div>
          {uploadedPhotos.length > 0 && (
            <div className="mt-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {uploadedPhotos.map((photoUrl, index) => (
                  <div key={index} className="relative group rounded-lg border border-gray-200 overflow-hidden">
                    <img
                      src={photoUrl}
                      alt={`Property photo ${index + 1}`}
                      className="w-full h-28 object-cover"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/200x150?text=Image+Not+Found';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow"
                      aria-label="Remove photo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Remarks */}
        <div>
          <h2 className="ds-section-title flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-600" />
            Remarks
          </h2>
          <textarea
            {...register('remarks')}
            className="input"
            rows="3"
            placeholder="Any additional notes..."
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex flex-wrap justify-between items-center gap-4 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="btn bg-red-600 hover:bg-red-700 text-white flex items-center"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Property
          </button>
          <div className="flex space-x-4">
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
        </div>
      </form>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Property</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this property? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="btn bg-red-600 hover:bg-red-700 text-white"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditProperty;
