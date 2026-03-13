import { useState, useEffect } from 'react';
import { auditLogAPI } from '../../services/api';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import { Search, Filter, X, Calendar, History } from 'lucide-react';
import { formatDateTimeIST } from '../../utils/dateUtils';

const ActivityHistory = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    actionType: '',
    entityType: '',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    fetchAuditLogs();
  }, [search, filters]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const params = {
        page: 1,
        search,
        limit: 100,
        sortBy: 'timestamp',
        sortOrder: 'DESC',
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      };
      const response = await auditLogAPI.getAll(params);
      setAuditLogs(response.data.data.auditLogs || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch activity history');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      actionType: '',
      entityType: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  const getActionStyle = (actionType) => {
    const styles = {
      CREATE: { badge: 'bg-green-100 text-green-800 border-green-200', border: 'border-l-green-500' },
      UPDATE: { badge: 'bg-blue-100 text-blue-800 border-blue-200', border: 'border-l-blue-500' },
      DELETE: { badge: 'bg-red-100 text-red-800 border-red-200', border: 'border-l-red-500' },
      PAY: { badge: 'bg-purple-100 text-purple-800 border-purple-200', border: 'border-l-purple-500' },
      LOGIN: { badge: 'bg-indigo-100 text-indigo-800 border-indigo-200', border: 'border-l-indigo-500' },
      LOGOUT: { badge: 'bg-gray-100 text-gray-700 border-gray-200', border: 'border-l-gray-500' },
      RECEIPT_PDF_DOWNLOADED: { badge: 'bg-cyan-100 text-cyan-800 border-cyan-200', border: 'border-l-cyan-500' },
      NOTICE_PDF_DOWNLOADED: { badge: 'bg-cyan-100 text-cyan-800 border-cyan-200', border: 'border-l-cyan-500' }
    };
    return styles[actionType] || { badge: 'bg-gray-100 text-gray-800 border-gray-200', border: 'border-l-gray-400' };
  };

  if (loading && !auditLogs.length) return <Loading />;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="ds-page-header">
        <div>
          <h1 className="ds-page-title flex items-center gap-2">
            <History className="w-7 h-7 text-primary-600" />
            Activity History
          </h1>
          <p className="ds-page-subtitle">Your account activity and related actions</p>
        </div>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="btn btn-secondary flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); fetchAuditLogs(); }} className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activity..."
            className="input pl-10 w-full rounded-xl border-gray-200 focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <button type="submit" className="btn btn-primary rounded-xl shrink-0">
          Search
        </button>
      </form>

      {showFilters && (
        <div className="card rounded-xl border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="form-section-title mb-0">Filters</h3>
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Clear All
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="label">Action Type</label>
              <select
                value={filters.actionType}
                onChange={(e) => handleFilterChange('actionType', e.target.value)}
                className="input rounded-lg"
              >
                <option value="">All Actions</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="PAY">Pay</option>
                <option value="LOGIN">Login</option>
                <option value="LOGOUT">Logout</option>
              </select>
            </div>
            <div>
              <label className="label">Entity Type</label>
              <select
                value={filters.entityType}
                onChange={(e) => handleFilterChange('entityType', e.target.value)}
                className="input rounded-lg"
              >
                <option value="">All Entities</option>
                <option value="Property">Property</option>
                <option value="Demand">Demand</option>
                <option value="Payment">Payment</option>
                <option value="Notice">Notice</option>
              </select>
            </div>
            <div>
              <label className="label">Date From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="input rounded-lg"
              />
            </div>
            <div>
              <label className="label">Date To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="input rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {auditLogs.length === 0 ? (
        <div className="card rounded-xl border border-gray-100 text-center py-14">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No Activity Found</h3>
          <p className="text-gray-500 text-sm">You don&apos;t have any activity history yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {auditLogs.map((log) => {
            const style = getActionStyle(log.actionType);
            return (
              <div
                key={log.id}
                className={`bg-white rounded-xl border border-gray-100 border-l-4 ${style.border} shadow-sm hover:shadow-md transition-shadow p-4`}
              >
                <div className="flex flex-wrap items-center gap-2 gap-y-1 mb-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${style.badge}`}>
                    {log.actionType}
                  </span>
                  <span className="text-sm text-gray-500">
                    {log.entityType}
                    {log.entityId != null && ` #${log.entityId}`}
                  </span>
                  <span className="text-sm text-gray-400 ml-auto">
                    {formatDateTimeIST(log.timestamp)}
                  </span>
                </div>
                <p className="text-gray-900 text-sm leading-snug">{log.description}</p>
                {log.ipAddress && (
                  <p className="text-xs text-gray-400 mt-2">IP: {log.ipAddress}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ActivityHistory;
