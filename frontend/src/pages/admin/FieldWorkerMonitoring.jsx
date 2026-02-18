import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw, LayoutDashboard, AlertTriangle } from 'lucide-react';
import { fieldWorkerMonitoringAPI } from '../../services/api';

const FieldWorkerMonitoring = () => {
  const [eos, setEos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEos = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fieldWorkerMonitoringAPI.getEoList();
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
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Field Worker Monitoring</h1>
          <p className="text-gray-600">Monitor EOs and field worker attendance</p>
        </div>
        <button
          type="button"
          onClick={fetchEos}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
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

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">EO Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ULB</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Wards</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Workers</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Present Today %</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Geo Violations</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
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
                  <tr key={eo.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{eo.eo_name}</div>
                        <div className="text-xs text-gray-500">{eo.employee_id}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{eo.ulb}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {Array.isArray(eo.assigned_wards) && eo.assigned_wards.length > 0 ? eo.assigned_wards.join(', ') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{eo.total_workers}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${eo.present_today_pct >= 80 ? 'text-green-600' : eo.present_today_pct >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {eo.present_today_pct}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{eo.geo_violations ?? 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/field-worker-monitoring/eos/${eo.id}/dashboard`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
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

export default FieldWorkerMonitoring;
