import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Droplet, Receipt, Bell, CreditCard, TrendingUp, AlertCircle, Zap } from 'lucide-react';
import api from '../../services/api';
import { useStaffAuth } from '../../contexts/StaffAuthContext';
import { formatCurrencyCr } from '../../utils/numberFormatters';

const SBMWaterTaxModule = () => {
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
    { title: 'Demands', description: 'View water tax demands', icon: Receipt, link: '/sbm/demands?module=WATER', color: 'bg-cyan-600' },
    ...(canCrud ? [{
      title: 'Generate Water Tax Demands',
      description: 'Bulk generate water tax demands only',
      icon: Zap,
      link: '/sbm/demands/generate/water',
      color: 'bg-blue-600'
    }] : []),
    { title: 'Notices', description: 'View notices for water module', icon: Bell, link: '/sbm/notices?module=WATER', color: 'bg-rose-600' },
    { title: 'Payments', description: 'View water payments', icon: CreditCard, link: '/sbm/payments?module=WATER', color: 'bg-purple-600' }
  ];

  const fmt = (val) => parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 });

  const connections = stats?.totalWaterConnections ?? stats?.waterConnections ?? 0;
  const collectionRateDen = parseFloat(stats?.totalWaterRevenue || 0) + parseFloat(stats?.waterOutstanding || 0);
  const collectionRate = collectionRateDen > 0 ? ((parseFloat(stats?.totalWaterRevenue || 0) / collectionRateDen) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Water Tax Module</h1>
          <p className="text-gray-600">Manage water tax monitoring (read-only by default)</p>
        </div>
      </div>

      {/* Summary Stats (same style as Super Admin module) */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {loading || !stats ? (
          Array.from({ length: 4 }).map((_, i) => (
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
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-cyan-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Connections</p>
                  <p className="text-xl font-bold text-gray-900">{fmt(connections)}</p>
                </div>
                <Droplet className="w-5 h-5 text-cyan-500" />
              </div>
              <p className="text-xs text-cyan-600 mt-1">active connections</p>
            </div>

            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Revenue</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrencyCr(stats.totalWaterRevenue)}</p>
                </div>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-xs text-gray-500 mt-1">total collected</p>
            </div>

            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Outstanding</p>
                  <p className="text-xl font-bold text-red-600">{formatCurrencyCr(stats.waterOutstanding)}</p>
                </div>
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-xs text-gray-500 mt-1">unpaid bills</p>
            </div>

            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Collection Rate</p>
                  <p className="text-xl font-bold text-purple-600">{collectionRate}%</p>
                </div>
                <CreditCard className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-xs text-gray-500 mt-1">revenue vs outstanding</p>
            </div>
          </>
        )}
      </div>

      {/* Cards (same workflow as Super Admin; SBM is read-only unless Full CRUD enabled) */}
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

export default SBMWaterTaxModule;

