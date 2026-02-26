import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { shopRegistrationRequestAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { Store, CheckCircle, XCircle, Clock, MapPin, Calendar, User, FileText, Download, ExternalLink } from 'lucide-react';

const ShopRegistrationRequestDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [adminRemarks, setAdminRemarks] = useState('');
  
  // Determine base path based on current route
  const isClerkRoute = location.pathname.startsWith('/clerk');
  const basePath = isClerkRoute ? '/clerk' : '';

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
      navigate(isClerkRoute ? '/clerk/shop-registration-requests' : '/shop-registration-requests');
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
      await shopRegistrationRequestAPI.reject(id, {
        adminRemarks
      });
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
    const badges = {
      pending: (
        <span className="px-3 py-1 text-sm font-semibold rounded-full bg-yellow-100 text-yellow-800 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Pending
        </span>
      ),
      approved: (
        <span className="px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Approved
        </span>
      ),
      rejected: (
        <span className="px-3 py-1 text-sm font-semibold rounded-full bg-red-100 text-red-800 flex items-center gap-2">
          <XCircle className="w-4 h-4" />
          Rejected
        </span>
      )
    };
    return badges[status] || badges.pending;
  };

  if (loading) return <Loading />;
  if (!request) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div />
        {request.status === 'pending' && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowApproveModal(true)}
              className="btn bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Approve
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              className="btn bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Reject
            </button>
          </div>
        )}
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Store className="w-8 h-8" />
              Shop Registration Request Details
            </h1>
            <p className="text-gray-600 mt-2">Request Number: {request.requestNumber}</p>
          </div>
          {getStatusBadge(request.status)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Shop Information</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Shop Name</p>
              <p className="font-medium text-gray-900">{request.shopName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Shop Type</p>
              <p className="font-medium text-gray-900 capitalize">{request.shopType}</p>
            </div>
            {request.category && (
              <div>
                <p className="text-sm text-gray-600">Category</p>
                <p className="font-medium text-gray-900">{request.category}</p>
              </div>
            )}
            {request.area && (
              <div>
                <p className="text-sm text-gray-600">Area</p>
                <p className="font-medium text-gray-900">{request.area} sq. meters</p>
              </div>
            )}
            {request.tradeLicenseNumber && (
              <div>
                <p className="text-sm text-gray-600">Trade License Number</p>
                <p className="font-medium text-gray-900">{request.tradeLicenseNumber}</p>
              </div>
            )}
            {request.address && (
              <div>
                <p className="text-sm text-gray-600">Shop Address</p>
                <p className="font-medium text-gray-900">{request.address}</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Property & Applicant Information</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                Property
              </p>
              <p className="font-medium text-gray-900">
                {request.property?.propertyNumber || 'N/A'}
              </p>
              <p className="text-sm text-gray-500">{request.property?.address || 'N/A'}</p>
              {request.property?.ward && (
                <p className="text-sm text-gray-500">
                  Ward: {request.property.ward.wardNumber && request.property.ward.wardNumber !== '0' 
                    ? `${request.property.ward.wardNumber} - ` 
                    : ''}{request.property.ward.wardName}
                </p>
              )}
            </div>

            <div>
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <User className="w-4 h-4" />
                Applicant
              </p>
              <p className="font-medium text-gray-900">
                {request.applicant?.firstName} {request.applicant?.lastName}
              </p>
              <p className="text-sm text-gray-500">{request.applicant?.email}</p>
              {request.applicant?.phone && (
                <p className="text-sm text-gray-500">{request.applicant.phone}</p>
              )}
            </div>

            <div>
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Submitted
              </p>
              <p className="font-medium text-gray-900">
                {new Date(request.createdAt).toLocaleDateString()}
              </p>
            </div>

            {request.reviewedAt && (
              <div>
                <p className="text-sm text-gray-600">Reviewed</p>
                <p className="font-medium text-gray-900">
                  {new Date(request.reviewedAt).toLocaleDateString()}
                </p>
                {request.reviewer && (
                  <p className="text-sm text-gray-500">
                    by {request.reviewer.firstName} {request.reviewer.lastName}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {request.remarks && (
        <div className="card mt-6">
          <h2 className="text-xl font-semibold mb-4">Applicant Remarks</h2>
          <p className="text-gray-900">{request.remarks}</p>
        </div>
      )}

      {request.adminRemarks && (
        <div className="card mt-6 bg-gray-50">
          <h2 className="text-xl font-semibold mb-4">Review Remarks</h2>
          <p className="text-gray-900">{request.adminRemarks}</p>
        </div>
      )}

      {/* Documents Section */}
      {request.documents && Array.isArray(request.documents) && request.documents.length > 0 && (
        <div className="card mt-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Uploaded Documents
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {request.documents.map((doc, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1">
                    <FileText className="w-5 h-5 text-gray-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate" title={doc.originalName || doc.fileName}>
                        {doc.originalName || doc.fileName}
                      </p>
                      {doc.size && (
                        <p className="text-xs text-gray-500">
                          {(doc.size / 1024).toFixed(2)} KB
                        </p>
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
        <div className="card mt-6 bg-green-50">
          <h2 className="text-xl font-semibold text-green-900 mb-2">Shop Created</h2>
          <p className="text-green-900">
            Shop Number: {request.shop.shopNumber} - {request.shop.shopName}
          </p>
          <Link
            to={isClerkRoute ? `${basePath}/shop-tax/shops/${request.shop.id}` : `/shop-tax/shops/${request.shop.id}`}
            className="text-primary-600 hover:text-primary-900 mt-2 inline-block"
          >
            View Shop Details →
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
    </div>
  );
};

export default ShopRegistrationRequestDetails;
