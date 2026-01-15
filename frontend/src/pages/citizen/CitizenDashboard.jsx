import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { citizenAPI } from '../../services/api';
import Loading from '../../components/Loading';
import { Home, FileText, DollarSign, CreditCard, Bell } from 'lucide-react';

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

  const statCards = [
    {
      title: 'My Properties',
      value: dashboard?.properties || 0,
      icon: Home,
      color: 'bg-blue-500',
      link: '/citizen/properties'
    },
    {
      title: 'Pending Demands',
      value: dashboard?.pendingDemands || 0,
      icon: FileText,
      color: 'bg-orange-500',
      link: '/citizen/demands'
    },
    {
      title: 'Active Notices',
      value: dashboard?.activeNotices || 0,
      icon: Bell,
      color: 'bg-yellow-500',
      link: '/citizen/notices',
      badge: dashboard?.activeNotices > 0 ? 'badge-danger' : ''
    },
    {
      title: 'Total Outstanding',
      value: `₹${(dashboard?.totalOutstanding || 0).toLocaleString('en-IN')}`,
      icon: DollarSign,
      color: 'bg-red-500',
      link: '/citizen/demands'
    },
    {
      title: 'Recent Payments',
      value: dashboard?.recentPayments?.length || 0,
      icon: CreditCard,
      color: 'bg-green-500',
      link: '/citizen/payments'
    }
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">My Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Link key={index} to={stat.link} className="card hover:shadow-lg transition-shadow relative">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg relative`}>
                  <Icon className="w-6 h-6 text-white" />
                  {stat.badge && stat.value > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {stat.value}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Pending Demands</h2>
          {dashboard?.pendingDemandsList && dashboard.pendingDemandsList.length > 0 ? (
            <div className="space-y-3">
              {dashboard.pendingDemandsList.slice(0, 5).map((demand) => (
                <div key={demand.id} className="border-b pb-3">
                  <p className="font-medium">{demand.demandNumber}</p>
                  <p className="text-sm text-gray-600">
                    Balance: ₹{parseFloat(demand.balanceAmount).toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-gray-500">
                    Due: {new Date(demand.dueDate).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No pending demands</p>
          )}
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Recent Payments</h2>
          {dashboard?.recentPayments && dashboard.recentPayments.length > 0 ? (
            <div className="space-y-3">
              {dashboard.recentPayments.map((payment) => (
                <div key={payment.id} className="border-b pb-3">
                  <p className="font-medium">{payment.receiptNumber}</p>
                  <p className="text-sm text-green-600">
                    ₹{parseFloat(payment.amount).toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(payment.paymentDate).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No recent payments</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CitizenDashboard;
