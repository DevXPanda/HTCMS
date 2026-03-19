import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { workerAPI } from '../../services/api';
import { exportToCSV } from '../../utils/exportCSV';
import { Users, Download, RefreshCw, Search, FileDown, Eye } from 'lucide-react';
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
      employee_code: w.employee_code,
      full_name: w.full_name ?? w.name,
      mobile: w.mobile ?? w.phone,
      worker_type: w.worker_type,
      ward: w.ward ? `${w.ward.wardNumber || ''} - ${w.ward.wardName || ''}`.trim() : (w.ward_id ?? ''),
      supervisor: w.supervisor ? `${w.supervisor.full_name} (${w.supervisor.employee_id || ''})` : '',
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
        <p className="text-gray-600 text-sm">Same workflow as Admin/EO — view all field workers across ULBs. Filter by ULB, search by name/phone, export CSV.</p>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mobile</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Worker Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ward</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supervisor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase print-hide-col">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {workers.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{w.employee_code ?? '—'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{w.full_name ?? w.name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{w.mobile ?? w.phone ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${(w.worker_type || '').toUpperCase() === 'ULB' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                        {w.worker_type === 'OTHER' && w.worker_type_other ? `Other (${w.worker_type_other})` : (w.worker_type || '—')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {w.ward ? [w.ward.wardNumber, w.ward.wardName].filter(Boolean).join(' - ') : (w.ward_id ?? '—')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {w.supervisor ? `${w.supervisor.full_name || ''}${w.supervisor.employee_id ? ` (${w.supervisor.employee_id})` : ''}`.trim() || '—' : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${(w.status || '').toUpperCase() === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {w.status || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 print-hide-col">
                      <Link to={`/sbm/workers/${w.id}`} className="text-violet-600 hover:text-violet-800 flex items-center gap-1 text-sm">
                        <Eye className="w-4 h-4" /> View
                      </Link>
                    </td>
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
