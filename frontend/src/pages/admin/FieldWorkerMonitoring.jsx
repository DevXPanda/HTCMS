import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, LayoutDashboard, AlertTriangle } from 'lucide-react';
import { fieldWorkerMonitoringAPI } from '../../services/api';
import { useSelectedUlb } from '../../contexts/SelectedUlbContext';

const FieldWorkerMonitoring = () => {
  const { effectiveUlbId } = useSelectedUlb();
  const [eos, setEos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEos = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = effectiveUlbId ? { ulb_id: effectiveUlbId } : {};
      const res = await fieldWorkerMonitoringAPI.getEoList(params);
      // Check if response is successful and has data array
      if (res?.data?.success && Array.isArray(res.data.data)) {
        setEos(res.data.data);
      } else {
        // Success but unexpected format
        setEos([]);
      }
    } catch (err) {
      // Only show error for actual API failures (4xx, 5xx), not empty results
      const status = err.response?.status;
      if (status === 404 || status === 403) {
        setError('Access denied or endpoint not found. Please ensure you have proper permissions.');
      } else if (status >= 500) {
        setError('Server error. Please try again later.');
      } else {
        setError(err.response?.data?.message || 'Failed to load EO list');
      }
      setEos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEos();
  }, [effectiveUlbId]);

  return (
    <div className="space-y-8">
      <div className="ds-page-header">
        <div>
          <h1 className="ds-page-title">Field Worker Monitoring</h1>
          <p className="ds-page-subtitle">Monitor EOs and field worker attendance</p>
        </div>
        <button type="button" onClick={fetchEos} className="btn btn-primary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="table-wrap">
        <table className="table">
          <thead>
              <tr>
                <th>EO Name</th>
                <th>ULB</th>
                <th>Assigned Wards</th>
                <th>Total Workers</th>
                <th>Present Today %</th>
                <th>Geo Violations</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                    </div>
                  </td>
                </tr>
              ) : eos.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    No EOs found. Add EO role staff from Staff Management.
                  </td>
                </tr>
              ) : (
                eos.map((eo) => (
                  <tr key={eo.id}>
                    <td>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{eo.eo_name}</div>
                        <div className="text-xs text-gray-500">{eo.employee_id}</div>
                      </div>
                    </td>
                    <td>{eo.ulb_name ?? eo.ulb ?? '-'}</td>
                    <td>{Array.isArray(eo.assigned_wards) && eo.assigned_wards.length > 0 ? eo.assigned_wards.join(', ') : '-'}</td>
                    <td>{eo.total_workers}</td>
                    <td>
                      <span className={`text-sm font-medium ${eo.present_today_pct >= 80 ? 'text-green-600' : eo.present_today_pct >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {eo.present_today_pct}%
                      </span>
                    </td>
                    <td>{eo.geo_violations ?? 0}</td>
                    <td>
                      <Link
                        to={`/field-worker-monitoring/eos/${eo.id}/dashboard`}
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
  );
};

export default FieldWorkerMonitoring;
