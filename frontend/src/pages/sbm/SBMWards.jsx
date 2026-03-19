import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { wardAPI } from '../../services/api';
import { exportToCSV } from '../../utils/exportCSV';
import { MapPin, Users, Eye, Download, RefreshCw, Search, FileDown } from 'lucide-react';
import toast from 'react-hot-toast';

const formatWardNumber = (val) => {
  if (val == null || val === '') return '';
  const n = parseInt(String(val).trim(), 10);
  if (!Number.isNaN(n) && n >= 0) return String(n).padStart(3, '0');
  return String(val);
};

const SBMWards = () => {
  const [wards, setWards] = useState([]);
  const [ulbs, setUlbs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ulbId, setUlbId] = useState('');
  const [filterActive, setFilterActive] = useState('all');

  useEffect(() => {
    api.get('/admin-management/ulbs').then((res) => {
      const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setUlbs(Array.isArray(data) ? data : []);
    }).catch(() => setUlbs([]));
  }, []);

  const fetchWards = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (filterActive !== 'all') params.isActive = filterActive === 'active';
      if (ulbId) params.ulb_id = ulbId;
      const response = await wardAPI.getAll(params);
      setWards(response.data?.data?.wards ?? []);
    } catch (error) {
      toast.error('Failed to fetch wards');
      setWards([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWards();
  }, [ulbId, filterActive]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchWards();
  };

  const handleExport = () => {
    const rows = wards.map((w) => ({
      id: w.id,
      wardNumber: formatWardNumber(w.wardNumber),
      wardName: w.wardName,
      ulb: w.ulb?.name,
      collector: w.collector ? (w.collector.full_name || `${w.collector.firstName || ''} ${w.collector.lastName || ''}`).trim() : '',
      isActive: w.isActive
    }));
    exportToCSV(rows, `sbm_wards_${new Date().toISOString().slice(0, 10)}`);
    toast.success('CSV downloaded');
  };

  return (
    <div className="space-y-4">
      <h1 className="print-only text-xl font-bold text-gray-900 mb-2">Wards</h1>
      <div className="no-print">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MapPin className="w-7 h-7 text-violet-600" />
          Wards (Read-only)
        </h1>
        <p className="text-gray-600 text-sm">Same data as Super Admin. View all wards; filter by ULB, search, export CSV.</p>
      </div>

      <div className="no-print flex flex-wrap gap-3 items-end">
        <select value={ulbId} onChange={(e) => setUlbId(e.target.value)} className="input w-auto min-w-[180px]">
          <option value="">All ULBs</option>
          {ulbs.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <select value={filterActive} onChange={(e) => setFilterActive(e.target.value)} className="input w-auto min-w-[140px]">
          <option value="all">All</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </select>
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-0 max-w-md">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ward number or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 w-full"
            />
          </div>
          <button type="submit" className="btn btn-primary">Search</button>
        </form>
        <button type="button" onClick={fetchWards} className="btn btn-secondary flex items-center gap-2" disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        <button type="button" onClick={handleExport} className="btn btn-secondary flex items-center gap-2" disabled={!wards.length}>
          <Download className="w-4 h-4" />
          Export CSV
        </button>
        <button type="button" onClick={() => window.print()} className="btn btn-secondary flex items-center gap-2">
          <FileDown className="w-4 h-4" />
          Print / PDF
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && !wards.length ? (
          <div className="col-span-full card text-center py-12">
            <div className="spinner spinner-md mx-auto" />
            <p className="text-gray-500 mt-2">Loading wards...</p>
          </div>
        ) : wards.length === 0 ? (
          <div className="col-span-full card text-center py-12">
            <MapPin className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No wards found.</p>
          </div>
        ) : (
          wards.map((ward) => (
            <div key={ward.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{ward.wardName}</h3>
                  <p className="text-sm text-gray-500">{formatWardNumber(ward.wardNumber)}</p>
                </div>
                <span className={`badge ${ward.isActive ? 'badge-success' : 'badge-danger'}`}>
                  {ward.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="space-y-2 mb-4">
                {ward.ulb && (
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
                    {ward.ulb.name}
                  </div>
                )}
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
                  {ward.collector ? (ward.collector.full_name || `${ward.collector.firstName || ''} ${ward.collector.lastName || ''}`).trim() || '—' : 'Not Assigned'}
                </div>
                {ward.collector?.email && (
                  <div className="text-xs text-gray-500 ml-6">{ward.collector.email}</div>
                )}
              </div>
              {ward.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{ward.description}</p>
              )}
              <div className="flex justify-end pt-4 border-t">
                <Link
                  to={`/sbm/wards/${ward.id}`}
                  className="text-violet-600 hover:text-violet-800 flex items-center text-sm font-medium"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View Details
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SBMWards;
