import { useState, useEffect } from 'react';
import { auditLogAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { Search, Filter, X, Eye, Calendar, User, FileText } from 'lucide-react';
import AuditLogDetailsModal from './AuditLogDetailsModal';

const AuditLogs = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [filters, setFilters] = useState({
    actorRole: '',
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
        search,
        limit: 10000,
        sortBy: 'timestamp',
        sortOrder: 'DESC',
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      };
      const response = await auditLogAPI.getAll(params);
      setAuditLogs(response.data.data.auditLogs);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      actorRole: '',
      actionType: '',
      entityType: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  const getActionBadge = (actionType) => {
    const badges = {
      CREATE: 'bg-green-100 text-green-800',
      UPDATE: 'bg-blue-100 text-blue-800',
      DELETE: 'bg-red-100 text-red-800',
      APPROVE: 'bg-emerald-100 text-emerald-800',
      REJECT: 'bg-orange-100 text-orange-800',
      PAY: 'bg-purple-100 text-purple-800',
      LOGIN: 'bg-indigo-100 text-indigo-800',
      LOGOUT: 'bg-gray-100 text-gray-800',
      ASSIGN: 'bg-yellow-100 text-yellow-800',
      ESCALATE: 'bg-pink-100 text-pink-800',
      SEND: 'bg-cyan-100 text-cyan-800',
      RESOLVE: 'bg-teal-100 text-teal-800'
    };
    return badges[actionType] || 'bg-gray-100 text-gray-800';
  };

  const getEntityBadge = (entityType) => {
    const badges = {
      User: 'bg-blue-50 text-blue-700',
      Property: 'bg-green-50 text-green-700',
      Assessment: 'bg-purple-50 text-purple-700',
      Demand: 'bg-orange-50 text-orange-700',
      Payment: 'bg-emerald-50 text-emerald-700',
      Ward: 'bg-pink-50 text-pink-700',
      Notice: 'bg-yellow-50 text-yellow-700'
    };
    return badges[entityType] || 'bg-gray-50 text-gray-700';
  };

  if (loading && !auditLogs.length) return <Loading />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="ds-page-title">Audit Logs</h1>
          <p className="text-gray-600 mt-1">System activity and user action history</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="btn btn-secondary flex items-center"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </button>
      </div>

      {/* Search */}
      <form onSubmit={(e) => { e.preventDefault(); fetchAuditLogs(); }} className="mb-6">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by description or metadata..."
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
              <label className="label">Actor Role</label>
              <select
                value={filters.actorRole}
                onChange={(e) => handleFilterChange('actorRole', e.target.value)}
                className="input"
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="assessor">Assessor</option>
                <option value="cashier">Cashier</option>
                <option value="collector">Collector</option>
                <option value="citizen">Citizen</option>
              </select>
            </div>

            <div>
              <label className="label">Action Type</label>
              <select
                value={filters.actionType}
                onChange={(e) => handleFilterChange('actionType', e.target.value)}
                className="input"
              >
                <option value="">All Actions</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="APPROVE">Approve</option>
                <option value="REJECT">Reject</option>
                <option value="PAY">Pay</option>
                <option value="LOGIN">Login</option>
                <option value="LOGOUT">Logout</option>
                <option value="ASSIGN">Assign</option>
                <option value="ESCALATE">Escalate</option>
                <option value="SEND">Send</option>
                <option value="RESOLVE">Resolve</option>
              </select>
            </div>

            <div>
              <label className="label">Entity Type</label>
              <select
                value={filters.entityType}
                onChange={(e) => handleFilterChange('entityType', e.target.value)}
                className="input"
              >
                <option value="">All Entities</option>
                <option value="User">User</option>
                <option value="Property">Property</option>
                <option value="Assessment">Assessment</option>
                <option value="Demand">Demand</option>
                <option value="Payment">Payment</option>
                <option value="Ward">Ward</option>
                <option value="Notice">Notice</option>
              </select>
            </div>

            <div>
              <label className="label">Date From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="label">Date To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
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
              <th>Timestamp</th>
              <th>Actor</th>
              <th>Role</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Entity ID</th>
              <th>Description</th>
              <th>IP Address</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-8 text-gray-500">
                  No audit logs found
                </td>
              </tr>
            ) : (
              auditLogs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-sm">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </td>
                  <td>
                    {log.actor ? (
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-2 text-gray-400" />
                        <span>{log.actor.firstName} {log.actor.lastName}</span>
                      </div>
                    ) : (
                      'System'
                    )}
                  </td>
                  <td>
                    <span className="px-2 py-1 rounded text-xs font-medium capitalize bg-gray-100 text-gray-800">
                      {log.actorRole}
                    </span>
                  </td>
                  <td>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getActionBadge(log.actionType)}`}>
                      {log.actionType}
                    </span>
                  </td>
                  <td>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getEntityBadge(log.entityType)}`}>
                      {log.entityType}
                    </span>
                  </td>
                  <td>{log.entityId || '-'}</td>
                  <td className="max-w-xs truncate" title={log.description}>
                    {log.description || '-'}
                  </td>
                  <td className="text-sm text-gray-500">{log.ipAddress || '-'}</td>
                  <td>
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="text-primary-600 hover:text-primary-700"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination removed */}

      {/* Audit Log Details Modal */}
      {selectedLog && (
        <AuditLogDetailsModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
};

export default AuditLogs;
