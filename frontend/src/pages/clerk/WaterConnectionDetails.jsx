import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { clerkAPI } from '../../services/api';
import { useStaffAuth } from '../../contexts/StaffAuthContext';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import { FileText, Download, Droplet, Home, MapPin } from 'lucide-react';

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
  const { user } = useStaffAuth();
  const [connection, setConnection] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConnection();
    fetchDocuments();
  }, [id]);

  const fetchConnection = async () => {
    try {
      const response = await clerkAPI.waterConnections.getById(id);
      setConnection(response.data.data.waterConnection);
    } catch (error) {
      toast.error('Failed to fetch water connection details');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const response = await clerkAPI.waterConnections.getDocuments(id);
      setDocuments(response.data.data.documents || []);
    } catch (error) {
      toast.error('Failed to fetch documents');
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Water Connection Details</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Droplet className="w-5 h-5 mr-2 text-blue-600" />
            Connection Information
          </h2>
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
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Home className="w-5 h-5 mr-2 text-green-600" />
            Property Information
          </h2>
          <dl className="space-y-3">
            {connection.property && (
              <>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Property Number</dt>
                  <dd>
                    <Link
                      to={`/clerk/properties/${connection.propertyId}`}
                      className="text-primary-600 hover:underline"
                    >
                      {connection.property.propertyNumber}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Address</dt>
                  <dd className="flex items-start">
                    <MapPin className="w-4 h-4 mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
                    <span>{connection.property.address}</span>
                  </dd>
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
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <FileText className="w-5 h-5 mr-2" />
          Documents ({documents.length})
        </h2>
        
        
        {documents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No documents uploaded yet</p>
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
                      <button
                        onClick={() => handleDownloadDocument(doc)}
                        className="text-blue-600 hover:text-blue-700"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default WaterConnectionDetails;
