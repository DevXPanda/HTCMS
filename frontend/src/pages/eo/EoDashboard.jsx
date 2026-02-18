import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Users,
  UserX,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  LayoutDashboard,
  Calendar,
  Download,
  FileText,
  TrendingUp,
  DollarSign,
  Eye,
  Image as ImageIcon,
  UserPlus,
  Settings
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { fieldWorkerMonitoringAPI } from '../../services/api';
import toast from 'react-hot-toast';

const EoDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payrollData, setPayrollData] = useState(null);
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [selectedPayrollMonth, setSelectedPayrollMonth] = useState(new Date().getMonth() + 1);
  const [selectedPayrollYear, setSelectedPayrollYear] = useState(new Date().getFullYear());
  const [selectedWardFilter, setSelectedWardFilter] = useState('all');

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fieldWorkerMonitoringAPI.getEoDashboardForSelf();
      setData(res?.data?.data ?? null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayrollPreview = async () => {
    try {
      setPayrollLoading(true);
      const res = await fieldWorkerMonitoringAPI.getPayrollPreview({
        month: selectedPayrollMonth,
        year: selectedPayrollYear
      });
      setPayrollData(res?.data?.data ?? null);
    } catch (err) {
      console.error('Error fetching payroll:', err);
      toast.error('Failed to load payroll preview');
      setPayrollData(null);
    } finally {
      setPayrollLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (selectedPayrollMonth && selectedPayrollYear) {
      fetchPayrollPreview();
    }
  }, [selectedPayrollMonth, selectedPayrollYear]);

  const handleExportAttendance = () => {
    toast.info('Export feature coming soon');
  };

  const handleExportWardPerformance = () => {
    toast.info('Export feature coming soon');
  };

  if (loading && !data) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
        <button
          onClick={fetchDashboard}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  const eo = data?.eo || {};
  const summary = data?.summary || {};
  const wardWise = data?.ward_wise_attendance || [];
  const supervisorPerformance = data?.supervisor_performance || [];
  const absentWorkers = data?.workers_absent_today || [];
  const geoAlerts = data?.geo_violation_alerts || [];
  const monthlyTrend = data?.monthly_attendance_trend || [];

  // Filter monthly trend by ward if selected
  const filteredMonthlyTrend = selectedWardFilter === 'all'
    ? monthlyTrend
    : monthlyTrend; // Ward filtering would require backend changes

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">EO Dashboard</h1>
          <p className="text-gray-600">
            {eo.full_name} ({eo.employee_id})
            {eo.ulb_name && ` · ${eo.ulb_name}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportAttendance}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            Export Attendance
          </button>
          <button
            onClick={handleExportWardPerformance}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <FileText className="w-4 h-4" />
            Export Ward Report
          </button>
          <button
            type="button"
            onClick={fetchDashboard}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Workers</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{summary.total_workers || 0}</p>
            </div>
            <Users className="w-10 h-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Present Today</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{summary.present_today || 0}</p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Absent Today</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{summary.absent_today || 0}</p>
            </div>
            <UserX className="w-10 h-10 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Attendance %</p>
              <p className={`text-2xl font-bold mt-1 ${(summary.attendance_pct || 0) >= 80 ? 'text-green-600' : (summary.attendance_pct || 0) >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                {summary.attendance_pct || 0}%
              </p>
            </div>
            <TrendingUp className="w-10 h-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Geo Violations</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{summary.geo_violations_today || 0}</p>
            </div>
            <MapPin className="w-10 h-10 text-orange-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Supervisor Reporting</p>
              <p className={`text-2xl font-bold mt-1 ${(summary.supervisor_reporting_pct || 0) >= 80 ? 'text-green-600' : (summary.supervisor_reporting_pct || 0) >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                {summary.supervisor_reporting_pct || 0}%
              </p>
            </div>
            <LayoutDashboard className="w-10 h-10 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Worker Management Section Card */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserPlus className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Worker Management</h2>
              <p className="text-sm text-gray-600">Create and manage field workers</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/eo/workers')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Manage Workers
          </button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Total Workers</span>
                <Users className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{summary.total_workers || 0}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Active Workers</span>
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-2xl font-bold text-green-600">{summary.present_today || 0}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Quick Actions</span>
                <UserPlus className="w-5 h-5 text-blue-400" />
              </div>
              <button
                onClick={() => navigate('/eo/workers')}
                className="mt-2 w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create New Worker
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Ward-wise Attendance Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Ward-wise Attendance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ward Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Workers</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Present Today</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attendance %</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Geo Violations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {wardWise.map((row) => (
                <tr key={row.ward_id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.ward_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{row.total_workers}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{row.present_today}</td>
                  <td className="px-6 py-4">
                    <span className={`font-medium ${row.attendance_pct >= 80 ? 'text-green-600' : row.attendance_pct >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {row.attendance_pct}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{row.geo_violations || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Supervisor Performance Panel */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Supervisor Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supervisor Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ward</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Workers</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attendance %</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tasks Completed</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marked Today</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {supervisorPerformance.map((row) => (
                <tr key={row.supervisor_id}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{row.full_name}</div>
                    <div className="text-xs text-gray-500">{row.employee_id}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{row.ward_name || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{row.workers_count}</td>
                  <td className="px-6 py-4">
                    <span className={`font-medium ${row.attendance_pct >= 80 ? 'text-green-600' : row.attendance_pct >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {row.attendance_pct}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{row.tasks_completed_today || 0}</td>
                  <td className="px-6 py-4">
                    {row.marked_today ? (
                      <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle className="w-4 h-4" /> Yes ({row.marks_count_today})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-600 text-sm">
                        <XCircle className="w-4 h-4" /> No
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Absent Workers Section */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Absent Workers</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Worker Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ward</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supervisor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Consecutive Absent Days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {absentWorkers.map((w) => (
                <tr key={w.worker_id}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{w.full_name}</div>
                    {w.mobile && <div className="text-xs text-gray-500">{w.mobile}</div>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{w.ward_name || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{w.supervisor_name || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`font-medium ${w.consecutive_absent_days >= 3 ? 'text-red-600' : 'text-yellow-600'}`}>
                      {w.consecutive_absent_days || 0} days
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Geo Violation Alerts */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Geo Violation Alerts
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Worker Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ward</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Photo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {geoAlerts.map((a) => (
                <tr key={a.id}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{a.worker_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{a.ward_name || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{a.location || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {a.checkin_time ? new Date(a.checkin_time).toLocaleTimeString() : '-'}
                  </td>
                  <td className="px-6 py-4">
                    {a.photo_url ? (
                      <a
                        href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${a.photo_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                      >
                        <ImageIcon className="w-4 h-4" />
                        View
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Attendance Trend Chart */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Monthly Attendance Trend</h2>
          <select
            value={selectedWardFilter}
            onChange={(e) => setSelectedWardFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          >
            <option value="all">All Wards</option>
            {wardWise.map((ward) => (
              <option key={ward.ward_id} value={ward.ward_id}>{ward.ward_name}</option>
            ))}
          </select>
        </div>
        {filteredMonthlyTrend.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredMonthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip formatter={(value) => [`${value}%`, 'Attendance %']} labelFormatter={(l) => `Month: ${l}`} />
                <Line type="monotone" dataKey="attendance_pct" stroke="#2563eb" strokeWidth={2} name="Attendance %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No trend data available</p>
        )}
      </div>

      {/* Payroll Preview Section */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Payroll Preview
          </h2>
          <div className="flex gap-2">
            <select
              value={selectedPayrollMonth}
              onChange={(e) => setSelectedPayrollMonth(parseInt(e.target.value))}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{new Date(2024, m - 1).toLocaleString('default', { month: 'long' })}</option>
              ))}
            </select>
            <select
              value={selectedPayrollYear}
              onChange={(e) => setSelectedPayrollYear(parseInt(e.target.value))}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              {Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - 1 + i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {payrollLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : payrollData ? (
          <div className="space-y-4">
            {/* Contractor Summary */}
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Contractor Summary</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Contractor</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Workers</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Total Present Days</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Total Payable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {payrollData.contractor_summary?.map((contractor, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2">{contractor.contractor_name}</td>
                        <td className="px-4 py-2">{contractor.workers.length}</td>
                        <td className="px-4 py-2">{contractor.total_present_days}</td>
                        <td className="px-4 py-2">₹{contractor.total_payable.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Worker-wise Details */}
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Worker-wise Details</h3>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Worker</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Present Days</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Payable Amount</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">EO Status</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-700">Admin Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {payrollData.worker_wise?.map((worker, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2">{worker.worker_name}</td>
                        <td className="px-4 py-2">{worker.present_days}</td>
                        <td className="px-4 py-2">₹{Number(worker.payable_amount).toLocaleString()}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${worker.eo_verification_status === 'verified' ? 'bg-green-100 text-green-800' :
                            worker.eo_verification_status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                            {worker.eo_verification_status}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${worker.admin_approval_status === 'approved' ? 'bg-green-100 text-green-800' :
                            worker.admin_approval_status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                            {worker.admin_approval_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No payroll data available</p>
        )}
      </div>
    </div>
  );
};

export default EoDashboard;
