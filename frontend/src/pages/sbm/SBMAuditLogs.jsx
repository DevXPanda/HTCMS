import { useState, useEffect } from 'react';
import { auditLogAPI } from '../../services/api';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import { Search, Filter, X } from 'lucide-react';
import api from '../../services/api';
import { formatDateIST, formatTimeIST } from '../../utils/dateUtils';

const SBM_ULB_STORAGE_KEY = 'htcms_sbm_selected_ulb_id';

const SBMAuditLogs = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    actorRole: '',
    actionType: '',
    entityType: '',
    dateFrom: '',
    dateTo: '',
    ulb_id: (() => {
      try { return sessionStorage.getItem(SBM_ULB_STORAGE_KEY) || ''; } catch { return ''; }
    })()
  });
  const [ulbs, setUlbs] = useState([]);

  useEffect(() => {
    api.get('/admin-management/ulbs').then((res) => {
      const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setUlbs(Array.isArray(data) ? data : []);
    }).catch(() => setUlbs([]));
  }, []);

  useEffect(() => {
    fetchAuditLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filters]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const params = {
        search,
        limit: 10000,
        sortBy: 'timestamp',
        sortOrder: 'DESC',
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== '' && v != null))
      };
      const response = await auditLogAPI.getAll(params);
      setAuditLogs(response.data?.data?.auditLogs ?? []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch audit logs');
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'ulb_id') {
        try {
          if (value) sessionStorage.setItem(SBM_ULB_STORAGE_KEY, value);
          else sessionStorage.removeItem(SBM_ULB_STORAGE_KEY);
        } catch (_) {}
      }
      return next;
    });
  };

  const clearFilters = () => {
    handleFilterChange('actorRole', '');
    handleFilterChange('actionType', '');
    handleFilterChange('entityType', '');
    handleFilterChange('dateFrom', '');
    handleFilterChange('dateTo', '');
  };

  const badge = (cls, text) => (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{text || '—'}</span>
  );

  const actionBadge = (actionType) => {
    const badges = {
      CREATE: 'bg-green-100 text-green-800',
      UPDATE: 'bg-blue-100 text-blue-800',
      DELETE: 'bg-red-100 text-red-800',
      VIEW: 'bg-slate-100 text-slate-800',
      APPROVE: 'bg-emerald-100 text-emerald-800',
      REJECT: 'bg-orange-100 text-orange-800',
      PAY: 'bg-purple-100 text-purple-800',
      LOGIN: 'bg-indigo-100 text-indigo-800',
      LOGOUT: 'bg-gray-100 text-gray-800'
    };
    return badge(badges[actionType] || 'bg-gray-100 text-gray-800', actionType);
  };

  if (loading && !auditLogs.length) return <Loading />;

  return (
    <div className="space-y-4">
      <div className="ds-page-header">
        <div>
          <h1 className="ds-page-title">Audit Logs (Read-only)</h1>
          <p className="ds-page-subtitle">System activity and user action history</p>
        </div>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="btn btn-secondary flex items-center"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </button>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); fetchAuditLogs(); }} className="no-print">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by description or metadata..."
              className="input pl-10"
            />
          </div>
          <button type="submit" className="btn btn-primary">Search</button>
        </div>
      </form>

      {showFilters && (
        <div className="card no-print">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Filters</h3>
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="label">ULB</label>
              <select value={filters.ulb_id} onChange={(e) => handleFilterChange('ulb_id', e.target.value)} className="input">
                <option value="">All ULBs</option>
                {ulbs.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Actor Role</label>
              <select value={filters.actorRole} onChange={(e) => handleFilterChange('actorRole', e.target.value)} className="input">
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
                <option value="system">System</option>
                <option value="sbm">SBM</option>
              </select>
            </div>
            <div>
              <label className="label">Action Type</label>
              <select value={filters.actionType} onChange={(e) => handleFilterChange('actionType', e.target.value)} className="input">
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
              </select>
            </div>
            <div>
              <label className="label">Entity Type</label>
              <select value={filters.entityType} onChange={(e) => handleFilterChange('entityType', e.target.value)} className="input">
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
              <input type="date" value={filters.dateFrom} onChange={(e) => handleFilterChange('dateFrom', e.target.value)} className="input" />
              <label className="label mt-2">Date To</label>
              <input type="date" value={filters.dateTo} onChange={(e) => handleFilterChange('dateTo', e.target.value)} className="input" />
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {log.timestamp ? `${formatDateIST(log.timestamp)} ${formatTimeIST(log.timestamp)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {log.actor ? `${log.actor.firstName || ''} ${log.actor.lastName || ''}`.trim() : '—'}
                    {log.actorRole ? <span className="text-xs text-gray-500 block">{String(log.actorRole).toUpperCase()}</span> : null}
                  </td>
                  <td className="px-4 py-3 text-sm">{actionBadge(log.actionType)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {log.entityType ? badge('bg-gray-100 text-gray-800', log.entityType) : '—'}
                    {log.entityId ? <span className="text-xs text-gray-500 block mt-1">ID: {log.entityId}</span> : null}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{log.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && auditLogs.length === 0 && (
          <div className="p-8 text-center text-gray-500">No audit logs found.</div>
        )}
      </div>
    </div>
  );
};

export default SBMAuditLogs;

