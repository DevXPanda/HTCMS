import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { demandAPI, propertyAPI, assessmentAPI, waterTaxAssessmentAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Zap, AlertCircle, CheckCircle2, Building2, Droplet, Truck, FileText } from 'lucide-react';
import Loading from '../../../components/Loading';

const UnifiedTaxDemand = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [result, setResult] = useState(null);
    const [properties, setProperties] = useState([]);
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [assessments, setAssessments] = useState([]);
    const [waterTaxAssessments, setWaterTaxAssessments] = useState([]);
    const [propertyDemands, setPropertyDemands] = useState([]);
    const [loadingDemands, setLoadingDemands] = useState(false);
    const [loadingProperties, setLoadingProperties] = useState(false);

    // Selection states
    const [generateHouseTax, setGenerateHouseTax] = useState(false);
    const [generateWaterTax, setGenerateWaterTax] = useState(false);
    const [generateD2DC, setGenerateD2DC] = useState(false);
    const [generateUnified, setGenerateUnified] = useState(false);
    const [includeShopDemands, setIncludeShopDemands] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue
    } = useForm({
        defaultValues: {
            financialYear: `${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(-2)}`,
            dueDate: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0],
            month: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
            d2dcBaseAmount: 50,
            d2dcDueDate: new Date(new Date().getFullYear(), new Date().getMonth(), 15).toISOString().split('T')[0]
        }
    });

    useEffect(() => {
        fetchProperties();
    }, []);

    useEffect(() => {
        if (selectedProperty && selectedProperty.id) {
            fetchAssessments(selectedProperty.id);
            fetchWaterTaxAssessments(selectedProperty.id);
            fetchPropertyDemands(selectedProperty.id);
        } else {
            setAssessments([]);
            setWaterTaxAssessments([]);
            setPropertyDemands([]);
        }
    }, [selectedProperty]);

    useEffect(() => {
        if (generateUnified) {
            setGenerateHouseTax(true);
            setGenerateWaterTax(true);
            setGenerateD2DC(true);
        }
    }, [generateUnified]);

    const fetchPropertyDemands = async (propertyId) => {
        try {
            setLoadingDemands(true);
            const response = await demandAPI.getByProperty(propertyId);
            setPropertyDemands(response.data.data.demands || []);
        } catch (error) {
            console.error('Failed to fetch demands:', error);
        } finally {
            setLoadingDemands(false);
        }
    };

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
        if (!propertyId) return;
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
        if (!propertyId) return;
        try {
            const response = await waterTaxAssessmentAPI.getAll({ propertyId, status: 'approved' });
            setWaterTaxAssessments(response.data.data.assessments || []);
        } catch (error) {
            console.error('Failed to fetch water tax assessments:', error);
            setWaterTaxAssessments([]);
        }
    };

    const onSubmit = async (data) => {
        if (!selectedProperty) {
            toast.error('Please select a property');
            return;
        }

        if (!generateHouseTax && !generateWaterTax && !generateD2DC) {
            toast.error('Please select at least one service to generate');
            return;
        }

        setGenerating(true);
        setResult(null);

        try {
            // 1. Unified Generation (Preferred for House + Water)
            // If "Unified" checkbox is explicitly checked OR both House & Water are checked, 
            // we can try to use the unified endpoint if available, BUT the requirement says:
            // "If Property/Water/D2DC are selected -> Call the existing Generate Unified Assessment & Demand API"

            let unifiedSuccess = false;
            let unifiedData = null;

            if (generateUnified) {
                // Use the specialized Unified API with optional Shop/D2DC
                const currentYear = new Date().getFullYear();
                const assessmentYear = currentYear;
                const financialYear = data.financialYear || `${currentYear}-${String(currentYear + 1).slice(-2)}`;

                try {
                    const unifiedPayload = {
                        propertyId: selectedProperty.id,
                        assessmentYear,
                        financialYear,
                        dueDate: data.dueDate || new Date().toISOString().split('T')[0],
                        remarks: data.remarks || 'Unified Generation',
                        defaultTaxRate: 1.5,
                        includeShopDemands: includeShopDemands,
                        includeD2DCDemand: generateD2DC,
                        ...(generateD2DC && data.month ? { d2dcMonth: data.month } : {}),
                        ...(generateD2DC && data.d2dcBaseAmount ? { d2dcBaseAmount: parseFloat(data.d2dcBaseAmount) || 50 } : {})
                    };

                    const response = await demandAPI.generateUnified(unifiedPayload);

                    if (response.data.success) {
                        unifiedSuccess = true;
                        unifiedData = response.data.data;
                        let successMsg = 'Unified Assessment & Demand generated!';
                        if (unifiedData.shopDemands?.length > 0) {
                            successMsg += ` (${unifiedData.shopDemands.length} shop demand(s))`;
                        }
                        if (unifiedData.d2dcDemand) {
                            successMsg += ' (D2DC demand)';
                        }
                        toast.success(successMsg);
                    }
                } catch (error) {
                    console.error("Unified generation failed", error);
                    toast.error(error.response?.data?.message || "Unified generation failed");
                }
            }

            // If Unified didn't run or failed, falling back to individual might be complex due to lack of assessments.
            // However, the "Generate Unified Assessment & Demand API" typically HANDLES assessment creation too.
            // So if generateUnified was called and failed, we likely stop.

            // But if we are NOT in "Unified" mode (e.g. user manually checked House Tax only),
            // we used the individual APIs in the original file.

            const results = {
                unified: unifiedData,
                houseTax: null,
                waterTax: null,
                d2dc: null,
                errors: []
            };

            // If NOT unified mode, generate individually based on checks
            if (!generateUnified) {
                if (generateHouseTax) {
                    // Logic from GenerateDemands.jsx for House Tax
                    if (assessments.length === 0) {
                        results.errors.push({ type: 'HOUSE_TAX', message: 'No approved assessment found' });
                    } else {
                        try {
                            const response = await demandAPI.create({
                                assessmentId: assessments[0].id,
                                serviceType: 'HOUSE_TAX',
                                financialYear: data.financialYear,
                                dueDate: data.dueDate
                            });
                            results.houseTax = response.data.data.demand;
                            toast.success('House Tax generated');
                        } catch (e) {
                            results.errors.push({ type: 'HOUSE_TAX', message: e.response?.data?.message || 'Failed' });
                        }
                    }
                }

                if (generateWaterTax) {
                    // Logic from GenerateDemands.jsx for Water Tax
                    if (waterTaxAssessments.length === 0) {
                        results.errors.push({ type: 'WATER_TAX', message: 'No approved water tax assessment found' });
                    } else {
                        try {
                            const response = await demandAPI.create({
                                waterTaxAssessmentId: waterTaxAssessments[0].id,
                                serviceType: 'WATER_TAX',
                                financialYear: data.financialYear,
                                dueDate: data.dueDate
                            });
                            results.waterTax = response.data.data.demand;
                            toast.success('Water Tax generated');
                        } catch (e) {
                            results.errors.push({ type: 'WATER_TAX', message: e.response?.data?.message || 'Failed' });
                        }
                    }
                }
            }

            // D2DC is handled by unified orchestrator if generateUnified is true
            // Only call D2DC separately if unified mode is NOT selected
            if (generateD2DC && !generateUnified) {
                try {
                    const response = await demandAPI.createD2DC({
                        propertyId: selectedProperty.id,
                        month: data.month,
                        baseAmount: parseFloat(data.d2dcBaseAmount),
                        dueDate: data.d2dcDueDate
                    });
                    results.d2dc = response.data.data.demand;
                    toast.success('D2DC demand generated');
                } catch (e) {
                    results.errors.push({ type: 'D2DC', message: e.response?.data?.message || 'Failed' });
                }
            }

            setResult(results);

            // Refresh demands list
            fetchPropertyDemands(selectedProperty.id);

        } catch (error) {
            console.error(error);
            toast.error('Something went wrong during generation');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center">
                    <Link to="/tax-management" className="mr-4 text-gray-500 hover:text-primary-600 transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Unified Tax Demand</h1>
                        <p className="text-gray-500 mt-1">Generate Property, Water, and D2DC demands in one go</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Property Selection & Forms */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Property Selection */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <span className="bg-blue-100 p-2 rounded-lg mr-3 text-blue-600">1</span>
                            Select Property
                        </h2>

                        {loadingProperties ? (
                            <Loading />
                        ) : (
                            <select
                                value={selectedProperty?.id || ''}
                                onChange={(e) => {
                                    const prop = properties.find(p => p.id === parseInt(e.target.value));
                                    setSelectedProperty(prop);
                                }}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                            >
                                <option value="">-- Search or Select Property --</option>
                                {properties.map(property => (
                                    <option key={property.id} value={property.id}>
                                        {property.propertyNumber} - {property.address} ({property.ward?.wardName || 'N/A'})
                                    </option>
                                ))}
                            </select>
                        )}

                        {selectedProperty && (
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg flex items-center justify-between text-sm">
                                <div>
                                    <span className="block text-gray-500">Assessments Available:</span>
                                    <div className="flex gap-4 mt-1">
                                        <span className={`font-medium ${assessments.length ? 'text-green-600' : 'text-red-500'}`}>
                                            {assessments.length} Property Tax
                                        </span>
                                        <span className={`font-medium ${waterTaxAssessments.length ? 'text-cyan-600' : 'text-red-500'}`}>
                                            {waterTaxAssessments.length} Water Tax
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {selectedProperty && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <span className="bg-purple-100 p-2 rounded-lg mr-3 text-purple-600">2</span>
                                Select Services
                            </h2>

                            {/* Unified Option */}
                            <div className="mb-6 p-4 bg-gradient-to-r from-primary-50 to-indigo-50 rounded-xl border border-primary-100 transition-all hover:shadow-md">
                                <label className="flex items-start cursor-pointer">
                                    <div className="flex items-center h-5">
                                        <input
                                            type="checkbox"
                                            checked={generateUnified}
                                            onChange={(e) => {
                                                setGenerateUnified(e.target.checked);
                                                if (!e.target.checked) {
                                                    // Optional: Delselect others when unchecked? Maybe keep them.
                                                    // Requirement says logic for buttons, but UX is better if explicit.
                                                }
                                            }}
                                            className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                        />
                                    </div>
                                    <div className="ml-3">
                                        <span className="block text-base font-bold text-primary-900">Generate Full Unified Tax Demand ⚡</span>
                                        <span className="block text-sm text-primary-700 mt-1">
                                            Use this to generate demand using existing approved assessments.
                                            Creates unified demand (Property + Water) with optional Shop and D2DC demands.
                                        </span>
                                    </div>
                                </label>
                            </div>

                            <div className="space-y-3 pl-2">
                                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Individual Services</h3>

                                <label className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={generateHouseTax}
                                        onChange={(e) => {
                                            setGenerateHouseTax(e.target.checked);
                                            if (!e.target.checked) setGenerateUnified(false);
                                        }}
                                        disabled={generateUnified} // Lock if unified is selected? Or allow manual toggle?
                                        // UX: If Unified is checked, these should visually imply they are included.
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <Building2 className="w-5 h-5 text-blue-500 mx-3" />
                                    <span className="font-medium text-gray-700">Property Tax</span>
                                </label>

                                <label className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={generateWaterTax}
                                        onChange={(e) => {
                                            setGenerateWaterTax(e.target.checked);
                                            if (!e.target.checked) setGenerateUnified(false);
                                        }}
                                        disabled={generateUnified}
                                        className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                                    />
                                    <Droplet className="w-5 h-5 text-cyan-500 mx-3" />
                                    <span className="font-medium text-gray-700">Water Tax</span>
                                </label>

                                <label className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={generateD2DC}
                                        onChange={(e) => {
                                            setGenerateD2DC(e.target.checked);
                                            if (!e.target.checked) setGenerateUnified(false);
                                        }}
                                        disabled={generateUnified}
                                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                                    />
                                    <Truck className="w-5 h-5 text-purple-500 mx-3" />
                                    <span className="font-medium text-gray-700">D2DC (Garbage Collection)</span>
                                </label>

                                {generateUnified && (
                                    <>
                                        <label className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors mt-3 bg-yellow-50">
                                            <input
                                                type="checkbox"
                                                checked={includeShopDemands}
                                                onChange={(e) => setIncludeShopDemands(e.target.checked)}
                                                className="w-4 h-4 text-yellow-600 rounded focus:ring-yellow-500"
                                            />
                                            <FileText className="w-5 h-5 text-yellow-600 mx-3" />
                                            <span className="font-medium text-gray-700">Include Shop Demands (optional)</span>
                                        </label>
                                        {generateD2DC && (
                                            <div className="mt-2 ml-7 text-xs text-gray-600">
                                                D2DC will be included in unified generation
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                </div>

                {/* Right Column: Configuration & Action */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-6">Configuration</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Financial Year</label>
                                <input
                                    type="text"
                                    {...register('financialYear', { required: true })}
                                    className="w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                                <input
                                    type="date"
                                    {...register('dueDate', { required: true })}
                                    className="w-full rounded-lg border-gray-300 focus:ring-primary-500 focus:border-primary-500"
                                />
                            </div>

                            {(generateD2DC || (generateUnified && generateD2DC)) && (
                                <div className="pt-4 border-t border-gray-200 mt-4">
                                    <p className="text-sm font-medium text-purple-700 mb-3">D2DC Specifics</p>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Month (YYYY-MM)</label>
                                            <input 
                                                type="text" 
                                                {...register('month', { 
                                                    required: generateD2DC || (generateUnified && generateD2DC),
                                                    pattern: {
                                                        value: /^\d{4}-\d{2}$/,
                                                        message: 'Format: YYYY-MM (e.g., 2024-01)'
                                                    }
                                                })} 
                                                placeholder="2024-01"
                                                className="w-full text-sm rounded-lg border-gray-300" 
                                            />
                                            {errors.month && (
                                                <span className="text-xs text-red-500">{errors.month.message}</span>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">Base Amount (₹)</label>
                                            <input type="number" {...register('d2dcBaseAmount')} className="w-full text-sm rounded-lg border-gray-300" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-8">
                            <button
                                onClick={handleSubmit(onSubmit)}
                                disabled={generating || !selectedProperty || (!generateHouseTax && !generateWaterTax && !generateD2DC)}
                                className={`w-full py-3 px-4 rounded-lg flex items-center justify-center font-bold text-white shadow-lg transition-all ${generating || !selectedProperty
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 hover:shadow-xl transform hover:-translate-y-0.5'
                                    }`}
                            >
                                {generating ? (
                                    <>Processing...</>
                                ) : (
                                    <> Generate Demands <Zap className="ml-2 w-5 h-5" /> </>
                                )}
                            </button>
                        </div>

                        {/* Status Feedback */}
                        {result && (
                            <div className="mt-6 p-4 rounded-lg bg-gray-50 border border-gray-200">
                                <h3 className="font-semibold text-gray-900 mb-2">Generation Results</h3>

                                {result.unified && (
                                    <>
                                        <div className="flex items-center text-sm text-green-700 mb-2">
                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                            Unified Demand: {result.unified.unifiedDemand?.demandNumber || 'Created'}
                                            {result.unified.unifiedDemand?.totalAmount && (
                                                <span className="ml-2 font-semibold">
                                                    (₹{parseFloat(result.unified.unifiedDemand.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })})
                                                </span>
                                            )}
                                        </div>
                                        {result.unified.shopDemands && result.unified.shopDemands.length > 0 && (
                                            <div className="ml-6 mb-2">
                                                <div className="text-xs font-semibold text-yellow-700 mb-1">Shop Demands ({result.unified.shopDemands.length}):</div>
                                                {result.unified.shopDemands.map((shopDemand, idx) => (
                                                    <div key={idx} className="flex items-center text-xs text-yellow-600 ml-2 mb-1">
                                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                                        {shopDemand.demandNumber}
                                                        {shopDemand.totalAmount && (
                                                            <span className="ml-2">(₹{parseFloat(shopDemand.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })})</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {result.unified.d2dcDemand && (
                                            <div className="flex items-center text-sm text-purple-700 mb-2">
                                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                                D2DC Demand: {result.unified.d2dcDemand.demandNumber}
                                                {result.unified.d2dcDemand.totalAmount && (
                                                    <span className="ml-2 font-semibold">
                                                        (₹{parseFloat(result.unified.d2dcDemand.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })})
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}

                                {result.houseTax && (
                                    <div className="flex items-center text-sm text-blue-700 mb-2">
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        House Tax: {result.houseTax.demandNumber}
                                    </div>
                                )}

                                {result.waterTax && (
                                    <div className="flex items-center text-sm text-cyan-700 mb-2">
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Water Tax: {result.waterTax.demandNumber}
                                    </div>
                                )}

                                {result.d2dc && !result.unified && (
                                    <div className="flex items-center text-sm text-purple-700 mb-2">
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        D2DC: {result.d2dc.demandNumber}
                                    </div>
                                )}

                                {result.errors.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-gray-200">
                                        <p className="text-xs font-semibold text-red-600 mb-1">Errors:</p>
                                        {result.errors.map((err, idx) => (
                                            <p key={idx} className="text-xs text-red-500">• {err.type}: {err.message}</p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </div>
            </div>

            {/* Generated Demands List */}
            {selectedProperty && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-8">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
                        <span>Existing Demands</span>
                        <span className="text-sm font-normal text-gray-500">{propertyDemands.length} found</span>
                    </h2>

                    {loadingDemands ? (
                        <Loading />
                    ) : propertyDemands.length > 0 ? (
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                            {propertyDemands.map((demand) => (
                                <div key={demand.id} className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${demand.serviceType === 'HOUSE_TAX' ? 'bg-blue-100 text-blue-700' :
                                                demand.serviceType === 'WATER_TAX' ? 'bg-cyan-100 text-cyan-700' :
                                                    demand.serviceType === 'D2DC' ? 'bg-purple-100 text-purple-700' :
                                                        'bg-gray-100 text-gray-700'
                                            }`}>
                                            {demand.serviceType.replace('_', ' ')}
                                        </span>
                                        <span className={`text-xs font-medium ${demand.status === 'paid' ? 'text-green-600' :
                                                demand.status === 'partially_paid' ? 'text-yellow-600' :
                                                    'text-red-600'
                                            }`}>
                                            {demand.status.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-medium text-gray-900">{demand.demandNumber}</span>
                                        <span className="font-bold text-gray-900">₹{parseFloat(demand.totalAmount).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1 text-xs text-gray-500">
                                        <span>FY: {demand.financialYear}</span>
                                        <Link to={`/demands/${demand.id}`} className="text-primary-600 hover:text-primary-800 hover:underline flex items-center">
                                            View Details <FileText className="w-3 h-3 ml-1" />
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 text-center py-4">No demands generated yet.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default UnifiedTaxDemand;
