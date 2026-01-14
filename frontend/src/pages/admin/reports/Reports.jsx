import { useState, useEffect } from 'react';
import { reportAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import { BarChart3, DollarSign, AlertCircle, MapPin, Download, Filter, Calendar } from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
  const [activeTab, setActiveTab] = useState('revenue');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    wardId: '',
    paymentMode: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  const tabs = [
    { id: 'revenue', label: 'Revenue Report', icon: DollarSign },
    { id: 'outstanding', label: 'Outstanding', icon: AlertCircle },
    { id: 'ward-wise', label: 'Ward-wise', icon: MapPin }
  ];

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  useEffect(() => {
    fetchReport(activeTab);
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
      paymentMode: ''
    });
  };

  // Prepare chart data
  const getRevenueChartData = () => {
    if (!data?.payments) return [];
    const dailyData = {};
    data.payments.forEach(payment => {
      const date = new Date(payment.paymentDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      dailyData[date] = (dailyData[date] || 0) + parseFloat(payment.amount || 0);
    });
    return Object.entries(dailyData).map(([date, amount]) => ({ date, amount }));
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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="btn btn-secondary flex items-center"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Filters
            </h3>
            <button
              onClick={clearFilters}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Clear All
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            )}
          </div>
        </div>
      )}

      <div className="card">
        <div className="border-b mb-6">
          <nav className="flex space-x-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center px-4 py-2 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            </div>
          ) : (
            <div>
              {activeTab === 'revenue' && data && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="card bg-green-50">
                      <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                      <p className="text-3xl font-bold text-green-600">
                        ₹{parseFloat(data.summary?.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="card bg-blue-50">
                      <p className="text-sm text-gray-600 mb-1">Total Payments</p>
                      <p className="text-3xl font-bold text-blue-600">{data.summary?.totalCount || 0}</p>
                    </div>
                    <div className="card bg-purple-50">
                      <p className="text-sm text-gray-600 mb-1">Average Payment</p>
                      <p className="text-3xl font-bold text-purple-600">
                        ₹{data.summary?.totalCount > 0 
                          ? (parseFloat(data.summary.totalAmount || 0) / data.summary.totalCount).toLocaleString('en-IN', { minimumFractionDigits: 2 })
                          : '0.00'}
                      </p>
                    </div>
                  </div>

                  {getRevenueChartData().length > 0 && (
                    <div className="card">
                      <h3 className="text-lg font-semibold mb-4">Daily Revenue Trend</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={getRevenueChartData()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip formatter={(value) => `₹${parseFloat(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} />
                          <Legend />
                          <Line type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={2} name="Revenue (₹)" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {getPaymentModeData().length > 0 && (
                    <div className="card">
                      <h3 className="text-lg font-semibold mb-4">Revenue by Payment Mode</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={getPaymentModeData()}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {getPaymentModeData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `₹${parseFloat(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'outstanding' && data && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="card bg-red-50">
                      <p className="text-sm text-gray-600 mb-1">Total Outstanding</p>
                      <p className="text-3xl font-bold text-red-600">
                        ₹{parseFloat(data.summary?.totalOutstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="card bg-orange-50">
                      <p className="text-sm text-gray-600 mb-1">Total Demands</p>
                      <p className="text-3xl font-bold text-orange-600">{data.summary?.totalCount || 0}</p>
                    </div>
                    <div className="card bg-yellow-50">
                      <p className="text-sm text-gray-600 mb-1">Average Outstanding</p>
                      <p className="text-3xl font-bold text-yellow-600">
                        ₹{data.summary?.totalCount > 0 
                          ? (parseFloat(data.summary.totalOutstanding || 0) / data.summary.totalCount).toLocaleString('en-IN', { minimumFractionDigits: 2 })
                          : '0.00'}
                      </p>
                    </div>
                  </div>

                  {data.demands && data.demands.length > 0 && (
                    <div className="card">
                      <h3 className="text-lg font-semibold mb-4">Outstanding Demands</h3>
                      <div className="overflow-x-auto">
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Demand Number</th>
                              <th>Property</th>
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
                                <td>{demand.property?.propertyNumber || 'N/A'}</td>
                                <td>
                                  {demand.property?.owner 
                                    ? `${demand.property.owner.firstName} ${demand.property.owner.lastName}`
                                    : 'N/A'}
                                </td>
                                <td>{new Date(demand.dueDate).toLocaleDateString()}</td>
                                <td className="font-semibold text-red-600">
                                  ₹{parseFloat(demand.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td>
                                  <span className={`badge ${
                                    demand.status === 'overdue' ? 'badge-danger' :
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
                  )}
                </div>
              )}

              {activeTab === 'ward-wise' && data && (
                <div className="space-y-6">
                  {getWardWiseChartData().length > 0 && (
                    <div className="card">
                      <h3 className="text-lg font-semibold mb-4">Ward-wise Collection & Outstanding</h3>
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={getWardWiseChartData()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                          <YAxis />
                          <Tooltip formatter={(value) => `₹${parseFloat(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} />
                          <Legend />
                          <Bar dataKey="collection" fill="#10b981" name="Collection (₹)" />
                          <Bar dataKey="outstanding" fill="#ef4444" name="Outstanding (₹)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <div className="card">
                    <h3 className="text-lg font-semibold mb-4">Ward Details</h3>
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
                                  ? `${ward.ward.collector.firstName} ${ward.ward.collector.lastName}`
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
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
