import React, { useMemo, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { demandAPI } from '../../services/api';
import { exportToCSV } from '../../utils/exportCSV';
import { FileText, Download, RefreshCw, Search, Eye, FileDown } from 'lucide-react';
import toast from 'react-hot-toast';

const SBMDemands = () => {
  const [searchParams] = useSearchParams();
  const [demands, setDemands] = useState([]);
  const [ulbs, setUlbs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ulbId, setUlbId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const moduleParamRaw = (searchParams.get('module') || '').trim();
  const moduleParam = moduleParamRaw ? moduleParamRaw.toUpperCase() : '';

  const moduleLabel = useMemo(() => {
    switch (moduleParam) {
      case 'PROPERTY': return 'House Tax / Demands';
      case 'WATER': return 'Water Tax / Demands';
      case 'SHOP': return 'Shop Tax / Demands';
      case 'D2DC': return 'D2DC / Demands';
      case 'UNIFIED': return 'Unified Tax Demand';
      default: return 'Demands';
    }
  }, [moduleParam]);

  const normalizeModuleForRow = (d) => {
    const st = String(d?.serviceType || '').toUpperCase();
    if (st === 'HOUSE_TAX') return 'PROPERTY';
    if (st === 'WATER_TAX') return 'WATER';
    if (st === 'SHOP_TAX') return 'SHOP';
    if (st === 'D2DC') return 'D2DC';
    return '';
  };

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
        ulb_id: ulbId || undefined,
        status: statusFilter || undefined,
        module: moduleParam || undefined
      };
      const res = await demandAPI.getAll(params);
      const data = res.data?.data ?? {};
      const list = Array.isArray(data.demands) ? data.demands : [];
      setDemands(list);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load demands');
      setDemands([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [ulbId, moduleParam]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleExport = () => {
    const rows = demands.map((d) => ({
      id: d.id,
      demandNumber: d.demandNumber,
      module: moduleParam || normalizeModuleForRow(d) || d.module || '',
      entityRef: d.entityRef ?? d.property_id ?? d.connection_id,
      totalAmount: d.totalAmount,
      status: d.status,
      financialYear: d.financialYear
    }));
    exportToCSV(rows, `sbm_demands_${new Date().toISOString().slice(0, 10)}`);
    toast.success('CSV downloaded');
  };

  const statusBadge = (s) => {
    const c = { paid: 'bg-green-100 text-green-800', overdue: 'bg-red-100 text-red-800', partially_paid: 'bg-blue-100 text-blue-800', pending: 'bg-amber-100 text-amber-800' };
    return c[s] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-4">
      <h1 className="print-only text-xl font-bold text-gray-900 mb-2">{moduleLabel}</h1>
      <div className="no-print">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-7 h-7 text-violet-600" />
          {moduleLabel} (Read-only)
        </h1>
        <p className="text-gray-600 text-sm">View demands across ULBs. Filter by ULB and status, export CSV.</p>
      </div>

      <div className="no-print flex flex-wrap gap-3 items-end">
        <select value={ulbId} onChange={(e) => setUlbId(e.target.value)} className="input w-auto min-w-[180px]">
          <option value="">All ULBs</option>
          {ulbs.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-auto min-w-[120px]">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-0 max-w-md">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by demand number, entity..."
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
        <button type="button" onClick={handleExport} className="btn btn-secondary flex items-center gap-2" disabled={!demands.length}>
          <Download className="w-4 h-4" />
          Export CSV
        </button>
        <button type="button" onClick={() => window.print()} className="btn btn-secondary flex items-center gap-2">
          <FileDown className="w-4 h-4" />
          Print / PDF
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        {loading && !demands.length ? (
          <div className="p-8 flex justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-violet-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Demand #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Module</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity Ref</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">FY</th>
                  <th className="print-hide-col px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {demands.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{d.demandNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{moduleParam || normalizeModuleForRow(d) || d.module || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{d.entityRef ?? d.property_id ?? d.connection_id ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{d.totalAmount != null ? Number(d.totalAmount).toFixed(2) : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge(d.status)}`}>{d.status || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{d.financialYear || '—'}</td>
                    <td className="print-hide-col px-4 py-3">
                      <Link
                        to={`/sbm/demands/${d.id}${moduleParam ? `?module=${encodeURIComponent(moduleParam)}` : ''}`}
                        className="text-violet-600 hover:text-violet-800 flex items-center gap-1 text-sm"
                      >
                        <Eye className="w-4 h-4" /> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !demands.length && (
          <div className="p-8 text-center text-gray-500">No demands found.</div>
        )}
      </div>
    </div>
  );
};

export default SBMDemands;
