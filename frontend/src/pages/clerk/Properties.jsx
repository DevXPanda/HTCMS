import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { propertyAPI } from '../../services/api';
import { useStaffAuth } from '../../contexts/StaffAuthContext';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import { Search, Eye, Filter, X, Home } from 'lucide-react';

const Properties = () => {
  const { user } = useStaffAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    propertyType: '',
    usageType: '',
    status: '',
    constructionType: ''
  });

  useEffect(() => {
    fetchProperties();
  }, [search, filters]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const params = {
        search,
        limit: 1000, // Fetch all data at once
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      };
      
      // Add ward filter for clerk - only show properties from clerk's assigned ward
      if (user?.ward_ids && user.ward_ids.length > 0) {
        params.wardId = user.ward_ids[0]; // Clerks are assigned exactly one ward
      }
      
      const response = await propertyAPI.getAll(params);
      setProperties(response.data.data.properties || []);
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

  if (loading && !properties.length) return <Loading />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Properties</h1>
          <p className="text-gray-600 mt-1">
            Viewing properties from your assigned ward
            {user?.ward_ids && user.ward_ids.length > 0 && ` (Ward ID: ${user.ward_ids[0]})`}
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="btn btn-secondary flex items-center"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </button>
      </div>

      {/* Read-only badge */}
      <div className="mb-6">
        <span className="badge badge-warning">
          <Eye className="w-4 h-4 mr-1" />
          Read-only access (Clerk)
        </span>
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
              placeholder="Search by property number, address, owner name, or city..."
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Property Number</th>
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
                  No properties found in your assigned ward
                </td>
              </tr>
            ) : (
              properties.map((property) => (
                <tr key={property.id}>
                  <td className="font-medium">{property.propertyNumber}</td>
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
                    <span className={`badge ${
                      property.status === 'active' ? 'badge-success' :
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
                        to={`/clerk/properties/${property.id}`}
                        className="text-primary-600 hover:text-primary-700 flex items-center"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default Properties;
