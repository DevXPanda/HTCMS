import React, { useState, useEffect } from 'react';
import { useBackTo } from '../../../contexts/NavigationContext';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar
} from 'lucide-react';
import api from '../../../services/api';

const ToiletReports = () => {
  useBackTo('/toilet-management');
  const [stats, setStats] = useState({
    totalFacilities: 0,
    activeFacilities: 0,
    maintenanceFacilities: 0,
    totalInspections: 0,
    passedInspections: 0,
    failedInspections: 0,
    totalComplaints: 0,
    pendingComplaints: 0,
    resolvedComplaints: 0,
    totalMaintenance: 0,
    completedMaintenance: 0,
    scheduledMaintenance: 0
  });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchReports();
  }, [dateRange]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await api.get('/toilet/reports/stats', { params: dateRange });
      if (response.data && response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const inspectionRate = stats.totalInspections > 0
    ? ((stats.passedInspections / stats.totalInspections) * 100).toFixed(1)
    : 0;

  const complaintResolutionRate = stats.totalComplaints > 0
    ? ((stats.resolvedComplaints / stats.totalComplaints) * 100).toFixed(1)
    : 0;

  const maintenanceCompletionRate = stats.totalMaintenance > 0
    ? ((stats.completedMaintenance / stats.totalMaintenance) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 text-sm">View comprehensive reports and analytics</p>
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Facilities</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalFacilities}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-primary-600" />
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 font-medium">{stats.activeFacilities} Active</span>
            <span className="text-gray-400 mx-2">•</span>
            <span className="text-yellow-600 font-medium">{stats.maintenanceFacilities} Maintenance</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Inspection Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{inspectionRate}%</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 font-medium">{stats.passedInspections} Passed</span>
            <span className="text-gray-400 mx-2">•</span>
            <span className="text-red-600 font-medium">{stats.failedInspections} Failed</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Complaint Resolution</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{complaintResolutionRate}%</p>
            </div>
            <AlertCircle className="w-8 h-8 text-blue-600" />
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 font-medium">{stats.resolvedComplaints} Resolved</span>
            <span className="text-gray-400 mx-2">•</span>
            <span className="text-yellow-600 font-medium">{stats.pendingComplaints} Pending</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Maintenance Completion</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{maintenanceCompletionRate}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-600" />
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-green-600 font-medium">{stats.completedMaintenance} Completed</span>
            <span className="text-gray-400 mx-2">•</span>
            <span className="text-blue-600 font-medium">{stats.scheduledMaintenance} Scheduled</span>
          </div>
        </div>
      </div>

      {/* Detailed Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inspections Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Inspections Overview</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Total Inspections</span>
                <span className="font-medium">{stats.totalInspections}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full"
                  style={{ width: '100%' }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Passed</span>
                <span className="font-medium text-green-600">{stats.passedInspections}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${inspectionRate}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Failed</span>
                <span className="font-medium text-red-600">{stats.failedInspections}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-red-600 h-2 rounded-full"
                  style={{ width: `${100 - inspectionRate}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Complaints Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Complaints Overview</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Total Complaints</span>
                <span className="font-medium">{stats.totalComplaints}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full"
                  style={{ width: '100%' }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Resolved</span>
                <span className="font-medium text-green-600">{stats.resolvedComplaints}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${complaintResolutionRate}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Pending</span>
                <span className="font-medium text-yellow-600">{stats.pendingComplaints}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-yellow-600 h-2 rounded-full"
                  style={{ width: `${100 - complaintResolutionRate}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Maintenance Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Maintenance Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-500">Total Maintenance</div>
            <div className="text-2xl font-bold text-gray-900 mt-2">{stats.totalMaintenance}</div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-500">Completed</div>
            <div className="text-2xl font-bold text-green-600 mt-2">{stats.completedMaintenance}</div>
            <div className="text-xs text-gray-500 mt-1">{maintenanceCompletionRate}% completion rate</div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-500">Scheduled</div>
            <div className="text-2xl font-bold text-blue-600 mt-2">{stats.scheduledMaintenance}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToiletReports;
