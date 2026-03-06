import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Store, FileText, Receipt, FileCheck, TrendingUp, DollarSign, AlertCircle, Zap } from 'lucide-react';
import { useShopTaxBasePath } from '../../../contexts/ShopTaxBasePathContext';
import { useSelectedUlb } from '../../../contexts/SelectedUlbContext';
import api from '../../../services/api';

const ShopTaxModule = () => {
  const basePath = useShopTaxBasePath();
  const { effectiveUlbId } = useSelectedUlb();
  const demandsLink = basePath ? `${basePath}/demands?module=SHOP` : '/demands?module=SHOP';
  const generateShopDemandsLink = basePath ? `${basePath}/demands/generate/shop` : '/demands/generate/shop';
  const registrationRequestsLink = basePath ? `${basePath}/shop-registration-requests` : '/shop-tax/registration-requests';
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShopTaxStats();
  }, [effectiveUlbId]);

  const fetchShopTaxStats = async () => {
    try {
      setLoading(true);
      const params = effectiveUlbId ? { ulb_id: effectiveUlbId } : {};
      const response = await api.get('/reports/dashboard', { params });
      if (response.data && response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch shop tax statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (val) => parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 });
  const fmtCur = (val) => '₹' + parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  const modules = [
    {
      title: 'Shops',
      description: 'Register and manage shops',
      icon: Store,
      link: `${basePath}/shop-tax/shops`,
      color: 'bg-yellow-500'
    },
    {
      title: 'Shop Tax Assessments',
      description: 'Create, submit, and approve shop tax assessments',
      icon: FileText,
      link: `${basePath}/shop-tax/assessments`,
      color: 'bg-amber-500'
    },
    {
      title: 'Shop Demands',
      description: 'View and manage shop tax demands',
      icon: Receipt,
      link: demandsLink,
      color: 'bg-orange-500'
    },
    {
      title: 'Generate Shop Tax Demands',
      description: 'Bulk generate shop tax demands only',
      icon: Zap,
      link: generateShopDemandsLink,
      color: 'bg-amber-600'
    },
    {
      title: 'Registration Requests',
      description: 'Review and approve citizen shop registration requests',
      icon: FileCheck,
      link: registrationRequestsLink,
      color: 'bg-teal-500'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shop Tax Module</h1>
          <p className="text-gray-600">Manage shops, assessments, and demands for shop tax</p>
        </div>
      </div>

      {/* Summary Stats - same layout as Property Tax Module */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
        {loading || !stats ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-4 border-l-4 border-gray-200 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-3 w-20 bg-gray-200 rounded"></div>
                  <div className="h-6 w-16 bg-gray-200 rounded"></div>
                </div>
                <div className="h-5 w-5 bg-gray-200 rounded"></div>
              </div>
              <div className="h-3 w-24 bg-gray-200 rounded mt-2"></div>
            </div>
          ))
        ) : (
          <>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Shops</p>
                  <p className="text-xl font-bold text-gray-900">{fmt(stats.activeShops)}</p>
                </div>
                <Store className="w-5 h-5 text-yellow-500" />
              </div>
              <p className="text-xs text-green-600 mt-1">active records</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-amber-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Assessments</p>
                  <p className="text-xl font-bold text-gray-900">{fmt(stats.totalShopAssessments)}</p>
                </div>
                <FileText className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-xs text-green-600 mt-1">{fmt(stats.approvedShopAssessments)} approved</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">ST Demands</p>
                  <p className="text-xl font-bold text-gray-900">{fmt(stats.shopTaxDemands)}</p>
                </div>
                <Receipt className="w-5 h-5 text-orange-500" />
              </div>
              <p className="text-xs text-gray-500 mt-1">shop tax demands</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-emerald-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">ST Revenue</p>
                  <p className="text-xl font-bold text-green-600">{fmtCur(stats.shopTaxRevenue)}</p>
                </div>
                <DollarSign className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-xs text-gray-500 mt-1">collected</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Outstanding</p>
                  <p className="text-xl font-bold text-red-600">{fmtCur(stats.shopTaxOutstanding)}</p>
                </div>
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-xs text-gray-500 mt-1">pending collection</p>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module, index) => (
          <Link
            key={index}
            to={module.link}
            className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
          >
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-full ${module.color} text-white`}>
                <module.icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{module.title}</h3>
                <p className="text-sm text-gray-500">{module.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Link to={`${basePath}/shop-tax/shops`} className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">
            <Store className="h-4 w-4 mr-2" /> View Shops
          </Link>
          <Link to={`${basePath}/shop-tax/assessments/new`} className="inline-flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
            <FileText className="h-4 w-4 mr-2" /> New Shop Assessment
          </Link>
          <Link to={`${basePath}/shop-tax/assessments`} className="inline-flex items-center px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600">
            <FileText className="h-4 w-4 mr-2" /> View Assessments
          </Link>
          <Link to={demandsLink} className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
            <Receipt className="h-4 w-4 mr-2" /> Shop Demands
          </Link>
          <Link to={registrationRequestsLink} className="inline-flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700">
            <FileCheck className="h-4 w-4 mr-2" /> Registration Requests
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ShopTaxModule;
