import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { demandAPI, discountAPI, propertyAPI, waterConnectionAPI, shopsAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { ArrowLeft, Search, Percent, IndianRupee, FileText, Calendar, History, Download, CheckCircle, Printer } from 'lucide-react';
import { getDemandOriginalAmount, getDemandPenaltyAmount, calculateDiscount, calculateFinalAmount } from '../../../utils/financialCalculations';

const MODULE_OPTIONS = [
  { value: 'PROPERTY', label: 'Property Tax' },
  { value: 'WATER', label: 'Water Tax' },
  { value: 'SHOP', label: 'Shop Tax' },
  { value: 'D2DC', label: 'D2DC' },
  { value: 'UNIFIED', label: 'Unified Tax' }
];

const ENTITY_LABELS = {
  PROPERTY: 'Select Property ID',
  WATER: 'Select Connection No',
  SHOP: 'Select Shop ID',
  D2DC: 'Select Linked Unit',
  UNIFIED: 'Select Property ID'
};

const formatCurrency = (n) => `₹${parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
const amountClass = {
  original: 'text-gray-700 font-medium',
  discount: 'text-blue-600 font-semibold',
  paid: 'text-green-600 font-medium',
  remaining: (val) => (parseFloat(val || 0) > 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-medium'),
  finalPayable: 'text-emerald-600 font-semibold',
  summary: 'text-emerald-700 font-bold'
};

const resetFormBelow = (setters) => {
  setters.setEntityId(null);
  setters.setEntityLabel('');
  setters.setSelectedDemand(null);
  setters.setDiscountValue('');
  setters.setReason('');
  setters.setDocumentUrl('');
};

const DiscountManagement = () => {
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [module, setModule] = useState('');
  const [entityId, setEntityId] = useState(null);
  const [entityLabel, setEntityLabel] = useState('');
  const [entityList, setEntityList] = useState([]);
  const [entitySearch, setEntitySearch] = useState('');
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [demands, setDemands] = useState([]);
  const [loadingDemands, setLoadingDemands] = useState(false);
  const [selectedDemand, setSelectedDemand] = useState(null);
  const [discountType, setDiscountType] = useState('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('');
  const [reason, setReason] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [pdfLoadingId, setPdfLoadingId] = useState(null);
  const [viewModalRow, setViewModalRow] = useState(null);
  const [viewModalPdfLoading, setViewModalPdfLoading] = useState(false);
  const [createdAdjustment, setCreatedAdjustment] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailDownloading, setDetailDownloading] = useState(false);

  useEffect(() => {
    if (showSuccessModal || showDetailModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showSuccessModal, showDetailModal]);

  useEffect(() => {
    discountAPI.getSummary()
      .then((res) => {
        if (res.data?.success && res.data?.data) setSummary(res.data.data);
      })
      .catch(() => setSummary(null))
      .finally(() => setLoadingSummary(false));
  }, []);

  useEffect(() => {
    discountAPI.getHistory({ limit: 50 })
      .then((res) => setHistory(res.data?.data?.history || []))
      .catch(() => setHistory([]))
      .finally(() => setLoadingHistory(false));
  }, []);

  const refreshHistory = () => {
    setLoadingHistory(true);
    discountAPI.getHistory({ limit: 50 })
      .then((res) => setHistory(res.data?.data?.history || []))
      .catch(() => setHistory([]))
      .finally(() => setLoadingHistory(false));
  };

  const handleDownloadPdf = async (id) => {
    setPdfLoadingId(id);
    try {
      const res = await discountAPI.getPdf(id);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `discount-approval-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to download PDF');
    } finally {
      setPdfLoadingId(null);
    }
  };

  const handleViewModalDownload = async () => {
    if (!viewModalRow?.id) return;
    setViewModalPdfLoading(true);
    try {
      const res = await discountAPI.getPdf(viewModalRow.id);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Discount_Receipt_${viewModalRow.demandNumber || viewModalRow.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Receipt downloaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to download PDF');
    } finally {
      setViewModalPdfLoading(false);
    }
  };

  const handleViewModalPrint = async () => {
    if (!viewModalRow?.id) return;
    setViewModalPdfLoading(true);
    try {
      const res = await discountAPI.getPdf(viewModalRow.id);
      const url = URL.createObjectURL(res.data);
      const w = window.open(url, '_blank', 'noopener');
      if (w) {
        w.onload = () => { w.print(); w.onafterprint = () => { w.close(); URL.revokeObjectURL(url); }; };
      } else {
        URL.revokeObjectURL(url);
        toast.error('Allow popups to print');
      }
      toast.success('Opening print dialog');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load PDF for print');
    } finally {
      setViewModalPdfLoading(false);
    }
  };

  const handleModuleChange = (value) => {
    setModule(value);
    resetFormBelow({
      setEntityId,
      setEntityLabel,
      setSelectedDemand,
      setDiscountValue,
      setReason,
      setDocumentUrl
    });
    setDemands([]);
  };

  useEffect(() => {
    if (!module) {
      setEntityList([]);
      return;
    }
    const fetchEntities = async () => {
      setLoadingEntities(true);
      try {
        if (module === 'PROPERTY' || module === 'D2DC' || module === 'UNIFIED') {
          const res = await propertyAPI.getAll({ limit: 500 });
          setEntityList(res.data.data?.properties || []);
        } else if (module === 'WATER') {
          const res = await waterConnectionAPI.getAll({ limit: 500 });
          setEntityList(res.data.data?.waterConnections || res.data.data?.data || []);
        } else if (module === 'SHOP') {
          const res = await shopsAPI.getAll({ limit: 500 });
          setEntityList(res.data.data?.shops || res.data.data?.data || []);
        } else {
          setEntityList([]);
        }
      } catch (e) {
        toast.error('Failed to load entities');
        setEntityList([]);
      } finally {
        setLoadingEntities(false);
      }
    };
    fetchEntities();
  }, [module]);

  useEffect(() => {
    if (!module || !entityId) {
      setDemands([]);
      return;
    }
    setLoadingDemands(true);
    demandAPI
      .getByModuleEntity(module, entityId)
      .then((res) => {
        setDemands(res.data.data?.demands || []);
      })
      .catch(() => {
        toast.error('Failed to fetch demands');
        setDemands([]);
      })
      .finally(() => setLoadingDemands(false));
  }, [module, entityId]);

  const filteredEntities = entityList.filter((e) => {
    const search = (entitySearch || '').toLowerCase();
    if (!search) return true;
    if (module === 'PROPERTY' || module === 'D2DC' || module === 'UNIFIED') {
      return String(e.propertyNumber || e.id || '').toLowerCase().includes(search);
    }
    if (module === 'WATER') {
      return String(e.connectionNumber || e.id || '').toLowerCase().includes(search);
    }
    if (module === 'SHOP') {
      return String(e.shopNumber || e.id || '').toLowerCase().includes(search);
    }
    return true;
  });

  const selectEntity = (e) => {
    const id = e.id;
    let label = '';
    if (module === 'PROPERTY' || module === 'D2DC' || module === 'UNIFIED') label = `${e.propertyNumber || ''} (ID: ${id})`;
    else if (module === 'WATER') label = `${e.connectionNumber || ''} (ID: ${id})`;
    else if (module === 'SHOP') label = `${e.shopNumber || ''} (ID: ${id})`;
    setEntityId(id);
    setEntityLabel(label);
    setSelectedDemand(null);
  };

  const originalAmount = selectedDemand ? getDemandOriginalAmount(selectedDemand) : 0;
  const penaltyAmount = selectedDemand ? getDemandPenaltyAmount(selectedDemand) : 0;
  const paidAmount = selectedDemand ? parseFloat(selectedDemand.paidAmount || 0) : 0;
  const remainingAmount = selectedDemand ? parseFloat(selectedDemand.balanceAmount || 0) : 0;
  const discountValNum = parseFloat(discountValue) || 0;
  const { discountAmount: computedDiscount, error: discountError } = calculateDiscount(originalAmount, discountType, discountValNum);
  const previewFinal = selectedDemand
    ? calculateFinalAmount(selectedDemand, { discountAmount: computedDiscount, waiverAmount: parseFloat(selectedDemand.penaltyWaived || 0) })
    : null;
  const finalPayable = previewFinal ? previewFinal.finalAmount : 0;
  const waiverAmount = selectedDemand ? parseFloat(selectedDemand.penaltyWaived || 0) : 0;
  const remainingPenalty = previewFinal ? previewFinal.remainingPenalty : penaltyAmount;
  const isDiscountFormDisabled = selectedDemand && originalAmount <= 0;
  const isFullyPaid = selectedDemand && remainingAmount <= 0;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      toast.error('Only PDF and image files (JPEG, PNG, WebP, GIF) are allowed');
      return;
    }
    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('document', file);
      const res = await discountAPI.uploadDocument(formData);
      setDocumentUrl(res.data.data?.url || '');
      toast.success('Document uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDemand) {
      toast.error('Please select a demand');
      return;
    }
    if (!reason.trim()) {
      toast.error('Reason is mandatory');
      return;
    }
    if (!documentUrl) {
      toast.error('Please upload the application PDF or image');
      return;
    }
    if (originalAmount <= 0) {
      toast.error('Original amount is zero; discount cannot be applied');
      return;
    }
    if (discountError || computedDiscount <= 0 || computedDiscount > originalAmount) {
      toast.error(discountError || 'Invalid discount amount');
      return;
    }
    setSubmitting(true);
    try {
      const res = await discountAPI.create({
        module_type: module,
        entity_id: entityId,
        demand_id: selectedDemand.id,
        discount_type: discountType,
        discount_value: discountValNum,
        reason: reason.trim(),
        document_url: documentUrl
      });
      if (!res.data?.success || !res.data?.data?.discount?.id) {
        toast.error(res.data?.message || 'Invalid response');
        return;
      }
      const { discount, demand: resDemand } = res.data.data;
      setCreatedAdjustment({
        id: discount.id,
        moduleType: discount.moduleType,
        citizenName: '—',
        demandNumber: resDemand?.demandNumber || selectedDemand?.demandNumber || '—',
        originalAmount: originalAmount,
        adjustmentAmount: discount.discountAmount,
        adjustmentLabel: 'Discount Amount',
        type: discount.discountType === 'PERCENTAGE' ? `Percentage (${discount.discountValue}%)` : 'Fixed',
        finalAmount: resDemand?.finalAmount,
        approvedBy: discount.approvedBy != null ? `ID ${discount.approvedBy}` : '—',
        date: discount.createdAt || discount.created_at,
        reason: discount.reason || '',
        documentUrl: discount.documentUrl
      });
      setShowSuccessModal(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply discount');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuccessNo = () => {
    setShowSuccessModal(false);
    setShowDetailModal(false);
    setCreatedAdjustment(null);
    setSelectedDemand(null);
    setDiscountValue('');
    setReason('');
    setDocumentUrl('');
    demandAPI.getByModuleEntity(module, entityId).then((res) => setDemands(res.data.data?.demands || []));
    discountAPI.getSummary().then((res) => res.data?.success && res.data?.data && setSummary(res.data.data));
    refreshHistory();
    toast.success('Adjustment recorded successfully');
  };

  const handleSuccessYes = () => {
    setShowSuccessModal(false);
    setShowDetailModal(true);
  };

  const handleDetailClose = () => {
    setShowDetailModal(false);
    setCreatedAdjustment(null);
    setSelectedDemand(null);
    setDiscountValue('');
    setReason('');
    setDocumentUrl('');
    demandAPI.getByModuleEntity(module, entityId).then((res) => setDemands(res.data.data?.demands || []));
    discountAPI.getSummary().then((res) => res.data?.success && res.data?.data && setSummary(res.data.data));
    refreshHistory();
    toast.success('Adjustment recorded successfully');
  };

  const handleDetailDownloadPdf = async () => {
    if (!createdAdjustment?.id) return;
    setDetailDownloading(true);
    try {
      const res = await discountAPI.getPdf(createdAdjustment.id);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Discount_Receipt_${createdAdjustment.demandNumber || createdAdjustment.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Receipt downloaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to download PDF');
    } finally {
      setDetailDownloading(false);
    }
  };

  const handleDetailPrint = async () => {
    if (!createdAdjustment?.id) return;
    setDetailDownloading(true);
    try {
      const res = await discountAPI.getPdf(createdAdjustment.id);
      const url = URL.createObjectURL(res.data);
      const w = window.open(url, '_blank', 'noopener');
      if (w) {
        w.onload = () => { w.print(); w.onafterprint = () => { w.close(); URL.revokeObjectURL(url); }; };
      } else {
        URL.revokeObjectURL(url);
        toast.error('Allow popups to print');
      }
      toast.success('Opening print dialog');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load PDF for print');
    } finally {
      setDetailDownloading(false);
    }
  };

  const statusLabel = (s) => (s === 'partially_paid' ? 'PARTIAL' : (s || '').toUpperCase());

  const entityLabelText = module ? ENTITY_LABELS[module] : 'Select tax module first';
  const canSubmit =
    selectedDemand &&
    reason.trim() &&
    documentUrl &&
    !isDiscountFormDisabled &&
    !isFullyPaid &&
    computedDiscount > 0 &&
    computedDiscount <= originalAmount &&
    !discountError;

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-2">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Link to="/tax-management" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Discount Management</h1>
            <p className="text-gray-500 text-sm">Manual tax concessions with document verification</p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Percent className="w-5 h-5 text-blue-600" />
          Discount Summary
        </h2>
        {loadingSummary ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 animate-pulse">
                <div className="h-10 w-10 rounded-lg bg-gray-200 mb-3" />
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                <div className="h-7 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-6 hover:shadow-md transition-all group relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-blue-50 opacity-50 group-hover:scale-150 transition-transform duration-500 ease-out" />
                <div className="p-3 rounded-lg bg-blue-600 text-white shadow-sm w-fit mb-3 relative z-10">
                  <Percent className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-gray-500 relative z-10">Total Discounts Applied</p>
                <p className="text-2xl font-bold text-gray-900 relative z-10">{summary?.totalDiscounts ?? 0}</p>
              </div>
              <div className="bg-white rounded-xl border border-green-100 shadow-sm p-6 hover:shadow-md transition-all group relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-green-50 opacity-50 group-hover:scale-150 transition-transform duration-500 ease-out" />
                <div className="p-3 rounded-lg bg-green-600 text-white shadow-sm w-fit mb-3 relative z-10">
                  <IndianRupee className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-gray-500 relative z-10">Total Discount Amount (Current FY)</p>
                <p className={`text-2xl relative z-10 ${amountClass.summary}`}>{formatCurrency(summary?.totalDiscountAmountFY)}</p>
              </div>
              <div className="bg-white rounded-xl border border-orange-100 shadow-sm p-6 hover:shadow-md transition-all group relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-orange-50 opacity-50 group-hover:scale-150 transition-transform duration-500 ease-out" />
                <div className="p-3 rounded-lg bg-orange-600 text-white shadow-sm w-fit mb-3 relative z-10">
                  <FileText className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-gray-500 relative z-10">Active Discounted Demands</p>
                <p className="text-2xl font-bold text-gray-900 relative z-10">{summary?.activeDiscountedDemands ?? 0}</p>
              </div>
              <div className="bg-white rounded-xl border border-purple-100 shadow-sm p-6 hover:shadow-md transition-all group relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-purple-50 opacity-50 group-hover:scale-150 transition-transform duration-500 ease-out" />
                <div className="p-3 rounded-lg bg-purple-600 text-white shadow-sm w-fit mb-3 relative z-10">
                  <Calendar className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-gray-500 relative z-10">This Month Discounts</p>
                <p className="text-2xl font-bold text-gray-900 relative z-10">{summary?.monthlyDiscounts ?? 0}</p>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Discount History - below summary */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-slate-600" />
          Discount History
        </h2>
        {loadingHistory ? (
          <div className="flex justify-center py-12">
            <Loading />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Demand No</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Module</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">View</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">PDF</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-500">No discount history yet.</td>
                  </tr>
                ) : (
                  history.map((row) => (
                    <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-3 px-4 text-gray-600">{formatDate(row.createdAt)}</td>
                      <td className="py-3 px-4 font-medium text-gray-900">{row.demandNumber || '—'}</td>
                      <td className="py-3 px-4 text-gray-600">{row.moduleType || '—'}</td>
                      <td className="py-3 px-4 text-gray-600">{row.discountType === 'PERCENTAGE' ? `${row.discountValue}%` : 'Fixed'}</td>
                      <td className={`py-3 px-4 text-right font-semibold ${amountClass.discount}`}>{formatCurrency(row.discountAmount)}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${row.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setViewModalRow(row)}
                          className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium"
                        >
                          View
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(row.id)}
                          disabled={pdfLoadingId === row.id}
                          className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
                        >
                          {pdfLoadingId === row.id ? <span className="animate-spin">⏳</span> : <Download className="w-4 h-4" />}
                          PDF
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* View Details Modal */}
      {viewModalRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 transition-opacity duration-200" onClick={() => setViewModalRow(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Discount Details</h3>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-gray-500">Date</dt><dd className="font-medium">{formatDate(viewModalRow.createdAt)}</dd></div>
              <div><dt className="text-gray-500">Demand No</dt><dd className="font-medium">{viewModalRow.demandNumber || '—'}</dd></div>
              <div><dt className="text-gray-500">Module</dt><dd className="font-medium">{viewModalRow.moduleType || '—'}</dd></div>
              <div><dt className="text-gray-500">Type</dt><dd className="font-medium">{viewModalRow.discountType === 'PERCENTAGE' ? `${viewModalRow.discountValue}%` : 'Fixed'}</dd></div>
              <div><dt className="text-gray-500">Amount</dt><dd className="font-medium">{formatCurrency(viewModalRow.discountAmount)}</dd></div>
              <div><dt className="text-gray-500">Status</dt><dd><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${viewModalRow.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>{viewModalRow.status}</span></dd></div>
              <div><dt className="text-gray-500">Reason</dt><dd className="text-gray-700">{viewModalRow.reason || '—'}</dd></div>
              {viewModalRow.documentUrl && (
                <div><dt className="text-gray-500">Document</dt><dd><a href={viewModalRow.documentUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">View PDF</a></dd></div>
              )}
            </dl>
            <div className="mt-6 flex justify-end gap-2 flex-wrap">
              <button type="button" onClick={handleViewModalDownload} disabled={viewModalPdfLoading} className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50">
                {viewModalPdfLoading ? <span className="animate-spin">⏳</span> : <Download className="w-4 h-4" />}
                Download
              </button>
              <button type="button" onClick={handleViewModalPrint} disabled={viewModalPdfLoading} className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50">
                {viewModalPdfLoading ? <span className="animate-spin">⏳</span> : <Printer className="w-4 h-4" />}
                Print
              </button>
              <button type="button" onClick={() => setViewModalRow(null)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Success confirmation modal (after apply) */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 transition-opacity duration-200" aria-modal="true">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 transition-all duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center">
              <div className="rounded-full bg-green-100 p-4 mb-4">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Adjustment Applied Successfully</h3>
              <p className="text-gray-600 mb-6">The adjustment has been applied. Do you want to download receipt or view details?</p>
              <div className="flex gap-3 w-full justify-center">
                <button type="button" onClick={handleSuccessYes} className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors">
                  Yes, View / Download
                </button>
                <button type="button" onClick={handleSuccessNo} className="px-5 py-2.5 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                  No, Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail modal (after Yes) */}
      {showDetailModal && createdAdjustment && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 transition-opacity duration-200" aria-modal="true">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col transition-all duration-200">
            <div className="p-6 flex items-start justify-between gap-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Discount Details</h3>
              <button type="button" onClick={handleDetailDownloadPdf} disabled={detailDownloading} className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                {detailDownloading ? <span className="animate-spin">⏳</span> : <Download className="w-4 h-4" />}
                Download Receipt
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <dl className="space-y-3 text-sm">
                <div><dt className="text-gray-500">Adjustment ID</dt><dd className="font-medium">{createdAdjustment.id}</dd></div>
                <div><dt className="text-gray-500">Module Type</dt><dd className="font-medium">{createdAdjustment.moduleType || '—'}</dd></div>
                <div><dt className="text-gray-500">Citizen Name</dt><dd className="font-medium">{createdAdjustment.citizenName}</dd></div>
                <div><dt className="text-gray-500">Demand Number</dt><dd className="font-medium">{createdAdjustment.demandNumber}</dd></div>
                <div><dt className="text-gray-500">Original Amount</dt><dd className={amountClass.original}>{formatCurrency(createdAdjustment.originalAmount)}</dd></div>
                <div><dt className="text-gray-500">{createdAdjustment.adjustmentLabel || 'Discount Amount'}</dt><dd className={amountClass.discount}>{formatCurrency(createdAdjustment.adjustmentAmount)}</dd></div>
                <div><dt className="text-gray-500">Type</dt><dd className="font-medium">{createdAdjustment.type}</dd></div>
                <div><dt className="text-gray-500">Final Amount</dt><dd className={amountClass.finalPayable}>{formatCurrency(createdAdjustment.finalAmount)}</dd></div>
                <div><dt className="text-gray-500">Approved By</dt><dd className="font-medium">{createdAdjustment.approvedBy}</dd></div>
                <div><dt className="text-gray-500">Date</dt><dd className="font-medium">{formatDate(createdAdjustment.date)}</dd></div>
                <div><dt className="text-gray-500">Reason</dt><dd className="text-gray-700">{createdAdjustment.reason || '—'}</dd></div>
                {createdAdjustment.documentUrl && (
                  <div><dt className="text-gray-500">Attached Document</dt><dd><a href={createdAdjustment.documentUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">View document</a></dd></div>
                )}
              </dl>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-2 flex-wrap">
              <button type="button" onClick={handleDetailDownloadPdf} disabled={detailDownloading} className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50">
                {detailDownloading ? <span className="animate-spin">⏳</span> : <Download className="w-4 h-4" />}
                Download PDF
              </button>
              <button type="button" onClick={handleDetailPrint} disabled={detailDownloading} className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50">
                {detailDownloading ? <span className="animate-spin">⏳</span> : <Printer className="w-4 h-4" />}
                Print
              </button>
              <button type="button" onClick={handleDetailClose} className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Apply New Discount - Step-based workflow */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-600" />
          Apply New Discount
        </h2>

        {/* Step 1: Tax module */}
        <section className="mb-8">
          <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide mb-2">Step 1 of 4</p>
          <h3 className="text-base font-medium text-gray-800 mb-2">Select tax module</h3>
          <select
            value={module}
            onChange={(e) => handleModuleChange(e.target.value)}
            className="w-full max-w-xl border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">— Select module —</option>
            {MODULE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </section>

        {/* Step 2: Entity - only after module */}
        {module && (
          <section className="mb-8 pt-6 border-t border-gray-100">
            <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide mb-2">Step 2 of 4</p>
            <h3 className="text-base font-medium text-gray-800 mb-2">{ENTITY_LABELS[module] || 'Select entity'}</h3>
            {loadingEntities ? (
              <Loading />
            ) : (
              <>
                <div className="relative w-full max-w-xl mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={entitySearch}
                    onChange={(e) => setEntitySearch(e.target.value)}
                    className="w-full pl-9 border border-gray-300 rounded-lg px-4 py-2.5"
                  />
                </div>
                <div className="max-h-52 overflow-y-auto border border-gray-200 rounded-lg w-full max-w-xl">
                  {filteredEntities.slice(0, 100).map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => selectEntity(e)}
                      className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 border-b border-gray-100 last:border-b-0"
                    >
                      {module === 'PROPERTY' || module === 'D2DC' || module === 'UNIFIED' ? e.propertyNumber || `ID ${e.id}` : module === 'WATER' ? e.connectionNumber || `ID ${e.id}` : e.shopNumber || `ID ${e.id}`}
                    </button>
                  ))}
                  {filteredEntities.length === 0 && <p className="p-4 text-gray-500 text-sm">No entities found</p>}
                </div>
                {entityLabel && <p className="mt-2 text-sm text-gray-600">Selected: <strong>{entityLabel}</strong></p>}
              </>
            )}
          </section>
        )}

        {/* Step 3: Demands table - only after entity */}
        {module && entityId && (
          <section className="mb-8 pt-6 border-t border-gray-100">
            <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide mb-2">Step 3 of 4</p>
            <h3 className="text-base font-medium text-gray-800 mb-3">Select a demand</h3>
            {loadingDemands ? (
              <Loading />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Demand No</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Original</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Paid</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">Remaining</th>
                      <th className="w-20 py-3 px-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {demands.map((d) => (
                      <tr key={d.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                        <td className="py-3 px-4 font-medium">{d.demandNumber}</td>
                        <td className={`py-3 px-4 text-right ${amountClass.original}`}>{formatCurrency(d.totalAmount)}</td>
                        <td className={`py-3 px-4 text-right ${amountClass.paid}`}>{formatCurrency(d.paidAmount)}</td>
                        <td className={`py-3 px-4 text-right ${amountClass.remaining(d.balanceAmount)}`}>{formatCurrency(d.balanceAmount)}</td>
                        <td className="py-3 px-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="radio" name="demand" checked={selectedDemand?.id === d.id} onChange={() => setSelectedDemand(d)} />
                            <span className="text-xs">Select</span>
                          </label>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {demands.length === 0 && <p className="py-6 text-center text-gray-500 text-sm">No pending or partial demands for this entity.</p>}
              </div>
            )}
          </section>
        )}

        {/* Step 4: Discount form + Document + Submit - only after demand selected */}
        {module && entityId && selectedDemand && (
          <section className="pt-6 border-t border-gray-100">
            <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide mb-4">Step 4 of 4</p>
            <h3 className="text-base font-medium text-gray-800 mb-4">Discount & documentation</h3>
            {isDiscountFormDisabled && <p className="text-sm text-amber-600 mb-3">Original amount is zero; discount cannot be applied.</p>}
            {isFullyPaid && <p className="text-sm text-amber-600 mb-3">Demand is fully paid.</p>}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Discount type</label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="discountType" checked={discountType === 'PERCENTAGE'} onChange={() => setDiscountType('PERCENTAGE')} />
                    Percentage
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="discountType" checked={discountType === 'FIXED'} onChange={() => setDiscountType('FIXED')} />
                    Fixed amount
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount value</label>
                <input
                  type="number"
                  min="0"
                  step={discountType === 'PERCENTAGE' ? '0.01' : '1'}
                  max={discountType === 'PERCENTAGE' ? 100 : originalAmount}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  disabled={isDiscountFormDisabled || isFullyPaid}
                  className="border border-gray-300 rounded-lg px-4 py-2.5 w-full max-w-xs min-w-[12rem] disabled:opacity-60"
                />
                {discountValue && discountError && <p className="text-sm text-red-600 mt-1">{discountError}</p>}
              </div>
              <div className={`p-4 rounded-lg border text-sm ${discountError ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
                <div className="flex justify-between py-1"><span className="text-gray-600">Original (tax)</span><span className={amountClass.original}>{formatCurrency(originalAmount)}</span></div>
                <div className="flex justify-between py-1"><span className="text-gray-600">Discount</span><span className={amountClass.discount}>{formatCurrency(computedDiscount)}</span></div>
                <div className="flex justify-between py-1 border-t border-gray-200 mt-1 pt-2"><span className="text-gray-700 font-medium">Final payable</span><span className={amountClass.finalPayable}>{formatCurrency(finalPayable)}</span></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason (mandatory)</label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="border border-gray-300 rounded-lg px-4 py-2.5 w-full min-w-0" placeholder="Enter reason for discount" />
                {!reason.trim() && <p className="text-sm text-amber-600 mt-1">Reason is required.</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Upload application PDF or image (mandatory)</label>
                <input type="file" accept=".pdf,application/pdf,image/jpeg,image/png,image/webp" onChange={handleFileChange} className="border border-gray-300 rounded-lg px-4 py-2.5 w-full max-w-xl text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-700 file:font-medium" />
                {uploadingDoc && <span className="text-sm text-gray-500 mt-1 block">Uploading…</span>}
                {documentUrl && <span className="text-sm text-green-600 mt-1 block">Document uploaded.</span>}
                {!documentUrl && <p className="text-sm text-amber-600 mt-1">PDF or image is required.</p>}
              </div>
              <button type="submit" disabled={submitting || !canSubmit} className="btn btn-primary">
                {submitting ? 'Applying…' : 'Apply Discount'}
              </button>
            </form>
          </section>
        )}
      </div>
    </div>
  );
};

export default DiscountManagement;
