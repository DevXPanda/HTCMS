import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { assessmentAPI, propertyAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import { Save, Calculator, Search } from 'lucide-react';
import { useConfirm } from '../../../components/ConfirmModal';

const SEARCH_DEBOUNCE_MS = 300;

const AddAssessment = () => {
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const [loading, setLoading] = useState(false);
  const [propertySearchQuery, setPropertySearchQuery] = useState('');
  const [propertySearchResults, setPropertySearchResults] = useState([]);
  const [propertySearching, setPropertySearching] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
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

  const onSelectProperty = (property) => {
    setSelectedProperty(property);
    setValue('propertyId', property.id);
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="ds-page-title">Create New Tax Assessment</h1>
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
              const propNum = selectedProperty?.propertyNumber || 'N/A';
              const ok = await confirm({
                title: 'Generate unified assessment',
                message: `Generate Unified Tax Assessment and Demand? This will create Property Tax Assessment (if not exists), Water Tax Assessments for all active connections (if not exist), and one unified demand. Property: ${propNum}, Assessment Year: ${formData.assessmentYear}, Financial Year: ${financialYear}.`,
                confirmLabel: 'Generate'
              });
              if (!ok) return;

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
