import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { noticeAPI } from '../../services/api';
import api from '../../services/api';
import { exportToCSV } from '../../utils/exportCSV';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import { Search, RefreshCw, Download, FileDown, Eye, FileText } from 'lucide-react';

const SBML_ULB_STORAGE_KEY = 'htcms_sbm_selected_ulb_id';

const SBMNotices = () => {
  const location = useLocation();
  const sp = new URLSearchParams(location.search || '');
  const moduleFromUrl = (sp.get('module') || '').toUpperCase();

  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ulbs, setUlbs] = useState([]);
  const [ulbId, setUlbId] = useState(() => {
    try { return sessionStorage.getItem(SBML_ULB_STORAGE_KEY) || ''; } catch { return ''; }
  });
  const [status, setStatus] = useState('');

  useEffect(() => {
    api.get('/admin-management/ulbs').then((res) => {
      const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setUlbs(Array.isArray(data) ? data : []);
    }).catch(() => setUlbs([]));
  }, []);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const params = {
        search: search.trim() || undefined,
        limit: 10000,
        status: status || undefined,
        ulb_id: ulbId || undefined
      };
      const response = await noticeAPI.getAll(params);
      const rows = response.data?.data?.notices ?? [];
      setNotices(Array.isArray(rows) ? rows : []);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to load notices');
      setNotices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ulbId, status]);

  const filtered = useMemo(() => notices, [notices]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchNotices();
  };

  const handleExport = () => {
    const rows = filtered.map((n) => ({
      id: n.id,
      noticeNumber: n.noticeNumber,
      noticeType: n.noticeType,
      status: n.status,
      financialYear: n.financialYear,
      demandNumber: n.demand?.demandNumber,
      propertyNumber: n.property?.propertyNumber
    }));
    exportToCSV(rows, `sbm_notices_${new Date().toISOString().slice(0, 10)}`);
    toast.success('CSV downloaded');
  };

  if (loading && !notices.length) return <Loading />;

  return (
    <div className="space-y-4">
      <h1 className="print-only text-xl font-bold text-gray-900 mb-2">Notices</h1>
      <div className="no-print">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-7 h-7 text-violet-600" />
          Notices (Read-only)
        </h1>
        <p className="text-gray-600 text-sm">Same workflow as Super Admin. View-only unless Full CRUD is enabled.</p>
      </div>

      <div className="no-print flex flex-wrap gap-3 items-end">
        <select value={ulbId} onChange={(e) => setUlbId(e.target.value)} className="input w-auto min-w-[180px]">
          <option value="">All ULBs</option>
          {ulbs.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input w-auto min-w-[160px]">
          <option value="">All status</option>
          <option value="generated">Generated</option>
          <option value="sent">Sent</option>
          <option value="delivered">Delivered</option>
        </select>
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-0 max-w-md">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search notices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 w-full"
            />
          </div>
          <button type="submit" className="btn btn-primary">Search</button>
        </form>
        <button type="button" onClick={fetchNotices} className="btn btn-secondary flex items-center gap-2" disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        <button type="button" onClick={handleExport} className="btn btn-secondary flex items-center gap-2" disabled={!filtered.length}>
          <Download className="w-4 h-4" />
          Export CSV
        </button>
        <button type="button" onClick={() => window.print()} className="btn btn-secondary flex items-center gap-2">
          <FileDown className="w-4 h-4" />
          Print / PDF
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notice #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">FY</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Demand</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase print-hide-col">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((n) => (
                <tr key={n.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{n.noticeNumber || n.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{n.noticeType || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{n.status || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{n.financialYear || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{n.demand?.demandNumber || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{n.property?.propertyNumber || '—'}</td>
                  <td className="px-4 py-3 print-hide-col">
                    <Link
                      to={`/sbm/notices/${n.id}${moduleFromUrl ? `?module=${encodeURIComponent(moduleFromUrl)}` : ''}`}
                      className="text-violet-600 hover:text-violet-800 flex items-center gap-1 text-sm"
                    >
                      <Eye className="w-4 h-4" /> View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length === 0 && (
          <div className="p-8 text-center text-gray-500">No notices found.</div>
        )}
      </div>
    </div>
  );
};

export default SBMNotices;

