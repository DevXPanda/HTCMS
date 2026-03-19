import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Home, FileText, Receipt, Bell, CreditCard, Zap, TrendingUp, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { useStaffAuth } from '../../contexts/StaffAuthContext';

const SBMPropertyTaxModule = () => {
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
    { title: 'Properties', description: 'Manage property records and details', icon: Home, link: '/sbm/properties', color: 'bg-blue-500' },
    { title: 'Assessments', description: 'View and manage property tax assessments', icon: FileText, link: '/sbm/assessments', color: 'bg-green-500' },
    { title: 'Demands', description: 'Track tax demands and collections', icon: Receipt, link: '/sbm/demands?module=PROPERTY', color: 'bg-yellow-500' },
    ...(canCrud ? [{
      title: 'Generate Property Tax Demands',
      description: 'Bulk generate property (house) tax demands only',
      icon: Zap,
      link: '/sbm/demands/generate/property',
      color: 'bg-indigo-500'
    }] : []),
    { title: 'Notices', description: 'Issue and manage legal notices', icon: Bell, link: '/sbm/notices?module=PROPERTY', color: 'bg-red-500' },
    { title: 'Payments', description: 'Record and track tax payments', icon: CreditCard, link: '/sbm/payments?module=PROPERTY', color: 'bg-purple-500' }
  ];

  const fmt = (val) => parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 });
  const fmtCur = (val) => '₹' + parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Property Tax Module</h1>
          <p className="text-gray-600">Manage all property tax related activities</p>
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
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Properties</p>
                  <p className="text-xl font-bold text-gray-900">{fmt(stats.totalProperties)}</p>
                </div>
                <Home className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-xs text-green-600 mt-1">active records</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Assessments</p>
                  <p className="text-xl font-bold text-gray-900">{fmt(stats.totalAssessments)}</p>
                </div>
                <FileText className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-xs text-green-600 mt-1">{fmt(stats.approvedAssessments)} approved</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Demands</p>
                  <p className="text-xl font-bold text-gray-900">{fmt(stats.totalDemands)}</p>
                </div>
                <Receipt className="w-5 h-5 text-yellow-500" />
              </div>
              <p className="text-xs text-orange-600 mt-1">{fmt(stats.overdueDemands ?? 0)} overdue</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Revenue</p>
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

export default SBMPropertyTaxModule;

