import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  UserX,
  Calendar,
  CheckCircle,
  ClipboardList,
  RefreshCw,
  Bell,
  Shield,
  Clock3,
  MapPin,
  Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useStaffAuth } from '../../contexts/StaffAuthContext';
import { fieldWorkerMonitoringAPI, workerTaskAPI, attendanceAPI, toiletComplaintAPI } from '../../services/api';

const SupervisorDashboard = () => {
  const { user } = useStaffAuth();
  const [data, setData] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [toiletComplaints, setToiletComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  const assignedModules = (data?.supervisor?.assigned_modules ?? user?.assigned_modules ?? []);
  const hasModule = (key) => assignedModules.length === 0 || assignedModules.includes(key);

  const fetchAll = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [dashRes, tasksRes, complaintsRes] = await Promise.all([
        fieldWorkerMonitoringAPI.getSupervisorDashboardForSelf(),
        workerTaskAPI.getTasks({ assigned_date: new Date().toISOString().slice(0, 10) }),
        hasModule('toilet') ? toiletComplaintAPI.getAssigned(user.id) : Promise.resolve({ data: { data: { complaints: [] } } })
      ]);
      setData(dashRes?.data?.data ?? null);
      setTasks(tasksRes?.data?.data || []);
      setToiletComplaints(complaintsRes?.data?.data?.complaints || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load dashboard');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [user?.id]);

  const workers = data?.workers || [];
  const attendancePct = data?.attendance_pct || 0;
  const tasksCompletedToday = data?.tasks_completed_today || 0;
  const ulbName = data?.supervisor?.ulb_name || 'Your ULB';

  const avgCheckin = useMemo(() => {
    const checkins = workers.filter((w) => w.checkin_time).map((w) => new Date(w.checkin_time));
    if (!checkins.length) return '—';
    const avg = checkins.reduce((s, d) => s + d.getTime(), 0) / checkins.length;
    return new Date(avg).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [workers]);

  const pendingTasks = Array.isArray(tasks) ? tasks.filter((t) => t.status !== 'COMPLETED').length : 0;
  const resolvedComplaints = toiletComplaints.filter((c) => c.status?.toLowerCase() === 'resolved').length;
  const activeComplaints = toiletComplaints.filter((c) => c.status?.toLowerCase() !== 'resolved');

  const handleMarkAllPresent = async () => {
    const ok = window.confirm('Mark all workers present?');
    if (!ok) return;
    try {
      setMarkingAll(true);
      await attendanceAPI.markAllWorkersPresent({});
      toast.success('All workers marked as present');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark all present');
    } finally {
      setMarkingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error && !data) {
    return <div className="alert-error">{error}</div>;
  }

  const statCards = [
    { title: 'Total Workers', value: data?.total_workers || 0, subtitle: 'All assigned', icon: Users, color: 'bg-blue-100 text-blue-600' },
    { title: 'Present Today', value: data?.present_today || 0, subtitle: `${attendancePct}% attendance`, icon: UserCheck, color: 'bg-green-100 text-green-600' },
    { title: 'Absent Today', value: data?.absent_today || 0, subtitle: `${100 - attendancePct}%`, icon: UserX, color: 'bg-red-100 text-red-600' },
    { title: 'Attendance %', value: `${attendancePct}%`, subtitle: 'Vs yesterday', icon: Calendar, color: 'bg-amber-100 text-amber-600' },
    { title: 'Tasks Completed', value: tasksCompletedToday, subtitle: 'Today', icon: CheckCircle, color: 'bg-purple-100 text-purple-600' },
    { title: 'Toilet Complaints', value: activeComplaints.length, subtitle: 'View all', icon: ClipboardList, color: 'bg-sky-100 text-sky-600' }
  ];

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-sky-50 to-cyan-50">
        <div className="p-5 md:p-6 flex flex-col md:flex-row justify-between gap-5">
          <div>
            <p className="text-sm text-gray-600">Good Morning, Supervisor!</p>
            <h1 className="text-4xl font-bold text-slate-800 leading-tight mt-1">Supervisor Dashboard</h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <span>ULB: {ulbName}</span>
              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">Toilet Management</span>
            </div>
          </div>
          <button onClick={fetchAll} className="btn btn-primary self-start">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </section>

      <section>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {statCards.map((s) => (
            <div key={s.title} className="rounded-xl border border-gray-100 bg-white p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-gray-500">{s.title}</p>
                  <p className="text-4xl font-bold text-gray-900 mt-1">{s.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{s.subtitle}</p>
                </div>
                <div className={`p-2 rounded-xl ${s.color}`}>
                  <s.icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 rounded-xl border border-gray-100 bg-white p-4">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Administration & Reports</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Link to="/supervisor/workers" className="rounded-xl border border-gray-100 px-4 py-4 flex items-center gap-3 card-hover">
              <span className="p-2 rounded-xl bg-blue-100 text-blue-600"><Users className="w-5 h-5" /></span>
              <div>
                <p className="font-semibold text-gray-800">Worker Management</p>
                <p className="text-xs text-gray-500">Add, view & manage workers</p>
              </div>
            </Link>
            <Link to="/supervisor/notifications" className="rounded-xl border border-gray-100 px-4 py-4 flex items-center gap-3 card-hover">
              <span className="p-2 rounded-xl bg-indigo-100 text-indigo-600"><Bell className="w-5 h-5" /></span>
              <div>
                <p className="font-semibold text-gray-800">Notifications</p>
                <p className="text-xs text-gray-500">View & send notifications</p>
              </div>
            </Link>
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Quick Insights</h2>
          <div className="space-y-2 text-sm">
            <div className="rounded-lg border border-gray-100 p-3 flex justify-between"><span className="text-gray-600">Avg. Check-ins</span><span className="font-semibold">{avgCheckin}</span></div>
            <div className="rounded-lg border border-gray-100 p-3 flex justify-between"><span className="text-gray-600">Tasks Pending</span><span className="font-semibold">{pendingTasks}</span></div>
            <div className="rounded-lg border border-gray-100 p-3 flex justify-between"><span className="text-gray-600">Complaints Resolved</span><span className="font-semibold">{resolvedComplaints}/{toiletComplaints.length || 0}</span></div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-100 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-3xl font-bold text-gray-800">Attendance Management</h2>
          <button onClick={handleMarkAllPresent} className="btn btn-primary" disabled={markingAll}>
            {markingAll ? 'Marking...' : 'Mark All Present'}
          </button>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Worker Name</th>
                <th>Status</th>
                <th>Check-in Time</th>
                <th>Geo Status</th>
                <th>Photo</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {workers.map((w) => (
                <tr key={w.id}>
                  <td>
                    <p className="font-medium">{w.full_name}</p>
                    <p className="text-xs text-gray-500">{w.worker_id || w.mobile || '—'}</p>
                  </td>
                  <td><span className={`badge ${w.status === 'PRESENT' ? 'badge-success' : w.status === 'ABSENT' ? 'badge-danger' : 'badge-warning'}`}>{(w.status || 'NOT_MARKED').replace('_', ' ')}</span></td>
                  <td>{w.checkin_time ? new Date(w.checkin_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td>
                    {w.geo_status ? (
                      <span className={`inline-flex items-center gap-1 text-xs ${w.geo_status === 'VALID' ? 'text-green-600' : 'text-red-600'}`}>
                        <MapPin className="w-3 h-3" />
                        {w.geo_status === 'VALID' ? 'In Range' : 'Out of Range'}
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    {w.photo_url ? (
                      <a href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${w.photo_url}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View</a>
                    ) : '—'}
                  </td>
                  <td>
                    <Link to="/supervisor/workers" className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm">
                      <Eye className="w-4 h-4" /> View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-3xl font-bold text-gray-800">Toilet Complaints (Assigned to Me)</h2>
            <Link to="/supervisor/toilet-complaints" className="text-sm text-blue-600 hover:underline">Manage All</Link>
          </div>
          <div className="space-y-2">
            {activeComplaints.slice(0, 4).map((c) => (
              <div key={c.id} className="rounded-lg border border-gray-100 p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">{c.complaintType || 'Complaint'}</p>
                  <p className="text-xs text-gray-500">{c.facility?.name || 'Facility'} · {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${c.priority?.toLowerCase() === 'high' ? 'bg-red-100 text-red-700' : c.priority?.toLowerCase() === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                  {c.priority || 'Low'}
                </span>
              </div>
            ))}
            {activeComplaints.length === 0 && <p className="text-sm text-gray-500">No active complaints.</p>}
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-3xl font-bold text-gray-800">Today's Tasks</h2>
            <Link to="/supervisor/mrf" className="text-sm text-blue-600 hover:underline">View All</Link>
          </div>
          <div className="space-y-2">
            {tasks.slice(0, 6).map((t) => (
              <div key={t.id} className="rounded-lg border border-gray-100 p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">{t.task_type || 'Task'}: {t.area_street || t.facility?.name || 'Assigned area'}</p>
                  <p className="text-xs text-gray-500">{t.shift || ''} {t.assigned_time || ''}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  t.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                  t.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {(t.status || 'PENDING').replace('_', ' ')}
                </span>
              </div>
            ))}
            {tasks.length === 0 && <p className="text-sm text-gray-500">No tasks for today.</p>}
          </div>
        </div>
      </section>
    </div>
  );
};

export default SupervisorDashboard;
