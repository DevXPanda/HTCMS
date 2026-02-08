import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clerkAPI, propertyAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, Send, Upload, CheckCircle } from 'lucide-react';

const NewWaterApplication = () => {
    const navigate = useNavigate();
    const [properties, setProperties] = useState([]);
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
    const [formData, setFormData] = useState({
        propertyId: '',
        propertyLocation: '',
        connectionType: 'domestic',
        remarks: ''
    });

    useEffect(() => {
        fetchProperties();
    }, []);

    const fetchProperties = async () => {
        try {
            const response = await propertyAPI.getAll();
            setProperties(response.data.data.properties || []);
        } catch (error) {
            toast.error('Failed to fetch properties');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Auto-fill property location when property is selected
        if (name === 'propertyId' && value) {
            const selectedProperty = properties.find(p => p.id === parseInt(value));
            if (selectedProperty) {
                setFormData(prev => ({
                    ...prev,
                    propertyLocation: `${selectedProperty.address}, ${selectedProperty.city}, ${selectedProperty.state} - ${selectedProperty.pincode}`
                }));
            }
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

    const handleSubmit = async (e, submitForInspection = false) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Validate required documents if submitting for inspection
            if (submitForInspection) {
                if (!documents.applicationForm || !documents.idProof || !documents.addressProof) {
                    toast.error('Please upload all required documents (Application Form, ID Proof, and Address Proof) before submitting for inspection');
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
            }

            // Create application
            const response = await clerkAPI.createWaterApplication(formData);
            const applicationId = response.data.data.request.id;

            // If submitting for inspection, submit it
            if (submitForInspection) {
                await clerkAPI.submitWaterApplication(applicationId);
                toast.success('Water application created and submitted for inspection!');
            } else {
                toast.success('Water application saved as draft!');
            }

            navigate('/clerk/water-applications');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to create water application');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="mb-6">
                <button
                    onClick={() => navigate('/clerk/water-applications')}
                    className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Water Applications
                </button>
                <h1 className="text-3xl font-bold text-gray-900">New Water Connection Application</h1>
                <p className="text-gray-600 mt-1">Create a new water connection request</p>
            </div>

            <form onSubmit={(e) => handleSubmit(e, false)} className="bg-white rounded-lg shadow p-6">
                {/* Property Selection */}
                <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Property Information</h2>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Select Property *
                            </label>
                            <select
                                name="propertyId"
                                value={formData.propertyId}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            >
                                <option value="">Select a property</option>
                                {properties.map((property) => (
                                    <option key={property.id} value={property.id}>
                                        {property.propertyNumber} - {property.ownerName} ({property.address})
                                    </option>
                                ))}
                            </select>
                            <p className="text-sm text-gray-500 mt-1">
                                Select the property for which you want to request a water connection
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Property Location *
                            </label>
                            <textarea
                                name="propertyLocation"
                                value={formData.propertyLocation}
                                onChange={handleChange}
                                required
                                rows="3"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                placeholder="Detailed property location for water connection"
                            />
                            <p className="text-sm text-gray-500 mt-1">
                                This will be auto-filled when you select a property, but you can modify it
                            </p>
                        </div>
                    </div>
                </div>

                {/* Connection Details */}
                <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Connection Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Connection Type *
                            </label>
                            <select
                                name="connectionType"
                                value={formData.connectionType}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            >
                                <option value="domestic">Domestic</option>
                                <option value="commercial">Commercial</option>
                                <option value="industrial">Industrial</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Remarks */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Remarks
                    </label>
                    <textarea
                        name="remarks"
                        value={formData.remarks}
                        onChange={handleChange}
                        rows="4"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        placeholder="Enter any additional remarks or special requirements for the water connection"
                    />
                </div>

                {/* Document Uploads */}
                <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Required Documents</h2>
                    <div className="space-y-4">
                        {/* Application Form */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Application Form <span className="text-red-500">*</span>
                            </label>
                            <label className="cursor-pointer block">
                                <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${documents.applicationForm ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-cyan-500'
                                    }`}>
                                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileChange('applicationForm', e.target.files[0])} className="hidden" />
                                    <div className="flex items-center justify-center space-x-2">
                                        {documents.applicationForm ? (
                                            <><CheckCircle className="w-5 h-5 text-green-600" /><span className="text-sm text-green-700 font-medium">{documents.applicationForm.name}</span></>
                                        ) : (
                                            <><Upload className="w-5 h-5 text-gray-400" /><span className="text-sm text-gray-600">Click to upload Application Form</span></>
                                        )}
                                    </div>
                                </div>
                            </label>
                            <p className="text-xs text-gray-500 mt-1">PDF, JPG, or PNG (max 5MB)</p>
                        </div>

                        {/* ID Proof */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                ID Proof <span className="text-red-500">*</span>
                            </label>
                            <label className="cursor-pointer block">
                                <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${documents.idProof ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-cyan-500'
                                    }`}>
                                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileChange('idProof', e.target.files[0])} className="hidden" />
                                    <div className="flex items-center justify-center space-x-2">
                                        {documents.idProof ? (
                                            <><CheckCircle className="w-5 h-5 text-green-600" /><span className="text-sm text-green-700 font-medium">{documents.idProof.name}</span></>
                                        ) : (
                                            <><Upload className="w-5 h-5 text-gray-400" /><span className="text-sm text-gray-600">Click to upload ID Proof</span></>
                                        )}
                                    </div>
                                </div>
                            </label>
                            <p className="text-xs text-gray-500 mt-1">PDF, JPG, or PNG (max 5MB)</p>
                        </div>

                        {/* Address Proof */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Address Proof <span className="text-red-500">*</span>
                            </label>
                            <label className="cursor-pointer block">
                                <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${documents.addressProof ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-cyan-500'
                                    }`}>
                                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileChange('addressProof', e.target.files[0])} className="hidden" />
                                    <div className="flex items-center justify-center space-x-2">
                                        {documents.addressProof ? (
                                            <><CheckCircle className="w-5 h-5 text-green-600" /><span className="text-sm text-green-700 font-medium">{documents.addressProof.name}</span></>
                                        ) : (
                                            <><Upload className="w-5 h-5 text-gray-400" /><span className="text-sm text-gray-600">Click to upload Address Proof</span></>
                                        )}
                                    </div>
                                </div>
                            </label>
                            <p className="text-xs text-gray-500 mt-1">PDF, JPG, or PNG (max 5MB)</p>
                        </div>

                        {/* Document Upload Warning */}
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <p className="text-sm text-yellow-800">⚠️ <strong>Mandatory:</strong> You must upload all three documents before submitting for inspection.</p>
                        </div>
                    </div>
                </div>

                {/* Information Note */}
                <div className="mb-6 p-4 bg-cyan-50 border border-cyan-200 rounded-lg">
                    <h3 className="text-sm font-semibold text-cyan-900 mb-2">📋 Application Process</h3>
                    <ul className="text-sm text-cyan-800 space-y-1">
                        <li>• You can save this application as a draft and submit it later</li>
                        <li>• Once submitted, the application will be sent for inspection by an assessor</li>
                        <li>• After inspection and approval, a water connection will be created</li>
                        <li>• You cannot edit the application once it's submitted (unless it's returned)</li>
                    </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end">
                    <button
                        type="button"
                        onClick={() => navigate('/clerk/water-applications')}
                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {loading ? 'Saving...' : 'Save as Draft'}
                    </button>
                    <button
                        type="button"
                        onClick={(e) => handleSubmit(e, true)}
                        disabled={loading || uploadingDocs}
                        className="px-6 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <Send className="w-4 h-4" />
                        {uploadingDocs ? 'Uploading Documents...' : loading ? 'Submitting...' : 'Submit for Inspection'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default NewWaterApplication;
