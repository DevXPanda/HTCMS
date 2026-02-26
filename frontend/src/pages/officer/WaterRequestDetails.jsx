import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  AlertTriangle,
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const WaterRequestDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState('');
  const [officerRemarks, setOfficerRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRequest();
  }, [id]);

  const fetchRequest = async () => {
    try {
      const response = await api.get('/officer/water-requests/escalated');
      const foundRequest = response.data.find(req => req.id === parseInt(id));
      if (foundRequest) {
        setRequest(foundRequest);
      } else {
        toast.error('Request not found');
        navigate('/officer/water-requests');
      }
    } catch (error) {
      console.error('Error fetching request:', error);
      toast.error('Failed to fetch request details');
      navigate('/officer/water-requests');
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async () => {
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
      await api.post(`/officer/water-requests/${id}/decide`, {
        decision,
        officerRemarks: officerRemarks.trim()
      });

      toast.success(`Request ${decision.toLowerCase()}d successfully`);
      navigate('/officer/water-requests');
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

  if (!request) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Request Not Found</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>The requested water connection request could not be found.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div>
          <h1 className="ds-page-title">Water Connection Request Details</h1>
          <p className="ds-page-subtitle">Review and make final decision on this escalated request</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Request Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-2 pb-4">
              <Droplets className="h-5 w-5" />
              <h2 className="text-xl font-semibold">{request.requestNumber}</h2>
              <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">
                <AlertTriangle className="h-3 w-3 mr-1 inline" />
                Escalated
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Applicant Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <User className="h-4 w-4 mr-2 text-gray-400" />
                    {request.requester?.firstName} {request.requester?.lastName}
                  </div>
                  <div className="text-sm text-gray-600">{request.requester?.email}</div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Connection Details</h3>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <Droplets className="h-4 w-4 mr-2 text-gray-400" />
                    {request.connectionType} Connection
                  </div>
                  <div className="flex items-center text-sm">
                    <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                    {request.propertyLocation}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Property Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <Home className="h-4 w-4 mr-2 text-gray-400" />
                    {request.property?.propertyNumber}
                  </div>
                  <div className="text-sm text-gray-600">{request.property?.address}</div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Timeline</h3>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    Submitted: {new Date(request.submittedAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center text-sm">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    Escalated: {new Date(request.escalatedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>

            {request.remarks && (
              <div className="mt-4 pt-4 border-t">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Applicant Remarks</h3>
                <p className="text-sm text-gray-600">{request.remarks}</p>
              </div>
            )}

            {request.adminRemarks && (
              <div className="mt-4 pt-4 border-t">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Inspector Remarks</h3>
                <div className="p-3 bg-yellow-50 rounded text-sm">
                  {request.adminRemarks}
                </div>
              </div>
            )}
          </div>

          {/* Decision Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Make Decision</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Decision *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setDecision('APPROVE')}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium ${
                      decision === 'APPROVE' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecision('REJECT')}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium ${
                      decision === 'REJECT' 
                        ? 'bg-red-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecision('SEND_BACK')}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium ${
                      decision === 'SEND_BACK' 
                        ? 'bg-orange-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <RotateCcw className="w-4 h-4" />
                    Send Back
                  </button>
                </div>
              </div>

              {decision !== 'APPROVE' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Officer Remarks *
                  </label>
                  <textarea
                    value={officerRemarks}
                    onChange={(e) => setOfficerRemarks(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    rows={4}
                    placeholder="Provide detailed remarks for this decision..."
                  />
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleDecision}
                  disabled={!decision || submitting}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Processing...' : `Submit ${decision || 'Decision'}`}
                </button>
                <button
                  onClick={() => navigate('/officer/water-requests')}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/officer/dashboard')}
                className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => navigate('/officer/decision-history')}
                className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded"
              >
                View Decision History
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Request Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Current Status</span>
                <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">
                  Escalated
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Escalated By</span>
                <span className="text-sm">
                  {request.escalatedByInspector?.firstName} {request.escalatedByInspector?.lastName}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaterRequestDetails;
