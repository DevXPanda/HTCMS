import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Store, FileText, Receipt, FileCheck, TrendingUp, DollarSign, AlertCircle } from 'lucide-react';
import { useShopTaxBasePath } from '../../../contexts/ShopTaxBasePathContext';
import api from '../../../services/api';

const ShopTaxModule = () => {
  const basePath = useShopTaxBasePath();
  const demandsLink = basePath ? `${basePath}/demands?serviceType=SHOP_TAX` : '/demands?serviceType=SHOP_TAX';
  const registrationRequestsLink = basePath ? `${basePath}/shop-registration-requests` : '/shop-tax/registration-requests';
  const [stats, setStats] = useState({
    activeShops: 0,
    shopTaxDemands: 0,
    shopTaxRevenue: 0,
    shopTaxOutstanding: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShopTaxStats();
  }, []);

  const fetchShopTaxStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/reports/dashboard');
      const data = response.data.data;
      setStats({
        activeShops: data.activeShops || 0,
        shopTaxDemands: data.shopTaxDemands || 0,
        shopTaxRevenue: data.shopTaxRevenue || 0,
        shopTaxOutstanding: data.shopTaxOutstanding || 0
      });
    } catch (error) {
      console.error('Failed to fetch shop tax statistics:', error);
    } finally {
      setLoading(false);
    }
  };
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
      description: 'View and generate shop tax demands',
      icon: Receipt,
      link: demandsLink,
      color: 'bg-orange-500'
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

      {/* Statistics Cards */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active Shops</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeShops.toLocaleString()}</p>
              </div>
              <Store className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-amber-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Demands</p>
                <p className="text-2xl font-bold text-gray-900">{stats.shopTaxDemands.toLocaleString()}</p>
              </div>
              <FileText className="w-8 h-8 text-amber-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">₹{stats.shopTaxRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Outstanding</p>
                <p className="text-2xl font-bold text-gray-900">₹{stats.shopTaxOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>
      )}

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
