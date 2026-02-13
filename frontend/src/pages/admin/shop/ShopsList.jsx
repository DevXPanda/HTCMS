import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { shopsAPI, wardAPI } from '../../../services/api';
import { Store, ArrowLeft, Plus, Edit, Search, Filter, X, Download } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useShopTaxBasePath } from '../../../contexts/ShopTaxBasePathContext';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { exportToCSV } from '../../../utils/exportCSV';

const ShopsList = () => {
  const navigate = useNavigate();
  const basePath = useShopTaxBasePath();
  const { isAdmin, isAssessor } = useAuth();
  const [shops, setShops] = useState([]);
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    wardId: '',
    shopType: ''
  });

  useEffect(() => {
    fetchWards();
  }, []);

  useEffect(() => {
    fetchShops();
  }, [page, search, filters]);

  const fetchWards = async () => {
    try {
      const response = await wardAPI.getAll({ isActive: true });
      setWards(response.data.data.wards || []);
    } catch (error) {
      console.error('Failed to fetch wards:', error);
    }
  };

  const fetchShops = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 10,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== '')),
        ...(search ? { search } : {})
      };
      const response = await shopsAPI.getAll(params);
      if (response.data.success) {
        setShops(response.data.data.shops || []);
        setPagination(response.data.data.pagination || null);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load shops');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ status: '', wardId: '', shopType: '' });
    setSearch('');
    setPage(1);
  };

  const handleExport = async () => {
    try {
      const params = { page: 1, limit: 5000, ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== '')), ...(search ? { search } : {}) };
      const response = await shopsAPI.getAll(params);
      const list = response.data.data.shops || [];
      const rows = list.map(s => ({
        shopNumber: s.shopNumber,
        shopName: s.shopName,
        shopType: s.shopType,
        ward: s.ward?.wardName,
        status: s.status
      }));
      exportToCSV(rows, `shops_${new Date().toISOString().slice(0, 10)}`);
      toast.success('Export downloaded');
    } catch (err) {
      toast.error('Export failed');
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`${basePath}/shop-tax`} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Shops</h1>
            <p className="text-gray-600">Register and manage shops for shop tax</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={handleExport} className="btn btn-secondary flex items-center">
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          {(isAdmin || isAssessor || basePath === '/clerk') && (
            <Link to={`${basePath}/shop-tax/shops/new`} className="btn btn-primary flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              New Shop
            </Link>
          )}
        </div>
      </div>

      {/* Search */}
      <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchShops(); }} className="mb-6">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by shop number, name, or contact..."
              className="input pl-10"
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Search
          </button>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary flex items-center"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>
        </div>
      </form>

      {/* Filters */}
      {showFilters && (
        <div className="card mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Filters</h3>
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
            >
              <X className="w-4 h-4 mr-1" />
              Clear All
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="input"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div>
              <label className="label">Ward</label>
              <select
                value={filters.wardId}
                onChange={(e) => handleFilterChange('wardId', e.target.value)}
                className="input"
              >
                <option value="">All Wards</option>
                {wards.map(ward => (
                  <option key={ward.id} value={ward.id}>
                    {ward.wardName} ({ward.wardNumber})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Shop Type</label>
              <select
                value={filters.shopType}
                onChange={(e) => handleFilterChange('shopType', e.target.value)}
                className="input"
              >
                <option value="">All Types</option>
                <option value="retail">Retail</option>
                <option value="wholesale">Wholesale</option>
                <option value="food_stall">Food Stall</option>
                <option value="service">Service</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>
      )}

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
                  <tr key={shop.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`${basePath}/shop-tax/shops/${shop.id}`)}>
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
                      {(isAdmin || isAssessor || basePath === '/clerk') && (
                        <Link
                          to={`${basePath}/shop-tax/shops/${shop.id}/edit`}
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

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-6">
          <button
            type="button"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="btn btn-secondary"
          >
            Previous
          </button>
          <span className="text-gray-600">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            type="button"
            onClick={() => setPage(page + 1)}
            disabled={page === pagination.pages}
            className="btn btn-secondary"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default ShopsList;
