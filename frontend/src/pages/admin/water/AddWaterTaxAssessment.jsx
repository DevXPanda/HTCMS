import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { waterTaxAssessmentAPI, propertyAPI, waterConnectionAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import { Save, Search } from 'lucide-react';

const SEARCH_DEBOUNCE_MS = 300;

const AddWaterTaxAssessment = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [waterConnections, setWaterConnections] = useState([]);
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
      assessmentYear: new Date().getFullYear(),
      assessmentType: 'FIXED',
      rate: 0
    }
  });

  const selectedPropertyId = watch('propertyId');
  const selectedAssessmentType = watch('assessmentType');

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
      fetchWaterConnections(selectedPropertyId);
    } else {
      setWaterConnections([]);
      setValue('waterConnectionId', '');
    }
  }, [selectedPropertyId, setValue]);

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
    setWaterConnections([]);
    setValue('waterConnectionId', '');
  };

  const fetchWaterConnections = async (propertyId) => {
    try {
      setLoadingConnections(true);
      const response = await waterConnectionAPI.getByProperty(propertyId);
      setWaterConnections(response.data.data.waterConnections || []);
      if (response.data.data.waterConnections.length === 1) {
        setValue('waterConnectionId', response.data.data.waterConnections[0].id);
      } else {
        setValue('waterConnectionId', '');
      }
    } catch (error) {
      toast.error('Failed to load water connections');
      setWaterConnections([]);
    } finally {
      setLoadingConnections(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);

      const assessmentData = {
        propertyId: parseInt(data.propertyId),
        waterConnectionId: parseInt(data.waterConnectionId),
        assessmentYear: parseInt(data.assessmentYear),
        assessmentType: data.assessmentType,
        rate: parseFloat(data.rate),
        remarks: data.remarks || null
      };

      const response = await waterTaxAssessmentAPI.create(assessmentData);

      if (response.data.success) {
        toast.success('Water tax assessment created successfully!');
        navigate('/water/assessments');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to create assessment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="ds-page-title">Create New Water Tax Assessment</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
        {/* Property Search */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Property Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 relative">
              <label className="label">
                Property <span className="text-red-500">*</span>
              </label>
              {selectedProperty ? (
                <div className="input flex items-center justify-between bg-gray-50">
                  <span>
                    ID: {selectedProperty.id} · {selectedProperty.propertyNumber} – {selectedProperty.address}
                    {selectedProperty.ward?.wardName ? ` (${selectedProperty.ward.wardName})` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={clearProperty}
                    className="text-gray-500 hover:text-red-600 text-sm font-medium"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={propertySearchQuery}
                      onChange={(e) => {
                        setPropertySearchQuery(e.target.value);
                        setShowPropertyDropdown(true);
                      }}
                      onFocus={() => setShowPropertyDropdown(true)}
                      onBlur={() => setTimeout(() => setShowPropertyDropdown(false), 200)}
                      className="input pl-10"
                      placeholder="Search by Property ID or Property Number..."
                    />
                    {propertySearching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-600 border-t-transparent" />
                      </div>
                    )}
                  </div>
                  {showPropertyDropdown && (propertySearchResults.length > 0 || propertySearchQuery.trim()) && (
                    <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
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
                </>
              )}
              <input type="hidden" {...register('propertyId', { required: 'Property is required' })} />
              {errors.propertyId && (
                <p className="text-red-500 text-sm mt-1">{errors.propertyId.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Water Connection Selection */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Water Connection</h2>
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
                disabled={!selectedPropertyId || waterConnections.length === 0}
              >
                <option value="">
                  {!selectedPropertyId 
                    ? 'Select a property first' 
                    : waterConnections.length === 0 
                    ? 'No water connections found for this property'
                    : 'Select Water Connection'}
                </option>
                {waterConnections.map(connection => (
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
        </div>

        {/* Assessment Details */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Assessment Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">
                Assessment Year <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                {...register('assessmentYear', { 
                  required: 'Assessment year is required',
                  min: { value: 2000, message: 'Year must be 2000 or later' },
                  max: { value: 2100, message: 'Year must be 2100 or earlier' },
                  valueAsNumber: true
                })}
                className="input"
              />
              {errors.assessmentYear && (
                <p className="text-red-500 text-sm mt-1">{errors.assessmentYear.message}</p>
              )}
            </div>

            <div>
              <label className="label">
                Assessment Type <span className="text-red-500">*</span>
              </label>
              <select
                {...register('assessmentType', { required: 'Assessment type is required' })}
                className="input"
              >
                <option value="FIXED">Fixed Rate</option>
                <option value="METERED">Metered</option>
              </select>
              {errors.assessmentType && (
                <p className="text-red-500 text-sm mt-1">{errors.assessmentType.message}</p>
              )}
            </div>

            <div>
              <label className="label">
                Rate (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                {...register('rate', { 
                  required: 'Rate is required',
                  min: { value: 0.01, message: 'Rate must be greater than 0' },
                  valueAsNumber: true
                })}
                className="input"
                placeholder={selectedAssessmentType === 'METERED' ? 'Rate per unit' : 'Fixed monthly rate'}
              />
              {errors.rate && (
                <p className="text-red-500 text-sm mt-1">{errors.rate.message}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                {selectedAssessmentType === 'METERED' 
                  ? 'Rate per unit of water consumed' 
                  : 'Fixed monthly rate for non-metered connection'}
              </p>
            </div>
          </div>
        </div>

        {/* Remarks */}
        <div>
          <label className="label">Remarks</label>
          <textarea
            {...register('remarks')}
            className="input"
            rows="3"
            placeholder="Any additional notes or comments..."
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4 pt-4 border-t">
          <Link to="/water/assessments" className="btn btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Creating...' : 'Create Assessment'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddWaterTaxAssessment;
