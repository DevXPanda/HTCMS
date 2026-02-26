import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { citizenAPI } from '../../services/api';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import { FileText, User, Home, Receipt, Calendar } from 'lucide-react';

const CitizenNoticeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotice();
  }, [id]);

  const fetchNotice = async () => {
    try {
      setLoading(true);
      const response = await citizenAPI.getNoticeById(id);
      setNotice(response.data.data.notice);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch notice details');
      navigate('/citizen/notices');
    } finally {
      setLoading(false);
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
      <div className="flex items-center gap-4 mb-6">
        <div>
          <h1 className="ds-page-title">Notice Details</h1>
          <p className="ds-page-subtitle">{notice.noticeNumber}</p>
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
                <p className="font-medium text-red-600">
                  {new Date(notice.dueDate).toLocaleDateString()}
                </p>
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
                  <p className="font-medium text-green-600">{new Date(notice.resolvedDate).toLocaleDateString()}</p>
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
              {parseFloat(notice.penaltyAmount || 0) > 0 && (
                <div>
                  <label className="text-sm text-gray-500">Penalty Amount</label>
                  <p className="text-2xl font-bold text-red-600">
                    ₹{parseFloat(notice.penaltyAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}
            </div>
            {notice.demand && parseFloat(notice.demand.balanceAmount || 0) > 0 && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm font-medium text-yellow-800">
                  ⚠️ Please pay the outstanding amount before the due date to avoid further penalties.
                </p>
                <Link
                  to={`/citizen/demands/${notice.demandId}`}
                  className="text-primary-600 hover:underline text-sm mt-2 inline-block"
                >
                  View Demand Details →
                </Link>
              </div>
            )}
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
                    <Link to={`/citizen/properties/${notice.propertyId}`} className="text-primary-600 hover:underline">
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
                    <Link to={`/citizen/demands/${notice.demandId}`} className="text-primary-600 hover:underline">
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

          {/* Important Notice */}
          <div className="card bg-red-50 border border-red-200">
            <h3 className="font-semibold text-red-900 mb-2">Important</h3>
            <p className="text-sm text-red-800">
              This is a legal notice. Please ensure timely payment to avoid escalation and additional penalties.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CitizenNoticeDetails;
