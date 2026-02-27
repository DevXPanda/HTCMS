import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { demandAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { CreditCard, Calculator, Droplet, FileText, Download, Loader2, Home } from 'lucide-react';
import { calculateFinalAmount } from '../../../utils/financialCalculations';
import { useShopTaxBasePath } from '../../../contexts/ShopTaxBasePathContext';
import DemandDetailsView from '../../../components/DemandDetailsView';

const formatAmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const DemandDetails = () => {
  const { id } = useParams();
  const location = useLocation();
  const isCitizenRoute = location.pathname.startsWith('/citizen');
  const basePath = useShopTaxBasePath() || (isCitizenRoute ? '/citizen' : '');
  const [demand, setDemand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [breakdown, setBreakdown] = useState(null);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);
  const [pdfLoadingNotice, setPdfLoadingNotice] = useState(false);
  const [pdfLoadingReceipt, setPdfLoadingReceipt] = useState(false);
  const [showDiscountDetails, setShowDiscountDetails] = useState(false);

  useEffect(() => {
    fetchDemand();
  }, [id]);

  useEffect(() => {
    if (demand?.id) fetchBreakdown();
  }, [demand]);

  const fetchDemand = async () => {
    try {
      const response = await demandAPI.getById(id);
      const data = response.data?.data ?? response.data;
      const demandObj = data?.demand ?? data;
      if (response.data?.success && demandObj) {
        setDemand(demandObj);
      } else {
        toast.error(response.data?.message || 'Failed to fetch tax demand details');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Failed to fetch tax demand details');
    } finally {
      setLoading(false);
    }
  };

  const fetchBreakdown = async () => {
    try {
      setLoadingBreakdown(true);
      const response = await demandAPI.getBreakdown(id);
      if (response.data.data?.isUnified) setBreakdown(response.data.data);
    } catch (err) {
      console.error('Failed to fetch demand breakdown:', err);
    } finally {
      setLoadingBreakdown(false);
    }
  };

  const downloadDemandPdf = async (type) => {
    const setLoading = type === 'receipt' ? setPdfLoadingReceipt : setPdfLoadingNotice;
    setLoading(true);
    try {
      const res = await demandAPI.getPdf(id, type);
      const name = type === 'receipt' ? `demand-summary-${demand?.demandNumber || id}.pdf` : `demand-notice-${demand?.demandNumber || id}.pdf`;
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to download PDF');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;
  if (!demand) return <div>Tax Demand not found</div>;

  const propertyId = demand.property?.id ?? demand.propertyId;
  const propertyNumberLink = basePath ? `${basePath}/properties/${propertyId}` : `/properties/${propertyId}`;
  const assessmentLink = demand.assessmentId && (basePath ? `${basePath}/assessments/${demand.assessmentId}` : `/assessments/${demand.assessmentId}`);

  return (
    <DemandDetailsView
      demand={demand}
      backTo={basePath ? `${basePath}/demands` : '/demands'}
      backLabel="Back to Tax Demands"
      title="Tax Demand Details"
      propertyNumberLink={demand.property ? propertyNumberLink : undefined}
      assessmentLink={assessmentLink}
      actionButtons={
        <>
          <button
            type="button"
            onClick={() => downloadDemandPdf('notice')}
            disabled={pdfLoadingNotice}
            className="btn btn-secondary flex items-center"
          >
            {pdfLoadingNotice ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Download Demand Notice (PDF)
          </button>
          <button
            type="button"
            onClick={() => downloadDemandPdf('receipt')}
            disabled={pdfLoadingReceipt}
            className="btn btn-secondary flex items-center"
          >
            {pdfLoadingReceipt ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Download Summary Receipt
          </button>
          {parseFloat(demand.balanceAmount || 0) > 0 && (
            <Link to={basePath ? `${basePath}/payments/online/${id}` : `/payments/online/${id}`} className="btn btn-primary flex items-center">
              <CreditCard className="w-4 h-4 mr-2" />
              Pay Online
            </Link>
          )}
        </>
      }
    >
      {demand.taxDiscounts && demand.taxDiscounts.length > 0 && (() => {
        const discount = demand.taxDiscounts[0];
        if (!discount) return null;
        const finalPayable = demand.finalAmount ?? calculateFinalAmount(demand, { discountAmount: parseFloat(discount.discountAmount || 0), waiverAmount: parseFloat(demand.penaltyWaived || 0) }).finalAmount;
        return (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/80 flex justify-between items-center flex-wrap gap-2">
              <h2 className="font-semibold text-gray-900 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-slate-600" />
                Discount Applied
              </h2>
              <button type="button" onClick={() => setShowDiscountDetails(true)} className="btn btn-secondary text-sm">
                View details
              </button>
            </div>
            <dl className="divide-y divide-gray-100">
              <div className="px-5 py-3 flex justify-between"><dt className="text-sm text-gray-500">Discount Amount</dt><dd className="font-semibold">{formatAmt(discount.discountAmount)}</dd></div>
              <div className="px-5 py-3 flex justify-between"><dt className="text-sm text-gray-500">Final Payable</dt><dd className="font-semibold">{formatAmt(finalPayable)}</dd></div>
            </dl>
            {showDiscountDetails && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowDiscountDetails(false)}>
                <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Discount Details</h3>
                  <dl className="space-y-2 text-sm">
                    <div><dt className="text-gray-500">Demand No</dt><dd className="font-medium">{demand.demandNumber || '—'}</dd></div>
                    <div><dt className="text-gray-500">Type</dt><dd className="font-medium">{discount.discountType === 'PERCENTAGE' ? `${discount.discountValue}%` : 'Fixed'}</dd></div>
                    <div><dt className="text-gray-500">Amount</dt><dd className="font-medium">{formatAmt(discount.discountAmount)}</dd></div>
                    <div><dt className="text-gray-500">Reason</dt><dd className="text-gray-700">{discount.reason || '—'}</dd></div>
                    {discount.documentUrl && (
                      <div><dt className="text-gray-500">Document</dt><dd><a href={discount.documentUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">View PDF</a></dd></div>
                    )}
                  </dl>
                  <div className="mt-6 flex justify-end"><button type="button" onClick={() => setShowDiscountDetails(false)} className="btn btn-secondary">Close</button></div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {(breakdown?.demand?.property?.waterConnections?.length ?? 0) > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/80">
            <h2 className="font-semibold text-gray-900 flex items-center">
              <Droplet className="w-5 h-5 mr-2 text-gray-500" />
              Water Connections
            </h2>
          </div>
          <div className="p-5 space-y-3">
            {(breakdown?.demand?.property?.waterConnections ?? []).map((connection) => (
              <div key={connection.id} className="bg-gray-50 p-3 rounded-lg flex justify-between items-start">
                <div>
                  <p className="font-medium">{connection.connectionNumber}</p>
                  <div className="flex gap-2 mt-1">
                    <span className="badge badge-info text-xs">{connection.connectionType}</span>
                    <span className={`badge text-xs ${connection.isMetered ? 'badge-success' : 'badge-secondary'}`}>{connection.isMetered ? 'Metered' : 'Non-metered'}</span>
                  </div>
                  {connection.meterNumber && <p className="text-sm text-gray-600 mt-1">Meter: {connection.meterNumber}</p>}
                </div>
                <span className={`badge ${connection.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`}>{connection.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {breakdown && breakdown.isUnified && breakdown.items && breakdown.items.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/80">
            <h2 className="font-semibold text-gray-900 flex items-center">
              <Calculator className="w-5 h-5 mr-2 text-gray-500" />
              Unified Tax Demand Breakdown
            </h2>
          </div>
          <div className="p-5 space-y-6">
            {breakdown.items.filter(i => i.taxType === 'PROPERTY').length > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-800 mb-3">Property Tax Breakdown</h3>
                {breakdown.items.filter(i => i.taxType === 'PROPERTY').map((item) => (
                  <dl key={item.id} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div><dt className="text-sm text-blue-700">Assessed Value</dt><dd className="font-semibold">{formatAmt(item.metadata?.assessedValue)}</dd></div>
                    <div><dt className="text-sm text-blue-700">Tax Rate</dt><dd className="font-semibold">{item.metadata?.taxRate || 0}%</dd></div>
                    <div><dt className="text-sm text-blue-700">Property Tax Amount</dt><dd className="font-semibold text-green-600">{formatAmt(item.baseAmount)}</dd></div>
                    <div><dt className="text-sm text-blue-700">Arrears</dt><dd className="font-semibold">{formatAmt(item.arrearsAmount)}</dd></div>
                  </dl>
                ))}
                <p className="mt-3 text-xs text-blue-700">Penalty/interest (if any) are applied at demand level.</p>
              </div>
            )}
            {breakdown.items.filter(i => i.taxType === 'WATER').length > 0 && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="font-semibold text-green-800 mb-3">Water Tax Breakdown (Per Connection)</h3>
                <div className="space-y-4">
                  {breakdown.items.filter(i => i.taxType === 'WATER').map((item) => (
                    <div key={item.id} className="bg-white p-3 rounded border">
                      <p className="font-medium">Connection No: {item.metadata?.connectionNumber || item.connectionId}</p>
                      <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                        <div><dt className="text-xs text-gray-600">Water Tax Amount</dt><dd className="font-semibold text-green-600">{formatAmt(item.baseAmount)}</dd></div>
                        <div><dt className="text-xs text-gray-600">Arrears</dt><dd className="font-medium">{formatAmt(item.arrearsAmount)}</dd></div>
                        <div><dt className="text-xs text-gray-600">Subtotal</dt><dd className="font-bold text-green-700">{formatAmt(item.totalAmount)}</dd></div>
                      </dl>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-300">
              <h3 className="font-bold text-purple-800 mb-3 text-lg">Grand Total Summary</h3>
              {breakdown.breakdown?.note && <div className="text-sm text-purple-700 bg-purple-100 border border-purple-200 rounded p-2 mb-3">{breakdown.breakdown.note}</div>}
              <dl className="space-y-2">
                <div className="flex justify-between"><dt className="text-purple-700">Property Subtotal</dt><dd className="font-semibold">{formatAmt(breakdown.items.filter(i => i.taxType === 'PROPERTY').reduce((s, i) => s + parseFloat(i.totalAmount || 0), 0))}</dd></div>
                <div className="flex justify-between"><dt className="text-purple-700">Water Subtotal</dt><dd className="font-semibold">{formatAmt(breakdown.items.filter(i => i.taxType === 'WATER').reduce((s, i) => s + parseFloat(i.totalAmount || 0), 0))}</dd></div>
                <div className="flex justify-between"><dt className="text-purple-700">Penalty (Demand-level)</dt><dd className="font-semibold">{formatAmt(breakdown.demand?.penaltyAmount)}</dd></div>
                <div className="flex justify-between"><dt className="text-purple-700">Interest (Demand-level)</dt><dd className="font-semibold">{formatAmt(breakdown.demand?.interestAmount)}</dd></div>
                <div className="border-t border-purple-300 pt-2 mt-2 flex justify-between">
                  <dt className="text-lg font-bold text-purple-900">GRAND TOTAL PAYABLE</dt>
                  <dd className="text-2xl font-bold text-purple-900">{formatAmt(breakdown.demand?.totalAmount)}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      )}

      {/* {demand.remarks && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/80">
            <h2 className="font-semibold text-gray-900">Remarks</h2>
          </div>
          <div className="p-5">
            <p className="text-gray-600 whitespace-pre-wrap text-sm">{demand.remarks}</p>
          </div>
        </div>
      )} */}
    </DemandDetailsView>
  );
};

export default DemandDetails;
