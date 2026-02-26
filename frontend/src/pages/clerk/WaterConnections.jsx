import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { clerkAPI, propertyAPI } from '../../services/api';
import { useStaffAuth } from '../../contexts/StaffAuthContext';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import { Plus, Search, Eye } from 'lucide-react';
import AddWaterConnectionModal from './AddWaterConnectionModal';

const WaterConnections = () => {
  const { user } = useStaffAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

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
        limit: 1000
      };

      console.log('🔍 Clerk Water Connection Requests - Fetching with params:', params);
      const response = await clerkAPI.waterConnectionRequests.getAll(params);
      console.log('📊 Clerk Water Connection Requests - Response:', response.data);
      const requestsData = response.data.data.requests || [];
      console.log('💧 Clerk Water Connection Requests - Found requests:', requestsData.length);
      setRequests(requestsData);
    } catch (error) {
      console.error('❌ Clerk Water Connection Requests - Error:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch water connection requests');
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

  const handleAddSuccess = () => {
    setShowAddModal(false);
    fetchConnections();
    fetchProperties();
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'DRAFT': 'badge-secondary',
      'SUBMITTED': 'badge-info',
      'UNDER_INSPECTION': 'badge-warning',
      'APPROVED': 'badge-success',
      'REJECTED': 'badge-danger',
      'RETURNED': 'badge-warning',
      'ESCALATED_TO_OFFICER': 'badge-warning',
      'COMPLETED': 'badge-success'
    };
    return statusClasses[status] || 'badge-info';
  };

  if (loading && !requests.length) return <Loading />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="ds-page-title">Water Connection Requests</h1>
          <p className="text-gray-600 mt-1">
            Managing water connection requests in your assigned ward
            {user?.ward_ids && user.ward_ids.length > 0 && ` (Ward ID: ${user.ward_ids[0]})`}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Submit New Request
        </button>
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
              <th>Request Number</th>
              <th>Property</th>
              <th>Connection Type</th>
              <th>Property Location</th>
              <th>Status</th>
              <th>Submitted Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-8 text-gray-500">
                  {selectedPropertyId
                    ? 'No water connection requests found for this property'
                    : 'No water connection requests found'}
                </td>
              </tr>
            ) : (
              requests.map((request) => (
                <tr key={request.id}>
                  <td className="font-medium">{request.requestNumber}</td>
                  <td>
                    <div className="max-w-xs">
                      <div className="font-medium">{request.property?.propertyNumber}</div>
                      <div className="text-sm text-gray-500 truncate">
                        {request.property?.address}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-info capitalize">
                      {request.connectionType}
                    </span>
                  </td>
                  <td>
                    <div className="max-w-xs text-sm text-gray-600 truncate">
                      {request.propertyLocation || '-'}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadge(request.status)}`}>
                      {request.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>
                    {request.submittedAt
                      ? new Date(request.submittedAt).toLocaleDateString()
                      : request.createdAt
                        ? new Date(request.createdAt).toLocaleDateString()
                        : '-'
                    }
                  </td>
                  <td>
                    <Link
                      to={`/clerk/water-connection-requests/${request.id}`}
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


      {/* Add Water Connection Modal */}
      {showAddModal && (
        <AddWaterConnectionModal
          properties={properties}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddSuccess}
          onPropertiesUpdate={fetchProperties}
        />
      )}
    </div>
  );
};

export default WaterConnections;
