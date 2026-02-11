import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { shopsAPI, propertyAPI, wardAPI, userAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Save } from 'lucide-react';
import Loading from '../../../components/Loading';

const EditShop = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [shop, setShop] = useState(null);
  const [properties, setProperties] = useState([]);
  const [wards, setWards] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm();

  const selectedPropertyId = watch('propertyId');

  useEffect(() => {
    fetchShop();
    fetchInitialData();
  }, [id]);

  useEffect(() => {
    if (selectedPropertyId && shop) {
      const property = properties.find(p => p.id === parseInt(selectedPropertyId));
      if (property?.wardId) {
        setValue('wardId', property.wardId);
      }
    }
  }, [selectedPropertyId, properties, shop, setValue]);

  const fetchShop = async () => {
    try {
      const response = await shopsAPI.getById(id);
      const shopData = response.data.data.shop;
      setShop(shopData);
      setValue('propertyId', shopData.propertyId);
      setValue('wardId', shopData.wardId);
      setValue('shopName', shopData.shopName);
      setValue('shopType', shopData.shopType);
      setValue('ownerId', shopData.ownerId || '');
      setValue('area', shopData.area || '');
      setValue('address', shopData.address || '');
      setValue('contactName', shopData.contactName || '');
      setValue('contactPhone', shopData.contactPhone || '');
      setValue('status', shopData.status);
      setValue('tradeLicenseNumber', shopData.tradeLicenseNumber || '');
      setValue('licenseValidFrom', shopData.licenseValidFrom ? shopData.licenseValidFrom.split('T')[0] : '');
      setValue('licenseValidTo', shopData.licenseValidTo ? shopData.licenseValidTo.split('T')[0] : '');
      setValue('licenseStatus', shopData.licenseStatus || '');
      setValue('remarks', shopData.remarks || '');
    } catch (error) {
      toast.error('Failed to fetch shop details');
    } finally {
      setLoadingData(false);
    }
  };

  const fetchInitialData = async () => {
    try {
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
    }
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      const response = await shopsAPI.update(id, {
        propertyId: parseInt(data.propertyId),
        wardId: parseInt(data.wardId),
        shopName: data.shopName,
        shopType: data.shopType,
        ownerId: data.ownerId ? parseInt(data.ownerId) : null,
        area: data.area ? parseFloat(data.area) : null,
        address: data.address || null,
        contactName: data.contactName || null,
        contactPhone: data.contactPhone || null,
        status: data.status,
        tradeLicenseNumber: data.tradeLicenseNumber || null,
        licenseValidFrom: data.licenseValidFrom || null,
        licenseValidTo: data.licenseValidTo || null,
        licenseStatus: data.licenseStatus || null,
        remarks: data.remarks || null
      });

      if (response.data.success) {
        toast.success('Shop updated successfully');
        navigate(`/shop-tax/shops/${id}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update shop');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData || !shop) {
    return <Loading />;
  }

  return (
    <div>
      <Link to={`/shop-tax/shops/${id}`} className="flex items-center text-primary-600 mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Shop Details
      </Link>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Edit Shop</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shop Number
            </label>
            <input
              type="text"
              value={shop.shopNumber}
              disabled
              className="input w-full bg-gray-100"
            />
            <p className="text-xs text-gray-500 mt-1">Shop number cannot be changed</p>
          </div>

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
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea
              {...register('address')}
              className="input w-full"
              rows="2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
            <input
              type="text"
              {...register('contactName')}
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
            <input
              type="text"
              {...register('contactPhone')}
              className="input w-full"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
            <textarea
              {...register('remarks')}
              className="input w-full"
              rows="2"
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <Link to={`/shop-tax/shops/${id}`} className="btn btn-secondary">
            Cancel
          </Link>
          <button type="submit" disabled={loading} className="btn btn-primary flex items-center">
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Updating...' : 'Update Shop'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditShop;
