import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { waterConnectionDocumentAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import { X, Upload, FileText, FileIcon } from 'lucide-react';

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

const MAX_SIZE_MB = 10;
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

const DocumentUploadModal = ({ waterConnectionId, onClose, onSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

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

  const validateAndSetFile = useCallback(
    (file) => {
      if (!file) return;
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        toast.error(`File size must be less than ${MAX_SIZE_MB}MB`);
        return;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error('Invalid file type. Only PDF, JPEG, PNG, GIF, and WebP are allowed.');
        return;
      }
      setSelectedFile(file);
      if (!watch('documentName')) setValue('documentName', file.name);
    },
    [setValue, watch]
  );

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    validateAndSetFile(file);
    e.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    validateAndSetFile(file);
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
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-xl">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-600" />
            Upload Document
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <div className="space-y-5">
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
              <label className="label block mb-1">
                File <span className="text-red-500">*</span>
              </label>
              <label
                className={`mt-1 flex flex-col items-center justify-center w-full min-h-[180px] px-6 py-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  className="sr-only"
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                  onChange={handleFileChange}
                />
                {selectedFile ? (
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="p-3 rounded-full bg-primary-100">
                      <FileIcon className="h-10 w-10 text-primary-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate max-w-full px-2">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                    <span className="text-xs text-primary-600 font-medium">
                      Click or drop a new file to replace
                    </span>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                    <p className="text-sm font-medium text-gray-700 mb-0.5">
                      <span className="text-primary-600">Upload a file</span>
                      <span className="text-gray-600"> or drag and drop</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PDF, PNG, JPG, GIF, WebP up to {MAX_SIZE_MB}MB
                    </p>
                  </>
                )}
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
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
