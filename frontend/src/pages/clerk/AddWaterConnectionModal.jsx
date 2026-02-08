import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { clerkAPI, propertyAPI } from '../../services/api';
import { useStaffAuth } from '../../contexts/StaffAuthContext';
import toast from 'react-hot-toast';
import { X, Upload, FileText, CheckCircle } from 'lucide-react';

const AddWaterConnectionModal = ({ properties: initialProperties, onClose, onSuccess, onPropertiesUpdate }) => {
  const { user } = useStaffAuth();
  const [properties, setProperties] = useState(initialProperties || []);
  const [loading, setLoading] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [documents, setDocuments] = useState({
    applicationForm: null,
    idProof: null,
    addressProof: null
  });
  const [uploadedFiles, setUploadedFiles] = useState({
    applicationForm: null,
    idProof: null,
    addressProof: null
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm({
    defaultValues: {
      propertyId: '',
      propertyLocation: '',
      connectionType: 'domestic',
      remarks: ''
    }
  });

  // Update properties when initialProperties changes
  useEffect(() => {
    if (initialProperties) {
      setProperties(initialProperties);
    }
  }, [initialProperties]);

  // Fetch properties filtered by clerk's ward
  useEffect(() => {
    fetchWardProperties();
  }, []);

  const fetchWardProperties = async () => {
    try {
      const params = { limit: 1000, isActive: true };
      if (user?.ward_ids && user.ward_ids.length > 0) {
        params.wardId = user.ward_ids[0]; // Clerks are assigned exactly one ward
      }

      const response = await propertyAPI.getAll(params);
      const propertiesList = response.data.data.properties || [];
      setProperties(propertiesList);
    } catch (error) {
      console.error('Failed to fetch properties:', error);
      toast.error('Failed to fetch properties');
    }
  };

  const handleFileChange = (documentType, file) => {
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    // Validate file type (PDF, JPG, PNG)
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      toast.error('Only PDF, JPG, and PNG files are allowed');
      return;
    }

    setDocuments(prev => ({
      ...prev,
      [documentType]: file
    }));
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);

      // Validate that selected property is in clerk's ward
      if (data.propertyId) {
        const selectedProperty = properties.find(p => p.id === parseInt(data.propertyId));
        if (selectedProperty && user?.ward_ids && user.ward_ids.length > 0) {
          if (selectedProperty.wardId !== user.ward_ids[0]) {
            toast.error('You can only create water connection requests for properties in your assigned ward.');
            return;
          }
        }
      }

      // Validate required documents
      if (!documents.applicationForm || !documents.idProof || !documents.addressProof) {
        toast.error('Please upload all required documents (Application Form, ID Proof, and Address Proof)');
        setLoading(false);
        return;
      }

      // Upload documents first
      setUploadingDocs(true);
      const uploadedDocs = {};

      try {
        for (const [docType, file] of Object.entries(documents)) {
          if (file) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('documentType', docType.toUpperCase());

            // Upload to backend
            const uploadResponse = await clerkAPI.uploadDocument(formData);
            uploadedDocs[docType] = uploadResponse.data.data;

            setUploadedFiles(prev => ({
              ...prev,
              [docType]: uploadResponse.data.data
            }));
          }
        }
      } catch (uploadError) {
        toast.error('Failed to upload documents. Please try again.');
        setUploadingDocs(false);
        setLoading(false);
        return;
      }

      setUploadingDocs(false);

      // Prepare request data with documents
      const requestData = {
        propertyId: parseInt(data.propertyId, 10),
        propertyLocation: data.propertyLocation,
        connectionType: data.connectionType,
        remarks: data.remarks || '',
        documents: uploadedDocs
      };

      // Create and submit water connection request
      const response = await clerkAPI.waterConnectionRequests.createAndSubmit(requestData);

      if (response.data.success) {
        toast.success('Water connection request submitted successfully! It will be reviewed by an inspector.');
        onSuccess();
        onClose();
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to create water connection request';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Submit Water Connection Request</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Step 1: Form Fields */}
          {/* Ward Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">📍 Ward Information</h4>
            <p className="text-sm text-blue-700">
              You are creating water connections for Ward ID: {user?.ward_ids?.[0] || 'N/A'}
            </p>
            <p className="text-sm text-blue-700">
              Only properties from your assigned ward are shown below.
            </p>
          </div>

          {/* Property Selection */}
          <div>
            <label className="label">
              Property <span className="text-red-500">*</span>
            </label>
            <select
              {...register('propertyId', { required: 'Property is required' })}
              className="input"
            >
              <option value="">Select Property</option>
              {properties.map(property => (
                <option key={property.id} value={property.id}>
                  {property.propertyNumber} - {property.address}
                  {property.ward?.wardName ? ` (${property.ward.wardName})` : ''}
                </option>
              ))}
            </select>
            {errors.propertyId && (
              <p className="text-red-500 text-sm mt-1">{errors.propertyId.message}</p>
            )}
            {properties.length === 0 && (
              <p className="text-yellow-600 text-sm mt-1">
                No properties found in your assigned ward.
              </p>
            )}
          </div>

          {/* Connection Type */}
          <div>
            <label className="label">
              Connection Type <span className="text-red-500">*</span>
            </label>
            <select
              {...register('connectionType', { required: 'Connection type is required' })}
              className="input"
            >
              <option value="domestic">Domestic</option>
              <option value="commercial">Commercial</option>
              <option value="industrial">Industrial</option>
            </select>
            {errors.connectionType && (
              <p className="text-red-500 text-sm mt-1">{errors.connectionType.message}</p>
            )}
          </div>

          {/* Property Location */}
          <div>
            <label className="label">
              Property Location <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register('propertyLocation', { required: 'Property location is required' })}
              className="input"
              rows="3"
              placeholder="Enter detailed property location/address for water connection"
            />
            {errors.propertyLocation && (
              <p className="text-red-500 text-sm mt-1">{errors.propertyLocation.message}</p>
            )}
          </div>

          {/* Remarks */}
          <div>
            <label className="label">Remarks</label>
            <textarea
              {...register('remarks')}
              className="input"
              rows="3"
              placeholder="Any additional notes..."
            />
          </div>

          {/* Document Uploads */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Required Documents</h3>

            {/* Application Form */}
            <div>
              <label className="label">Application Form <span className="text-red-500">*</span></label>
              <label className="cursor-pointer block">
                <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${documents.applicationForm ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-primary-500'
                  }`}>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileChange('applicationForm', e.target.files[0])} className="hidden" />
                  <div className="flex items-center justify-center space-x-2">
                    {documents.applicationForm ? (
                      <><CheckCircle className="w-5 h-5 text-green-600" /><span className="text-sm text-green-700 font-medium">{documents.applicationForm.name}</span></>
                    ) : (
                      <><Upload className="w-5 h-5 text-gray-400" /><span className="text-sm text-gray-600">Click to upload</span></>
                    )}
                  </div>
                </div>
              </label>
              <p className="text-xs text-gray-500 mt-1">PDF, JPG, or PNG (max 5MB)</p>
            </div>

            {/* ID Proof */}
            <div>
              <label className="label">ID Proof <span className="text-red-500">*</span></label>
              <label className="cursor-pointer block">
                <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${documents.idProof ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-primary-500'
                  }`}>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileChange('idProof', e.target.files[0])} className="hidden" />
                  <div className="flex items-center justify-center space-x-2">
                    {documents.idProof ? (
                      <><CheckCircle className="w-5 h-5 text-green-600" /><span className="text-sm text-green-700 font-medium">{documents.idProof.name}</span></>
                    ) : (
                      <><Upload className="w-5 h-5 text-gray-400" /><span className="text-sm text-gray-600">Click to upload</span></>
                    )}
                  </div>
                </div>
              </label>
              <p className="text-xs text-gray-500 mt-1">PDF, JPG, or PNG (max 5MB)</p>
            </div>

            {/* Address Proof */}
            <div>
              <label className="label">Address Proof <span className="text-red-500">*</span></label>
              <label className="cursor-pointer block">
                <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${documents.addressProof ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-primary-500'
                  }`}>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileChange('addressProof', e.target.files[0])} className="hidden" />
                  <div className="flex items-center justify-center space-x-2">
                    {documents.addressProof ? (
                      <><CheckCircle className="w-5 h-5 text-green-600" /><span className="text-sm text-green-700 font-medium">{documents.addressProof.name}</span></>
                    ) : (
                      <><Upload className="w-5 h-5 text-gray-400" /><span className="text-sm text-gray-600">Click to upload</span></>
                    )}
                  </div>
                </div>
              </label>
              <p className="text-xs text-gray-500 mt-1">PDF, JPG, or PNG (max 5MB)</p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">⚠️ <strong>Mandatory:</strong> Upload all three documents before submitting.</p>
            </div>
          </div>

          {/* Inspection Workflow Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">🔍 Inspection Workflow</h4>
            <p className="text-sm text-blue-700 mb-2">
              This request will be submitted for inspection with status <strong>SUBMITTED</strong>.
            </p>
            <p className="text-sm text-blue-700">
              An inspector from your ward will review the request and either approve, reject, or return it for corrections. Once approved, the actual water connection will be created.
            </p>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploadingDocs || properties.length === 0}
              className="btn btn-primary"
            >
              {uploadingDocs ? 'Uploading Documents...' : loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div >
  );
};

export default AddWaterConnectionModal;
