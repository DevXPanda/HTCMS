import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Droplet, Store, Truck, Zap, FileText, TrendingUp, AlertCircle } from 'lucide-react';
import api from '../../services/api';

const SBM_ULB_STORAGE_KEY = 'htcms_sbm_selected_ulb_id';

const SBMTaxManagement = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ulbId] = useState(() => {
    try { return sessionStorage.getItem(SBM_ULB_STORAGE_KEY) || ''; } catch { return ''; }
  });

  useEffect(() => {
    fetchStats();
  }, [ulbId]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const params = ulbId ? { ulb_id: ulbId } : {};
      const response = await api.get('/reports/dashboard', { params });
      if (response.data?.success !== false) {
        setStats(response.data?.data ?? response.data ?? {});
      }
    } catch (error) {
      setStats({});
    } finally {
      setLoading(false);
    }
  };

  const taxModules = [
    {
      name: 'Property Tax',
      description: 'Manage property assessments, demands, and payments',
      icon: Building2,
      link: '/sbm/property-tax',
      color: 'bg-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100',
      textColor: 'text-blue-700'
    },
    {
      name: 'Water Tax',
      description: 'Handle water connections, consumers, and billing',
      icon: Droplet,
      link: '/sbm/water-tax',
      color: 'bg-cyan-600',
      bgColor: 'bg-cyan-50',
      borderColor: 'border-cyan-100',
      textColor: 'text-cyan-700'
    },
    {
      name: 'Shop Tax',
      description: 'Generate and manage demands for shops',
      icon: Store,
      link: '/sbm/shop-tax',
      color: 'bg-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-100',
      textColor: 'text-yellow-700'
    },
    {
      name: 'D2DC',
      description: 'Door-to-door collection and field monitoring',
      icon: Truck,
      link: '/sbm/tax-management/d2dc',
      color: 'bg-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-100',
      textColor: 'text-purple-700'
    },
    {
      name: 'Unified Tax Demand',
      description: 'Generate Property, Water, Shop & D2DC demands in one go',
      icon: Zap,
      link: '/sbm/demands/unified',
      color: 'bg-gradient-to-r from-indigo-600 to-purple-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-100',
      textColor: 'text-indigo-700'
    }
  ];

  const fmt = (val) => parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 });
  const fmtCur = (val) => '₹' + parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="ds-page-title">Tax Management</h1>
          <p className="ds-page-subtitle">Select a tax module to proceed</p>
        </div>
      </div>

      {/* Summary Stats - same as admin */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
        {loading || !stats ? (
          Array.from({ length: 6 }).map((_, i) => (
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
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Properties</p>
                  <p className="text-xl font-bold text-gray-900">{fmt(stats.totalProperties)}</p>
                </div>
                <Building2 className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-xs text-gray-500 mt-1">{fmt(stats.totalAssessments)} assessments</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-cyan-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Water Connections</p>
                  <p className="text-xl font-bold text-gray-900">{fmt(stats.totalWaterConnections)}</p>
                </div>
                <Droplet className="w-5 h-5 text-cyan-500" />
              </div>
              <p className="text-xs text-cyan-600 mt-1">active connections</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Shops</p>
                  <p className="text-xl font-bold text-gray-900">{fmt(stats.activeShops)}</p>
                </div>
                <Store className="w-5 h-5 text-yellow-500" />
              </div>
              <p className="text-xs text-gray-500 mt-1">{fmt(stats.shopTaxDemands)} demands</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Total Revenue</p>
                  <p className="text-xl font-bold text-green-600">{fmtCur(stats.totalRevenue)}</p>
                </div>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-xs text-gray-500 mt-1">all tax modules</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Outstanding</p>
                  <p className="text-xl font-bold text-red-600">{fmtCur(stats.totalOutstanding)}</p>
                </div>
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-xs text-gray-500 mt-1">{fmt(stats.pendingDemands)} pending</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Total Demands</p>
                  <p className="text-xl font-bold text-gray-900">{fmt(stats.totalDemands)}</p>
                </div>
                <FileText className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-xs text-orange-600 mt-1">{fmt(stats.overdueDemands ?? 0)} overdue</p>
            </div>
          </>
        )}
      </div>

      {/* Modules Grid - same as admin, links to SBM read-only pages */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {taxModules.map((module, index) => (
          <Link
            key={index}
            to={module.link}
            className={`flex items-start p-6 rounded-xl border ${module.borderColor} bg-white shadow-sm hover:shadow-md transition-all group relative overflow-hidden`}
          >
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${module.bgColor} opacity-50 group-hover:scale-150 transition-transform duration-500 ease-out`} />
            <div className={`p-4 rounded-lg ${module.color} text-white shadow-sm mr-5 relative z-10`}>
              <module.icon className="h-8 w-8" />
            </div>
            <div className="flex-1 relative z-10">
              <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary-600 transition-colors mb-2">
                {module.name}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">{module.description}</p>
              <div className={`mt-4 inline-flex items-center text-sm font-medium ${module.textColor}`}>
                Access Module &rarr;
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default SBMTaxManagement;
