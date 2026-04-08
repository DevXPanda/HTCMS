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
  Eye,
  TrendingUp,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  DollarSign
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

  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = [
    {
      image: '/Supervisor/Sup 1.png',
      tag: 'Field Operations',
      title: 'Coordinate. Monitor.',
      highlight: 'Exceed Standards.',
      subtitle: 'Track worker attendance and task completion in real-time to ensure maximum efficiency.'
    },
    {
      image: '/Supervisor/Sup 2.png',
      tag: 'Worker Management',
      title: 'Empower Teams.',
      highlight: 'Drive Results.',
      subtitle: 'Optimize resource allocation and worker productivity through data-driven task assignment.'
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

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
    <div className="space-y-6 pb-20">
      {/* Premium Supervisor Hero Section */}
      <div className="relative overflow-hidden rounded-2xl shadow-xl border border-slate-200/50 group select-none h-[280px] sm:h-[340px] md:h-[400px]">
        {/* Top-Right Info Bar (Date, FY Only) - Locked to Hero Section */}
        <div className="absolute top-6 right-6 sm:top-8 sm:right-8 z-30 flex items-center gap-4 px-4 py-2.5 bg-white/90 backdrop-blur-md rounded-xl border border-white/50 shadow-sm animate-fade-in w-fit">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-gray-700">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>FY: 2024-25</span>
          </div>
          <div className="w-[1px] h-3 bg-gray-300"></div>
          <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold text-gray-700">
            <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
            <span>{new Date().toLocaleDateString()}</span>
          </div>
        </div>

        {/* Main Slide Image */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out transform scale-100 group-hover:scale-105"
          style={{
            backgroundImage: `url("${slides[currentSlide].image}")`,
            backgroundPosition: 'center'
          }}
        >
          {/* Harmonized Overlay to match Admin Hero */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/60 via-white/10 to-transparent"></div>

          <div className="p-6 sm:p-10 md:p-14 relative w-full lg:w-3/5 h-full flex flex-col justify-center">
            <div className="flex flex-wrap items-center gap-3 mb-4 sm:mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-blue-100 text-blue-600 text-[10px] sm:text-[11px] uppercase tracking-wider animate-fade-in shadow-sm w-fit font-bold">
                <Shield className="w-3.5 h-3.5" />
                {slides[currentSlide].tag}
              </div>
              <button onClick={fetchAll} className="p-2 rounded-full bg-white/80 hover:bg-white text-blue-600 transition-colors shadow-sm">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-800 leading-[1.1] mb-3 sm:mb-4 animate-slide-up">
              {slides[currentSlide].title} <br />
              <span className="text-blue-600 drop-shadow-sm">{slides[currentSlide].highlight}</span>
            </h1>

            <p className="text-xs sm:text-base md:text-lg text-gray-600 mb-6 sm:mb-8 font-medium max-w-md line-clamp-2 sm:line-clamp-none animate-slide-up delay-100">
              {slides[currentSlide].subtitle}
            </p>

            <div className="flex flex-wrap items-center gap-3 animate-slide-up delay-200">
              <button
                onClick={handleMarkAllPresent}
                className="px-5 sm:px-8 py-2.5 sm:py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
              >
                <ClipboardList className="w-4 h-4" />
                Mark All Present
              </button>
            </div>
          </div>
        </div>

        {/* Slide Indicators */}
        {slides.length > 1 && (
          <div className="absolute bottom-6 left-6 sm:bottom-10 sm:left-14 flex items-center gap-2 z-20">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`transition-all duration-300 rounded-full ${currentSlide === idx ? 'w-8 h-2 bg-blue-600' : 'w-2 h-2 bg-white/60 hover:bg-white'
                  }`}
              />
            ))}
          </div>
        )}
      </div>

      <section>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {statCards.map((s) => (
            <div key={s.title} className="rounded-xl border border-gray-100 bg-white p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">{s.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-0.5">{s.value}</p>
                  <p className="text-[10px] text-gray-400 font-medium mt-0.5">{s.subtitle}</p>
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
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-600" />
            Administration & Reports
          </h2>
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
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            Quick Insights
          </h2>
          <div className="space-y-2 text-sm">
            <div className="rounded-lg border border-gray-100 p-3 flex justify-between"><span className="text-gray-600">Avg. Check-ins</span><span className="font-semibold">{avgCheckin}</span></div>
            <div className="rounded-lg border border-gray-100 p-3 flex justify-between"><span className="text-gray-600">Tasks Pending</span><span className="font-semibold">{pendingTasks}</span></div>
            <div className="rounded-lg border border-gray-100 p-3 flex justify-between"><span className="text-gray-600">Complaints Resolved</span><span className="font-semibold">{resolvedComplaints}/{toiletComplaints.length || 0}</span></div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-100 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-blue-600" />
            Attendance Management
          </h2>
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
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-blue-600" />
              Toilet Complaints (Assigned to Me)
            </h2>
            <Link to="/supervisor/toilet-complaints" className="text-xs text-blue-600 hover:underline">Manage All</Link>
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
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-600" />
              Today's Tasks
            </h2>
            <Link to="/supervisor/mrf" className="text-xs text-blue-600 hover:underline">View All</Link>
          </div>
          <div className="space-y-2">
            {tasks.slice(0, 6).map((t) => (
              <div key={t.id} className="rounded-lg border border-gray-100 p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">{t.task_type || 'Task'}: {t.area_street || t.facility?.name || 'Assigned area'}</p>
                  <p className="text-xs text-gray-500">{t.shift || ''} {t.assigned_time || ''}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${t.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
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

      {/* Standard Footer Branding */}
      <footer className="mt-12 py-8 border-t border-gray-100">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <img src="/ULB Logo.png" alt="ULB Logo" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 tracking-tight">Urban Local Bodies</p>
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-widest">Digital Governance Portal</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Designed & Standardized for Excellence</p>
            <p className="text-[10px] font-medium text-gray-400 mt-1">© 2024 ULB Noida. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SupervisorDashboard;
