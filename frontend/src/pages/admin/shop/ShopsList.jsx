import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { shopsAPI } from '../../../services/api';
import { Store, ArrowLeft, Plus, Edit } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import Loading from '../../../components/Loading';

const ShopsList = () => {
  const navigate = useNavigate();
  const { isAdmin, isAssessor } = useAuth();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    shopsAPI.getAll({ limit: 100 })
      .then(res => {
        if (res.data.success) setShops(res.data.data.shops || []);
      })
      .catch(err => setError(err.response?.data?.message || 'Failed to load shops'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/shop-tax" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Shops</h1>
            <p className="text-gray-600">Register and manage shops for shop tax</p>
          </div>
        </div>
        {(isAdmin || isAssessor) && (
          <Link to="/shop-tax/shops/new" className="btn btn-primary flex items-center">
            <Plus className="w-4 h-4 mr-2" />
            New Shop
          </Link>
        )}
      </div>

      {error && <p className="text-red-600">{error}</p>}
      {!loading && !error && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shop #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ward</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {shops.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-4 text-gray-500 text-center">No shops found</td></tr>
              ) : (
                shops.map(shop => (
                  <tr key={shop.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/shop-tax/shops/${shop.id}`)}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{shop.shopNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{shop.shopName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{shop.shopType?.replace('_', ' ') || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{shop.ward?.wardName || shop.wardId}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded ${
                        shop.status === 'active' ? 'bg-green-100 text-green-800' : 
                        shop.status === 'closed' ? 'bg-gray-100 text-gray-800' : 
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {shop.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm" onClick={(e) => e.stopPropagation()}>
                      {(isAdmin || isAssessor) && (
                        <Link
                          to={`/shop-tax/shops/${shop.id}/edit`}
                          className="text-primary-600 hover:text-primary-800 flex items-center"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Link>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ShopsList;
