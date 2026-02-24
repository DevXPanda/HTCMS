import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { citizenAPI } from '../../services/api';
import Loading from '../../components/Loading';
import { Home, FileText, DollarSign, CreditCard, Bell, Store, Droplet, PlusCircle, FileCheck, History, TrendingUp } from 'lucide-react';

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
      title: 'Pending House Tax',
      value: dashboard?.pendingHouseTaxDemands || 0,
      icon: FileText,
      color: 'bg-orange-500',
      link: '/citizen/demands?serviceType=HOUSE_TAX'
    },
    {
      title: 'Pending Water Tax',
      value: dashboard?.pendingWaterTaxDemands || 0,
      icon: FileText,
      color: 'bg-cyan-500',
      link: '/citizen/demands?serviceType=WATER_TAX'
    },
    {
      title: 'Pending D2DC',
      value: dashboard?.pendingD2dcDemands || 0,
      icon: FileText,
      color: 'bg-green-500',
      link: '/citizen/demands?serviceType=D2DC'
    },
    {
      title: 'Pending Shop Tax',
      value: dashboard?.pendingShopTaxDemands || 0,
      icon: Store,
      color: 'bg-amber-500',
      link: '/citizen/demands?serviceType=SHOP_TAX'
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
      title: 'House Tax Outstanding',
      value: `₹${(dashboard?.houseTaxOutstanding || 0).toLocaleString('en-IN')}`,
      icon: DollarSign,
      color: 'bg-orange-600',
      link: '/citizen/demands?serviceType=HOUSE_TAX'
    },
    {
      title: 'Water Tax Outstanding',
      value: `₹${(dashboard?.waterTaxOutstanding || 0).toLocaleString('en-IN')}`,
      icon: DollarSign,
      color: 'bg-cyan-600',
      link: '/citizen/demands?serviceType=WATER_TAX'
    },
    {
      title: 'D2DC Outstanding',
      value: `₹${(dashboard?.d2dcOutstanding || 0).toLocaleString('en-IN')}`,
      icon: DollarSign,
      color: 'bg-green-600',
      link: '/citizen/demands?serviceType=D2DC'
    },
    {
      title: 'Shop Tax Outstanding',
      value: `₹${(dashboard?.shopTaxOutstanding || 0).toLocaleString('en-IN')}`,
      icon: DollarSign,
      color: 'bg-amber-600',
      link: '/citizen/demands?serviceType=SHOP_TAX'
    },
    {
      title: 'My Shops',
      value: dashboard?.shops || 0,
      icon: Store,
      color: 'bg-amber-500',
      link: '/citizen/shops'
    },
    {
      title: 'Recent Payments',
      value: dashboard?.recentPayments?.length || 0,
      icon: CreditCard,
      color: 'bg-green-500',
      link: '/citizen/payments'
    }
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
    { name: 'Toilet Complaint History', icon: ClipboardList, link: '/citizen/toilet/complaint-history', color: 'bg-pink-600' },
    { name: 'Payment History', icon: CreditCard, link: '/citizen/payments', color: 'bg-green-600' },
    { name: 'Activity History', icon: History, link: '/citizen/activity-history', color: 'bg-gray-600' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Citizen Dashboard</h1>
          <p className="text-gray-500 text-sm">My Services & Information</p>
        </div>
      </div>

      {/* Quick Actions Section */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-primary-600" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.link}
              className="flex flex-col items-center justify-center p-5 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-primary-100 transition-all group"
            >
              <div className={`p-3 rounded-full ${action.color} text-white mb-3 shadow-sm group-hover:scale-110 transition-transform`}>
                <action.icon className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium text-gray-700 group-hover:text-primary-700 text-center">{action.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Link key={index} to={stat.link} className="bg-white rounded-lg border border-gray-100 p-6 hover:shadow-lg transition-shadow relative">
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
        <div className="bg-white rounded-lg border border-gray-100 p-6">
          <h2 className="text-xl font-semibold mb-4">Pending Demands</h2>
          {dashboard?.pendingDemandsList && dashboard.pendingDemandsList.length > 0 ? (
            <div className="space-y-3">
              {dashboard.pendingDemandsList.slice(0, 5).map((demand) => {
                const isD2DC = demand.serviceType === 'D2DC';
                const isWaterTax = demand.serviceType === 'WATER_TAX';
                const isShopTax = demand.serviceType === 'SHOP_TAX';
                return (
                  <div key={demand.id} className="border-b pb-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium">{demand.demandNumber}</p>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${isD2DC
                        ? 'bg-green-100 text-green-800 border border-green-300'
                        : isWaterTax
                          ? 'bg-cyan-100 text-cyan-800 border border-cyan-300'
                          : isShopTax
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-blue-100 text-blue-800 border border-blue-300'
                        }`}>
                        {isD2DC ? 'D2DC' : isWaterTax ? 'Water Tax' : isShopTax ? 'Shop Tax' : 'House Tax'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Balance: ₹{parseFloat(demand.balanceAmount).toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-gray-500">
                      Due: {new Date(demand.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">No pending demands</p>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-100 p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Payments</h2>
          {dashboard?.recentPayments && dashboard.recentPayments.length > 0 ? (
            <div className="space-y-3">
              {dashboard.recentPayments.map((payment) => {
                const isD2DC = payment.demand?.serviceType === 'D2DC';
                const isWaterTax = payment.demand?.serviceType === 'WATER_TAX';
                const isShopTax = payment.demand?.serviceType === 'SHOP_TAX';
                return (
                  <div key={payment.id} className="border-b pb-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium">{payment.receiptNumber}</p>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${isD2DC
                        ? 'bg-green-100 text-green-800 border border-green-300'
                        : isWaterTax
                          ? 'bg-cyan-100 text-cyan-800 border border-cyan-300'
                          : isShopTax
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-blue-100 text-blue-800 border border-blue-300'
                        }`}>
                        {isD2DC ? 'D2DC' : isWaterTax ? 'Water Tax' : isShopTax ? 'Shop Tax' : 'House Tax'}
                      </span>
                    </div>
                    <p className="text-sm text-green-600">
                      ₹{parseFloat(payment.amount).toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(payment.paymentDate).toLocaleDateString()}
                    </p>
                  </div>
                );
              })}
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
