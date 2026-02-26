import { useState, useEffect } from 'react';
import { fieldMonitoringAPI, userAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { BarChart3, Users, MapPin, AlertTriangle, TrendingUp, Calendar, Filter, X, Eye } from 'lucide-react';
import FieldVisitDetailsModal from './FieldVisitDetailsModal';

const FieldMonitoring = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    collectorId: '',
    role: 'all',
    wardId: 'all',
    activityType: 'all',
    status: 'all'
  });
  const [collectors, setCollectors] = useState([]);
  const [wards, setWards] = useState([]);
  const [selectedVisitId, setSelectedVisitId] = useState(null);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showActivities, setShowActivities] = useState(false);

  useEffect(() => {
    fetchCollectors();
    fetchWards();
    fetchDashboard();
  }, [filters]);

  const fetchCollectors = async () => {
    try {
      const response = await userAPI.getAll({ role: 'collector', limit: 1000 });
      setCollectors(response.data.data.users);
    } catch (error) {
      console.error('Failed to fetch collectors:', error);
    }
  };

  const fetchWards = async () => {
    try {
      const response = await fieldMonitoringAPI.getWards();
      setWards(response.data.data.wards || []);
    } catch (error) {
      console.error('Failed to fetch wards:', error);
    }
  };

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const params = {
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      };
      const response = await fieldMonitoringAPI.getDashboard(params);
      setDashboard(response.data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch field monitoring data');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      collectorId: '',
      role: 'all',
      wardId: 'all',
      activityType: 'all',
      status: 'all'
    });
  };

  if (loading && !dashboard) return <Loading />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="ds-page-title">Field Operations Monitoring</h1>
          <p className="text-gray-600 mt-1">Real-time tracking of collector field visits and follow-ups</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="btn btn-secondary flex items-center"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Filters</h3>
            <button
              onClick={clearFilters}
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
            >
              <X className="w-4 h-4 mr-1" />
              Clear All
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="label">Collector</label>
              <select
                value={filters.collectorId}
                onChange={(e) => handleFilterChange('collectorId', e.target.value)}
                className="input"
              >
                <option value="">All Collectors</option>
                {collectors.map(collector => (
                  <option key={collector.id} value={collector.id}>
                    {collector.firstName} {collector.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Role</label>
              <select
                value={filters.role}
                onChange={(e) => handleFilterChange('role', e.target.value)}
                className="input"
              >
                <option value="all">All Roles</option>
                <option value="collector">Collector</option>
                <option value="inspector">Inspector</option>
                <option value="clerk">Clerk</option>
                <option value="officer">Officer</option>
              </select>
            </div>
            <div>
              <label className="label">Ward</label>
              <select
                value={filters.wardId}
                onChange={(e) => handleFilterChange('wardId', e.target.value)}
                className="input"
              >
                <option value="all">All Wards</option>
                {wards.map(ward => (
                  <option key={ward.id} value={ward.id}>
                    {ward.wardNumber} - {ward.wardName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Activity Type</label>
              <select
                value={filters.activityType}
                onChange={(e) => handleFilterChange('activityType', e.target.value)}
                className="input"
              >
                <option value="all">All Activities</option>
                <option value="field visit">Field Visit</option>
                <option value="property inspection">Property Inspection</option>
                <option value="water connection inspection">Water Connection Inspection</option>
                <option value="property application processing">Property Application Processing</option>
                <option value="water connection processing">Water Connection Processing</option>
                <option value="property application decision">Property Application Decision</option>
                <option value="water connection decision">Water Connection Decision</option>
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="input"
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="delayed">Delayed</option>
              </select>
            </div>
            <div>
              <label className="label">Date From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Date To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="input"
              />
            </div>
          </div>
        </div>
      )}

      {dashboard && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <div className="card bg-blue-50 border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 font-medium">Total Visits</p>
                  <p className="text-2xl font-bold text-blue-900">{dashboard.summary.totalVisits}</p>
                </div>
                <MapPin className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="card bg-green-50 border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-600 font-medium">Today's Visits</p>
                  <p className="text-2xl font-bold text-green-900">{dashboard.summary.todayVisits}</p>
                </div>
                <Calendar className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="card bg-purple-50 border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-600 font-medium">Total Tasks</p>
                  <p className="text-2xl font-bold text-purple-900">{dashboard.summary.totalTasks}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-purple-600" />
              </div>
            </div>
            <div className="card bg-orange-50 border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-orange-600 font-medium">Today's Tasks</p>
                  <p className="text-2xl font-bold text-orange-900">{dashboard.summary.todayTasks}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-600" />
              </div>
            </div>
            <div className="card bg-red-50 border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-600 font-medium">Active Follow-ups</p>
                  <p className="text-2xl font-bold text-red-900">{dashboard.summary.activeFollowUps}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <div className="card bg-yellow-50 border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-yellow-600 font-medium">Enforcement Eligible</p>
                  <p className="text-2xl font-bold text-yellow-900">{dashboard.summary.enforcementEligible}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Collector Performance */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Collector Performance
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Collector</th>
                      <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Visits</th>
                      <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Today</th>
                      <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Tasks</th>
                      <th className="text-left py-2 px-3 text-sm font-semibold text-gray-700">Follow-ups</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.collectorStats.map((stat, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3">
                          <div>
                            <div className="font-medium">{stat.collectorName}</div>
                            <div className="text-xs text-gray-500">{stat.assignedWards}</div>
                          </div>
                        </td>
                        <td className="py-2 px-3">{stat.totalVisits}</td>
                        <td className="py-2 px-3">
                          <span className={stat.todayVisits > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}>
                            {stat.todayVisits}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className={stat.pendingTasks > 0 ? 'text-orange-600 font-medium' : 'text-gray-400'}>
                            {stat.pendingTasks} pending
                          </span>
                        </td>
                        <td className="py-2 px-3">{stat.followUpsInWards}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Visits */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Recent Field Visits
              </h2>
              <div className="space-y-3">
                {dashboard.recentVisits && dashboard.recentVisits.length > 0 ? (
                  dashboard.recentVisits.map((visit) => (
                    <div key={visit.id} className="border-b border-gray-100 pb-3 last:border-0">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">{visit.collector?.firstName} {visit.collector?.lastName}</span>
                            <span className="text-xs text-gray-500">•</span>
                            <span className="text-xs text-gray-500 capitalize">{visit.visitType.replace('_', ' ')}</span>
                          </div>
                          <p className="text-sm text-gray-600">{visit.property?.propertyNumber}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(visit.visitDate).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs rounded ${
                            visit.isWithinAttendanceWindow ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {visit.isWithinAttendanceWindow ? 'Valid' : 'Flagged'}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedVisitId(visit.id);
                              setShowVisitModal(true);
                            }}
                            className="btn btn-sm btn-secondary flex items-center gap-1"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No recent visits</p>
                )}
              </div>
            </div>
          </div>

          {/* High Priority Follow-ups */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
              High Priority Follow-ups Requiring Attention
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Property</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Citizen</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Amount Due</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Visits</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.highPriorityFollowUps && dashboard.highPriorityFollowUps.length > 0 ? (
                    dashboard.highPriorityFollowUps.map((followUp) => (
                      <tr key={followUp.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-medium">{followUp.property?.propertyNumber}</div>
                          <div className="text-sm text-gray-500">{followUp.property?.ward?.wardName}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div>{followUp.owner?.firstName} {followUp.owner?.lastName}</div>
                          <div className="text-sm text-gray-500">{followUp.owner?.phone}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-red-600">
                            ₹{parseFloat(followUp.demand?.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-xs text-gray-500">{followUp.demand?.overdueDays} days overdue</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium">{followUp.visitCount}</div>
                          {followUp.lastVisitDate && (
                            <div className="text-xs text-gray-500">
                              Last: {new Date(followUp.lastVisitDate).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 text-xs rounded capitalize ${
                            followUp.escalationStatus === 'enforcement_eligible' ? 'bg-red-100 text-red-800' :
                            followUp.escalationStatus === 'final_warning' ? 'bg-orange-100 text-orange-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {followUp.escalationStatus.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 text-xs font-bold rounded ${
                            followUp.priority === 'critical' ? 'bg-red-600 text-white' :
                            followUp.priority === 'high' ? 'bg-orange-600 text-white' :
                            'bg-yellow-600 text-white'
                          }`}>
                            {followUp.priority.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center py-8 text-gray-500">
                        No high priority follow-ups
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Activity Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="card bg-blue-50 border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 font-medium">Total Activities</p>
                  <p className="text-2xl font-bold text-blue-900">{dashboard?.activitySummary?.totalActivities || 0}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="card bg-green-50 border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-600 font-medium">Completed</p>
                  <p className="text-2xl font-bold text-green-900">{dashboard?.activitySummary?.byStatus?.completed || 0}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="card bg-yellow-50 border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-yellow-600 font-medium">Pending</p>
                  <p className="text-2xl font-bold text-yellow-900">{dashboard?.activitySummary?.byStatus?.pending || 0}</p>
                </div>
                <Calendar className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
            <div className="card bg-red-50 border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-600 font-medium">Delayed</p>
                  <p className="text-2xl font-bold text-red-900">{dashboard?.activitySummary?.byStatus?.delayed || 0}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </div>

          {/* Comprehensive Field Activities */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <Users className="w-5 h-5 mr-2" />
                All Field Activities
              </h2>
              <button
                onClick={() => setShowActivities(!showActivities)}
                className="btn btn-secondary flex items-center"
              >
                <Filter className="w-4 h-4 mr-2" />
                {showActivities ? 'Hide Activities' : 'Show Activities'}
              </button>
            </div>

            {showActivities && (
              <>
                {/* Role-based Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{dashboard?.activitySummary?.byRole?.collector || 0}</p>
                    <p className="text-sm text-gray-600">Collector Activities</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">{dashboard?.activitySummary?.byRole?.inspector || 0}</p>
                    <p className="text-sm text-gray-600">Inspector Activities</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{dashboard?.activitySummary?.byRole?.clerk || 0}</p>
                    <p className="text-sm text-gray-600">Clerk Activities</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">{dashboard?.activitySummary?.byRole?.officer || 0}</p>
                    <p className="text-sm text-gray-600">Officer Activities</p>
                  </div>
                </div>

                {/* Activities Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">User</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Role</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Ward</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Activity Type</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Entity</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Timestamp</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard?.allFieldActivities && dashboard.allFieldActivities.length > 0 ? (
                        dashboard.allFieldActivities.map((activity) => (
                          <tr key={activity.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="font-medium">{activity.userName}</div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 text-xs rounded capitalize ${
                                activity.role === 'Collector' ? 'bg-blue-100 text-blue-800' :
                                activity.role === 'Inspector' ? 'bg-purple-100 text-purple-800' :
                                activity.role === 'Clerk' ? 'bg-green-100 text-green-800' :
                                'bg-orange-100 text-orange-800'
                              }`}>
                                {activity.role}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-sm">{activity.ward}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-sm capitalize">{activity.activityType}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div>
                                <div className="font-medium text-sm">{activity.entityIdentifier}</div>
                                <div className="text-xs text-gray-500">{activity.entityType}</div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-sm">
                                {new Date(activity.timestamp).toLocaleString()}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 text-xs rounded capitalize ${
                                activity.status === 'completed' ? 'bg-green-100 text-green-800' :
                                activity.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {activity.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="text-center py-8 text-gray-500">
                            No field activities found matching the current filters
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Field Visit Details Modal */}
      <FieldVisitDetailsModal
        visitId={selectedVisitId}
        isOpen={showVisitModal}
        onClose={() => {
          setShowVisitModal(false);
          setSelectedVisitId(null);
        }}
      />
    </div>
  );
};

export default FieldMonitoring;
