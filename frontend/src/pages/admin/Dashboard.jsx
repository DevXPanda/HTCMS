import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { reportAPI } from '../../services/api';
import Loading from '../../components/Loading';
import { Home, FileText, Receipt, DollarSign, AlertCircle, TrendingUp } from 'lucide-react';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await reportAPI.getDashboard();
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  const statCards = [
    {
      title: 'Total Properties',
      value: stats?.totalProperties || 0,
      icon: Home,
      color: 'bg-blue-500'
    },
    {
      title: 'Total Tax Assessments',
      value: stats?.totalAssessments || 0,
      icon: FileText,
      color: 'bg-green-500'
    },
    {
      title: 'Total Revenue',
      value: `₹${(stats?.totalRevenue || 0).toLocaleString('en-IN')}`,
      icon: DollarSign,
      color: 'bg-yellow-500'
    },
    {
      title: 'Pending Tax Demands',
      value: stats?.pendingDemands || 0,
      icon: AlertCircle,
      color: 'bg-orange-500'
    },
    {
      title: 'Overdue Tax Demands',
      value: stats?.overdueDemands || 0,
      icon: AlertCircle,
      color: 'bg-red-500'
    },
    {
      title: 'Total Outstanding',
      value: `₹${(stats?.totalOutstanding || 0).toLocaleString('en-IN')}`,
      icon: TrendingUp,
      color: 'bg-purple-500'
    }
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="card">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <Link to="/properties" className="block p-3 bg-gray-50 hover:bg-gray-100 rounded-lg">
              Manage Properties
            </Link>
            <Link to="/assessments" className="block p-3 bg-gray-50 hover:bg-gray-100 rounded-lg">
              Create Tax Assessment
            </Link>
            <Link to="/demands" className="block p-3 bg-gray-50 hover:bg-gray-100 rounded-lg">
              Generate Tax Demands
            </Link>
            <Link to="/payments" className="block p-3 bg-gray-50 hover:bg-gray-100 rounded-lg">
              Record Payment
            </Link>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <p className="text-gray-500">Recent activity will be displayed here</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
