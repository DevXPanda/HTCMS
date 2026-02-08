import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { wardAPI } from '../../services/api';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import { MapPin, Home, FileText, DollarSign, AlertCircle, TrendingUp } from 'lucide-react';
import { useStaffAuth } from '../../contexts/StaffAuthContext';

const CollectorDashboard = () => {
  const { user } = useStaffAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchDashboard();
    }
  }, [user]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      console.log('🔍 Collector Dashboard - Fetching dashboard data for user:', user?.id, user?.employee_id);
      // Backend will use authenticated user from JWT token
      const response = await wardAPI.getCollectorDashboard();
      console.log('📊 Collector Dashboard - Raw API response:', response.data);
      console.log('📋 Collector Dashboard - Dashboard data:', response.data.data?.dashboard);
      setDashboard(response.data.data.dashboard);
    } catch (error) {
      console.error('❌ Collector Dashboard - Error fetching dashboard:', error);
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  const statCards = [
    {
      title: 'Assigned Wards',
      value: dashboard?.totalWards || 0,
      icon: MapPin,
      color: 'bg-blue-500'
    },
    {
      title: 'Total Properties',
      value: dashboard?.totalProperties || 0,
      icon: Home,
      color: 'bg-green-500'
    },
    {
      title: 'Pending Demands',
      value: dashboard?.pendingDemands?.length || 0,
      icon: FileText,
      color: 'bg-orange-500'
    },
    {
      title: 'Overdue Demands',
      value: dashboard?.overdueDemands?.length || 0,
      icon: AlertCircle,
      color: 'bg-red-500'
    },
    {
      title: 'Total Collection',
      value: `₹${parseFloat(dashboard?.totalCollection || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'bg-green-600'
    },
    {
      title: 'Total Outstanding',
      value: `₹${parseFloat(dashboard?.totalOutstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: 'bg-red-600'
    }
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Collector Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Property-wise Unified Demands - Primary View */}
      <div className="card lg:col-span-2 mb-6">
        <h2 className="text-xl font-semibold mb-4">Property-wise Collection Summary</h2>
        {dashboard?.propertyWiseDemands && dashboard.propertyWiseDemands.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Owner</th>
                  <th>Property (Base+Arrears)</th>
                  <th>Water (Base+Arrears)</th>
                  <th>Penalty / Interest</th>
                  <th>Total Payable</th>
                  <th>Due Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.propertyWiseDemands.map((item) => (
                  <tr key={item.propertyId} className={item.status === 'overdue' ? 'bg-red-50' : ''}>
                    <td>
                      <div>
                        <p className="font-medium">{item.property?.propertyNumber || 'N/A'}</p>
                        <p className="text-xs text-gray-500">{item.property?.address}</p>
                        <p className="text-xs text-gray-400">{item.property?.ward?.wardName}</p>
                      </div>
                    </td>
                    <td>
                      <div>
                        <p className="text-sm">
                          {item.property?.owner?.firstName} {item.property?.owner?.lastName}
                        </p>
                        {item.property?.owner?.phone && (
                          <p className="text-xs text-gray-500">{item.property.owner.phone}</p>
                        )}
                      </div>
                    </td>
                    <td className="text-blue-600 font-semibold">
                      ₹{item.propertyTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-cyan-600 font-semibold">
                      ₹{item.waterTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="text-orange-600 font-semibold">
                      ₹{item.penalty.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      {item.interest > 0 && (
                        <span className="block text-xs text-gray-500">
                          + Interest: ₹{item.interest.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </td>
                    <td className="text-red-600 font-bold text-lg">
                      ₹{item.totalPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      <p className="text-xs text-gray-500 font-normal mt-1">
                        (Balance to collect)
                      </p>
                    </td>
                    <td>
                      <p className="text-sm">{new Date(item.dueDate).toLocaleDateString()}</p>
                      {new Date(item.dueDate) < new Date() && (
                        <p className="text-xs text-red-600 font-semibold">
                          Overdue: {Math.floor((new Date() - new Date(item.dueDate)) / (1000 * 60 * 60 * 24))} days
                        </p>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${
                        item.status === 'paid' ? 'badge-success' :
                        item.status === 'partially_paid' ? 'badge-info' :
                        item.status === 'overdue' ? 'badge-danger' :
                        'badge-warning'
                      } capitalize`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No outstanding unified demands</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Demands */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Pending Demands</h2>
          {dashboard?.pendingDemands && dashboard.pendingDemands.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {dashboard.pendingDemands.slice(0, 10).map((demand) => (
                <div key={demand.id} className="border-b pb-3 last:border-b-0">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium">{demand.demandNumber}</p>
                      <p className="text-sm text-gray-600">
                        {demand.property?.propertyNumber} - {demand.property?.address}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Owner: {demand.property?.owner?.firstName} {demand.property?.owner?.lastName}
                      </p>
                      {demand.property?.owner?.phone && (
                        <p className="text-xs text-gray-500">Phone: {demand.property.owner.phone}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-red-600">
                        ₹{parseFloat(demand.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-gray-500">
                        Due: {new Date(demand.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No pending demands</p>
          )}
        </div>

        {/* Overdue Demands */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4 text-red-600">Overdue Demands</h2>
          {dashboard?.overdueDemands && dashboard.overdueDemands.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {dashboard.overdueDemands.slice(0, 10).map((demand) => (
                <div key={demand.id} className="border-b pb-3 last:border-b-0 bg-red-50 p-2 rounded">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium">{demand.demandNumber}</p>
                      <p className="text-sm text-gray-600">
                        {demand.property?.propertyNumber} - {demand.property?.address}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Owner: {demand.property?.owner?.firstName} {demand.property?.owner?.lastName}
                      </p>
                      {demand.property?.owner?.phone && (
                        <p className="text-xs text-gray-500">Phone: {demand.property.owner.phone}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-red-600">
                        ₹{parseFloat(demand.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-red-600 font-semibold">
                        Overdue: {Math.floor((new Date() - new Date(demand.dueDate)) / (1000 * 60 * 60 * 24))} days
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No overdue demands</p>
          )}
        </div>

        {/* Recent Payments */}
        <div className="card lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Recent Collections</h2>
          {dashboard?.recentPayments && dashboard.recentPayments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Receipt Number</th>
                    <th>Property</th>
                    <th>Amount</th>
                    <th>Payment Mode</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.recentPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="font-medium">{payment.receiptNumber}</td>
                      <td>{payment.property?.propertyNumber || 'N/A'}</td>
                      <td className="font-semibold text-green-600">
                        ₹{parseFloat(payment.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="capitalize">{payment.paymentMode}</td>
                      <td>{new Date(payment.paymentDate).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No recent payments</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CollectorDashboard;
