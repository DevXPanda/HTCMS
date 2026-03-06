import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { paymentAPI } from '../../services/api';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import { Download, Printer } from 'lucide-react';
import { PaymentReceiptView } from '../../components/ReceiptView';

const formatAmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PaymentDetails = () => {
  const { id } = useParams();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <Loading />;
  if (!payment) return <div>Payment not found</div>;

  return (
    <div>
      <div className="no-print flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Payment Receipt</h1>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="btn btn-secondary flex items-center"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="no-print card">
          <h2 className="text-xl font-semibold mb-4">Payment Information</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Receipt Number</dt>
              <dd className="text-lg font-semibold">{payment.receiptNumber}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Payment Number</dt>
              <dd>{payment.paymentNumber}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Amount</dt>
              <dd className="text-2xl font-bold text-green-600">
                ₹{parseFloat(payment.amount).toLocaleString('en-IN')}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Payment Mode</dt>
              <dd className="capitalize">{payment.paymentMode}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Payment Date</dt>
              <dd>{new Date(payment.paymentDate).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd>
                <span className={`badge ${payment.status === 'completed' ? 'badge-success' :
                  payment.status === 'pending' ? 'badge-warning' :
                    payment.status === 'failed' ? 'badge-danger' :
                      'badge-info'
                  } capitalize`}>
                  {payment.status}
                </span>
              </dd>
            </div>
            {payment.cashier && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Received By</dt>
                <dd>
                  {payment.cashier.firstName} {payment.cashier.lastName}
                </dd>
              </div>
            )}
            {(payment.chequeNumber || payment.transactionId) && (
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  {payment.paymentMode === 'cheque' || payment.paymentMode === 'dd' ?
                    (payment.paymentMode === 'cheque' ? 'Cheque' : 'DD') + ' Number' :
                    'Transaction ID'}
                </dt>
                <dd>{payment.chequeNumber || payment.transactionId}</dd>
              </div>
            )}
            {payment.chequeDate && (
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  {payment.paymentMode === 'cheque' ? 'Cheque' : 'DD'} Date
                </dt>
                <dd>{new Date(payment.chequeDate).toLocaleDateString()}</dd>
              </div>
            )}
            {payment.bankName && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Bank Name</dt>
                <dd>{payment.bankName}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="no-print card">
          <h2 className="text-xl font-semibold mb-4">Property & Demand</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Property Number</dt>
              <dd>
                <Link to={`/properties/${payment.propertyId}`} className="text-primary-600 hover:underline">
                  {payment.property?.propertyNumber}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Address</dt>
              <dd>{payment.property?.address}</dd>
            </div>
            {payment.property?.ward && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Ward</dt>
                <dd>{payment.property.ward.wardName}</dd>
              </div>
            )}
            {payment.property?.owner && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Owner</dt>
                <dd>
                  {payment.property.owner.firstName} {payment.property.owner.lastName}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">Demand Number</dt>
              <dd>
                <Link to={`/citizen/demands/${payment.demandId}`} className="text-primary-600 hover:underline">
                  {payment.demand?.demandNumber}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Financial Year</dt>
              <dd>{payment.demand?.financialYear}</dd>
            </div>
            {payment.demand && (
              <>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Total Demand</dt>
                  <dd>₹{parseFloat(payment.demand.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Paid Amount</dt>
                  <dd className="text-green-600">
                    ₹{parseFloat(payment.demand.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Balance Amount</dt>
                  <dd className={payment.demand.balanceAmount > 0 ? 'text-red-600' : 'text-green-600'}>
                    ₹{parseFloat(payment.demand.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </dd>
                </div>
              </>
            )}
          </dl>
        </div>

        {/* Receipt View - only this prints */}
        <div className="card receipt-print-area lg:col-span-2 print:shadow-none print:border-2 print:border-gray-800">
          <PaymentReceiptView payment={payment} formatAmt={formatAmt} />
          {payment.remarks && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Remarks</p>
              <p className="text-sm">{payment.remarks}</p>
            </div>
          )}
        </div>

        {payment.remarks && (
          <div className="no-print card lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Remarks</h2>
            <p className="text-gray-600 whitespace-pre-wrap">{payment.remarks}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentDetails;
