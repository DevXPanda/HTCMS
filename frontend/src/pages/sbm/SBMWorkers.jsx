import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { workerAPI } from '../../services/api';
import { exportToCSV } from '../../utils/exportCSV';
import { Users, Download, RefreshCw, Search, FileDown } from 'lucide-react';
import toast from 'react-hot-toast';

const SBMWorkers = () => {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ulbId, setUlbId] = useState('');
  const [ulbs, setUlbs] = useState([]);

  useEffect(() => {
    api.get('/admin-management/ulbs').then((res) => {
      const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setUlbs(data);
    }).catch(() => {});
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {
        limit: 5000,
        ulb_id: ulbId || undefined,
        search: search.trim() || undefined
      };
      const res = await workerAPI.getAllWorkers(params);
      const data = res.data?.data ?? res.data ?? {};
      const list = Array.isArray(data.workers) ? data.workers : (data.rows ?? []);
      setWorkers(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load workers');
      setWorkers([]);
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
    const rows = workers.map((w) => ({
      id: w.id,
      name: w.name,
      worker_type: w.worker_type,
      phone: w.phone,
      ward: w.ward?.wardName ?? w.ward_id,
      status: w.status
    }));
    exportToCSV(rows, `sbm_workers_${new Date().toISOString().slice(0, 10)}`);
    toast.success('CSV downloaded');
  };

  return (
    <div className="space-y-4">
      <h1 className="print-only text-xl font-bold text-gray-900 mb-2">Field Workers</h1>
      <div className="no-print">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-7 h-7 text-violet-600" />
          Field Workers (Read-only)
        </h1>
        <p className="text-gray-600 text-sm">View all field workers across ULBs. Filter by ULB, search by name/ID, export CSV.</p>
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
            <input
              type="text"
              placeholder="Search by name, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 w-full"
            />
          </div>
          <button type="submit" className="btn btn-primary">Search</button>
        </form>
        <button type="button" onClick={fetchData} className="btn btn-secondary flex items-center gap-2" disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        <button type="button" onClick={handleExport} className="btn btn-secondary flex items-center gap-2" disabled={!workers.length}>
          <Download className="w-4 h-4" />
          Export CSV
        </button>
        <button type="button" onClick={() => window.print()} className="btn btn-secondary flex items-center gap-2">
          <FileDown className="w-4 h-4" />
          Print / PDF
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        {loading && !workers.length ? (
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ward</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {workers.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{w.id}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{w.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{w.worker_type || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{w.phone || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{w.ward?.wardName ?? w.ward_id ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{w.status || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !workers.length && (
          <div className="p-8 text-center text-gray-500">No workers found.</div>
        )}
      </div>
    </div>
  );
};

export default SBMWorkers;
