import { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { paymentAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { ArrowLeft, Download, Printer, Loader2 } from 'lucide-react';

const PaymentDetails = () => {
  const { id } = useParams();
  const location = useLocation();
  // Detect if accessed from citizen routes
  const isCitizenRoute = location.pathname.startsWith('/citizen');
  const basePath = isCitizenRoute ? '/citizen' : '';
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
      const blob = res.data;
      const name = `receipt_${payment?.receiptNumber || payment?.paymentNumber || id}.pdf`;
      const url = URL.createObjectURL(blob);
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

  return (
    <div>
      <Link to={`${basePath}/payments`} className="flex items-center text-primary-600 mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Payments
      </Link>

      <div className="flex justify-between items-center mb-6">
        <h1 className="ds-page-title">Payment Receipt</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={downloadPaymentReceipt}
            disabled={pdfLoading}
            className="btn btn-secondary flex items-center"
          >
            {pdfLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Download Payment Receipt
          </button>
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
        <div className="card">
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
                <span className={`badge ${
                  payment.status === 'completed' ? 'badge-success' :
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

        <div className="card">
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
                <Link to={`${basePath}/demands/${payment.demandId}`} className="text-primary-600 hover:underline">
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

        {/* Receipt View */}
        <div className="card lg:col-span-2 print:shadow-none print:border-2 print:border-gray-800">
          <div className="text-center border-b-2 border-gray-300 pb-4 mb-4">
            <h2 className="text-2xl font-bold">PAYMENT RECEIPT</h2>
            <p className="text-sm text-gray-600">House Tax Collection & Management System</p>
          </div>
          
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Receipt Number</p>
              <p className="font-bold text-lg">{payment.receiptNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-1">Date</p>
              <p className="font-bold">{new Date(payment.paymentDate).toLocaleDateString('en-IN', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
            </div>
          </div>

          <div className="border-t border-b border-gray-300 py-4 mb-4">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Property Number</p>
                <p className="font-semibold">{payment.property?.propertyNumber}</p>
                <p className="text-sm mt-1">{payment.property?.address}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Owner</p>
                <p className="font-semibold">
                  {payment.property?.owner?.firstName} {payment.property?.owner?.lastName}
                </p>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-1">Payment Details</p>
            <div className="bg-gray-50 p-4 rounded">
              <div className="flex justify-between mb-2">
                <span>Amount Paid:</span>
                <span className="font-bold text-lg text-green-600">
                  ₹{parseFloat(payment.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
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
              <p className="mt-2">Received by: {payment.cashier.firstName} {payment.cashier.lastName}</p>
            )}
          </div>
        </div>

        {payment.remarks && (
          <div className="card lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Remarks</h2>
            <p className="text-gray-600 whitespace-pre-wrap">{payment.remarks}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentDetails;
