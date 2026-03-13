import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { exportToCSV } from '../../utils/exportCSV';
import { Heart, Download, RefreshCw, Search, FileDown } from 'lucide-react';
import toast from 'react-hot-toast';

const SBMGaushala = () => {
  const [list, setList] = useState([]);
  const [ulbs, setUlbs] = useState([]);
  const [ulbId, setUlbId] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/admin-management/ulbs').then((res) => {
      const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setUlbs(Array.isArray(data) ? data : []);
    }).catch(() => {});
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = { limit: 5000 };
      if (ulbId) params.ulb_id = ulbId;
      if (search.trim()) params.search = search.trim();
      const res = await api.get('/gaushala/facilities', { params });
      const facilities = res.data?.data?.facilities ?? res.data?.facilities ?? [];
      setList(Array.isArray(facilities) ? facilities : []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load Gaushala facilities');
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [ulbId]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleExport = () => {
    const rows = list.map((f) => ({
      id: f.id,
      name: f.name,
      location: f.location,
      ward: f.ward?.wardName ?? f.ward_id,
      status: f.status
    }));
    exportToCSV(rows, `sbm_gaushala_facilities_${new Date().toISOString().slice(0, 10)}`);
    toast.success('CSV downloaded');
  };

  return (
    <div className="space-y-4">
      <h1 className="print-only text-xl font-bold text-gray-900 mb-2">Gaushala Management</h1>
      <div className="no-print">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Heart className="w-7 h-7 text-rose-600" />
          Gaushala Management (Read-only)
        </h1>
        <p className="text-gray-600 text-sm">View Gaushala facilities across ULBs. Filter by ULB, search, export.</p>
      </div>

      <div className="no-print flex flex-wrap gap-3 items-end">
        <select value={ulbId} onChange={(e) => setUlbId(e.target.value)} className="input w-auto min-w-[180px]">
          <option value="">All ULBs</option>
          {ulbs.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-0 max-w-md">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search by name..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9 w-full" />
          </div>
          <button type="submit" className="btn btn-primary">Search</button>
        </form>
        <button type="button" onClick={fetchData} className="btn btn-secondary flex items-center gap-2" disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        <button type="button" onClick={handleExport} className="btn btn-secondary flex items-center gap-2" disabled={!list.length}>
          <Download className="w-4 h-4" /> Export CSV
        </button>
        <button type="button" onClick={() => window.print()} className="btn btn-secondary flex items-center gap-2">
          <FileDown className="w-4 h-4" /> Print / PDF
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        {loading && !list.length ? (
          <div className="p-8 flex justify-center"><RefreshCw className="w-8 h-8 animate-spin text-rose-500" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ward</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {list.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{f.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{f.location || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{f.ward?.wardName ?? f.ward_id ?? '—'}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${(f.status || '').toLowerCase() === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{f.status || '—'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !list.length && <div className="p-8 text-center text-gray-500">No facilities found.</div>}
      </div>
    </div>
  );
};

export default SBMGaushala;
