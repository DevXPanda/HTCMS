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
        <div className="spinner spinner-md" />
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
      <div className="ds-page-header flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="ds-page-title">Reports & Analytics</h1>
          <p className="ds-page-subtitle">View comprehensive reports and analytics</p>
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="input"
          />
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="input"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-card-title flex items-center justify-between">
            <span>Total Facilities</span>
            <BarChart3 className="w-6 h-6 text-primary-600" />
          </div>
          <p className="stat-card-value">{stats.totalFacilities}</p>
          <div className="mt-2 flex items-center text-sm text-gray-500">
            <span className="text-green-600 font-medium">{stats.activeFacilities} Active</span>
            <span className="mx-2">•</span>
            <span className="text-yellow-600 font-medium">{stats.maintenanceFacilities} Maintenance</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-title flex items-center justify-between">
            <span>Inspection Rate</span>
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <p className="stat-card-value">{inspectionRate}%</p>
          <div className="mt-2 flex items-center text-sm text-gray-500">
            <span className="text-green-600 font-medium">{stats.passedInspections} Passed</span>
            <span className="mx-2">•</span>
            <span className="text-red-600 font-medium">{stats.failedInspections} Failed</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-title flex items-center justify-between">
            <span>Complaint Resolution</span>
            <AlertCircle className="w-6 h-6 text-blue-600" />
          </div>
          <p className="stat-card-value">{complaintResolutionRate}%</p>
          <div className="mt-2 flex items-center text-sm text-gray-500">
            <span className="text-green-600 font-medium">{stats.resolvedComplaints} Resolved</span>
            <span className="mx-2">•</span>
            <span className="text-yellow-600 font-medium">{stats.pendingComplaints} Pending</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-title flex items-center justify-between">
            <span>Maintenance Completion</span>
            <TrendingUp className="w-6 h-6 text-purple-600" />
          </div>
          <p className="stat-card-value">{maintenanceCompletionRate}%</p>
          <div className="mt-2 flex items-center text-sm text-gray-500">
            <span className="text-green-600 font-medium">{stats.completedMaintenance} Completed</span>
            <span className="mx-2">•</span>
            <span className="text-blue-600 font-medium">{stats.scheduledMaintenance} Scheduled</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="ds-section-title mb-4">Inspections Overview</h2>
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

        <div className="card">
          <h2 className="ds-section-title mb-4">Complaints Overview</h2>
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

      <div className="card">
        <h2 className="ds-section-title mb-4">Maintenance Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="stat-card">
            <div className="stat-card-title"><span>Total Maintenance</span></div>
            <p className="stat-card-value">{stats.totalMaintenance}</p>
          </div>
          <div className="stat-card">
            <div className="stat-card-title"><span>Completed</span></div>
            <p className="stat-card-value text-green-600">{stats.completedMaintenance}</p>
            <p className="text-xs text-gray-500 mt-1">{maintenanceCompletionRate}% completion rate</p>
          </div>
          <div className="stat-card">
            <div className="stat-card-title"><span>Scheduled</span></div>
            <p className="stat-card-value text-blue-600">{stats.scheduledMaintenance}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToiletReports;
