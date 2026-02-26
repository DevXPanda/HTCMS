import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { propertyAPI, wardAPI } from '../../services/api';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import { Eye, Search, Filter, X, MapPin } from 'lucide-react';
import { useStaffAuth } from '../../contexts/StaffAuthContext';

const PropertyList = () => {
  const { user } = useStaffAuth();
  const [searchParams] = useSearchParams();
  const wardIdParam = searchParams.get('wardId');
  
  const [properties, setProperties] = useState([]);
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedWardId, setSelectedWardId] = useState(wardIdParam || '');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    if (user?.id) {
      fetchWards();
    }
  }, [user]);

  useEffect(() => {
    if (user?.id && (selectedWardId || wards.length > 0)) {
      fetchProperties();
    }
  }, [page, search, selectedWardId, user, wards.length]);

  const fetchWards = async () => {
    try {
      const response = await wardAPI.getByCollector(user.id);
      setWards(response.data.data.wards || []);
    } catch (error) {
      console.error('Failed to fetch wards');
    }
  };

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        search,
        limit: 10
      };
      
      if (selectedWardId) {
        const response = await propertyAPI.getByWard(selectedWardId, params);
        setProperties(response.data.data.properties || []);
        setPagination(response.data.data.pagination);
      } else {
        // Fetch properties from all assigned wards
        const allProperties = [];
        for (const ward of wards) {
          try {
            const response = await propertyAPI.getByWard(ward.id, params);
            if (response.data.data.properties) {
              allProperties.push(...response.data.data.properties);
            }
          } catch (error) {
            console.error(`Failed to fetch properties for ward ${ward.id}`);
          }
        }
        setProperties(allProperties);
        setPagination(null);
      }
    } catch (error) {
      toast.error('Failed to fetch properties');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !properties.length) return <Loading />;

  return (
    <div>
      <h1 className="ds-page-title mb-6">Property List</h1>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by property number or address..."
              className="input pl-10"
            />
          </div>
          <select
            value={selectedWardId}
            onChange={(e) => {
              setSelectedWardId(e.target.value);
              setPage(1);
            }}
            className="input w-auto"
          >
            <option value="">All Assigned Wards</option>
            {wards.map((ward) => (
              <option key={ward.id} value={ward.id}>
                {ward.wardName} (#{ward.wardNumber})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Properties List */}
      {properties.length === 0 ? (
        <div className="card text-center py-12">
          <MapPin className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 text-lg">No properties found</p>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Property Number</th>
                    <th>Address</th>
                    <th>Ward</th>
                    <th>Owner</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {properties.map((property) => (
                    <tr key={property.id}>
                      <td className="font-medium">{property.propertyNumber}</td>
                      <td>{property.address}</td>
                      <td>
                        {property.ward?.wardName || 'N/A'}
                      </td>
                      <td>
                        {property.owner
                          ? `${property.owner.firstName} ${property.owner.lastName}`
                          : 'N/A'}
                      </td>
                      <td>
                        <span className="badge badge-secondary capitalize">
                          {property.propertyType}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${property.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                          {property.status || 'N/A'}
                        </span>
                      </td>
                      <td>
                        <Link
                          to={`/collector/properties/${property.id}`}
                          className="btn btn-sm btn-primary flex items-center"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn btn-secondary"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="btn btn-secondary"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PropertyList;
