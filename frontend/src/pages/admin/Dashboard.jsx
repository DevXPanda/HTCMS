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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
const toNumber = (n) => Number(n || 0);

const formatIndianCompact = (value) => {
  const num = toNumber(value);
  if (num >= 10000000) return `${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `${(num / 100000).toFixed(2)} L`;
  return num.toLocaleString('en-IN');
};

const formatCurrencyCr = (value) => `₹${formatIndianCompact(value)}`;

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

  useEffect(() => {
    fetchDashboardData();
  }, [effectiveUlbId]);

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
      <div className="card border border-gray-200 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h1 className="text-3xl font-bold text-gray-900">EO Control Panel</h1>
          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <select
                value={selectedUlbId}
                onChange={(e) => setSelectedUlbId(e.target.value)}
                className="input h-10 min-w-[16rem] max-w-[20rem] truncate"
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
                className="input h-10 min-w-[16rem] max-w-[20rem] flex items-center text-sm text-gray-700 truncate"
                title={ulbs.find((u) => u.id === effectiveUlbId)?.name || 'Your ULB'}
              >
                {ulbs.find((u) => u.id === effectiveUlbId)?.name || 'Your ULB'}
              </div>
            )}
            {/* <button className="header-icon-btn p-2"><CalendarDays className="w-4 h-4 text-gray-500" /></button>
            <button className="header-icon-btn p-2" onClick={fetchDashboardData}><Bell className="w-4 h-4 text-gray-500" /></button> */}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {topCards.map((card) => (
            <div key={card.title} className="rounded-xl border border-gray-100 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase font-semibold text-gray-500">{card.title}</p>
                <card.icon className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
              <p className="text-sm text-green-600 font-semibold mt-1">{card.delta}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
          <div className="rounded-xl border border-gray-100 bg-white p-4 xl:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Revenue Overview</h3>
            <div className="h-64"><Line data={lineData} options={lineOptions} /></div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Demand Status</h3>
            <div className="h-56"><Doughnut data={doughnutData} options={doughnutOptions} /></div>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-green-600">Paid</span><span>{paidCount}</span></div>
              <div className="flex justify-between"><span className="text-amber-600">Pending</span><span>{pendingCount}</span></div>
              <div className="flex justify-between"><span className="text-red-600">Overdue</span><span>{overdueCount}</span></div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {quickActions.map((a) => (
                <Link key={a.name} to={a.link} className="rounded-xl border border-gray-100 p-4 hover:bg-gray-50 transition-colors text-center">
                  <div className={`mx-auto mb-2 h-10 w-10 rounded-full text-white flex items-center justify-center ${a.color}`}>
                    <a.icon className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-medium text-gray-700">{a.name}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Activities</h3>
            <div className="space-y-3">
              {recentActivities.map((item) => (
                <div key={item.text} className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-start gap-2 min-w-0">
                    <item.icon className="w-4 h-4 text-primary-500 mt-0.5" />
                    <p className="text-sm text-gray-700 truncate">{item.text}</p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{item.when}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-4 mb-4">
        <h3 className="text-xs font-semibold tracking-wide text-gray-500 uppercase mb-3">Administration & Reports</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {adminItems.map((item) => (
            <Link
              key={item.name}
              to={item.link}
              className="rounded-xl border border-gray-100 p-3 text-center hover:bg-gray-50 transition-colors"
            >
              <item.icon className="w-5 h-5 mx-auto mb-2 text-gray-500" />
              <p className="text-xs font-medium text-gray-700">{item.name}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="card-flat flex items-center gap-2 text-sm text-gray-600">
        <Filter className="w-4 h-4" />
        Amount format follows image style: <span className="font-semibold text-gray-900">{formatCurrencyCr(8898900000)}</span>
      </div>
    </div>
  );
};

export default Dashboard;
