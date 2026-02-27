import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { noticeAPI, demandAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { Plus, Eye, Search, Filter, X, Send, ArrowUp } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useConfirm } from '../../../components/ConfirmModal';
import GenerateNoticeModal from './GenerateNoticeModal';

const Notices = () => {
  const { isAdmin, isAssessor } = useAuth();
  const { confirm } = useConfirm();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [filters, setFilters] = useState({
    noticeType: '',
    status: '',
    wardId: '',
    financialYear: '',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    fetchNotices();
  }, [search, filters]);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const params = {
        search,
        limit: 10000,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      };
      const response = await noticeAPI.getAll(params);
      setNotices(response.data.data.notices);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch notices');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      noticeType: '',
      status: '',
      wardId: '',
      financialYear: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  const handleSendNotice = async (noticeId, deliveryMode) => {
    try {
      await noticeAPI.send(noticeId, { deliveryMode });
      toast.success('Notice marked as sent');
      fetchNotices();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send notice');
    }
  };

  const handleEscalate = async (noticeId) => {
    const notice = notices.find(n => n.id === noticeId);
    if (!notice) return;

    const escalationOrder = {
      'reminder': 'demand',
      'demand': 'penalty',
      'penalty': 'final_warrant'
    };

    const nextType = escalationOrder[notice.noticeType];
    if (!nextType) {
      toast.error('Cannot escalate further');
      return;
    }

    const ok = await confirm({
      title: 'Escalate notice',
      message: `Escalate this notice to ${nextType} notice?`,
      confirmLabel: 'Escalate',
      cancelLabel: 'Cancel'
    });
    if (!ok) return;

    try {
      await noticeAPI.escalate(noticeId, { noticeType: nextType });
      toast.success('Notice escalated successfully');
      fetchNotices();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to escalate notice');
    }
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
      <div className="ds-page-header">
        <h1 className="ds-page-title">Notices & Enforcement</h1>
        <div className="flex flex-wrap gap-2">
          {(isAdmin || isAssessor) && (
            <button
              onClick={() => setShowGenerateModal(true)}
              className="btn btn-primary flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Generate Notice
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary flex items-center"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={(e) => { e.preventDefault(); fetchNotices(); }} className="mb-6">
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
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
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

            <div>
              <label className="label">Financial Year</label>
              <input
                type="text"
                value={filters.financialYear}
                onChange={(e) => handleFilterChange('financialYear', e.target.value)}
                className="input"
                placeholder="e.g., 2024-25"
              />
            </div>

            <div>
              <label className="label">Date From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="label">Date To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="input"
              />
            </div>
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Notice Number</th>
              <th>Type</th>
              <th>Property</th>
              <th>Owner</th>
              <th>Demand</th>
              <th>Amount Due</th>
              <th>Penalty</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Delivery Mode</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {notices.length === 0 ? (
              <tr>
                <td colSpan="11" className="text-center py-8 text-gray-500">
                  No notices found
                </td>
              </tr>
            ) : (
              notices.map((notice) => (
                <tr key={notice.id}>
                  <td className="font-medium">{notice.noticeNumber}</td>
                  <td className="whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getNoticeTypeBadge(notice.noticeType)}`}>
                      {getNoticeTypeLabel(notice.noticeType)}
                    </span>
                  </td>
                  <td>
                    <Link to={`/properties/${notice.propertyId}`} className="text-primary-600 hover:underline">
                      {notice.property?.propertyNumber || 'N/A'}
                    </Link>
                  </td>
                  <td>
                    {notice.property?.owner ? (
                      `${notice.property.owner.firstName} ${notice.property.owner.lastName}`
                    ) : 'N/A'}
                  </td>
                  <td>
                    <Link to={`/demands/${notice.demandId}`} className="text-primary-600 hover:underline">
                      {notice.demand?.demandNumber || 'N/A'}
                    </Link>
                  </td>
                  <td className="font-semibold">
                    ₹{parseFloat(notice.amountDue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td>
                    {parseFloat(notice.penaltyAmount || 0) > 0 ? (
                      <span className="text-red-600">
                        ₹{parseFloat(notice.penaltyAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    ) : (
                      '₹0.00'
                    )}
                  </td>
                  <td>{new Date(notice.dueDate).toLocaleDateString()}</td>
                  <td>
                    <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getStatusBadge(notice.status)}`}>
                      {notice.status}
                    </span>
                  </td>
                  <td>
                    {notice.deliveryMode ? (
                      <span className="text-sm capitalize">{notice.deliveryMode}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/notices/${notice.id}`}
                        className="text-primary-600 hover:text-primary-700"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      {notice.status === 'generated' && (isAdmin || isAssessor) && (
                        <>
                          <button
                            onClick={() => handleSendNotice(notice.id, 'print')}
                            className="text-blue-600 hover:text-blue-700"
                            title="Mark as Sent (Print)"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {notice.status !== 'resolved' && notice.status !== 'escalated' &&
                        notice.noticeType !== 'final_warrant' && (isAdmin || isAssessor) && (
                          <button
                            onClick={() => handleEscalate(notice.id)}
                            className="text-orange-600 hover:text-orange-700"
                            title="Escalate"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
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

      {/* Generate Notice Modal */}
      {showGenerateModal && (
        <GenerateNoticeModal
          onClose={() => setShowGenerateModal(false)}
          onSuccess={() => {
            setShowGenerateModal(false);
            fetchNotices();
          }}
        />
      )}
    </div>
  );
};

export default Notices;
