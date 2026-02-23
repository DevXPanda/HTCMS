import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { paymentAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { Plus, Eye, Search, Filter, X, Download, Receipt } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

const Payments = () => {
  const { isAdmin, isCashier } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    paymentMode: '',
    status: '',
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: ''
  });

  useEffect(() => {
    fetchPayments();
  }, [search, filters]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = {
        search,
        limit: 10000,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      };
      const response = await paymentAPI.getAll(params);
      setPayments(response.data.data.payments);
    } catch (error) {
      toast.error('Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      paymentMode: '',
      status: '',
      startDate: '',
      endDate: '',
      minAmount: '',
      maxAmount: ''
    });
  };

  if (loading && !payments.length) return <Loading />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
        <div className="flex gap-2">
          {(isAdmin || isCashier) && (
            <Link to="/payments/new" className="btn btn-primary flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              Record Payment
            </Link>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary flex items-center"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={(e) => { e.preventDefault(); fetchPayments(); }} className="mb-6">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by receipt number or payment number..."
              className="input pl-10"
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </div>
      </form>

      {/* Filters */}
      {showFilters && (
        <div className="card mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Filters</h3>
            <button
              onClick={clearFilters}
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
            >
              <X className="w-4 h-4 mr-1" />
              Clear All
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="label">Payment Mode</label>
              <select
                value={filters.paymentMode}
                onChange={(e) => handleFilterChange('paymentMode', e.target.value)}
                className="input"
              >
                <option value="">All Modes</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="dd">DD</option>
                <option value="card">Card</option>
                <option value="online">Online</option>
              </select>
            </div>

            <div>
              <label className="label">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="input"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="label">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="label">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="label">Min Amount (₹)</label>
              <input
                type="number"
                value={filters.minAmount}
                onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                className="input"
                placeholder="0"
              />
            </div>

            <div>
              <label className="label">Max Amount (₹)</label>
              <input
                type="number"
                value={filters.maxAmount}
                onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
                className="input"
                placeholder="0"
              />
            </div>
          </div>
        </div>
      )}

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
              <th>Received By</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-8 text-gray-500">
                  No payments found
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="font-medium">{payment.receiptNumber}</td>
                  <td>
                    <Link to={`/properties/${payment.propertyId}`} className="text-primary-600 hover:underline">
                      {payment.property?.propertyNumber || 'N/A'}
                    </Link>
                  </td>
                  <td>
                    <Link to={`/demands/${payment.demandId}`} className="text-primary-600 hover:underline">
                      {payment.demand?.demandNumber || 'N/A'}
                    </Link>
                  </td>
                  <td className="font-semibold text-green-600">
                    ₹{parseFloat(payment.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="capitalize">{payment.paymentMode}</td>
                  <td>{new Date(payment.paymentDate).toLocaleDateString()}</td>
                  <td>
                    {payment.cashier ?
                      `${payment.cashier.firstName} ${payment.cashier.lastName}` :
                      'N/A'}
                  </td>
                  <td>
                    <span className={`badge ${payment.status === 'completed' ? 'badge-success' :
                        payment.status === 'pending' ? 'badge-warning' :
                          payment.status === 'failed' ? 'badge-danger' :
                            'badge-info'
                      } capitalize`}>
                      {payment.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/payments/${payment.id}`}
                        className="text-primary-600 hover:text-primary-700"
                        title="View Receipt"
                      >
                        <Receipt className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination removed */}
    </div>
  );
};

export default Payments;
