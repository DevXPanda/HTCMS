import { useState, useEffect } from 'react';
import { auditLogAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { Search, Filter, X, Eye, Calendar, User, FileText } from 'lucide-react';
import AuditLogDetailsModal from './AuditLogDetailsModal';
import { useSelectedUlb } from '../../../contexts/SelectedUlbContext';
import { formatDateIST, formatTimeIST } from '../../../utils/dateUtils';

const AuditLogs = () => {
  const { effectiveUlbId } = useSelectedUlb();
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
  }, [search, filters, effectiveUlbId]);

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
      if (effectiveUlbId) params.ulb_id = effectiveUlbId;
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
      VIEW: 'bg-slate-100 text-slate-800',
      APPROVE: 'bg-emerald-100 text-emerald-800',
      REJECT: 'bg-orange-100 text-orange-800',
      PAY: 'bg-purple-100 text-purple-800',
      LOGIN: 'bg-indigo-100 text-indigo-800',
      LOGOUT: 'bg-gray-100 text-gray-800',
      ASSIGN: 'bg-yellow-100 text-yellow-800',
      ESCALATE: 'bg-pink-100 text-pink-800',
      SEND: 'bg-cyan-100 text-cyan-800',
      RESOLVE: 'bg-teal-100 text-teal-800',
      FIELD_VISIT: 'bg-violet-100 text-violet-800',
      TASK_COMPLETED: 'bg-lime-100 text-lime-800'
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
                <option value="clerk">Clerk</option>
                <option value="inspector">Inspector</option>
                <option value="officer">Officer</option>
                <option value="eo">EO</option>
                <option value="supervisor">Supervisor</option>
                <option value="field_worker">Field Worker</option>
                <option value="contractor">Contractor</option>
                <option value="system">System</option>
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
                <option value="VIEW">View</option>
                <option value="APPROVE">Approve</option>
                <option value="REJECT">Reject</option>
                <option value="PAY">Pay</option>
                <option value="LOGIN">Login</option>
                <option value="LOGOUT">Logout</option>
                <option value="ASSIGN">Assign</option>
                <option value="ESCALATE">Escalate</option>
                <option value="SEND">Send</option>
                <option value="RESOLVE">Resolve</option>
                <option value="FIELD_VISIT">Field Visit</option>
                <option value="TASK_COMPLETED">Task Completed</option>
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
                <option value="FieldVisit">Field Visit</option>
                <option value="FollowUp">Follow Up</option>
                <option value="Attendance">Attendance</option>
                <option value="D2DC">D2DC</option>
                <option value="WaterConnectionRequest">Water Connection</option>
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

      <div className="card overflow-x-auto p-0">
        <table className="table w-full border-collapse text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
              <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Actor</th>
              <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Entity</th>
              <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Entity ID</th>
              <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
              <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-8 text-gray-500 px-4 py-3">
                  No audit logs found
                </td>
              </tr>
            ) : (
              auditLogs.map((log) => (
                <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50/80">
                  <td className="px-4 py-2 text-sm text-gray-900 border-b border-gray-100 align-top">
                    {(log.timestamp || log.createdAt) ? (() => {
                      const d = log.timestamp || log.createdAt;
                      const dateStr = formatDateIST(d);
                      const timeStr = formatTimeIST(d);
                      return (
                        <div className="flex items-start gap-2" title={new Date(d).toISOString()}>
                          <Calendar className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                          <div className="leading-tight">
                            <div className="tabular-nums whitespace-nowrap">{dateStr}</div>
                            <div className="text-xs text-gray-500 tabular-nums">{timeStr}</div>
                          </div>
                        </div>
                      );
                    })() : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm border-b border-gray-100 align-top">
                    {log.actor ? (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400 shrink-0" />
                        <span>{log.actor.firstName} {log.actor.lastName}</span>
                      </div>
                    ) : (
                      'System'
                    )}
                  </td>
                  <td className="px-4 py-2 border-b border-gray-100 align-top">
                    <span className="px-2 py-0.5 rounded text-xs font-medium capitalize bg-gray-100 text-gray-800">
                      {log.actorRole}
                    </span>
                  </td>
                  <td className="px-4 py-2 border-b border-gray-100 align-top">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getActionBadge(log.actionType)}`}>
                      {log.actionType}
                    </span>
                  </td>
                  <td className="px-4 py-2 border-b border-gray-100 align-top">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getEntityBadge(log.entityType)}`}>
                      {log.entityType}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm border-b border-gray-100 align-top">{log.entityId || '-'}</td>
                  <td className="px-4 py-2 text-sm border-b border-gray-100 max-w-xs truncate align-top" title={log.description}>
                    {log.description || '-'}
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100 align-top">{log.ipAddress || '-'}</td>
                  <td className="px-4 py-2 border-b border-gray-100 align-top">
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
