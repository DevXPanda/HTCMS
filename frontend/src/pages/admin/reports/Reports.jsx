import { useState, useEffect } from 'react';
import { reportAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import { DollarSign, AlertCircle, MapPin, Filter, Calendar, Recycle, Building2, Heart } from 'lucide-react';
import { useSelectedUlb } from '../../../contexts/SelectedUlbContext';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const Reports = () => {
  const { effectiveUlbId } = useSelectedUlb();
  const [activeTab, setActiveTab] = useState('revenue');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    wardId: '',
    paymentMode: '',
    taxType: '' // 'HOUSE_TAX', 'WATER_TAX', 'D2DC', or '' for all
  });
  const [showFilters, setShowFilters] = useState(false);

  const tabs = [
    { id: 'revenue', label: 'Revenue Report', icon: DollarSign },
    { id: 'outstanding', label: 'Outstanding', icon: AlertCircle },
    { id: 'ward-wise', label: 'Ward-wise', icon: MapPin },
    { id: 'mrf', label: 'MRF', icon: Recycle },
    { id: 'toilet', label: 'Toilet', icon: Building2 },
    { id: 'gaushala', label: 'Gaushala', icon: Heart }
  ];

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  const BAR_COLORS = ['#2563eb', '#0d9488', '#8b5cf6', '#f59e0b'];

  useEffect(() => {
    fetchReport(activeTab);
  }, [activeTab, filters, effectiveUlbId]);

  const fetchReport = async (type) => {
    setLoading(true);
    try {
      let response;
      const params = {};
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.wardId) params.wardId = filters.wardId;
      if (filters.paymentMode) params.paymentMode = filters.paymentMode;
      if (filters.taxType) params.taxType = filters.taxType;
      if (effectiveUlbId) params.ulb_id = effectiveUlbId;

      switch (type) {
        case 'revenue':
          response = await reportAPI.getRevenue(params);
          break;
        case 'outstanding':
          response = await reportAPI.getOutstanding(params);
          break;
        case 'ward-wise':
          response = await reportAPI.getWardWise(params);
          break;
        case 'mrf':
          response = await reportAPI.getMrfStats(params);
          break;
        case 'toilet':
          response = await reportAPI.getToiletStats(params);
          break;
        case 'gaushala':
          response = await reportAPI.getGaushalaStats(params);
          break;
        default:
          return;
      }
      setData(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch report');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      wardId: '',
      paymentMode: '',
      taxType: ''
    });
  };

  // Prepare chart data - includes both regular payments and water payments
  const getRevenueChartData = () => {
    if (!data?.payments && !data?.waterPayments) return [];
    const dailyData = {};

    // Process regular payments
    if (data.payments) {
      data.payments.forEach(payment => {
        const date = new Date(payment.paymentDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        dailyData[date] = (dailyData[date] || 0) + parseFloat(payment.amount || 0);
      });
    }

    // Process water payments if available
    if (data.waterPayments) {
      data.waterPayments.forEach(payment => {
        const date = new Date(payment.paymentDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        dailyData[date] = (dailyData[date] || 0) + parseFloat(payment.amount || 0);
      });
    }

    return Object.entries(dailyData)
      .sort((a, b) => new Date(a[0]) - new Date(b[0]))
      .map(([date, amount]) => ({ date, amount }));
  };

  const getPaymentModeData = () => {
    if (!data?.summary?.byPaymentMode) return [];
    return Object.entries(data.summary.byPaymentMode).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: parseFloat(value || 0)
    }));
  };

  const getWardWiseChartData = () => {
    if (!data?.report) return [];
    return data.report.map(ward => ({
      name: ward.ward.wardName,
      collection: parseFloat(ward.totalCollection || 0),
      outstanding: parseFloat(ward.totalOutstanding || 0)
    }));
  };

  const formatCurrency = (val) => `₹${parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatAxis = (val) => {
    const n = Number(val);
    if (n >= 1e7) return `${(n / 1e7).toFixed(1)}Cr`;
    if (n >= 1e5) return `${(n / 1e5).toFixed(1)}L`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
    return n;
  };

  return (
    <div>
      <div className="ds-page-header">
        <div>
          <h1 className="ds-page-title">Reports & Analytics</h1>
          <p className="ds-page-subtitle">Revenue, outstanding and ward-wise insights</p>
        </div>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="btn btn-secondary flex items-center"
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card mb-6 p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="ds-section-title flex items-center gap-2 m-0">
              <Calendar className="w-5 h-5 text-gray-500" />
              Filters
            </h3>
            <button type="button" onClick={clearFilters} className="btn btn-ghost btn-sm">
              Clear All
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="label">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="input"
              />
            </div>
            {activeTab === 'revenue' && (
              <>
                <div>
                  <label className="label">Tax Type</label>
                  <select
                    value={filters.taxType}
                    onChange={(e) => handleFilterChange('taxType', e.target.value)}
                    className="input"
                  >
                    <option value="">All Types</option>
                    <option value="HOUSE_TAX">Property Tax</option>
                    <option value="WATER_TAX">Water Tax</option>
                    <option value="D2DC">D2DC</option>
                    <option value="SHOP_TAX">Shop Tax</option>
                  </select>
                </div>
                <div>
                  <label className="label">Payment Mode</label>
                  <select
                    value={filters.paymentMode}
                    onChange={(e) => handleFilterChange('paymentMode', e.target.value)}
                    className="input"
                  >
                    <option value="">All Modes</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="dd">DD</option>
                    <option value="card">Card</option>
                    <option value="online">Online</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tabs - pill style */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-ds text-sm font-medium transition-colors ${isActive
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="card p-0 overflow-hidden">

        <div className="p-5 sm:p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent" />
              <p className="mt-3 text-sm text-gray-500">Loading report...</p>
            </div>
          ) : (
            <div className="space-y-8">
              {activeTab === 'revenue' && !data && !loading && (
                <div className="text-center py-16 rounded-ds bg-gray-50 border border-dashed border-gray-200">
                  <DollarSign className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600">No revenue data available.</p>
                  <p className="text-sm text-gray-500 mt-1">Select date range and filters to view reports.</p>
                </div>
              )}
              {activeTab === 'revenue' && data && (
                <div className="space-y-8">
                  {/* Revenue summary - amounts stay in box, responsive text */}
                  <div>
                    <h2 className="ds-section-title-muted">Revenue summary</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="card border-l-4 border-l-green-500 bg-white min-w-0 overflow-hidden">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Revenue</p>
                        <p className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 tabular-nums truncate" title={formatCurrency(data.summary?.totalAmount)}>{formatCurrency(data.summary?.totalAmount)}</p>
                      </div>
                      <div className="card border-l-4 border-l-blue-500 bg-white min-w-0 overflow-hidden">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Property Tax</p>
                        <p className="text-base sm:text-lg font-bold text-gray-900 tabular-nums truncate" title={formatCurrency(data.summary?.houseTaxAmount)}>{formatCurrency(data.summary?.houseTaxAmount)}</p>
                        <p className="text-xs text-gray-500 mt-1">{data.summary?.houseTaxCount || 0} payments</p>
                      </div>
                      <div className="card border-l-4 border-l-purple-500 bg-white min-w-0 overflow-hidden">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Water Tax</p>
                        <p className="text-base sm:text-lg font-bold text-gray-900 tabular-nums truncate" title={formatCurrency(data.summary?.waterTaxAmount)}>{formatCurrency(data.summary?.waterTaxAmount)}</p>
                        <p className="text-xs text-gray-500 mt-1">{data.summary?.waterTaxCount || 0} payments</p>
                      </div>
                      <div className="card border-l-4 border-l-pink-500 bg-white min-w-0 overflow-hidden">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">D2DC</p>
                        <p className="text-base sm:text-lg font-bold text-gray-900 tabular-nums truncate" title={formatCurrency(data.summary?.d2dcAmount)}>{formatCurrency(data.summary?.d2dcAmount)}</p>
                        <p className="text-xs text-gray-500 mt-1">{data.summary?.d2dcCount || 0} payments</p>
                      </div>
                      <div className="card border-l-4 border-l-amber-500 bg-white min-w-0 overflow-hidden">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Shop Tax</p>
                        <p className="text-base sm:text-lg font-bold text-gray-900 tabular-nums truncate" title={formatCurrency(data.summary?.shopTaxAmount)}>{formatCurrency(data.summary?.shopTaxAmount)}</p>
                        <p className="text-xs text-gray-500 mt-1">{data.summary?.shopTaxCount || 0} payments</p>
                      </div>
                    </div>
                  </div>

                  {/* Revenue Breakdown by Tax Type - colorful bars */}
                  <div>
                    <h2 className="ds-section-title-muted">Revenue breakdown by tax type</h2>
                    <div className="card bg-white border border-gray-100 pt-4 pb-2">
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart
                          data={[
                            { name: 'Property Tax', value: parseFloat(data.summary?.houseTaxAmount || 0) },
                            { name: 'Water Tax', value: parseFloat(data.summary?.waterTaxAmount || 0) },
                            { name: 'D2DC', value: parseFloat(data.summary?.d2dcAmount || 0) },
                            { name: 'Shop Tax', value: parseFloat(data.summary?.shopTaxAmount || 0) }
                          ]}
                          margin={{ top: 12, right: 16, left: 8, bottom: 8 }}
                          barCategoryGap="20%"
                          barSize={48}
                        >
                          <defs>
                            {BAR_COLORS.map((color, i) => (
                              <linearGradient key={i} id={`barFill-${i}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={color} stopOpacity={1} />
                                <stop offset="100%" stopColor={color} stopOpacity={0.75} />
                              </linearGradient>
                            ))}
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} />
                          <YAxis tickFormatter={formatAxis} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                          <Tooltip formatter={(value) => [formatCurrency(value), 'Revenue']} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }} />
                          <Bar dataKey="value" name="Revenue (₹)" radius={[8, 8, 0, 0]} maxBarSize={80}>
                            {[0, 1, 2, 3].map((index) => (
                              <Cell key={index} fill={`url(#barFill-${index})`} stroke={BAR_COLORS[index]} strokeWidth={1} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {getRevenueChartData().length > 0 && (
                    <div>
                      <h2 className="ds-section-title-muted">Daily revenue trend</h2>
                      <div className="card bg-white border border-gray-100 pt-4 pb-2">
                        <ResponsiveContainer width="100%" height={320}>
                          <AreaChart data={getRevenueChartData()} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
                            <defs>
                              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.4} />
                                <stop offset="100%" stopColor="#2563eb" stopOpacity={0.05} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} />
                            <YAxis tickFormatter={formatAxis} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                            <Tooltip formatter={(value) => [formatCurrency(value), 'Revenue']} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }} />
                            <Area type="monotone" dataKey="amount" fill="url(#revenueGradient)" stroke="none" />
                            <Line type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={2.5} dot={{ fill: '#2563eb', r: 5, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, fill: '#1d4ed8', stroke: '#fff', strokeWidth: 2 }} name="Revenue (₹)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {getPaymentModeData().length > 0 && (
                    <div>
                      <h2 className="ds-section-title-muted">Revenue by payment mode</h2>
                      <div className="card bg-white border border-gray-100 pt-4 pb-2">
                        <ResponsiveContainer width="100%" height={320}>
                          <PieChart>
                            <Pie
                              data={getPaymentModeData()}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {getPaymentModeData().map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatCurrency(value)} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'outstanding' && !data && !loading && (
                <div className="text-center py-16 rounded-ds bg-gray-50 border border-dashed border-gray-200">
                  <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600">No outstanding data available.</p>
                  <p className="text-sm text-gray-500 mt-1">Select filters to view reports.</p>
                </div>
              )}
              {activeTab === 'outstanding' && data && (
                <div className="space-y-8">
                  <div>
                    <h2 className="ds-section-title-muted">Outstanding summary</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="card border-l-4 border-l-red-500 bg-white">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total Outstanding</p>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.summary?.totalOutstanding)}</p>
                      </div>
                      <div className="card border-l-4 border-l-orange-500 bg-white">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total Demands</p>
                        <p className="text-2xl font-bold text-gray-900">{data.summary?.totalCount || 0}</p>
                      </div>
                      <div className="card border-l-4 border-l-amber-500 bg-white">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Average Outstanding</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {data.summary?.totalCount > 0 ? formatCurrency(parseFloat(data.summary.totalOutstanding || 0) / data.summary.totalCount) : '₹0.00'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h2 className="ds-section-title-muted">By tax type</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="card bg-white border border-gray-100">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Property Tax</p>
                        <p className="text-xl font-bold text-gray-900">{formatCurrency(data.summary?.houseTaxOutstanding)}</p>
                        <p className="text-xs text-gray-500 mt-1">{data.summary?.houseTaxCount || 0} demands</p>
                      </div>
                      <div className="card bg-white border border-gray-100">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Water Tax</p>
                        <p className="text-xl font-bold text-gray-900">{formatCurrency(data.summary?.waterTaxOutstanding)}</p>
                        <p className="text-xs text-gray-500 mt-1">{data.summary?.waterTaxCount || 0} demands</p>
                      </div>
                      <div className="card bg-white border border-gray-100">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">D2DC</p>
                        <p className="text-xl font-bold text-gray-900">{formatCurrency(data.summary?.d2dcOutstanding)}</p>
                        <p className="text-xs text-gray-500 mt-1">{data.summary?.d2dcCount || 0} demands</p>
                      </div>
                      <div className="card bg-white border border-gray-100">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Shop Tax</p>
                        <p className="text-xl font-bold text-gray-900">{formatCurrency(data.summary?.shopTaxOutstanding)}</p>
                        <p className="text-xs text-gray-500 mt-1">{data.summary?.shopTaxCount || 0} demands</p>
                      </div>
                    </div>
                  </div>

                  {data.demands && data.demands.length > 0 && (
                    <div>
                      <h2 className="ds-section-title-muted">Outstanding demands</h2>
                      <div className="card overflow-hidden p-0">
                      <div className="overflow-x-auto">
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Demand Number</th>
                              <th>Service Type</th>
                              <th>Property/Shop</th>
                              <th>Owner</th>
                              <th>Due Date</th>
                              <th>Outstanding</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.demands.slice(0, 20).map((demand) => (
                              <tr key={demand.id}>
                                <td className="font-medium">{demand.demandNumber}</td>
                                <td>
                                  <span className={`badge ${
                                    demand.serviceType === 'HOUSE_TAX' ? 'badge-info' :
                                    demand.serviceType === 'WATER_TAX' ? 'badge-primary' :
                                    demand.serviceType === 'SHOP_TAX' ? 'badge-warning' :
                                    'badge-secondary'
                                  }`}>
                                    {demand.serviceType === 'HOUSE_TAX' ? 'Property' :
                                     demand.serviceType === 'WATER_TAX' ? 'Water' :
                                     demand.serviceType === 'SHOP_TAX' ? 'Shop' :
                                     demand.serviceType}
                                  </span>
                                </td>
                                <td>
                                  {demand.serviceType === 'SHOP_TAX' && demand.shopTaxAssessment?.shop
                                    ? `Shop: ${demand.shopTaxAssessment.shop.shopName || demand.shopTaxAssessment.shop.shopNumber || 'N/A'}`
                                    : demand.property?.propertyNumber || 'N/A'}
                                </td>
                                <td>
                                  {demand.serviceType === 'SHOP_TAX' && demand.shopTaxAssessment?.shop
                                    ? demand.property?.owner
                                      ? `${demand.property.owner.firstName} ${demand.property.owner.lastName}`
                                      : 'N/A'
                                    : demand.property?.owner
                                      ? `${demand.property.owner.firstName} ${demand.property.owner.lastName}`
                                      : 'N/A'}
                                </td>
                                <td>{new Date(demand.dueDate).toLocaleDateString()}</td>
                                <td className="font-semibold text-red-600">
                                  ₹{parseFloat(demand.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td>
                                  <span className={`badge ${demand.status === 'overdue' ? 'badge-danger' :
                                      demand.status === 'pending' ? 'badge-warning' :
                                        'badge-info'
                                    } capitalize`}>
                                    {demand.status.replace('_', ' ')}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'ward-wise' && !data && !loading && (
                <div className="text-center py-16 rounded-ds bg-gray-50 border border-dashed border-gray-200">
                  <MapPin className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600">No ward-wise data available.</p>
                  <p className="text-sm text-gray-500 mt-1">Select filters to view reports.</p>
                </div>
              )}
              {activeTab === 'ward-wise' && data && (
                <div className="space-y-8">
                  {getWardWiseChartData().length > 0 && (
                    <div>
                      <h2 className="ds-section-title-muted">Ward-wise collection & outstanding</h2>
                      <div className="card bg-gray-50/50 pt-4">
                        <ResponsiveContainer width="100%" height={400}>
                          <BarChart data={getWardWiseChartData()}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 11 }} />
                            <YAxis tickFormatter={formatAxis} tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(value) => [formatCurrency(value), '']} />
                            <Legend />
                            <Bar dataKey="collection" fill="#10b981" name="Collection (₹)" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="outstanding" fill="#ef4444" name="Outstanding (₹)" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  <div>
                    <h2 className="ds-section-title-muted">Ward details</h2>
                    <div className="card overflow-hidden p-0">
                    <div className="overflow-x-auto">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Ward</th>
                            <th>Collector</th>
                            <th>Properties</th>
                            <th>Collection</th>
                            <th>Outstanding</th>
                            <th>Payment Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.report?.map((ward) => (
                            <tr key={ward.ward.id}>
                              <td>
                                <div>
                                  <div className="font-medium">{ward.ward.wardName}</div>
                                  <div className="text-sm text-gray-500">#{ward.ward.wardNumber}</div>
                                </div>
                              </td>
                              <td>
                                {ward.ward.collector
                                  ? (ward.ward.collector.full_name || `${ward.ward.collector.firstName} ${ward.ward.collector.lastName}`)
                                  : 'Not Assigned'}
                              </td>
                              <td>{ward.totalProperties}</td>
                              <td className="font-semibold text-green-600">
                                ₹{parseFloat(ward.totalCollection || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="font-semibold text-red-600">
                                ₹{parseFloat(ward.totalOutstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td>{ward.paymentCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MRF Report - 3x3 summary grid */}
              {activeTab === 'mrf' && !data && !loading && (
                <div className="text-center py-16 rounded-ds bg-gray-50 border border-dashed border-gray-200">
                  <Recycle className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600">No MRF data available.</p>
                </div>
              )}
              {activeTab === 'mrf' && data && (
                <div>
                  <h2 className="ds-section-title-muted">MRF summary</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="card border-l-4 border-l-blue-500 bg-white min-w-0 overflow-hidden">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Facilities</p>
                      <p className="text-xl font-bold text-gray-900 tabular-nums">{data.totalFacilities ?? 0}</p>
                    </div>
                    <div className="card border-l-4 border-l-green-500 bg-white min-w-0 overflow-hidden">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Active Facilities</p>
                      <p className="text-xl font-bold text-gray-900 tabular-nums">{data.activeFacilities ?? 0}</p>
                    </div>
                    <div className="card border-l-4 border-l-amber-500 bg-white min-w-0 overflow-hidden">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Under Maintenance</p>
                      <p className="text-xl font-bold text-gray-900 tabular-nums">{data.maintenanceFacilities ?? 0}</p>
                    </div>
                    <div className="card border-l-4 border-l-teal-500 bg-white min-w-0 overflow-hidden">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Processing (MT)</p>
                      <p className="text-xl font-bold text-gray-900 tabular-nums">{(data.totalProcessing ?? 0).toFixed(2)}</p>
                    </div>
                    <div className="card border-l-4 border-l-purple-500 bg-white min-w-0 overflow-hidden">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Efficiency %</p>
                      <p className="text-xl font-bold text-gray-900 tabular-nums">{data.efficiency ?? 0}%</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Toilet Report - 3x3 summary grid */}
              {activeTab === 'toilet' && !data && !loading && (
                <div className="text-center py-16 rounded-ds bg-gray-50 border border-dashed border-gray-200">
                  <Building2 className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600">No toilet data available.</p>
                </div>
              )}
              {activeTab === 'toilet' && data && (
                <div>
                  <h2 className="ds-section-title-muted">Toilet summary</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="card border-l-4 border-l-blue-500 bg-white min-w-0 overflow-hidden">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Facilities</p>
                      <p className="text-xl font-bold text-gray-900 tabular-nums">{data.totalFacilities ?? 0}</p>
                    </div>
                    <div className="card border-l-4 border-l-green-500 bg-white min-w-0 overflow-hidden">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Active Facilities</p>
                      <p className="text-xl font-bold text-gray-900 tabular-nums">{data.activeFacilities ?? 0}</p>
                    </div>
                    <div className="card border-l-4 border-l-amber-500 bg-white min-w-0 overflow-hidden">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Under Maintenance</p>
                      <p className="text-xl font-bold text-gray-900 tabular-nums">{data.maintenanceFacilities ?? 0}</p>
                    </div>
                    <div className="card border-l-4 border-l-cyan-500 bg-white min-w-0 overflow-hidden">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Inspections</p>
                      <p className="text-xl font-bold text-gray-900 tabular-nums">{data.totalInspections ?? 0}</p>
                    </div>
                    <div className="card border-l-4 border-l-emerald-500 bg-white min-w-0 overflow-hidden">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Passed Inspections</p>
                      <p className="text-xl font-bold text-gray-900 tabular-nums">{data.passedInspections ?? 0}</p>
                    </div>
                    <div className="card border-l-4 border-l-red-500 bg-white min-w-0 overflow-hidden">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Failed Inspections</p>
                      <p className="text-xl font-bold text-gray-900 tabular-nums">{data.failedInspections ?? 0}</p>
                    </div>
                    <div className="card border-l-4 border-l-orange-500 bg-white min-w-0 overflow-hidden">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Complaints</p>
                      <p className="text-xl font-bold text-gray-900 tabular-nums">{data.totalComplaints ?? 0}</p>
                    </div>
                    <div className="card border-l-4 border-l-green-600 bg-white min-w-0 overflow-hidden">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Resolved Complaints</p>
                      <p className="text-xl font-bold text-gray-900 tabular-nums">{data.resolvedComplaints ?? 0}</p>
                    </div>
                    <div className="card border-l-4 border-l-violet-500 bg-white min-w-0 overflow-hidden">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Completed Maintenance</p>
                      <p className="text-xl font-bold text-gray-900 tabular-nums">{data.completedMaintenance ?? 0} / {data.totalMaintenance ?? 0}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Gaushala Report - 3x3 summary grid */}
              {activeTab === 'gaushala' && !data && !loading && (
                <div className="text-center py-16 rounded-ds bg-gray-50 border border-dashed border-gray-200">
                  <Heart className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600">No gaushala data available.</p>
                </div>
              )}
              {activeTab === 'gaushala' && data && (
                <div>
                  <h2 className="ds-section-title-muted">Gaushala summary</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="card border-l-4 border-l-blue-500 bg-white min-w-0 overflow-hidden">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Facilities</p>
                      <p className="text-xl font-bold text-gray-900 tabular-nums">{data.totalFacilities ?? 0}</p>
                    </div>
                    <div className="card border-l-4 border-l-green-500 bg-white min-w-0 overflow-hidden">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Active Facilities</p>
                      <p className="text-xl font-bold text-gray-900 tabular-nums">{data.activeFacilities ?? 0}</p>
                    </div>
                    <div className="card border-l-4 border-l-amber-500 bg-white min-w-0 overflow-hidden">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Cattle</p>
                      <p className="text-xl font-bold text-gray-900 tabular-nums">{data.totalCattle ?? 0}</p>
                    </div>
                    <div className="card border-l-4 border-l-emerald-500 bg-white min-w-0 overflow-hidden">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Healthy Cattle</p>
                      <p className="text-xl font-bold text-gray-900 tabular-nums">{data.healthyCattle ?? 0}</p>
                    </div>
                    <div className="card border-l-4 border-l-cyan-500 bg-white min-w-0 overflow-hidden">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Health Rate %</p>
                      <p className="text-xl font-bold text-gray-900 tabular-nums">{data.healthRate ?? 0}%</p>
                    </div>
                    <div className="card border-l-4 border-l-orange-500 bg-white min-w-0 overflow-hidden">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Complaints</p>
                      <p className="text-xl font-bold text-gray-900 tabular-nums">{data.totalComplaints ?? 0}</p>
                    </div>
                    <div className="card border-l-4 border-l-green-600 bg-white min-w-0 overflow-hidden">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Resolved Complaints</p>
                      <p className="text-xl font-bold text-gray-900 tabular-nums">{data.resolvedComplaints ?? 0}</p>
                    </div>
                    <div className="card border-l-4 border-l-purple-500 bg-white min-w-0 overflow-hidden">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Inspections</p>
                      <p className="text-xl font-bold text-gray-900 tabular-nums">{data.totalInspections ?? 0}</p>
                    </div>
                    <div className="card border-l-4 border-l-teal-500 bg-white min-w-0 overflow-hidden">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Feeding Records</p>
                      <p className="text-xl font-bold text-gray-900 tabular-nums">{data.totalFeedingRecords ?? 0}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
