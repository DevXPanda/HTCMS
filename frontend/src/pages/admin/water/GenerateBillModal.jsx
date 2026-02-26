import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { waterBillAPI, propertyAPI, waterConnectionAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

const GenerateBillModal = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm({
    defaultValues: {
      propertyId: '',
      waterConnectionId: '',
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      billingPeriod: '',
      dueDate: ''
    }
  });

  const selectedPropertyId = watch('propertyId');
  const selectedConnectionId = watch('waterConnectionId');
  const year = watch('year');
  const month = watch('month');

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    if (selectedPropertyId) {
      fetchConnections(selectedPropertyId);
    } else {
      setConnections([]);
      setValue('waterConnectionId', '');
    }
  }, [selectedPropertyId, setValue]);

  // Auto-generate billing period from year and month
  useEffect(() => {
    if (year && month) {
      const period = `${year}-${String(month).padStart(2, '0')}`;
      setValue('billingPeriod', period);
    }
  }, [year, month, setValue]);

  const fetchProperties = async () => {
    try {
      const response = await propertyAPI.getAll({ limit: 1000, isActive: true });
      setProperties(response.data.data.properties || []);
    } catch (error) {
      toast.error('Failed to fetch properties');
    }
  };

  const fetchConnections = async (propertyId) => {
    try {
      setLoadingConnections(true);
      const response = await waterConnectionAPI.getByProperty(propertyId);
      const activeConnections = (response.data.data.waterConnections || []).filter(
        c => c.status === 'ACTIVE'
      );
      setConnections(activeConnections);
      if (activeConnections.length === 1) {
        setValue('waterConnectionId', activeConnections[0].id);
      } else {
        setValue('waterConnectionId', '');
      }
    } catch (error) {
      toast.error('Failed to fetch water connections');
      setConnections([]);
    } finally {
      setLoadingConnections(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);

      // Validate required fields
      if (!data.waterConnectionId) {
        toast.error('Please select a water connection');
        return;
      }

      // Prepare request payload
      const payload = {
        waterConnectionId: parseInt(data.waterConnectionId, 10)
      };

      // Use billingPeriod if provided, otherwise use year and month
      if (data.billingPeriod) {
        payload.billingPeriod = data.billingPeriod;
      } else if (data.year && data.month) {
        payload.year = parseInt(data.year, 10);
        payload.month = parseInt(data.month, 10);
      }

      // Add optional fields
      if (data.dueDate) {
        payload.dueDate = data.dueDate;
      }

      const response = await waterBillAPI.generate(payload);

      if (response.data.success) {
        toast.success('Water bill generated successfully!');
        onSuccess();
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to generate water bill';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="modal-title">Generate Water Bill</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Property Selection */}
          <div>
            <label className="label">
              Property <span className="text-red-500">*</span>
            </label>
            <select
              {...register('propertyId', { required: 'Property is required' })}
              className="input"
            >
              <option value="">Select Property</option>
              {properties.map(property => (
                <option key={property.id} value={property.id}>
                  {property.propertyNumber} - {property.address}
                  {property.ward?.wardName ? ` (${property.ward.wardName})` : ''}
                </option>
              ))}
            </select>
            {errors.propertyId && (
              <p className="text-red-500 text-sm mt-1">{errors.propertyId.message}</p>
            )}
          </div>

          {/* Water Connection Selection */}
          <div>
            <label className="label">
              Water Connection <span className="text-red-500">*</span>
            </label>
            {loadingConnections ? (
              <div className="input bg-gray-100">Loading connections...</div>
            ) : (
              <select
                {...register('waterConnectionId', { required: 'Water connection is required' })}
                className="input"
                disabled={!selectedPropertyId || connections.length === 0}
              >
                <option value="">
                  {!selectedPropertyId 
                    ? 'Select a property first' 
                    : connections.length === 0 
                    ? 'No active connections found for this property'
                    : 'Select Connection'}
                </option>
                {connections.map(connection => (
                  <option key={connection.id} value={connection.id}>
                    {connection.connectionNumber} - {connection.connectionType} 
                    ({connection.isMetered ? 'Metered' : 'Non-metered'})
                  </option>
                ))}
              </select>
            )}
            {errors.waterConnectionId && (
              <p className="text-red-500 text-sm mt-1">{errors.waterConnectionId.message}</p>
            )}
          </div>

          {/* Billing Period - Year and Month */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">
                Year <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                {...register('year', { 
                  required: 'Year is required',
                  min: { value: 2020, message: 'Year must be 2020 or later' },
                  max: { value: 2100, message: 'Year must be 2100 or earlier' }
                })}
                className="input"
                placeholder="e.g., 2024"
              />
              {errors.year && (
                <p className="text-red-500 text-sm mt-1">{errors.year.message}</p>
              )}
            </div>

            <div>
              <label className="label">
                Month <span className="text-red-500">*</span>
              </label>
              <select
                {...register('month', { required: 'Month is required' })}
                className="input"
              >
                <option value="">Select Month</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>
                    {new Date(2000, m - 1).toLocaleString('en-US', { month: 'long' })}
                  </option>
                ))}
              </select>
              {errors.month && (
                <p className="text-red-500 text-sm mt-1">{errors.month.message}</p>
              )}
            </div>
          </div>

          {/* Billing Period (auto-generated, readonly) */}
          {watch('billingPeriod') && (
            <div>
              <label className="label">Billing Period</label>
              <input
                type="text"
                value={watch('billingPeriod')}
                readOnly
                className="input bg-gray-100 cursor-not-allowed"
              />
              <p className="text-sm text-gray-500 mt-1">
                Auto-generated from year and month
              </p>
            </div>
          )}

          {/* Due Date (Optional) */}
          <div>
            <label className="label">Due Date (Optional)</label>
            <input
              type="date"
              {...register('dueDate')}
              className="input"
              min={new Date().toISOString().split('T')[0]}
            />
            <p className="text-sm text-gray-500 mt-1">
              Leave empty to auto-calculate (15 days from bill date)
            </p>
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
              {loading ? 'Generating...' : 'Generate Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GenerateBillModal;
