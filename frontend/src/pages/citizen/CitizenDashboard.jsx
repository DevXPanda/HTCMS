import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { citizenAPI } from '../../services/api';
import Loading from '../../components/Loading';
import { Home, FileText, CreditCard, Bell, Store, Droplet, PlusCircle, FileCheck, History, TrendingUp, Megaphone, Wallet } from 'lucide-react';

const CitizenDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await citizenAPI.getDashboard();
      setDashboard(response.data.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  const formatAmount = (num) =>
    `₹${Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formatShortAmount = (num) => {
    const n = Number(num || 0);
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
    return formatAmount(n);
  };

  const summaryCards = [
    { title: 'Total Outstanding', value: formatShortAmount(dashboard?.totalOutstanding), sub: 'Due amount', icon: Wallet, color: 'bg-rose-500', link: '/citizen/demands' },
    { title: 'My Properties', value: dashboard?.properties ?? 0, sub: 'Total properties', icon: Home, color: 'bg-blue-500', link: '/citizen/properties' },
    { title: 'Pending House Tax', value: dashboard?.pendingHouseTaxDemands || 0, sub: 'Demands', icon: FileText, color: 'bg-orange-500', link: '/citizen/demands?serviceType=HOUSE_TAX' },
    { title: 'Pending Water Tax', value: dashboard?.pendingWaterTaxDemands || 0, sub: 'Demands', icon: Droplet, color: 'bg-cyan-500', link: '/citizen/demands?serviceType=WATER_TAX' },
    { title: 'Pending D2DC', value: dashboard?.pendingD2dcDemands || 0, sub: 'Demands', icon: FileText, color: 'bg-green-500', link: '/citizen/demands?serviceType=D2DC' },
    { title: 'Pending Shop Tax', value: dashboard?.pendingShopTaxDemands || 0, sub: 'Demands', icon: Store, color: 'bg-amber-500', link: '/citizen/demands?serviceType=SHOP_TAX' },
    { title: 'Action Notices', value: dashboard?.activeNotices || 0, sub: 'Unread', icon: Bell, color: 'bg-purple-500', link: '/citizen/notices', badge: dashboard?.activeNotices > 0 },
    { title: 'My Shops', value: dashboard?.shops || 0, sub: 'Registered', icon: Store, color: 'bg-indigo-500', link: '/citizen/shops' },
    { title: 'Recent Payments', value: dashboard?.recentPayments?.length || 0, sub: 'This period', icon: CreditCard, color: 'bg-emerald-500', link: '/citizen/payments' }
  ];

  // Quick Actions - All sidebar navigation items
  const quickActions = [
    { name: 'My Properties', icon: Home, link: '/citizen/properties', color: 'bg-blue-600' },
    { name: 'My Demands', icon: FileText, link: '/citizen/demands', color: 'bg-orange-600' },
    { name: 'Water Connections', icon: Droplet, link: '/citizen/water-connections', color: 'bg-cyan-600' },
    { name: 'Request Water Connection', icon: PlusCircle, link: '/citizen/water-connection-request', color: 'bg-indigo-600' },
    { name: 'My Shops', icon: Store, link: '/citizen/shops', color: 'bg-amber-600' },
    { name: 'Shop Registration Requests', icon: FileCheck, link: '/citizen/shop-registration-requests', color: 'bg-yellow-600' },
    { name: 'My Notices', icon: Bell, link: '/citizen/notices', color: 'bg-purple-600' },
    { name: 'File Toilet Complaint', icon: PlusCircle, link: '/citizen/toilet/file-complaint', color: 'bg-pink-600' },
    { name: 'Payment History', icon: CreditCard, link: '/citizen/payments', color: 'bg-green-600' },
    { name: 'Activity History', icon: History, link: '/citizen/activity-history', color: 'bg-gray-600' },
  ];

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-sky-50 to-cyan-50">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 p-6">
          <div className="space-y-3 max-w-xl">
            <span className="inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-100">
              Welcome back, citizen
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 leading-tight">
              Manage Your Services, Build a Better City
            </h1>
            <p className="text-sm text-slate-600">
              Access services, track dues, and stay updated with ULB notices from one place.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link to="/citizen/demands" className="btn btn-primary">Pay Now</Link>
              <Link to="/citizen/toilet/file-complaint" className="btn btn-secondary">Raise Complaint</Link>
            </div>
          </div>
          <div className="hidden md:flex items-center justify-center w-full md:w-64 lg:w-80">
            <img
              src="/ULB Logo.png"
              alt="Urban Local Bodies"
              className="h-40 w-40 lg:h-48 lg:w-48 object-contain drop-shadow-sm opacity-90"
            />
          </div>
        </div>
      </section>

      <section>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {summaryCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Link key={index} to={stat.link} className="card-hover rounded-xl border border-gray-100 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-gray-500">{stat.title}</p>
                    <p className="mt-1 text-xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-[11px] text-gray-400">{stat.sub}</p>
                  </div>
                  <div className={`${stat.color} p-2 rounded-full relative shrink-0`}>
                    <Icon className="w-4 h-4 text-white" />
                    {stat.badge && typeof stat.value === 'number' && stat.value > 0 ? (
                      <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[1rem] h-4 flex items-center justify-center px-1">
                        {stat.value}
                      </span>
                    ) : null}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 rounded-xl border border-gray-100 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                to={action.link}
                className="card-hover rounded-lg border border-gray-100 px-3 py-3 flex items-center gap-2"
              >
                <span className={`p-2 rounded-full ${action.color} text-white`}>
                  <action.icon className="h-4 w-4" />
                </span>
                <span className="text-xs font-medium text-gray-700">{action.name}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50 p-4 flex flex-col justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-700">All your city services in one place</p>
            <p className="text-xs text-slate-500 mt-1">Simple, fast and reliable access to ULB citizen services.</p>
          </div>
          <div className="mt-4 flex items-center justify-center">
            <img src="/ULB Logo.png" alt="ULB" className="h-20 w-20 object-contain opacity-90" />
          </div>
          <Link to="/citizen/activity-history" className="mt-4 text-xs text-blue-700 font-semibold hover:underline">
            View activity history
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-blue-600" />
              Notifications
            </h3>
            <Link to="/citizen/notices" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="rounded-lg border border-gray-100 p-3">
            <p className="text-xs text-gray-500">Active notices</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{dashboard?.activeNotices || 0}</p>
            <p className="text-xs text-gray-400 mt-1">Based on your current unresolved notices.</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-orange-500" />
              Pending Demands
            </h3>
            <Link to="/citizen/demands" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          {dashboard?.pendingDemandsList && dashboard.pendingDemandsList.length > 0 ? (
            <div className="space-y-2">
              {dashboard.pendingDemandsList.slice(0, 4).map((demand) => (
                <div key={demand.id} className="rounded-lg border border-gray-100 p-2.5">
                  <div className="flex justify-between items-center gap-2">
                    <p className="text-xs font-semibold text-gray-700 truncate">{demand.demandNumber}</p>
                    <Link to="/citizen/demands" className="text-[10px] px-2 py-0.5 rounded bg-red-50 text-red-600 border border-red-100">Pay</Link>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {demand.serviceType?.replace('_', ' ')} · Due {new Date(demand.dueDate).toLocaleDateString()}
                  </p>
                  <p className="text-xs font-semibold text-red-600 mt-1">{formatAmount(demand.balanceAmount)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No pending demands</p>
          )}
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              Recent Payments
            </h3>
            <Link to="/citizen/payments" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          {dashboard?.recentPayments && dashboard.recentPayments.length > 0 ? (
            <div className="space-y-2">
              {dashboard.recentPayments.slice(0, 4).map((payment) => (
                <div key={payment.id} className="rounded-lg border border-gray-100 p-2.5">
                  <div className="flex justify-between items-center gap-2">
                    <p className="text-xs font-semibold text-gray-700 truncate">{payment.receiptNumber}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">Paid</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {payment?.demand?.serviceType?.replace('_', ' ') || 'Payment'} · {new Date(payment.paymentDate).toLocaleDateString()}
                  </p>
                  <p className="text-xs font-semibold text-emerald-600 mt-1">{formatAmount(payment.amount)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No recent payments</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default CitizenDashboard;
