import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { citizenAPI, propertyAPI, waterConnectionDocumentAPI } from '../../services/api';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import { MapPin, FileText, Upload } from 'lucide-react';

const MANDATORY_DOCUMENTS = [
  { key: 'APPLICATION_FORM', label: 'Application Form', description: 'Signed application form for water connection' },
  { key: 'ID_PROOF', label: 'ID Proof', description: 'Government-issued ID (Aadhaar, PAN, etc.)' },
  { key: 'ADDRESS_PROOF', label: 'Address Proof', description: 'Proof of address (utility bill, ration card, etc.)' }
];

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const WaterConnectionRequest = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [formData, setFormData] = useState({
    propertyId: '',
    propertyLocation: '',
    connectionType: 'domestic',
    remarks: ''
  });
  const [documents, setDocuments] = useState({
    APPLICATION_FORM: null,
    ID_PROOF: null,
    ADDRESS_PROOF: null
  });

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await citizenAPI.getProperties();
      setProperties(response.data.data.properties || []);
    } catch (error) {
      toast.error('Failed to fetch properties');
    } finally {
      setLoadingProperties(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (name === 'propertyId' && value) {
      const selectedProperty = properties.find((p) => p.id === parseInt(value));
      if (selectedProperty) {
        setFormData((prev) => ({
          ...prev,
          propertyId: value,
          propertyLocation: selectedProperty.address || ''
        }));
      }
    }
  };

  const handleFileChange = (documentType, file) => {
    if (!file) {
      setDocuments((prev) => ({ ...prev, [documentType]: null }));
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`${file.name}: File size must be less than 5MB`);
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(`${file.name}: Only PDF, JPEG and PNG files are allowed`);
      return;
    }
    setDocuments((prev) => ({ ...prev, [documentType]: file }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.propertyId || !formData.propertyLocation || !formData.connectionType) {
      toast.error('Please fill in all required fields');
      return;
    }

    const missing = MANDATORY_DOCUMENTS.filter((d) => !documents[d.key]);
    if (missing.length > 0) {
      toast.error(`Please upload all mandatory documents: ${missing.map((d) => d.label).join(', ')}`);
      return;
    }

    setLoading(true);
    try {
      const createPayload = {
        propertyId: parseInt(formData.propertyId, 10),
        propertyLocation: formData.propertyLocation,
        connectionType: formData.connectionType,
        remarks: formData.remarks || undefined
      };
      const createRes = await citizenAPI.createWaterConnectionRequest(createPayload);
      const requestId = createRes.data.data.request.id;

      for (const { key } of MANDATORY_DOCUMENTS) {
        const file = documents[key];
        if (file) {
          const fd = new FormData();
          fd.append('file', file);
          fd.append('documentType', key);
          fd.append('waterConnectionRequestId', requestId);
          await waterConnectionDocumentAPI.uploadForRequest(fd);
        }
      }

      await citizenAPI.submitWaterConnectionRequest(requestId);
      toast.success('Water connection request submitted successfully!');
      navigate('/citizen/water-connections?tab=requests');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  if (loadingProperties) return <Loading />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="ds-page-title">Request Water Connection</h1>
        <p className="text-gray-600 mt-2">Submit a request for a new water connection</p>
      </div>

      <div className="card max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="propertyId" className="label">
              Select Property <span className="text-red-500">*</span>
            </label>
            <select
              id="propertyId"
              name="propertyId"
              value={formData.propertyId}
              onChange={handleChange}
              required
              className="input"
            >
              <option value="">Select a property</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.propertyNumber} - {property.address}
                </option>
              ))}
            </select>
            {properties.length === 0 && (
              <p className="text-sm text-gray-500 mt-1">No properties found. Please add a property first.</p>
            )}
          </div>

          <div>
            <label htmlFor="propertyLocation" className="label">
              Property Location/Address <span className="text-red-500">*</span>
            </label>
            <textarea
              id="propertyLocation"
              name="propertyLocation"
              value={formData.propertyLocation}
              onChange={handleChange}
              required
              rows={4}
              className="input"
              placeholder="Enter detailed property location and address for water connection"
            />
            <p className="text-sm text-gray-500 mt-1">
              Provide detailed location information to help with connection installation
            </p>
          </div>

          <div>
            <label htmlFor="connectionType" className="label">
              Connection Type <span className="text-red-500">*</span>
            </label>
            <select
              id="connectionType"
              name="connectionType"
              value={formData.connectionType}
              onChange={handleChange}
              required
              className="input"
            >
              <option value="domestic">Domestic</option>
              <option value="commercial">Commercial</option>
              <option value="industrial">Industrial</option>
            </select>
          </div>

          <div>
            <label htmlFor="remarks" className="label">
              Additional Remarks (Optional)
            </label>
            <textarea
              id="remarks"
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              rows={3}
              className="input"
              placeholder="Any additional information or special requirements"
            />
          </div>

          {/* Mandatory documents */}
          <div className="border border-amber-200 rounded-lg bg-amber-50/50 p-4">
            <h3 className="font-semibold text-gray-900 mb-1 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-amber-600" />
              Mandatory Documents <span className="text-red-500">*</span>
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload the following documents. Your request will be reviewed by the admin after submission.
            </p>
            <div className="space-y-4">
              {MANDATORY_DOCUMENTS.map(({ key, label, description }) => (
                <div key={key}>
                  <label className="label">
                    {label} <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-1">{description}</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange(key, e.target.files?.[0] || null)}
                      className="input flex-1 text-sm"
                    />
                    {documents[key] && (
                      <span className="text-sm text-green-600 flex items-center">
                        <Upload className="w-4 h-4 mr-1" />
                        {documents[key].name}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-amber-800 mt-2">
              Allowed: PDF, JPEG, PNG. Max size: 5MB per file.
            </p>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading || properties.length === 0}
              className="btn btn-primary bg-primary-600 hover:bg-primary-700"
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/citizen/water-connections')}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WaterConnectionRequest;
