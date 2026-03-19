import { useState, useEffect } from 'react';
import { attendanceAPI, userAPI } from '../../services/api';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import { Search, Filter, X, Eye, Calendar, User, Clock, MapPin, Monitor, Smartphone, Tablet, Globe, Users, Briefcase, Shield, UserCog, ClipboardList } from 'lucide-react';
import AttendanceDetailsModal from '../admin/attendance/AttendanceDetailsModal';
import { formatDateTimeIST } from '../../utils/dateUtils';
import api from '../../services/api';

const SBM_ULB_STORAGE_KEY = 'htcms_sbm_selected_ulb_id';

const getRecordRole = (record) => {
  const r = (record.collector?.role || '').toLowerCase().replace(/-/g, '_');
  if (r === 'tax_collector') return 'collector';
  if (r === 'super_admin') return 'admin';
  return r;
};

const SBMAttendance = () => {
  const [attendance, setAttendance] = useState([]);
  const [allAttendance, setAllAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [collectors, setCollectors] = useState([]);
  const [ulbs, setUlbs] = useState([]);
  const [selectedRole, setSelectedRole] = useState('all');
  const [filters, setFilters] = useState({
    collectorId: '',
    dateFrom: '',
    dateTo: '',
    deviceType: '',
    source: '',
    hasNoLogout: '',
    ulb_id: (() => {
      try { return sessionStorage.getItem(SBM_ULB_STORAGE_KEY) || ''; } catch { return ''; }
    })()
  });

  useEffect(() => {
    api.get('/admin-management/ulbs').then((res) => {
      const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setUlbs(Array.isArray(data) ? data : []);
    }).catch(() => setUlbs([]));
    userAPI.getCollectors().then((res) => {
      setCollectors(res.data?.data?.collectors || []);
    }).catch(() => setCollectors([]));
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [search, filters]);

  useEffect(() => {
    if (allAttendance.length > 0) {
      const filtered = selectedRole === 'all'
        ? allAttendance
        : allAttendance.filter((record) => getRecordRole(record) === selectedRole);
      setAttendance(filtered);
    }
  }, [selectedRole, allAttendance]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const params = {
        search,
        limit: 10000,
        sortBy: 'loginAt',
        sortOrder: 'DESC',
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== '' && v != null))
      };
      const res = await attendanceAPI.getAll(params);
      const records = res.data?.data?.attendance ?? [];
      setAllAttendance(records);
      const filtered = selectedRole === 'all'
        ? records
        : records.filter((record) => getRecordRole(record) === selectedRole);
      setAttendance(filtered);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch attendance');
      setAttendance([]);
      setAllAttendance([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'ulb_id') {
        try {
          if (value) sessionStorage.setItem(SBM_ULB_STORAGE_KEY, value);
          else sessionStorage.removeItem(SBM_ULB_STORAGE_KEY);
        } catch (_) {}
      }
      return next;
    });
  };

  const clearFilters = () => {
    handleFilterChange('collectorId', '');
    handleFilterChange('dateFrom', '');
    handleFilterChange('dateTo', '');
    handleFilterChange('deviceType', '');
    handleFilterChange('source', '');
    handleFilterChange('hasNoLogout', '');
  };

  const formatDuration = (minutes) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return formatDateTimeIST(dateString);
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
    <div className="space-y-4">
      <div className="no-print">
        <h1 className="text-2xl font-bold text-gray-900">Attendance (Read-only)</h1>
        <p className="text-gray-600 text-sm mt-1">Same as Super Admin. Track attendance for all staff members.</p>
      </div>

      {/* Role summary boxes – same as Super Admin */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <button
          type="button"
          onClick={() => setSelectedRole('all')}
          className={`card p-4 cursor-pointer transition-all hover:shadow-lg text-left ${selectedRole === 'all' ? 'ring-2 ring-gray-500 bg-gray-50' : ''}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">All Staff</p>
              <p className="text-2xl font-bold text-gray-900">{allAttendance.length}</p>
            </div>
            <Users className="w-8 h-8 text-gray-500" />
          </div>
        </button>
        <button
          type="button"
          onClick={() => setSelectedRole('admin')}
          className={`card p-4 cursor-pointer transition-all hover:shadow-lg text-left ${selectedRole === 'admin' ? 'ring-2 ring-indigo-500 bg-indigo-50' : ''}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Admin Attendance</p>
              <p className="text-2xl font-bold text-gray-900">
                {allAttendance.filter((r) => getRecordRole(r) === 'admin').length}
              </p>
            </div>
            <UserCog className="w-8 h-8 text-indigo-500" />
          </div>
        </button>
        <button
          type="button"
          onClick={() => setSelectedRole('eo')}
          className={`card p-4 cursor-pointer transition-all hover:shadow-lg text-left ${selectedRole === 'eo' ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">EO Attendance</p>
              <p className="text-2xl font-bold text-gray-900">
                {allAttendance.filter((r) => getRecordRole(r) === 'eo').length}
              </p>
            </div>
            <Briefcase className="w-8 h-8 text-blue-500" />
          </div>
        </button>
        <button
          type="button"
          onClick={() => setSelectedRole('collector')}
          className={`card p-4 cursor-pointer transition-all hover:shadow-lg text-left ${selectedRole === 'collector' ? 'ring-2 ring-orange-500 bg-orange-50' : ''}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Collector Attendance</p>
              <p className="text-2xl font-bold text-gray-900">
                {allAttendance.filter((r) => getRecordRole(r) === 'collector').length}
              </p>
            </div>
            <Users className="w-8 h-8 text-orange-500" />
          </div>
        </button>
        <button
          type="button"
          onClick={() => setSelectedRole('supervisor')}
          className={`card p-4 cursor-pointer transition-all hover:shadow-lg text-left ${selectedRole === 'supervisor' ? 'ring-2 ring-teal-500 bg-teal-50' : ''}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Supervisor Attendance</p>
              <p className="text-2xl font-bold text-gray-900">
                {allAttendance.filter((r) => getRecordRole(r) === 'supervisor').length}
              </p>
            </div>
            <ClipboardList className="w-8 h-8 text-teal-500" />
          </div>
        </button>
        <button
          type="button"
          onClick={() => setSelectedRole('sfi')}
          className={`card p-4 cursor-pointer transition-all hover:shadow-lg text-left ${selectedRole === 'sfi' ? 'ring-2 ring-cyan-500 bg-cyan-50' : ''}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">SFI Attendance</p>
              <p className="text-2xl font-bold text-gray-900">
                {allAttendance.filter((r) => getRecordRole(r) === 'sfi').length}
              </p>
            </div>
            <Shield className="w-8 h-8 text-cyan-500" />
          </div>
        </button>
      </div>

      <div className="no-print flex justify-end">
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="btn btn-secondary flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); fetchAttendance(); }} className="no-print">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by collector name or email..."
              className="input pl-10 w-full"
            />
          </div>
          <button type="submit" className="btn btn-primary">Search</button>
        </div>
      </form>

      {showFilters && (
        <div className="card no-print">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Filters</h3>
            <button type="button" onClick={clearFilters} className="text-sm text-violet-600 hover:text-violet-700 flex items-center gap-1">
              <X className="w-4 h-4" />
              Clear All
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="label">ULB</label>
              <select value={filters.ulb_id} onChange={(e) => handleFilterChange('ulb_id', e.target.value)} className="input w-full">
                <option value="">All ULBs</option>
                {ulbs.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Collector</label>
              <select value={filters.collectorId} onChange={(e) => handleFilterChange('collectorId', e.target.value)} className="input w-full">
                <option value="">All Collectors</option>
                {collectors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName && c.lastName ? `${c.firstName} ${c.lastName}` : (c.full_name || c.employee_id || c.id)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Date From</label>
              <input type="date" value={filters.dateFrom} onChange={(e) => handleFilterChange('dateFrom', e.target.value)} className="input w-full" />
            </div>
            <div>
              <label className="label">Date To</label>
              <input type="date" value={filters.dateTo} onChange={(e) => handleFilterChange('dateTo', e.target.value)} className="input w-full" />
            </div>
            <div>
              <label className="label">Device Type</label>
              <select value={filters.deviceType} onChange={(e) => handleFilterChange('deviceType', e.target.value)} className="input w-full">
                <option value="">All Devices</option>
                <option value="mobile">Mobile</option>
                <option value="tablet">Tablet</option>
                <option value="desktop">Desktop</option>
              </select>
            </div>
            <div>
              <label className="label">Source</label>
              <select value={filters.source} onChange={(e) => handleFilterChange('source', e.target.value)} className="input w-full">
                <option value="">All Sources</option>
                <option value="web">Web</option>
                <option value="mobile">Mobile App</option>
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select value={filters.hasNoLogout} onChange={(e) => handleFilterChange('hasNoLogout', e.target.value)} className="input w-full">
                <option value="">All</option>
                <option value="true">No Logout</option>
                <option value="false">Completed</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="table-wrap">
          <table className="table">
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
                <th className="text-left py-3 px-4 font-semibold text-gray-700 print-hide-col">Actions</th>
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
                        <div className="font-medium">{formatDateTime(record.loginAt)}</div>
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
                        <span className="capitalize">{record.deviceType || '—'}</span>
                        {getSourceIcon(record.source)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm">{record.browserName || 'N/A'}</div>
                      <div className="text-xs text-gray-500">{record.operatingSystem || 'N/A'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm font-mono">{record.ipAddress || '—'}</div>
                    </td>
                    <td className="py-3 px-4 print-hide-col">
                      <button
                        type="button"
                        onClick={() => setSelectedRecord(record)}
                        className="btn btn-sm btn-secondary flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRecord && (
        <AttendanceDetailsModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
      )}
    </div>
  );
};

export default SBMAttendance;
