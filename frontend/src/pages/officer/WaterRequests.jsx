import React, { useState, useEffect } from 'react';
import { 
  Droplets, 
  Eye, 
  CheckCircle, 
  XCircle, 
  RotateCcw,
  Calendar,
  User,
  MapPin,
  Home,
  AlertTriangle
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const WaterRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [decision, setDecision] = useState('');
  const [officerRemarks, setOfficerRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await api.get('/officer/water-requests/escalated');
      setRequests(response.data);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to fetch water requests');
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (requestId) => {
    if (!decision) {
      toast.error('Please select a decision');
      return;
    }

    if (decision !== 'APPROVE' && !officerRemarks.trim()) {
      toast.error('Officer remarks required for REJECT and SEND_BACK decisions');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/officer/water-requests/${requestId}/decide`, {
        decision,
        officerRemarks: officerRemarks.trim()
      });

      toast.success(`Request ${decision.toLowerCase()}d successfully`);
      setSelectedRequest(null);
      setDecision('');
      setOfficerRemarks('');
      fetchRequests();
    } catch (error) {
      console.error('Error making decision:', error);
      toast.error(error.response?.data?.error || 'Failed to make decision');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Escalated Water Connection Requests</h1>
        <p className="text-gray-600 mt-2">Review and make final decisions on escalated water connection requests</p>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center py-8">
            <Droplets className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Escalated Requests</h3>
            <p className="text-gray-500">There are no water connection requests escalated to your attention.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Requests List */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Pending Requests ({requests.length})</h2>
            {requests.map((request) => (
              <div 
                key={request.id} 
                className={`cursor-pointer transition-all bg-white rounded-lg shadow-md p-6 hover:shadow-lg ${
                  selectedRequest?.id === request.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => setSelectedRequest(request)}
              >
                <div className="flex items-center justify-between pb-3">
                  <h3 className="text-lg font-semibold">{request.requestNumber}</h3>
                  <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">
                    <AlertTriangle className="h-3 w-3 mr-1 inline" />
                    Escalated
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <User className="h-4 w-4 mr-2" />
                    {request.requester?.firstName} {request.requester?.lastName}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Droplets className="h-4 w-4 mr-2" />
                    {request.connectionType} Connection
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    {request.propertyLocation}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    Escalated on {new Date(request.updatedAt).toLocaleDateString()}
                  </div>
                  {request.adminRemarks && (
                    <div className="mt-2 p-2 bg-yellow-50 rounded text-sm">
                      <strong>Inspector Remarks:</strong> {request.adminRemarks}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Request Details and Decision */}
          {selectedRequest && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800">Request Details</h2>
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center gap-2 pb-4">
                  <Droplets className="h-5 w-5" />
                  <h2 className="text-xl font-semibold">{selectedRequest.requestNumber}</h2>
                </div>
                <div className="space-y-4">
                  {/* Applicant Information */}
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Applicant Information</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><strong>Name:</strong> {selectedRequest.requester?.firstName} {selectedRequest.requester?.lastName}</div>
                      <div><strong>Email:</strong> {selectedRequest.requester?.email}</div>
                      <div><strong>Property ID:</strong> {selectedRequest.propertyId}</div>
                    </div>
                  </div>

                  {/* Connection Details */}
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Connection Details</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><strong>Type:</strong> {selectedRequest.connectionType}</div>
                      <div><strong>Status:</strong> {selectedRequest.status}</div>
                    </div>
                  </div>

                  {/* Property Location */}
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Property Location</h4>
                    <p className="text-sm">{selectedRequest.propertyLocation}</p>
                  </div>

                  {/* Customer Remarks */}
                  {selectedRequest.remarks && (
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">Customer Remarks</h4>
                      <div className="p-3 bg-blue-50 rounded text-sm">
                        {selectedRequest.remarks}
                      </div>
                    </div>
                  )}

                  {/* Inspector Remarks */}
                  {selectedRequest.adminRemarks && (
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">Inspector Remarks</h4>
                      <div className="p-3 bg-yellow-50 rounded text-sm">
                        {selectedRequest.adminRemarks}
                      </div>
                    </div>
                  )}

                  {/* Decision Section */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-gray-700 mb-3">Your Decision</h4>
                    
                    {/* Decision Buttons */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <button
                        type="button"
                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium ${
                          decision === 'APPROVE' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        onClick={() => setDecision('APPROVE')}
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </button>
                      <button
                        type="button"
                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium ${
                          decision === 'REJECT' 
                            ? 'bg-red-600 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        onClick={() => setDecision('REJECT')}
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                      <button
                        type="button"
                        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium ${
                          decision === 'SEND_BACK' 
                            ? 'bg-gray-600 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        onClick={() => setDecision('SEND_BACK')}
                      >
                        <RotateCcw className="h-4 w-4" />
                        Send Back
                      </button>
                    </div>

                    {/* Officer Remarks */}
                    {decision && decision !== 'APPROVE' && (
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Officer Remarks (Required)
                        </label>
                        <textarea
                          value={officerRemarks}
                          onChange={(e) => setOfficerRemarks(e.target.value)}
                          placeholder={`Enter remarks for ${decision.toLowerCase()} decision...`}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                        />
                      </div>
                    )}

                    {/* Submit Decision */}
                    {decision && (
                      <button
                        onClick={() => handleDecision(selectedRequest.id)}
                        disabled={submitting || (decision !== 'APPROVE' && !officerRemarks.trim())}
                        className={`w-full px-4 py-2 rounded-lg font-medium ${
                          decision === 'APPROVE' 
                            ? 'bg-blue-600 text-white hover:bg-blue-700' 
                            : decision === 'REJECT' 
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-gray-600 text-white hover:bg-gray-700'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {submitting ? 'Processing...' : `${decision} Request`}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WaterRequests;
