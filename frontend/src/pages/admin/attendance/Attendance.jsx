import { useState, useEffect } from 'react';
import { attendanceAPI, userAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { Search, Filter, X, Eye, Calendar, User, Clock, MapPin, Monitor, Smartphone, Tablet, Globe, Users, Briefcase, Shield, UserCheck, ClipboardList, UserCog } from 'lucide-react';
import AttendanceDetailsModal from './AttendanceDetailsModal';
import { useSelectedUlb } from '../../../contexts/SelectedUlbContext';

// Normalize role from API (backend may return uppercase e.g. CLERK, COLLECTOR)
const getRecordRole = (record) => {
  const r = (record.collector?.role || '').toLowerCase().replace(/-/g, '_');
  if (r === 'tax_collector') return 'collector';
  if (r === 'super_admin') return 'admin'; // show super_admin in Admin Attendance
  return r;
};

const Attendance = () => {
  const { effectiveUlbId, isSuperAdmin } = useSelectedUlb();
  const [attendance, setAttendance] = useState([]);
  const [allAttendance, setAllAttendance] = useState([]); // Store all fetched records for frontend filtering
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [collectors, setCollectors] = useState([]);
  // Active roles only: all | admin | eo | collector | supervisor | field_worker (deprecated: clerk, inspector, officer)
  const [selectedRole, setSelectedRole] = useState('all');
  const [filters, setFilters] = useState({
    collectorId: '',
    dateFrom: '',
    dateTo: '',
    deviceType: '',
    source: '',
    hasNoLogout: '',
    lateLogin: ''
  });

  useEffect(() => {
    fetchCollectors();
    fetchAttendance();
  }, [search, filters, effectiveUlbId]);

  // When admin (not super admin) and 'admin' role is selected, reset to 'all' since Admin Attendance card is hidden
  useEffect(() => {
    if (!isSuperAdmin && selectedRole === 'admin') setSelectedRole('all');
  }, [isSuperAdmin, selectedRole]);

  // Frontend filter when selected role changes
  useEffect(() => {
    if (allAttendance.length > 0) {
      const filtered = selectedRole === 'all'
        ? allAttendance
        : allAttendance.filter(record => getRecordRole(record) === selectedRole);
      setAttendance(filtered);
    }
  }, [selectedRole, allAttendance]);

  const fetchCollectors = async () => {
    try {
      const response = await userAPI.getCollectors();
      setCollectors(response.data.data.collectors || []);
    } catch (error) {
      console.error('Failed to fetch collectors:', error);
    }
  };

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const params = {
        search,
        limit: 10000,
        sortBy: 'loginAt',
        sortOrder: 'DESC',
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      };
      if (effectiveUlbId) params.ulb_id = effectiveUlbId;
      const response = await attendanceAPI.getAll(params);
      const records = response.data.data.attendance || [];
      setAllAttendance(records);

      // Apply frontend role filtering (case-insensitive)
      const filtered = selectedRole === 'all'
        ? records
        : records.filter(record => getRecordRole(record) === selectedRole);
      setAttendance(filtered);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch attendance records');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      collectorId: '',
      dateFrom: '',
      dateTo: '',
      deviceType: '',
      source: '',
      hasNoLogout: '',
      lateLogin: ''
    });
  };

  const formatDuration = (minutes) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDeviceIcon = (deviceType) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="w-4 h-4" />;
      case 'tablet':
        return <Tablet className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  const getSourceIcon = (source) => {
    return source === 'mobile' ? <Smartphone className="w-4 h-4" /> : <Globe className="w-4 h-4" />;
  };

  if (loading && !attendance.length) return <Loading />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Staff Attendance</h1>
          <p className="text-gray-600 mt-1">Track attendance for all staff members</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="btn btn-secondary flex items-center"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </button>
      </div>

      {/* Role Summary Boxes - Admin Attendance card only for super admin */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 ${isSuperAdmin ? 'lg:grid-cols-6' : 'lg:grid-cols-5'}`}>
        <button
          type="button"
          onClick={() => setSelectedRole('all')}
          className={`card p-4 cursor-pointer transition-all hover:shadow-lg ${selectedRole === 'all' ? 'ring-2 ring-gray-500 bg-gray-50' : ''}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">All Staff</p>
              <p className="text-2xl font-bold text-gray-900">{allAttendance.length}</p>
            </div>
            <Users className="w-8 h-8 text-gray-500" />
          </div>
        </button>

        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setSelectedRole('admin')}
            className={`card p-4 cursor-pointer transition-all hover:shadow-lg ${selectedRole === 'admin' ? 'ring-2 ring-indigo-500 bg-indigo-50' : ''}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Admin Attendance</p>
                <p className="text-2xl font-bold text-gray-900">
                  {allAttendance.filter(r => getRecordRole(r) === 'admin').length}
                </p>
              </div>
              <UserCog className="w-8 h-8 text-indigo-500" />
            </div>
          </button>
        )}

        <button
          type="button"
          onClick={() => setSelectedRole('eo')}
          className={`card p-4 cursor-pointer transition-all hover:shadow-lg ${selectedRole === 'eo' ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">EO Attendance</p>
              <p className="text-2xl font-bold text-gray-900">
                {allAttendance.filter(r => getRecordRole(r) === 'eo').length}
              </p>
            </div>
            <Briefcase className="w-8 h-8 text-blue-500" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedRole('collector')}
          className={`card p-4 cursor-pointer transition-all hover:shadow-lg ${selectedRole === 'collector' ? 'ring-2 ring-orange-500 bg-orange-50' : ''}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Collector Attendance</p>
              <p className="text-2xl font-bold text-gray-900">
                {allAttendance.filter(r => getRecordRole(r) === 'collector').length}
              </p>
            </div>
            <Users className="w-8 h-8 text-orange-500" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedRole('supervisor')}
          className={`card p-4 cursor-pointer transition-all hover:shadow-lg ${selectedRole === 'supervisor' ? 'ring-2 ring-teal-500 bg-teal-50' : ''}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Supervisor Attendance</p>
              <p className="text-2xl font-bold text-gray-900">
                {allAttendance.filter(r => getRecordRole(r) === 'supervisor').length}
              </p>
            </div>
            <ClipboardList className="w-8 h-8 text-teal-500" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedRole('field_worker')}
          className={`card p-4 cursor-pointer transition-all hover:shadow-lg ${selectedRole === 'field_worker' ? 'ring-2 ring-cyan-500 bg-cyan-50' : ''}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Field Worker Attendance</p>
              <p className="text-2xl font-bold text-gray-900">
                {allAttendance.filter(r => getRecordRole(r) === 'field_worker').length}
              </p>
            </div>
            <UserCheck className="w-8 h-8 text-cyan-500" />
          </div>
        </button>
      </div>

      {/* Search */}
      <form onSubmit={(e) => { e.preventDefault(); fetchAttendance(); }} className="mb-6">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by collector name or email..."
              className="input pl-10"
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </div>
      </form>

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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <div>
              <label className="label">Device Type</label>
              <select
                value={filters.deviceType}
                onChange={(e) => handleFilterChange('deviceType', e.target.value)}
                className="input"
              >
                <option value="">All Devices</option>
                <option value="mobile">Mobile</option>
                <option value="tablet">Tablet</option>
                <option value="desktop">Desktop</option>
              </select>
            </div>
            <div>
              <label className="label">Source</label>
              <select
                value={filters.source}
                onChange={(e) => handleFilterChange('source', e.target.value)}
                className="input"
              >
                <option value="">All Sources</option>
                <option value="web">Web</option>
                <option value="mobile">Mobile App</option>
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select
                value={filters.hasNoLogout}
                onChange={(e) => handleFilterChange('hasNoLogout', e.target.value)}
                className="input"
              >
                <option value="">All</option>
                <option value="true">No Logout</option>
                <option value="false">Completed</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Staff Member</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Login Time</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Logout Time</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Duration</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Location</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Device</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Browser</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">IP Address</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {attendance.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-gray-500">
                    No attendance records found
                  </td>
                </tr>
              ) : (
                attendance.map((record) => (
                  <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-2 text-gray-400" />
                        <div>
                          <div className="font-medium">
                            {record.collector?.firstName || record.collector?.full_name} {record.collector?.lastName || ''}
                          </div>
                          <div className="text-xs text-gray-500">{record.collector?.email}</div>
                          <div className="text-xs text-blue-600 capitalize">{record.collector?.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                        <div>
                          <div className="font-medium">{formatDateTime(record.loginAt)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {record.logoutAt ? (
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                          <div className="font-medium">{formatDateTime(record.logoutAt)}</div>
                        </div>
                      ) : (
                        <span className="text-orange-600 font-medium">Active Session</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-gray-400" />
                        <span className="font-medium">{formatDuration(record.workingDurationMinutes)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {record.loginAddress ? (
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                          <span className="text-sm">{record.loginAddress}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getDeviceIcon(record.deviceType)}
                        <span className="capitalize">{record.deviceType}</span>
                        {getSourceIcon(record.source)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm">{record.browserName || 'N/A'}</div>
                      <div className="text-xs text-gray-500">{record.operatingSystem || 'N/A'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm font-mono">{record.ipAddress}</div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setSelectedRecord(record)}
                        className="btn btn-sm btn-secondary flex items-center"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination removed */}
      </div>

      {/* Details Modal */}
      {selectedRecord && (
        <AttendanceDetailsModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}
    </div>
  );
};

export default Attendance;
