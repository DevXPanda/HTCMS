import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { citizenAPI } from '../../services/api';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import { FileText, Building2, Receipt, Calendar } from 'lucide-react';
import DetailPageLayout, { DetailRow } from '../../components/DetailPageLayout';

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
      reminder: 'Reminder Notice',
      demand: 'Demand Notice',
      penalty: 'Penalty Notice',
      final_warrant: 'Final Warrant Notice'
    };
    return labels[type] || type;
  };

  const statusBadgeClass = () => {
    const s = (notice?.status || '').toLowerCase();
    if (s === 'resolved') return 'badge-success';
    if (s === 'viewed') return 'badge-warning';
    if (s === 'sent') return 'badge-info';
    if (s === 'escalated') return 'badge-danger';
    return 'badge-secondary';
  };

  if (loading) return <Loading />;
  if (!notice) return null;

  const amountDue = parseFloat(notice.amountDue || 0);
  const hasBalance = notice.demand && parseFloat(notice.demand.balanceAmount || 0) > 0;

  return (
    <DetailPageLayout
      title="Notice Details"
      subtitle={notice.noticeNumber}
      // actionButtons={
      //   <Link to="/citizen/notices" className="text-primary-600 hover:text-primary-700 font-medium text-sm">
      //     ← Back to My Notices
      //   </Link>
      // }
      summarySection={
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="stat-card-title"><span>Notice Number</span></div>
            <p className="stat-card-value text-lg font-bold text-primary-600">{notice.noticeNumber}</p>
          </div>
          <div className="stat-card">
            <div className="stat-card-title"><span>Status</span></div>
            <p className="stat-card-value text-base">
              <span className={`badge capitalize ${statusBadgeClass()}`}>{notice.status}</span>
            </p>
          </div>
          <div className="stat-card">
            <div className="stat-card-title"><span>Type</span></div>
            <p className="stat-card-value text-lg">{getNoticeTypeLabel(notice.noticeType)}</p>
          </div>
          <div className="stat-card">
            <div className="stat-card-title"><span>Amount Due</span></div>
            <p className="stat-card-value text-lg font-bold text-gray-900">
              ₹{amountDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card flex flex-col">
          <h2 className="form-section-title flex items-center">
            <FileText className="w-5 h-5 mr-2 text-primary-600" />
            Notice Information
          </h2>
          <div className="flex-1">
            <dl>
              <DetailRow label="Notice Number" value={notice.noticeNumber} valueClass="font-semibold" />
              <DetailRow label="Notice Type" value={getNoticeTypeLabel(notice.noticeType)} />
              <DetailRow
                label="Status"
                value={<span className={`badge capitalize ${statusBadgeClass()}`}>{notice.status}</span>}
              />
              <DetailRow label="Financial Year" value={notice.financialYear} />
              <DetailRow
                label="Notice Date"
                value={notice.noticeDate ? new Date(notice.noticeDate).toLocaleDateString() : null}
              />
              <DetailRow
                label="Due Date"
                value={notice.dueDate ? new Date(notice.dueDate).toLocaleDateString() : null}
                valueClass="text-red-600"
              />
              {notice.deliveryMode && (
                <DetailRow label="Delivery Mode" value={notice.deliveryMode} valueClass="capitalize" />
              )}
              {notice.sentDate && (
                <DetailRow label="Sent Date" value={new Date(notice.sentDate).toLocaleDateString()} />
              )}
              {notice.viewedDate && (
                <DetailRow label="Viewed Date" value={new Date(notice.viewedDate).toLocaleDateString()} />
              )}
              {notice.resolvedDate && (
                <DetailRow
                  label="Resolved Date"
                  value={new Date(notice.resolvedDate).toLocaleDateString()}
                  valueClass="text-green-600"
                />
              )}
              {notice.remarks && <DetailRow label="Remarks" value={notice.remarks} />}
            </dl>
          </div>
        </div>

        <div className="card flex flex-col">
          <h2 className="form-section-title flex items-center">
            <Building2 className="w-5 h-5 mr-2 text-primary-600" />
            Property
          </h2>
          <div className="flex-1">
            {notice.property ? (
              <dl>
                <DetailRow
                  label="Property Number"
                  value={
                    <Link to={`/citizen/properties/${notice.propertyId}`} className="text-primary-600 hover:underline font-medium">
                      {notice.property.propertyNumber}
                    </Link>
                  }
                />
                <DetailRow label="Address" value={notice.property.address} />
              </dl>
            ) : (
              <p className="text-gray-500 text-sm py-2">No property linked</p>
            )}
          </div>
        </div>

        <div className="card flex flex-col">
          <h2 className="form-section-title flex items-center">
            <Receipt className="w-5 h-5 mr-2 text-primary-600" />
            Financial Details
          </h2>
          <div className="flex-1">
            <dl>
              <DetailRow
                label="Amount Due"
                value={`₹${amountDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                valueClass="text-lg font-bold text-gray-900"
              />
              {parseFloat(notice.penaltyAmount || 0) > 0 && (
                <DetailRow
                  label="Penalty Amount"
                  value={`₹${parseFloat(notice.penaltyAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                  valueClass="text-lg font-bold text-red-600"
                />
              )}
            </dl>
            {hasBalance && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm font-medium text-amber-800 mb-2">
                  Please pay the outstanding amount before the due date to avoid further penalties.
                </p>
                <Link
                  to={`/citizen/demands/${notice.demandId}`}
                  className="text-primary-600 hover:underline text-sm font-medium"
                >
                  View Demand Details →
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="card flex flex-col">
          <h2 className="form-section-title flex items-center">
            <Receipt className="w-5 h-5 mr-2 text-primary-600" />
            Demand
          </h2>
          <div className="flex-1">
            {notice.demand ? (
              <dl>
                <DetailRow
                  label="Demand Number"
                  value={
                    <Link to={`/citizen/demands/${notice.demandId}`} className="text-primary-600 hover:underline font-medium">
                      {notice.demand.demandNumber}
                    </Link>
                  }
                />
                <DetailRow
                  label="Balance Amount"
                  value={`₹${parseFloat(notice.demand.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                  valueClass="text-red-600 font-semibold"
                />
                <DetailRow label="Status" value={notice.demand.status} valueClass="capitalize" />
              </dl>
            ) : (
              <p className="text-gray-500 text-sm py-2">No demand linked</p>
            )}
          </div>
        </div>

        {notice.previousNotice && (
          <div className="card flex flex-col lg:col-span-2">
            <h2 className="form-section-title flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-primary-600" />
              Previous Notice
            </h2>
            <div className="flex-1">
              <dl>
                <DetailRow label="Notice Number" value={notice.previousNotice.noticeNumber} />
                <DetailRow label="Type" value={getNoticeTypeLabel(notice.previousNotice.noticeType)} />
                <DetailRow
                  label="Date"
                  value={
                    notice.previousNotice.noticeDate
                      ? new Date(notice.previousNotice.noticeDate).toLocaleDateString()
                      : null
                  }
                />
                <DetailRow
                  label="Amount"
                  value={`₹${parseFloat(notice.previousNotice.amountDue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                />
              </dl>
            </div>
          </div>
        )}

        <div className="card lg:col-span-2 bg-red-50 border-red-200">
          <h2 className="form-section-title text-red-900">Important</h2>
          <p className="text-sm text-red-800">
            This is a legal notice. Please ensure timely payment to avoid escalation and additional penalties.
          </p>
        </div>
      </div>
    </DetailPageLayout>
  );
};

export default CitizenNoticeDetails;
