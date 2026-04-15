import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, FileText, DollarSign, TrendingUp, Filter, Bell, CalendarDays, BarChart3, Activity, Store, Bath, ClipboardList, ScrollText, MapPin, Shield, UserCog, Clock } from 'lucide-react';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useSelectedUlb } from '../../contexts/SelectedUlbContext';
import { toNumber, formatCurrencyCr } from '../../utils/numberFormatters';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

const Dashboard = () => {
  const { user } = useAuth();
  const { selectedUlbId, setSelectedUlbId, isSuperAdmin, effectiveUlbId } = useSelectedUlb();
  const [ulbs, setUlbs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalProperties: 0,
    totalAssessments: 0,
    totalDemands: 0,
    totalRevenue: 0,
    pendingDemands: 0,
    totalOutstanding: 0,
  });

  const isAdminLike = ['admin', 'super_admin'].includes((user?.role || '').toLowerCase());
  const selectedUlbName = ulbs.find((u) => u.id === selectedUlbId)?.name;

  useEffect(() => {
    const fetchULBs = async () => {
      try {
        const response = await api.get('/admin-management/ulbs');
        if (response.data) setUlbs(response.data);
      } catch {
        setUlbs([]);
      }
    };
    fetchULBs();
  }, []);

  const [recentLogs, setRecentLogs] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = effectiveUlbId ? { ulb_id: effectiveUlbId } : {};
      const response = await api.get('/reports/dashboard', { params });
      setStats(response.data?.data || {});
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      setActivitiesLoading(true);
      const params = { limit: 5, sortBy: 'timestamp', sortOrder: 'DESC' };
      // Note: audit-logs endpoint handles role-based and ulb-based filtering internally in the backend
      const response = await api.get('/audit-logs', { params });
      if (response.data?.success) {
        setRecentLogs(response.data.data.auditLogs || []);
      }
    } catch (err) {
      console.error('Failed to fetch recent activities:', err);
    } finally {
      setActivitiesLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchRecentActivities();
  }, [effectiveUlbId]);

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getActivityIcon = (entityType) => {
    switch (entityType) {
      case 'Property': return Building2;
      case 'Assessment': return FileText;
      case 'Demand': return DollarSign;
      case 'Payment': return TrendingUp;
      case 'Notice': return Bell;
      case 'User': return UserCog;
      case 'Ward': return MapPin;
      default: return Activity;
    }
  };

  const trendSeries = useMemo(() => {
    const base = toNumber(stats.totalRevenue);
    const multipliers = [0.22, 0.46, 0.38, 0.64, 0.59, 0.76];
    return multipliers.map((m) => Math.round(base * m));
  }, [stats.totalRevenue]);

  const lineData = useMemo(() => ({
    labels: monthLabels,
    datasets: [
      {
        label: 'Revenue',
        data: trendSeries,
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        pointRadius: 3,
        pointHoverRadius: 4,
        borderWidth: 2.5,
        tension: 0.42,
        fill: true,
      },
    ],
  }), [trendSeries]);

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${formatCurrencyCr(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#6B7280' } },
      y: {
        grid: { color: 'rgba(229, 231, 235, 0.8)' },
        ticks: {
          color: '#6B7280',
          callback: (value) => formatCurrencyCr(value),
          maxTicksLimit: 4,
        },
      },
    },
  };

  const paidCount = Math.max(0, toNumber(stats.totalDemands) - toNumber(stats.pendingDemands));
  const pendingCount = toNumber(stats.pendingDemands);
  const overdueCount = Math.max(0, Math.round(toNumber(stats.totalDemands) * 0.12));

  const doughnutData = {
    labels: ['Paid', 'Pending', 'Overdue'],
    datasets: [
      {
        data: [paidCount, pendingCount, overdueCount],
        backgroundColor: ['#22C55E', '#F59E0B', '#EF4444'],
        borderWidth: 0,
        cutout: '70%',
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.parsed}` } },
    },
  };

  const topCards = [
    { title: 'Total Properties', value: toNumber(stats.totalProperties), delta: '+12%', icon: Building2 },
    { title: 'Total Assessments', value: toNumber(stats.totalAssessments), delta: '+8%', icon: FileText },
    { title: 'Total Demands', value: toNumber(stats.totalDemands), delta: '+15%', icon: DollarSign },
    { title: 'Total Revenue', value: formatCurrencyCr(stats.totalRevenue), delta: '+20%', icon: TrendingUp },
  ];

  const quickActions = [
    { name: 'Tax Management', icon: FileText, link: '/tax-management', color: 'bg-blue-600' },
    { name: 'Field Worker Management', icon: Store, link: '/field-worker-monitoring', color: 'bg-yellow-600' },
    { name: 'Toilet Management', icon: Bath, link: '/toilet-management', color: 'bg-pink-600' },
    { name: 'MRF', icon: ClipboardList, link: '/mrf', color: 'bg-green-600' },
    { name: 'Gau Shala', icon: ScrollText, link: '/gaushala/management', color: 'bg-orange-600' },
  ];

  const recentActivities = [
    { icon: FileText, text: 'Property assessment completed', when: '2 min ago' },
    { icon: Bell, text: 'New citizen complaint received', when: '15 min ago' },
    { icon: Activity, text: `Revenue collected: ${formatCurrencyCr(stats.totalRevenue)}`, when: '1 hour ago' },
  ];

  const adminItems = [
    { name: 'Notifications', icon: Bell, link: '/notifications' },
    { name: 'Wards', icon: MapPin, link: '/wards' },
    ...(isSuperAdmin ? [{ name: 'ULB Management', icon: Building2, link: '/ulb-management' }] : []),
    { name: 'Citizen Management', icon: Building2, link: '/users' },
    ...(isSuperAdmin ? [{ name: 'Admin Management', icon: Shield, link: '/admin-accounts' }] : []),
    { name: 'Staff Management', icon: UserCog, link: '/admin-management' },
    ...(isSuperAdmin ? [{ name: 'Approval Requests', icon: FileText, link: '/approval-requests' }] : []),
    { name: 'Attendance', icon: Clock, link: '/attendance' },
    { name: 'Field Monitoring', icon: ClipboardList, link: '/field-monitoring' },
    { name: 'Field Worker Monitoring', icon: UserCog, link: '/admin-field-worker-monitoring' },
    { name: 'Reports', icon: BarChart3, link: '/reports' },
    { name: 'Audit Logs', icon: Shield, link: '/audit-logs' },
  ];

  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = useMemo(() => [
    {
      image: "/admin/Hero.png",
      badge: `Welcome Back, ${user?.firstName || user?.username || 'Admin'}!`,
      title: "Manage Smarter,",
      titleAccent: "Serve Better",
      description: "EO Control System"
    },
    {
      image: "/admin/Hero 2.png",
      badge: "System Insights",
      title: "Digital Governance,",
      titleAccent: "Efficient ULBs",
      description: "Urban Local Bodies"
    }
  ], [user]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="spinner spinner-md" /></div>;
  }

  if (error) {
    return (
      <div className="alert-error">
        <div className="flex items-center gap-2 text-red-600">{error}</div>
      </div>
    );
  }

  if (!isAdminLike) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
        <p className="text-sm text-gray-600 mt-2">This dashboard design is enabled for Admin and Super Admin only.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-blue-100 shadow-sm h-[280px] sm:h-[400px] md:h-[450px] group select-none">
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out transform scale-100 group-hover:scale-105"
          style={{ backgroundImage: `url("${slides[currentSlide].image}")` }}
        >
          {/* Subtle overlay to maintain image visibility while ensuring legibility */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/60 via-white/10 to-transparent"></div>

          <div className="p-5 sm:p-10 md:p-14 relative w-full lg:w-3/5 h-full flex flex-col justify-center transition-all duration-700">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/80 border border-blue-100 text-blue-600 text-[10px] sm:text-[11px] uppercase tracking-wider mb-2 sm:mb-6 animate-fade-in w-fit">
              <span className="flex h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse"></span>
              {slides[currentSlide].badge}
            </div>
            <h1 className="text-xl sm:text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-3 sm:mb-6 tracking-tight animate-slide-up">
              {slides[currentSlide].title}<br />
              <span className="text-blue-600">
                {slides[currentSlide].titleAccent}
              </span>
            </h1>
            <p className="text-xs sm:text-lg text-gray-600 font-medium mb-5 sm:mb-10 max-w-md flex items-center gap-2 sm:gap-3 animate-slide-up">
              <span className="h-[1px] w-4 sm:w-10 bg-blue-200"></span>
              {slides[currentSlide].description}
            </p>
            <div className="flex flex-row flex-wrap gap-2 sm:gap-4 mt-1">
              {isSuperAdmin ? (
                <>
                  <Link to="/ulb-management" className="flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-xs sm:text-base hover:bg-blue-700 transition-all shadow-md active:scale-95 group">
                    <Building2 className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:scale-110" />
                    Manage ULBs
                  </Link>
                  <Link to="/audit-logs" className="flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg font-semibold text-xs sm:text-base hover:bg-gray-50 transition-all active:scale-95 group shadow-sm">
                    <Shield className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:rotate-12" />
                    Audit Logs
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/tax-management" className="flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-xs sm:text-base hover:bg-blue-700 transition-all shadow-md active:scale-95 group">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:translate-x-1" />
                    Tax Management
                  </Link>
                  <Link to="/attendance" className="flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg font-semibold text-xs sm:text-base hover:bg-gray-50 transition-all active:scale-95 group shadow-sm">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:rotate-12" />
                    Staff Attendance
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Top-Right Info Bar (Date, FY Only) - Absolutely Locked to Hero Section */}
        <div className="absolute top-6 right-6 sm:top-8 sm:right-8 z-[5] flex items-center gap-4 px-4 py-2.5 bg-white/90 backdrop-blur-md rounded-xl border border-white/50 shadow-lg animate-fade-in w-fit pointer-events-auto">
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

        {/* Slide Indicators */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${currentSlide === idx ? 'w-8 bg-blue-600' : 'w-2 bg-slate-300 hover:bg-slate-400'
                }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>



      <div className="card border border-gray-200 shadow-sm">
        <div className="flex flex-row items-center justify-between gap-3 mb-6">
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900 truncate">EO Control Panel</h1>
          <div className="flex items-center gap-2 min-w-0 max-w-[60%] sm:max-w-[20rem]">
            {isSuperAdmin && (
              <select
                value={selectedUlbId}
                onChange={(e) => setSelectedUlbId(e.target.value)}
                className="input h-9 sm:h-10 w-full truncate text-[11px] sm:text-sm px-2 bg-gray-50/50 border-gray-200 focus:bg-white transition-all shadow-sm rounded-lg"
                title={selectedUlbName || 'All ULBs'}
              >
                <option value="">All ULBs</option>
                {ulbs.map((ulb) => (
                  <option key={ulb.id} value={ulb.id}>{ulb.name}</option>
                ))}
              </select>
            )}
            {!isSuperAdmin && (
              <div
                className="input h-9 sm:h-10 w-full flex items-center text-[11px] sm:text-sm text-gray-700 truncate px-3 bg-gray-50/50 border-gray-200 rounded-lg"
                title={ulbs.find((u) => u.id === effectiveUlbId)?.name || 'Your ULB'}
              >
                {ulbs.find((u) => u.id === effectiveUlbId)?.name || 'Your ULB'}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {topCards.map((card) => (
            <div key={card.title} className="rounded-xl border border-gray-100 bg-white p-3 sm:p-4 hover:border-blue-100 transition-colors">
              <div className="flex items-center justify-between gap-1">
                <p className="text-[10px] sm:text-xs uppercase font-semibold text-gray-500 truncate">{card.title}</p>
                <card.icon className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 shrink-0" />
              </div>
              <p className="text-xl sm:text-3xl font-bold text-gray-900 mt-2 truncate">{card.value}</p>
              <p className="text-xs sm:text-sm text-green-600 font-semibold mt-1">{card.delta}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl border border-gray-100 bg-white p-4 xl:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Overview</h3>
            <div className="h-60 sm:h-64"><Line data={lineData} options={lineOptions} /></div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Demand Status</h3>
            <div className="h-48 sm:h-56"><Doughnut data={doughnutData} options={doughnutOptions} /></div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between items-center"><span className="text-green-600 flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>Paid</span><span className="font-semibold text-gray-700">{paidCount}</span></div>
              <div className="flex justify-between items-center"><span className="text-amber-600 flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>Pending</span><span className="font-semibold text-gray-700">{pendingCount}</span></div>
              <div className="flex justify-between items-center"><span className="text-red-600 flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>Overdue</span><span className="font-semibold text-gray-700">{overdueCount}</span></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {quickActions.map((a) => (
                <Link key={a.name} to={a.link} className="rounded-xl border border-gray-100 p-3 sm:p-4 hover:bg-blue-50/50 hover:border-blue-100 transition-all text-center group">
                  <div className={`mx-auto mb-2 h-9 w-9 sm:h-10 sm:w-10 rounded-full text-white flex items-center justify-center ${a.color} transition-transform group-hover:scale-110`}>
                    <a.icon className="w-5 h-5" />
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-gray-700">{a.name}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activities</h3>
            <div className="space-y-4">
              {activitiesLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-9 h-9 bg-gray-100 rounded-lg"></div>
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-2 bg-gray-100 rounded w-3/4"></div>
                      <div className="h-2 bg-gray-50 rounded w-1/4"></div>
                    </div>
                  </div>
                ))
              ) : recentLogs.length > 0 ? (
                recentLogs.map((log) => {
                  const Icon = getActivityIcon(log.entityType);
                  return (
                    <div key={log.id} className="flex items-start justify-between gap-3 border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2 bg-blue-50 rounded-lg shrink-0">
                          <Icon className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm text-gray-700 font-medium line-clamp-2 leading-snug">{log.description}</p>
                          <p className="text-[10px] text-gray-500 mt-1 flex flex-wrap items-center gap-1.5 font-bold">
                            <Clock className="w-3 h-3 text-blue-500" />
                            <span className="text-blue-600">{getTimeAgo(log.timestamp)}</span>
                            <span className="h-1 w-1 rounded-full bg-gray-300"></span>
                            <span className="text-gray-400">
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="h-1 w-1 rounded-full bg-gray-300"></span>
                            <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[9px] text-gray-600 uppercase">
                              {log.actor?.firstName ? `${log.actor.firstName} ${log.actor.lastName || ''}` : log.actor?.username || 'System'}
                            </span>
                          </p>

                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Activity className="w-8 h-8 text-gray-200 mb-2" />
                  <p className="text-sm text-gray-400">No recent activities found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-4 mb-4">
        <h3 className="text-xs font-semibold tracking-wide text-gray-500 uppercase mb-4 px-1">Administration & Reports</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3">
          {adminItems.map((item) => (
            <Link
              key={item.name}
              to={item.link}
              className="rounded-xl border border-gray-100 p-3 text-center hover:bg-blue-50/50 hover:border-blue-100 transition-all group"
            >
              <item.icon className="w-5 h-5 mx-auto mb-2 text-gray-400 group-hover:text-blue-600 transition-colors" />
              <p className="text-[11px] font-medium text-gray-600 group-hover:text-gray-900">{item.name}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* <div className="card-flat flex items-center gap-2 text-sm text-gray-600">
        <Filter className="w-4 h-4" />
        Amount format follows image style: <span className="font-semibold text-gray-900">{formatCurrencyCr(8898900000)}</span>
      </div> */}

      <footer className="mt-8 pb-4 border-t border-gray-100 pt-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-gray-500 font-medium">
          <div className="flex items-center gap-2">
            <span className="p-1 bg-white rounded-lg shadow-sm border border-gray-100">
              <img src="/ULB Logo.png" alt="ULB Logo" className="w-8 h-8 object-contain" />
            </span>
            <span>© {new Date().getFullYear()} Urban Local Bodies - Governance Portal</span>
          </div>
          <div className="flex items-center gap-6">
            <p className="hover:text-blue-600 cursor-help transition-colors">Privacy Policy</p>
            <p className="hover:text-blue-600 cursor-help transition-colors">Support</p>
            <div className="h-4 w-[1px] bg-gray-200 hidden sm:block"></div>
            <p className="text-gray-400">Powered by <span className="text-blue-600/80 font-semibold tracking-wide">XPanda</span></p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
