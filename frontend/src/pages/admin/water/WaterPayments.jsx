import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { waterPaymentAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { Plus, Eye, Search, Filter, X } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { isRecentWithinMinutes, sortByCreatedDesc } from '../../../utils/dateUtils';

const WaterPayments = () => {
  const { isAdmin, isCashier } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    paymentMode: '',
    status: '',
    startDate: '',
    endDate: ''
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
      const response = await waterPaymentAPI.getAll(params);
      const list = response.data?.data?.waterPayments || [];
      setPayments([...list].sort(sortByCreatedDesc));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch water payments');
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
      endDate: ''
    });
  };

  if (loading && !payments.length) return <Loading />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="ds-page-title">Water Payments</h1>
        <div className="flex gap-2">
          {(isAdmin || isCashier) && (
            <Link to="/payments/new" className="btn btn-primary flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              Record Water Payment
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

      <form onSubmit={(e) => { e.preventDefault(); fetchPayments(); }} className="mb-6">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by receipt number, payment number or transaction ID..."
              className="input pl-10"
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </div>
      </form>

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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <option value="upi">UPI</option>
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
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Receipt Number</th>
              <th>Connection / Property</th>
              <th>Bill</th>
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
                  No water payments found
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      {payment.receiptNumber || payment.paymentNumber || '—'}
                      {isRecentWithinMinutes(payment.createdAt, 10) && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Recent</span>
                      )}
                    </span>
                  </td>
                  <td>
                    {payment.waterConnection?.property ? (
                      <Link to={`/properties/${payment.waterConnection.property.id}`} className="text-primary-600 hover:underline">
                        {payment.waterConnection.connectionNumber}
                      </Link>
                    ) : (
                      payment.waterConnection?.connectionNumber || 'N/A'
                    )}
                    {payment.waterConnection?.property?.propertyNumber && (
                      <span className="text-gray-500 text-sm block">{payment.waterConnection.property.propertyNumber}</span>
                    )}
                  </td>
                  <td>
                    {payment.waterBillId ? (
                      <Link to={`/water/bills/${payment.waterBillId}`} className="text-primary-600 hover:underline">
                        {payment.waterBill?.billNumber || `Bill #${payment.waterBillId}`}
                      </Link>
                    ) : (
                      '—'
                    )}
                    {payment.waterBill?.billingPeriod && (
                      <span className="text-gray-500 text-sm block">{payment.waterBill.billingPeriod}</span>
                    )}
                  </td>
                  <td className="font-semibold text-green-600">
                    ₹{parseFloat(payment.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="capitalize">{payment.paymentMode}</td>
                  <td>{payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : '—'}</td>
                  <td>
                    {payment.cashier
                      ? `${payment.cashier.firstName || ''} ${payment.cashier.lastName || ''}`.trim()
                      : 'N/A'}
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
                    <Link
                      to={`/water/payments/${payment.id}`}
                      className="text-primary-600 hover:text-primary-700 inline-flex items-center"
                      title="View details"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
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

export default WaterPayments;
