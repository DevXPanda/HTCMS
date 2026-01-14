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
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Payment History</h1>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
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
                <td colSpan="7" className="text-center py-8 text-gray-500">
                  No payments found
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id}>
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CitizenPayments;
