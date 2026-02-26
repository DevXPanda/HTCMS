import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { waterBillAPI, propertyAPI, waterConnectionAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { Plus, Search, Filter, X, Eye, Download } from 'lucide-react';
import GenerateBillModal from './GenerateBillModal';
import { exportToCSV } from '../../../utils/exportCSV';

const WaterBills = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [properties, setProperties] = useState([]);
  const [filters, setFilters] = useState({
    propertyId: '',
    status: ''
  });

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    fetchBills();
  }, [search, filters]);

  const fetchProperties = async () => {
    try {
      const response = await propertyAPI.getAll({ limit: 1000, isActive: true });
      setProperties(response.data.data.properties || []);
    } catch (error) {
      console.error('Failed to fetch properties');
    }
  };

  const fetchBills = async () => {
    try {
      setLoading(true);
      const params = {
        limit: 10000
      };

      // Add search if provided
      if (search) {
        params.search = search;
      }

      // Add status filter if provided
      if (filters.status) {
        params.status = filters.status;
      }

      // If property filter is set, fetch connections first, then bills for each
      if (filters.propertyId) {
        try {
          const connectionsResponse = await waterConnectionAPI.getByProperty(filters.propertyId);
          const connections = connectionsResponse.data.data.waterConnections || [];

          if (connections.length === 0) {
            setBills([]);
            return;
          }

          // Fetch bills for all connections in parallel
          const billsPromises = connections.map(conn =>
            waterBillAPI.getByConnection(conn.id).catch(() => ({ data: { data: { waterBills: [] } } }))
          );
          const billsResponses = await Promise.all(billsPromises);

          // Combine all bills
          let allBills = [];
          billsResponses.forEach(response => {
            allBills.push(...(response.data.data.waterBills || []));
          });

          // Apply status filter if set
          if (filters.status) {
            allBills = allBills.filter(bill => bill.status === filters.status);
          }

          // Apply search filter if set
          if (search) {
            const searchLower = search.toLowerCase();
            allBills = allBills.filter(bill =>
              bill.billNumber?.toLowerCase().includes(searchLower) ||
              bill.billingPeriod?.toLowerCase().includes(searchLower)
            );
          }

          // Sort by billing period descending, then by created date
          allBills.sort((a, b) => {
            if (b.billingPeriod !== a.billingPeriod) {
              return b.billingPeriod.localeCompare(a.billingPeriod);
            }
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
          });

          setBills(allBills);
        } catch (error) {
          toast.error('Failed to fetch bills for selected property');
          setBills([]);
        }
      } else {
        // No property filter - use standard API call
        const response = await waterBillAPI.getAll(params);
        setBills(response.data.data.waterBills || []);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch water bills');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      propertyId: '',
      status: ''
    });
  };

  const handleGenerateSuccess = () => {
    setShowGenerateModal(false);
    fetchBills();
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'badge-warning',
      partially_paid: 'badge-info',
      paid: 'badge-success',
      overdue: 'badge-danger',
      cancelled: 'badge-danger'
    };
    return badges[status] || 'badge-info';
  };

  const formatBillingPeriod = (period) => {
    if (!period) return 'N/A';
    const [year, month] = period.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  const handleExport = async () => {
    try {
      const params = { page: 1, limit: 5000 };
      if (filters.status) params.status = filters.status;
      const response = await waterBillAPI.getAll(params);
      const list = response.data.data.waterBills || [];
      const rows = list.map(b => ({
        billNumber: b.billNumber,
        connectionNumber: b.waterConnection?.connectionNumber,
        billingPeriod: b.billingPeriod,
        totalAmount: b.totalAmount,
        balanceAmount: b.balanceAmount,
        status: b.status
      }));
      exportToCSV(rows, `water_bills_${new Date().toISOString().slice(0, 10)}`);
      toast.success('Export downloaded');
    } catch (err) {
      toast.error('Export failed');
    }
  };

  if (loading && !bills.length) return <Loading />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="ds-page-title">Water Bills</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowGenerateModal(true)}
            className="btn btn-primary flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Generate Bill
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary flex items-center"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>
          <button type="button" onClick={handleExport} className="btn btn-secondary flex items-center">
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={(e) => { e.preventDefault(); fetchBills(); }} className="mb-6">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by bill number or billing period..."
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Property</label>
              <select
                value={filters.propertyId}
                onChange={(e) => handleFilterChange('propertyId', e.target.value)}
                className="input"
              >
                <option value="">All Properties</option>
                {properties.map(property => (
                  <option key={property.id} value={property.id}>
                    {property.propertyNumber} - {property.address}
                  </option>
                ))}
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
                <option value="pending">Unpaid</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Bill Number</th>
              <th>Property</th>
              <th>Connection</th>
              <th>Bill Period</th>
              <th>Total Amount</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bills.length === 0 ? (
              <tr>
                <td colSpan="10" className="text-center py-8 text-gray-500">
                  No water bills found
                </td>
              </tr>
            ) : (
              bills.map((bill) => (
                <tr key={bill.id}>
                  <td className="font-medium">{bill.billNumber}</td>
                  <td>
                    {bill.waterConnection?.property ? (
                      <Link
                        to={`/properties/${bill.waterConnection.property.id}`}
                        className="text-primary-600 hover:underline"
                      >
                        {bill.waterConnection.property.propertyNumber}
                      </Link>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td>
                    {bill.waterConnection ? (
                      <Link
                        to={`/water/connections?propertyId=${bill.waterConnection.property?.id}`}
                        className="text-primary-600 hover:underline"
                      >
                        {bill.waterConnection.connectionNumber}
                      </Link>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td>{formatBillingPeriod(bill.billingPeriod)}</td>
                  <td className="font-semibold">
                    ₹{parseFloat(bill.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="text-green-600">
                    ₹{parseFloat(bill.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className={`font-semibold ${parseFloat(bill.balanceAmount || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₹{parseFloat(bill.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td>
                    {bill.dueDate ? new Date(bill.dueDate).toLocaleDateString('en-IN') : 'N/A'}
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadge(bill.status)}`}>
                      {bill.status?.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <Link
                      to={`/water/bills/${bill.id}`}
                      className="text-primary-600 hover:text-primary-700 flex items-center"
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

      {/* Pagination removed */}

      {/* Generate Bill Modal */}
      {showGenerateModal && (
        <GenerateBillModal
          onClose={() => setShowGenerateModal(false)}
          onSuccess={handleGenerateSuccess}
        />
      )}
    </div>
  );
};

export default WaterBills;
