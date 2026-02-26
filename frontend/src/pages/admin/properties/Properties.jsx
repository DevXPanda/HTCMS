import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { propertyAPI, wardAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { Plus, Search, Eye, Edit, Filter, X, Download } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { exportToCSV } from '../../../utils/exportCSV';

const Properties = () => {
  const { isAdmin, isAssessor } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    wardId: '',
    propertyType: '',
    usageType: '',
    status: '',
    constructionType: ''
  });
  const [wards, setWards] = useState([]);

  useEffect(() => {
    fetchWards();
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [search, filters]);

  const fetchWards = async () => {
    try {
      const response = await wardAPI.getAll();
      setWards(response.data.data.wards);
    } catch (error) {
      console.error('Failed to fetch wards');
    }
  };

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const params = {
        search,
        limit: 10000,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      };
      const response = await propertyAPI.getAll(params);
      setProperties(response.data.data.properties);
    } catch (error) {
      toast.error('Failed to fetch properties');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      wardId: '',
      propertyType: '',
      usageType: '',
      status: '',
      constructionType: ''
    });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProperties();
  };

  const handleExport = async () => {
    try {
      const params = {
        page: 1,
        limit: 5000,
        search,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      };
      const response = await propertyAPI.getAll(params);
      const list = response.data.data.properties || [];
      const rows = list.map(p => ({
        propertyId: p.uniqueCode || p.propertyNumber,
        address: p.address,
        ward: p.ward?.wardName,
        propertyType: p.propertyType,
        usageType: p.usageType,
        area: p.area,
        constructionType: p.constructionType,
        status: p.status
      }));
      exportToCSV(rows, `properties_${new Date().toISOString().slice(0, 10)}`);
      toast.success('Export downloaded');
    } catch (err) {
      toast.error('Export failed');
    }
  };

  if (loading && !properties.length) return <Loading />;

  return (
    <div>
      <div className="ds-page-header">
        <h1 className="ds-page-title">Properties</h1>
        <div className="flex flex-wrap gap-2">
          {(isAdmin || isAssessor) && (
            <Link to="/properties/new" className="btn btn-primary flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              Add Property
            </Link>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary flex items-center"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="btn btn-secondary flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Property ID, address, owner name, or city..."
              className="input pl-10"
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </div>
      </form>

      {/* Filters */}
      {showFilters && (
        <div className="card mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Filters</h3>
            <button
              onClick={clearFilters}
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
            >
              <X className="w-4 h-4 mr-1" />
              Clear All
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                    {ward.wardNumber} - {ward.wardName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Property Type</label>
              <select
                value={filters.propertyType}
                onChange={(e) => handleFilterChange('propertyType', e.target.value)}
                className="input"
              >
                <option value="">All Types</option>
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="industrial">Industrial</option>
                <option value="agricultural">Agricultural</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>

            <div>
              <label className="label">Usage Type</label>
              <select
                value={filters.usageType}
                onChange={(e) => handleFilterChange('usageType', e.target.value)}
                className="input"
              >
                <option value="">All Usage</option>
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="industrial">Industrial</option>
                <option value="agricultural">Agricultural</option>
                <option value="mixed">Mixed</option>
                <option value="institutional">Institutional</option>
              </select>
            </div>

            <div>
              <label className="label">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="input"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
                <option value="disputed">Disputed</option>
              </select>
            </div>

            <div>
              <label className="label">Construction</label>
              <select
                value={filters.constructionType}
                onChange={(e) => handleFilterChange('constructionType', e.target.value)}
                className="input"
              >
                <option value="">All</option>
                <option value="RCC">RCC</option>
                <option value="Pucca">Pucca</option>
                <option value="Semi-Pucca">Semi-Pucca</option>
                <option value="Kutcha">Kutcha</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Properties Table */}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Property ID</th>
              <th>Address</th>
              <th>Ward</th>
              <th>Type</th>
              <th>Owner</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {properties.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-8 text-gray-500">
                  No properties found
                </td>
              </tr>
            ) : (
              properties.map((property) => (
                <tr key={property.id}>
                  <td className="font-medium">{property.uniqueCode || property.propertyNumber}</td>
                  <td className="max-w-xs truncate">{property.address}</td>
                  <td>{property.ward?.wardName || 'N/A'}</td>
                  <td>
                    <span className="badge badge-info capitalize">
                      {property.propertyType}
                    </span>
                  </td>
                  <td>
                    {property.ownerName || `${property.owner?.firstName} ${property.owner?.lastName}`}
                  </td>
                  <td>
                    <span className={`badge ${property.status === 'active' ? 'badge-success' :
                      property.status === 'pending' ? 'badge-warning' :
                        property.status === 'disputed' ? 'badge-danger' :
                          'badge-info'
                      } capitalize`}>
                      {property.status || 'active'}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/properties/${property.id}`}
                        className="text-primary-600 hover:text-primary-700 flex items-center"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      {(isAdmin || isAssessor) && (
                        <Link
                          to={`/properties/${property.id}/edit`}
                          className="text-green-600 hover:text-green-700 flex items-center"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination removed */}
    </div>
  );
};

export default Properties;
