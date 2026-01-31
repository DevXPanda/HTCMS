import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { waterConnectionAPI, waterConnectionDocumentAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { ArrowLeft, FileText, Upload, Trash2, Download, AlertCircle, CheckCircle, Power } from 'lucide-react';
import DocumentUploadModal from './DocumentUploadModal';

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

const MANDATORY_DOCUMENT_TYPES = ['APPLICATION_FORM', 'ID_PROOF', 'ADDRESS_PROOF'];

const WaterConnectionDetails = () => {
  const { id } = useParams();
  const [connection, setConnection] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [mandatoryValidation, setMandatoryValidation] = useState({ isValid: false, missing: [] });
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    fetchConnection();
    fetchDocuments();
  }, [id]);

  const fetchConnection = async () => {
    try {
      const response = await waterConnectionAPI.getById(id);
      setConnection(response.data.data.waterConnection);
    } catch (error) {
      toast.error('Failed to fetch water connection details');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await waterConnectionDocumentAPI.getAll({ waterConnectionId: id });
      setDocuments(response.data.data.documents || []);
      setMandatoryValidation(response.data.data.mandatoryValidation || { isValid: false, missing: [] });
    } catch (error) {
      toast.error('Failed to fetch documents');
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await waterConnectionDocumentAPI.delete(documentId);
      toast.success('Document deleted successfully');
      fetchDocuments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete document');
    }
  };

  const handleDownloadDocument = (document) => {
    // Construct file URL - filePath should already be /uploads/filename
    const filePath = document.filePath.startsWith('/uploads/') 
      ? document.filePath 
      : `/uploads/${document.fileName}`;
    const fileUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${filePath}`;
    window.open(fileUrl, '_blank');
  };

  const handleActivateConnection = async () => {
    if (!mandatoryValidation.isValid) {
      toast.error('Cannot activate connection. Please upload all mandatory documents first.');
      return;
    }

    if (!window.confirm('Are you sure you want to activate this water connection?')) {
      return;
    }

    try {
      await waterConnectionAPI.update(id, { status: 'ACTIVE' });
      toast.success('Water connection activated successfully');
      fetchConnection();
      fetchDocuments();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to activate connection';
      if (error.response?.data?.data?.missingDocuments) {
        toast.error(`${errorMessage}: ${error.response.data.data.missingDocuments.join(', ')}`);
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'ACTIVE': 'badge-success',
      'DRAFT': 'badge-warning',
      'DISCONNECTED': 'badge-danger'
    };
    return badges[status] || 'badge-info';
  };

  const isMandatory = (documentType) => {
    return MANDATORY_DOCUMENT_TYPES.includes(documentType);
  };

  if (loading) return <Loading />;
  if (!connection) return <div>Water connection not found</div>;

  return (
    <div>
      <Link to="/water/connections" className="flex items-center text-primary-600 mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Water Connections
      </Link>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Water Connection Details</h1>
        <div className="flex items-center space-x-3">
          {connection.status === 'DRAFT' && mandatoryValidation.isValid && (
            <button
              onClick={handleActivateConnection}
              className="btn btn-success flex items-center"
            >
              <Power className="w-4 h-4 mr-2" />
              Activate Connection
            </button>
          )}
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn btn-primary flex items-center"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </button>
        </div>
      </div>

      {/* Mandatory Documents Warning */}
      {!mandatoryValidation.isValid && (
        <div className="card mb-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-800 mb-2">Mandatory Documents Missing</h3>
              <p className="text-sm text-yellow-700 mb-2">
                The following mandatory documents are required:
              </p>
              <ul className="list-disc list-inside text-sm text-yellow-700">
                {mandatoryValidation.missing?.map((doc, index) => (
                  <li key={index}>{doc}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {mandatoryValidation.isValid && (
        <div className="card mb-6 bg-green-50 border-green-200">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
            <p className="text-sm text-green-700 font-medium">
              All mandatory documents have been uploaded.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Connection Information</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Connection Number</dt>
              <dd className="text-lg font-semibold">{connection.connectionNumber}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Connection Type</dt>
              <dd>
                <span className="badge badge-info capitalize">
                  {connection.connectionType}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Meter Type</dt>
              <dd>
                {connection.isMetered ? (
                  <span className="badge badge-success">Metered</span>
                ) : (
                  <span className="badge badge-secondary">Non-metered</span>
                )}
              </dd>
            </div>
            {connection.meterNumber && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Meter Number</dt>
                <dd>{connection.meterNumber}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd>
                <span className={`badge ${getStatusBadge(connection.status)}`}>
                  {connection.status}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Connection Date</dt>
              <dd>
                {connection.connectionDate
                  ? new Date(connection.connectionDate).toLocaleDateString()
                  : '-'
                }
              </dd>
            </div>
            {connection.pipeSize && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Pipe Size</dt>
                <dd>{connection.pipeSize} inches</dd>
              </div>
            )}
            {connection.monthlyRate && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Monthly Rate</dt>
                <dd>₹{parseFloat(connection.monthlyRate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</dd>
              </div>
            )}
            {connection.remarks && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Remarks</dt>
                <dd className="text-sm text-gray-700">{connection.remarks}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Property Information</h2>
          <dl className="space-y-3">
            {connection.property && (
              <>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Property Number</dt>
                  <dd>
                    <Link
                      to={`/properties/${connection.propertyId}`}
                      className="text-primary-600 hover:underline"
                    >
                      {connection.property.propertyNumber}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Address</dt>
                  <dd>{connection.property.address}</dd>
                </div>
                {connection.property.ward && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Ward</dt>
                    <dd>{connection.property.ward.wardName}</dd>
                  </div>
                )}
              </>
            )}
          </dl>
        </div>
      </div>

      {/* Documents Section */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Documents ({documents.length})
          </h2>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No documents uploaded yet</p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn btn-primary mt-4"
            >
              Upload First Document
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Document Type</th>
                  <th>Document Name</th>
                  <th>File Size</th>
                  <th>Uploaded By</th>
                  <th>Uploaded At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <div className="flex items-center">
                        <span className="badge badge-info">
                          {DOCUMENT_TYPE_LABELS[doc.documentType] || doc.documentType}
                        </span>
                        {isMandatory(doc.documentType) && (
                          <span className="ml-2 text-xs text-red-600 font-semibold">*</span>
                        )}
                      </div>
                    </td>
                    <td className="font-medium">{doc.documentName}</td>
                    <td>
                      {(doc.fileSize / 1024).toFixed(2)} KB
                    </td>
                    <td>
                      {doc.uploader
                        ? `${doc.uploader.firstName} ${doc.uploader.lastName}`
                        : 'N/A'
                      }
                    </td>
                    <td>
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleDownloadDocument(doc)}
                          className="text-blue-600 hover:text-blue-700"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="text-red-600 hover:text-red-700"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Document Upload Modal */}
      {showUploadModal && (
        <DocumentUploadModal
          waterConnectionId={id}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            fetchDocuments();
          }}
        />
      )}
    </div>
  );
};

export default WaterConnectionDetails;
