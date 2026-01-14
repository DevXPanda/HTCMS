import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { assessmentAPI, propertyAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import Loading from '../../../components/Loading';
import { ArrowLeft, Save, Calculator } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

const EditAssessment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingAssessment, setLoadingAssessment] = useState(true);
  const [properties, setProperties] = useState([]);
  const [calculatedTax, setCalculatedTax] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset
  } = useForm();

  const watchedAssessedValue = watch('assessedValue');
  const watchedTaxRate = watch('taxRate');
  const watchedDepreciation = watch('depreciation');
  const watchedExemption = watch('exemptionAmount');

  useEffect(() => {
    fetchData();
  }, [id]);

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

  const fetchData = async () => {
    try {
      setLoadingAssessment(true);
      const [assessmentRes, propertiesRes] = await Promise.all([
        assessmentAPI.getById(id),
        propertyAPI.getAll({ limit: 1000, status: 'active' })
      ]);

      const assessment = assessmentRes.data.data.assessment;
      setProperties(propertiesRes.data.data.properties);

      // Set form values
      reset({
        propertyId: assessment.propertyId,
        assessmentYear: assessment.assessmentYear,
        assessedValue: assessment.assessedValue,
        landValue: assessment.landValue || '',
        buildingValue: assessment.buildingValue || '',
        depreciation: assessment.depreciation || 0,
        exemptionAmount: assessment.exemptionAmount || 0,
        taxRate: assessment.taxRate,
        effectiveDate: assessment.effectiveDate ? 
          new Date(assessment.effectiveDate).toISOString().split('T')[0] : '',
        expiryDate: assessment.expiryDate ? 
          new Date(assessment.expiryDate).toISOString().split('T')[0] : '',
        remarks: assessment.remarks || ''
      });
    } catch (error) {
      toast.error('Failed to load assessment data');
      navigate('/assessments');
    } finally {
      setLoadingAssessment(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);

      const assessmentData = {
        assessedValue: parseFloat(data.assessedValue),
        landValue: data.landValue ? parseFloat(data.landValue) : null,
        buildingValue: data.buildingValue ? parseFloat(data.buildingValue) : null,
        depreciation: parseFloat(data.depreciation || 0),
        exemptionAmount: parseFloat(data.exemptionAmount || 0),
        taxRate: parseFloat(data.taxRate),
        effectiveDate: data.effectiveDate || null,
        expiryDate: data.expiryDate || null,
        remarks: data.remarks || ''
      };

      const response = await assessmentAPI.update(id, assessmentData);

      if (response.data.success) {
        toast.success('Assessment updated successfully!');
        navigate(`/assessments/${id}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to update assessment');
    } finally {
      setLoading(false);
    }
  };

  if (loadingAssessment) {
    return <Loading message="Loading assessment data..." />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link to={`/assessments/${id}`} className="mr-4 text-primary-600 hover:text-primary-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Edit Assessment</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
        {/* Assessment Info (Read-only) */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Assessment Information</h2>
          <p className="text-sm text-gray-600">
            Note: Property and Assessment Year cannot be changed. Only valuation and tax details can be updated.
          </p>
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
            </div>
          </div>
        </div>

        {/* Dates */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Validity Period</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Effective Date</label>
              <input
                type="date"
                {...register('effectiveDate')}
                className="input"
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
          <Link to={`/assessments/${id}`} className="btn btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Updating...' : 'Update Assessment'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditAssessment;
