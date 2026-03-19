import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { propertyAPI } from '../../services/api';
import { exportToCSV } from '../../utils/exportCSV';
import { Home, Download, RefreshCw, Search, Eye, FileDown } from 'lucide-react';
import toast from 'react-hot-toast';

const SBMProperties = () => {
  const [properties, setProperties] = useState([]);
  const [ulbs, setUlbs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ulbId, setUlbId] = useState('');
  const [wardFilter, setWardFilter] = useState('');

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
        search: search.trim() || undefined,
        ulb_id: ulbId || undefined
      };
      if (wardFilter && wardFilter.trim()) params.wardId = wardFilter.trim();
      const res = await propertyAPI.getAll(params);
      const list = res.data?.data?.properties ?? [];
      setProperties(list);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load properties');
      setProperties([]);
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
    const rows = properties.map((p) => ({
      propertyId: p.uniqueCode || p.propertyNumber,
      address: p.address,
      ward: p.ward?.wardName ?? p.ward_id,
      propertyType: p.propertyType,
      usageType: p.usageType,
      area: p.area,
      status: p.status
    }));
    exportToCSV(rows, `sbm_properties_${new Date().toISOString().slice(0, 10)}`);
    toast.success('CSV downloaded');
  };

  return (
    <div className="space-y-4">
      <h1 className="print-only text-xl font-bold text-gray-900 mb-2">Properties</h1>
      <div className="no-print">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Home className="w-7 h-7 text-violet-600" />
          Properties (Read-only)
        </h1>
        <p className="text-gray-600 text-sm">View all properties across ULBs. Filter by ULB, search by name/ID, export CSV.</p>
      </div>

      <div className="no-print flex flex-wrap gap-3 items-end">
        <select
          value={ulbId}
          onChange={(e) => setUlbId(e.target.value)}
          className="input w-auto min-w-[180px]"
        >
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
              placeholder="Search by property ID, address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 w-full"
            />
          </div>
          <button type="submit" className="btn btn-primary">Search</button>
        </form>
        <input
          type="text"
          placeholder="Ward ID"
          value={wardFilter}
          onChange={(e) => setWardFilter(e.target.value)}
          className="input w-24"
        />
        <button type="button" onClick={fetchData} className="btn btn-secondary flex items-center gap-2" disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        <button type="button" onClick={handleExport} className="btn btn-secondary flex items-center gap-2" disabled={!properties.length}>
          <Download className="w-4 h-4" />
          Export CSV
        </button>
        <button type="button" onClick={() => window.print()} className="btn btn-secondary flex items-center gap-2">
          <FileDown className="w-4 h-4" />
          Print / PDF
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        {loading && !properties.length ? (
          <div className="p-8 flex justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-violet-500" />
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ward</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="print-hide-col px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {properties.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.uniqueCode || p.propertyNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.address || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.ward?.wardName ?? p.ward_id ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.propertyType || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${(p.status || '').toLowerCase() === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {p.status || '—'}
                      </span>
                    </td>
                    <td className="print-hide-col px-4 py-3">
                      <Link to={`/sbm/properties/${p.id}`} className="text-violet-600 hover:text-violet-800 flex items-center gap-1 text-sm">
                        <Eye className="w-4 h-4" /> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !properties.length && (
          <div className="p-8 text-center text-gray-500">No properties found. Try changing filters or search.</div>
        )}
      </div>
    </div>
  );
};

export default SBMProperties;
