import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FileText, 
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

const PropertyApplicationInspection = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [decision, setDecision] = useState('');
  const [inspectorRemarks, setInspectorRemarks] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [escalationReason, setEscalationReason] = useState('');

  useEffect(() => {
    fetchApplication();
  }, [id]);

  const fetchApplication = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/inspector/property-applications/${id}/inspection`);
      setApplication(response.data);
    } catch (error) {
      console.error('Error fetching application:', error);
      toast.error('Failed to fetch application details');
      navigate('/inspector/property-applications');
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

      await api.post(`/inspector/property-applications/${id}/inspect`, payload);
      toast.success(`Application ${decision.toLowerCase()}d successfully`);
      navigate('/inspector/property-applications');
    } catch (error) {
      console.error('Error submitting decision:', error);
      toast.error(error.response?.data?.error || 'Failed to submit decision');
    } finally {
      setSubmitting(false);
    }
  };

  const getPropertyTypeIcon = (type) => {
    const icons = {
      'residential': Home,
      'commercial': Building,
      'industrial': Building,
      'agricultural': Home,
      'mixed': Building
    };
    return icons[type] || Building;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <FileText className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Application Not Found</h3>
            <div className="mt-2 text-sm text-red-700">The requested application could not be found.</div>
          </div>
        </div>
      </div>
    );
  }

  const PropertyTypeIcon = getPropertyTypeIcon(application.propertyType);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="ds-page-title">Property Application Inspection</h1>
          <p className="ds-page-subtitle">Application: {application.applicationNumber}</p>
        </div>
        <div className="flex items-center space-x-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            application.status === 'SUBMITTED' 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {application.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Application Details (Read-only) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Applicant Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Applicant Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Owner Name</label>
                <p className="mt-1 text-sm text-gray-900">{application.ownerName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <p className="mt-1 text-sm text-gray-900">{application.ownerPhone || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 text-sm text-gray-900">{application.applicant?.email || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Applied By</label>
                <p className="mt-1 text-sm text-gray-900">
                  {application.creator?.firstName} {application.creator?.lastName} (Clerk)
                </p>
              </div>
            </div>
          </div>

          {/* Property Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Building className="w-5 h-5 mr-2" />
              Property Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Property Type</label>
                <div className="mt-1 flex items-center">
                  <PropertyTypeIcon className="w-4 h-4 text-gray-400 mr-2" />
                  <p className="text-sm text-gray-900 capitalize">{application.propertyType}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Usage Type</label>
                <p className="mt-1 text-sm text-gray-900 capitalize">{application.usageType || 'Not specified'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Area</label>
                <p className="mt-1 text-sm text-gray-900">{application.area} sqm</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Built-up Area</label>
                <p className="mt-1 text-sm text-gray-900">{application.builtUpArea || 'Not specified'} sqm</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Floors</label>
                <p className="mt-1 text-sm text-gray-900">{application.floors}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Construction Type</label>
                <p className="mt-1 text-sm text-gray-900">{application.constructionType || 'Not specified'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Construction Year</label>
                <p className="mt-1 text-sm text-gray-900">{application.constructionYear || 'Not specified'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Occupancy Status</label>
                <p className="mt-1 text-sm text-gray-900 capitalize">{application.occupancyStatus}</p>
              </div>
            </div>
          </div>

          {/* Location Details */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Location Details
            </h2>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <p className="mt-1 text-sm text-gray-900">{application.address}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">City</label>
                  <p className="mt-1 text-sm text-gray-900">{application.city}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">State</label>
                  <p className="mt-1 text-sm text-gray-900">{application.state}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Pincode</label>
                  <p className="mt-1 text-sm text-gray-900">{application.pincode}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Ward</label>
                <p className="mt-1 text-sm text-gray-900">
                  {application.ward?.name} ({application.ward?.code})
                </p>
              </div>
            </div>
          </div>

          {/* Documents and Photos */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <ImageIcon className="w-5 h-5 mr-2" />
              Documents and Photos
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Documents</label>
                {application.documents && application.documents.length > 0 ? (
                  <div className="space-y-2">
                    {application.documents.map((doc, index) => (
                      <div key={index} className="flex items-center p-2 border border-gray-200 rounded">
                        <FileText className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{doc.name || `Document ${index + 1}`}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No documents uploaded</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Photos</label>
                {application.photos && application.photos.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {application.photos.map((photo, index) => (
                      <div key={index} className="border border-gray-200 rounded p-2">
                        <img 
                          src={photo} 
                          alt={`Property photo ${index + 1}`}
                          className="w-full h-20 object-cover rounded"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No photos uploaded</p>
                )}
              </div>
            </div>
          </div>

          {/* Remarks */}
          {application.remarks && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Clerk Remarks</h2>
              <p className="text-sm text-gray-900">{application.remarks}</p>
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

              {(application.status === 'SUBMITTED' || application.status === 'UNDER_INSPECTION') && (
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
              className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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

            {/* Application Timeline */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Application Timeline</h3>
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">Created:</span>
                  <span className="ml-2 text-gray-900">
                    {new Date(application.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">Submitted:</span>
                  <span className="ml-2 text-gray-900">
                    {new Date(application.submittedAt).toLocaleDateString()}
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

export default PropertyApplicationInspection;
