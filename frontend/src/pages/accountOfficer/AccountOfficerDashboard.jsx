import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileCheck2, Receipt, Percent, ShieldAlert, DollarSign,
  TrendingUp, Clock, CheckCircle, XCircle, Loader2, AlertCircle,
  ArrowUpRight, IndianRupee
} from 'lucide-react';
import { paymentAPI, paymentApprovalRequestAPI, discountAPI, penaltyWaiverAPI } from '../../services/api';

const cards = [
  { title: 'Payments', text: 'View all payments and payment details.', to: '/account-officer/payments', icon: Receipt, color: 'bg-blue-600' },
  { title: 'Discount Requests', text: 'Create discount requests for Super Admin approval.', to: '/account-officer/discounts', icon: Percent, color: 'bg-indigo-600' },
  { title: 'Penalty Waiver Requests', text: 'Create penalty waiver requests for Super Admin approval.', to: '/account-officer/penalty-waivers', icon: ShieldAlert, color: 'bg-rose-600' },
  { title: 'Approval Status', text: 'Track pending, approved, and rejected requests.', to: '/account-officer/approval-requests', icon: FileCheck2, color: 'bg-emerald-600' }
];

const fmt = (n) => {
  if (n == null || isNaN(n)) return '0';
  return Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

const AccountOfficerDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [payStats, setPayStats] = useState(null);
  const [approvalCounts, setApprovalCounts] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [recentRequests, setRecentRequests] = useState([]);
  const [discountSummary, setDiscountSummary] = useState(null);
  const [waiverSummary, setWaiverSummary] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [payRes, pendingRes, approvedRes, rejectedRes, allRes, discRes, waivRes] = await Promise.allSettled([
          paymentAPI.getStatistics({}),
          paymentApprovalRequestAPI.getAll({ status: 'PENDING', limit: 1 }),
          paymentApprovalRequestAPI.getAll({ status: 'APPROVED', limit: 1 }),
          paymentApprovalRequestAPI.getAll({ status: 'REJECTED', limit: 1 }),
          paymentApprovalRequestAPI.getAll({ limit: 5 }),
          discountAPI.getSummary(),
          penaltyWaiverAPI.getSummary()
        ]);

        if (payRes.status === 'fulfilled') setPayStats(payRes.value.data?.data?.statistics || null);

        const p = pendingRes.status === 'fulfilled' ? pendingRes.value.data?.data?.pagination?.total || 0 : 0;
        const a = approvedRes.status === 'fulfilled' ? approvedRes.value.data?.data?.pagination?.total || 0 : 0;
        const r = rejectedRes.status === 'fulfilled' ? rejectedRes.value.data?.data?.pagination?.total || 0 : 0;
        setApprovalCounts({ pending: p, approved: a, rejected: r, total: p + a + r });

        if (allRes.status === 'fulfilled') setRecentRequests(allRes.value.data?.data?.requests || []);
        if (discRes.status === 'fulfilled') setDiscountSummary(discRes.value.data?.data || null);
        if (waivRes.status === 'fulfilled') setWaiverSummary(waivRes.value.data?.data || null);
      } catch (_) { /* best effort */ }
      setLoading(false);
    };
    load();
  }, []);

  const statusColor = (s) => {
    const st = (s || '').toUpperCase();
    if (st === 'APPROVED') return 'bg-green-100 text-green-700';
    if (st === 'REJECTED') return 'bg-red-100 text-red-700';
    return 'bg-yellow-100 text-yellow-700';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="ds-page-title">Account Officer Dashboard</h1>
        <p className="ds-page-subtitle">Full payment-management visibility with Super Admin approval workflow.</p>
      </div>

      {/* Summary Stats Row */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-500">Loading dashboard...</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={IndianRupee} label="Total Collections" value={`₹${fmt(payStats?.totalAmount)}`} sub={`${fmt(payStats?.total)} payments`} color="blue" />
            <StatCard icon={Clock} label="Pending Requests" value={approvalCounts.pending} sub="Awaiting approval" color="yellow" />
            <StatCard icon={CheckCircle} label="Approved" value={approvalCounts.approved} sub="Requests approved" color="green" />
            <StatCard icon={XCircle} label="Rejected" value={approvalCounts.rejected} sub="Requests rejected" color="red" />
          </div>

          {/* Discount & Waiver Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600"><Percent className="w-4 h-4" /></div>
                <h3 className="font-semibold text-gray-900">Discounts Overview</h3>
              </div>
              {discountSummary ? (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <MiniStat label="Total Discounts" value={fmt(discountSummary.totalCount || discountSummary.total || 0)} />
                  <MiniStat label="Total Amount" value={`₹${fmt(discountSummary.totalAmount || 0)}`} />
                  <MiniStat label="Active" value={fmt(discountSummary.activeCount || 0)} />
                  <MiniStat label="Average" value={`₹${fmt(discountSummary.averageAmount || 0)}`} />
                </div>
              ) : (
                <p className="text-sm text-gray-400">No discount data available</p>
              )}
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-rose-100 text-rose-600"><ShieldAlert className="w-4 h-4" /></div>
                <h3 className="font-semibold text-gray-900">Penalty Waivers Overview</h3>
              </div>
              {waiverSummary ? (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <MiniStat label="Total Waivers" value={fmt(waiverSummary.totalCount || waiverSummary.total || 0)} />
                  <MiniStat label="Total Amount" value={`₹${fmt(waiverSummary.totalAmount || 0)}`} />
                  <MiniStat label="Active" value={fmt(waiverSummary.activeCount || 0)} />
                  <MiniStat label="Average" value={`₹${fmt(waiverSummary.averageAmount || 0)}`} />
                </div>
              ) : (
                <p className="text-sm text-gray-400">No waiver data available</p>
              )}
            </div>
          </div>

          {/* Payment Breakdown by Mode */}
          {payStats?.byMode && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600"><TrendingUp className="w-4 h-4" /></div>
                <h3 className="font-semibold text-gray-900">Collections by Payment Mode</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {Object.entries(payStats.byMode).map(([mode, amount]) => (
                  <div key={mode} className="bg-gray-50 rounded-lg px-4 py-3 text-center">
                    <p className="text-xs text-gray-500 uppercase tracking-wide">{mode}</p>
                    <p className="text-base font-bold text-gray-900 mt-1">₹{fmt(amount)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Quick Navigation Cards */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cards.map((card) => (
            <Link key={card.title} to={card.to} className="group card-hover p-5 rounded-xl border border-gray-100 bg-white flex items-start gap-4">
              <div className={`inline-flex p-3 rounded-lg text-white ${card.color} shrink-0`}>
                <card.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <h3 className="text-base font-semibold text-gray-900">{card.title}</h3>
                  <ArrowUpRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-sm text-gray-600 mt-0.5">{card.text}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Approval Requests */}
      {recentRequests.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600"><FileCheck2 className="w-4 h-4" /></div>
              <h3 className="font-semibold text-gray-900">Recent Requests</h3>
            </div>
            <Link to="/account-officer/approval-requests" className="text-sm text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="pb-2 pr-4">ID</th>
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2 pr-4">Demand</th>
                  <th className="pb-2 pr-4">Value</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentRequests.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-gray-900">#{r.id}</td>
                    <td className="py-2.5 pr-4">{r.requestType === 'DISCOUNT' ? 'Discount' : 'Penalty Waiver'}</td>
                    <td className="py-2.5 pr-4 text-gray-600">{r.demand?.demandNumber || r.demandId}</td>
                    <td className="py-2.5 pr-4 font-medium">
                      {r.adjustmentType === 'percentage' ? `${r.adjustmentValue}%` : `₹${fmt(r.adjustmentValue)}`}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-gray-500">{new Date(r.created_at || r.createdAt).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, sub, color }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600'
  };
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${colors[color]}`}><Icon className="w-4 h-4" /></div>
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
};

const MiniStat = ({ label, value }) => (
  <div>
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-sm font-semibold text-gray-900">{value}</p>
  </div>
);

export default AccountOfficerDashboard;
