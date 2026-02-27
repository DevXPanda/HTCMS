import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { shopRegistrationRequestAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { Store, CheckCircle, XCircle, Clock, MapPin, Calendar, User, FileText, TrendingUp, ExternalLink } from 'lucide-react';
import DetailPageLayout, { DetailRow } from '../../../components/DetailPageLayout';

const ShopRegistrationRequestDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [adminRemarks, setAdminRemarks] = useState('');

  const isClerkRoute = location.pathname.startsWith('/clerk');
  const basePath = isClerkRoute ? '/clerk' : '';
  const backToList = isClerkRoute ? '/clerk/shop-registration-requests' : '/shop-registration-requests';

  useEffect(() => {
    fetchRequest();
  }, [id]);

  const fetchRequest = async () => {
    try {
      setLoading(true);
      const response = await shopRegistrationRequestAPI.getById(id);
      setRequest(response.data.data.request);
    } catch (error) {
      console.error('Error fetching request:', error);
      toast.error('Failed to load request details');
      navigate(backToList);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      await shopRegistrationRequestAPI.approve(id, {
        adminRemarks: adminRemarks || null
      });
      toast.success('Shop registration request approved and shop created successfully!');
      setShowApproveModal(false);
      setAdminRemarks('');
      await fetchRequest();
    } catch (error) {
      console.error('Approve error:', error);
      toast.error(error.response?.data?.message || 'Failed to approve request');
    }
  };

  const handleReject = async () => {
    if (!adminRemarks.trim()) {
      toast.error('Please provide remarks for rejection');
      return;
    }
    try {
      await shopRegistrationRequestAPI.reject(id, { adminRemarks });
      toast.success('Shop registration request rejected');
      setShowRejectModal(false);
      setAdminRemarks('');
      await fetchRequest();
    } catch (error) {
      console.error('Reject error:', error);
      toast.error(error.response?.data?.message || 'Failed to reject request');
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || 'pending').toLowerCase();
    if (s === 'approved') return 'badge-success';
    if (s === 'rejected') return 'badge-danger';
    return 'badge-warning';
  };

  const reviewedText = request?.reviewedAt
    ? `${new Date(request.reviewedAt).toLocaleDateString()}${request?.reviewer ? ` by ${request.reviewer.firstName} ${request.reviewer.lastName}` : ''}`
    : '—';

  if (loading) return <Loading />;
  if (!request) return null;

  return (
    <DetailPageLayout
      backTo={backToList}
      backLabel="Back to Shop Registration Requests"
      showBackLink={false}
      title="Shop Registration Request Details"
      subtitle={request.requestNumber}
      actionButtons={
        request.status === 'pending' && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowApproveModal(true)}
              className="btn btn-success flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Approve
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              className="btn btn-danger flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Reject
            </button>
          </div>
        )
      }
      summarySection={
        <>
          <h2 className="form-section-title flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-primary-600" />
            Summary
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stat-card">
              <div className="stat-card-title"><span>Request Number</span></div>
              <p className="stat-card-value text-lg font-bold text-primary-600">{request.requestNumber}</p>
            </div>
            <div className="stat-card">
              <div className="stat-card-title"><span>Status</span></div>
              <p className="stat-card-value text-base">
                <span className={`badge capitalize flex items-center gap-1.5 w-fit ${getStatusBadge(request.status)}`}>
                  {request.status === 'approved' && <CheckCircle className="w-4 h-4" />}
                  {request.status === 'rejected' && <XCircle className="w-4 h-4" />}
                  {request.status === 'pending' && <Clock className="w-4 h-4" />}
                  {request.status}
                </span>
              </p>
            </div>
            <div className="stat-card">
              <div className="stat-card-title"><span>Submitted</span></div>
              <p className="stat-card-value text-lg">{new Date(request.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="stat-card">
              <div className="stat-card-title"><span>Reviewed</span></div>
              <p className="stat-card-value text-sm">{reviewedText}</p>
            </div>
          </div>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="form-section-title flex items-center">
            <Store className="w-5 h-5 mr-2 text-primary-600" />
            Shop Information
          </h2>
          <dl>
            <DetailRow label="Shop Name" value={request.shopName} />
            <DetailRow label="Shop Type" value={request.shopType} valueClass="capitalize" />
            <DetailRow label="Category" value={request.category} />
            <DetailRow label="Area" value={request.area != null ? `${request.area} sq. meters` : null} />
            <DetailRow label="Trade License Number" value={request.tradeLicenseNumber} />
            <DetailRow label="Shop Address" value={request.address} />
          </dl>
        </div>

        <div className="card">
          <h2 className="form-section-title flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-primary-600" />
            Property & Applicant
          </h2>
          <dl>
            <DetailRow
              label="Property"
              value={
                request.propertyId ? (
                  <Link to={`${basePath}/properties/${request.propertyId}`} className="text-primary-600 hover:underline">
                    {request.property?.propertyNumber || '—'}
                  </Link>
                ) : (
                  request.property?.propertyNumber || '—'
                )
              }
            />
            <DetailRow label="Address" value={request.property?.address} />
            <DetailRow
              label="Ward"
              value={
                request.property?.ward
                  ? `${request.property.ward.wardNumber && request.property.ward.wardNumber !== '0' ? `${request.property.ward.wardNumber} - ` : ''}${request.property.ward.wardName}`
                  : null
              }
            />
            <DetailRow
              label="Applicant"
              value={
                request.applicant
                  ? `${request.applicant.firstName || ''} ${request.applicant.lastName || ''}`.trim() || '—'
                  : null
              }
            />
            <DetailRow label="Email" value={request.applicant?.email} />
            <DetailRow label="Phone" value={request.applicant?.phone} />
            <DetailRow label="Submitted" value={request.createdAt ? new Date(request.createdAt).toLocaleDateString() : null} />
            <DetailRow label="Reviewed" value={reviewedText !== '—' ? reviewedText : null} />
          </dl>
        </div>
      </div>

      {request.remarks && (
        <div className="card mt-6">
          <h2 className="form-section-title">Applicant Remarks</h2>
          <p className="text-gray-700 whitespace-pre-wrap text-sm">{request.remarks}</p>
        </div>
      )}

      {request.adminRemarks && (
        <div className="card mt-6">
          <h2 className="form-section-title">Review Remarks</h2>
          <p className="text-gray-700 whitespace-pre-wrap text-sm">{request.adminRemarks}</p>
        </div>
      )}

      {request.documents && Array.isArray(request.documents) && request.documents.length > 0 && (
        <div className="card mt-6">
          <h2 className="form-section-title flex items-center">
            <FileText className="w-5 h-5 mr-2 text-primary-600" />
            Uploaded Documents
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {request.documents.map((doc, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <FileText className="w-5 h-5 text-gray-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate" title={doc.originalName || doc.fileName}>
                        {doc.originalName || doc.fileName}
                      </p>
                      {doc.size && (
                        <p className="text-xs text-gray-500">{(doc.size / 1024).toFixed(2)} KB</p>
                      )}
                    </div>
                  </div>
                </div>
                {doc.url && (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 mt-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Document
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {request.shop && (
        <div className="card mt-6 bg-green-50 border-green-200">
          <h2 className="form-section-title text-green-900 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
            Shop Created
          </h2>
          <p className="text-gray-800 font-medium">
            Shop Number: {request.shop.shopNumber} – {request.shop.shopName}
          </p>
          <Link
            to={isClerkRoute ? `${basePath}/shop-tax/shops/${request.shop.id}` : `/shop-tax/shops/${request.shop.id}`}
            className="btn btn-primary mt-3 inline-flex items-center"
          >
            View Shop Details
          </Link>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Approve Shop Registration Request</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to approve this request? A shop record will be created
              automatically.
            </p>
            <div className="mb-4">
              <label className="label">Remarks (Optional)</label>
              <textarea
                value={adminRemarks}
                onChange={(e) => setAdminRemarks(e.target.value)}
                rows={3}
                className="input"
                placeholder="Add any remarks..."
              />
            </div>
            <div className="flex gap-4">
              <button onClick={handleApprove} className="btn btn-primary bg-green-600 hover:bg-green-700">
                Approve
              </button>
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setAdminRemarks('');
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Reject Shop Registration Request</h3>
            <p className="text-gray-600 mb-4">Please provide a reason for rejection.</p>
            <div className="mb-4">
              <label className="label">
                Rejection Remarks <span className="text-red-500">*</span>
              </label>
              <textarea
                value={adminRemarks}
                onChange={(e) => setAdminRemarks(e.target.value)}
                rows={4}
                className="input"
                placeholder="Enter reason for rejection..."
                required
              />
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleReject}
                disabled={!adminRemarks.trim()}
                className="btn btn-primary bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setAdminRemarks('');
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </DetailPageLayout>
  );
};

export default ShopRegistrationRequestDetails;
