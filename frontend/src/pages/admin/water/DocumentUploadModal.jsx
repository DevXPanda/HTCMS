import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { waterConnectionDocumentAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import { X, Upload, FileText } from 'lucide-react';

const DOCUMENT_TYPES = {
  APPLICATION_FORM: 'Application Form',
  ID_PROOF: 'ID Proof',
  ADDRESS_PROOF: 'Address Proof',
  PROPERTY_DEED: 'Property Deed',
  METER_INSTALLATION_CERTIFICATE: 'Meter Installation Certificate',
  CONNECTION_AGREEMENT: 'Connection Agreement',
  NOC: 'No Objection Certificate (NOC)',
  OTHER: 'Other'
};

const DocumentUploadModal = ({ waterConnectionId, onClose, onSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm({
    defaultValues: {
      documentType: '',
      documentName: ''
    }
  });

  const documentType = watch('documentType');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp'
      ];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Invalid file type. Only PDF, JPEG, PNG, GIF, and WebP files are allowed.');
        return;
      }

      setSelectedFile(file);
      // Auto-fill document name if not provided
      if (!watch('documentName')) {
        setValue('documentName', file.name);
      }
    }
  };

  const onSubmit = async (data) => {
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('waterConnectionId', waterConnectionId);
      formData.append('documentType', data.documentType);
      formData.append('documentName', data.documentName || selectedFile.name);

      await waterConnectionDocumentAPI.upload(formData);
      toast.success('Document uploaded successfully');
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <FileText className="w-6 h-6 mr-2" />
            Upload Document
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <div className="space-y-4">
            {/* Document Type */}
            <div>
              <label className="label">
                Document Type <span className="text-red-500">*</span>
              </label>
              <select
                {...register('documentType', { required: 'Document type is required' })}
                className="input"
              >
                <option value="">Select Document Type</option>
                {Object.entries(DOCUMENT_TYPES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {errors.documentType && (
                <p className="text-red-500 text-sm mt-1">{errors.documentType.message}</p>
              )}
            </div>

            {/* Document Name */}
            <div>
              <label className="label">
                Document Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('documentName', { required: 'Document name is required' })}
                className="input"
                placeholder="Enter document name"
              />
              {errors.documentName && (
                <p className="text-red-500 text-sm mt-1">{errors.documentName.message}</p>
              )}
            </div>

            {/* File Upload */}
            <div>
              <label className="label">
                File <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-primary-400 transition-colors">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
                      <span>Upload a file</span>
                      <input
                        type="file"
                        className="sr-only"
                        accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                        onChange={handleFileChange}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    PDF, PNG, JPG, GIF, WebP up to 10MB
                  </p>
                  {selectedFile && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-700 font-medium">
                        Selected: {selectedFile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={uploading || !selectedFile || !documentType}
            >
              {uploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DocumentUploadModal;
