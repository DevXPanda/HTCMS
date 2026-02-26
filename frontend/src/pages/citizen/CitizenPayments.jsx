import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { citizenAPI } from '../../services/api';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import { Receipt, Download, Eye } from 'lucide-react';

const CitizenPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await citizenAPI.getPayments();
      setPayments(response.data.data.payments);
    } catch (error) {
      toast.error('Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <h1 className="ds-page-title mb-6">Payment History</h1>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Service Type</th>
              <th>Receipt Number</th>
              <th>Property</th>
              <th>Demand</th>
              <th>Amount</th>
              <th>Payment Mode</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-8 text-gray-500">
                  No payments found
                </td>
              </tr>
            ) : (
              payments.map((payment) => {
                const isD2DC = payment.demand?.serviceType === 'D2DC';
                return (
                  <tr key={payment.id}>
                    <td>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${
                        isD2DC 
                          ? 'bg-green-100 text-green-800 border border-green-300'
                          : 'bg-blue-100 text-blue-800 border border-blue-300'
                      }`}>
                        {isD2DC ? 'D2DC' : 'House Tax'}
                      </span>
                    </td>
                    <td className="font-medium">{payment.receiptNumber}</td>
                    <td>{payment.property?.propertyNumber || 'N/A'}</td>
                    <td>{payment.demand?.demandNumber || 'N/A'}</td>
                  <td className="font-semibold text-green-600">
                    ₹{parseFloat(payment.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="capitalize">{payment.paymentMode}</td>
                  <td>{new Date(payment.paymentDate).toLocaleDateString()}</td>
                  <td>
                    <Link
                      to={`/citizen/payments/${payment.id}`}
                      className="text-primary-600 hover:text-primary-700 flex items-center"
                      title="View Receipt"
                    >
                      <Receipt className="w-4 h-4 mr-1" />
                      Receipt
                    </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CitizenPayments;
