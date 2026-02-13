import React, { useState, useEffect } from 'react';
import {
  FileText,
  Droplets,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Eye,
  AlertTriangle,
  ArrowRight,
  History,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStaffAuth } from '../../contexts/StaffAuthContext';
import api from '../../services/api';

const OfficerDashboard = () => {
  const { user } = useStaffAuth();
  const [stats, setStats] = useState({
    totalPending: 0,
    escalatedPropertyApps: 0,
    escalatedWaterRequests: 0,
    approvedByOfficer: 0,
    rejectedByOfficer: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [escalatedData, setEscalatedData] = useState({
    property: [],
    water: []
  });
  const [recentDecisions, setRecentDecisions] = useState({
    propertyDecisions: [],
    waterDecisions: []
  });
  const [wardInfo, setWardInfo] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    fetchWardInfo();
  }, []);

  const fetchWardInfo = async () => {
    try {
      if (user?.ward_ids && user.ward_ids.length > 0) {
        // Fetch actual ward details to get ward numbers
        try {
          const wardResponse = await api.get('/wards', {
            params: { ids: user.ward_ids.join(',') }
          });

          const wards = wardResponse.data?.data?.wards || [];

          setWardInfo({
            count: user.ward_ids.length,
            wardIds: user.ward_ids,
            wardDetails: wards
          });
        } catch (wardError) {
          console.warn('⚠️ Could not fetch ward details, using IDs:', wardError);
          // Fallback to just using IDs if ward fetch fails
          setWardInfo({
            count: user.ward_ids.length,
            wardIds: user.ward_ids,
            wardDetails: null
          });
        }
      } else {
        // No wards assigned
        setWardInfo({
          count: 0,
          wardIds: [],
          wardDetails: null
        });
      }
    } catch (error) {
      console.error('Error fetching ward info:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      console.log('🔍 Officer Dashboard - Starting data fetch...');

      const [dashboardResponse, propertyResponse, waterResponse, decisionsResponse] = await Promise.all([
        api.get('/officer/dashboard'),
        api.get('/officer/property-applications/escalated'),
        api.get('/officer/water-requests/escalated'),
        api.get('/officer/decisions/history')
      ]);

      console.log('✅ Officer Dashboard - Dashboard stats:', dashboardResponse.data);
      console.log('✅ Officer Dashboard - Property applications:', propertyResponse.data?.length || 0);
      console.log('✅ Officer Dashboard - Water requests:', waterResponse.data?.length || 0);
      console.log('✅ Officer Dashboard - Decisions:', decisionsResponse.data);

      setStats(dashboardResponse.data);
      setEscalatedData({
        property: propertyResponse.data.slice(0, 5), // Limit for dashboard
        water: waterResponse.data.slice(0, 5)
      });
      setRecentDecisions(decisionsResponse.data);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('❌ Officer Dashboard Error:', err);
      console.error('❌ Officer Dashboard Error response:', err.response);
      console.error('❌ Officer Dashboard Error status:', err.response?.status);
      console.error('❌ Officer Dashboard Error data:', err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Pending Escalations',
      value: stats.totalPending,
      icon: Clock,
      color: 'bg-orange-500',
      link: '/officer/property-applications'
    },
    {
      title: 'Property Escalations',
      value: stats.escalatedPropertyApps,
      icon: FileText,
      color: 'bg-blue-500',
      link: '/officer/property-applications'
    },
    {
      title: 'Water Escalations',
      value: stats.escalatedWaterRequests,
      icon: Droplets,
      color: 'bg-cyan-500',
      link: '/officer/water-requests'
    },
    {
      title: 'Your Decisions',
      value: stats.approvedByOfficer + stats.rejectedByOfficer,
      icon: TrendingUp,
      color: 'bg-green-500',
      link: '/officer/decision-history'
    }
  ];


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Quick Actions - All sidebar navigation items
  const quickActions = [
    { name: 'Property Applications', icon: FileText, link: '/officer/property-applications', color: 'bg-blue-600' },
    { name: 'Water Requests', icon: Droplets, link: '/officer/water-requests', color: 'bg-cyan-600' },
    { name: 'Decision History', icon: History, link: '/officer/decision-history', color: 'bg-purple-600' },
    { name: 'My Attendance', icon: Calendar, link: '/officer/attendance', color: 'bg-orange-600' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Officer Dashboard</h1>
          <p className="text-gray-500 text-sm">Escalation Management & Decisions</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors shadow-sm flex items-center"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Data
        </button>
      </div>

      {/* Quick Actions Section */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-primary-600" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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

      {/* Ward Assignment Info */}
      {wardInfo && wardInfo.count > 0 && (
        <div className="bg-white rounded-lg border border-gray-100 p-6 mb-6 bg-blue-50 border-blue-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Assigned Ward(s): {wardInfo.count === 1
                  ? wardInfo.wardDetails && wardInfo.wardDetails.length > 0
                    ? `${wardInfo.wardDetails[0].wardNumber} - ${wardInfo.wardDetails[0].wardName}`
                    : `Ward ID: ${wardInfo.wardIds[0]}`
                  : `${wardInfo.count} wards`
                }
              </h3>
              <div className="mt-1 text-sm text-blue-700">
                You can only view and manage escalations from your assigned ward(s)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stat Cards - Clerk Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Link
              key={index}
              to={stat.link}
              className="bg-white rounded-lg border border-gray-100 p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-full`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Property Escalation Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-100 p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Property Escalation Status
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                <span className="text-gray-700">Escalated (Pending)</span>
              </div>
              <span className="font-semibold">{stats.escalatedPropertyApps}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-gray-700">Approved</span>
              </div>
              <span className="font-semibold">{stats.approvedByOfficer}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                <span className="text-gray-700">Rejected</span>
              </div>
              <span className="font-semibold">{stats.rejectedByOfficer}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                <span className="text-gray-700">Sent Back to Inspector</span>
              </div>
              <span className="font-semibold">0</span>
            </div>
          </div>
        </div>

        {/* Water Escalation Status Breakdown */}
        <div className="bg-white rounded-lg border border-gray-100 p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Droplets className="w-5 h-5 mr-2" />
            Water Escalation Status
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                <span className="text-gray-700">Escalated (Pending)</span>
              </div>
              <span className="font-semibold">{stats.escalatedWaterRequests}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-gray-700">Approved</span>
              </div>
              <span className="font-semibold">{stats.approvedByOfficer}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                <span className="text-gray-700">Rejected</span>
              </div>
              <span className="font-semibold">{stats.rejectedByOfficer}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                <span className="text-gray-700">Sent Back to Inspector</span>
              </div>
              <span className="font-semibold">0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Escalations Table */}
      <div className="bg-white rounded-lg border border-gray-100 p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Pending Escalations</h2>
        {escalatedData.property.length > 0 || escalatedData.water.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Application Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Escalated By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Escalated Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {escalatedData.property.map((app) => (
                  <tr key={app.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      PA-{app.id.toString().padStart(6, '0')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <FileText className="w-3 h-3 mr-1" />
                        Property
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {app.inspector ? `${app.inspector.firstName} ${app.inspector.lastName}` : 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <Clock className="w-3 h-3 mr-1" />
                        Escalated
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(app.escalatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        to={`/officer/property-applications/${app.id}`}
                        className="text-blue-600 hover:text-blue-900 flex items-center"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
                {escalatedData.water.map((request) => (
                  <tr key={request.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      WR-{request.id.toString().padStart(6, '0')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800">
                        <Droplets className="w-3 h-3 mr-1" />
                        Water
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {request.escalatedByInspector ? request.escalatedByInspector.full_name || 'Unknown' : 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <Clock className="w-3 h-3 mr-1" />
                        Escalated
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(request.escalatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        to={`/officer/water-requests/${request.id}`}
                        className="text-cyan-600 hover:text-cyan-900 flex items-center"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No pending escalations</p>
        )}
      </div>

      {/* Recent Decisions */}
      <div className="bg-white rounded-lg border border-gray-100 p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Decisions</h2>
        {recentDecisions.propertyDecisions.length > 0 || recentDecisions.waterDecisions.length > 0 ? (
          <div className="space-y-3">
            {[...recentDecisions.propertyDecisions.slice(0, 3), ...recentDecisions.waterDecisions.slice(0, 3)]
              .sort((a, b) => new Date(b.decidedat) - new Date(a.decidedat))
              .slice(0, 5)
              .map((decision) => {
                const isProperty = decision.applicant !== undefined;
                return (
                  <div key={decision.id} className="border-b pb-3 last:border-b-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className={`px-2 py-1 rounded text-xs font-semibold mr-3 ${decision.status === 'APPROVED'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                          }`}>
                          {decision.status === 'APPROVED' ? (
                            <>
                              <CheckCircle className="w-3 h-3 inline mr-1" />
                              APPROVED
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 inline mr-1" />
                              REJECTED
                            </>
                          )}
                        </span>
                        <span className="text-sm text-gray-600">
                          {isProperty ? 'Property Application' : 'Water Request'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(decision.decidedat).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 mt-1">
                      {isProperty
                        ? `PA-${decision.id.toString().padStart(6, '0')} - ${decision.applicant?.firstName} ${decision.applicant?.lastName}`
                        : `WR-${decision.id.toString().padStart(6, '0')} - ${decision.requester?.firstName} ${decision.requester?.lastName}`
                      }
                    </p>
                  </div>
                );
              })}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No recent decisions</p>
        )}
      </div>

    </div>
  );
};

export default OfficerDashboard;
