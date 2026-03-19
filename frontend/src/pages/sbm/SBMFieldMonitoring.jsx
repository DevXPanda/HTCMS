import { useState, useEffect } from 'react';
import { fieldMonitoringAPI, userAPI } from '../../services/api';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import { BarChart3, Users, MapPin, AlertTriangle, TrendingUp, Calendar, Filter, X, Eye } from 'lucide-react';
import FieldVisitDetailsModal from '../admin/fieldMonitoring/FieldVisitDetailsModal';

const SBMFieldMonitoring = () => {
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

  useEffect(() => {
    userAPI.getCollectors().then((res) => {
      const list = res.data?.data?.collectors ?? [];
      setCollectors(Array.isArray(list) ? list : []);
    }).catch(() => setCollectors([]));
    fieldMonitoringAPI.getWards().then((res) => {
      const list = res.data?.data?.wards ?? [];
      setWards(Array.isArray(list) ? list : []);
    }).catch(() => setWards([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const params = { ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== '' && v !== 'all')) };
        const response = await fieldMonitoringAPI.getDashboard(params);
        if (!cancelled) setDashboard(response.data?.data ?? null);
      } catch (e) {
        if (!cancelled) toast.error(e.response?.data?.message || 'Failed to fetch field monitoring data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
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
    <div className="space-y-6">
      <div className="no-print">
        <h1 className="text-2xl font-bold text-gray-900">Field Operations Monitoring (Read-only)</h1>
        <p className="text-gray-600 text-sm mt-1">Same data as Super Admin. Real-time tracking of collector field visits and follow-ups.</p>
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

      {showFilters && (
        <div className="card no-print">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Filters</h3>
            <button type="button" onClick={clearFilters} className="text-sm text-violet-600 hover:text-violet-700 flex items-center gap-1">
              <X className="w-4 h-4" /> Clear All
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="label">Collector</label>
              <select value={filters.collectorId} onChange={(e) => handleFilterChange('collectorId', e.target.value)} className="input w-full">
                <option value="">All Collectors</option>
                {collectors.map((c) => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Ward</label>
              <select value={filters.wardId} onChange={(e) => handleFilterChange('wardId', e.target.value)} className="input w-full">
                <option value="all">All Wards</option>
                {wards.map((w) => (
                  <option key={w.id} value={w.id}>{w.wardNumber} - {w.wardName}</option>
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
          </div>
        </div>
      )}

      {dashboard && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="card bg-blue-50 border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 font-medium">Total Visits</p>
                  <p className="text-2xl font-bold text-blue-900">{dashboard.summary?.totalVisits ?? 0}</p>
                </div>
                <MapPin className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="card bg-green-50 border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-600 font-medium">Today&apos;s Visits</p>
                  <p className="text-2xl font-bold text-green-900">{dashboard.summary?.todayVisits ?? 0}</p>
                </div>
                <Calendar className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div className="card bg-purple-50 border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-600 font-medium">Total Tasks</p>
                  <p className="text-2xl font-bold text-purple-900">{dashboard.summary?.totalTasks ?? 0}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-purple-600" />
              </div>
            </div>
            <div className="card bg-orange-50 border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-orange-600 font-medium">Today&apos;s Tasks</p>
                  <p className="text-2xl font-bold text-orange-900">{dashboard.summary?.todayTasks ?? 0}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-600" />
              </div>
            </div>
            <div className="card bg-red-50 border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-600 font-medium">Active Follow-ups</p>
                  <p className="text-2xl font-bold text-red-900">{dashboard.summary?.activeFollowUps ?? 0}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            <div className="card bg-yellow-50 border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-yellow-600 font-medium">Enforcement Eligible</p>
                  <p className="text-2xl font-bold text-yellow-900">{dashboard.summary?.enforcementEligible ?? 0}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Users className="w-5 h-5" /> Collector Performance</h2>
              <div className="table-wrap">
                <table className="table">
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
                    {(dashboard.collectorStats || []).map((stat, i) => (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-3">
                          <div className="font-medium">{stat.collectorName}</div>
                          <div className="text-xs text-gray-500">{stat.assignedWards}</div>
                        </td>
                        <td className="py-2 px-3">{stat.totalVisits}</td>
                        <td className="py-2 px-3">{stat.todayVisits}</td>
                        <td className="py-2 px-3">{stat.pendingTasks} pending</td>
                        <td className="py-2 px-3">{stat.followUpsInWards}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Calendar className="w-5 h-5" /> Recent Field Visits</h2>
              <div className="space-y-3">
                {dashboard.recentVisits?.length > 0 ? (
                  dashboard.recentVisits.map((visit) => (
                    <div key={visit.id} className="border-b border-gray-100 pb-3 last:border-0">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">{visit.collector?.firstName} {visit.collector?.lastName}</span>
                            <span className="text-xs text-gray-500 capitalize">{visit.visitType?.replace('_', ' ')}</span>
                          </div>
                          <p className="text-sm text-gray-600">{visit.property?.propertyNumber}</p>
                          <p className="text-xs text-gray-500 mt-1">{visit.visitDate ? new Date(visit.visitDate).toLocaleString() : ''}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setSelectedVisitId(visit.id); setShowVisitModal(true); }}
                          className="btn btn-sm btn-secondary flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" /> View
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No recent visits</p>
                )}
              </div>
            </div>
          </div>

          {dashboard.highPriorityFollowUps?.length > 0 && (
            <div className="card">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-600" /> High Priority Follow-ups</h2>
              <div className="table-wrap">
                <table className="table">
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
                    {dashboard.highPriorityFollowUps.map((fu) => (
                      <tr key={fu.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-medium">{fu.property?.propertyNumber}</div>
                          <div className="text-sm text-gray-500">{fu.property?.ward?.wardName}</div>
                        </td>
                        <td className="py-3 px-4">{fu.owner?.firstName} {fu.owner?.lastName}</td>
                        <td className="py-3 px-4">₹{parseFloat(fu.demand?.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="py-3 px-4">{fu.visitCount}</td>
                        <td className="py-3 px-4"><span className="px-2 py-1 text-xs rounded capitalize bg-orange-100 text-orange-800">{fu.escalationStatus?.replace('_', ' ')}</span></td>
                        <td className="py-3 px-4"><span className="px-2 py-1 text-xs font-bold rounded bg-red-600 text-white">{fu.priority?.toUpperCase()}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {showVisitModal && selectedVisitId && (
        <FieldVisitDetailsModal
          visitId={selectedVisitId}
          onClose={() => { setShowVisitModal(false); setSelectedVisitId(null); }}
        />
      )}
    </div>
  );
};

export default SBMFieldMonitoring;
