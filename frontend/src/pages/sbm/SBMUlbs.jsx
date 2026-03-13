import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { exportToCSV } from '../../utils/exportCSV';
import { Building2, Download, RefreshCw, Search, FileDown } from 'lucide-react';
import toast from 'react-hot-toast';

const SBMUlbs = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin-management/ulbs', { params: { includeInactive: 'true' } });
      const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setList(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load ULBs');
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = search.trim()
    ? list.filter(
        (u) =>
          (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
          (u.district || '').toLowerCase().includes(search.toLowerCase()) ||
          (u.state || '').toLowerCase().includes(search.toLowerCase())
      )
    : list;

  const handleExport = () => {
    const rows = filtered.map((u) => ({
      id: u.id,
      name: u.name,
      ulb_type: u.ulb_type,
      state: u.state,
      district: u.district,
      status: u.status
    }));
    exportToCSV(rows, `sbm_ulbs_${new Date().toISOString().slice(0, 10)}`);
    toast.success('CSV downloaded');
  };

  return (
    <div className="space-y-4">
      <h1 className="print-only text-xl font-bold text-gray-900 mb-2">ULBs</h1>
      <div className="no-print">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Building2 className="w-7 h-7 text-violet-600" />
          ULBs (Read-only)
        </h1>
        <p className="text-gray-600 text-sm">Global view of all Urban Local Bodies. Search and export only.</p>
      </div>

      <div className="no-print flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, district, state..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 w-full"
          />
        </div>
        <button type="button" onClick={fetchData} className="btn btn-secondary flex items-center gap-2" disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        <button type="button" onClick={handleExport} className="btn btn-secondary flex items-center gap-2" disabled={filtered.length === 0}>
          <Download className="w-4 h-4" />
          Export CSV
        </button>
        <button type="button" onClick={() => window.print()} className="btn btn-secondary flex items-center gap-2">
          <FileDown className="w-4 h-4" />
          Print / PDF
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        {loading && !list.length ? (
          <div className="p-8 flex justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-violet-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">State</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">District</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{u.id}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{u.ulb_type || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{u.state || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{u.district || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${u.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {u.status || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="p-8 text-center text-gray-500">No ULBs found.</div>
        )}
      </div>
    </div>
  );
};

export default SBMUlbs;
