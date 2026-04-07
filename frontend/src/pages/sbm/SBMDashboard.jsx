import React, { useState, useEffect } from 'react';
import {
  Building2, Users, FileText, DollarSign, TrendingUp,
  AlertCircle, Clock, Truck, Bath, MapPin,
  Shield, BarChart3, Droplet, UserCog, ClipboardList,
  Store, ScrollText, Filter, Recycle, Heart, Bell
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { reportAPI } from '../../services/api';

const SBM_ULB_STORAGE_KEY = 'htcms_sbm_selected_ulb_id';

const SBMDashboard = () => {
  const [selectedUlbId, setSelectedUlbIdState] = useState(() => {
    try { return sessionStorage.getItem(SBM_ULB_STORAGE_KEY) || ''; } catch { return ''; }
  });
  const effectiveUlbId = selectedUlbId || null;

  const setSelectedUlbId = (value) => {
    const id = value || '';
    setSelectedUlbIdState(id);
    try {
      if (id) sessionStorage.setItem(SBM_ULB_STORAGE_KEY, id);
      else sessionStorage.removeItem(SBM_ULB_STORAGE_KEY);
    } catch (_) { }
  };

  const [stats, setStats] = useState({
    totalProperties: 0,
    totalAssessments: 0,
    totalDemands: 0,
    totalRevenue: 0,
    pendingDemands: 0,
    totalOutstanding: 0,
    approvedAssessments: 0,
    totalWaterConnections: 0,
    totalWaterRevenue: 0,
    waterOutstanding: 0,
    houseTaxDemands: 0,
    houseTaxRevenue: 0,
    houseTaxOutstanding: 0,
    d2dcDemands: 0,
    d2dcRevenue: 0,
    d2dcOutstanding: 0,
    shopTaxDemands: 0,
    shopTaxRevenue: 0,
    shopTaxOutstanding: 0,
    activeShops: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ulbs, setUlbs] = useState([]);
  const [mrfStats, setMrfStats] = useState(null);
  const [toiletStats, setToiletStats] = useState(null);
  const [gaushalaStats, setGaushalaStats] = useState(null);
  const selectedUlbName = ulbs.find((u) => String(u.id) === String(selectedUlbId))?.name;

  useEffect(() => {
    api.get('/admin-management/ulbs').then((res) => {
      const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setUlbs(Array.isArray(data) ? data : []);
    }).catch(() => setUlbs([]));
  }, []);

  useEffect(() => {
    const params = effectiveUlbId ? { ulb_id: effectiveUlbId } : {};
    api.get('/reports/dashboard', { params })
      .then((res) => setStats(res.data?.data ?? {}))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, [effectiveUlbId]);

  useEffect(() => {
    const params = effectiveUlbId ? { ulb_id: effectiveUlbId } : {};
    Promise.all([
      reportAPI.getMrfStats(params).catch(() => ({ data: { data: null } })),
      reportAPI.getToiletStats(params).catch(() => ({ data: { data: null } })),
      reportAPI.getGaushalaStats(params).catch(() => ({ data: { data: null } }))
    ]).then(([mrfRes, toiletRes, gaushalaRes]) => {
      setMrfStats(mrfRes.data?.data ?? null);
      setToiletStats(toiletRes.data?.data ?? null);
      setGaushalaStats(gaushalaRes.data?.data ?? null);
    });
  }, [effectiveUlbId]);

  const fetchDashboardData = () => {
    setLoading(true);
    const params = effectiveUlbId ? { ulb_id: effectiveUlbId } : {};
    api.get('/reports/dashboard', { params })
      .then((res) => setStats(res.data?.data ?? {}))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  };

  const quickActions = [
    { name: 'Tax Management', icon: FileText, link: '/sbm/tax-management', color: 'bg-blue-600' },
    { name: 'Field Worker Management', icon: Store, link: '/sbm/workers', color: 'bg-yellow-600' },
    { name: 'Toilet Management', icon: Bath, link: '/sbm/toilet', color: 'bg-pink-600' },
    { name: 'MRF', icon: ClipboardList, link: '/sbm/mrf', color: 'bg-green-600' },
    { name: 'Gau Shala', icon: ScrollText, link: '/sbm/gaushala', color: 'bg-orange-600' }
  ];

  const systemMetrics = [
    { title: 'Total Properties', value: stats.totalProperties ?? 0, icon: Building2 },
    { title: 'Total Assessments', value: stats.totalAssessments ?? 0, icon: FileText },
    { title: 'Total Demands', value: stats.totalDemands ?? 0, icon: DollarSign },
    { title: 'Total Revenue', value: `₹${(stats.totalRevenue ?? 0).toLocaleString()}`, icon: TrendingUp },
    { title: 'Total Outstanding', value: `₹${(stats.totalOutstanding ?? 0).toLocaleString()}`, icon: AlertCircle, textRed: true }
  ];

  const adminItems = [
    { name: 'Notifications', icon: Bell, link: '/sbm/notifications' },
    { name: 'Wards', icon: MapPin, link: '/sbm/wards' },
    { name: 'ULB Management', icon: Building2, link: '/sbm/ulbs' },
    { name: 'Citizen Management', icon: Users, link: '/sbm/citizen' },
    { name: 'Admin Management', icon: Shield, link: '/sbm/admin-accounts' },
    { name: 'Staff Management', icon: UserCog, link: '/sbm/staff' },
    { name: 'Attendance', icon: Clock, link: '/sbm/attendance' },
    { name: 'Field Monitoring', icon: ClipboardList, link: '/sbm/field-monitoring' },
    { name: 'Field Worker Monitoring', icon: Users, link: '/sbm/field-worker-monitoring' },
    { name: 'Reports', icon: BarChart3, link: '/sbm/reports' },
    { name: 'Audit Logs', icon: Shield, link: '/sbm/audit-logs' }
  ];

  if (loading && !stats.totalProperties && !stats.totalDemands) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="spinner spinner-md" />
        <p className="text-gray-600 mt-4">Loading dashboard...</p>
      </div>
    );
  }

  if (error && !stats.totalProperties && !stats.totalDemands) {
    return (
      <div className="alert-error">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
          <div>
            <h3 className="alert-error-title">Error</h3>
            <div className="alert-error-text">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header - same as admin */}
      <div className="ds-page-header">
        <div>
          <h1 className="ds-page-title">SBM Executive Panel</h1>
          <p className="ds-page-subtitle">System Overview & Management — SBM read-only</p>
        </div>
        <button type="button" onClick={fetchDashboardData} className="btn btn-primary">
          Refresh Data
        </button>
      </div>

      {/* ULB Filter - SBM can choose all or one ULB like super admin */}
      <div className="card-flat">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <label className="label mb-0">Filter by ULB:</label>
          </div>
          <select
            value={selectedUlbId}
            onChange={(e) => setSelectedUlbId(e.target.value)}
            className="input h-10 min-w-[16rem] max-w-[20rem] truncate"
            title={selectedUlbName || 'All ULBs (Aggregated)'}
          >
            <option value="">All ULBs (Aggregated)</option>
            {ulbs.map((ulb) => (
              <option key={ulb.id} value={ulb.id}>{ulb.name}</option>
            ))}
          </select>
          {selectedUlbId && (
            <button onClick={() => setSelectedUlbId('')} className="text-sm text-primary-600 hover:text-primary-700">
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* Quick Actions - same as admin, links to SBM routes */}
      <section>
        <h2 className="ds-section-title flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-primary-600" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.link}
              className="card-hover flex flex-col items-center justify-center p-5 group"
            >
              <div className={`p-3 rounded-full ${action.color} text-white mb-3 shadow-sm group-hover:scale-110 transition-transform`}>
                <action.icon className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium text-gray-700 group-hover:text-primary-700 text-center">{action.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Data Insights - same as admin */}
      <section>
        <h2 className="ds-section-title-muted">Data Insights</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {systemMetrics.map((stat, index) => (
            <div key={index} className="stat-card">
              <div className="stat-card-title">
                <span>{stat.title}</span>
                <stat.icon className={`h-4 w-4 ${stat.textRed ? 'text-red-500' : 'text-gray-400'}`} />
              </div>
              <p className={`stat-card-value ${stat.textRed ? 'text-red-600' : 'text-gray-900'}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Administration & Reports - same structure, SBM links */}
      <section>
        <h2 className="ds-section-title-muted">Administration & Reports</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {adminItems.map((item, idx) => (
            <Link key={idx} to={item.link} className="stat-card flex flex-col items-center p-3 text-center">
              <div className="text-gray-500 mb-2">
                <item.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-gray-700">{item.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Module Snapshots - same as admin */}
      <h2 className="ds-section-title-muted">Module Snapshots</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <section className="card overflow-hidden p-0">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-primary-50/50">
            <h3 className="text-sm font-semibold text-gray-900 uppercase flex items-center">
              <Building2 className="w-4 h-4 mr-2 text-blue-600" />
              Property Tax
            </h3>
            <Link to="/sbm/properties" className="text-blue-600 text-xs font-medium hover:text-blue-700 flex items-center">
              View <TrendingUp className="w-3 h-3 ml-1" />
            </Link>
          </div>
          <div className="p-6 space-y-4 min-w-0 overflow-hidden">
            <div className="flex justify-between items-center gap-2 min-w-0 pb-3 border-b border-dashed border-gray-100">
              <span className="text-xs text-gray-500 uppercase font-medium shrink-0">Properties</span>
              <span className="text-lg font-bold text-gray-900 min-w-0 truncate text-right">{(stats.totalProperties ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center gap-2 min-w-0 pb-3 border-b border-dashed border-gray-100">
              <span className="text-xs text-gray-500 uppercase font-medium shrink-0">Assessments</span>
              <span className="text-lg font-bold text-gray-700 min-w-0 truncate text-right">{(stats.totalAssessments ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center gap-2 min-w-0 pb-3 border-b border-dashed border-gray-100">
              <span className="text-xs text-gray-500 uppercase font-medium shrink-0">Revenue</span>
              <span className="text-lg font-bold text-blue-600 min-w-0 truncate text-right">₹{(stats.houseTaxRevenue ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center gap-2 min-w-0 pt-1">
              <span className="text-xs text-gray-500 uppercase font-medium shrink-0">Outstanding</span>
              <span className="text-lg font-bold text-red-500 min-w-0 truncate text-right">₹{(stats.houseTaxOutstanding ?? 0).toLocaleString()}</span>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-cyan-50/30">
            <h3 className="text-sm font-semibold text-gray-900 uppercase flex items-center">
              <Droplet className="w-4 h-4 mr-2 text-cyan-600" />
              Water Tax
            </h3>
            <Link to="/sbm/payments" className="text-cyan-600 text-xs font-medium hover:text-cyan-700 flex items-center">
              View <TrendingUp className="w-3 h-3 ml-1" />
            </Link>
          </div>
          <div className="p-6 space-y-4 min-w-0 overflow-hidden">
            <div className="flex justify-between items-center gap-2 min-w-0 pb-3 border-b border-dashed border-gray-100">
              <span className="text-xs text-gray-500 uppercase font-medium shrink-0">Connections</span>
              <span className="text-lg font-bold text-gray-900 min-w-0 truncate text-right">{(stats.totalWaterConnections ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center gap-2 min-w-0 pb-3 border-b border-dashed border-gray-100">
              <span className="text-xs text-gray-500 uppercase font-medium shrink-0">Revenue</span>
              <span className="text-lg font-bold text-cyan-600 min-w-0 truncate text-right">₹{(stats.totalWaterRevenue ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center gap-2 min-w-0 pt-1">
              <span className="text-xs text-gray-500 uppercase font-medium shrink-0">Outstanding</span>
              <span className="text-lg font-bold text-red-500 min-w-0 truncate text-right">₹{(stats.waterOutstanding ?? 0).toLocaleString()}</span>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-purple-50/30">
            <h3 className="text-sm font-semibold text-gray-900 uppercase flex items-center">
              <Truck className="w-4 h-4 mr-2 text-purple-600" />
              D2DC
            </h3>
            <Link to="/sbm/demands" className="text-purple-600 text-xs font-medium hover:text-purple-700 flex items-center">
              View <TrendingUp className="w-3 h-3 ml-1" />
            </Link>
          </div>
          <div className="p-6 space-y-4 min-w-0 overflow-hidden">
            <div className="flex justify-between items-center gap-2 min-w-0 pb-3 border-b border-dashed border-gray-100">
              <span className="text-xs text-gray-500 uppercase font-medium shrink-0">Demands</span>
              <span className="text-lg font-bold text-gray-900 min-w-0 truncate text-right">{(stats.d2dcDemands ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center gap-2 min-w-0 pt-1">
              <span className="text-xs text-gray-500 uppercase font-medium shrink-0">Revenue</span>
              <span className="text-lg font-bold text-purple-600 min-w-0 truncate text-right">₹{(stats.d2dcRevenue ?? 0).toLocaleString()}</span>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-amber-50/30">
            <h3 className="text-sm font-semibold text-gray-900 uppercase flex items-center">
              <Store className="w-4 h-4 mr-2 text-amber-600" />
              Shop Tax
            </h3>
            <Link to="/sbm/demands" className="text-amber-600 text-xs font-medium hover:text-amber-700 flex items-center">
              View <TrendingUp className="w-3 h-3 ml-1" />
            </Link>
          </div>
          <div className="p-6 space-y-4 min-w-0 overflow-hidden">
            <div className="flex justify-between items-center gap-2 min-w-0 pb-3 border-b border-dashed border-gray-100">
              <span className="text-xs text-gray-500 uppercase font-medium shrink-0">Demands</span>
              <span className="text-lg font-bold text-gray-900 min-w-0 truncate text-right">{(stats.shopTaxDemands ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center gap-2 min-w-0 pt-1">
              <span className="text-xs text-gray-500 uppercase font-medium shrink-0">Active Shops</span>
              <span className="text-lg font-bold text-gray-700 min-w-0 truncate text-right">{(stats.activeShops ?? 0).toLocaleString()}</span>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-teal-50/30">
            <h3 className="text-sm font-semibold text-gray-900 uppercase flex items-center">
              <Bath className="w-4 h-4 mr-2 text-teal-600" />
              Toilet
            </h3>
            <Link to="/sbm/toilet" className="text-teal-600 text-xs font-medium hover:text-teal-700 flex items-center">
              View <TrendingUp className="w-3 h-3 ml-1" />
            </Link>
          </div>
          <div className="p-6 space-y-4 min-w-0 overflow-hidden">
            <div className="flex justify-between items-center gap-2 min-w-0 pb-3 border-b border-dashed border-gray-100">
              <span className="text-xs text-gray-500 uppercase font-medium shrink-0">Facilities</span>
              <span className="text-lg font-bold text-gray-900 min-w-0 truncate text-right">{(toiletStats?.totalFacilities ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center gap-2 min-w-0 pt-1">
              <span className="text-xs text-gray-500 uppercase font-medium shrink-0">Complaints</span>
              <span className="text-lg font-bold text-gray-700 min-w-0 truncate text-right">{(toiletStats?.totalComplaints ?? 0).toLocaleString()}</span>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-emerald-50/30">
            <h3 className="text-sm font-semibold text-gray-900 uppercase flex items-center">
              <Recycle className="w-4 h-4 mr-2 text-emerald-600" />
              MRF
            </h3>
            <Link to="/sbm/mrf" className="text-emerald-600 text-xs font-medium hover:text-emerald-700 flex items-center">
              View <TrendingUp className="w-3 h-3 ml-1" />
            </Link>
          </div>
          <div className="p-6 space-y-4 min-w-0 overflow-hidden">
            <div className="flex justify-between items-center gap-2 min-w-0 pb-3 border-b border-dashed border-gray-100">
              <span className="text-xs text-gray-500 uppercase font-medium shrink-0">Facilities</span>
              <span className="text-lg font-bold text-gray-900 min-w-0 truncate text-right">{(mrfStats?.totalFacilities ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center gap-2 min-w-0 pt-1">
              <span className="text-xs text-gray-500 uppercase font-medium shrink-0">Efficiency</span>
              <span className="text-lg font-bold text-gray-700 min-w-0 truncate text-right">{mrfStats?.efficiency != null ? `${mrfStats.efficiency}%` : '—'}</span>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-rose-50/30">
            <h3 className="text-sm font-semibold text-gray-900 uppercase flex items-center">
              <Heart className="w-4 h-4 mr-2 text-rose-600" />
              Gaushala
            </h3>
            <Link to="/sbm/gaushala" className="text-rose-600 text-xs font-medium hover:text-rose-700 flex items-center">
              View <TrendingUp className="w-3 h-3 ml-1" />
            </Link>
          </div>
          <div className="p-6 space-y-4 min-w-0 overflow-hidden">
            <div className="flex justify-between items-center gap-2 min-w-0 pb-3 border-b border-dashed border-gray-100">
              <span className="text-xs text-gray-500 uppercase font-medium shrink-0">Facilities</span>
              <span className="text-lg font-bold text-gray-900 min-w-0 truncate text-right">{(gaushalaStats?.totalFacilities ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center gap-2 min-w-0 pt-1">
              <span className="text-xs text-gray-500 uppercase font-medium shrink-0">Complaints</span>
              <span className="text-lg font-bold text-gray-700 min-w-0 truncate text-right">{(gaushalaStats?.totalComplaints ?? 0).toLocaleString()}</span>
            </div>
          </div>
        </section>
      </div>

      {/* SBM read-only notice */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-gray-600 flex items-center gap-2">
          <Shield className="w-4 h-4 text-violet-600 shrink-0" />
          You have read-only access. Create/Edit/Delete are disabled unless Super Admin enables full CRUD for your account.
        </p>
      </div>
    </div>
  );
};

export default SBMDashboard;
