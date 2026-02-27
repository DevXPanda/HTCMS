import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { waterPaymentAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { Receipt, CreditCard, Droplets, Printer } from 'lucide-react';
import DetailPageLayout, { DetailRow } from '../../../components/DetailPageLayout';

const formatAmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const WaterPaymentDetails = () => {
  const { id } = useParams();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);

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
        <button type="button" onClick={() => window.print()} className="btn btn-secondary flex items-center">
          <Printer className="w-4 h-4 mr-2" />
          Print
        </button>
      }
      summarySection={
        <>
          <h2 className="form-section-title flex items-center">
            <Receipt className="w-5 h-5 mr-2 text-primary-600" />
            Summary
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <div className="card">
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

        <div className="card">
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

        <div className="card lg:col-span-2 print:shadow-none print:border-2 print:border-gray-800">
          <h2 className="form-section-title">Receipt View</h2>
          <div className="text-center border-b-2 border-gray-300 pb-4 mb-4">
            <h3 className="text-xl font-bold">WATER PAYMENT RECEIPT</h3>
            <p className="text-sm text-gray-600">ULB System - Water Tax</p>
          </div>
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Receipt Number</p>
              <p className="font-bold text-lg">{payment.receiptNumber || payment.paymentNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-1">Date</p>
              <p className="font-bold">
                {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
              </p>
            </div>
          </div>
          <div className="border-t border-b border-gray-300 py-4 mb-4">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Connection / Property</p>
                <p className="font-semibold">{payment.waterConnection?.connectionNumber} {property?.propertyNumber ? ` · ${property.propertyNumber}` : ''}</p>
                <p className="text-sm mt-1">{property?.address}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Bill</p>
                <p className="font-semibold">{waterBill?.billNumber || '—'}</p>
                {waterBill?.billingPeriod && <p className="text-sm mt-1">{waterBill.billingPeriod}</p>}
              </div>
            </div>
          </div>
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-1">Payment Details</p>
            <div className="bg-gray-50 p-4 rounded">
              <div className="flex justify-between mb-2">
                <span>Amount Paid:</span>
                <span className="font-bold text-lg text-green-600">{formatAmt(payment.amount)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Payment Mode: <span className="capitalize font-medium">{payment.paymentMode}</span></span>
                {payment.chequeNumber && <span>Cheque/DD: {payment.chequeNumber}</span>}
                {payment.transactionId && <span>Transaction ID: {payment.transactionId}</span>}
              </div>
            </div>
          </div>
          {payment.remarks && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">Remarks</p>
              <p className="text-sm">{payment.remarks}</p>
            </div>
          )}
          <div className="border-t border-gray-300 pt-4 text-center text-sm text-gray-600">
            <p>This is a computer-generated receipt. No signature required.</p>
            {payment.cashier && (
              <p className="mt-2">Received by: {payment.cashier.firstName || ''} {payment.cashier.lastName || ''}</p>
            )}
          </div>
        </div>
      </div>
    </DetailPageLayout>
  );
};

export default WaterPaymentDetails;
