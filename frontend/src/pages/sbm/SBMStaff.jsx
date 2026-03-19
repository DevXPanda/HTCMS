import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { exportToCSV } from '../../utils/exportCSV';
import { UserCog, Download, RefreshCw, Search, FileDown, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

const SBMStaff = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ulbId, setUlbId] = useState('');
  const [ulbs, setUlbs] = useState([]);
  const [roleFilter, setRoleFilter] = useState('');

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
        page: 1,
        ulb_id: ulbId || undefined,
        search: search.trim() || undefined,
        role: roleFilter || undefined
      };
      const res = await api.get('/admin-management/employees', { params });
      const list = res.data?.employees ?? [];
      setEmployees(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load staff');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [ulbId, roleFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleExport = () => {
    const rows = employees.map((e) => ({
      id: e.id,
      employee_id: e.employee_id,
      full_name: e.full_name,
      role: e.role,
      email: e.email,
      phone_number: e.phone_number,
      status: e.status,
      ward_names: Array.isArray(e.ward_names) ? e.ward_names.join('; ') : (e.ward_names || '')
    }));
    exportToCSV(rows, `sbm_staff_${new Date().toISOString().slice(0, 10)}`);
    toast.success('CSV downloaded');
  };

  return (
    <div className="space-y-4">
      <h1 className="print-only text-xl font-bold text-gray-900 mb-2">Staff</h1>
      <div className="no-print">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <UserCog className="w-7 h-7 text-violet-600" />
          Staff – EO / Supervisor / etc. (Read-only)
        </h1>
        <p className="text-gray-600 text-sm">View all staff across ULBs. Filter by ULB and role, search by name/ID, export CSV.</p>
      </div>

      <div className="no-print flex flex-wrap gap-3 items-end">
        <select value={ulbId} onChange={(e) => setUlbId(e.target.value)} className="input w-auto min-w-[180px]">
          <option value="">All ULBs</option>
          {ulbs.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input w-auto min-w-[140px]">
          <option value="">All roles</option>
          <option value="EO">EO</option>
          <option value="SUPERVISOR">Supervisor</option>
          <option value="COLLECTOR">Collector</option>
          <option value="FIELD_WORKER">Field Worker</option>
          <option value="SFI">SFI</option>
        </select>
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-0 max-w-md">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, employee ID..."
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
        <button type="button" onClick={handleExport} className="btn btn-secondary flex items-center gap-2" disabled={!employees.length}>
          <Download className="w-4 h-4" />
          Export CSV
        </button>
        <button type="button" onClick={() => window.print()} className="btn btn-secondary flex items-center gap-2">
          <FileDown className="w-4 h-4" />
          Print / PDF
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        {loading && !employees.length ? (
          <div className="p-8 flex justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-violet-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase print-hide-col">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{emp.employee_id}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{emp.full_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{emp.role || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{emp.email || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{emp.phone_number || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${(emp.status || '').toLowerCase() === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {emp.status || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 print-hide-col">
                      <Link to={`/sbm/staff/${emp.id}`} className="text-violet-600 hover:text-violet-800 flex items-center gap-1 text-sm">
                        <Eye className="w-4 h-4" /> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !employees.length && (
          <div className="p-8 text-center text-gray-500">No staff found.</div>
        )}
      </div>
    </div>
  );
};

export default SBMStaff;
