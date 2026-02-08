import React, { useState, useEffect } from 'react';
import { Building2, Users, FileText, DollarSign, TrendingUp, AlertCircle, CheckCircle, Clock, PlusCircle, List, Home, Droplet } from 'lucide-react';
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
    waterOutstanding: 0
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

  const statCards = [
    {
      title: 'Total Properties',
      value: stats.totalProperties,
      icon: Building2,
      color: 'bg-blue-500',
      change: '+12%'
    },
    {
      title: 'Total Assessments',
      value: stats.totalAssessments,
      icon: FileText,
      color: 'bg-green-500',
      change: '+8%'
    },
    {
      title: 'Total Demands',
      value: stats.totalDemands,
      icon: DollarSign,
      color: 'bg-yellow-500',
      change: '+15%'
    },
    {
      title: 'Total Revenue',
      value: `₹${stats.totalRevenue.toLocaleString()}`,
      icon: TrendingUp,
      color: 'bg-purple-500',
      change: '+20%'
    }
  ];

  const quickStats = [
    {
      title: 'Approved Assessments',
      value: stats.approvedAssessments,
      icon: CheckCircle,
      color: 'text-green-600 bg-green-100'
    },
    {
      title: 'Pending Demands',
      value: stats.pendingDemands,
      icon: Clock,
      color: 'text-orange-600 bg-orange-100'
    },
    {
      title: 'Total Outstanding',
      value: `₹${stats.totalOutstanding.toLocaleString()}`,
      icon: AlertCircle,
      color: 'text-red-600 bg-red-100'
    }
  ];

  const quickActions = [
    {
      name: 'Add Property',
      icon: Home,
      link: '/admin/properties/new',
      color: 'bg-blue-500'
    },
    {
      name: 'Create Assessment',
      icon: FileText,
      link: '/admin/assessments/new',
      color: 'bg-green-500'
    },
    {
      name: 'Generate Demand',
      icon: DollarSign,
      link: '/admin/demands/generate',
      color: 'bg-yellow-500'
    },
    {
      name: 'Record Payment',
      icon: PlusCircle,
      link: '/admin/payments/new',
      color: 'bg-purple-500'
    },
    {
      name: 'Water Tax',
      icon: Droplet,
      link: '/admin/water/connections',
      color: 'bg-cyan-500'
    },
    {
      name: 'All Demands',
      icon: List,
      link: '/admin/demands',
      color: 'bg-indigo-500'
    },
  ];

  // Mock recent activities - replace with actual API call if available
  const recentActivities = [
    { description: 'New property added: #12345', timestamp: '2 hours ago' },
    { description: 'Assessment approved for #67890', timestamp: '1 day ago' },
    { description: 'Payment received for Demand #11223', timestamp: '3 days ago' },
    { description: 'Water connection request approved', timestamp: '4 days ago' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Welcome to Tax Managment System</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value.toLocaleString()}</p>
                <p className="text-sm text-green-600 mt-2">{stat.change}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-full`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.link}
              className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className={`p-3 rounded-full ${action.color} mb-3`}>
                <action.icon className="h-6 w-6 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700 text-center">{action.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {quickStats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Water Tax Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg text-blue-600 bg-blue-100">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Water Connections</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{stats.totalWaterConnections.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg text-cyan-600 bg-cyan-100">
              <DollarSign className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Water Revenue</p>
              <p className="text-xl font-bold text-gray-900 mt-1">₹{stats.totalWaterRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-lg text-indigo-600 bg-indigo-100">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Water Outstanding</p>
              <p className="text-xl font-bold text-gray-900 mt-1">₹{stats.waterOutstanding.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activities</h2>
        </div>
        <div className="p-6">
          {recentActivities && recentActivities.length > 0 ? (
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                    <p className="text-sm text-gray-500">{activity.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No recent activities</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
