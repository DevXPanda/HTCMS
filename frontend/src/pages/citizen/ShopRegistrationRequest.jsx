import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { citizenAPI, uploadAPI } from '../../services/api';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import { Store, CheckCircle, XCircle, Clock, MapPin, Calendar, User, Upload, X, FileText } from 'lucide-react';

const ShopRegistrationRequest = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [request, setRequest] = useState(null);
  const [properties, setProperties] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [formData, setFormData] = useState({
    propertyId: '',
    shopName: '',
    shopType: 'retail',
    category: '',
    area: '',
    address: '',
    tradeLicenseNumber: '',
    remarks: ''
  });
  const [documents, setDocuments] = useState([]);
  const [uploadingDocs, setUploadingDocs] = useState(false);

  useEffect(() => {
    if (id) {
      setViewMode(true);
      fetchRequest();
    } else {
      fetchProperties();
    }
  }, [id]);

  const fetchRequest = async () => {
    try {
      setLoading(true);
      const response = await citizenAPI.getShopRegistrationRequestById(id);
      const req = response.data.data.request;
      setRequest(req);
      setFormData({
        propertyId: req.propertyId,
        shopName: req.shopName,
        shopType: req.shopType,
        category: req.category || '',
        area: req.area || '',
        address: req.address || '',
        tradeLicenseNumber: req.tradeLicenseNumber || '',
        remarks: req.remarks || ''
      });
    } catch (error) {
      toast.error('Failed to load request details');
      navigate('/citizen/shop-registration-requests');
    } finally {
      setLoading(false);
    }
  };

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

    // Auto-fill address if property is selected
    if (name === 'propertyId' && value) {
      const selectedProperty = properties.find(p => p.id === parseInt(value));
      if (selectedProperty) {
        setFormData(prev => ({
          ...prev,
          propertyId: value,
          address: selectedProperty.address || ''
        }));
      }
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Validate file types and sizes
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name}: Invalid file type. Only PDF, JPEG, PNG, GIF, and WebP files are allowed.`);
        continue;
      }
      if (file.size > maxSize) {
        toast.error(`${file.name}: File size must be less than 5MB`);
        continue;
      }

      // Upload file
      setUploadingDocs(true);
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await uploadAPI.uploadShopRegistrationDocument(formData);
        const uploadedDoc = {
          fileName: response.data.data.filename,
          originalName: response.data.data.originalName,
          url: response.data.data.url,
          size: response.data.data.size,
          mimetype: response.data.data.mimetype
        };

        setDocuments(prev => [...prev, uploadedDoc]);
        toast.success(`${file.name} uploaded successfully`);
      } catch (error) {
        const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
        toast.error(`Failed to upload ${file.name}: ${errorMessage}`);
        console.error('Upload error:', error);
        console.error('Error response:', error.response?.data);
      } finally {
        setUploadingDocs(false);
      }
    }
  };

  const removeDocument = (index) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.propertyId || !formData.shopName || !formData.shopType) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const requestData = {
        ...formData,
        documents: documents.length > 0 ? documents : []
      };
      
      console.log('Submitting shop registration request with documents:', requestData.documents);
      
      const response = await citizenAPI.createShopRegistrationRequest(requestData);
      
      if (response.data.success) {
        toast.success('Shop registration request submitted successfully!');
        navigate('/citizen/shop-registration-requests');
      } else {
        toast.error(response.data.message || 'Failed to submit request');
      }
    } catch (error) {
      console.error('Error submitting shop registration request:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to submit request';
      if (error.response?.data?.code === 'DUPLICATE_REQUEST') {
        toast.error('A pending request already exists for this shop name on this property');
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: (
        <span className="px-3 py-1 text-sm font-semibold rounded-full bg-yellow-100 text-yellow-800 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Pending Review
        </span>
      ),
      approved: (
        <span className="px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Approved
        </span>
      ),
      rejected: (
        <span className="px-3 py-1 text-sm font-semibold rounded-full bg-red-100 text-red-800 flex items-center gap-2">
          <XCircle className="w-4 h-4" />
          Rejected
        </span>
      )
    };
    return badges[status] || badges.pending;
  };

  if (viewMode && loading) return <Loading />;
  if (viewMode && !request) return null;
  if (!viewMode && loadingProperties) return <Loading />;

  if (viewMode) {
    return (
      <div>
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Store className="w-8 h-8" />
                Shop Registration Request Details
              </h1>
              <p className="text-gray-600 mt-2">Request Number: {request.requestNumber}</p>
            </div>
            {getStatusBadge(request.status)}
          </div>
        </div>

        <div className="card max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Shop Information</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Shop Name</p>
                  <p className="font-medium text-gray-900">{request.shopName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Shop Type</p>
                  <p className="font-medium text-gray-900 capitalize">{request.shopType}</p>
                </div>
                {request.category && (
                  <div>
                    <p className="text-sm text-gray-600">Category</p>
                    <p className="font-medium text-gray-900">{request.category}</p>
                  </div>
                )}
                {request.area && (
                  <div>
                    <p className="text-sm text-gray-600">Area</p>
                    <p className="font-medium text-gray-900">{request.area} sq. meters</p>
                  </div>
                )}
                {request.tradeLicenseNumber && (
                  <div>
                    <p className="text-sm text-gray-600">Trade License Number</p>
                    <p className="font-medium text-gray-900">{request.tradeLicenseNumber}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Property Information</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    Property
                  </p>
                  <p className="font-medium text-gray-900">
                    {request.property?.propertyNumber || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-500">{request.property?.address || 'N/A'}</p>
                  {request.property?.ward && (
                    <p className="text-sm text-gray-500">
                      Ward: {request.property.ward.wardNumber && request.property.ward.wardNumber !== '0' 
                        ? `${request.property.ward.wardNumber} - ` 
                        : ''}{request.property.ward.wardName}
                    </p>
                  )}
                </div>
                {request.address && (
                  <div>
                    <p className="text-sm text-gray-600">Shop Address</p>
                    <p className="font-medium text-gray-900">{request.address}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {request.documents && Array.isArray(request.documents) && request.documents.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Documents</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {request.documents.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-gray-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{doc.originalName || doc.fileName}</p>
                        <p className="text-xs text-gray-500">
                          {(doc.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    {doc.url && (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700 text-sm"
                      >
                        View
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {request.remarks && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Remarks</h3>
              <p className="text-gray-900">{request.remarks}</p>
            </div>
          )}

          {request.adminRemarks && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Review Remarks</h3>
              <p className="text-gray-900">{request.adminRemarks}</p>
              {request.reviewer && (
                <p className="text-sm text-gray-500 mt-2">
                  Reviewed by: {request.reviewer.firstName} {request.reviewer.lastName}
                </p>
              )}
              {request.reviewedAt && (
                <p className="text-sm text-gray-500">
                  Reviewed on: {new Date(request.reviewedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {request.shop && (
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <h3 className="text-lg font-semibold text-green-900 mb-2">Shop Created</h3>
              <p className="text-green-900">
                Shop Number: {request.shop.shopNumber} - {request.shop.shopName}
              </p>
            </div>
          )}

          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              Submitted: {new Date(request.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Store className="w-8 h-8" />
          Apply for Shop Registration
        </h1>
        <p className="text-gray-600 mt-2">Submit a request for shop registration (trade license)</p>
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
              <p className="text-sm text-gray-500 mt-1">
                No properties found. Please add a property first.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="shopName" className="label">
              Shop Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="shopName"
              name="shopName"
              value={formData.shopName}
              onChange={handleChange}
              required
              className="input"
              placeholder="Enter shop name"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="shopType" className="label">
                Shop Type <span className="text-red-500">*</span>
              </label>
              <select
                id="shopType"
                name="shopType"
                value={formData.shopType}
                onChange={handleChange}
                required
                className="input"
              >
                <option value="retail">Retail</option>
                <option value="wholesale">Wholesale</option>
                <option value="service">Service</option>
                <option value="restaurant">Restaurant</option>
                <option value="hotel">Hotel</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="category" className="label">
                Category (Optional)
              </label>
              <input
                type="text"
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="input"
                placeholder="e.g., Electronics, Grocery"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="area" className="label">
                Shop Area (sq. meters)
              </label>
              <input
                type="number"
                id="area"
                name="area"
                value={formData.area}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="input"
                placeholder="Enter area"
              />
            </div>

            <div>
              <label htmlFor="tradeLicenseNumber" className="label">
                Trade License Number (Optional)
              </label>
              <input
                type="text"
                id="tradeLicenseNumber"
                name="tradeLicenseNumber"
                value={formData.tradeLicenseNumber}
                onChange={handleChange}
                className="input"
                placeholder="If already exists"
              />
            </div>
          </div>

          <div>
            <label htmlFor="address" className="label">
              Shop Address
            </label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={3}
              className="input"
              placeholder="Shop address (if different from property address)"
            />
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
              placeholder="Any additional information"
            />
          </div>

          <div>
            <label className="label">
              Supporting Documents (Optional)
            </label>
            <div className="mt-2">
              <label
                htmlFor="documents"
                className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-colors"
              >
                <div className="flex flex-col items-center">
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">
                    {uploadingDocs ? 'Uploading...' : 'Click to upload documents'}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    PDF, JPEG, PNG, GIF, WebP (Max 5MB each)
                  </span>
                </div>
                <input
                  id="documents"
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                  onChange={handleFileChange}
                  disabled={uploadingDocs}
                  className="hidden"
                />
              </label>
            </div>
            {documents.length > 0 && (
              <div className="mt-4 space-y-2">
                {documents.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-gray-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{doc.originalName}</p>
                        <p className="text-xs text-gray-500">
                          {(doc.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDocument(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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
              onClick={() => navigate('/citizen/shop-registration-requests')}
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

export default ShopRegistrationRequest;
