import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { waterConnectionAPI, propertyAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { Plus, Search, Eye, X, Download } from 'lucide-react';
import AddWaterConnectionModal from './AddWaterConnectionModal';
import { exportToCSV } from '../../../utils/exportCSV';

const WaterConnections = () => {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [selectedPropertyId, search, page]);

  const fetchProperties = async () => {
    try {
      const response = await propertyAPI.getAll({ limit: 1000, isActive: true });
      const propertiesList = response.data.data.properties || [];
      setProperties(propertiesList);
      return propertiesList; // Return for use in modal
    } catch (error) {
      console.error('Failed to fetch properties');
      return [];
    }
  };

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 10,
        search
      };
      
      if (selectedPropertyId) {
        params.propertyId = selectedPropertyId;
      }

      const response = await waterConnectionAPI.getAll(params);
      setConnections(response.data.data.waterConnections || []);
      setPagination(response.data.data.pagination);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch water connections');
    } finally {
      setLoading(false);
    }
  };

  const handlePropertyChange = (e) => {
    setSelectedPropertyId(e.target.value);
    setPage(1);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchConnections();
  };

  const handleAddSuccess = () => {
    setShowAddModal(false);
    fetchConnections();
    fetchProperties(); // Refresh properties list
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'ACTIVE': 'badge-success',
      'DRAFT': 'badge-warning',
      'DISCONNECTED': 'badge-danger'
    };
    return statusClasses[status] || 'badge-info';
  };

  const handleExport = async () => {
    try {
      const params = { page: 1, limit: 5000, search };
      if (selectedPropertyId) params.propertyId = selectedPropertyId;
      const response = await waterConnectionAPI.getAll(params);
      const list = response.data.data.waterConnections || [];
      const rows = list.map(c => ({
        connectionNumber: c.connectionNumber,
        propertyNumber: c.property?.propertyNumber,
        connectionType: c.connectionType,
        status: c.status
      }));
      exportToCSV(rows, `water_connections_${new Date().toISOString().slice(0, 10)}`);
      toast.success('Export downloaded');
    } catch (err) {
      toast.error('Export failed');
    }
  };

  if (loading && !connections.length) return <Loading />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Water Connections</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="btn btn-secondary flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Water Connection
          </button>
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
                    : 'No water connections found'}
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
                      to={`/water/connections/${connection.id}`}
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

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex justify-center items-center space-x-2 mt-6">
          <button
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
            onClick={() => setPage(page + 1)}
            disabled={page === pagination.pages}
            className="btn btn-secondary"
          >
            Next
          </button>
        </div>
      )}

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
