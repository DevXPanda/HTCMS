import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { assessmentAPI, propertyAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import { Save, Calculator } from 'lucide-react';

const AddAssessment = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [calculatedTax, setCalculatedTax] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm({
    defaultValues: {
      assessmentYear: new Date().getFullYear(),
      taxRate: 0.5,
      depreciation: 0,
      exemptionAmount: 0
    }
  });

  const watchedAssessedValue = watch('assessedValue');
  const watchedTaxRate = watch('taxRate');
  const watchedDepreciation = watch('depreciation');
  const watchedExemption = watch('exemptionAmount');

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    // Calculate tax amount when values change
    if (watchedAssessedValue && watchedTaxRate) {
      const netValue = parseFloat(watchedAssessedValue || 0) - 
                      parseFloat(watchedDepreciation || 0) - 
                      parseFloat(watchedExemption || 0);
      const tax = (netValue * parseFloat(watchedTaxRate || 0)) / 100;
      setCalculatedTax(tax > 0 ? tax : 0);
    } else {
      setCalculatedTax(0);
    }
  }, [watchedAssessedValue, watchedTaxRate, watchedDepreciation, watchedExemption]);

  const fetchProperties = async () => {
    try {
      setLoadingProperties(true);
      const response = await propertyAPI.getAll({ limit: 1000, status: 'active' });
      setProperties(response.data.data.properties);
    } catch (error) {
      toast.error('Failed to load properties');
    } finally {
      setLoadingProperties(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);

      // Convert string numbers to actual numbers
      const assessmentData = {
        ...data,
        propertyId: parseInt(data.propertyId),
        assessmentYear: parseInt(data.assessmentYear),
        assessedValue: parseFloat(data.assessedValue),
        landValue: data.landValue ? parseFloat(data.landValue) : null,
        buildingValue: data.buildingValue ? parseFloat(data.buildingValue) : null,
        depreciation: parseFloat(data.depreciation || 0),
        exemptionAmount: parseFloat(data.exemptionAmount || 0),
        taxRate: parseFloat(data.taxRate),
        effectiveDate: data.effectiveDate || new Date().toISOString().split('T')[0],
        expiryDate: data.expiryDate || null
      };

      const response = await assessmentAPI.create(assessmentData);

      if (response.data.success) {
        toast.success('Assessment created successfully!');
        navigate('/assessments');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to create assessment');
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
        <h1 className="ds-page-title">Create New Tax Assessment</h1>
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
                    {property.propertyNumber} - {property.address} ({property.ward?.wardName || 'N/A'})
                  </option>
                ))}
              </select>
              {errors.propertyId && (
                <p className="text-red-500 text-sm mt-1">{errors.propertyId.message}</p>
              )}
            </div>
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
                Effective Date
              </label>
              <input
                type="date"
                {...register('effectiveDate')}
                className="input"
                defaultValue={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <label className="label">Expiry Date</label>
              <input
                type="date"
                {...register('expiryDate')}
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Valuation */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Valuation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">
                Land Value (₹)
              </label>
              <input
                type="number"
                step="0.01"
                {...register('landValue', { valueAsNumber: true })}
                className="input"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="label">
                Building Value (₹)
              </label>
              <input
                type="number"
                step="0.01"
                {...register('buildingValue', { valueAsNumber: true })}
                className="input"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="label">
                Total Assessed Value (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                {...register('assessedValue', { 
                  required: 'Assessed value is required',
                  min: { value: 0.01, message: 'Value must be greater than 0' },
                  valueAsNumber: true
                })}
                className="input"
                placeholder="0.00"
              />
              {errors.assessedValue && (
                <p className="text-red-500 text-sm mt-1">{errors.assessedValue.message}</p>
              )}
            </div>

            <div>
              <label className="label">
                Depreciation (₹)
              </label>
              <input
                type="number"
                step="0.01"
                {...register('depreciation', { 
                  min: { value: 0, message: 'Depreciation cannot be negative' },
                  valueAsNumber: true
                })}
                className="input"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="label">
                Exemption Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                {...register('exemptionAmount', { 
                  min: { value: 0, message: 'Exemption cannot be negative' },
                  valueAsNumber: true
                })}
                className="input"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Tax Calculation */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Calculator className="w-5 h-5 mr-2" />
            Tax Calculation
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">
                Tax Rate (%) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                {...register('taxRate', { 
                  required: 'Tax rate is required',
                  min: { value: 0, message: 'Tax rate cannot be negative' },
                  max: { value: 100, message: 'Tax rate cannot exceed 100%' },
                  valueAsNumber: true
                })}
                className="input"
                placeholder="0.50"
              />
              {errors.taxRate && (
                <p className="text-red-500 text-sm mt-1">{errors.taxRate.message}</p>
              )}
            </div>

            <div>
              <label className="label">Net Assessed Value (₹)</label>
              <div className="input bg-gray-100 font-semibold">
                {watchedAssessedValue && watchedDepreciation !== undefined && watchedExemption !== undefined
                  ? (parseFloat(watchedAssessedValue || 0) - 
                     parseFloat(watchedDepreciation || 0) - 
                     parseFloat(watchedExemption || 0)).toLocaleString('en-IN', { 
                     minimumFractionDigits: 2, 
                     maximumFractionDigits: 2 
                   })
                  : '0.00'}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="label">Annual Tax Amount (₹)</label>
              <div className="input bg-green-100 font-bold text-lg text-green-700">
                ₹{calculatedTax.toLocaleString('en-IN', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Calculated as: (Net Assessed Value × Tax Rate) / 100
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
          <Link to="/assessments" className="btn btn-secondary">
            Cancel
          </Link>
          <button
            type="button"
            onClick={async () => {
              const formData = watch();
              if (!formData.propertyId || !formData.assessmentYear) {
                toast.error('Please fill in Property and Assessment Year first');
                return;
              }
              const currentYear = new Date().getFullYear();
              const financialYear = `${currentYear}-${String(currentYear + 1).slice(-2)}`;
              
              if (!window.confirm(
                `Generate Unified Tax Assessment and Demand?\n\n` +
                `This will:\n` +
                `1. Create Property Tax Assessment (if not exists)\n` +
                `2. Create Water Tax Assessments for all active connections (if not exist)\n` +
                `3. Generate ONE unified demand containing both taxes\n\n` +
                `Property: ${properties.find(p => p.id === parseInt(formData.propertyId))?.propertyNumber || 'N/A'}\n` +
                `Assessment Year: ${formData.assessmentYear}\n` +
                `Financial Year: ${financialYear}`
              )) {
                return;
              }

              try {
                setLoading(true);
                const response = await assessmentAPI.generateUnified({
                  propertyId: parseInt(formData.propertyId),
                  assessmentYear: parseInt(formData.assessmentYear),
                  financialYear,
                  defaultTaxRate: parseFloat(formData.taxRate) || 1.5
                });

                if (response.data.success) {
                  toast.success('Unified assessment and demand generated successfully!');
                  navigate('/assessments');
                }
              } catch (error) {
                toast.error(error.response?.data?.message || 'Failed to generate unified assessment');
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="btn btn-success flex items-center"
          >
            <Calculator className="w-4 h-4 mr-2" />
            {loading ? 'Generating...' : 'Generate Unified Assessment & Demand'}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Creating...' : 'Create Assessment Only'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddAssessment;
