import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { wardAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { Plus, Eye, Search, Users, MapPin } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

const Wards = () => {
  const { isAdmin } = useAuth();
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState('all');

  useEffect(() => {
    fetchWards();
  }, [search, filterActive]);

  // Listen for ward assignment changes from Staff Management
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'wardAssignmentUpdated') {
        fetchWards();
      }
    };

    // Listen for storage events from other tabs/windows
    window.addEventListener('storage', handleStorageChange);

    // Listen for custom events from same tab
    const handleCustomEvent = () => {
      fetchWards();
    };
    window.addEventListener('wardAssignmentUpdated', handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('wardAssignmentUpdated', handleCustomEvent);
    };
  }, []);

  const fetchWards = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (filterActive !== 'all') params.isActive = filterActive === 'active';

      const response = await wardAPI.getAll(params);
      setWards(response.data.data.wards);
    } catch (error) {
      toast.error('Failed to fetch wards');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !wards.length) return <Loading />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Wards</h1>
        {isAdmin && (
          <Link to="/wards/new" className="btn btn-primary flex items-center">
            <Plus className="w-4 h-4 mr-2" />
            Add Ward
          </Link>
        )}
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <form onSubmit={(e) => { e.preventDefault(); fetchWards(); }} className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ward number or name..."
              className="input pl-10"
            />
          </div>
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="input w-auto"
          >
            <option value="all">All Wards</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {wards.length === 0 ? (
          <div className="col-span-full card text-center py-12">
            <p className="text-gray-500">No wards found</p>
          </div>
        ) : (
          wards.map((ward) => (
            <div key={ward.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{ward.wardName}</h3>
                  <p className="text-sm text-gray-500">Ward #{ward.wardNumber}</p>
                </div>
                <span className={`badge ${ward.isActive ? 'badge-success' : 'badge-danger'}`}>
                  {ward.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm">
                  <Users className="w-4 h-4 mr-2 text-gray-400" />
                  <span className="text-gray-600">Collector:</span>
                  <span className="ml-2 font-medium">
                    {ward.collector
                      ? (ward.collector.full_name ||
                        (ward.collector.firstName && ward.collector.lastName
                          ? `${ward.collector.firstName} ${ward.collector.lastName}`
                          : 'Not Assigned'))
                      : 'Not Assigned'}
                  </span>
                </div>
                {ward.collector && ward.collector.email && (
                  <div className="text-xs text-gray-500 ml-6">
                    {ward.collector.email}
                  </div>
                )}
              </div>

              {ward.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{ward.description}</p>
              )}

              <div className="flex justify-end pt-4 border-t">
                <Link
                  to={`/wards/${ward.id}`}
                  className="text-primary-600 hover:text-primary-700 flex items-center text-sm font-medium"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View Details
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Wards;
