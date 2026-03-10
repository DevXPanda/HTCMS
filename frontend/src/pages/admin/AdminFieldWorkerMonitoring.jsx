import React, { useState, useEffect } from 'react';
import { Filter, Calendar, Users, DollarSign, Building2, AlertTriangle, FileText, RefreshCw, Download, Eye, Image as ImageIcon, X, UserPlus, MapPin } from 'lucide-react';
import { fieldWorkerMonitoringAPI, wardAPI, workerAPI } from '../../services/api';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Loading from '../../components/Loading';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const AdminFieldWorkerMonitoring = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [activeTab, setActiveTab] = useState('attendance');
  
  const [filters, setFilters] = useState({
    ulb: '',
    wardId: '',
    eoId: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10)
  });

  const [ulbs, setUlbs] = useState([]);
  const [wards, setWards] = useState([]);
  const [eos, setEos] = useState([]);
  
  // Worker Management state
  const [workers, setWorkers] = useState([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [showWorkerDetailsModal, setShowWorkerDetailsModal] = useState(false);
  
  // Ensure arrays are always arrays to prevent .map() crashes
  const safeUlbs = Array.isArray(ulbs) ? ulbs : [];
  const safeWards = Array.isArray(wards) ? wards : [];
  const safeEos = Array.isArray(eos) ? eos : [];

  useEffect(() => {
    fetchFilterOptions().catch(err => {
      console.error('Error in fetchFilterOptions:', err);
    });
  }, []);

  useEffect(() => {
    fetchDashboard().catch(err => {
      console.error('Error in fetchDashboard:', err);
    });
  }, [filters]);

  useEffect(() => {
    if (activeTab === 'workers') {
      fetchWorkers();
    }
  }, [activeTab, filters.ulb, filters.wardId, filters.eoId]);

  const fetchFilterOptions = async () => {
    try {
      const [wardsRes, eosRes, ulbsRes] = await Promise.all([
        wardAPI.getAll().catch(err => {
          console.error('wardAPI.getAll error:', err);
          return { data: { wards: [], data: [] } };
        }),
        api.get('/admin-management/employees?role=eo&limit=200').catch(err => {
          console.error('admin-management employees error:', err);
          return { data: { employees: [] } };
        }),
        api.get('/admin-management/ulbs').catch(err => {
          console.error('admin-management ulbs error:', err);
          return { data: [] };
        })
      ]);

      setWards(wardsRes.data?.wards || wardsRes.data?.data?.wards || []);
      setEos(eosRes.data?.employees || []);
      setUlbs(Array.isArray(ulbsRes.data) ? ulbsRes.data : []);
    } catch (error) {
      console.error('Failed to fetch filter options:', error);
      toast.error('Failed to load filter options');
      // Set empty arrays to prevent crashes
      setWards([]);
      setEos([]);
      setUlbs([]);
    }
  };

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.ulb) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(filters.ulb);
        if (isUuid) params.ulb_id = filters.ulb; else params.ulb = filters.ulb;
      }
      if (filters.wardId) params.wardId = filters.wardId;
      if (filters.eoId) params.eoId = filters.eoId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await fieldWorkerMonitoringAPI.getAdminDashboard(params);
      if (response?.data?.success && response.data.data) {
        const data = response.data.data;
        // Ensure all required properties exist with safe defaults
        setDashboardData({
          attendance_summary: data.attendance_summary || {
            total_workers: 0,
            present_today: 0,
            absent_today: 0,
            total_attendance_records: 0,
            ulb_wise: [],
            ward_wise: []
          },
          payroll_preview: Array.isArray(data.payroll_preview) ? data.payroll_preview : [],
          contractor_performance: Array.isArray(data.contractor_performance) ? data.contractor_performance : [],
          geo_violations: Array.isArray(data.geo_violations) ? data.geo_violations : [],
          audit_logs: Array.isArray(data.audit_logs) ? data.audit_logs : []
        });
      } else {
        setDashboardData({
          attendance_summary: { total_workers: 0, present_today: 0, absent_today: 0, total_attendance_records: 0, ulb_wise: [], ward_wise: [] },
          payroll_preview: [],
          contractor_performance: [],
          geo_violations: [],
          audit_logs: []
        });
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
      const status = error.response?.status;
      if (status === 404 || status === 403) {
        toast.error('Access denied or endpoint not found. Please ensure you have proper permissions.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to load dashboard data');
      }
      // Set empty data structure to prevent crashes
      setDashboardData({
        attendance_summary: { total_workers: 0, present_today: 0, absent_today: 0, total_attendance_records: 0, ulb_wise: [], ward_wise: [] },
        payroll_preview: [],
        contractor_performance: [],
        geo_violations: [],
        audit_logs: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      ulb: '',
      wardId: '',
      eoId: '',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10)
    });
  };

  const fetchWorkers = async () => {
    try {
      setLoadingWorkers(true);
      const params = {};
      
      // Handle ULB filter - use ulb_id directly if it's a UUID, otherwise find by name
      if (filters.ulb) {
        // Check if it's a UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(filters.ulb)) {
          params.ulb_id = filters.ulb;
        } else {
          // Find ULB by name from the ulbs list
          const matchedUlb = safeUlbs.find(u => u.name === filters.ulb || u.id === filters.ulb);
          if (matchedUlb) {
            params.ulb_id = matchedUlb.id;
          }
        }
      }
      
      if (filters.wardId) params.ward_id = filters.wardId;
      if (filters.eoId) params.eo_id = filters.eoId;
      
      const res = await workerAPI.getAllWorkers(params);
      if (res.data.success) {
        setWorkers(res.data.data.workers || []);
      } else {
        setWorkers([]);
      }
    } catch (err) {
      console.error('Error fetching workers:', err);
      toast.error('Failed to load workers');
      setWorkers([]);
    } finally {
      setLoadingWorkers(false);
    }
  };

  if (loading && !dashboardData) {
    return <Loading />;
  }

  // Ensure dashboardData is always defined to prevent crashes
  if (!dashboardData) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">No data available. Please check your permissions or try refreshing.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'attendance', label: 'Attendance Summary', icon: Users },
    { id: 'workers', label: 'Worker Management', icon: UserPlus },
    { id: 'payroll', label: 'Payroll Preview', icon: DollarSign },
    { id: 'contractor', label: 'Contractor Performance', icon: Building2 },
    { id: 'geo', label: 'Geo Violations', icon: AlertTriangle },
    { id: 'audit', label: 'Audit Logs', icon: FileText }
  ];

  return (
    <div className="space-y-6">
      <div className="ds-page-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="ds-page-title">Admin Field Worker Monitoring</h1>
          <p className="ds-page-subtitle">Comprehensive monitoring of field workers across all ULBs</p>
        </div>
        <button type="button" onClick={fetchDashboard} className="btn btn-primary shrink-0">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <section className="mb-6">
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="ds-section-title mb-0 flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              Filters
            </h2>
            <button type="button" onClick={clearFilters} className="text-sm text-primary-600 hover:text-primary-700">
              Clear All
            </button>
          </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="label">ULB</label>
            <select
              value={filters.ulb}
              onChange={(e) => handleFilterChange('ulb', e.target.value)}
              className="input"
            >
              <option value="">All ULBs</option>
              {safeUlbs.map(ulb => (
                <option key={ulb.id || ulb} value={typeof ulb === 'string' ? ulb : ulb.id}>
                  {typeof ulb === 'string' ? ulb : ulb.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Ward</label>
            <select
              value={filters.wardId}
              onChange={(e) => handleFilterChange('wardId', e.target.value)}
              className="input"
            >
              <option value="">All Wards</option>
              {safeWards.map(ward => (
                <option key={ward.id} value={ward.id}>
                  {ward.wardNumber} - {ward.wardName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">EO</label>
            <select
              value={filters.eoId}
              onChange={(e) => handleFilterChange('eoId', e.target.value)}
              className="input"
            >
              <option value="">All EOs</option>
              {safeEos.map(eo => (
                <option key={eo.id} value={eo.id}>
                  {eo.full_name} ({eo.employee_id})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="input"
            />
          </div>
        </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex flex-wrap gap-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 bg-primary-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {dashboardData && dashboardData.attendance_summary && (
        <div className="card">
          <section className="space-y-6">
          {activeTab === 'attendance' && (
            <div className="space-y-6">
              <h2 className="ds-section-title mb-0">Attendance Summary</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="stat-card">
                  <div className="stat-card-title">
                    <span>TOTAL WORKERS</span>
                    <Users className="h-4 w-4 text-blue-500 shrink-0" />
                  </div>
                  <p className="stat-card-value text-blue-600">{dashboardData.attendance_summary?.total_workers ?? 0}</p>
                </div>
                <div className="stat-card">
                  <div className="stat-card-title">
                    <span>PRESENT TODAY</span>
                    <span className="h-2.5 w-2.5 rounded-full bg-green-500 shrink-0" aria-hidden />
                  </div>
                  <p className="stat-card-value text-green-600">{dashboardData.attendance_summary?.present_today ?? 0}</p>
                </div>
                <div className="stat-card">
                  <div className="stat-card-title">
                    <span>ABSENT TODAY</span>
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500 shrink-0" aria-hidden />
                  </div>
                  <p className="stat-card-value text-red-600">{dashboardData.attendance_summary?.absent_today ?? 0}</p>
                </div>
                <div className="stat-card">
                  <div className="stat-card-title">
                    <span>TOTAL RECORDS</span>
                    <FileText className="h-4 w-4 text-purple-500 shrink-0" />
                  </div>
                  <p className="stat-card-value text-purple-600">{dashboardData.attendance_summary?.total_attendance_records ?? 0}</p>
                </div>
              </div>

              <div>
                <h3 className="ds-section-title mb-0">ULB-wise Attendance</h3>
                <div className="table-wrap mt-2">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>ULB</th>
                        <th>TOTAL WORKERS</th>
                        <th>PRESENT TODAY</th>
                        <th>ATTENDANCE %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(dashboardData.attendance_summary?.ulb_wise || []).length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center text-gray-500 py-8">No ULB data for the selected filters.</td>
                        </tr>
                      ) : (
                        (dashboardData.attendance_summary?.ulb_wise || []).map((item, idx) => (
                          <tr key={item.ulb_id || idx}>
                            <td className="font-medium">{item.ulb || '-'}</td>
                            <td>{item.total_workers}</td>
                            <td>{item.present_today}</td>
                            <td>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${item.attendance_pct >= 80 ? 'bg-green-100 text-green-800' : item.attendance_pct >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                {item.attendance_pct}%
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="ds-section-title mb-0">Ward-wise Attendance</h3>
                <div className="table-wrap mt-2">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>WARD</th>
                        <th>TOTAL WORKERS</th>
                        <th>PRESENT TODAY</th>
                        <th>ATTENDANCE %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(dashboardData.attendance_summary?.ward_wise || []).length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center text-gray-500 py-8">No ward data for the selected filters.</td>
                        </tr>
                      ) : (
                        (dashboardData.attendance_summary?.ward_wise || []).map((item, idx) => (
                          <tr key={item.ward_id || idx}>
                            <td className="font-medium">{item.ward_name ?? '-'}</td>
                            <td>{item.total_workers}</td>
                            <td>{item.present_today}</td>
                            <td>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${item.attendance_pct >= 80 ? 'bg-green-100 text-green-800' : item.attendance_pct >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                                {item.attendance_pct}%
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'workers' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="ds-section-title mb-0">Worker Management</h2>
                <button
                  type="button"
                  onClick={fetchWorkers}
                  className="btn btn-secondary text-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>

              {loadingWorkers ? (
                <div className="card p-8 text-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Loading workers...</p>
                </div>
              ) : workers.length === 0 ? (
                <div className="card p-8 text-center text-gray-500">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p>No workers found.</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Employee Code</th>
                        <th>Name</th>
                        <th>Mobile</th>
                        <th>Worker Type</th>
                        <th>Ward</th>
                        <th>Supervisor</th>
                        <th>EO</th>
                        <th>ULB</th>
                        <th>Status</th>
                        <th>Proofs</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workers.map((worker) => (
                        <tr key={worker.id}>
                          <td className="font-medium">{worker.employee_code}</td>
                          <td className="font-medium">{worker.full_name}</td>
                          <td>{worker.mobile || '-'}</td>
                          <td>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              worker.worker_type === 'ULB' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {worker.worker_type}
                            </span>
                          </td>
                          <td>{worker.ward ? `${worker.ward.wardNumber} - ${worker.ward.wardName}` : '-'}</td>
                          <td>{worker.supervisor ? `${worker.supervisor.full_name} (${worker.supervisor.employee_id})` : '-'}</td>
                          <td>{worker.eo ? `${worker.eo.full_name} (${worker.eo.employee_id})` : '-'}</td>
                          <td>{worker.ulb ? worker.ulb.name : '-'}</td>
                          <td>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              worker.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {worker.status}
                            </span>
                          </td>
                          <td>
                            {worker.proofs && worker.proofs.length > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                <FileText className="w-3 h-3" />
                                {worker.proofs.length} proof{worker.proofs.length !== 1 ? 's' : ''}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">No proofs</span>
                            )}
                          </td>
                          <td>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedWorker(worker);
                                setShowWorkerDetailsModal(true);
                              }}
                              className="btn btn-ghost btn-sm text-primary-600 hover:text-primary-800"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'payroll' && (
            <div className="space-y-4">
              <h2 className="ds-section-title mb-0">Payroll Preview</h2>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Worker Name</th>
                      <th>Mobile</th>
                      <th>Worker Type</th>
                      <th>Ward</th>
                      <th>EO</th>
                      <th>Days Worked</th>
                      <th>Total Records</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboardData.payroll_preview || []).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center text-gray-500 py-8">No payroll data for the selected filters.</td>
                      </tr>
                    ) : (
                      (dashboardData.payroll_preview || []).map((item, idx) => (
                        <tr key={idx}>
                          <td className="font-medium">{item.worker_name}</td>
                          <td>{item.mobile || '-'}</td>
                          <td>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${item.worker_type === 'ULB' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                              {item.worker_type}
                            </span>
                          </td>
                          <td>{item.ward_name || '-'}</td>
                          <td>{item.eo_name || '-'}</td>
                          <td className="font-semibold">{item.days_worked}</td>
                          <td>{item.total_records}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'contractor' && (
            <div className="space-y-4">
              <h2 className="ds-section-title mb-0">Contractor Performance</h2>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Contractor</th>
                      <th>Company</th>
                      <th>Workers</th>
                      <th>Days Worked</th>
                      <th>Attendance %</th>
                      <th>Geo Violations</th>
                      <th>Compliance %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboardData.contractor_performance || []).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center text-gray-500 py-8">No contractor data for the selected filters.</td>
                      </tr>
                    ) : (
                      (dashboardData.contractor_performance || []).map((item, idx) => (
                        <tr key={idx}>
                          <td className="font-medium">{item.contractor_name}</td>
                          <td>{item.company_name || '-'}</td>
                          <td>{item.workers_count}</td>
                          <td>{item.days_worked}</td>
                          <td>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${item.attendance_pct >= 80 ? 'bg-green-100 text-green-800' : item.attendance_pct >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                              {item.attendance_pct}%
                            </span>
                          </td>
                          <td className="text-red-600 font-semibold">{item.geo_violations}</td>
                          <td>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${item.compliance_pct >= 90 ? 'bg-green-100 text-green-800' : item.compliance_pct >= 70 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                              {item.compliance_pct}%
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'geo' && (
            <div className="space-y-4">
              <h2 className="ds-section-title mb-0">Geo Violations</h2>
              <div className="card-flat flex items-center gap-2 p-4 bg-red-50 border-red-200 text-red-700">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span className="font-semibold">Total Violations: {dashboardData.geo_violations?.length || 0}</span>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Worker</th>
                      <th>Ward</th>
                      <th>EO</th>
                      <th>Date</th>
                      <th>Check-in Time</th>
                      <th>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboardData.geo_violations || []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center text-gray-500 py-8">No geo violations for the selected filters.</td>
                      </tr>
                    ) : (
                      (dashboardData.geo_violations || []).map((item, idx) => (
                        <tr key={idx}>
                          <td className="font-medium">{item.worker_name}</td>
                          <td>{item.ward_name || '-'}</td>
                          <td>{item.eo_name || '-'}</td>
                          <td>{item.attendance_date}</td>
                          <td>{item.checkin_time ? new Date(item.checkin_time).toLocaleTimeString() : '-'}</td>
                          <td>
                            {item.latitude && item.longitude ? (
                              <a
                                href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-600 hover:underline"
                              >
                                View Map
                              </a>
                            ) : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-4">
              <h2 className="ds-section-title mb-0">Audit Logs</h2>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Worker</th>
                      <th>Ward</th>
                      <th>EO</th>
                      <th>Date</th>
                      <th>Check-in Time</th>
                      <th>Geo Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboardData.audit_logs || []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center text-gray-500 py-8">No audit logs for the selected filters.</td>
                      </tr>
                    ) : (
                      (dashboardData.audit_logs || []).slice(0, 100).map((item, idx) => (
                        <tr key={idx}>
                          <td className="font-medium">{item.worker_name}</td>
                          <td>{item.ward_name || '-'}</td>
                          <td>{item.eo_name || '-'}</td>
                            <td>{item.attendance_date}</td>
                          <td>{item.checkin_time ? new Date(item.checkin_time).toLocaleTimeString() : '-'}</td>
                          <td>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${item.geo_status === 'VALID' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {item.geo_status || 'N/A'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {(dashboardData.audit_logs || []).length > 100 && (
                <div className="mt-4 text-sm text-gray-500 text-center">
                  Showing first 100 records. Total: {dashboardData.audit_logs.length}
                </div>
              )}
            </div>
          )}
          </section>
        </div>
      )}

      {/* Worker Details Modal with Proofs */}
      {showWorkerDetailsModal && selectedWorker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold text-gray-900">Worker Details</h3>
              <button
                onClick={() => {
                  setShowWorkerDetailsModal(false);
                  setSelectedWorker(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Worker Basic Information */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-4">Basic Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Employee Code</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedWorker.employee_code}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Full Name</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedWorker.full_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Mobile</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedWorker.mobile}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Worker Type</label>
                    <p className="text-sm text-gray-900 mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        selectedWorker.worker_type === 'ULB' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {selectedWorker.worker_type}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Ward</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {selectedWorker?.ward ? `${selectedWorker.ward.wardNumber || ''} - ${selectedWorker.ward.wardName || ''}` : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">ULB</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {selectedWorker?.ulb?.name || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <p className="text-sm text-gray-900 mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        selectedWorker?.status === 'ACTIVE' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedWorker?.status || 'N/A'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Supervisor</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {selectedWorker?.supervisor ? `${selectedWorker.supervisor.full_name || ''} (${selectedWorker.supervisor.employee_id || ''})` : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">EO</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {selectedWorker?.eo ? `${selectedWorker.eo.full_name || ''} (${selectedWorker.eo.employee_id || ''})` : '-'}
                    </p>
                  </div>
                  {selectedWorker?.contractor && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Contractor</label>
                      <p className="text-sm text-gray-900 mt-1">
                        {selectedWorker.contractor.company_name || selectedWorker.contractor.full_name || ''} ({selectedWorker.contractor.employee_id || ''})
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Work Proofs Section */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Work Proofs ({selectedWorker.proofs?.length || 0})
                </h4>
                {selectedWorker.proofs && selectedWorker.proofs.length > 0 ? (
                  <div className="space-y-4">
                    {selectedWorker.proofs.map((proof, index) => (
                      <div key={proof.id || index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-gray-900">Task: {proof.task_type}</span>
                              <span className="text-xs text-gray-500">•</span>
                              <span className="text-sm text-gray-600">{proof.area_street}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Calendar className="w-3 h-3" />
                              <span>Assigned: {proof.assigned_date ? new Date(proof.assigned_date).toLocaleDateString() : 'N/A'}</span>
                              {proof.completed_at && (
                                <>
                                  <span>•</span>
                                  <span>Completed: {new Date(proof.completed_at).toLocaleDateString()}</span>
                                </>
                              )}
                            </div>
                            {proof.supervisor && (
                              <div className="text-xs text-gray-500 mt-1">
                                Supervisor: {proof.supervisor.full_name} ({proof.supervisor.employee_id})
                              </div>
                            )}
                          </div>
                          {proof.escalation_flag && (
                            <span className="inline-flex px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                              Escalated
                            </span>
                          )}
                        </div>
                        
                        {proof.work_proof_remarks && (
                          <div className="mb-3">
                            <label className="text-xs font-medium text-gray-700">Remarks:</label>
                            <p className="text-sm text-gray-600 mt-1">{proof.work_proof_remarks}</p>
                          </div>
                        )}
                        
                        {proof.escalation_reason && (
                          <div className="mb-3 p-2 bg-orange-50 rounded">
                            <label className="text-xs font-medium text-orange-700">Escalation Reason:</label>
                            <p className="text-sm text-orange-600 mt-1">{proof.escalation_reason}</p>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {proof.before_photo_url && (
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                              <label className="text-xs font-medium text-gray-700 mb-1 block">Before Photo</label>
                              <a
                                href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${proof.before_photo_url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block hover:border-blue-500 transition-colors"
                              >
                                <img
                                  src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${proof.before_photo_url}`}
                                  alt="Before work"
                                  className="w-full h-48 object-cover"
                                  onError={(e) => {
                                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage not found%3C/text%3E%3C/svg%3E';
                                  }}
                                />
                              </a>
                              <div className="p-2 bg-gray-50">
                                <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                                  <ImageIcon className="w-3 h-3" />
                                  <a
                                    href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${proof.before_photo_url}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                  >
                                    Click to view full size
                                  </a>
                                </div>
                                {proof.before_photo_latitude != null && proof.before_photo_longitude != null && (
                                  <div className="text-xs text-gray-500 mt-1 space-y-1">
                                    <div className="flex items-start gap-1">
                                      <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                      <div className="flex-1">
                                        {proof.before_photo_address && (
                                          <p className="text-gray-700 font-medium mb-1">{proof.before_photo_address}</p>
                                        )}
                                        <a
                                          href={`https://www.google.com/maps?q=${proof.before_photo_latitude},${proof.before_photo_longitude}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:underline"
                                        >
                                          {Number(proof.before_photo_latitude).toFixed(6)}, {Number(proof.before_photo_longitude).toFixed(6)}
                                        </a>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          {proof.after_photo_url && (
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                              <label className="text-xs font-medium text-gray-700 mb-1 block">After Photo</label>
                              <a
                                href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${proof.after_photo_url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block hover:border-blue-500 transition-colors"
                              >
                                <img
                                  src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${proof.after_photo_url}`}
                                  alt="After work"
                                  className="w-full h-48 object-cover"
                                  onError={(e) => {
                                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage not found%3C/text%3E%3C/svg%3E';
                                  }}
                                />
                              </a>
                              <div className="p-2 bg-gray-50">
                                <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                                  <ImageIcon className="w-3 h-3" />
                                  <a
                                    href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${proof.after_photo_url}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                  >
                                    Click to view full size
                                  </a>
                                </div>
                                {proof.after_photo_latitude != null && proof.after_photo_longitude != null && (
                                  <div className="text-xs text-gray-500 mt-1 space-y-1">
                                    <div className="flex items-start gap-1">
                                      <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                      <div className="flex-1">
                                        {proof.after_photo_address && (
                                          <p className="text-gray-700 font-medium mb-1">{proof.after_photo_address}</p>
                                        )}
                                        <a
                                          href={`https://www.google.com/maps?q=${proof.after_photo_latitude},${proof.after_photo_longitude}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:underline"
                                        >
                                          {Number(proof.after_photo_latitude).toFixed(6)}, {Number(proof.after_photo_longitude).toFixed(6)}
                                        </a>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm">No work proofs available yet.</p>
                    <p className="text-xs text-gray-400 mt-1">Proofs will appear here when supervisors upload them.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFieldWorkerMonitoring;
