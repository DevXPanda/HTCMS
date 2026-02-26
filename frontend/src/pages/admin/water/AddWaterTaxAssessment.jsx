import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { waterTaxAssessmentAPI, propertyAPI, waterConnectionAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Save } from 'lucide-react';

const AddWaterTaxAssessment = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState([]);
  const [waterConnections, setWaterConnections] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [loadingConnections, setLoadingConnections] = useState(false);

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

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    if (selectedPropertyId) {
      fetchWaterConnections(selectedPropertyId);
    } else {
      setWaterConnections([]);
      setValue('waterConnectionId', '');
    }
  }, [selectedPropertyId, setValue]);

  const fetchProperties = async () => {
    try {
      setLoadingProperties(true);
      const response = await propertyAPI.getAll({ limit: 1000, isActive: true });
      setProperties(response.data.data.properties || []);
    } catch (error) {
      toast.error('Failed to load properties');
    } finally {
      setLoadingProperties(false);
    }
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

  if (loadingProperties) {
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
          <Link to="/water/assessments" className="mr-4 text-primary-600 hover:text-primary-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="ds-page-title">Create New Water Tax Assessment</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
        {/* Property Selection */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Property Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
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
