import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { citizenAPI } from '../../services/api';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import { FileText, Download, Droplet, Building2, MapPin } from 'lucide-react';
import DetailPageLayout, { DetailRow } from '../../components/DetailPageLayout';

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

const CitizenWaterConnectionDetails = () => {
  const { id } = useParams();
  const [connection, setConnection] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConnection();
  }, [id]);

  const fetchConnection = async () => {
    try {
      const response = await citizenAPI.getWaterConnectionById(id);
      setConnection(response.data.data.waterConnection);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch water connection details');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadDocument = (document) => {
    const filePath = document.filePath.startsWith('/uploads/')
      ? document.filePath
      : `/uploads/${document.fileName}`;
    const fileUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${filePath}`;
    window.open(fileUrl, '_blank');
  };

  const isMandatory = (documentType) => {
    return MANDATORY_DOCUMENT_TYPES.includes(documentType);
  };

  if (loading) return <Loading />;
  if (!connection) return <div className="card text-center py-8 text-gray-600">Water connection not found</div>;

  const documents = connection.documents || [];

  const statusBadgeClass = () => {
    const s = (connection.status || '').toUpperCase();
    if (s === 'ACTIVE') return 'badge-success';
    if (s === 'DRAFT') return 'badge-warning';
    if (s === 'DISCONNECTED') return 'badge-danger';
    return 'badge-info';
  };

  return (
    <DetailPageLayout
      title="Water Connection Details"
      subtitle={connection.connectionNumber}
      actionButtons={
        <Link to="/citizen/water-connections" className="text-primary-600 hover:text-primary-700 font-medium text-sm">
          ← Back to My Water Connections
        </Link>
      }
      summarySection={
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="stat-card-title"><span>Connection Number</span></div>
            <p className="stat-card-value text-lg font-bold text-primary-600">{connection.connectionNumber}</p>
          </div>
          <div className="stat-card">
            <div className="stat-card-title"><span>Status</span></div>
            <p className="stat-card-value text-base">
              <span className={`badge ${statusBadgeClass()}`}>{connection.status || '—'}</span>
            </p>
          </div>
          <div className="stat-card">
            <div className="stat-card-title"><span>Type</span></div>
            <p className="stat-card-value text-lg capitalize">{connection.connectionType || '—'}</p>
          </div>
          <div className="stat-card">
            <div className="stat-card-title"><span>Ward</span></div>
            <p className="stat-card-value text-lg">
              {connection.property?.ward ? `Ward ${connection.property.ward.wardNumber}: ${connection.property.ward.wardName}` : '—'}
            </p>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card flex flex-col">
          <h2 className="form-section-title flex items-center">
            <Droplet className="w-5 h-5 mr-2 text-primary-600" />
            Connection Information
          </h2>
          <div className="flex-1">
            <dl>
              <DetailRow label="Connection Number" value={connection.connectionNumber} valueClass="font-semibold" />
              <DetailRow
                label="Connection Type"
                value={<span className="badge badge-info capitalize">{connection.connectionType}</span>}
              />
              <DetailRow
                label="Meter Type"
                value={connection.isMetered ? <span className="badge badge-success">Metered</span> : <span className="badge badge-secondary">Non-metered</span>}
              />
              {connection.meterNumber && <DetailRow label="Meter Number" value={connection.meterNumber} />}
              <DetailRow
                label="Status"
                value={<span className={`badge ${statusBadgeClass()}`}>{connection.status}</span>}
              />
              <DetailRow
                label="Connection Date"
                value={connection.connectionDate ? new Date(connection.connectionDate).toLocaleDateString() : null}
              />
              {connection.pipeSize != null && connection.pipeSize !== '' && (
                <DetailRow label="Pipe Size" value={`${connection.pipeSize} inches`} />
              )}
              {connection.monthlyRate != null && connection.monthlyRate !== '' && (
                <DetailRow
                  label="Monthly Rate"
                  value={`₹${parseFloat(connection.monthlyRate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                />
              )}
              {connection.remarks && <DetailRow label="Remarks" value={connection.remarks} />}
            </dl>
          </div>
        </div>

        <div className="card flex flex-col">
          <h2 className="form-section-title flex items-center">
            <Building2 className="w-5 h-5 mr-2 text-primary-600" />
            Property Information
          </h2>
          <div className="flex-1">
            {connection.property ? (
              <dl>
                <DetailRow
                  label="Property Number"
                  value={
                    <Link to={`/citizen/properties/${connection.propertyId}`} className="text-primary-600 hover:underline font-medium">
                      {connection.property.propertyNumber}
                    </Link>
                  }
                />
                <DetailRow
                  label="Address"
                  value={
                    <span className="flex items-start">
                      <MapPin className="w-4 h-4 mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
                      <span>{connection.property.address}</span>
                    </span>
                  }
                />
                {connection.property.ward && (
                  <DetailRow label="Ward" value={`Ward ${connection.property.ward.wardNumber}: ${connection.property.ward.wardName}`} />
                )}
              </dl>
            ) : (
              <p className="text-gray-500 text-sm py-2">No property linked</p>
            )}
          </div>
        </div>

        <div className="card flex flex-col lg:col-span-2">
          <h2 className="form-section-title flex items-center">
            <FileText className="w-5 h-5 mr-2 text-primary-600" />
            Documents ({documents.length})
          </h2>
          <div className="flex-1">
            {documents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-sm">No documents uploaded yet</p>
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
                        <td>{(doc.fileSize / 1024).toFixed(2)} KB</td>
                        <td>
                          {doc.uploader ? `${doc.uploader.firstName} ${doc.uploader.lastName}` : 'N/A'}
                        </td>
                        <td>{new Date(doc.uploadedAt).toLocaleDateString()}</td>
                        <td>
                          <button
                            onClick={() => handleDownloadDocument(doc)}
                            className="text-primary-600 hover:text-primary-700"
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
      </div>
    </DetailPageLayout>
  );
};

export default CitizenWaterConnectionDetails;
