import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { noticeAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { ArrowLeft, Send, ArrowUp, Calendar, FileText, User, Home, Receipt } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

const NoticeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isAssessor } = useAuth();
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotice();
  }, [id]);

  const fetchNotice = async () => {
    try {
      setLoading(true);
      const response = await noticeAPI.getById(id);
      setNotice(response.data.data.notice);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch notice details');
      navigate('/notices');
    } finally {
      setLoading(false);
    }
  };

  const handleSendNotice = async (deliveryMode) => {
    try {
      await noticeAPI.send(id, { deliveryMode });
      toast.success('Notice marked as sent');
      fetchNotice();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send notice');
    }
  };

  const handleEscalate = async () => {
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

    if (!window.confirm(`Escalate this notice to ${nextType} notice?`)) return;

    try {
      await noticeAPI.escalate(id, { noticeType: nextType });
      toast.success('Notice escalated successfully');
      navigate('/notices');
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

  if (loading) return <Loading />;
  if (!notice) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/notices')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="ds-page-title">Notice Details</h1>
            <p className="text-gray-600 mt-1">{notice.noticeNumber}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {notice.status === 'generated' && (isAdmin || isAssessor) && (
            <button
              onClick={() => handleSendNotice('print')}
              className="btn btn-primary flex items-center"
            >
              <Send className="w-4 h-4 mr-2" />
              Mark as Sent
            </button>
          )}
          {notice.status !== 'resolved' && notice.status !== 'escalated' && 
           notice.noticeType !== 'final_warrant' && (isAdmin || isAssessor) && (
            <button
              onClick={handleEscalate}
              className="btn btn-warning flex items-center"
            >
              <ArrowUp className="w-4 h-4 mr-2" />
              Escalate
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Notice Information */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Notice Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">Notice Number</label>
                <p className="font-medium">{notice.noticeNumber}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Notice Type</label>
                <p className="font-medium">{getNoticeTypeLabel(notice.noticeType)}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Status</label>
                <p>
                  <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getStatusBadge(notice.status)}`}>
                    {notice.status}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Financial Year</label>
                <p className="font-medium">{notice.financialYear}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Notice Date</label>
                <p className="font-medium">{new Date(notice.noticeDate).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Due Date</label>
                <p className="font-medium">{new Date(notice.dueDate).toLocaleDateString()}</p>
              </div>
              {notice.deliveryMode && (
                <div>
                  <label className="text-sm text-gray-500">Delivery Mode</label>
                  <p className="font-medium capitalize">{notice.deliveryMode}</p>
                </div>
              )}
              {notice.sentDate && (
                <div>
                  <label className="text-sm text-gray-500">Sent Date</label>
                  <p className="font-medium">{new Date(notice.sentDate).toLocaleDateString()}</p>
                </div>
              )}
              {notice.viewedDate && (
                <div>
                  <label className="text-sm text-gray-500">Viewed Date</label>
                  <p className="font-medium">{new Date(notice.viewedDate).toLocaleDateString()}</p>
                </div>
              )}
              {notice.resolvedDate && (
                <div>
                  <label className="text-sm text-gray-500">Resolved Date</label>
                  <p className="font-medium">{new Date(notice.resolvedDate).toLocaleDateString()}</p>
                </div>
              )}
            </div>
            {notice.remarks && (
              <div className="mt-4">
                <label className="text-sm text-gray-500">Remarks</label>
                <p className="mt-1">{notice.remarks}</p>
              </div>
            )}
          </div>

          {/* Financial Details */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Receipt className="w-5 h-5 mr-2" />
              Financial Details
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">Amount Due</label>
                <p className="text-2xl font-bold text-gray-900">
                  ₹{parseFloat(notice.amountDue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Penalty Amount</label>
                <p className="text-2xl font-bold text-red-600">
                  ₹{parseFloat(notice.penaltyAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* Previous Notice */}
          {notice.previousNotice && (
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Previous Notice</h2>
              <div className="bg-gray-50 p-4 rounded">
                <p><strong>Notice Number:</strong> {notice.previousNotice.noticeNumber}</p>
                <p><strong>Type:</strong> {getNoticeTypeLabel(notice.previousNotice.noticeType)}</p>
                <p><strong>Date:</strong> {new Date(notice.previousNotice.noticeDate).toLocaleDateString()}</p>
                <p><strong>Amount:</strong> ₹{parseFloat(notice.previousNotice.amountDue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Property Information */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Home className="w-5 h-5 mr-2" />
              Property
            </h2>
            {notice.property && (
              <div className="space-y-2">
                <div>
                  <label className="text-sm text-gray-500">Property Number</label>
                  <p className="font-medium">
                    <Link to={`/properties/${notice.propertyId}`} className="text-primary-600 hover:underline">
                      {notice.property.propertyNumber}
                    </Link>
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Address</label>
                  <p className="text-sm">{notice.property.address}</p>
                </div>
              </div>
            )}
          </div>

          {/* Owner Information */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Owner
            </h2>
            {notice.property?.owner && (
              <div className="space-y-2">
                <div>
                  <label className="text-sm text-gray-500">Name</label>
                  <p className="font-medium">
                    {notice.property.owner.firstName} {notice.property.owner.lastName}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Email</label>
                  <p className="text-sm">{notice.property.owner.email}</p>
                </div>
                {notice.property.owner.phone && (
                  <div>
                    <label className="text-sm text-gray-500">Phone</label>
                    <p className="text-sm">{notice.property.owner.phone}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Demand Information */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Receipt className="w-5 h-5 mr-2" />
              Demand
            </h2>
            {notice.demand && (
              <div className="space-y-2">
                <div>
                  <label className="text-sm text-gray-500">Demand Number</label>
                  <p className="font-medium">
                    <Link to={`/demands/${notice.demandId}`} className="text-primary-600 hover:underline">
                      {notice.demand.demandNumber}
                    </Link>
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Balance Amount</label>
                  <p className="font-medium text-red-600">
                    ₹{parseFloat(notice.demand.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Status</label>
                  <p className="font-medium capitalize">{notice.demand.status}</p>
                </div>
              </div>
            )}
          </div>

          {/* Generated By */}
          {notice.generator && (
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Generated By</h2>
              <p className="text-sm">
                {notice.generator.firstName} {notice.generator.lastName}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NoticeDetails;
