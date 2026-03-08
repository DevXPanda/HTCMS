import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { shopsAPI, propertyAPI, wardAPI, userAPI, uploadAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import { Save, Upload, Camera, User, X, Image as ImageIcon } from 'lucide-react';
import { useShopTaxBasePath } from '../../../contexts/ShopTaxBasePathContext';

const AddShop = () => {
  const navigate = useNavigate();
  const basePath = useShopTaxBasePath();
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState([]);
  const [wards, setWards] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [licenseFile, setLicenseFile] = useState(null);
  const [licenseFileError, setLicenseFileError] = useState('');
  const licenseFileInputRef = useRef(null);
  const [ownerPhotoUrl, setOwnerPhotoUrl] = useState('');
  const [uploadingOwnerPhoto, setUploadingOwnerPhoto] = useState(false);
  const ownerPhotoInputRef = useRef(null);
  const ownerCameraInputRef = useRef(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm({
    defaultValues: {
      shopType: 'retail',
      status: 'active'
    }
  });

  const selectedPropertyId = watch('propertyId');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedPropertyId) {
      const property = properties.find(p => p.id === parseInt(selectedPropertyId));
      if (property?.wardId) {
        setValue('wardId', property.wardId);
      }
    }
  }, [selectedPropertyId, properties, setValue]);

  const fetchInitialData = async () => {
    try {
      setLoadingData(true);
      const [propertiesRes, wardsRes, usersRes] = await Promise.all([
        propertyAPI.getAll({ limit: 1000, isActive: true }),
        wardAPI.getAll(),
        userAPI.getAll({ role: 'citizen', limit: 1000 })
      ]);
      setProperties(propertiesRes.data.data.properties || []);
      setWards(wardsRes.data.data.wards || []);
      setUsers(usersRes.data.data.users || []);
    } catch (error) {
      toast.error('Failed to load initial data');
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
    const file = licenseFileInputRef.current?.files?.[0] ?? licenseFile;
    if (!file) {
      setLicenseFileError('Trade license document (image or PDF) is required');
      toast.error('Please select a trade license document (PDF or image).');
      return;
    }
    setLicenseFileError('');
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('licenseDocument', file);
      formData.append('propertyId', data.propertyId);
      formData.append('wardId', data.wardId);
      formData.append('shopName', data.shopName);
      formData.append('shopType', data.shopType);
      if (data.ownerId) formData.append('ownerId', data.ownerId);
      if (data.area) formData.append('area', data.area);
      if (data.address) formData.append('address', data.address);
      if (data.contactName) formData.append('contactName', data.contactName);
      if (data.contactPhone) formData.append('contactPhone', data.contactPhone);
      if (ownerPhotoUrl) formData.append('ownerPhotoUrl', ownerPhotoUrl);
      formData.append('status', data.status);
      if (data.tradeLicenseNumber) formData.append('tradeLicenseNumber', data.tradeLicenseNumber);
      if (data.licenseValidFrom) formData.append('licenseValidFrom', data.licenseValidFrom);
      if (data.licenseValidTo) formData.append('licenseValidTo', data.licenseValidTo);
      if (data.licenseStatus) formData.append('licenseStatus', data.licenseStatus);
      if (data.remarks) formData.append('remarks', data.remarks);

      const response = await shopsAPI.create(formData);

      if (response.data.success) {
        toast.success('Shop created successfully');
        navigate(`${basePath}/shop-tax/shops/${response.data.data.shop.id}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create shop');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="ds-page-title">Add New Shop</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card">
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Property <span className="text-red-500">*</span>
            </label>
            <select
              {...register('propertyId', { required: 'Property is required' })}
              className="input w-full"
            >
              <option value="">Select Property</option>
              {properties.map(prop => (
                <option key={prop.id} value={prop.id}>
                  {prop.propertyNumber} - {prop.address}
                </option>
              ))}
            </select>
            {errors.propertyId && (
              <span className="text-red-500 text-sm">{errors.propertyId.message}</span>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ward <span className="text-red-500">*</span>
            </label>
            <select
              {...register('wardId', { required: 'Ward is required' })}
              className="input w-full"
              disabled={!!selectedPropertyId}
            >
              <option value="">Select Ward</option>
              {wards.map(ward => (
                <option key={ward.id} value={ward.id}>
                  {ward.wardName} (Ward {ward.wardNumber})
                </option>
              ))}
            </select>
            {errors.wardId && (
              <span className="text-red-500 text-sm">{errors.wardId.message}</span>
            )}
            {selectedPropertyId && (
              <p className="text-xs text-gray-500 mt-1">Ward auto-filled from property</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shop Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('shopName', { required: 'Shop name is required' })}
              className="input w-full"
              placeholder="Enter shop name"
            />
            {errors.shopName && (
              <span className="text-red-500 text-sm">{errors.shopName.message}</span>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shop Type <span className="text-red-500">*</span>
            </label>
            <select
              {...register('shopType', { required: 'Shop type is required' })}
              className="input w-full"
            >
              <option value="retail">Retail</option>
              <option value="wholesale">Wholesale</option>
              <option value="food_stall">Food Stall</option>
              <option value="service">Service</option>
              <option value="other">Other</option>
            </select>
            {errors.shopType && (
              <span className="text-red-500 text-sm">{errors.shopType.message}</span>
            )}
          </div>

          {/* Owner passport-size photo - right side in basic info */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
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
                  {ownerPhotoUrl.toLowerCase().endsWith('.pdf') || ownerPhotoUrl.toLowerCase().includes('pdf') ? (
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
                    onClick={() => {
                      setOwnerPhotoUrl('');
                      if (ownerPhotoInputRef.current) ownerPhotoInputRef.current.value = '';
                      if (ownerCameraInputRef.current) ownerCameraInputRef.current.value = '';
                    }}
                    className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
                  >
                    <X className="w-4 h-4" /> Remove
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Owner</label>
            <select
              {...register('ownerId')}
              className="input w-full"
            >
              <option value="">Select Owner (Optional)</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName} ({user.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Area (sq. ft.)</label>
            <input
              type="number"
              step="0.01"
              {...register('area')}
              className="input w-full"
              placeholder="Enter area"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea
              {...register('address')}
              className="input w-full"
              rows="2"
              placeholder="Enter address (if different from property)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
            <input
              type="text"
              {...register('contactName')}
              className="input w-full"
              placeholder="Enter contact name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
            <input
              type="text"
              {...register('contactPhone')}
              className="input w-full"
              placeholder="Enter contact phone"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              {...register('status', { required: 'Status is required' })}
              className="input w-full"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="closed">Closed</option>
            </select>
            {errors.status && (
              <span className="text-red-500 text-sm">{errors.status.message}</span>
            )}
          </div>

          <div className="md:col-span-2 border-t pt-4 mt-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Trade License Information</h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trade License Number</label>
            <input
              type="text"
              {...register('tradeLicenseNumber')}
              className="input w-full"
              placeholder="Enter trade license number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">License Valid From</label>
            <input
              type="date"
              {...register('licenseValidFrom')}
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">License Valid To</label>
            <input
              type="date"
              {...register('licenseValidTo')}
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">License Status</label>
            <select
              {...register('licenseStatus')}
              className="input w-full"
            >
              <option value="">Select Status</option>
              <option value="valid">Valid</option>
              <option value="expired">Expired</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trade License Document <span className="text-red-500">*</span>
            </label>
            <input
              ref={licenseFileInputRef}
              type="file"
              accept=".pdf,image/jpeg,image/jpg,image/png,image/gif,image/webp"
              className="input w-full"
              onChange={(e) => {
                const file = e.target.files?.[0];
                setLicenseFile(file || null);
                setLicenseFileError(file ? '' : 'Trade license document (image or PDF) is required');
              }}
            />
            <p className="text-xs text-gray-500 mt-1">PDF or image (JPEG, PNG, GIF, WebP). Max 10MB. Required.</p>
            {licenseFileError && (
              <span className="text-red-500 text-sm">{licenseFileError}</span>
            )}
            {licenseFile && (
              <p className="text-sm text-green-600 mt-1">Selected: {licenseFile.name}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
            <textarea
              {...register('remarks')}
              className="input w-full"
              rows="2"
              placeholder="Enter remarks (optional)"
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <Link to={`${basePath}/shop-tax/shops`} className="btn btn-secondary">
            Cancel
          </Link>
          <button type="submit" disabled={loading} className="btn btn-primary flex items-center">
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Creating...' : 'Create Shop'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddShop;
