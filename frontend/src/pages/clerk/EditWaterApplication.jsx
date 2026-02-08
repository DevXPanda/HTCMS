import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { clerkAPI, propertyAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, Send } from 'lucide-react';

const EditWaterApplication = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchingData, setFetchingData] = useState(true);
    const [formData, setFormData] = useState({
        propertyId: '',
        propertyLocation: '',
        connectionType: 'domestic',
        remarks: ''
    });

    useEffect(() => {
        fetchProperties();
        fetchApplication();
    }, [id]);

    const fetchProperties = async () => {
        try {
            const response = await propertyAPI.getAll();
            setProperties(response.data.data.properties || []);
        } catch (error) {
            toast.error('Failed to fetch properties');
        }
    };

    const fetchApplication = async () => {
        try {
            setFetchingData(true);
            const response = await clerkAPI.getWaterApplicationById(id);
            const app = response.data.data.request;

            if (app.status !== 'DRAFT' && app.status !== 'RETURNED') {
                toast.error('Can only edit applications in DRAFT or RETURNED status');
                navigate(`/clerk/water-applications/${id}`);
                return;
            }

            setFormData({
                propertyId: app.propertyId || '',
                propertyLocation: app.propertyLocation || '',
                connectionType: app.connectionType || 'domestic',
                remarks: app.remarks || ''
            });
        } catch (error) {
            toast.error('Failed to fetch application');
            navigate('/clerk/water-applications');
        } finally {
            setFetchingData(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

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

    const handleSubmit = async (e, submitForInspection = false) => {
        e.preventDefault();
        setLoading(true);

        try {
            await clerkAPI.updateWaterApplication(id, formData);

            if (submitForInspection) {
                await clerkAPI.submitWaterApplication(id);
                toast.success('Water application updated and submitted for inspection!');
            } else {
                toast.success('Water application updated successfully!');
            }

            navigate('/clerk/water-applications');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to update water application');
        } finally {
            setLoading(false);
        }
    };

    if (fetchingData) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading application data...</div>
            </div>
        );
    }

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
                <h1 className="text-3xl font-bold text-gray-900">Edit Water Connection Application</h1>
                <p className="text-gray-600 mt-1">Update water connection request details</p>
            </div>

            <form onSubmit={(e) => handleSubmit(e, false)} className="bg-white rounded-lg shadow p-6">
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
                            />
                        </div>
                    </div>
                </div>

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

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                    <textarea
                        name="remarks"
                        value={formData.remarks}
                        onChange={handleChange}
                        rows="4"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                </div>

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
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                        type="button"
                        onClick={(e) => handleSubmit(e, true)}
                        disabled={loading}
                        className="flex items-center px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50"
                    >
                        <Send className="w-4 h-4 mr-2" />
                        {loading ? 'Submitting...' : 'Save & Submit'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditWaterApplication;
