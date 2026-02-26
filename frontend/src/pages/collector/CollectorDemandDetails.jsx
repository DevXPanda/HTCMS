import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { demandAPI, discountAPI } from '../../services/api';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import { ArrowLeft, FileText, Download, Loader2 } from 'lucide-react';
import { calculateFinalAmount } from '../../utils/financialCalculations';

const formatCurrency = (n) => `₹${parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const CollectorDemandDetails = () => {
  const { id } = useParams();
  const [demand, setDemand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoadingNotice, setPdfLoadingNotice] = useState(false);
  const [pdfLoadingReceipt, setPdfLoadingReceipt] = useState(false);
  const [pdfLoadingDiscount, setPdfLoadingDiscount] = useState(false);
  const [showDiscountDetails, setShowDiscountDetails] = useState(false);

  useEffect(() => {
    demandAPI
      .getById(id)
      .then((res) => {
        if (res.data.success && res.data.data.demand) {
          setDemand(res.data.data.demand);
        } else {
          setDemand(null);
        }
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || 'Failed to load demand');
        setDemand(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const downloadDemandPdf = async (type) => {
    const setLoading = type === 'receipt' ? setPdfLoadingReceipt : setPdfLoadingNotice;
    setLoading(true);
    try {
      const res = await demandAPI.getPdf(id, type);
      const blob = res.data;
      const name = type === 'receipt' ? `demand-summary-${demand?.demandNumber || id}.pdf` : `demand-notice-${demand?.demandNumber || id}.pdf`;
      const url = URL.createObjectURL(blob);
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

  const downloadDiscountPdf = async () => {
    if (!demand?.taxDiscounts?.[0]?.id) return;
    setPdfLoadingDiscount(true);
    try {
      const res = await discountAPI.getPdf(demand.taxDiscounts[0].id);
      const blob = res.data;
      const name = `discount-approval-${demand.taxDiscounts[0].id}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to download discount letter');
    } finally {
      setPdfLoadingDiscount(false);
    }
  };

  if (loading) return <Loading />;
  if (!demand) return <div className="p-6">Demand not found or access denied.</div>;

  const discount = demand.taxDiscounts && demand.taxDiscounts.length > 0 ? demand.taxDiscounts[0] : null;

  return (
    <div className="space-y-6">
      <Link to="/collector/dashboard" className="inline-flex items-center text-primary-600 hover:underline mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">Demand Details</h1>

      <div className="bg-white rounded-lg border border-gray-100 p-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-semibold">Demand Information</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => downloadDemandPdf('notice')}
              disabled={pdfLoadingNotice}
              className="btn btn-secondary flex items-center text-sm"
            >
              {pdfLoadingNotice ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
              Demand Notice (PDF)
            </button>
            <button
              type="button"
              onClick={() => downloadDemandPdf('receipt')}
              disabled={pdfLoadingReceipt}
              className="btn btn-secondary flex items-center text-sm"
            >
              {pdfLoadingReceipt ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
              Summary Receipt
            </button>
          </div>
        </div>
        <dl className="space-y-2">
          <div>
            <dt className="text-sm text-gray-500">Demand Number</dt>
            <dd className="font-medium">{demand.demandNumber}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Financial Year</dt>
            <dd>{demand.financialYear}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Original Amount</dt>
            <dd className="font-semibold">{formatCurrency(demand.totalAmount)}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Paid Amount</dt>
            <dd className="text-green-600 font-semibold">{formatCurrency(demand.paidAmount)}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Balance Amount</dt>
            <dd className="font-semibold">{formatCurrency(demand.balanceAmount)}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Due Date</dt>
            <dd>{new Date(demand.dueDate).toLocaleDateString()}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Status</dt>
            <dd className="capitalize">{demand.status?.replace('_', ' ')}</dd>
          </div>
        </dl>
      </div>

      {discount && (
        <div className="bg-white rounded-lg border border-gray-100 p-6">
          <div className="flex justify-between items-start mb-4 flex-wrap gap-2">
            <h2 className="text-lg font-semibold flex items-center">
              <FileText className="w-5 h-5 mr-2 text-slate-600" />
              Discount Applied
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDiscountDetails(true)}
                className="btn btn-secondary flex items-center text-sm"
              >
                View details
              </button>
              <button
                type="button"
                onClick={downloadDiscountPdf}
                disabled={pdfLoadingDiscount}
                className="btn btn-secondary flex items-center text-sm"
              >
                {pdfLoadingDiscount ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
                Download PDF
              </button>
            </div>
          </div>
          <dl className="space-y-2">
            <div>
              <dt className="text-sm text-gray-500">Original Amount</dt>
              <dd className="font-semibold">{formatCurrency(demand.totalAmount)}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Discount Applied</dt>
              <dd className="text-slate-700 font-semibold">{formatCurrency(discount.discountAmount)}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Final Payable</dt>
              <dd className="font-semibold">{formatCurrency(demand.finalAmount ?? calculateFinalAmount(demand, { discountAmount: parseFloat(discount.discountAmount || 0), waiverAmount: parseFloat(demand.penaltyWaived || 0) }).finalAmount)}</dd>
            </div>
          </dl>
          {showDiscountDetails && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowDiscountDetails(false)}>
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Discount Details</h3>
                <dl className="space-y-2 text-sm">
                  <div><dt className="text-gray-500">Demand No</dt><dd className="font-medium">{demand.demandNumber || '—'}</dd></div>
                  <div><dt className="text-gray-500">Type</dt><dd className="font-medium">{discount.discountType === 'PERCENTAGE' ? `${discount.discountValue}%` : 'Fixed'}</dd></div>
                  <div><dt className="text-gray-500">Amount</dt><dd className="font-medium">{formatCurrency(discount.discountAmount)}</dd></div>
                  <div><dt className="text-gray-500">Reason</dt><dd className="text-gray-700">{discount.reason || '—'}</dd></div>
                  {discount.documentUrl && (
                    <div><dt className="text-gray-500">Document</dt><dd><a href={discount.documentUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">View PDF</a></dd></div>
                  )}
                </dl>
                <div className="mt-6 flex justify-end"><button type="button" onClick={() => setShowDiscountDetails(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Close</button></div>
              </div>
            </div>
          )}
        </div>
      )}

      {demand.property && (
        <div className="bg-white rounded-lg border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-2">Property</h2>
          <p className="text-gray-700">{demand.property.propertyNumber} – {demand.property.address}</p>
          {demand.property.owner && (
            <p className="text-sm text-gray-500 mt-1">
              Owner: {demand.property.owner.firstName} {demand.property.owner.lastName}
              {demand.property.owner.phone && ` • ${demand.property.owner.phone}`}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default CollectorDemandDetails;
