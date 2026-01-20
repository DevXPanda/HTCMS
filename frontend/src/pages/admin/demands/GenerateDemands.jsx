import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { demandAPI, propertyAPI, assessmentAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Zap, AlertCircle, Trash2, Plus } from 'lucide-react';
import Loading from '../../../components/Loading';

const GenerateDemands = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [mode, setMode] = useState('bulk'); // 'bulk' or 'property'
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [generateHouseTax, setGenerateHouseTax] = useState(false);
  const [generateD2DC, setGenerateD2DC] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm({
    defaultValues: {
      financialYear: `${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(-2)}`,
      dueDate: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0],
      // D2DC specific
      month: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      d2dcBaseAmount: 50,
      d2dcDueDate: new Date(new Date().getFullYear(), new Date().getMonth(), 15).toISOString().split('T')[0]
    }
  });

  useEffect(() => {
    if (mode === 'property') {
      fetchProperties();
    }
  }, [mode]);

  useEffect(() => {
    if (selectedProperty) {
      fetchAssessments(selectedProperty);
    }
  }, [selectedProperty]);

  const fetchProperties = async () => {
    try {
      setLoadingProperties(true);
      const response = await propertyAPI.getAll({ limit: 1000, isActive: true });
      setProperties(response.data.data.properties || []);
    } catch (error) {
      toast.error('Failed to fetch properties');
    } finally {
      setLoadingProperties(false);
    }
  };

  const fetchAssessments = async (propertyId) => {
    try {
      const response = await assessmentAPI.getByProperty(propertyId);
      const approvedAssessments = (response.data.data.assessments || []).filter(
        a => a.status === 'approved'
      );
      setAssessments(approvedAssessments);
    } catch (error) {
      console.error('Failed to fetch assessments:', error);
      setAssessments([]);
    }
  };

  const onSubmitBulk = async (data) => {
    if (!window.confirm(
      `Are you sure you want to generate tax demands for financial year ${data.financialYear}?\n\n` +
      `This will create tax demands for all approved tax assessments.`
    )) {
      return;
    }

    try {
      setGenerating(true);
      setResult(null);

      const response = await demandAPI.generateBulk({
        financialYear: data.financialYear,
        dueDate: data.dueDate
      });

      if (response.data.success) {
        setResult(response.data.data);
        toast.success(`Successfully generated ${response.data.data.created} tax demands!`);
        
        setTimeout(() => {
          navigate('/demands');
        }, 3000);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to generate demands');
    } finally {
      setGenerating(false);
    }
  };

  const onSubmitProperty = async (data) => {
    if (!generateHouseTax && !generateD2DC) {
      toast.error('Please select at least one service to generate');
      return;
    }

    if (!selectedProperty) {
      toast.error('Please select a property');
      return;
    }

    if (generateHouseTax && assessments.length === 0) {
      toast.error('No approved assessments found for this property');
      return;
    }

    const confirmMessage = `Generate demands for property ${selectedProperty.propertyNumber}?\n\n` +
      `${generateHouseTax ? '✓ House Tax Demand\n' : ''}` +
      `${generateD2DC ? '✓ D2DC (Garbage Collection)\n' : ''}`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setGenerating(true);
      setResult(null);
      const results = { houseTax: null, d2dc: null, errors: [] };

      // Generate House Tax demand
      if (generateHouseTax) {
        try {
          const assessment = assessments[0]; // Use first approved assessment
          const response = await demandAPI.create({
            assessmentId: assessment.id,
            serviceType: 'HOUSE_TAX',
            financialYear: data.financialYear,
            dueDate: data.dueDate
          });
          results.houseTax = response.data.data.demand;
          toast.success('House Tax demand generated successfully');
        } catch (error) {
          results.errors.push({
            type: 'HOUSE_TAX',
            message: error.response?.data?.message || 'Failed to generate House Tax demand'
          });
          toast.error('Failed to generate House Tax demand');
        }
      }

      // Generate D2DC demand
      if (generateD2DC) {
        try {
          const response = await demandAPI.createD2DC({
            propertyId: selectedProperty.id,
            month: data.month,
            baseAmount: parseFloat(data.d2dcBaseAmount),
            dueDate: data.d2dcDueDate
          });
          results.d2dc = response.data.data.demand;
          toast.success('D2DC demand generated successfully');
        } catch (error) {
          results.errors.push({
            type: 'D2DC',
            message: error.response?.data?.message || 'Failed to generate D2DC demand'
          });
          toast.error('Failed to generate D2DC demand');
        }
      }

      setResult(results);
      
      if (results.houseTax || results.d2dc) {
        setTimeout(() => {
          navigate('/demands');
        }, 3000);
      }
    } catch (error) {
      toast.error('Failed to generate demands');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link to="/demands" className="mr-4 text-primary-600 hover:text-primary-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Generate Demands</h1>
        </div>
      </div>

      {/* Mode Selection */}
      <div className="card mb-6">
        <div className="flex gap-4">
          <button
            onClick={() => setMode('bulk')}
            className={`px-4 py-2 rounded-lg font-medium ${
              mode === 'bulk'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Bulk Generation (All Properties)
          </button>
          <button
            onClick={() => setMode('property')}
            className={`px-4 py-2 rounded-lg font-medium ${
              mode === 'property'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Property-Specific Generation
          </button>
        </div>
      </div>

      {mode === 'bulk' ? (
        <div className="card max-w-2xl">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-800 mb-1">Bulk Generation - House Tax Only</h3>
                <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                  <li>This will generate House Tax demands for all approved assessments</li>
                  <li>Existing demands for the same financial year will be skipped</li>
                  <li>Arrears from previous unpaid demands will be automatically included</li>
                  <li>This action cannot be undone</li>
                </ul>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmitBulk)} className="space-y-6">
            <div>
              <label className="label">
                Financial Year <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('financialYear', {
                  required: 'Financial year is required',
                  pattern: {
                    value: /^\d{4}-\d{2}$/,
                    message: 'Format must be YYYY-YY (e.g., 2024-25)'
                  }
                })}
                className="input"
                placeholder="2024-25"
              />
              {errors.financialYear && (
                <p className="text-red-500 text-sm mt-1">{errors.financialYear.message}</p>
              )}
            </div>

            <div>
              <label className="label">
                Due Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register('dueDate', {
                  required: 'Due date is required'
                })}
                className="input"
              />
              {errors.dueDate && (
                <p className="text-red-500 text-sm mt-1">{errors.dueDate.message}</p>
              )}
            </div>

            {result && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-2">Generation Results</h3>
                <div className="space-y-1 text-sm text-green-700">
                  <p><strong>Successfully Created:</strong> {result.created} demands</p>
                  {result.errors > 0 && (
                    <p className="text-yellow-700">
                      <strong>Skipped:</strong> {result.errors} demands
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-4 pt-4 border-t">
              <Link to="/demands" className="btn btn-secondary">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={generating || loading}
                className="btn btn-primary flex items-center"
              >
                <Zap className="w-4 h-4 mr-2" />
                {generating ? 'Generating...' : 'Generate All Demands'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="card max-w-4xl">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-800 mb-1">Property-Specific Generation</h3>
                <p className="text-sm text-blue-700">
                  Select a property and choose which services to generate: House Tax and/or D2DC (Garbage Collection)
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmitProperty)} className="space-y-6">
            {/* Property Selection */}
            <div>
              <label className="label">
                Property <span className="text-red-500">*</span>
              </label>
              {loadingProperties ? (
                <Loading />
              ) : (
                <select
                  value={selectedProperty?.id || ''}
                  onChange={(e) => {
                    const prop = properties.find(p => p.id === parseInt(e.target.value));
                    setSelectedProperty(prop);
                    setGenerateHouseTax(false);
                    setGenerateD2DC(false);
                  }}
                  className="input"
                >
                  <option value="">Select Property</option>
                  {properties.map(property => (
                    <option key={property.id} value={property.id}>
                      {property.propertyNumber} - {property.address} ({property.ward?.wardName || 'N/A'})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedProperty && (
              <>
                {/* Service Selection Checkboxes */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Select Services to Generate</h3>
                  <div className="space-y-4">
                    {/* House Tax Checkbox */}
                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        id="generateHouseTax"
                        checked={generateHouseTax}
                        onChange={(e) => {
                          setGenerateHouseTax(e.target.checked);
                          if (!e.target.checked) {
                            setValue('financialYear', '');
                            setValue('dueDate', '');
                          }
                        }}
                        className="mt-1 mr-3 w-5 h-5"
                        disabled={assessments.length === 0}
                      />
                      <div className="flex-1">
                        <label htmlFor="generateHouseTax" className="font-medium cursor-pointer">
                          Generate House Tax
                        </label>
                        {assessments.length === 0 ? (
                          <p className="text-sm text-red-600 mt-1">
                            No approved assessments found for this property
                          </p>
                        ) : (
                          <p className="text-sm text-gray-600 mt-1">
                            {assessments.length} approved assessment(s) available
                          </p>
                        )}
                      </div>
                    </div>

                    {/* D2DC Checkbox */}
                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        id="generateD2DC"
                        checked={generateD2DC}
                        onChange={(e) => setGenerateD2DC(e.target.checked)}
                        className="mt-1 mr-3 w-5 h-5"
                      />
                      <div className="flex-1">
                        <label htmlFor="generateD2DC" className="font-medium cursor-pointer">
                          Generate D2DC (Garbage Collection)
                        </label>
                        <p className="text-sm text-gray-600 mt-1">
                          Monthly garbage collection charge
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* House Tax Section */}
                {generateHouseTax && (
                  <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                      House Tax Demand
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="label">
                          Financial Year <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          {...register('financialYear', {
                            required: generateHouseTax ? 'Financial year is required' : false,
                            pattern: {
                              value: /^\d{4}-\d{2}$/,
                              message: 'Format must be YYYY-YY (e.g., 2024-25)'
                            }
                          })}
                          className="input"
                          placeholder="2024-25"
                        />
                        {errors.financialYear && (
                          <p className="text-red-500 text-sm mt-1">{errors.financialYear.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="label">
                          Due Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          {...register('dueDate', {
                            required: generateHouseTax ? 'Due date is required' : false
                          })}
                          className="input"
                        />
                        {errors.dueDate && (
                          <p className="text-red-500 text-sm mt-1">{errors.dueDate.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* D2DC Section */}
                {generateD2DC && (
                  <div className="border border-gray-200 rounded-lg p-6 bg-green-50">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                      D2DC (Garbage Collection)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="label">
                          Month <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="month"
                          {...register('month', {
                            required: generateD2DC ? 'Month is required' : false
                          })}
                          className="input"
                        />
                        {errors.month && (
                          <p className="text-red-500 text-sm mt-1">{errors.month.message}</p>
                        )}
                        <p className="text-sm text-gray-500 mt-1">Format: YYYY-MM</p>
                      </div>
                      <div>
                        <label className="label">
                          Monthly Charge (₹) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          {...register('d2dcBaseAmount', {
                            required: generateD2DC ? 'Base amount is required' : false,
                            min: { value: 0, message: 'Amount must be positive' }
                          })}
                          className="input"
                          placeholder="50"
                        />
                        {errors.d2dcBaseAmount && (
                          <p className="text-red-500 text-sm mt-1">{errors.d2dcBaseAmount.message}</p>
                        )}
                        <p className="text-sm text-gray-500 mt-1">Default: ₹50/month</p>
                      </div>
                      <div>
                        <label className="label">
                          Due Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          {...register('d2dcDueDate', {
                            required: generateD2DC ? 'Due date is required' : false
                          })}
                          className="input"
                        />
                        {errors.d2dcDueDate && (
                          <p className="text-red-500 text-sm mt-1">{errors.d2dcDueDate.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Results */}
                {result && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold text-green-800 mb-2">Generation Results</h3>
                    <div className="space-y-2 text-sm">
                      {result.houseTax && (
                        <p className="text-green-700">
                          <strong>House Tax:</strong> Generated successfully - {result.houseTax.demandNumber}
                        </p>
                      )}
                      {result.d2dc && (
                        <p className="text-green-700">
                          <strong>D2DC:</strong> Generated successfully - {result.d2dc.demandNumber}
                        </p>
                      )}
                      {result.errors && result.errors.length > 0 && (
                        <div className="text-red-700">
                          <strong>Errors:</strong>
                          <ul className="list-disc list-inside ml-4">
                            {result.errors.map((err, idx) => (
                              <li key={idx}>{err.type}: {err.message}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-4 pt-4 border-t">
                  <Link to="/demands" className="btn btn-secondary">
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={generating || loading || (!generateHouseTax && !generateD2DC)}
                    className="btn btn-primary flex items-center"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    {generating ? 'Generating...' : 'Generate Demands'}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}
    </div>
  );
};

export default GenerateDemands;
