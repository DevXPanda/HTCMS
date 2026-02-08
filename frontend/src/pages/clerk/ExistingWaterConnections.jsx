import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { clerkAPI, propertyAPI } from '../../services/api';
import { useStaffAuth } from '../../contexts/StaffAuthContext';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import { Search, Eye } from 'lucide-react';

const ExistingWaterConnections = () => {
  const { user } = useStaffAuth();
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [selectedPropertyId, search]);

  const fetchProperties = async () => {
    try {
      // Fetch only properties from clerk's assigned ward
      const params = { limit: 1000, isActive: true };
      if (user?.ward_ids && user.ward_ids.length > 0) {
        params.wardId = user.ward_ids[0]; // Clerks are assigned exactly one ward
      }

      console.log('🏠 Clerk Water Connections - Fetching properties with params:', params);
      const response = await propertyAPI.getAll(params);
      const propertiesList = response.data.data.properties || [];
      console.log('🏠 Clerk Water Connections - Found properties:', propertiesList.length);
      setProperties(propertiesList);
      return propertiesList;
    } catch (error) {
      console.error('❌ Clerk Water Connections - Failed to fetch properties:', error);
      return [];
    }
  };

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const params = {
        search,
        limit: 1000,
        propertyId: selectedPropertyId || undefined
      };

      if (user?.ward_ids && user.ward_ids.length > 0 && !selectedPropertyId) {
        params.wardId = user.ward_ids[0];
      }

      const response = await clerkAPI.waterConnections.getAll(params);
      const connectionsData = response.data.data.connections || [];
      setConnections(connectionsData);
    } catch (error) {
      console.error('Error fetching water connections:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch water connections');
    } finally {
      setLoading(false);
    }
  };

  const handlePropertyChange = (e) => {
    setSelectedPropertyId(e.target.value);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchConnections();
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'ACTIVE': 'badge-success',
      'DRAFT': 'badge-warning',
      'DISCONNECTED': 'badge-danger'
    };
    return statusClasses[status] || 'badge-info';
  };

  if (loading && !connections.length) return <Loading />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Existing Water Connections</h1>
          <p className="text-gray-600 mt-1">
            View activated water connections in your assigned ward
            {user?.ward_ids && user.ward_ids.length > 0 && ` (Ward ID: ${user.ward_ids[0]})`}
          </p>
        </div>
      </div>

      {/* Property Selector and Search */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Property Selector */}
          <div>
            <label className="label">Select Property</label>
            <select
              value={selectedPropertyId}
              onChange={handlePropertyChange}
              className="input"
            >
              <option value="">All Properties</option>
              {properties.map(property => (
                <option key={property.id} value={property.id}>
                  {property.propertyNumber} - {property.address}
                  {property.ward?.wardName ? ` (${property.ward.wardName})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by connection number or meter number..."
                className="input pl-10"
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Connections Table */}
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Connection Number</th>
              <th>Property</th>
              <th>Connection Type</th>
              <th>Metered / Non-metered</th>
              <th>Meter Number</th>
              <th>Status</th>
              <th>Connection Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {connections.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-8 text-gray-500">
                  {selectedPropertyId
                    ? 'No water connections found for this property'
                    : 'No water connections found in your assigned ward'}
                </td>
              </tr>
            ) : (
              connections.map((connection) => (
                <tr key={connection.id}>
                  <td className="font-medium">{connection.connectionNumber}</td>
                  <td>
                    <div className="max-w-xs">
                      <div className="font-medium">{connection.property?.propertyNumber}</div>
                      <div className="text-sm text-gray-500 truncate">
                        {connection.property?.address}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-info capitalize">
                      {connection.connectionType}
                    </span>
                  </td>
                  <td>
                    {connection.isMetered ? (
                      <span className="badge badge-success">Metered</span>
                    ) : (
                      <span className="badge badge-secondary">Non-metered</span>
                    )}
                  </td>
                  <td>{connection.meterNumber || '-'}</td>
                  <td>
                    <span className={`badge ${getStatusBadge(connection.status)}`}>
                      {connection.status}
                    </span>
                  </td>
                  <td>
                    {connection.connectionDate
                      ? new Date(connection.connectionDate).toLocaleDateString()
                      : '-'
                    }
                  </td>
                  <td>
                    <Link
                      to={`/clerk/existing-water-connections/${connection.id}`}
                      className="text-primary-600 hover:text-primary-700 flex items-center"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
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

export default ExistingWaterConnections;
