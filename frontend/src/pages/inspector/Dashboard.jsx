import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Droplet, 
  CheckCircle, 
  XCircle, 
  RotateCcw,
  TrendingUp,
  Clock,
  Eye,
  AlertCircle,
  Home,
  Building,
  MapPin
} from 'lucide-react';
import { useStaffAuth } from '../../contexts/StaffAuthContext';
import { inspectorAPI } from '../../services/api';
import api from '../../services/api';

const InspectorDashboard = () => {
  const { user } = useStaffAuth();
  const [stats, setStats] = useState({
    pendingPropertyInspections: 0,
    pendingWaterInspections: 0,
    approvedPropertyToday: 0,
    approvedWaterToday: 0,
    rejectedPropertyToday: 0,
    rejectedWaterToday: 0,
    returnedPropertyToday: 0,
    returnedWaterToday: 0,
    totalInspectionsToday: 0
  });
  const [recentInspections, setRecentInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
      const [statsResponse, recentResponse] = await Promise.all([
        inspectorAPI.getDashboardStats(),
        inspectorAPI.getRecentInspections()
      ]);
      
      setStats(statsResponse.data);
      setRecentInspections(recentResponse.data);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Pending Property Inspections',
      value: stats.pendingPropertyInspections,
      icon: FileText,
      color: 'bg-blue-500',
      change: stats.pendingPropertyInspections > 0 ? 'Action Required' : 'All Clear'
    },
    {
      title: 'Pending Water Inspections',
      value: stats.pendingWaterInspections,
      icon: Droplet,
      color: 'bg-cyan-500',
      change: stats.pendingWaterInspections > 0 ? 'Action Required' : 'All Clear'
    },
    {
      title: 'Approved Today',
      value: stats.approvedPropertyToday + stats.approvedWaterToday,
      icon: CheckCircle,
      color: 'bg-green-500',
      change: 'Completed'
    },
    {
      title: 'Total Inspections Today',
      value: stats.totalInspectionsToday,
      icon: Eye,
      color: 'bg-purple-500',
      change: 'Activity'
    }
  ];

  const quickStats = [
    {
      title: 'Property Rejected Today',
      value: stats.rejectedPropertyToday,
      icon: XCircle,
      color: 'text-red-600 bg-red-100'
    },
    {
      title: 'Water Rejected Today',
      value: stats.rejectedWaterToday,
      icon: XCircle,
      color: 'text-red-600 bg-red-100'
    },
    {
      title: 'Property Returned Today',
      value: stats.returnedPropertyToday,
      icon: RotateCcw,
      color: 'text-orange-600 bg-orange-100'
    },
    {
      title: 'Water Returned Today',
      value: stats.returnedWaterToday,
      icon: RotateCcw,
      color: 'text-orange-600 bg-orange-100'
    }
  ];

  const quickActions = [
    {
      name: 'Property Inspections',
      icon: FileText,
      link: '/inspector/property-applications',
      color: 'bg-blue-500'
    },
    {
      name: 'Water Inspections',
      icon: Droplet,
      link: '/inspector/water-connections',
      color: 'bg-cyan-500'
    },
    {
      name: 'Recent Inspections',
      icon: Clock,
      link: '/inspector/recent-inspections',
      color: 'bg-purple-500'
    }
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

  // Check if inspector has no wards assigned
  if (wardInfo && wardInfo.count === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Ward Assigned</h2>
          <p className="text-gray-600 mb-6 max-w-md">
            You haven't been assigned to any ward yet. Please contact the administrator to get ward assignments.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md">
            <h3 className="text-sm font-medium text-yellow-800 mb-2">Next Steps:</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Contact your system administrator</li>
              <li>• Request ward assignment for your area</li>
              <li>• Once assigned, refresh this page</li>
            </ul>
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
          <h1 className="text-3xl font-bold text-gray-900">Inspector Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome to Inspection Portal</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Assigned Ward Information */}
      {wardInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <MapPin className="h-5 w-5 text-blue-600 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-blue-900">
                {wardInfo.count === 1 
                  ? wardInfo.wardDetails && wardInfo.wardDetails.length > 0
                    ? `Assigned Ward: ${wardInfo.wardDetails[0].wardNumber} - ${wardInfo.wardDetails[0].wardName}`
                    : `Assigned Ward: ${wardInfo.wardIds[0]}`
                  : `Assigned Wards: ${wardInfo.count} wards`
                }
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                {wardInfo.count === 1 
                  ? 'You have access to this ward for inspections' 
                  : wardInfo.wardDetails && wardInfo.wardDetails.length > 0
                    ? `You have access to wards: ${wardInfo.wardDetails.map(w => w.wardNumber).join(', ')}`
                    : `You have access to wards: ${wardInfo.wardIds.join(', ')}`
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{(stat.value || 0).toLocaleString()}</p>
                <p className={`text-sm mt-2 ${
                  stat.change === 'Action Required' ? 'text-orange-600' : 
                  stat.change === 'All Clear' ? 'text-green-600' : 
                  'text-gray-600'
                }`}>{stat.change}</p>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickStats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{stat.value || 0}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Inspections */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Inspections</h2>
        </div>
        <div className="p-6">
          {recentInspections && recentInspections.length > 0 ? (
            <div className="space-y-4">
              {recentInspections.map((inspection, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      inspection.status === 'APPROVED' ? 'bg-green-100' :
                      inspection.status === 'REJECTED' ? 'bg-red-100' :
                      inspection.status === 'RETURNED' ? 'bg-orange-100' :
                      'bg-blue-100'
                    }`}>
                      {
                        inspection.status === 'APPROVED' ? <CheckCircle className="h-4 w-4 text-green-600" /> :
                        inspection.status === 'REJECTED' ? <XCircle className="h-4 w-4 text-red-600" /> :
                        inspection.status === 'RETURNED' ? <RotateCcw className="h-4 w-4 text-orange-600" /> :
                        <Eye className="h-4 w-4 text-blue-600" />
                      }
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {inspection.type} #{inspection.applicationNumber || inspection.id} - {inspection.status}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(inspection.inspectedAt).toLocaleString()} - {inspection.inspectorName}
                    </p>
                    {inspection.inspectionRemarks && (
                      <p className="text-sm text-gray-600 mt-1">Remarks: {inspection.inspectionRemarks}</p>
                    )}
                    {inspection.rejectionReason && (
                      <p className="text-sm text-red-600 mt-1">Reason: {inspection.rejectionReason}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No recent inspections</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default InspectorDashboard;
