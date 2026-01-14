import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { citizenAPI } from '../../services/api';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import { CreditCard, Eye, AlertCircle } from 'lucide-react';

const CitizenDemands = () => {
  const [demands, setDemands] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDemands();
  }, []);

  const fetchDemands = async () => {
    try {
      setLoading(true);
      const response = await citizenAPI.getDemands();
      setDemands(response.data.data.demands);
    } catch (error) {
      toast.error('Failed to fetch demands');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'badge-warning',
      partially_paid: 'badge-info',
      paid: 'badge-success',
      overdue: 'badge-danger'
    };
    return badges[status] || 'badge-info';
  };

  if (loading) return <Loading />;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">My Demands</h1>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Demand Number</th>
              <th>Property</th>
              <th>Financial Year</th>
              <th>Total Amount</th>
              <th>Paid Amount</th>
              <th>Balance</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {demands.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-8 text-gray-500">
                  No demands found
                </td>
              </tr>
            ) : (
              demands.map((demand) => {
                const isOverdue = new Date(demand.dueDate) < new Date() && demand.balanceAmount > 0;
                return (
                  <tr key={demand.id} className={isOverdue ? 'bg-red-50' : ''}>
                    <td className="font-medium">{demand.demandNumber}</td>
                    <td>{demand.property?.propertyNumber || 'N/A'}</td>
                    <td>{demand.financialYear}</td>
                    <td>₹{parseFloat(demand.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="text-green-600">
                      ₹{parseFloat(demand.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`font-semibold ${demand.balanceAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₹{parseFloat(demand.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className={isOverdue ? 'text-red-600 font-semibold' : ''}>
                      {new Date(demand.dueDate).toLocaleDateString()}
                      {isOverdue && <span className="ml-1">⚠️</span>}
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadge(demand.status)} capitalize`}>
                        {demand.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/citizen/demands/${demand.id}`}
                          className="text-primary-600 hover:text-primary-700"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {demand.balanceAmount > 0 && (
                          <Link
                            to={`/citizen/payments/online/${demand.id}`}
                            className="text-green-600 hover:text-green-700"
                            title="Pay Online"
                          >
                            <CreditCard className="w-4 h-4" />
                          </Link>
                        )}
                      </div>
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

export default CitizenDemands;
