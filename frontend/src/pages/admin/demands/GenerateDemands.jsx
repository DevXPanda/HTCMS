import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { demandAPI, propertyAPI, assessmentAPI, waterTaxAssessmentAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Zap, AlertCircle, Trash2, Plus, Store } from 'lucide-react';
import Loading from '../../../components/Loading';
import { useShopTaxBasePath } from '../../../contexts/ShopTaxBasePathContext';

const GenerateDemands = () => {
  const navigate = useNavigate();
  const basePath = useShopTaxBasePath();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [mode, setMode] = useState('bulk'); // 'bulk' or 'property'
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [waterTaxAssessments, setWaterTaxAssessments] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [generateHouseTax, setGenerateHouseTax] = useState(false);
  const [generateWaterTax, setGenerateWaterTax] = useState(false);
  const [generateCombined, setGenerateCombined] = useState(false);
  const [generateUnified, setGenerateUnified] = useState(false);
  const [generateD2DC, setGenerateD2DC] = useState(false);
  const [generatingBulkShop, setGeneratingBulkShop] = useState(false);
  const [resultBulkShop, setResultBulkShop] = useState(null);

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
      const propertyId = selectedProperty?.id ?? selectedProperty;
      fetchAssessments(propertyId);
      fetchWaterTaxAssessments(propertyId);
    } else {
      setAssessments([]);
      setWaterTaxAssessments([]);
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

  const fetchWaterTaxAssessments = async (propertyId) => {
    try {
      const response = await waterTaxAssessmentAPI.getAll({ propertyId, status: 'approved' });
      setWaterTaxAssessments(response.data.data.assessments || []);
    } catch (error) {
      console.error('Failed to fetch water tax assessments:', error);
      setWaterTaxAssessments([]);
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
          navigate(`${basePath}/demands`);
        }, 3000);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to generate demands');
    } finally {
      setGenerating(false);
    }
  };

  const onSubmitBulkShop = async (e) => {
    e.preventDefault();
    const fy = watch('financialYear')?.trim();
    const due = watch('dueDate');
    if (!fy || !/^\d{4}-\d{2}$/.test(fy)) {
      toast.error('Financial year is required (e.g. 2024-25)');
      return;
    }
    if (!window.confirm(`Generate shop tax demands for financial year ${fy} for all approved shop assessments?`)) return;
    try {
      setGeneratingBulkShop(true);
      setResultBulkShop(null);
      const response = await demandAPI.generateBulkShop({ financialYear: fy, dueDate: due || undefined });
      if (response.data.success) {
        setResultBulkShop(response.data.data);
        const d = response.data.data;
        const msg = `Shop demands: ${d.createdCount ?? d.created ?? 0} created, ${d.skippedCount ?? d.skipped ?? 0} already existed${(d.errorDetails?.length) ? `, ${d.errorDetails.length} errors` : ''}`;
        (d.errorDetails?.length) ? toast.error(msg) : toast.success(msg);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate shop demands');
    } finally {
      setGeneratingBulkShop(false);
    }
  };

  const onSubmitProperty = async (data) => {
    if (!generateHouseTax && !generateWaterTax && !generateCombined && !generateUnified && !generateD2DC) {
      toast.error('Please select at least one service to generate');
      return;
    }

    if (!selectedProperty) {
      toast.error('Please select a property');
      return;
    }

    // If unified is selected, use the unified API (generates assessments + demand)
    if (generateUnified) {
      const currentYear = new Date().getFullYear();
      const assessmentYear = currentYear;
      const financialYear = `${currentYear}-${String(currentYear + 1).slice(-2)}`;
      
      const confirmMessage = `Generate Unified Tax Assessment and Demand?\n\n` +
        `This will:\n` +
        `1. Create Property Tax Assessment (if not exists)\n` +
        `2. Create Water Tax Assessments for all active connections (if not exist)\n` +
        `3. Generate ONE unified demand containing both taxes\n\n` +
        `Property: ${selectedProperty.propertyNumber}\n` +
        `Assessment Year: ${assessmentYear}\n` +
        `Financial Year: ${financialYear}\n` +
        `Due Date: ${new Date(data.dueDate || new Date()).toLocaleDateString()}`;
      
      if (!window.confirm(confirmMessage)) {
        return;
      }

      try {
        setGenerating(true);
        setResult(null);

        const response = await demandAPI.generateUnified({
          propertyId: selectedProperty.id,
          assessmentYear,
          financialYear,
          dueDate: data.dueDate || new Date().toISOString().split('T')[0],
          remarks: data.remarks || null,
          defaultTaxRate: 1.5
        });

        if (response.data.success) {
          setResult(response.data.data);
          toast.success('Unified assessment and demand generated successfully!');
          if (response.data.data.unifiedDemand) {
            toast.success(`Total Amount: ₹${parseFloat(response.data.data.unifiedDemand.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
          }
          
          setTimeout(() => {
            navigate(`${basePath}/demands`);
          }, 3000);
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to generate unified assessment and demand');
      } finally {
        setGenerating(false);
      }
      return;
    }

    if ((generateHouseTax || generateCombined) && assessments.length === 0) {
      toast.error('No approved property tax assessments found for this property');
      return;
    }

    if ((generateWaterTax || generateCombined) && waterTaxAssessments.length === 0) {
      toast.error('No approved water tax assessments found for this property');
      return;
    }

    // If combined is selected, use the combined API
    if (generateCombined) {
      const confirmMessage = `Generate combined demands (Property Tax + Water Tax) for property ${selectedProperty.propertyNumber}?\n\n` +
        `Financial Year: ${data.financialYear}\n` +
        `Due Date: ${new Date(data.dueDate).toLocaleDateString()}`;
      
      if (!window.confirm(confirmMessage)) {
        return;
      }

      try {
        setGenerating(true);
        setResult(null);

        const response = await demandAPI.generateCombined({
          propertyId: selectedProperty.id,
          financialYear: data.financialYear,
          dueDate: data.dueDate,
          remarks: data.remarks || null
        });

        if (response.data.success) {
          setResult(response.data.data);
          toast.success(`Successfully generated ${response.data.data.created} demand(s)!`);
          if (response.data.data.combinedTotal > 0) {
            toast.success(`Combined Total: ₹${response.data.data.combinedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
          }
          
          setTimeout(() => {
            navigate(`${basePath}/demands`);
          }, 3000);
        }
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to generate combined demands');
      } finally {
        setGenerating(false);
      }
      return;
    }

    // Individual generation
    const confirmMessage = `Generate demands for property ${selectedProperty.propertyNumber}?\n\n` +
      `${generateHouseTax ? '✓ House Tax Demand\n' : ''}` +
      `${generateWaterTax ? '✓ Water Tax Demand\n' : ''}` +
      `${generateD2DC ? '✓ D2DC (Garbage Collection)\n' : ''}`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setGenerating(true);
      setResult(null);
      const results = { houseTax: null, waterTax: null, d2dc: null, errors: [] };

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

      // Generate Water Tax demand
      if (generateWaterTax) {
        try {
          const waterTaxAssessment = waterTaxAssessments[0]; // Use first approved assessment
          const response = await demandAPI.create({
            waterTaxAssessmentId: waterTaxAssessment.id,
            serviceType: 'WATER_TAX',
            financialYear: data.financialYear,
            dueDate: data.dueDate
          });
          results.waterTax = response.data.data.demand;
          toast.success('Water Tax demand generated successfully');
        } catch (error) {
          results.errors.push({
            type: 'WATER_TAX',
            message: error.response?.data?.message || 'Failed to generate Water Tax demand'
          });
          toast.error('Failed to generate Water Tax demand');
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
      
      if (results.houseTax || results.waterTax || results.d2dc) {
        setTimeout(() => {
          navigate(`${basePath}/demands`);
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
          <Link to={`${basePath}/demands`} className="mr-4 text-primary-600 hover:text-primary-700">
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
              <Link to={`${basePath}/demands`} className="btn btn-secondary">
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

          {/* Bulk Shop Tax Demands */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
              <Store className="w-5 h-5 mr-2 text-amber-600" />
              Bulk Shop Tax Demands
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Generate shop tax demands for all approved shop assessments. Existing demands for the same financial year are skipped.
            </p>
            <form onSubmit={onSubmitBulkShop} className="space-y-4 max-w-md">
              <div>
                <label className="label">Financial Year *</label>
                <input
                  type="text"
                  {...register('financialYear')}
                  className="input"
                  placeholder="2024-25"
                />
              </div>
              <div>
                <label className="label">Due Date (optional)</label>
                <input type="date" {...register('dueDate')} className="input" />
              </div>
              {resultBulkShop && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  <strong>Result:</strong> {resultBulkShop.createdCount ?? resultBulkShop.created ?? 0} created, {resultBulkShop.skippedCount ?? resultBulkShop.skipped ?? 0} already existed
                  {(resultBulkShop.errorDetails?.length) > 0 && (
                    <>
                      , {resultBulkShop.errorDetails.length} errors
                      <ul className="mt-2 list-disc list-inside text-amber-900">
                        {resultBulkShop.errorDetails.map((e, i) => (
                          <li key={i}>Assessment {e.assessmentId}: {e.errorMessage}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
              <button
                type="submit"
                disabled={generatingBulkShop}
                className="btn btn-secondary flex items-center"
              >
                <Store className="w-4 h-4 mr-2" />
                {generatingBulkShop ? 'Generating...' : 'Generate Shop Demands'}
              </button>
            </form>
          </div>
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

                    {/* Water Tax Checkbox */}
                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        id="generateWaterTax"
                        checked={generateWaterTax}
                        onChange={(e) => {
                          setGenerateWaterTax(e.target.checked);
                          if (e.target.checked) {
                            setGenerateCombined(false);
                          }
                        }}
                        className="mt-1 mr-3 w-5 h-5"
                        disabled={waterTaxAssessments.length === 0}
                      />
                      <div className="flex-1">
                        <label htmlFor="generateWaterTax" className="font-medium cursor-pointer">
                          Generate Water Tax
                        </label>
                        {waterTaxAssessments.length === 0 ? (
                          <p className="text-sm text-red-600 mt-1">
                            No approved water tax assessments found for this property
                          </p>
                        ) : (
                          <p className="text-sm text-gray-600 mt-1">
                            {waterTaxAssessments.length} approved water tax assessment(s) available
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Unified (Generate Assessments + Demand) Checkbox */}
                    <div className="flex items-start bg-green-50 p-3 rounded-lg border border-green-200">
                      <input
                        type="checkbox"
                        id="generateUnified"
                        checked={generateUnified}
                        onChange={(e) => {
                          setGenerateUnified(e.target.checked);
                          if (e.target.checked) {
                            setGenerateHouseTax(false);
                            setGenerateWaterTax(false);
                            setGenerateCombined(false);
                          }
                        }}
                        className="mt-1 mr-3 w-5 h-5"
                      />
                      <div className="flex-1">
                        <label htmlFor="generateUnified" className="font-medium cursor-pointer text-green-800">
                          Generate Unified Assessment & Demand ⚡
                        </label>
                        <p className="text-sm text-green-700 mt-1">
                          Automatically generates Property Tax Assessment, Water Tax Assessments (for all active connections), and ONE unified demand containing both taxes. Assessments are created if they don't exist.
                        </p>
                      </div>
                    </div>

                    {/* Combined (Property Tax + Water Tax) Checkbox */}
                    {(assessments.length > 0 && waterTaxAssessments.length > 0) && (
                      <div className="flex items-start">
                        <input
                          type="checkbox"
                          id="generateCombined"
                          checked={generateCombined}
                          onChange={(e) => {
                            setGenerateCombined(e.target.checked);
                            if (e.target.checked) {
                              setGenerateHouseTax(false);
                              setGenerateWaterTax(false);
                              setGenerateUnified(false);
                            }
                          }}
                          className="mt-1 mr-3 w-5 h-5"
                        />
                        <div className="flex-1">
                          <label htmlFor="generateCombined" className="font-medium cursor-pointer">
                            Generate Combined (Property Tax + Water Tax)
                          </label>
                          <p className="text-sm text-gray-600 mt-1">
                            Generate both demands together with combined total (requires existing approved assessments)
                          </p>
                        </div>
                      </div>
                    )}

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

                {/* Combined Section */}
                {generateUnified && (
                  <div className="space-y-4 border-t pt-6">
                    <h3 className="text-lg font-semibold">Unified Generation Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="label">
                          Financial Year <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          {...register('financialYear', {
                            required: generateUnified ? 'Financial year is required' : false,
                            pattern: {
                              value: /^\d{4}-\d{2}$/,
                              message: 'Format: YYYY-YY (e.g., 2024-25)'
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
                            required: generateUnified ? 'Due date is required' : false
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

                {generateCombined && (
                  <div className="border border-gray-200 rounded-lg p-6 bg-blue-50">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
                      Combined Demand (Property Tax + Water Tax)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="label">
                          Financial Year <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          {...register('financialYear', {
                            required: generateCombined ? 'Financial year is required' : false,
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
                            required: generateCombined ? 'Due date is required' : false
                          })}
                          className="input"
                        />
                        {errors.dueDate && (
                          <p className="text-red-500 text-sm mt-1">{errors.dueDate.message}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 p-4 bg-white rounded border border-blue-200">
                      <p className="text-sm font-medium text-gray-700 mb-2">Will generate:</p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>✓ Property Tax Demand (from approved assessment)</li>
                        <li>✓ Water Tax Demand (from approved water tax assessment)</li>
                        <li>✓ Combined total amount will be calculated</li>
                      </ul>
                    </div>
                  </div>
                )}

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

                {/* Water Tax Section */}
                {generateWaterTax && (
                  <div className="border border-gray-200 rounded-lg p-6 bg-cyan-50">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <span className="w-2 h-2 bg-cyan-600 rounded-full mr-2"></span>
                      Water Tax Demand
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="label">
                          Financial Year <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          {...register('financialYear', {
                            required: generateWaterTax ? 'Financial year is required' : false,
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
                            required: generateWaterTax ? 'Due date is required' : false
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
                  <Link to={`${basePath}/demands`} className="btn btn-secondary">
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={generating || loading || (!generateHouseTax && !generateWaterTax && !generateCombined && !generateUnified && !generateD2DC)}
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
