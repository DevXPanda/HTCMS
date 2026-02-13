import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { shopRegistrationRequestAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { Store, CheckCircle, XCircle, Eye, MapPin, Calendar, User, Clock } from 'lucide-react';

const ShopRegistrationRequests = () => {
  const location = useLocation();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [adminRemarks, setAdminRemarks] = useState('');
  
  // Determine base path based on current route
  const isClerkRoute = location.pathname.startsWith('/clerk');
  const basePath = isClerkRoute ? '/clerk' : '';

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const response = await shopRegistrationRequestAPI.getAll(params);
      setRequests(response.data.data.requests || []);
    } catch (error) {
      console.error('Error fetching shop registration requests:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch shop registration requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    try {
      await shopRegistrationRequestAPI.approve(selectedRequest.id, {
        adminRemarks: adminRemarks || null
      });
      toast.success('Shop registration request approved and shop created successfully!');
      setShowApproveModal(false);
      setSelectedRequest(null);
      setAdminRemarks('');
      await fetchRequests();
    } catch (error) {
      console.error('Approve error:', error);
      toast.error(error.response?.data?.message || 'Failed to approve request');
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !adminRemarks.trim()) {
      toast.error('Please provide remarks for rejection');
      return;
    }

    try {
      await shopRegistrationRequestAPI.reject(selectedRequest.id, {
        adminRemarks
      });
      toast.success('Shop registration request rejected');
      setShowRejectModal(false);
      setSelectedRequest(null);
      setAdminRemarks('');
      await fetchRequests();
    } catch (error) {
      console.error('Reject error:', error);
      toast.error(error.response?.data?.message || 'Failed to reject request');
    }
  };

  const openApproveModal = (request) => {
    setSelectedRequest(request);
    setAdminRemarks('');
    setShowApproveModal(true);
  };

  const openRejectModal = (request) => {
    setSelectedRequest(request);
    setAdminRemarks('');
    setShowRejectModal(true);
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Pending
        </span>
      ),
      approved: (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Approved
        </span>
      ),
      rejected: (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          Rejected
        </span>
      )
    };
    return badges[status] || badges.pending;
  };

  if (loading) return <Loading />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Store className="w-8 h-8" />
            Shop Registration Requests
          </h1>
          <p className="text-gray-600 mt-2">Review and process shop registration requests</p>
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="card text-center py-12">
          <Store className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No shop registration requests found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {requests.map((request) => (
            <div key={request.id} className="card">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {request.requestNumber}
                  </h3>
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusBadge(request.status)}
                    <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-800 capitalize">
                      {request.shopType}
                    </span>
                  </div>
                </div>
                {request.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => openApproveModal(request)}
                      className="btn btn-sm bg-green-600 hover:bg-green-700 text-white flex items-center gap-1"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => openRejectModal(request)}
                      className="btn btn-sm bg-red-600 hover:bg-red-700 text-white flex items-center gap-1"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-start">
                  <Store className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Shop Name</p>
                    <p className="font-medium text-gray-900">{request.shopName}</p>
                    {request.category && (
                      <p className="text-sm text-gray-500">Category: {request.category}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start">
                  <MapPin className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Property</p>
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
                </div>

                <div className="flex items-start">
                  <User className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Applicant</p>
                    <p className="font-medium text-gray-900">
                      {request.applicant?.firstName} {request.applicant?.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{request.applicant?.email}</p>
                    {request.applicant?.phone && (
                      <p className="text-sm text-gray-500">{request.applicant.phone}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start">
                  <Calendar className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Submitted</p>
                    <p className="font-medium text-gray-900">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                    {request.reviewedAt && (
                      <>
                        <p className="text-sm text-gray-600 mt-1">Reviewed</p>
                        <p className="text-sm text-gray-900">
                          {new Date(request.reviewedAt).toLocaleDateString()}
                        </p>
                        {request.reviewer && (
                          <p className="text-sm text-gray-500">
                            by {request.reviewer.firstName} {request.reviewer.lastName}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {request.area && (
                <div className="mb-2">
                  <span className="text-sm text-gray-600">Area: </span>
                  <span className="text-sm font-medium text-gray-900">
                    {request.area} sq. meters
                  </span>
                </div>
              )}

              {request.tradeLicenseNumber && (
                <div className="mb-2">
                  <span className="text-sm text-gray-600">Trade License: </span>
                  <span className="text-sm font-medium text-gray-900">
                    {request.tradeLicenseNumber}
                  </span>
                </div>
              )}

              {request.remarks && (
                <div className="mb-2">
                  <p className="text-sm text-gray-600">Applicant Remarks:</p>
                  <p className="text-sm text-gray-900">{request.remarks}</p>
                </div>
              )}

              {request.adminRemarks && (
                <div className="mb-2">
                  <p className="text-sm text-gray-600">Review Remarks:</p>
                  <p className="text-sm text-gray-900">{request.adminRemarks}</p>
                </div>
              )}

              {request.shop && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg">
                  <p className="text-sm font-medium text-green-900">
                    Shop Created: {request.shop.shopNumber} - {request.shop.shopName}
                  </p>
                </div>
              )}

              <div className="mt-4 pt-4 border-t">
                <Link
                  to={`${basePath}/shop-registration-requests/${request.id}`}
                  className="text-primary-600 hover:text-primary-900 flex items-center gap-1"
                >
                  <Eye className="w-4 h-4" />
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedRequest && (
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
                  setSelectedRequest(null);
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
      {showRejectModal && selectedRequest && (
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
                  setSelectedRequest(null);
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

export default ShopRegistrationRequests;
