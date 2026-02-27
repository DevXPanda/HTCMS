import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { waterBillAPI, propertyAPI, waterConnectionAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import { X, Search } from 'lucide-react';

const SEARCH_DEBOUNCE_MS = 300;

const GenerateBillModal = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [connections, setConnections] = useState([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [propertySearchQuery, setPropertySearchQuery] = useState('');
  const [propertySearchResults, setPropertySearchResults] = useState([]);
  const [propertySearching, setPropertySearching] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
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
  const year = watch('year');
  const month = watch('month');

  const searchProperties = useCallback(async (query) => {
    const q = String(query).trim();
    if (!q) {
      setPropertySearchResults([]);
      return;
    }
    try {
      setPropertySearching(true);
      const response = await propertyAPI.getAll({ search: q, limit: 20, status: 'active' });
      setPropertySearchResults(response.data?.data?.properties ?? []);
    } catch {
      setPropertySearchResults([]);
    } finally {
      setPropertySearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (selectedProperty) return;
      searchProperties(propertySearchQuery);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [propertySearchQuery, selectedProperty, searchProperties]);

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

  const onSelectProperty = (property) => {
    setSelectedProperty(property);
    setValue('propertyId', property.id.toString());
    setPropertySearchQuery('');
    setPropertySearchResults([]);
    setShowPropertyDropdown(false);
  };

  const clearProperty = () => {
    setSelectedProperty(null);
    setValue('propertyId', '');
    setPropertySearchQuery('');
    setPropertySearchResults([]);
    setShowPropertyDropdown(false);
    setConnections([]);
    setValue('waterConnectionId', '');
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
          {/* Property Search */}
          <div className="relative">
            <label className="label">
              Property <span className="text-red-500">*</span>
            </label>
            {selectedProperty ? (
              <div className="flex items-center gap-2">
                <div className="input flex-1 bg-gray-50">
                  ID: {selectedProperty.id} · {selectedProperty.propertyNumber}
                  {selectedProperty.address ? ` – ${selectedProperty.address}` : ''}
                  {selectedProperty.ward?.wardName ? ` (${selectedProperty.ward.wardName})` : ''}
                </div>
                <button type="button" onClick={clearProperty} className="btn btn-secondary shrink-0">Change</button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={propertySearchQuery}
                    onChange={(e) => { setPropertySearchQuery(e.target.value); setShowPropertyDropdown(true); }}
                    onFocus={() => setShowPropertyDropdown(true)}
                    onBlur={() => setTimeout(() => setShowPropertyDropdown(false), 200)}
                    className="input w-full pl-10"
                    placeholder="Search by Property ID or Property Number..."
                  />
                  {propertySearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-600 border-t-transparent" />
                    </div>
                  )}
                </div>
                {showPropertyDropdown && (propertySearchResults.length > 0 || propertySearchQuery.trim()) && (
                  <ul className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {propertySearchResults.length === 0 ? (
                      <li className="px-4 py-3 text-gray-500 text-sm">No properties found</li>
                    ) : (
                      propertySearchResults.map((property) => (
                        <li
                          key={property.id}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-0"
                          onMouseDown={(e) => { e.preventDefault(); onSelectProperty(property); }}
                        >
                          <span className="font-medium">ID: {property.id}</span>
                          <span className="text-gray-600"> · {property.propertyNumber}</span>
                          {property.address && <span className="text-gray-500"> – {property.address}</span>}
                          {property.ward?.wardName && <span className="text-gray-400"> ({property.ward.wardName})</span>}
                        </li>
                      ))
                    )}
                  </ul>
                )}
                <input type="hidden" {...register('propertyId', { required: 'Property is required' })} />
              </>
            )}
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
