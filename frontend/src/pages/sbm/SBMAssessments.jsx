import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { assessmentAPI } from '../../services/api';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import { Search, RefreshCw, FileDown, Download, Eye, FileText } from 'lucide-react';
import { exportToCSV } from '../../utils/exportCSV';

const SBMAssessments = () => {
  const [params, setParams] = useSearchParams();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(params.get('search') || '');
  const [status, setStatus] = useState(params.get('status') || '');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await assessmentAPI.getAll({
        limit: 10000,
        page: 1,
        search: search.trim() || undefined,
        status: status || undefined
      });
      const rows = res.data?.data?.assessments ?? res.data?.assessments ?? [];
      setList(Array.isArray(rows) ? rows : []);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to load assessments');
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => list, [list]);

  const handleSearch = (e) => {
    e.preventDefault();
    const next = new URLSearchParams(params);
    if (search.trim()) next.set('search', search.trim());
    else next.delete('search');
    if (status) next.set('status', status);
    else next.delete('status');
    setParams(next);
    fetchData();
  };

  const handleExport = () => {
    const rows = filtered.map((a) => ({
      id: a.id,
      assessmentNumber: a.assessmentNumber,
      assessmentYear: a.assessmentYear,
      status: a.status,
      assessedValue: a.assessedValue,
      propertyNumber: a.property?.propertyNumber,
      owner: a.property?.owner ? `${a.property.owner.firstName || ''} ${a.property.owner.lastName || ''}`.trim() : ''
    }));
    exportToCSV(rows, `sbm_assessments_${new Date().toISOString().slice(0, 10)}`);
    toast.success('CSV downloaded');
  };

  if (loading && !list.length) return <Loading />;

  return (
    <div className="space-y-4">
      <h1 className="print-only text-xl font-bold text-gray-900 mb-2">Assessments</h1>
      <div className="no-print">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-7 h-7 text-violet-600" />
          Assessments (Read-only)
        </h1>
        <p className="text-gray-600 text-sm">Same workflow as Super Admin. View-only unless Full CRUD is enabled.</p>
      </div>

      <div className="no-print flex flex-wrap gap-3 items-end">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-0 max-w-md">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by assessment number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 w-full"
            />
          </div>
          <button type="submit" className="btn btn-primary">Search</button>
        </form>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input w-auto min-w-[160px]">
          <option value="">All status</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <button type="button" onClick={fetchData} className="btn btn-secondary flex items-center gap-2" disabled={loading}>
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assessment No</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase print-hide-col">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{a.assessmentNumber || a.id}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{a.assessmentYear || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{a.property?.propertyNumber || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {a.property?.owner ? `${a.property.owner.firstName || ''} ${a.property.owner.lastName || ''}`.trim() : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {a.assessedValue != null ? Number(a.assessedValue).toLocaleString('en-IN') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      a.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                      a.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                      a.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {a.status || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 print-hide-col">
                    <Link to={`/sbm/assessments/${a.id}`} className="text-violet-600 hover:text-violet-800 flex items-center gap-1 text-sm">
                      <Eye className="w-4 h-4" /> View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length === 0 && (
          <div className="p-8 text-center text-gray-500">No assessments found.</div>
        )}
      </div>
    </div>
  );
};

export default SBMAssessments;

