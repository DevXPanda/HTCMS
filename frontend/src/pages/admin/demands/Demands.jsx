import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { demandAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { Plus, Eye, Search, Filter, X, Zap, Calculator, Download } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useShopTaxBasePath } from '../../../contexts/ShopTaxBasePathContext';
import { exportToCSV } from '../../../utils/exportCSV';

const Demands = () => {
  const [searchParams] = useSearchParams();
  const moduleFromUrl = searchParams.get('module') || '';
  const basePath = useShopTaxBasePath();
  const { isAdmin, isAssessor } = useAuth();
  const [demands, setDemands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    financialYear: '',
    minAmount: '',
    maxAmount: '',
    overdue: ''
  });

  useEffect(() => {
    fetchDemands();
  }, [page, search, filters, moduleFromUrl]);

  const fetchDemands = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        search,
        limit: 10,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      };
      if (moduleFromUrl && ['PROPERTY', 'WATER', 'SHOP', 'D2DC'].includes(moduleFromUrl.toUpperCase())) {
        params.module = moduleFromUrl.toUpperCase();
      }
      const response = await demandAPI.getAll(params);
      const data = response.data?.data ?? {};
      setDemands(Array.isArray(data.demands) ? data.demands : []);
      setPagination(data.pagination ?? null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch tax demands');
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
      status: '',
      financialYear: '',
      minAmount: '',
      maxAmount: '',
      overdue: ''
    });
    setPage(1);
  };

  const handleCalculatePenalty = async (demandId) => {
    if (!window.confirm('Calculate penalty and interest for this overdue tax demand?')) return;
    try {
      await demandAPI.calculatePenalty(demandId, {
        penaltyRate: 5, // 5%
        interestRate: 0.1 // 0.1% per day
      });
      toast.success('Penalty and interest calculated');
      fetchDemands();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to calculate penalty');
    }
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

  const handleExport = async () => {
    try {
      const params = { page: 1, limit: 5000, search, ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== '')) };
      if (moduleFromUrl && ['PROPERTY', 'WATER', 'SHOP', 'D2DC'].includes(moduleFromUrl.toUpperCase())) {
        params.module = moduleFromUrl.toUpperCase();
      }
      const response = await demandAPI.getAll(params);
      const list = response.data.data.demands || [];
      const rows = list.map(d => ({
        demandNumber: d.demandNumber,
        serviceType: d.serviceType,
        propertyNumber: d.property?.propertyNumber,
        shopName: d.shopTaxAssessment?.shop?.shopName,
        financialYear: d.financialYear,
        totalAmount: d.totalAmount,
        balanceAmount: d.balanceAmount,
        status: d.status,
        dueDate: d.dueDate
      }));
      exportToCSV(rows, `demands_${new Date().toISOString().slice(0, 10)}`);
      toast.success('Export downloaded');
    } catch (err) {
      toast.error('Export failed');
    }
  };

  if (loading && !demands.length) return <Loading />;

  const isOverdue = (dueDate, balanceAmount) => {
    if (balanceAmount <= 0) return false;
    const today = new Date();
    const due = new Date(dueDate);
    return today > due;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Tax Demands</h1>
        <div className="flex gap-2">
          {isAdmin && (
            <Link to={`${basePath}/demands/generate`} className="btn btn-primary flex items-center">
              <Zap className="w-4 h-4 mr-2" />
              Generate Tax Demands
            </Link>
          )}
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
      <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchDemands(); }} className="mb-6">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by tax demand number..."
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="label">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="input"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="label">Financial Year</label>
              <input
                type="text"
                value={filters.financialYear}
                onChange={(e) => handleFilterChange('financialYear', e.target.value)}
                className="input"
                placeholder="e.g., 2024-25"
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

            <div>
              <label className="label">Overdue Only</label>
              <select
                value={filters.overdue}
                onChange={(e) => handleFilterChange('overdue', e.target.value)}
                className="input"
              >
                <option value="">All</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Demand Number</th>
              {demands.some(d => d.serviceType === 'SHOP_TAX') ? (
                <>
                  <th>Shop Number</th>
                  <th>Shop Name</th>
                  <th>Assessment Year</th>
                </>
              ) : (
                <th>Property</th>
              )}
              {demands.some(d => d.serviceType === 'SHOP_TAX') && (
                <th className="text-xs text-gray-500">Property (ref)</th>
              )}
              <th>Financial Year</th>
              <th>Base Amount</th>
              <th>Arrears</th>
              <th>Penalty/Interest</th>
              <th>Total Amount</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {demands.length === 0 ? (
              <tr>
                <td colSpan={demands.some(d => d.serviceType === 'SHOP_TAX') ? 14 : 12} className="text-center py-8 text-gray-500">
                  No demands found
                </td>
              </tr>
            ) : (
              demands.map((demand) => {
                const overdue = isOverdue(demand.dueDate, demand.balanceAmount);
                const isShopTax = demand.serviceType === 'SHOP_TAX';
                const isWaterTax = demand.serviceType === 'WATER_TAX';
                const isD2DC = demand.serviceType === 'D2DC';
                const hasShopTaxInList = demands.some(d => d.serviceType === 'SHOP_TAX');
                const refContent = isShopTax
                  ? null
                  : isWaterTax
                    ? (demand.waterTaxAssessment?.waterConnection?.connectionNumber
                        ? `Water - ${demand.waterTaxAssessment.waterConnection.connectionNumber}`
                        : demand.waterTaxAssessment?.assessmentNumber || 'N/A')
                    : isD2DC
                      ? `D2DC - ${demand.financialYear || '—'}`
                      : (demand.property?.propertyNumber ? (
                          <Link to={`/properties/${demand.propertyId}`} className="text-primary-600 hover:underline">
                            {demand.property.propertyNumber}
                          </Link>
                        ) : 'N/A');
                return (
                  <tr key={demand.id} className={overdue ? 'bg-red-50' : ''}>
                    <td className="font-medium">{demand.demandNumber}</td>
                    {hasShopTaxInList ? (
                      <>
                        {isShopTax ? (
                          <>
                            <td className="font-medium">
                              {demand.shopTaxAssessment?.shop?.shopNumber || 'N/A'}
                            </td>
                            <td>
                              {demand.shopTaxAssessment?.shop ? (
                                <Link to={`/shop-tax/shops/${demand.shopTaxAssessment.shop.id}`} className="text-primary-600 hover:underline">
                                  {demand.shopTaxAssessment.shop.shopName}
                                </Link>
                              ) : (
                                'N/A'
                              )}
                            </td>
                            <td>
                              {demand.shopTaxAssessment?.assessmentYear || '—'}
                            </td>
                            <td className="text-xs text-gray-500">
                              {demand.property?.propertyNumber ? (
                                <Link to={`/properties/${demand.propertyId}`} className="text-gray-500 hover:underline">
                                  {demand.property.propertyNumber}
                                </Link>
                              ) : (
                                '—'
                              )}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="text-gray-400">—</td>
                            <td>
                              {typeof refContent === 'string' ? <span className="text-gray-700">{refContent}</span> : refContent}
                            </td>
                            <td className="text-gray-400">—</td>
                            <td className="text-xs text-gray-500">
                              {demand.property?.propertyNumber ? (
                                <Link to={`/properties/${demand.propertyId}`} className="text-gray-500 hover:underline">
                                  {demand.property.propertyNumber}
                                </Link>
                              ) : (
                                '—'
                              )}
                            </td>
                          </>
                        )}
                      </>
                    ) : (
                      <td>
                        {isWaterTax ? (
                          demand.waterTaxAssessment?.waterConnection?.connectionNumber
                            ? `Water - ${demand.waterTaxAssessment.waterConnection.connectionNumber}`
                            : demand.waterTaxAssessment?.assessmentNumber || 'N/A'
                        ) : isD2DC ? (
                          `D2DC - ${demand.financialYear || '—'}`
                        ) : (
                          <Link to={`/properties/${demand.propertyId}`} className="text-primary-600 hover:underline">
                            {demand.property?.propertyNumber || 'N/A'}
                          </Link>
                        )}
                      </td>
                    )}
                    <td>{demand.financialYear}</td>
                    <td>₹{parseFloat(demand.baseAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className={parseFloat(demand.arrearsAmount || 0) > 0 ? 'text-orange-600 font-semibold' : ''}>
                      ₹{parseFloat(demand.arrearsAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      {(parseFloat(demand.penaltyAmount || 0) + parseFloat(demand.interestAmount || 0)) > 0 ? (
                        <span className="text-red-600">
                          ₹{(parseFloat(demand.penaltyAmount || 0) + parseFloat(demand.interestAmount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        '₹0.00'
                      )}
                    </td>
                    <td className="font-semibold">
                      ₹{parseFloat(demand.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-green-600">
                      ₹{parseFloat(demand.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`font-semibold ${demand.balanceAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₹{parseFloat(demand.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className={overdue ? 'text-red-600 font-semibold' : ''}>
                      {new Date(demand.dueDate).toLocaleDateString()}
                      {overdue && <span className="ml-1 text-xs">⚠️</span>}
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadge(demand.status)} capitalize`}>
                        {demand.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center space-x-2">
                        <Link
                          to={`${basePath}/demands/${demand.id}`}
                          className="text-primary-600 hover:text-primary-700"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {overdue && (isAdmin || isAssessor) && (
                          <button
                            onClick={() => handleCalculatePenalty(demand.id)}
                            className="text-orange-600 hover:text-orange-700"
                            title="Calculate Penalty"
                          >
                            <Calculator className="w-4 h-4" />
                          </button>
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

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-6">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="btn btn-secondary"
          >
            Previous
          </button>
          <span className="text-gray-600">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === pagination.pages}
            className="btn btn-secondary"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default Demands;
