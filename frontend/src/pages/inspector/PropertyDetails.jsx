import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Building, 
  MapPin, 
  User, 
  Phone, 
  Home,
  FileText,
  Droplet,
  Eye,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  XCircle,
  RotateCcw,
  Calendar,
  Play,
  Send
} from 'lucide-react';
import { useStaffAuth } from '../../contexts/StaffAuthContext';
import { inspectorAPI } from '../../services/api';
import toast from 'react-hot-toast';

const InspectorPropertyDetails = () => {
  const { id } = useParams();
  const { user } = useStaffAuth();
  const [property, setProperty] = useState(null);
  const [waterConnections, setWaterConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingApplications, setPendingApplications] = useState([]);
  const [showInspectionActions, setShowInspectionActions] = useState(false);
  const [inspectionForm, setInspectionForm] = useState({
    decision: '',
    inspectorRemarks: '',
    rejectionReason: ''
  });

  useEffect(() => {
    fetchPropertyDetails();
  }, [id]);

  const fetchPropertyDetails = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching property details for ID:', id);
      
      const [propertyResponse, waterResponse, applicationsResponse] = await Promise.all([
        inspectorAPI.getPropertyDetails(id),
        inspectorAPI.getPropertyWaterConnections(id),
        inspectorAPI.getPendingPropertyApplications()
      ]);
      
      console.log('✅ Property response:', propertyResponse.data);
      console.log('✅ Water connections response:', waterResponse.data);
      console.log('✅ Applications response:', applicationsResponse.data);
      
      setProperty(propertyResponse.data?.property);
      setWaterConnections(waterResponse.data?.waterConnections || []);
      
      // Filter applications for this property
      const propertyApplications = applicationsResponse.data || [];
      const pendingForProperty = propertyApplications.filter(app => app.propertyId === parseInt(id));
      setPendingApplications(pendingForProperty);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to load property details';
      setError(errorMessage);
      console.error('Property details fetch error:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
    } finally {
      setLoading(false);
    }
  };

  const handleInspectionAction = async (applicationId, action) => {
    try {
      const formData = {
        decision: action,
        inspectorRemarks: inspectionForm.inspectorRemarks,
        rejectionReason: action === 'REJECT' ? inspectionForm.rejectionReason : undefined
      };

      await inspectorAPI.processPropertyInspection(applicationId, formData);
      
      toast.success(`Application ${action.toLowerCase()}d successfully`);
      
      // Reset form and refresh data
      setInspectionForm({ decision: '', inspectorRemarks: '', rejectionReason: '' });
      setShowInspectionActions(false);
      fetchPropertyDetails();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to process inspection action');
      console.error('Inspection action error:', error);
    }
  };

  const handleWaterInspectionAction = async (connectionId, action) => {
    try {
      const formData = {
        decision: action,
        inspectorRemarks: inspectionForm.inspectorRemarks,
        rejectionReason: action === 'REJECT' ? inspectionForm.rejectionReason : undefined
      };

      await inspectorAPI.processWaterInspection(connectionId, formData);
      
      toast.success(`Water connection ${action.toLowerCase()}d successfully`);
      
      // Reset form and refresh data
      setInspectionForm({ decision: '', inspectorRemarks: '', rejectionReason: '' });
      setShowInspectionActions(false);
      fetchPropertyDetails();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to process inspection action');
      console.error('Water inspection action error:', error);
    }
  };

  const getPropertyTypeBadge = (type) => {
    const colors = {
      residential: 'bg-blue-100 text-blue-800',
      commercial: 'bg-green-100 text-green-800',
      industrial: 'bg-purple-100 text-purple-800',
      agricultural: 'bg-yellow-100 text-yellow-800',
      mixed: 'bg-gray-100 text-gray-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      disputed: 'bg-orange-100 text-orange-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getWaterConnectionStatusBadge = (status) => {
    const colors = {
      ACTIVE: 'bg-green-100 text-green-800',
      INACTIVE: 'bg-red-100 text-red-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      DISCONNECTED: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="text-center py-12">
        <Building className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Property not found</h3>
        <p className="mt-1 text-sm text-gray-500">The property you're looking for doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Link
            to="/inspector/properties"
            className="mr-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Property Details</h1>
            <p className="text-gray-600 mt-1">View property information for inspection context</p>
          </div>
        </div>
      </div>

      {/* Property Information */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Property Information</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Property Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Property Number
              </label>
              <div className="flex items-center">
                <Building className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-900 font-medium">
                  {property.propertyNumber}
                </span>
              </div>
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <div className="flex items-start">
                <MapPin className="h-4 w-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-900">
                  {property.address}, {property.city}, {property.state} - {property.pincode}
                </span>
              </div>
            </div>

            {/* Owner Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Owner Name
              </label>
              <div className="flex items-center">
                <User className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-900">
                  {property.ownerName || 'N/A'}
                </span>
              </div>
            </div>

            {/* Owner Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Owner Phone
              </label>
              <div className="flex items-center">
                <Phone className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-900">
                  {property.ownerPhone || 'N/A'}
                </span>
              </div>
            </div>

            {/* Property Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Property Type
              </label>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPropertyTypeBadge(property.propertyType)}`}>
                {property.propertyType}
              </span>
            </div>

            {/* Usage Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Usage Type
              </label>
              <span className="text-sm text-gray-900 capitalize">
                {property.usageType || 'N/A'}
              </span>
            </div>

            {/* Area */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Area
              </label>
              <span className="text-sm text-gray-900">
                {property.area} sq.m
              </span>
            </div>

            {/* Built-up Area */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Built-up Area
              </label>
              <span className="text-sm text-gray-900">
                {property.builtUpArea || 'N/A'} sq.m
              </span>
            </div>

            {/* Floors */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Floors
              </label>
              <span className="text-sm text-gray-900">
                {property.floors || 'N/A'}
              </span>
            </div>

            {/* Construction Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Construction Type
              </label>
              <span className="text-sm text-gray-900 capitalize">
                {property.constructionType || 'N/A'}
              </span>
            </div>

            {/* Construction Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Construction Year
              </label>
              <span className="text-sm text-gray-900">
                {property.constructionYear || 'N/A'}
              </span>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(property.status)}`}>
                {property.status}
              </span>
            </div>

            {/* Occupancy Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Occupancy Status
              </label>
              <span className="text-sm text-gray-900 capitalize">
                {property.occupancyStatus?.replace('_', ' ') || 'N/A'}
              </span>
            </div>
          </div>

          {/* Remarks */}
          {property.remarks && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remarks
              </label>
              <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                {property.remarks}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Water Connections */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Water Connections</h2>
        </div>
        <div className="p-6">
          {waterConnections.length > 0 ? (
            <div className="space-y-4">
              {waterConnections.map((connection) => (
                <div key={connection.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Droplet className="h-5 w-5 text-blue-500 mr-3" />
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">
                          Connection: {connection.connectionNumber}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Type: {connection.connectionType} • Status: 
                          <span className={`ml-1 inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getWaterConnectionStatusBadge(connection.status)}`}>
                            {connection.status}
                          </span>
                        </p>
                        <p className="text-sm text-gray-500">
                          Meter: {connection.meterNumber || 'Non-metered'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        {connection.meterNumber}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Droplet className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No water connections</h3>
              <p className="mt-1 text-sm text-gray-500">This property doesn't have any water connections.</p>
            </div>
          )}
        </div>
      </div>

      {/* Related Documents */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Related Documents</h2>
        </div>
        <div className="p-6">
          {/* Property Documents */}
          {property.documents && property.documents.length > 0 && (
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-900 mb-3">Property Documents</h3>
              <div className="space-y-2">
                {property.documents.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{doc.name || `Document ${index + 1}`}</span>
                    </div>
                    <button
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      onClick={() => window.open(doc.url, '_blank')}
                      title="View document"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Water Connection Documents */}
          {waterConnections.some(conn => conn.documents && conn.documents.length > 0) && (
            <div>
              <h3 className="text-md font-medium text-gray-900 mb-3">Water Connection Documents</h3>
              <div className="space-y-4">
                {waterConnections.map((connection) => (
                  connection.documents && connection.documents.length > 0 && (
                    <div key={connection.id} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">
                        Connection: {connection.connectionNumber}
                      </h4>
                      <div className="space-y-2">
                        {connection.documents.map((doc, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex items-center">
                              <FileText className="h-4 w-4 text-gray-400 mr-2" />
                              <span className="text-sm text-gray-900">{doc.name || `Document ${index + 1}`}</span>
                            </div>
                            <button
                              className="text-blue-600 hover:text-blue-700 text-sm"
                              onClick={() => window.open(doc.url, '_blank')}
                              title="View document"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {/* No Documents */}
          {(!property.documents || property.documents.length === 0) && 
           !waterConnections.some(conn => conn.documents && conn.documents.length > 0) && (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No documents available</h3>
              <p className="mt-1 text-sm text-gray-500">No documents are attached to this property or its water connections.</p>
            </div>
          )}
        </div>
      </div>

      {/* Pending Inspection Actions */}
      {(pendingApplications.length > 0 || waterConnections.some(conn => conn.status === 'PENDING')) && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Pending Inspection Actions</h2>
              <button
                onClick={() => setShowInspectionActions(!showInspectionActions)}
                className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Play className="h-4 w-4 mr-2" />
                {showInspectionActions ? 'Hide Actions' : 'Show Actions'}
              </button>
            </div>
          </div>
          
          {showInspectionActions && (
            <div className="p-6 space-y-6">
              {/* Property Applications */}
              {pendingApplications.length > 0 && (
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-4">Property Applications</h3>
                  <div className="space-y-4">
                    {pendingApplications.map((application) => (
                      <div key={application.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <FileText className="h-5 w-5 text-blue-500 mr-3" />
                            <div>
                              <h4 className="text-sm font-medium text-gray-900">
                                Application: {application.applicationNumber}
                              </h4>
                              <p className="text-sm text-gray-500">
                                Type: {application.propertyType} • Status: {application.status}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Inspection Form */}
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Inspector Remarks
                            </label>
                            <textarea
                              value={inspectionForm.inspectorRemarks}
                              onChange={(e) => setInspectionForm(prev => ({ ...prev, inspectorRemarks: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                              rows="3"
                              placeholder="Enter inspection remarks..."
                            />
                          </div>
                          
                          <div className="flex space-x-3">
                            <button
                              onClick={() => handleInspectionAction(application.id, 'APPROVE')}
                              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve
                            </button>
                            
                            <button
                              onClick={() => handleInspectionAction(application.id, 'RETURN')}
                              className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                            >
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Return to Clerk
                            </button>
                            
                            <button
                              onClick={() => {
                                setInspectionForm(prev => ({ ...prev, decision: 'REJECT' }));
                                handleInspectionAction(application.id, 'REJECT');
                              }}
                              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </button>
                          </div>
                          
                          {inspectionForm.decision === 'REJECT' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Rejection Reason
                              </label>
                              <textarea
                                value={inspectionForm.rejectionReason}
                                onChange={(e) => setInspectionForm(prev => ({ ...prev, rejectionReason: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                                rows="2"
                                placeholder="Enter rejection reason..."
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending Water Connections */}
              {waterConnections.some(conn => conn.status === 'PENDING') && (
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-4">Water Connection Requests</h3>
                  <div className="space-y-4">
                    {waterConnections.filter(conn => conn.status === 'PENDING').map((connection) => (
                      <div key={connection.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <Droplet className="h-5 w-5 text-blue-500 mr-3" />
                            <div>
                              <h4 className="text-sm font-medium text-gray-900">
                                Connection: {connection.connectionNumber}
                              </h4>
                              <p className="text-sm text-gray-500">
                                Type: {connection.connectionType} • Status: {connection.status}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex space-x-3">
                          <button
                            onClick={() => handleWaterInspectionAction(connection.id, 'APPROVE')}
                            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </button>
                          
                          <button
                            onClick={() => handleWaterInspectionAction(connection.id, 'RETURN')}
                            className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Return to Clerk
                          </button>
                          
                          <button
                            onClick={() => {
                              setInspectionForm(prev => ({ ...prev, decision: 'REJECT' }));
                              handleWaterInspectionAction(connection.id, 'REJECT');
                            }}
                            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Inspection Context Note */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <Eye className="h-5 w-5 text-yellow-600 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-yellow-900">Inspector Access - Read Only</h3>
            <p className="mt-1 text-sm text-yellow-700">
              This is a read-only view for inspection purposes. As an inspector, you can view all property details, 
              water connections, and related documents but cannot modify any data. Use this information to verify 
              property details during field inspections and to process pending applications.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InspectorPropertyDetails;
