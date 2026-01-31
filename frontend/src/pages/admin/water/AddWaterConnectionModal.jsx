import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { waterConnectionAPI, propertyAPI, waterConnectionDocumentAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import { X, Plus, Upload, FileText, CheckCircle } from 'lucide-react';
import AddPropertyModal from '../../../components/AddPropertyModal';
import DocumentUploadModal from './DocumentUploadModal';

const AddWaterConnectionModal = ({ properties: initialProperties, onClose, onSuccess, propertyId: initialPropertyId = null, onPropertiesUpdate }) => {
  const [properties, setProperties] = useState(initialProperties || []);
  const [loading, setLoading] = useState(false);
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);
  const [createdConnectionId, setCreatedConnectionId] = useState(null);
  const [step, setStep] = useState('form'); // 'form', 'documents', 'activate'
  const [documents, setDocuments] = useState([]);
  const [mandatoryValidation, setMandatoryValidation] = useState({ isValid: false, missing: [] });
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm({
    defaultValues: {
      propertyId: initialPropertyId || '',
      connectionType: 'domestic',
      isMetered: false
    }
  });

  const isMetered = watch('isMetered');

  // Update properties when initialProperties changes
  useEffect(() => {
    if (initialProperties) {
      setProperties(initialProperties);
    }
  }, [initialProperties]);

  // Set propertyId if provided as prop
  useEffect(() => {
    if (initialPropertyId) {
      setValue('propertyId', initialPropertyId);
    }
  }, [initialPropertyId, setValue]);

  const handlePropertyCreated = async (newProperty) => {
    // Close property modal
    setShowAddPropertyModal(false);
    
    // Refresh properties list first to get the new property
    if (onPropertiesUpdate) {
      const updatedProperties = await onPropertiesUpdate();
      if (updatedProperties && Array.isArray(updatedProperties)) {
        setProperties(updatedProperties);
      }
    } else {
      // If no callback, add the new property to the list directly
      setProperties(prev => [...prev, newProperty]);
    }
    
    // Auto-select the newly created property
    setValue('propertyId', newProperty.id.toString());
    
    toast.success(`Property "${newProperty.propertyNumber}" created and selected!`);
  };

  const handlePropertySelectChange = (e) => {
    const value = e.target.value;
    if (value === '__add_property__') {
      // Reset selection and open modal
      setValue('propertyId', '');
      setShowAddPropertyModal(true);
    } else {
      setValue('propertyId', value);
    }
  };

  const fetchDocuments = async (connectionId) => {
    try {
      const response = await waterConnectionDocumentAPI.getAll({ waterConnectionId: connectionId });
      setDocuments(response.data.data.documents || []);
      setMandatoryValidation(response.data.data.mandatoryValidation || { isValid: false, missing: [] });
      
      // Keep in documents step even if all documents are uploaded
      // The activate button will show when mandatoryValidation.isValid is true
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };

  const handleDocumentUploaded = async () => {
    if (createdConnectionId) {
      await fetchDocuments(createdConnectionId);
      setShowDocumentModal(false);
    }
  };

  const handleActivateConnection = async () => {
    if (!mandatoryValidation.isValid) {
      toast.error('Please upload all mandatory documents first.');
      return;
    }

    try {
      setLoading(true);
      await waterConnectionAPI.update(createdConnectionId, { status: 'ACTIVE' });
      toast.success('Water connection activated successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to activate connection';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);

      // Use initialPropertyId if provided, otherwise use form value
      if (initialPropertyId) {
        data.propertyId = parseInt(initialPropertyId, 10);
      } else if (data.propertyId) {
        data.propertyId = parseInt(data.propertyId, 10);
      }

      // Convert isMetered to boolean (checkbox returns boolean)
      data.isMetered = Boolean(data.isMetered);

      // If not metered, clear meter number
      if (!data.isMetered) {
        data.meterNumber = null;
      }

      // Convert monthlyRate to number if provided
      if (data.monthlyRate) {
        data.monthlyRate = parseFloat(data.monthlyRate);
      }

      const response = await waterConnectionAPI.create(data);

      if (response.data.success) {
        const connectionId = response.data.data.waterConnection.id;
        setCreatedConnectionId(connectionId);
        setStep('documents');
        toast.success('Water connection created! Now upload mandatory documents.');
        // Fetch initial documents status
        fetchDocuments(connectionId);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to create water connection';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Add Water Connection</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Step 1: Form Fields */}
          {step === 'form' && (
            <>
              {/* Property Selection */}
              <div>
            <label className="label">
              Property <span className="text-red-500">*</span>
            </label>
            {initialPropertyId ? (
              <input
                type="text"
                value={properties.find(p => p.id === parseInt(initialPropertyId))?.propertyNumber || `Property ID: ${initialPropertyId}`}
                readOnly
                className="input bg-gray-100 cursor-not-allowed"
              />
            ) : (
              <div className="relative">
                <select
                  {...register('propertyId', { required: 'Property is required' })}
                  className="input pr-10"
                  onChange={handlePropertySelectChange}
                >
                  <option value="">Select Property</option>
                  <option value="__add_property__" className="font-semibold text-primary-600 bg-primary-50">
                    + Add New Property
                  </option>
                  {properties.map(property => (
                    <option key={property.id} value={property.id}>
                      {property.propertyNumber} - {property.address}
                      {property.ward?.wardName ? ` (${property.ward.wardName})` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowAddPropertyModal(true)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-primary-600 hover:text-primary-700 flex items-center text-sm font-medium"
                  title="Add New Property"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </button>
              </div>
            )}
            {errors.propertyId && (
              <p className="text-red-500 text-sm mt-1">{errors.propertyId.message}</p>
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

          {/* Is Metered - Toggle Switch */}
          <div>
            <label className="label">
              Is Metered <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center space-x-4">
              <span className={`text-sm font-medium ${!isMetered ? 'text-gray-900' : 'text-gray-500'}`}>
                Non-metered
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  {...register('isMetered')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
              <span className={`text-sm font-medium ${isMetered ? 'text-gray-900' : 'text-gray-500'}`}>
                Metered
              </span>
            </div>
            {errors.isMetered && (
              <p className="text-red-500 text-sm mt-1">{errors.isMetered.message}</p>
            )}
          </div>

          {/* Meter Number (only if metered) */}
          {isMetered && (
            <div>
              <label className="label">Meter Number</label>
              <input
                type="text"
                {...register('meterNumber')}
                className="input"
                placeholder="Enter meter serial number"
              />
            </div>
          )}

          {/* Pipe Size */}
          <div>
            <label className="label">Pipe Size (inches)</label>
            <input
              type="text"
              {...register('pipeSize')}
              className="input"
              placeholder="e.g., 0.5, 1, 1.5"
            />
          </div>

          {/* Monthly Rate (for non-metered) */}
          {!isMetered && (
            <div>
              <label className="label">Monthly Rate (₹)</label>
              <input
                type="number"
                step="0.01"
                {...register('monthlyRate', { 
                  valueAsNumber: true,
                  min: { value: 0, message: 'Monthly rate must be positive' }
                })}
                className="input"
                placeholder="Enter fixed monthly rate"
              />
              {errors.monthlyRate && (
                <p className="text-red-500 text-sm mt-1">{errors.monthlyRate.message}</p>
              )}
            </div>
          )}

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

              {/* Mandatory Documents Notice */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800 mb-2">📋 Mandatory Documents Required</h4>
                <p className="text-sm text-yellow-700 mb-2">
                  After creating the connection, you must upload the following mandatory documents:
                </p>
                <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                  <li>Application Form</li>
                  <li>ID Proof</li>
                  <li>Address Proof</li>
                </ul>
                <p className="text-sm text-yellow-700 mt-2">
                  The connection will be created in <strong>DRAFT</strong> status and can only be activated after all mandatory documents are uploaded.
                </p>
              </div>
            </>
          )}

          {/* Documents Section - Show after connection is created */}
          {step === 'documents' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">✅ Connection Created Successfully</h4>
                <p className="text-sm text-blue-700">
                  Please upload the mandatory documents to proceed with activation.
                </p>
              </div>

              {/* Mandatory Documents Status */}
              {!mandatoryValidation.isValid && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Mandatory Documents Missing</h4>
                  <p className="text-sm text-yellow-700 mb-2">The following documents are required:</p>
                  <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                    {mandatoryValidation.missing?.map((doc, index) => (
                      <li key={index}>{doc}</li>
                    ))}
                  </ul>
                </div>
              )}

              {mandatoryValidation.isValid && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    <p className="text-sm text-green-700 font-medium">
                      All mandatory documents have been uploaded.
                    </p>
                  </div>
                </div>
              )}

              {/* Uploaded Documents List */}
              {documents.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    Uploaded Documents ({documents.length})
                  </h4>
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <p className="text-sm font-medium">{doc.documentName}</p>
                          <p className="text-xs text-gray-500">{doc.documentType}</p>
                        </div>
                        <span className="text-xs text-gray-500">
                          {(doc.fileSize / 1024).toFixed(2)} KB
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4 pt-4 border-t">
            {step === 'form' && (
              <>
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
                  disabled={loading}
                  className="btn btn-primary"
                >
                  {loading ? 'Creating...' : 'Create Connection'}
                </button>
              </>
            )}

            {step === 'documents' && (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setShowDocumentModal(true)}
                  className="btn btn-primary flex items-center"
                  disabled={loading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Add Document
                </button>
                {mandatoryValidation.isValid && (
                  <button
                    type="button"
                    onClick={handleActivateConnection}
                    className="btn btn-success flex items-center"
                    disabled={loading}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {loading ? 'Creating...' : 'Create Connection'}
                  </button>
                )}
              </>
            )}
          </div>
        </form>
      </div>

      {/* Add Property Modal */}
      {showAddPropertyModal && (
        <AddPropertyModal
          onClose={() => setShowAddPropertyModal(false)}
          onSuccess={handlePropertyCreated}
        />
      )}

      {/* Document Upload Modal */}
      {showDocumentModal && createdConnectionId && (
        <DocumentUploadModal
          waterConnectionId={createdConnectionId}
          onClose={() => setShowDocumentModal(false)}
          onSuccess={handleDocumentUploaded}
        />
      )}
    </div>
  );
};

export default AddWaterConnectionModal;
