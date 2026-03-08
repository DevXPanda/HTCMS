import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { waterConnectionRequestAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { MapPin, Calendar, User, Pencil, FileText, Download } from 'lucide-react';

const DOCUMENT_TYPE_LABELS = {
  APPLICATION_FORM: 'Application Form',
  ID_PROOF: 'ID Proof',
  ADDRESS_PROOF: 'Address Proof',
  PROPERTY_DEED: 'Property Deed',
  METER_INSTALLATION_CERTIFICATE: 'Meter Installation Certificate',
  CONNECTION_AGREEMENT: 'Connection Agreement',
  NOC: 'No Objection Certificate (NOC)',
  OTHER: 'Other'
};

const WaterConnectionRequestDetails = () => {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequest();
  }, [id]);

  const fetchRequest = async () => {
    try {
      const response = await waterConnectionRequestAPI.getById(id);
      setRequest(response.data.data.request);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load request');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      DRAFT: { color: 'bg-gray-100 text-gray-800 border-gray-300', label: 'Draft' },
      SUBMITTED: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Pending' },
      UNDER_INSPECTION: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Pending' },
      APPROVED: { color: 'bg-green-100 text-green-800 border-green-300', label: 'Approved' },
      REJECTED: { color: 'bg-red-100 text-red-800 border-red-300', label: 'Rejected' },
      RETURNED: { color: 'bg-purple-100 text-purple-800 border-purple-300', label: 'Returned' },
      COMPLETED: { color: 'bg-blue-100 text-blue-800 border-blue-300', label: 'Completed' },
      ESCALATED_TO_OFFICER: { color: 'bg-orange-100 text-orange-800 border-orange-300', label: 'Escalated' }
    };
    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', label: status };
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
  if (!request) return <div className="card p-6 text-gray-600">Request not found</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link to="/water/connection-requests" className="text-primary-600 hover:underline text-sm mb-2 inline-block">
            ← Back to Connection Requests
          </Link>
          <h1 className="ds-page-title">{request.requestNumber}</h1>
        </div>
        <div className="flex gap-2">
          {['DRAFT', 'RETURNED'].includes(request.status) && (
            <Link
              to={`/water/connection-requests/${request.id}/edit`}
              className="btn btn-sm border border-primary-300 text-primary-700 hover:bg-primary-50"
            >
              <Pencil className="w-4 h-4 mr-1" />
              Edit
            </Link>
          )}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-6">
          {getStatusBadge(request.status)}
          {getConnectionTypeBadge(request.connectionType)}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start">
            <MapPin className="w-5 h-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-600">Property</p>
              <p className="font-medium text-gray-900">
                {request.property?.propertyNumber} - {request.property?.address}
              </p>
              {request.property?.ward && (
                <p className="text-xs text-gray-500 mt-1">
                  Ward {request.property.ward?.wardNumber}: {request.property.ward?.wardName}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start">
            <User className="w-5 h-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-600">Requested By</p>
              <p className="font-medium text-gray-900">
                {request.requester?.firstName} {request.requester?.lastName}
              </p>
              <p className="text-xs text-gray-500">{request.requester?.email}</p>
            </div>
          </div>

          <div className="flex items-start">
            <Calendar className="w-5 h-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-600">Requested Date</p>
              <p className="font-medium text-gray-900">
                {new Date(request.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {request.processedAt && (
            <div className="flex items-start">
              <Calendar className="w-5 h-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
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

        <div className="mt-6 pt-6 border-t">
          <p className="text-sm text-gray-600 mb-1">Property Location</p>
          <p className="text-gray-900">{request.propertyLocation}</p>
        </div>

        {request.remarks && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-1">Remarks</p>
            <p className="text-gray-900">{request.remarks}</p>
          </div>
        )}

        {request.adminRemarks && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-1">Admin Remarks</p>
            <p className="text-gray-900">{request.adminRemarks}</p>
          </div>
        )}

        {request.documents && request.documents.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-primary-600" />
              Documents ({request.documents.length})
            </h3>
            <ul className="space-y-2">
              {request.documents.map((doc) => {
                const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                const fileUrl = doc.filePath?.startsWith('http') ? doc.filePath : `${baseUrl}${doc.filePath?.startsWith('/') ? doc.filePath : `/${doc.filePath || ''}`}`;
                return (
                  <li key={doc.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {DOCUMENT_TYPE_LABELS[doc.documentType] || doc.documentType} – {doc.documentName || doc.fileName}
                        </p>
                        <p className="text-xs text-gray-500">{(doc.fileSize / 1024).toFixed(2)} KB</p>
                      </div>
                    </div>
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center flex-shrink-0 ml-2"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      View
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {request.waterConnection && (
          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-gray-600 mb-1">Created Connection</p>
            <Link
              to={`/water/connections/${request.waterConnection.id}`}
              className="font-medium text-primary-600 hover:underline"
            >
              {request.waterConnection.connectionNumber}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default WaterConnectionRequestDetails;
