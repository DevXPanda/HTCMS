import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  UserX,
  CheckSquare,
  AlertTriangle,
  Percent,
  ArrowLeft,
  Calendar
} from 'lucide-react';
import { fieldWorkerMonitoringAPI } from '../../services/api';

const formatDate = (d) => {
  const t = new Date(d);
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const day = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const FieldWorkerEoDashboard = () => {
  const { eoId } = useParams();
  const navigate = useNavigate();
  const today = formatDate(new Date());
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    if (!eoId) return;
    try {
      setLoading(true);
      setError(null);

      // Get ulb_id from URL query params
      const urlParams = new URLSearchParams(window.location.search);
      const ulbId = urlParams.get('ulb_id');

      const params = {
        startDate,
        endDate
      };
      if (ulbId) {
        params.ulb_id = ulbId;
      }

      const res = await fieldWorkerMonitoringAPI.getEoDashboard(eoId, params);
      setData(res?.data?.data ?? null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [eoId, startDate, endDate]);

  const cards = data ? [
    { title: 'Total Workers', value: data.total_workers, icon: Users, color: 'bg-blue-500' },
    { title: 'Present Today', value: data.present_today, icon: UserCheck, color: 'bg-green-500' },
    { title: 'Absent Today', value: data.absent_today, icon: UserX, color: 'bg-amber-500' },
    { title: 'Tasks Completed', value: data.tasks_completed, icon: CheckSquare, color: 'bg-indigo-500' },
    { title: 'Geo Violations', value: data.geo_violations, icon: AlertTriangle, color: 'bg-red-500' },
    { title: 'Contractor Compliance %', value: `${data.contractor_compliance_pct}%`, icon: Percent, color: 'bg-teal-500' }
  ] : [];

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          type="button"
          onClick={() => navigate('/field-worker-monitoring')}
          className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">EO Dashboard</h1>
          {data?.eo && (
            <p className="text-gray-600">
              {data.eo.full_name} ({data.eo.employee_id})
              {data.eo.assigned_ulb && ` · ${data.eo.assigned_ulb}`}
            </p>
          )}
        </div>
      </div>

      {/* Date range filter */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Calendar className="w-4 h-4" />
            Date range
          </div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <div
              key={card.title}
              className="bg-white rounded-lg shadow border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${card.color}`}>
                  <card.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FieldWorkerEoDashboard;
