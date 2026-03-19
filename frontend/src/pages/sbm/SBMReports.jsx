import { useState, useEffect } from 'react';
import { reportAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { DollarSign, AlertCircle, MapPin, Filter, Calendar, Recycle, Building2, Heart } from 'lucide-react';
import api from '../../services/api';
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

const SBM_ULB_STORAGE_KEY = 'htcms_sbm_selected_ulb_id';

const SBMReports = () => {
  const [activeTab, setActiveTab] = useState('revenue');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [ulbs, setUlbs] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    wardId: '',
    paymentMode: '',
    taxType: '',
    ulb_id: (() => {
      try { return sessionStorage.getItem(SBM_ULB_STORAGE_KEY) || ''; } catch { return ''; }
    })()
  });

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
    api.get('/admin-management/ulbs').then((res) => {
      const d = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setUlbs(Array.isArray(d) ? d : []);
    }).catch(() => setUlbs([]));
  }, []);

  useEffect(() => {
    fetchReport(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, filters]);

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
      if (filters.ulb_id) params.ulb_id = filters.ulb_id;

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
      setData(response.data?.data ?? null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch report');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'ulb_id') {
        try {
          if (value) sessionStorage.setItem(SBM_ULB_STORAGE_KEY, value);
          else sessionStorage.removeItem(SBM_ULB_STORAGE_KEY);
        } catch (_) {}
      }
      return next;
    });
  };

  const clearFilters = () => {
    handleFilterChange('startDate', '');
    handleFilterChange('endDate', '');
    handleFilterChange('wardId', '');
    handleFilterChange('paymentMode', '');
    handleFilterChange('taxType', '');
  };

  const getRevenueChartData = () => {
    if (!data?.payments && !data?.waterPayments) return [];
    const dailyData = {};
    if (data.payments) {
      data.payments.forEach((payment) => {
        const date = new Date(payment.paymentDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
        dailyData[date] = (dailyData[date] || 0) + parseFloat(payment.amount || 0);
      });
    }
    if (data.waterPayments) {
      data.waterPayments.forEach((payment) => {
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
    return data.report.map((ward) => ({
      name: ward.ward?.wardName || 'Ward',
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
          <h1 className="ds-page-title">Reports & Analytics (Read-only)</h1>
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

      {showFilters && (
        <div className="card mb-6 p-5 no-print">
          <div className="flex justify-between items-center mb-4">
            <h3 className="ds-section-title flex items-center gap-2 m-0">
              <Calendar className="w-5 h-5 text-gray-500" />
              Filters
            </h3>
            <button type="button" onClick={clearFilters} className="btn btn-secondary btn-sm">
              Clear All
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <label className="label">ULB</label>
              <select value={filters.ulb_id} onChange={(e) => handleFilterChange('ulb_id', e.target.value)} className="input">
                <option value="">All ULBs</option>
                {ulbs.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Start Date</label>
              <input type="date" value={filters.startDate} onChange={(e) => handleFilterChange('startDate', e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">End Date</label>
              <input type="date" value={filters.endDate} onChange={(e) => handleFilterChange('endDate', e.target.value)} className="input" />
            </div>
            {activeTab === 'revenue' && (
              <>
                <div>
                  <label className="label">Tax Type</label>
                  <select value={filters.taxType} onChange={(e) => handleFilterChange('taxType', e.target.value)} className="input">
                    <option value="">All</option>
                    <option value="HOUSE_TAX">House Tax</option>
                    <option value="WATER_TAX">Water Tax</option>
                    <option value="D2DC">D2DC</option>
                    <option value="SHOP_TAX">Shop Tax</option>
                  </select>
                </div>
                <div>
                  <label className="label">Payment Mode</label>
                  <select value={filters.paymentMode} onChange={(e) => handleFilterChange('paymentMode', e.target.value)} className="input">
                    <option value="">All</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                    <option value="netbanking">Netbanking</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
              </>
            )}
            {activeTab === 'ward-wise' && (
              <div>
                <label className="label">Ward ID</label>
                <input type="text" value={filters.wardId} onChange={(e) => handleFilterChange('wardId', e.target.value)} className="input" placeholder="Optional" />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4 no-print">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="spinner spinner-md" />
        </div>
      ) : activeTab === 'revenue' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="ds-section-title">Collections over time</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getRevenueChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={formatAxis} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Area type="monotone" dataKey="amount" stroke="#2563eb" fill="#93c5fd" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card">
            <h3 className="ds-section-title">By payment mode</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={getPaymentModeData()} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {getPaymentModeData().map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : activeTab === 'outstanding' ? (
        <div className="card">
          <h3 className="ds-section-title">Outstanding summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="stat-card">
              <div className="stat-card-title"><span>Total Outstanding</span></div>
              <p className="stat-card-value text-xl font-bold text-red-600">{formatCurrency(data?.summary?.totalOutstanding)}</p>
            </div>
            <div className="stat-card">
              <div className="stat-card-title"><span>Demands</span></div>
              <p className="stat-card-value text-xl font-bold">{(data?.summary?.totalDemands ?? 0).toLocaleString()}</p>
            </div>
            <div className="stat-card">
              <div className="stat-card-title"><span>Properties</span></div>
              <p className="stat-card-value text-xl font-bold">{(data?.summary?.properties ?? 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      ) : activeTab === 'ward-wise' ? (
        <div className="card">
          <h3 className="ds-section-title">Ward-wise collection vs outstanding</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getWardWiseChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide />
                <YAxis tickFormatter={formatAxis} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="collection" fill={BAR_COLORS[0]} name="Collection" />
                <Bar dataKey="outstanding" fill={BAR_COLORS[3]} name="Outstanding" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="card">
          <h3 className="ds-section-title">Report</h3>
          <pre className="text-xs text-gray-700 overflow-auto">{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default SBMReports;

