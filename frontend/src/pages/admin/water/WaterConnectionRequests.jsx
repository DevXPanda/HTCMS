import { useState, useEffect } from 'react';
import { waterConnectionRequestAPI, propertyAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Eye, MapPin, Calendar, User } from 'lucide-react';

const WaterConnectionRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    connectionType: 'domestic',
    isMetered: false,
    meterNumber: '',
    pipeSize: '',
    monthlyRate: '',
    remarks: '',
    adminRemarks: ''
  });

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const response = await waterConnectionRequestAPI.getAll(params);
      setRequests(response.data.data.requests || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch water connection requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    try {
      await waterConnectionRequestAPI.approve(selectedRequest.id, formData);
      toast.success('Water connection request approved successfully!');
      setShowApproveModal(false);
      setSelectedRequest(null);
      setFormData({
        connectionType: 'domestic',
        isMetered: false,
        meterNumber: '',
        pipeSize: '',
        monthlyRate: '',
        remarks: '',
        adminRemarks: ''
      });
      await fetchRequests();
    } catch (error) {
      console.error('Approve error:', error);
      toast.error(error.response?.data?.message || 'Failed to approve request');
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    try {
      await waterConnectionRequestAPI.reject(selectedRequest.id, {
        adminRemarks: formData.adminRemarks
      });
      toast.success('Water connection request rejected');
      setShowRejectModal(false);
      setSelectedRequest(null);
      setFormData(prev => ({ ...prev, adminRemarks: '' }));
      await fetchRequests();
    } catch (error) {
      console.error('Reject error:', error);
      toast.error(error.response?.data?.message || 'Failed to reject request');
    }
  };

  const openApproveModal = (request) => {
    setSelectedRequest(request);
    setFormData({
      connectionType: request.connectionType || 'domestic',
      isMetered: false,
      meterNumber: '',
      pipeSize: '',
      monthlyRate: '',
      remarks: request.remarks || '',
      adminRemarks: ''
    });
    setShowApproveModal(true);
  };

  const openRejectModal = (request) => {
    setSelectedRequest(request);
    setFormData(prev => ({ ...prev, adminRemarks: '' }));
    setShowRejectModal(true);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Pending' },
      APPROVED: { color: 'bg-green-100 text-green-800 border-green-300', label: 'Approved' },
      REJECTED: { color: 'bg-red-100 text-red-800 border-red-300', label: 'Rejected' },
      COMPLETED: { color: 'bg-blue-100 text-blue-800 border-blue-300', label: 'Completed' }
    };
    const config = statusConfig[status] || statusConfig.PENDING;
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded border ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getConnectionTypeBadge = (type) => {
    const typeConfig = {
      domestic: { color: 'bg-blue-100 text-blue-800', label: 'Domestic' },
      commercial: { color: 'bg-purple-100 text-purple-800', label: 'Commercial' },
      industrial: { color: 'bg-orange-100 text-orange-800', label: 'Industrial' }
    };
    const config = typeConfig[type] || typeConfig.domestic;
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (loading) return <Loading />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Water Connection Requests</h1>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input"
          >
            <option value="all">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500">No water connection requests found</p>
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
                    {getConnectionTypeBadge(request.connectionType)}
                  </div>
                </div>
                {request.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => openApproveModal(request)}
                      className="btn btn-sm bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve
                    </button>
                    <button
                      onClick={() => openRejectModal(request)}
                      className="btn btn-sm bg-red-600 hover:bg-red-700 text-white"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-start">
                  <MapPin className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Property</p>
                    <p className="font-medium text-gray-900">
                      {request.property?.propertyNumber} - {request.property?.address}
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <User className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Requested By</p>
                    <p className="font-medium text-gray-900">
                      {request.requester?.firstName} {request.requester?.lastName}
                    </p>
                    <p className="text-xs text-gray-500">{request.requester?.email}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <Calendar className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Requested Date</p>
                    <p className="font-medium text-gray-900">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {request.processedAt && (
                  <div className="flex items-start">
                    <Calendar className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-600">Processed Date</p>
                      <p className="font-medium text-gray-900">
                        {new Date(request.processedAt).toLocaleDateString()}
                      </p>
                      {request.processor && (
                        <p className="text-xs text-gray-500">
                          By {request.processor.firstName} {request.processor.lastName}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-1">Property Location</p>
                <p className="text-gray-900">{request.propertyLocation}</p>
              </div>

              {request.remarks && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-1">Remarks</p>
                  <p className="text-gray-900">{request.remarks}</p>
                </div>
              )}

              {request.adminRemarks && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-1">Admin Remarks</p>
                  <p className="text-gray-900">{request.adminRemarks}</p>
                </div>
              )}

              {request.waterConnection && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-1">Created Connection</p>
                  <p className="font-medium text-primary-600">
                    {request.waterConnection.connectionNumber}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Approve Water Connection Request</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleApprove();
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Connection Type</label>
                  <select
                    value={formData.connectionType}
                    onChange={(e) => setFormData({ ...formData, connectionType: e.target.value })}
                    className="input"
                    required
                  >
                    <option value="domestic">Domestic</option>
                    <option value="commercial">Commercial</option>
                    <option value="industrial">Industrial</option>
                  </select>
                </div>

                <div>
                  <label className="label">Pipe Size (inches)</label>
                  <input
                    type="text"
                    value={formData.pipeSize}
                    onChange={(e) => setFormData({ ...formData, pipeSize: e.target.value })}
                    className="input"
                    placeholder="e.g., 0.5, 1, 1.5"
                  />
                </div>

                <div>
                  <label className="label">Monthly Rate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.monthlyRate}
                    onChange={(e) => setFormData({ ...formData, monthlyRate: e.target.value })}
                    className="input"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="label flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isMetered}
                      onChange={(e) => setFormData({ ...formData, isMetered: e.target.checked })}
                      className="mr-2"
                    />
                    Is Metered
                  </label>
                </div>

                {formData.isMetered && (
                  <div className="col-span-2">
                    <label className="label">Meter Number</label>
                    <input
                      type="text"
                      value={formData.meterNumber}
                      onChange={(e) => setFormData({ ...formData, meterNumber: e.target.value })}
                      className="input"
                      required={formData.isMetered}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="label">Remarks</label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  className="input"
                  rows={3}
                />
              </div>

              <div>
                <label className="label">Admin Remarks</label>
                <textarea
                  value={formData.adminRemarks}
                  onChange={(e) => setFormData({ ...formData, adminRemarks: e.target.value })}
                  className="input"
                  rows={2}
                  placeholder="Optional remarks for the citizen"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button type="submit" className="btn btn-primary bg-green-600 hover:bg-green-700">
                  Approve & Create Connection
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowApproveModal(false);
                    setSelectedRequest(null);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Reject Water Connection Request</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleReject();
              }}
              className="space-y-4"
            >
              <div>
                <label className="label">Admin Remarks</label>
                <textarea
                  value={formData.adminRemarks}
                  onChange={(e) => setFormData({ ...formData, adminRemarks: e.target.value })}
                  className="input"
                  rows={3}
                  placeholder="Reason for rejection (optional)"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button type="submit" className="btn btn-primary bg-red-600 hover:bg-red-700">
                  Reject Request
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedRequest(null);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WaterConnectionRequests;
