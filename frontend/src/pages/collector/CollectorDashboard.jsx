import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { wardAPI } from '../../services/api';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import {
  MapPin,
  Home,
  FileText,
  DollarSign,
  AlertCircle,
  TrendingUp,
  CheckSquare,
  CreditCard,
  Clock,
  RefreshCw,
  Bell,
  Shield
} from 'lucide-react';
import { useStaffAuth } from '../../contexts/StaffAuthContext';

const CollectorDashboard = () => {
  const { user } = useStaffAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) fetchDashboard();
  }, [user]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await wardAPI.getCollectorDashboard();
      setDashboard(response?.data?.data?.dashboard || null);
    } catch (error) {
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  const statCards = [
    { title: 'Total Properties', value: dashboard?.totalProperties || 0, icon: Home, color: 'bg-blue-500' },
    { title: 'Pending Houses', value: dashboard?.pendingDemands?.length || 0, icon: FileText, color: 'bg-green-500' },
    { title: 'Pending Demands', value: dashboard?.pendingDemands?.length || 0, icon: AlertCircle, color: 'bg-orange-500' },
    { title: 'Total Outstanding', value: `₹${Number(dashboard?.totalOutstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'bg-red-500' },
    { title: 'Revenue Income', value: `₹${Number(dashboard?.totalCollection || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: 'bg-cyan-500' },
    { title: 'Action Notices', value: dashboard?.overdueDemands?.length || 0, icon: Bell, color: 'bg-amber-500' }
  ];

  const quickActions = [
    { name: "Today's Tasks", icon: CheckSquare, link: '/collector/tasks', color: 'bg-blue-600' },
    { name: 'Tax Summary', icon: FileText, link: '/collector/tax-summary', color: 'bg-purple-600' },
    { name: 'Property Tax', icon: Home, link: '/collector/properties', color: 'bg-indigo-600' },
    { name: 'Collections', icon: CreditCard, link: '/collector/collections', color: 'bg-emerald-600' },
    { name: 'My Attendance', icon: Clock, link: '/collector/attendance', color: 'bg-orange-600' },
    { name: 'Notifications', icon: Bell, link: '/collector/notifications', color: 'bg-violet-600' }
  ];

  const demandStatus = {
    pending: (dashboard?.pendingDemands || []).length,
    overdue: (dashboard?.overdueDemands || []).length,
    paid: (dashboard?.propertyWiseDemands || []).filter((d) => d.status === 'paid').length,
    waived: (dashboard?.discountedDemands || []).length + (dashboard?.penaltyWaivedDemands || []).length
  };
  const totalDemands = demandStatus.pending + demandStatus.overdue + demandStatus.paid + demandStatus.waived;
  const todayStr = new Date().toDateString();
  const todaysCollections = (dashboard?.recentPayments || []).filter((p) => new Date(p.paymentDate).toDateString() === todayStr);

  const donutStyle = {
    background: `conic-gradient(#f59e0b 0 ${(demandStatus.pending / (totalDemands || 1)) * 360}deg, #ef4444 ${(demandStatus.pending / (totalDemands || 1)) * 360}deg ${((demandStatus.pending + demandStatus.overdue) / (totalDemands || 1)) * 360}deg, #22c55e ${((demandStatus.pending + demandStatus.overdue) / (totalDemands || 1)) * 360}deg ${((demandStatus.pending + demandStatus.overdue + demandStatus.paid) / (totalDemands || 1)) * 360}deg, #60a5fa ${((demandStatus.pending + demandStatus.overdue + demandStatus.paid) / (totalDemands || 1)) * 360}deg 360deg)`
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-sky-50 to-cyan-50">
        <div className="p-5 md:p-6 flex flex-col md:flex-row justify-between gap-5">
          <div>
            <p className="text-sm text-gray-600">Good Morning, {user?.firstName || 'Collector'}</p>
            <h1 className="text-3xl font-bold text-slate-800 leading-tight mt-1">
              Monitor. Manage. Maximize <span className="text-blue-600">Revenue.</span>
            </h1>
            <p className="text-sm text-slate-600 mt-2">Get real-time insights, track collections, and streamline ULB operations efficiently.</p>
            <div className="mt-3 inline-flex items-center gap-2 text-xs bg-white/80 border border-blue-100 rounded-md px-3 py-1">
              <span>Today's Date: {new Date().toLocaleDateString()}</span>
              <span className="text-gray-400">|</span>
              <span>Financial Year: 2024-25</span>
            </div>
          </div>
          <div className="flex flex-col items-end justify-between">
            <button onClick={fetchDashboard} className="btn btn-primary flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh Data
            </button>
            <img src="/ULB Logo.png" alt="ULB" className="hidden md:block h-20 w-20 object-contain opacity-80 mt-4" />
          </div>
        </div>
      </section>

      <section>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {statCards.map((stat) => (
            <div key={stat.title} className="rounded-xl border border-gray-100 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-gray-500">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-2 rounded-full`}>
                  <stat.icon className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-gray-100 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {quickActions.map((action) => (
            <Link key={action.name} to={action.link} className="card-hover rounded-lg border border-gray-100 px-3 py-3 flex items-center gap-2">
              <span className={`p-2 rounded-full ${action.color} text-white`}>
                <action.icon className="h-4 w-4" />
              </span>
              <span className="text-xs font-medium text-gray-700">{action.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-white rounded-lg border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Property-wise Collection Summary</h2>
            <Link to="/collector/tax-summary" className="text-xs text-blue-600 hover:underline">View All</Link>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Owner</th>
                  <th>Demand</th>
                  <th>Pending</th>
                  <th>Status</th>
                  <th>Due</th>
                </tr>
              </thead>
              <tbody>
                {(dashboard?.propertyWiseDemands || []).slice(0, 6).map((item) => (
                  <tr key={item.propertyId}>
                    <td>{item.property?.propertyNumber || 'N/A'}</td>
                    <td>{item.property?.owner?.firstName} {item.property?.owner?.lastName}</td>
                    <td>₹{(item.propertyTax + item.waterTax).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td>₹{(item.totalPayable || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td><span className="badge capitalize">{item.status?.replace('_', ' ')}</span></td>
                    <td>{item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 p-4">
          <h2 className="text-lg font-semibold mb-3">Demand Overview</h2>
          <div className="flex items-center gap-4">
            <div className="relative w-32 h-32 rounded-full" style={donutStyle}>
              <div className="absolute inset-4 bg-white rounded-full flex items-center justify-center text-center">
                <div>
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="text-xl font-bold">{totalDemands}</p>
                  <p className="text-xs text-gray-500">Demands</p>
                </div>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <p><span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-2" />Pending: {demandStatus.pending}</p>
              <p><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-2" />Overdue: {demandStatus.overdue}</p>
              <p><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2" />Paid: {demandStatus.paid}</p>
              <p><span className="inline-block w-2 h-2 rounded-full bg-sky-400 mr-2" />Waived: {demandStatus.waived}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-100 p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Pending Demands</h2>
            <Link to="/collector/demands" className="text-xs text-blue-600 hover:underline">View All</Link>
          </div>
          {dashboard?.pendingDemands?.length ? (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {dashboard.pendingDemands.slice(0, 8).map((demand) => (
                <div key={demand.id} className="border rounded-lg p-2.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium">{demand.demandNumber}</p>
                      <p className="text-xs text-gray-500">{demand.property?.propertyNumber} · {demand.property?.owner?.firstName} {demand.property?.owner?.lastName}</p>
                    </div>
                    <p className="text-xs font-semibold text-red-600">
                      ₹{parseFloat(demand.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-500">No pending demands</p>}
        </div>

        <div className="bg-white rounded-lg border border-gray-100 p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold text-red-600">Overdue Demands</h2>
            <Link to="/collector/demands" className="text-xs text-blue-600 hover:underline">View All</Link>
          </div>
          {dashboard?.overdueDemands?.length ? (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {dashboard.overdueDemands.slice(0, 8).map((demand) => (
                <div key={demand.id} className="border border-red-100 bg-red-50 rounded-lg p-2.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium">{demand.demandNumber}</p>
                      <p className="text-xs text-gray-500">{demand.property?.propertyNumber} · {demand.property?.owner?.firstName} {demand.property?.owner?.lastName}</p>
                    </div>
                    <p className="text-[11px] text-red-600 font-semibold">
                      {Math.floor((new Date() - new Date(demand.dueDate)) / (1000 * 60 * 60 * 24))} days
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-500">No overdue demands</p>}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-100 p-4">
          <h2 className="text-lg font-semibold mb-3">Discounted Demands</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Ledger</th>
                  <th>Demand</th>
                  <th>Owner</th>
                  <th>Discount</th>
                </tr>
              </thead>
              <tbody>
                {(dashboard?.discountedDemands || []).slice(0, 6).map((row) => (
                  <tr key={`${row.demandId}-${row.date}`}>
                    <td className="capitalize">{row.module?.replace('_', ' ')}</td>
                    <td>{row.demandNumber}</td>
                    <td>{row.citizen}</td>
                    <td>₹{parseFloat(row.discountAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-100 p-4">
          <h2 className="text-lg font-semibold mb-3 flex items-center">
            <Shield className="w-5 h-5 mr-2 text-red-600" />
            Penalty Waived Demands
          </h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Ledger</th>
                  <th>Demand</th>
                  <th>Owner</th>
                  <th>Waived</th>
                </tr>
              </thead>
              <tbody>
                {(dashboard?.penaltyWaivedDemands || []).slice(0, 6).map((row) => (
                  <tr key={`pw-${row.id}-${row.demandId}`}>
                    <td className="capitalize">{row.module?.replace('_', ' ')}</td>
                    <td>{row.demandNumber}</td>
                    <td>{row.citizen}</td>
                    <td>₹{parseFloat(row.waived || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <div className="xl:col-span-3 bg-white rounded-lg border border-gray-100 p-4">
          <h2 className="text-lg font-semibold mb-3">Recent Collections</h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>Property</th>
                  <th>Amount</th>
                  <th>Mode</th>
                  <th>Date</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {(dashboard?.recentPayments || []).slice(0, 10).map((payment) => (
                  <tr key={payment.id}>
                    <td className="font-medium">{payment.receiptNumber}</td>
                    <td>{payment.property?.propertyNumber || 'N/A'}</td>
                    <td className="font-semibold text-green-600">₹{parseFloat(payment.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="capitalize">{payment.paymentMode}</td>
                    <td>{new Date(payment.paymentDate).toLocaleDateString()}</td>
                    <td>{new Date(payment.paymentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-100 p-4">
          <h2 className="text-lg font-semibold mb-3">Today's Summary</h2>
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-gray-100 p-3">
              <p className="text-gray-500 text-xs">Collections Today</p>
              <p className="text-lg font-bold text-green-600">
                ₹{todaysCollections.reduce((s, p) => s + parseFloat(p.amount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="rounded-lg border border-gray-100 p-3">
              <p className="text-gray-500 text-xs">Transactions</p>
              <p className="text-lg font-bold text-blue-600">{todaysCollections.length}</p>
            </div>
            <div className="rounded-lg border border-gray-100 p-3">
              <p className="text-gray-500 text-xs">New Demands</p>
              <p className="text-lg font-bold text-amber-600">{(dashboard?.pendingDemands || []).length}</p>
            </div>
            <div className="rounded-lg border border-gray-100 p-3">
              <p className="text-gray-500 text-xs">Overdue</p>
              <p className="text-lg font-bold text-red-600">{(dashboard?.overdueDemands || []).length}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CollectorDashboard;
