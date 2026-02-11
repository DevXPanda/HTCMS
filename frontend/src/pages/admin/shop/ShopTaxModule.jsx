import React from 'react';
import { Link } from 'react-router-dom';
import { Store, FileText, Receipt } from 'lucide-react';

const ShopTaxModule = () => {
  const modules = [
    {
      title: 'Shops',
      description: 'Register and manage shops',
      icon: Store,
      link: '/shop-tax/shops',
      color: 'bg-yellow-500'
    },
    {
      title: 'Shop Tax Assessments',
      description: 'Create, submit, and approve shop tax assessments',
      icon: FileText,
      link: '/shop-tax/assessments',
      color: 'bg-amber-500'
    },
    {
      title: 'Shop Demands',
      description: 'View and generate shop tax demands',
      icon: Receipt,
      link: '/demands?serviceType=SHOP_TAX',
      color: 'bg-orange-500'
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
          <Link to="/shop-tax/shops" className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">
            <Store className="h-4 w-4 mr-2" /> View Shops
          </Link>
          <Link to="/shop-tax/assessments/new" className="inline-flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
            <FileText className="h-4 w-4 mr-2" /> New Shop Assessment
          </Link>
          <Link to="/shop-tax/assessments" className="inline-flex items-center px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600">
            <FileText className="h-4 w-4 mr-2" /> View Assessments
          </Link>
          <Link to="/demands?serviceType=SHOP_TAX" className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
            <Receipt className="h-4 w-4 mr-2" /> Shop Demands
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ShopTaxModule;
