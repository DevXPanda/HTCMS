import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { paymentAPI } from '../../services/api';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import { Download, Receipt, FileText } from 'lucide-react';
import DetailPageLayout, { DetailRow } from '../../components/DetailPageLayout';
import { formatDateIST } from '../../utils/dateUtils';

const CollectionDetails = () => {
  const { id } = useParams();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchPayment();
  }, [id]);

  const fetchPayment = async () => {
    try {
      const response = await paymentAPI.getById(id);
      setPayment(response.data.data.payment);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch collection details');
      setPayment(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = async () => {
    try {
      const response = await paymentAPI.getPdf(id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${(payment?.receiptNumber || payment?.paymentNumber || id)}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Receipt downloaded');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to download receipt');
    }
  };

  if (loading) return <Loading />;
  if (!payment) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-500 text-lg mb-4">Collection not found</p>
        <Link to="/collector/collections" className="btn btn-primary">
          Back to Collections
        </Link>
      </div>
    );
  }

  const collectionCode = payment.receiptNumber || payment.paymentNumber || `PAY-${payment.id}`;
  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(parseFloat(amount || 0));

  return (
    <DetailPageLayout
      title="Collection Details"
      subtitle={collectionCode}
      actionButtons={
        <button type="button" onClick={handleDownloadReceipt} className="btn btn-primary flex items-center">
          <Download className="w-4 h-4 mr-2" />
          Download Receipt
        </button>
      }
      summarySection={
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="stat-card-title flex items-center">
              <span>Collection code</span>
              <Receipt className="w-5 h-5 text-gray-400 ml-2" />
            </div>
            <p className="stat-card-value text-lg font-mono">{collectionCode}</p>
          </div>
          <div className="stat-card">
            <div className="stat-card-title"><span>Amount</span></div>
            <p className="stat-card-value text-xl font-bold text-green-600">{formatCurrency(payment.amount)}</p>
          </div>
          <div className="stat-card">
            <div className="stat-card-title"><span>Payment mode</span></div>
            <p className="stat-card-value">
              <span className="badge badge-secondary capitalize">{payment.paymentMode}</span>
            </p>
          </div>
          <div className="stat-card">
            <div className="stat-card-title"><span>Date</span></div>
            <p className="stat-card-value">{formatDateIST(payment.paymentDate)}</p>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="form-section-title flex items-center">
            <Receipt className="w-5 h-5 mr-2 text-primary-600" />
            Collection summary
          </h2>
          <dl className="divide-y divide-gray-100">
            <DetailRow label="Collection code" value={collectionCode} valueClass="font-mono" />
            <DetailRow label="Payment / Receipt number" value={payment.paymentNumber || '—'} />
            <DetailRow label="Amount" value={formatCurrency(payment.amount)} valueClass="text-green-600 font-semibold" />
            <DetailRow label="Payment mode" value={<span className="badge badge-secondary capitalize">{payment.paymentMode}</span>} />
            <DetailRow label="Payment date" value={formatDateIST(payment.paymentDate)} />
            <DetailRow label="Status" value={<span className={`badge ${payment.status === 'completed' ? 'badge-success' : 'badge-secondary'}`}>{payment.status}</span>} />
            <DetailRow label="Remarks" value={payment.remarks} />
          </dl>
        </div>

        <div className="card">
          <h2 className="form-section-title flex items-center">
            <FileText className="w-5 h-5 mr-2 text-primary-600" />
            Demand & property
          </h2>
          <dl className="divide-y divide-gray-100">
            <DetailRow
              label="Property"
              value={
                payment.property?.propertyNumber ? (
                  <>
                    {payment.property.propertyNumber}
                    {payment.property?.address && <span className="block text-sm text-gray-600 font-normal mt-1">{payment.property.address}</span>}
                  </>
                ) : '—'
              }
            />
            <DetailRow
              label="Owner"
              value={payment.property?.owner ? `${payment.property.owner.firstName} ${payment.property.owner.lastName}` : '—'}
            />
            <DetailRow label="Demand number" value={payment.demand?.demandNumber || '—'} />
            <DetailRow label="Cheque number" value={payment.chequeNumber} />
            <DetailRow label="Bank" value={payment.bankName} />
            <DetailRow label="Transaction ID" value={payment.transactionId ? <span className="font-mono text-sm">{payment.transactionId}</span> : null} />
            <DetailRow
              label="Payment proof"
              value={
                payment.proofUrl ? (
                  <a href={payment.proofUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                    View proof
                  </a>
                ) : null
              }
            />
          </dl>
        </div>
      </div>
    </DetailPageLayout>
  );
};

export default CollectionDetails;
