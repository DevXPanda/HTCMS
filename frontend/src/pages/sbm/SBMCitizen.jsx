import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { userAPI } from '../../services/api';
import { exportToCSV } from '../../utils/exportCSV';
import { Users, Download, RefreshCw, Search, FileDown, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

const SBM_ULB_STORAGE_KEY = 'htcms_sbm_selected_ulb_id';

const SBMCitizen = () => {
  const [users, setUsers] = useState([]);
  const [ulbs, setUlbs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ulbId, setUlbId] = useState(() => {
    try { return sessionStorage.getItem(SBM_ULB_STORAGE_KEY) || ''; } catch { return ''; }
  });

  useEffect(() => {
    api.get('/admin-management/ulbs').then((res) => {
      const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setUlbs(Array.isArray(data) ? data : []);
    }).catch(() => setUlbs([]));
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [ulbId]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = { role: 'citizen', limit: 10000 };
      if (ulbId) params.ulb_id = ulbId;
      const res = await userAPI.getAll(params);
      const list = res.data?.data?.users ?? res.data?.users ?? [];
      setUsers(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load citizens');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = search.trim()
    ? users.filter(
        (u) =>
          (u.firstName || '').toLowerCase().includes(search.toLowerCase()) ||
          (u.lastName || '').toLowerCase().includes(search.toLowerCase()) ||
          (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
          (u.phone || '').toLowerCase().includes(search.toLowerCase()) ||
          (u.username || '').toLowerCase().includes(search.toLowerCase())
      )
    : users;

  const handleExport = () => {
    const rows = filtered.map((u) => ({
      id: u.id,
      name: [u.firstName, u.lastName].filter(Boolean).join(' '),
      email: u.email,
      phone: u.phone,
      username: u.username,
      isActive: u.isActive
    }));
    exportToCSV(rows, `sbm_citizens_${new Date().toISOString().slice(0, 10)}`);
    toast.success('CSV downloaded');
  };

  const handleUlbChange = (v) => {
    setUlbId(v);
    try {
      if (v) sessionStorage.setItem(SBM_ULB_STORAGE_KEY, v);
      else sessionStorage.removeItem(SBM_ULB_STORAGE_KEY);
    } catch (_) {}
  };

  return (
    <div className="space-y-4">
      <h1 className="print-only text-xl font-bold text-gray-900 mb-2">Citizen Management</h1>
      <div className="no-print">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-7 h-7 text-violet-600" />
          Citizen Management (Read-only)
        </h1>
        <p className="text-gray-600 text-sm">View citizens — same as Super Admin. SBM view-only.</p>
      </div>

      <div className="no-print flex flex-wrap gap-3 items-end">
        <select value={ulbId} onChange={(e) => handleUlbChange(e.target.value)} className="input w-auto min-w-[180px]">
          <option value="">All ULBs</option>
          {ulbs.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 w-full"
          />
        </div>
        <button type="button" onClick={fetchUsers} className="btn btn-secondary flex items-center gap-2" disabled={loading}>
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
        <div className="table-wrap">
          <table className="table min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase print-hide-col">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{u.email || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{u.phone || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{u.username || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${u.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {u.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 print-hide-col">
                    <Link to={`/sbm/citizen/${u.id}`} className="text-violet-600 hover:text-violet-800 flex items-center gap-1 text-sm">
                      <Eye className="w-4 h-4" /> View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length === 0 && (
          <div className="p-8 text-center text-gray-500">No citizens found.</div>
        )}
      </div>
    </div>
  );
};

export default SBMCitizen;
