import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { waterPaymentAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { Receipt, CreditCard, Droplets, Printer } from 'lucide-react';
import DetailPageLayout, { DetailRow } from '../../../components/DetailPageLayout';
import ReceiptModal from '../../../components/ReceiptModal';
import { useAuth } from '../../../contexts/AuthContext';

const formatAmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const WaterPaymentDetails = () => {
  const { id } = useParams();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const { user, isAdmin, isCollector, isCitizen } = useAuth();
  const canPreview = isAdmin || user?.role === 'superadmin' || isCollector || isCitizen;

  useEffect(() => {
    fetchPayment();
  }, [id]);

  const fetchPayment = async () => {
    try {
      const response = await waterPaymentAPI.getById(id);
      setPayment(response.data.data.waterPayment);
    } catch (error) {
      toast.error('Failed to fetch water payment details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;
  if (!payment) return <div className="p-6">Water payment not found</div>;

  const statusBadge = () => {
    const s = (payment.status || '').toLowerCase();
    if (s === 'completed') return 'badge-success';
    if (s === 'pending') return 'badge-warning';
    if (s === 'failed') return 'badge-danger';
    return 'badge-info';
  };

  const property = payment.waterConnection?.property;
  const waterBill = payment.waterBill;

  return (
    <DetailPageLayout
      backTo="/water/payments"
      backLabel="Back to Water Payments"
      title="Water Payment Receipt"
      subtitle={payment.receiptNumber || payment.paymentNumber}
      actionButtons={
        <>
          <button type="button" onClick={() => window.print()} className="btn btn-secondary flex items-center">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </button>
          {canPreview && (
            <button
              type="button"
              onClick={() => setIsPreviewModalOpen(true)}
              className="btn btn-secondary flex items-center"
            >
              <Receipt className="w-4 h-4 mr-2" />
              Preview
            </button>
          )}
        </>
      }
      summarySection={
        <>
          <h2 className="form-section-title flex items-center no-print">
            <Receipt className="w-5 h-5 mr-2 text-primary-600" />
            Summary
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
            <div className="stat-card">
              <div className="stat-card-title"><span>Receipt</span><Receipt className="w-5 h-5 text-gray-400" /></div>
              <p className="stat-card-value text-lg">{payment.receiptNumber || payment.paymentNumber}</p>
            </div>
            <div className="stat-card">
              <div className="stat-card-title"><span>Amount</span></div>
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
              <p className="stat-card-value text-lg">
                {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('en-IN') : '—'}
              </p>
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
            <DetailRow label="Receipt Number" value={payment.receiptNumber || payment.paymentNumber} valueClass="font-semibold" />
            <DetailRow label="Payment Number" value={payment.paymentNumber} />
            <DetailRow label="Amount" value={formatAmt(payment.amount)} valueClass="text-green-600 font-bold" />
            <DetailRow label="Payment Mode" value={payment.paymentMode} valueClass="capitalize" />
            <DetailRow
              label="Payment Date"
              value={payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : '—'}
            />
            <DetailRow
              label="Status"
              value={<span className={`badge capitalize ${statusBadge()}`}>{payment.status}</span>}
            />
            {payment.cashier && (
              <DetailRow
                label="Received By"
                value={`${payment.cashier.firstName || ''} ${payment.cashier.lastName || ''}`.trim()}
              />
            )}
            {(payment.chequeNumber || payment.transactionId) && (
              <DetailRow
                label={payment.paymentMode === 'cheque' || payment.paymentMode === 'dd' ? (payment.paymentMode === 'cheque' ? 'Cheque' : 'DD') + ' Number' : 'Transaction ID'}
                value={payment.chequeNumber || payment.transactionId}
              />
            )}
            {payment.chequeDate && <DetailRow label="Cheque/DD Date" value={new Date(payment.chequeDate).toLocaleDateString()} />}
            {payment.bankName && <DetailRow label="Bank Name" value={payment.bankName} />}
          </dl>
        </div>

        <div className="no-print card">
          <h2 className="form-section-title flex items-center">
            <Droplets className="w-5 h-5 mr-2 text-primary-600" />
            Connection & Bill
          </h2>
          <dl>
            <DetailRow
              label="Water Connection"
              value={payment.waterConnection ? (
                <Link to={`/water/connections/${payment.waterConnectionId}`} className="text-primary-600 hover:underline">
                  {payment.waterConnection.connectionNumber}
                </Link>
              ) : payment.waterConnection?.connectionNumber}
            />
            {payment.waterConnection?.meterNumber && (
              <DetailRow label="Meter Number" value={payment.waterConnection.meterNumber} />
            )}
            <DetailRow
              label="Property"
              value={property ? (
                <Link to={`/properties/${property.id}`} className="text-primary-600 hover:underline">
                  {property.propertyNumber}
                </Link>
              ) : property?.propertyNumber}
            />
            <DetailRow label="Address" value={property?.address} />
            {waterBill && (
              <>
                <DetailRow
                  label="Water Bill"
                  value={<Link to={`/water/bills/${payment.waterBillId}`} className="text-primary-600 hover:underline">{waterBill.billNumber}</Link>}
                />
                <DetailRow label="Billing Period" value={waterBill.billingPeriod} />
                <DetailRow label="Bill Amount" value={formatAmt(waterBill.totalAmount)} />
              </>
            )}
          </dl>
        </div>

      </div>
      <ReceiptModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        data={payment}
        type="PAYMENT"
      />
    </DetailPageLayout>
  );
};

export default WaterPaymentDetails;
