import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { citizenAPI } from '../../services/api';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import { Eye, Search, Filter, X, FileText } from 'lucide-react';

const CitizenNotices = () => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    noticeType: '',
    status: ''
  });

  useEffect(() => {
    fetchNotices();
  }, [page, search, filters]);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        search,
        limit: 10,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      };
      const response = await citizenAPI.getNotices(params);
      setNotices(response.data.data.notices);
      setPagination(response.data.data.pagination);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch notices');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({
      noticeType: '',
      status: ''
    });
    setPage(1);
  };

  const getNoticeTypeLabel = (type) => {
    const labels = {
      'reminder': 'Reminder Notice',
      'demand': 'Demand Notice',
      'penalty': 'Penalty Notice',
      'final_warrant': 'Final Warrant Notice'
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status) => {
    const badges = {
      generated: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      viewed: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      escalated: 'bg-purple-100 text-purple-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getNoticeTypeBadge = (type) => {
    const badges = {
      reminder: 'bg-blue-100 text-blue-800',
      demand: 'bg-orange-100 text-orange-800',
      penalty: 'bg-red-100 text-red-800',
      final_warrant: 'bg-red-200 text-red-900'
    };
    return badges[type] || 'bg-gray-100 text-gray-800';
  };

  if (loading && !notices.length) return <Loading />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Notices</h1>
          <p className="text-gray-600 mt-1">View all notices issued to you</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="btn btn-secondary flex items-center"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </button>
      </div>

      {/* Search */}
      <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchNotices(); }} className="mb-6">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by notice number..."
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Notice Type</label>
              <select
                value={filters.noticeType}
                onChange={(e) => handleFilterChange('noticeType', e.target.value)}
                className="input"
              >
                <option value="">All Types</option>
                <option value="reminder">Reminder Notice</option>
                <option value="demand">Demand Notice</option>
                <option value="penalty">Penalty Notice</option>
                <option value="final_warrant">Final Warrant Notice</option>
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
                <option value="generated">Generated</option>
                <option value="sent">Sent</option>
                <option value="viewed">Viewed</option>
                <option value="resolved">Resolved</option>
                <option value="escalated">Escalated</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {notices.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Notices Found</h3>
          <p className="text-gray-600">You don't have any notices at the moment.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {notices.map((notice) => (
              <div key={notice.id} className="card hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getNoticeTypeBadge(notice.noticeType)}`}>
                      {getNoticeTypeLabel(notice.noticeType)}
                    </span>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getStatusBadge(notice.status)}`}>
                    {notice.status}
                  </span>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div>
                    <p className="text-sm text-gray-500">Notice Number</p>
                    <p className="font-medium">{notice.noticeNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Property</p>
                    <p className="font-medium">{notice.property?.propertyNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Amount Due</p>
                    <p className="text-xl font-bold text-red-600">
                      ₹{parseFloat(notice.amountDue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  {parseFloat(notice.penaltyAmount || 0) > 0 && (
                    <div>
                      <p className="text-sm text-gray-500">Penalty</p>
                      <p className="font-medium text-red-600">
                        ₹{parseFloat(notice.penaltyAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-500">Due Date</p>
                    <p className="font-medium">{new Date(notice.dueDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Notice Date</p>
                    <p className="font-medium">{new Date(notice.noticeDate).toLocaleDateString()}</p>
                  </div>
                </div>

                <Link
                  to={`/citizen/notices/${notice.id}`}
                  className="btn btn-primary w-full flex items-center justify-center"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </Link>
              </div>
            ))}
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
        </>
      )}
    </div>
  );
};

export default CitizenNotices;
