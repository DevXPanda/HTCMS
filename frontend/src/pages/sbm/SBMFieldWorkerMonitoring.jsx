import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, LayoutDashboard, AlertTriangle } from 'lucide-react';
import { fieldWorkerMonitoringAPI } from '../../services/api';
import api from '../../services/api';

const SBMFieldWorkerMonitoring = () => {
  const [eos, setEos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ulbId, setUlbId] = useState('');
  const [ulbs, setUlbs] = useState([]);

  useEffect(() => {
    api.get('/admin-management/ulbs').then((res) => {
      const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setUlbs(Array.isArray(data) ? data : []);
    }).catch(() => setUlbs([]));
  }, []);

  const fetchEos = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = ulbId ? { ulb_id: ulbId } : {};
      const res = await fieldWorkerMonitoringAPI.getEoList(params);
      if (res?.data?.success && Array.isArray(res.data.data)) {
        setEos(res.data.data);
      } else {
        setEos([]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load EO list');
      setEos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEos();
  }, [ulbId]);

  return (
    <div className="space-y-4">
      <div className="no-print">
        <h1 className="text-2xl font-bold text-gray-900">Field Worker Monitoring (Read-only)</h1>
        <p className="text-gray-600 text-sm mt-1">Same data as Super Admin. Monitor EOs and field worker attendance.</p>
      </div>

      <div className="no-print flex flex-wrap gap-3 items-center">
        <select value={ulbId} onChange={(e) => setUlbId(e.target.value)} className="input w-auto min-w-[180px]">
          <option value="">All ULBs</option>
          {ulbs.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <button type="button" onClick={fetchEos} className="btn btn-secondary flex items-center gap-2" disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">EO Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ULB</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned Wards</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Workers</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Present Today %</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Geo Violations</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase no-print">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center">
                    <div className="flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" /></div>
                  </td>
                </tr>
              ) : eos.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">No EOs found.</td>
                </tr>
              ) : (
                eos.map((eo) => (
                  <tr key={eo.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{eo.eo_name}</div>
                      <div className="text-xs text-gray-500">{eo.employee_id}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{eo.ulb_name ?? eo.ulb ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {Array.isArray(eo.assigned_wards) && eo.assigned_wards.length > 0 ? eo.assigned_wards.join(', ') : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{eo.total_workers}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${eo.present_today_pct >= 80 ? 'text-green-600' : eo.present_today_pct >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {eo.present_today_pct}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{eo.geo_violations ?? 0}</td>
                    <td className="px-4 py-3 print-hide-col">
                      <Link
                        to={`/sbm/field-worker-monitoring/eos/${eo.id}/dashboard`}
                        className="btn btn-primary text-sm py-1.5 px-3 inline-flex items-center gap-1"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        View Dashboard
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SBMFieldWorkerMonitoring;
