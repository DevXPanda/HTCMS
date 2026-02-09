import React, { useState, useEffect } from 'react';
import {
  Building2, Users, FileText, DollarSign, TrendingUp,
  AlertCircle, CheckCircle, Clock, Truck, Bath, MapPin,
  Shield, BarChart3, Droplet, UserCog, ClipboardList,
  Store, ScrollText
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const Dashboard = () => {
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
    // House Tax (Property Tax)
    houseTaxDemands: 0,
    houseTaxRevenue: 0,
    houseTaxOutstanding: 0,
    // D2DC
    d2dcDemands: 0,
    d2dcRevenue: 0,
    d2dcOutstanding: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/reports/dashboard');
      setStats(response.data.data);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  // 1. Primary Navigation: Quick Actions (Tax + Utility)
  const quickActions = [
    { name: 'Tax Management', icon: FileText, link: '/tax-management', color: 'bg-blue-600' },
    { name: 'Gau Shala', icon: ScrollText, link: '/water/connections', color: 'bg-orange-600' },
    { name: 'Toilet Management', icon: Bath, link: '/demands', color: 'bg-pink-600' },
    { name: 'MRF', icon: ClipboardList, link: '/field-monitoring', color: 'bg-green-600' },
  ];

  // 2. Global Metrics (System Health) - Lighter visual weight
  const systemMetrics = [
    { title: 'Total Properties', value: stats.totalProperties, icon: Building2, change: '+12%' },
    { title: 'Total Assessments', value: stats.totalAssessments, icon: FileText, change: '+8%' },
    { title: 'Total Demands', value: stats.totalDemands, icon: DollarSign, change: '+15%' },
    { title: 'Total Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, icon: TrendingUp, change: '+20%' },
    { title: 'Total Outstanding', value: `₹${stats.totalOutstanding.toLocaleString()}`, icon: AlertCircle, change: '', textRed: true }
  ];

  // 3. Administration (Compact Secondary Navigation)
  const adminItems = [
    { name: 'Wards', icon: MapPin, link: '/wards' },
    { name: 'Citizen Management', icon: Users, link: '/users' },
    { name: 'Staff Management', icon: UserCog, link: '/admin-management' },
    { name: 'Attendance', icon: Clock, link: '/attendance' },
    { name: 'Field Monitoring', icon: ClipboardList, link: '/field-monitoring' },
    { name: 'Reports', icon: BarChart3, link: '/reports' },
    { name: 'Audit Logs', icon: Shield, link: '/audit-logs' }
  ];

  // Home Icon Component
  function Home(props) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Control Center</h1>
          <p className="text-gray-500 text-sm">System Overview & Management</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
        >
          Refresh Data
        </button>
      </div>

      {/* 1. Primary Navigation - Quick Actions */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-primary-600" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.link}
              className="flex flex-col items-center justify-center p-5 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-primary-100 transition-all group"
            >
              <div className={`p-3 rounded-full ${action.color} text-white mb-3 shadow-sm group-hover:scale-110 transition-transform`}>
                <action.icon className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium text-gray-700 group-hover:text-primary-700 text-center">{action.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 2. Global Metrics - Simplified */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Data Insights</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {systemMetrics.map((stat, index) => (
            <div key={index} className="bg-white rounded-lg border border-gray-100 p-4 flex flex-col justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500 uppercase">{stat.title}</p>
                <stat.icon className={`h-4 w-4 ${stat.textRed ? 'text-red-500' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className={`text-xl font-bold ${stat.textRed ? 'text-red-600' : 'text-gray-900'}`}>{stat.value}</p>
                {stat.change && (
                  <p className="text-xs text-green-600 mt-1 font-medium">{stat.change}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Administration - Compact Grid */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Administration & Reports</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {adminItems.map((item, idx) => (
            <Link
              key={idx}
              to={item.link}
              className="flex flex-col items-center p-3 rounded-lg bg-white border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-all text-center"
            >
              <div className="text-gray-500 mb-2">
                <item.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-gray-700">{item.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. Snapshot / Water Tax Overview */}
      {/* 4. Module Snapshots */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Module Snapshots</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Property Tax Snapshot */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-blue-50/30">
            <h3 className="text-sm font-semibold text-gray-900 uppercase flex items-center">
              <Building2 className="w-4 h-4 mr-2 text-blue-600" />
              Property Tax
            </h3>
            <Link to="/property-tax" className="text-blue-600 text-xs font-medium hover:text-blue-700 flex items-center">
              View <TrendingUp className="w-3 h-3 ml-1" />
            </Link>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-dashed border-gray-100">
              <span className="text-xs text-gray-500 uppercase font-medium">Properties</span>
              <span className="text-lg font-bold text-gray-900">{stats.totalProperties.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-dashed border-gray-100">
              <span className="text-xs text-gray-500 uppercase font-medium">Assessments</span>
              <span className="text-lg font-bold text-gray-700">{stats.totalAssessments.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-dashed border-gray-100">
              <span className="text-xs text-gray-500 uppercase font-medium">Revenue</span>
              <span className="text-lg font-bold text-blue-600">₹{(stats.houseTaxRevenue || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-xs text-gray-500 uppercase font-medium">Outstanding</span>
              <span className="text-lg font-bold text-red-500">₹{(stats.houseTaxOutstanding || 0).toLocaleString()}</span>
            </div>
          </div>
        </section>

        {/* Water Tax Snapshot */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-cyan-50/30">
            <h3 className="text-sm font-semibold text-gray-900 uppercase flex items-center">
              <Droplet className="w-4 h-4 mr-2 text-cyan-600" />
              Water Tax
            </h3>
            <Link to="/water-tax" className="text-cyan-600 text-xs font-medium hover:text-cyan-700 flex items-center">
              View <TrendingUp className="w-3 h-3 ml-1" />
            </Link>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-dashed border-gray-100">
              <span className="text-xs text-gray-500 uppercase font-medium">Connections</span>
              <span className="text-lg font-bold text-gray-900">{stats.totalWaterConnections.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-dashed border-gray-100">
              <span className="text-xs text-gray-500 uppercase font-medium">Active</span>
              <span className="text-lg font-bold text-gray-700">{stats.totalWaterConnections.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-dashed border-gray-100">
              <span className="text-xs text-gray-500 uppercase font-medium">Revenue</span>
              <span className="text-lg font-bold text-cyan-600">₹{stats.totalWaterRevenue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-xs text-gray-500 uppercase font-medium">Outstanding</span>
              <span className="text-lg font-bold text-red-500">₹{stats.waterOutstanding.toLocaleString()}</span>
            </div>
          </div>
        </section>

        {/* D2DC Snapshot */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-purple-50/30">
            <h3 className="text-sm font-semibold text-gray-900 uppercase flex items-center">
              <Truck className="w-4 h-4 mr-2 text-purple-600" />
              D2DC
            </h3>
            <Link to="/field-monitoring" className="text-purple-600 text-xs font-medium hover:text-purple-700 flex items-center">
              View <TrendingUp className="w-3 h-3 ml-1" />
            </Link>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-dashed border-gray-100">
              <span className="text-xs text-gray-500 uppercase font-medium">Demands Generated</span>
              <span className="text-lg font-bold text-gray-900">{(stats.d2dcDemands || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-dashed border-gray-100">
              <span className="text-xs text-gray-500 uppercase font-medium">Collection Rate</span>
              <span className="text-lg font-bold text-gray-700">-</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-dashed border-gray-100">
              <span className="text-xs text-gray-500 uppercase font-medium">Revenue</span>
              <span className="text-lg font-bold text-purple-600">₹{(stats.d2dcRevenue || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-xs text-gray-500 uppercase font-medium">Outstanding</span>
              <span className="text-lg font-bold text-red-500">₹{(stats.d2dcOutstanding || 0).toLocaleString()}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
