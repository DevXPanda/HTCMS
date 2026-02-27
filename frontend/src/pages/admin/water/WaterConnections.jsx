import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { waterConnectionAPI, propertyAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { Plus, Search, Eye, X, Download } from 'lucide-react';
import AddWaterConnectionModal from './AddWaterConnectionModal';
import { exportToCSV } from '../../../utils/exportCSV';

const SEARCH_DEBOUNCE_MS = 300;

const WaterConnections = () => {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [propertySearchQuery, setPropertySearchQuery] = useState('');
  const [propertySearchResults, setPropertySearchResults] = useState([]);
  const [propertySearching, setPropertySearching] = useState(false);
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const searchProperties = useCallback(async (query) => {
    const q = String(query).trim();
    if (!q) {
      setPropertySearchResults([]);
      return;
    }
    try {
      setPropertySearching(true);
      const response = await propertyAPI.getAll({ search: q, limit: 20, status: 'active' });
      setPropertySearchResults(response.data?.data?.properties ?? []);
    } catch {
      setPropertySearchResults([]);
    } finally {
      setPropertySearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (selectedProperty) return;
      searchProperties(propertySearchQuery);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [propertySearchQuery, selectedProperty, searchProperties]);

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [selectedPropertyId, search]);

  const fetchProperties = async () => {
    try {
      const response = await propertyAPI.getAll({ limit: 1000, status: 'active' });
      const propertiesList = response.data?.data?.properties || [];
      setProperties(propertiesList);
      return propertiesList;
    } catch (error) {
      console.error('Failed to fetch properties');
      return [];
    }
  };

  const fetchConnections = async () => {
    try {
      setLoading(true);
      const params = {
        limit: 10000,
        search
      };

      if (selectedPropertyId) {
        params.propertyId = selectedPropertyId;
      }

      const response = await waterConnectionAPI.getAll(params);
      setConnections(response.data.data.waterConnections || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch water connections');
    } finally {
      setLoading(false);
    }
  };

  const onSelectPropertyFilter = (property) => {
    setSelectedProperty(property);
    setSelectedPropertyId(String(property.id));
    setPropertySearchQuery('');
    setPropertySearchResults([]);
    setShowPropertyDropdown(false);
  };

  const clearPropertyFilter = () => {
    setSelectedProperty(null);
    setSelectedPropertyId('');
    setPropertySearchQuery('');
    setPropertySearchResults([]);
    setShowPropertyDropdown(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
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
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h1 className="ds-page-title">Water Connections</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Water Connection
          </button>
        </div>
      </div>

      {/* Property Selector and Search */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div className="relative">
            <label className="label">Select Property</label>
            {selectedProperty ? (
              <div className="flex items-center gap-2">
                <div className="input flex-1 bg-gray-50">
                  ID: {selectedProperty.id} · {selectedProperty.propertyNumber}
                  {selectedProperty.address ? ` – ${selectedProperty.address}` : ''}
                  {selectedProperty.ward?.wardName ? ` (${selectedProperty.ward.wardName})` : ''}
                </div>
                <button
                  type="button"
                  onClick={clearPropertyFilter}
                  className="btn btn-secondary shrink-0"
                >
                  Clear
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={propertySearchQuery}
                    onChange={(e) => {
                      setPropertySearchQuery(e.target.value);
                      setShowPropertyDropdown(true);
                    }}
                    onFocus={() => setShowPropertyDropdown(true)}
                    onBlur={() => setTimeout(() => setShowPropertyDropdown(false), 200)}
                    className="input w-full pl-10"
                    placeholder="Search by Property ID or number (empty = all)"
                  />
                  {propertySearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-600 border-t-transparent" />
                    </div>
                  )}
                </div>
                {showPropertyDropdown && (propertySearchResults.length > 0 || propertySearchQuery.trim()) && (
                  <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {propertySearchResults.length === 0 ? (
                      <li className="px-4 py-3 text-gray-500 text-sm">No properties found</li>
                    ) : (
                      propertySearchResults.map((property) => (
                        <li
                          key={property.id}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-0"
                          onMouseDown={(e) => { e.preventDefault(); onSelectPropertyFilter(property); }}
                        >
                          <span className="font-medium">ID: {property.id}</span>
                          <span className="text-gray-600"> · {property.propertyNumber}</span>
                          {property.address && <span className="text-gray-500"> – {property.address}</span>}
                          {property.ward?.wardName && <span className="text-gray-400"> ({property.ward.wardName})</span>}
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </>
            )}
          </div>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 min-w-0 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by connection or meter number..."
                className="input w-full pl-10"
              />
            </div>
            <button type="submit" className="btn btn-primary shrink-0">
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Connections Table */}
      <div className="card overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th className="whitespace-nowrap">Connection Number</th>
              <th className="whitespace-nowrap">Property</th>
              <th className="whitespace-nowrap">Connection Type</th>
              <th className="whitespace-nowrap">Metered</th>
              <th className="whitespace-nowrap">Meter Number</th>
              <th className="whitespace-nowrap">Status</th>
              <th className="whitespace-nowrap">Connection Date</th>
              <th className="whitespace-nowrap text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {connections.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-12 text-gray-500">
                  {selectedPropertyId
                    ? 'No water connections found for this property'
                    : 'No water connections found'}
                </td>
              </tr>
            ) : (
              connections.map((connection) => (
                <tr key={connection.id} className="hover:bg-gray-50/50">
                  <td className="font-medium whitespace-nowrap">
                    {connection.connectionNumber}
                  </td>
                  <td>
                    <div className="max-w-[220px] min-w-0">
                      <Link
                        to={`/properties/${connection.property?.id}`}
                        className="text-primary-600 hover:underline font-medium block truncate"
                      >
                        {connection.property?.propertyNumber}
                      </Link>
                      <p className="text-sm text-gray-500 truncate" title={connection.property?.address}>
                        {connection.property?.address || '—'}
                      </p>
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
                  <td className="font-mono text-sm">{connection.meterNumber || '—'}</td>
                  <td>
                    <span className={`badge ${getStatusBadge(connection.status)}`}>
                      {connection.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-gray-600">
                    {connection.connectionDate
                      ? new Date(connection.connectionDate).toLocaleDateString()
                      : '—'
                    }
                  </td>
                  <td className="text-right">
                    <Link
                      to={`/water/connections/${connection.id}`}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition-colors"
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
