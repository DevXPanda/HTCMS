import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { paymentAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { Download, Printer, Loader2, Receipt, CreditCard, TrendingUp, Wallet } from 'lucide-react';
import DetailPageLayout, { DetailRow } from '../../../components/DetailPageLayout';
import { formatDateIST } from '../../../utils/dateUtils';
import { PaymentReceiptView } from '../../../components/ReceiptView';

const formatAmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PaymentDetails = () => {
  const { id } = useParams();
  const location = useLocation();
  const isCitizenRoute = location.pathname.startsWith('/citizen');
  const isAccountOfficerRoute = location.pathname.startsWith('/account-officer');
  const basePath = isCitizenRoute ? '/citizen' : (isAccountOfficerRoute ? '/account-officer' : '');
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    fetchPayment();
  }, [id]);

  const fetchPayment = async () => {
    try {
      const response = await paymentAPI.getById(id);
      setPayment(response.data.data.payment);
    } catch (error) {
      toast.error('Failed to fetch payment details');
    } finally {
      setLoading(false);
    }
  };

  const downloadPaymentReceipt = async () => {
    setPdfLoading(true);
    try {
      const res = await paymentAPI.getPdf(id);
      const name = `receipt_${payment?.receiptNumber || payment?.paymentNumber || id}.pdf`;
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to download receipt');
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading) return <Loading />;
  if (!payment) return <div>Payment not found</div>;

  const statusBadge = () => {
    const s = (payment.status || '').toLowerCase();
    if (s === 'completed') return 'badge-success';
    if (s === 'pending') return 'badge-warning';
    if (s === 'failed') return 'badge-danger';
    return 'badge-info';
  };

  return (
    <DetailPageLayout
      backTo={`${basePath}/payments`}
      backLabel="Back to Payments"
      title="Payment Receipt"
      subtitle={payment.receiptNumber}
      actionButtons={
        <>
          <button
            type="button"
            onClick={downloadPaymentReceipt}
            disabled={pdfLoading}
            className="btn btn-secondary flex items-center"
          >
            {pdfLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Download Receipt
          </button>
          <button type="button" onClick={() => window.print()} className="btn btn-secondary flex items-center">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </button>
        </>
      }
      summarySection={
        <>
          <h2 className="form-section-title flex items-center no-print">
            <TrendingUp className="w-5 h-5 mr-2 text-primary-600" />
            Summary
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
            <div className="stat-card">
              <div className="stat-card-title"><span>Receipt</span><Receipt className="w-5 h-5 text-gray-400" /></div>
              <p className="stat-card-value text-lg">{payment.receiptNumber}</p>
            </div>
            <div className="stat-card">
              <div className="stat-card-title"><span>Amount</span><Wallet className="w-5 h-5 text-gray-400" /></div>
              <p className="stat-card-value text-xl font-bold text-green-600">{formatAmt(payment.amount)}</p>
            </div>
            <div className="stat-card">
              <div className="stat-card-title"><span>Status</span></div>
              <p className="stat-card-value text-base">
                <span className={`badge capitalize ${statusBadge()}`}>{payment.status}</span>
              </p>
            </div>
            <div className="stat-card">
              <div className="stat-card-title"><span>Date</span></div>
              <p className="stat-card-value text-lg">{formatDateIST(payment.paymentDate)}</p>
            </div>
          </div>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="no-print card">
          <h2 className="form-section-title flex items-center">
            <CreditCard className="w-5 h-5 mr-2 text-primary-600" />
            Payment Information
          </h2>
          <dl>
            <DetailRow label="Receipt Number" value={payment.receiptNumber} valueClass="font-semibold" />
            <DetailRow label="Payment Number" value={payment.paymentNumber} />
            <DetailRow label="Amount" value={formatAmt(payment.amount)} valueClass="text-green-600 font-bold" />
            <DetailRow label="Payment Mode" value={payment.paymentMode} valueClass="capitalize" />
            <DetailRow label="Payment Date" value={formatDateIST(payment.paymentDate)} />
            <DetailRow
              label="Status"
              value={<span className={`badge capitalize ${statusBadge()}`}>{payment.status}</span>}
            />
            {payment.cashier && (
              <DetailRow label="Received By" value={`${payment.cashier.firstName} ${payment.cashier.lastName}`} />
            )}
            {(payment.chequeNumber || payment.transactionId) && (
              <DetailRow
                label={payment.paymentMode === 'cheque' || payment.paymentMode === 'dd' ? (payment.paymentMode === 'cheque' ? 'Cheque' : 'DD') + ' Number' : 'Transaction ID'}
                value={payment.chequeNumber || payment.transactionId}
              />
            )}
            {payment.chequeDate && <DetailRow label="Cheque/DD Date" value={formatDateIST(payment.chequeDate)} />}
            {payment.bankName && <DetailRow label="Bank Name" value={payment.bankName} />}
            {payment.proofUrl && <DetailRow label="Payment Proof" value={<a href={payment.proofUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline font-medium">View Proof Document</a>} />}
          </dl>
        </div>

        <div className="no-print card">
          <h2 className="form-section-title flex items-center">
            <Receipt className="w-5 h-5 mr-2 text-primary-600" />
            Property & Demand
          </h2>
          <dl>
            <DetailRow
              label="Property Number"
              value={payment.property ? <Link to={`/properties/${payment.propertyId}`} className="text-primary-600 hover:underline">{payment.property.propertyNumber}</Link> : payment.property?.propertyNumber}
            />
            <DetailRow label="Address" value={payment.property?.address} />
            <DetailRow label="Ward" value={payment.property?.ward?.wardName} />
            {payment.property?.owner && (
              <DetailRow label="Owner" value={`${payment.property.owner.firstName} ${payment.property.owner.lastName}`} />
            )}
            <DetailRow
              label="Demand Number"
              value={payment.demand ? <Link to={`${basePath}/demands/${payment.demandId}`} className="text-primary-600 hover:underline">{payment.demand.demandNumber}</Link> : payment.demand?.demandNumber}
            />
            <DetailRow label="Financial Year" value={payment.demand?.financialYear} />
            <DetailRow label="Total Demand" value={formatAmt(payment.demand?.totalAmount)} />
            <DetailRow label="Paid Amount" value={formatAmt(payment.demand?.paidAmount)} valueClass="text-green-600" />
            <DetailRow
              label="Balance"
              value={formatAmt(payment.demand?.balanceAmount)}
              valueClass={parseFloat(payment.demand?.balanceAmount || 0) > 0 ? 'text-red-600' : 'text-green-600'}
            />
          </dl>
        </div>

        <div className="receipt-print-area lg:col-span-2">
          <h2 className="form-section-title no-print">Receipt Preview</h2>
          <PaymentReceiptView payment={payment} formatAmt={formatAmt} />
          {/* {payment.remarks && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Remarks</p>
              <p className="text-sm">{payment.remarks}</p>
            </div>
          )} */}
        </div>

        {/* {payment.remarks && (
          <div className="no-print card lg:col-span-2">
            <h2 className="form-section-title">Remarks</h2>
            <p className="text-gray-600 whitespace-pre-wrap text-sm">{payment.remarks}</p>
          </div>
        )} */}
      </div>
    </DetailPageLayout>
  );
};

export default PaymentDetails;
