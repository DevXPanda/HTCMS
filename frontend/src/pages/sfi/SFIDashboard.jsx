import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bath, Recycle, Heart, Users, BarChart3, AlertCircle, AlertTriangle, RefreshCw, UserCheck, X, Clock, FileText, Shield } from 'lucide-react';
import { useStaffAuth } from '../../contexts/StaffAuthContext';
import api from '../../services/api';

const MODULE_CONFIG = [
  { key: 'toilet', to: '/sfi/toilet-management', label: 'Toilet Management', icon: Bath, description: 'Facilities, inspections, complaints, maintenance' },
  { key: 'mrf', to: '/sfi/mrf', label: 'MRF', icon: Recycle, description: 'Facilities, waste entries, staff assignment, tasks' },
  { key: 'gaushala', to: '/sfi/gaushala/management', label: 'Gaushala', icon: Heart, description: 'Facilities, cattle, inspections, feeding, complaints' }
];
// Worker management is always shown on SFI dashboard (not an assignable module in admin)
const STAFF_ASSIGNMENT_MODULE = { key: 'worker_management', to: '/sfi/workers', label: 'Staff Assignment', icon: Users, description: 'Workers and supervisors, attendance, payroll' };

const REPORT_LINKS = [
  { key: 'toilet', to: '/sfi/toilet-management/reports', label: 'Toilet Reports', icon: Bath },
  { key: 'mrf', to: '/sfi/mrf/reports', label: 'MRF Reports', icon: Recycle },
  { key: 'gaushala', to: '/sfi/gaushala/reports', label: 'Gaushala Reports', icon: Heart }
];

const SFIDashboard = () => {
  const { user } = useStaffAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchDashboard = async () => {
      try {
        setError(null);
        setLoading(true);
        const res = await api.get('/sfi/dashboard');
        if (cancelled) return;
        if (res.data?.success && res.data?.data) {
          setStats(res.data.data);
        } else {
          setStats(null);
        }
      } catch (err) {
        if (cancelled) return;
        const status = err.response?.status;
        const message = err.response?.data?.message || err.message;
        setError({ status, message });
        setStats(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchDashboard();
    return () => { cancelled = true; };
  }, []);

  const assignedModules = Array.isArray(user?.assigned_modules)
    ? user.assigned_modules.map((m) => (typeof m === 'string' ? m.toLowerCase().replace(/-/g, '_') : String(m)))
    : [];
  const showOnlyAssigned = assignedModules.length > 0;
  const rawModules = showOnlyAssigned
    ? MODULE_CONFIG.filter((m) => assignedModules.includes(m.key))
    : MODULE_CONFIG;
  // Always include Staff Assignment (worker management) on SFI dashboard; de-dupe by route
  const modulesWithWorker = rawModules.some((m) => m.to === '/sfi/workers') ? rawModules : [...rawModules, STAFF_ASSIGNMENT_MODULE];
  const modules = modulesWithWorker.filter((m, i, arr) => arr.findIndex((x) => x.to === m.to) === i);
  // Quick reports: only show reports for assigned modules (same filter as modules)
  const reportLinks = showOnlyAssigned
    ? REPORT_LINKS.filter((r) => assignedModules.includes(r.key))
    : REPORT_LINKS;

  const [staffDetailsOpen, setStaffDetailsOpen] = useState(false);
  const [staffDetails, setStaffDetails] = useState({ workers: [], supervisors: [] });
  const [staffDetailsLoading, setStaffDetailsLoading] = useState(false);
  const openStaffDetails = async () => {
    setStaffDetailsOpen(true);
    setStaffDetailsLoading(true);
    setStaffDetails({ workers: [], supervisors: [] });
    try {
      const [workersRes, supervisorsRes] = await Promise.all([
        api.get('/workers').catch(() => ({ data: [] })),
        api.get('/admin-management/employees/by-ulb?role=SUPERVISOR').catch(() => ({ data: [] }))
      ]);
      const workersList = workersRes?.data?.data?.workers ?? (Array.isArray(workersRes?.data) ? workersRes.data : []);
      const supervisorsList = supervisorsRes?.data?.employees ?? (Array.isArray(supervisorsRes?.data) ? supervisorsRes.data : []);
      setStaffDetails({ workers: workersList, supervisors: supervisorsList });
    } finally {
      setStaffDetailsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <RefreshCw className="w-10 h-10 animate-spin text-primary-500 mb-4" />
        <p className="text-gray-600">Loading dashboard...</p>
      </div>
    );
  }

  if (error?.status === 403 || (error && (error.message || '').toLowerCase().includes('assigned'))) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">SFI Dashboard</h1>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 flex items-start gap-4">
          <AlertTriangle className="w-8 h-8 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="font-semibold text-amber-900 mb-1">No access</h2>
            <p className="text-amber-800 mb-4">
              {error?.message || 'You are not assigned to any ULB or wards. Contact your administrator to get access.'}
            </p>
            <p className="text-sm text-amber-700">Once assigned, you will see facility and worker stats here.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {modules.map(({ to, label, icon: Icon, description }) => (
            <Link
              key={to}
              to={to}
              className="block p-6 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-primary-200 transition-all"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600">
                  <Icon className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">{label}</h2>
              </div>
              <p className="text-sm text-gray-500">{description}</p>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const d = stats || {};
  const workers = d.workers || {};
  const supervisors = d.supervisors || {};
  const facilities = d.facilities || {};
  const complaints = d.complaints || {};
  const attendance = d.attendance || {};

  // Summary filtered by assigned modules only
  const showToilet = !showOnlyAssigned || assignedModules.includes('toilet');
  const showMrf = !showOnlyAssigned || assignedModules.includes('mrf');
  const showGaushala = !showOnlyAssigned || assignedModules.includes('gaushala');
  const facilityTotal = (showToilet ? (facilities.toilet ?? 0) : 0) + (showMrf ? (facilities.mrf ?? 0) : 0) + (showGaushala ? (facilities.gaushala ?? 0) : 0);
  const facilityParts = [];
  if (showToilet) facilityParts.push(`T: ${facilities.toilet ?? 0}`);
  if (showMrf) facilityParts.push(`M: ${facilities.mrf ?? 0}`);
  if (showGaushala) facilityParts.push(`G: ${facilities.gaushala ?? 0}`);
  const facilitySubtitle = facilityParts.length ? facilityParts.join(' · ') : '—';
  const complaintsTotalFiltered = (showToilet ? (complaints.toiletPending ?? 0) : 0) + (showGaushala ? (complaints.gaushalaPending ?? 0) : 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">SFI Dashboard</h1>
        <p className="text-gray-600 mt-1">Sanitary & Food Inspector</p>
      </div>

      {stats && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <button
              type="button"
              onClick={openStaffDetails}
              className="w-full text-left block p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-primary-200 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Workers</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{workers.total ?? 0}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {workers.presentToday ?? 0} present today ({workers.presencePercent ?? 0}%)
                  </p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={openStaffDetails}
              className="w-full text-left block p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-primary-200 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Supervisors</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{supervisors.total ?? 0}</p>
                  <p className="text-xs text-gray-500 mt-1">in your ULB</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-indigo-600" />
                </div>
              </div>
            </button>
            <div className="block p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Facilities</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{facilityTotal}</p>
                  <p className="text-xs text-gray-500 mt-1">{facilitySubtitle}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <Bath className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            {showToilet && (
              <Link
                to="/sfi/toilet-management/complaints"
                className="block p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-primary-200 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Toilet complaints pending</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{complaints.toiletPending ?? 0}</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-amber-100 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
              </Link>
            )}
            {showGaushala && (
              <Link
                to="/sfi/gaushala/complaints"
                className="block p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-primary-200 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Gaushala complaints pending</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{complaints.gaushalaPending ?? 0}</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Heart className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
              </Link>
            )}
          </div>

          {((attendance.todayGeoViolations ?? 0) > 0) && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                <strong>{attendance.todayGeoViolations}</strong> attendance record(s) today are outside assigned ward.
              </p>
            </div>
          )}

          {/* Attendance & session summary row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="block p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Login sessions today</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{attendance.todayTotal ?? 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Staff check-ins in your ULB</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-slate-600" />
                </div>
              </div>
            </div>
            <div className="block p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Worker attendance rate</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{workers.presencePercent ?? 0}%</p>
                  <p className="text-xs text-gray-500 mt-1">{workers.presentToday ?? 0} of {workers.total ?? 0} present</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </div>
            <div className="block p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total complaints pending</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{complaintsTotalFiltered}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {[showToilet && 'Toilet', showGaushala && 'Gaushala'].filter(Boolean).join(' + ') || '—'}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-amber-100 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick actions</h2>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/sfi/workers"
                className="inline-flex items-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                <Users className="w-5 h-5" />
                Staff Assignment
              </Link>
              {assignedModules.includes('toilet') && (
                <Link
                  to="/sfi/toilet-management/complaints"
                  className="inline-flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-primary-200 transition-colors font-medium"
                >
                  <Bath className="w-5 h-5 text-primary-600" />
                  Toilet complaints
                </Link>
              )}
              {assignedModules.includes('gaushala') && (
                <Link
                  to="/sfi/gaushala/complaints"
                  className="inline-flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-primary-200 transition-colors font-medium"
                >
                  <Heart className="w-5 h-5 text-primary-600" />
                  Gaushala complaints
                </Link>
              )}
              {reportLinks.length > 0 && (
                <Link
                  to={reportLinks[0].to}
                  className="inline-flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-primary-200 transition-colors font-medium"
                >
                  <FileText className="w-5 h-5 text-primary-600" />
                  Reports
                </Link>
              )}
            </div>
          </div>

          {staffDetailsOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setStaffDetailsOpen(false)}>
              <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Staff details — Workers & Supervisors</h2>
                  <button type="button" onClick={() => setStaffDetailsOpen(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {staffDetailsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <RefreshCw className="w-8 h-8 animate-spin text-primary-500" />
                    </div>
                  ) : (
                    <>
                      <section>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Workers</h3>
                        {staffDetails.workers.length === 0 ? (
                          <p className="text-sm text-gray-500">No workers found.</p>
                        ) : (
                          <div className="table-wrap">
                            <table className="table text-sm">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-3 py-2 text-left font-medium text-gray-600">Employee Code</th>
                                  <th className="px-3 py-2 text-left font-medium text-gray-600">Name</th>
                                  <th className="px-3 py-2 text-left font-medium text-gray-600">Ward</th>
                                  <th className="px-3 py-2 text-left font-medium text-gray-600">Type</th>
                                </tr>
                              </thead>
                              <tbody>
                                {staffDetails.workers.slice(0, 50).map((w) => (
                                  <tr key={w.id} className="border-b border-gray-100">
                                    <td className="px-3 py-2">{w.employee_code ?? w.employeeCode ?? '—'}</td>
                                    <td className="px-3 py-2">{w.full_name ?? w.fullName ?? '—'}</td>
                                    <td className="px-3 py-2">{w.ward?.wardNumber ?? w.wardName ?? '—'}</td>
                                    <td className="px-3 py-2">{w.worker_type ?? w.workerType ?? '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {staffDetails.workers.length > 50 && (
                              <p className="text-xs text-gray-500 mt-2">Showing first 50 of {staffDetails.workers.length} workers.</p>
                            )}
                          </div>
                        )}
                      </section>
                      <section>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Supervisors</h3>
                        {staffDetails.supervisors.length === 0 ? (
                          <p className="text-sm text-gray-500">No supervisors found.</p>
                        ) : (
                          <div className="table-wrap">
                            <table className="table text-sm">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-3 py-2 text-left font-medium text-gray-600">Employee ID</th>
                                  <th className="px-3 py-2 text-left font-medium text-gray-600">Name</th>
                                  <th className="px-3 py-2 text-left font-medium text-gray-600">Phone</th>
                                </tr>
                              </thead>
                              <tbody>
                                {staffDetails.supervisors.map((s) => (
                                  <tr key={s.id} className="border-b border-gray-100">
                                    <td className="px-3 py-2">{s.employee_id ?? s.employeeId ?? '—'}</td>
                                    <td className="px-3 py-2">{s.full_name ?? s.fullName ?? '—'}</td>
                                    <td className="px-3 py-2">{s.phone_number ?? s.phoneNumber ?? '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </section>
                    </>
                  )}
                </div>
                <div className="px-6 py-3 border-t border-gray-200 flex justify-end gap-2">
                  <Link to="/sfi/workers" className="btn btn-primary btn-sm" onClick={() => setStaffDetailsOpen(false)}>Go to Staff Assignment</Link>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStaffDetailsOpen(false)}>Close</button>
                </div>
              </div>
            </div>
          )}

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick reports</h2>
            <div className="flex flex-wrap gap-3">
              {reportLinks.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-primary-200 transition-colors"
                >
                  <BarChart3 className="w-4 h-4 text-primary-600" />
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {modules.map(({ to, label, icon: Icon, description }) => (
            <Link
              key={to}
              to={to}
              className="block p-6 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-primary-200 transition-all"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{label}</h3>
              </div>
              <p className="text-sm text-gray-500">{description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Your assignment - fills space and clarifies access */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary-600" />
          Your assignment
        </h2>
        <p className="text-sm text-gray-600 mb-3">
          {showOnlyAssigned && assignedModules.length > 0
            ? 'You have access to the following modules and reports.'
            : 'You have access to all SFI modules. Contact admin to restrict by module if needed.'}
        </p>
        <div className="flex flex-wrap gap-2">
          {modules.map(({ key, label }) => (
            <span
              key={key || label}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700"
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SFIDashboard;
