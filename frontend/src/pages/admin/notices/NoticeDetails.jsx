import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { noticeAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { Send, ArrowUp, FileText, User, Home, Receipt, TrendingUp } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import DetailPageLayout, { DetailRow } from '../../../components/DetailPageLayout';

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

  const formatAmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <DetailPageLayout
      backTo="/notices"
      backLabel="Back to Notices"
      title="Notice Details"
      subtitle={notice.noticeNumber}
      actionButtons={
        <>
          {notice.status === 'generated' && (isAdmin || isAssessor) && (
            <button onClick={() => handleSendNotice('print')} className="btn btn-primary flex items-center">
              <Send className="w-4 h-4 mr-2" />
              Mark as Sent
            </button>
          )}
          {notice.status !== 'resolved' && notice.status !== 'escalated' && notice.noticeType !== 'final_warrant' && (isAdmin || isAssessor) && (
            <button onClick={handleEscalate} className="btn btn-secondary flex items-center">
              <ArrowUp className="w-4 h-4 mr-2" />
              Escalate
            </button>
          )}
        </>
      }
      summarySection={
        <>
          <h2 className="form-section-title flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-primary-600" />
            Summary
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stat-card">
              <div className="stat-card-title"><span>Notice Number</span></div>
              <p className="stat-card-value text-lg">{notice.noticeNumber}</p>
            </div>
            <div className="stat-card">
              <div className="stat-card-title"><span>Type</span></div>
              <p className="stat-card-value text-base">{getNoticeTypeLabel(notice.noticeType)}</p>
            </div>
            <div className="stat-card">
              <div className="stat-card-title"><span>Status</span></div>
              <p className="stat-card-value text-base">
                <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getStatusBadge(notice.status)}`}>{notice.status}</span>
              </p>
            </div>
            <div className="stat-card">
              <div className="stat-card-title"><span>Amount Due</span></div>
              <p className="stat-card-value text-lg font-bold text-gray-900">{formatAmt(notice.amountDue)}</p>
            </div>
          </div>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="form-section-title flex items-center">
              <FileText className="w-5 h-5 mr-2 text-primary-600" />
              Notice Information
            </h2>
            <dl>
              <DetailRow label="Notice Number" value={notice.noticeNumber} valueClass="font-semibold" />
              <DetailRow label="Notice Type" value={getNoticeTypeLabel(notice.noticeType)} />
              <DetailRow label="Status" value={<span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getStatusBadge(notice.status)}`}>{notice.status}</span>} />
              <DetailRow label="Financial Year" value={notice.financialYear} />
              <DetailRow label="Notice Date" value={notice.noticeDate ? new Date(notice.noticeDate).toLocaleDateString() : null} />
              <DetailRow label="Due Date" value={notice.dueDate ? new Date(notice.dueDate).toLocaleDateString() : null} />
              <DetailRow label="Delivery Mode" value={notice.deliveryMode} valueClass="capitalize" />
              <DetailRow label="Sent Date" value={notice.sentDate ? new Date(notice.sentDate).toLocaleDateString() : null} />
              <DetailRow label="Viewed Date" value={notice.viewedDate ? new Date(notice.viewedDate).toLocaleDateString() : null} />
              <DetailRow label="Resolved Date" value={notice.resolvedDate ? new Date(notice.resolvedDate).toLocaleDateString() : null} />
              {notice.remarks && <div className="pt-3 border-t border-gray-100"><dt className="text-sm font-medium text-gray-500 mb-1">Remarks</dt><dd className="text-gray-700 text-sm">{notice.remarks}</dd></div>}
            </dl>
          </div>

          <div className="card">
            <h2 className="form-section-title flex items-center">
              <Receipt className="w-5 h-5 mr-2 text-primary-600" />
              Financial Details
            </h2>
            <dl>
              <DetailRow label="Amount Due" value={formatAmt(notice.amountDue)} valueClass="font-bold text-gray-900" />
              <DetailRow label="Penalty Amount" value={formatAmt(notice.penaltyAmount)} valueClass="font-bold text-red-600" />
            </dl>
          </div>

          {notice.previousNotice && (
            <div className="card">
              <h2 className="form-section-title">Previous Notice</h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <dl>
                  <DetailRow label="Notice Number" value={notice.previousNotice.noticeNumber} />
                  <DetailRow label="Type" value={getNoticeTypeLabel(notice.previousNotice.noticeType)} />
                  <DetailRow label="Date" value={notice.previousNotice.noticeDate ? new Date(notice.previousNotice.noticeDate).toLocaleDateString() : null} />
                  <DetailRow label="Amount" value={formatAmt(notice.previousNotice.amountDue)} />
                </dl>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="form-section-title flex items-center">
              <Home className="w-5 h-5 mr-2 text-primary-600" />
              Property
            </h2>
            {notice.property ? (
              <dl>
                <DetailRow label="Property Number" value={<Link to={`/properties/${notice.propertyId}`} className="text-primary-600 hover:underline">{notice.property.propertyNumber}</Link>} />
                <DetailRow label="Address" value={notice.property.address} />
              </dl>
            ) : (
              <p className="text-gray-500 text-sm">No property linked</p>
            )}
          </div>

          <div className="card">
            <h2 className="form-section-title flex items-center">
              <User className="w-5 h-5 mr-2 text-primary-600" />
              Owner
            </h2>
            {notice.property?.owner ? (
              <dl>
                <DetailRow label="Name" value={`${notice.property.owner.firstName} ${notice.property.owner.lastName}`} />
                <DetailRow label="Email" value={notice.property.owner.email} />
                <DetailRow label="Phone" value={notice.property.owner.phone} />
              </dl>
            ) : (
              <p className="text-gray-500 text-sm">No owner information</p>
            )}
          </div>

          <div className="card">
            <h2 className="form-section-title flex items-center">
              <Receipt className="w-5 h-5 mr-2 text-primary-600" />
              Demand
            </h2>
            {notice.demand ? (
              <dl>
                <DetailRow label="Demand Number" value={<Link to={`/demands/${notice.demandId}`} className="text-primary-600 hover:underline">{notice.demand.demandNumber}</Link>} />
                <DetailRow label="Balance Amount" value={formatAmt(notice.demand.balanceAmount)} valueClass="text-red-600 font-semibold" />
                <DetailRow label="Status" value={notice.demand.status} valueClass="capitalize" />
              </dl>
            ) : (
              <p className="text-gray-500 text-sm">No demand linked</p>
            )}
          </div>

          {notice.generator && (
            <div className="card">
              <h2 className="form-section-title">Generated By</h2>
              <p className="text-sm">{notice.generator.firstName} {notice.generator.lastName}</p>
            </div>
          )}
        </div>
      </div>
    </DetailPageLayout>
  );
};

export default NoticeDetails;
