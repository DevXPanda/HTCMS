import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Store, Receipt, Bell, CreditCard, DollarSign, AlertCircle, Zap } from 'lucide-react';
import api from '../../services/api';
import { useStaffAuth } from '../../contexts/StaffAuthContext';

const SBMShopTaxModule = () => {
  const { user } = useStaffAuth();
  const canCrud = Boolean(user?.full_crud_enabled);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/reports/dashboard');
      if (response.data && response.data.success !== false) {
        setStats(response.data.data ?? response.data);
      }
    } catch (_) {
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const modules = [
    { title: 'Demands', description: 'View shop tax demands', icon: Receipt, link: '/sbm/demands?module=SHOP', color: 'bg-orange-600' },
    ...(canCrud ? [{
      title: 'Generate Shop Tax Demands',
      description: 'Bulk generate shop tax demands only',
      icon: Zap,
      link: '/sbm/demands/generate/shop',
      color: 'bg-amber-600'
    }] : []),
    { title: 'Notices', description: 'View notices for shop module', icon: Bell, link: '/sbm/notices?module=SHOP', color: 'bg-rose-600' },
    { title: 'Payments', description: 'View shop payments', icon: CreditCard, link: '/sbm/payments?module=SHOP', color: 'bg-purple-600' }
  ];

  const fmt = (val) => parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 });
  const fmtCur = (val) => '₹' + parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  const shops = stats?.activeShops ?? 0;
  const demands = stats?.shopTaxDemands ?? 0;
  const revenue = stats?.shopTaxRevenue ?? 0;
  const outstanding = stats?.shopTaxOutstanding ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shop Tax Module</h1>
          <p className="text-gray-600">Manage shop tax monitoring (read-only by default)</p>
        </div>
      </div>

      {/* Summary Stats (same style as Super Admin module) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
        {loading || !stats ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-4 border-l-4 border-gray-200 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-3 w-20 bg-gray-200 rounded" />
                  <div className="h-6 w-16 bg-gray-200 rounded" />
                </div>
                <div className="h-5 w-5 bg-gray-200 rounded" />
              </div>
              <div className="h-3 w-24 bg-gray-200 rounded mt-2" />
            </div>
          ))
        ) : (
          <>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Shops</p>
                  <p className="text-xl font-bold text-gray-900">{fmt(shops)}</p>
                </div>
                <Store className="w-5 h-5 text-yellow-500" />
              </div>
              <p className="text-xs text-green-600 mt-1">active records</p>
            </div>

            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Demands</p>
                  <p className="text-xl font-bold text-gray-900">{fmt(demands)}</p>
                </div>
                <Receipt className="w-5 h-5 text-orange-500" />
              </div>
              <p className="text-xs text-gray-500 mt-1">shop tax demands</p>
            </div>

            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-emerald-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Revenue</p>
                  <p className="text-xl font-bold text-green-600">{fmtCur(revenue)}</p>
                </div>
                <DollarSign className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-xs text-gray-500 mt-1">collected</p>
            </div>

            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Outstanding</p>
                  <p className="text-xl font-bold text-red-600">{fmtCur(outstanding)}</p>
                </div>
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-xs text-gray-500 mt-1">pending</p>
            </div>
          </>
        )}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((m) => (
          <Link key={m.title} to={m.link} className="card hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg ${m.color} text-white`}>
                <m.icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{m.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{m.description}</p>
                <p className="text-sm text-primary-600 font-medium mt-3">Access Module →</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default SBMShopTaxModule;

