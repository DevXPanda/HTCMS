import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { exportToCSV } from '../../utils/exportCSV';
import { Building2, Download, RefreshCw, Search, MapPin, FileDown, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

const ULB_TYPE_OPTIONS = [
  { value: 'NAGAR_NIGAM', label: 'Nagar Nigam' },
  { value: 'NAGAR_PALIKA_PARISHAD', label: 'Nagar Palika Parishad' },
  { value: 'NAGAR_PANCHAYAT', label: 'Nagar Panchayat' }
];
const ulbTypeLabel = (value) => ULB_TYPE_OPTIONS.find((o) => o.value === value)?.label || value || '—';

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
          ULB Management (Read-only)
        </h1>
        <p className="text-gray-600 text-sm">Same view as Super Admin — create and manage ULBs. SBM view-only.</p>
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

      {/* Card grid — same as Super Admin ULB Management, read-only */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading && !list.length ? (
          <div className="col-span-full card text-center py-12">
            <div className="spinner spinner-md mx-auto" />
            <p className="text-gray-500 mt-2">Loading ULBs...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full card text-center py-12">
            <Building2 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No ULBs found.</p>
          </div>
        ) : (
          filtered.map((ulb) => (
            <div key={ulb.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary-600" />
                  <h3 className="text-lg font-semibold text-gray-900">{ulb.name}</h3>
                </div>
                <span className={`badge ${ulb.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                  {ulb.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                </span>
              </div>
              {ulb.ulb_type && (
                <div className="text-sm text-gray-600 mb-2">
                  <span className="font-medium text-gray-700">Type: </span>
                  {ulbTypeLabel(ulb.ulb_type)}
                </div>
              )}
              <div className="space-y-2 mb-4">
                {ulb.state && (
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
                    <span>State: {ulb.state}</span>
                  </div>
                )}
                {ulb.district && (
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
                    <span>District: {ulb.district}</span>
                  </div>
                )}
                {!ulb.state && !ulb.district && (
                  <p className="text-sm text-gray-500">No location set</p>
                )}
              </div>
              <div className="flex justify-end pt-4 border-t border-gray-100">
                <Link to={`/sbm/ulbs/${ulb.id}`} className="text-violet-600 hover:text-violet-800 flex items-center gap-1 text-sm font-medium">
                  <Eye className="w-4 h-4" /> View Details
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SBMUlbs;
