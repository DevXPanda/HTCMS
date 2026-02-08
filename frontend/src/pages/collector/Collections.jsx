import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { paymentAPI, wardAPI } from '../../services/api';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import { Eye, Search, Receipt, Download, Filter, X } from 'lucide-react';
import { useStaffAuth } from '../../contexts/StaffAuthContext';

const Collections = () => {
  const { user } = useStaffAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    paymentMode: '',
    startDate: '',
    endDate: ''
  });
  const [wards, setWards] = useState([]);
  const [selectedWardId, setSelectedWardId] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchWards();
    }
  }, [user]);

  useEffect(() => {
    if (user?.id) {
      fetchPayments();
    }
  }, [page, search, filters, selectedWardId, user]);

  const fetchWards = async () => {
    try {
      const response = await wardAPI.getByCollector(user.id);
      setWards(response.data.data.wards || []);
    } catch (error) {
      console.error('Failed to fetch wards');
    }
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        search,
        limit: 10,
        collectorId: user.id,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      };
      
      if (selectedWardId) {
        params.wardId = selectedWardId;
      }
      
      const response = await paymentAPI.getAll(params);
      setPayments(response.data.data.payments || []);
      setPagination(response.data.data.pagination);
    } catch (error) {
      toast.error('Failed to fetch collections');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({
      paymentMode: '',
      startDate: '',
      endDate: ''
    });
    setSelectedWardId('');
    setPage(1);
  };

  if (loading && !payments.length) return <Loading />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Collections</h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="btn btn-secondary flex items-center"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </button>
      </div>

      {/* Search */}
      <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchPayments(); }} className="mb-6">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by receipt number..."
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
              onClick={() => setShowFilters(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="label">Ward</label>
              <select
                value={selectedWardId}
                onChange={(e) => {
                  setSelectedWardId(e.target.value);
                  setPage(1);
                }}
                className="input"
              >
                <option value="">All Wards</option>
                {wards.map((ward) => (
                  <option key={ward.id} value={ward.id}>
                    {ward.wardName}
                  </option>
                ))}
              </select>
            </div>
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
                <option value="online">Online</option>
                <option value="bank_transfer">Bank Transfer</option>
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
          <div className="mt-4 flex gap-2">
            <button onClick={clearFilters} className="btn btn-secondary">
              Clear Filters
            </button>
            <button onClick={() => setShowFilters(false)} className="btn btn-primary">
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Payments List */}
      {payments.length === 0 ? (
        <div className="card text-center py-12">
          <Receipt className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 text-lg">No collections found</p>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Receipt Number</th>
                    <th>Property</th>
                    <th>Demand Number</th>
                    <th>Amount</th>
                    <th>Payment Mode</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="font-medium">{payment.receiptNumber}</td>
                      <td>
                        {payment.property?.propertyNumber || 'N/A'}
                      </td>
                      <td>
                        {payment.demand?.demandNumber || 'N/A'}
                      </td>
                      <td className="font-semibold text-green-600">
                        ₹{parseFloat(payment.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td>
                        <span className="badge badge-secondary capitalize">
                          {payment.paymentMode}
                        </span>
                      </td>
                      <td>{new Date(payment.paymentDate).toLocaleDateString()}</td>
                      <td>
                        <Link
                          to={`/collector/collections/${payment.id}`}
                          className="btn btn-sm btn-primary flex items-center"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn btn-secondary"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="btn btn-secondary"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Collections;
