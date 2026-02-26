import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Droplet,
  User,
  MapPin,
  Building,
  Home,
  Calendar,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  RotateCcw,
  AlertTriangle,
  Save,
  Image as ImageIcon
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const WaterConnectionInspection = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [decision, setDecision] = useState('');
  const [inspectorRemarks, setInspectorRemarks] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [escalationReason, setEscalationReason] = useState('');

  useEffect(() => {
    fetchRequest();
  }, [id]);

  const fetchRequest = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/inspector/water-connections/${id}/inspection`);
      setRequest(response.data);
    } catch (error) {
      console.error('Error fetching request:', error);
      toast.error('Failed to fetch request details');
      navigate('/inspector/water-connections');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitDecision = async () => {
    if (!decision) {
      toast.error('Please select a decision');
      return;
    }

    if (decision === 'REJECT' && !rejectionReason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }

    if (decision === 'RETURN' && !inspectorRemarks.trim()) {
      toast.error('Inspector remarks are required for return');
      return;
    }

    if (decision === 'ESCALATE' && !escalationReason.trim()) {
      toast.error('Escalation reason is required');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        decision,
        inspectorRemarks: inspectorRemarks.trim() || undefined,
        rejectionReason: rejectionReason.trim() || undefined,
        escalationReason: escalationReason.trim() || undefined
      };

      await api.post(`/inspector/water-connections/${id}/inspect`, payload);
      toast.success(`Water connection request ${decision.toLowerCase()}d successfully`);
      navigate('/inspector/water-connections');
    } catch (error) {
      console.error('Error submitting decision:', error);
      toast.error(error.response?.data?.error || 'Failed to submit decision');
    } finally {
      setSubmitting(false);
    }
  };

  const getConnectionTypeIcon = (type) => {
    const icons = {
      'domestic': Home,
      'commercial': Building,
      'industrial': Building
    };
    return icons[type] || Droplet;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <Droplet className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Request Not Found</h3>
            <div className="mt-2 text-sm text-red-700">The requested water connection could not be found.</div>
          </div>
        </div>
      </div>
    );
  }

  const ConnectionTypeIcon = getConnectionTypeIcon(request.connectionType);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="ds-page-title">Water Connection Inspection</h1>
          <p className="ds-page-subtitle">Request: {request.requestNumber}</p>
        </div>
        <div className="flex items-center space-x-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${request.status === 'SUBMITTED'
            ? 'bg-blue-100 text-blue-800'
            : 'bg-yellow-100 text-yellow-800'
            }`}>
            {request.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Request Details (Read-only) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Applicant Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Applicant Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Applicant Name</label>
                <p className="mt-1 text-sm text-gray-900">
                  {request.requester?.firstName} {request.requester?.lastName}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <p className="mt-1 text-sm text-gray-900">{request.requester?.phone || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 text-sm text-gray-900">{request.requester?.email || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Requested By</label>
                <p className="mt-1 text-sm text-gray-900">
                  {request.creator?.firstName} {request.creator?.lastName} (Clerk)
                </p>
              </div>
            </div>
          </div>

          {/* Connection Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Droplet className="w-5 h-5 mr-2" />
              Connection Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Connection Type</label>
                <div className="mt-1 flex items-center">
                  <ConnectionTypeIcon className="w-4 h-4 text-gray-400 mr-2" />
                  <p className="text-sm text-gray-900 capitalize">{request.connectionType}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Request Number</label>
                <p className="mt-1 text-sm text-gray-900">{request.requestNumber}</p>
              </div>
            </div>
          </div>

          {/* Property Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Building className="w-5 h-5 mr-2" />
              Property Information
            </h2>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Property Number</label>
                <p className="mt-1 text-sm text-gray-900">{request.property?.propertyNumber || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Property Address</label>
                <p className="mt-1 text-sm text-gray-900">{request.property?.address || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Ward</label>
                <p className="mt-1 text-sm text-gray-900">
                  {request.property?.ward?.name} ({request.property?.ward?.code})
                </p>
              </div>
            </div>
          </div>

          {/* Connection Location */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Connection Location
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700">Property Location for Connection</label>
              <p className="mt-1 text-sm text-gray-900">{request.propertyLocation}</p>
            </div>
          </div>

          {/* Documents */}
          {request.documents && request.documents.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <ImageIcon className="w-5 h-5 mr-2" />
                Documents ({request.documents.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Document Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        File Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        File Size
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Uploaded At
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {request.documents.map((doc, index) => (
                      <tr key={doc.id || index}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                            {doc.documentType?.replace('_', ' ') || 'Document'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {doc.fileName || 'Unknown file'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(2)} KB` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {doc.filePath && (
                            <a
                              href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${doc.filePath}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cyan-600 hover:text-cyan-900"
                              title="Download"
                            >
                              <ImageIcon className="w-5 h-5 inline" />
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Inspection Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Inspection Decision</h2>

            {/* Decision Selection */}
            <div className="space-y-3 mb-6">
              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="decision"
                  value="APPROVE"
                  checked={decision === 'APPROVE'}
                  onChange={(e) => setDecision(e.target.value)}
                  className="mr-3"
                />
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-sm font-medium text-gray-900">Approve</span>
              </label>

              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="decision"
                  value="REJECT"
                  checked={decision === 'REJECT'}
                  onChange={(e) => setDecision(e.target.value)}
                  className="mr-3"
                />
                <XCircle className="w-5 h-5 text-red-600 mr-2" />
                <span className="text-sm font-medium text-gray-900">Reject</span>
              </label>

              <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="decision"
                  value="RETURN"
                  checked={decision === 'RETURN'}
                  onChange={(e) => setDecision(e.target.value)}
                  className="mr-3"
                />
                <RotateCcw className="w-5 h-5 text-yellow-600 mr-2" />
                <span className="text-sm font-medium text-gray-900">Return for Correction</span>
              </label>

              {(request.status === 'SUBMITTED' || request.status === 'UNDER_INSPECTION') && (
                <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="decision"
                    value="ESCALATE"
                    checked={decision === 'ESCALATE'}
                    onChange={(e) => setDecision(e.target.value)}
                    className="mr-3"
                  />
                  <AlertTriangle className="w-5 h-5 text-orange-600 mr-2" />
                  <span className="text-sm font-medium text-gray-900">Escalate to Officer</span>
                </label>
              )}
            </div>

            {/* Conditional Fields */}
            {decision === 'REJECT' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Enter reason for rejection..."
                />
              </div>
            )}

            {(decision === 'APPROVE' || decision === 'RETURN') && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {decision === 'RETURN' ? 'Inspector Remarks' : 'Approval Remarks'}
                  {decision === 'RETURN' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={inspectorRemarks}
                  onChange={(e) => setInspectorRemarks(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder={decision === 'RETURN'
                    ? 'Enter remarks for returning to clerk...'
                    : 'Enter approval remarks (optional)...'
                  }
                />
              </div>
            )}

            {decision === 'ESCALATE' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Escalation Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={escalationReason}
                  onChange={(e) => setEscalationReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter reason for escalation..."
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmitDecision}
              disabled={!decision || submitting}
              className="w-full flex items-center justify-center px-4 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Submit Decision
                </>
              )}
            </button>

            {/* Request Timeline */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Request Timeline</h3>
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">Created:</span>
                  <span className="ml-2 text-gray-900">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">Submitted:</span>
                  <span className="ml-2 text-gray-900">
                    {new Date(request.submittedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaterConnectionInspection;
