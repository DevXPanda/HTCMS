import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { paymentAPI } from '../../services/api';
import Loading from '../../components/Loading';
import DetailPageLayout, { DetailRow } from '../../components/DetailPageLayout';
import { Receipt, CreditCard, TrendingUp, Wallet } from 'lucide-react';
import { formatDateIST } from '../../utils/dateUtils';
import { PaymentReceiptView } from '../../components/ReceiptView';
import toast from 'react-hot-toast';

const formatAmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const SBMPaymentDetails = () => {
  const { id } = useParams();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayment = async () => {
      try {
        const res = await paymentAPI.getById(id);
        const data = res.data?.data ?? res.data;
        setPayment(data?.payment ?? data ?? null);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load payment');
        setPayment(null);
      } finally {
        setLoading(false);
      }
    };
    fetchPayment();
  }, [id]);

  if (loading) return <Loading />;
  if (!payment) return <div className="text-gray-600">Payment not found.</div>;

  const statusBadge = () => {
    const s = (payment.status || '').toLowerCase();
    if (s === 'completed') return 'badge-success';
    if (s === 'pending') return 'badge-warning';
    if (s === 'failed') return 'badge-danger';
    return 'badge-info';
  };

  return (
    <DetailPageLayout
      title="Payment Details (Read-only)"
      subtitle={payment.receiptNumber || payment.paymentNumber}
      actionButtons={null}
      summarySection={
        <>
          <h2 className="form-section-title flex items-center no-print">
            <TrendingUp className="w-5 h-5 mr-2 text-primary-600" />
            Summary
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
            <div className="stat-card">
              <div className="stat-card-title"><span>Receipt</span><Receipt className="w-5 h-5 text-gray-400" /></div>
              <p className="stat-card-value text-lg">{payment.receiptNumber || payment.paymentNumber}</p>
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
              <p className="stat-card-value text-lg">{formatDateIST(payment.paymentDate || payment.paidAt)}</p>
            </div>
          </div>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card no-print">
          <h2 className="form-section-title flex items-center">
            <CreditCard className="w-5 h-5 mr-2 text-primary-600" />
            Payment Information
          </h2>
          <dl>
            <DetailRow label="Receipt Number" value={payment.receiptNumber || payment.paymentNumber} valueClass="font-semibold" />
            <DetailRow label="Payment Number" value={payment.paymentNumber} />
            <DetailRow label="Amount" value={formatAmt(payment.amount)} valueClass="text-green-600 font-bold" />
            <DetailRow label="Payment Mode" value={payment.paymentMode || payment.mode} valueClass="capitalize" />
            <DetailRow label="Payment Date" value={formatDateIST(payment.paymentDate || payment.paidAt)} />
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
          </dl>
        </div>

        <div className="card no-print">
          <h2 className="form-section-title flex items-center">
            <Receipt className="w-5 h-5 mr-2 text-primary-600" />
            Property & Demand
          </h2>
          <dl>
            <DetailRow
              label="Property Number"
              value={payment.property?.id
                ? <Link to={`/sbm/properties/${payment.property.id}`} className="text-primary-600 hover:underline">{payment.property.propertyNumber || payment.property.property_number}</Link>
                : (payment.property?.propertyNumber || payment.property?.property_number || '—')}
            />
            <DetailRow label="Address" value={payment.property?.address} />
            <DetailRow label="Ward" value={payment.property?.ward?.wardName} />
            {payment.property?.owner && (
              <DetailRow label="Owner" value={`${payment.property.owner.firstName || ''} ${payment.property.owner.lastName || ''}`.trim()} />
            )}
            <DetailRow
              label="Demand Number"
              value={(payment.demandId || payment.demand_id) && payment.demand
                ? <Link to={`/sbm/demands/${payment.demandId || payment.demand_id}`} className="text-primary-600 hover:underline">{payment.demand.demandNumber || payment.demand.demand_number}</Link>
                : (payment.demand?.demandNumber || payment.demand?.demand_number || '—')}
            />
            <DetailRow label="Financial Year" value={payment.demand?.financialYear || payment.demand?.financial_year} />
            <DetailRow label="Total Demand" value={formatAmt(payment.demand?.totalAmount || payment.demand?.total_amount)} />
            <DetailRow label="Paid Amount" value={formatAmt(payment.demand?.paidAmount ?? payment.demand?.paid_amount)} valueClass="text-green-600" />
            <DetailRow
              label="Balance"
              value={formatAmt(payment.demand?.balanceAmount ?? payment.demand?.balance_amount)}
              valueClass={parseFloat(payment.demand?.balanceAmount ?? payment.demand?.balance_amount ?? 0) > 0 ? 'text-red-600' : 'text-green-600'}
            />
          </dl>
        </div>

        <div className="lg:col-span-2">
          <h2 className="form-section-title no-print">Receipt Preview</h2>
          <PaymentReceiptView payment={payment} formatAmt={formatAmt} />
          {payment.remarks && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Remarks</p>
              <p className="text-sm">{payment.remarks}</p>
            </div>
          )}
        </div>
      </div>

      {/* <p className="mt-4 text-sm text-gray-500">
        <Link to="/sbm/payments" className="text-primary-600 hover:underline">Back to Payments list</Link>
      </p> */}
    </DetailPageLayout>
  );
};

export default SBMPaymentDetails;
