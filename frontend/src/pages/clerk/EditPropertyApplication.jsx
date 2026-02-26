import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { clerkAPI, wardAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, Send } from 'lucide-react';

const EditPropertyApplication = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [wards, setWards] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchingData, setFetchingData] = useState(true);
    const [formData, setFormData] = useState({
        wardId: '',
        ownerName: '',
        ownerPhone: '',
        propertyType: 'residential',
        usageType: 'residential',
        address: '',
        city: '',
        state: '',
        pincode: '',
        area: '',
        builtUpArea: '',
        floors: 1,
        constructionType: 'RCC',
        constructionYear: new Date().getFullYear(),
        occupancyStatus: 'owner_occupied',
        remarks: ''
    });

    useEffect(() => {
        fetchWards();
        fetchApplication();
    }, [id]);

    const fetchWards = async () => {
        try {
            const response = await wardAPI.getAll();
            setWards(response.data.data.wards || []);
        } catch (error) {
            toast.error('Failed to fetch wards');
        }
    };

    const fetchApplication = async () => {
        try {
            setFetchingData(true);
            const response = await clerkAPI.getPropertyApplicationById(id);
            const app = response.data.data.application;

            if (app.status !== 'DRAFT' && app.status !== 'RETURNED') {
                toast.error('Can only edit applications in DRAFT or RETURNED status');
                navigate(`/clerk/property-applications/${id}`);
                return;
            }

            setFormData({
                wardId: app.wardId || '',
                ownerName: app.ownerName || '',
                ownerPhone: app.ownerPhone || '',
                propertyType: app.propertyType || 'residential',
                usageType: app.usageType || 'residential',
                address: app.address || '',
                city: app.city || '',
                state: app.state || '',
                pincode: app.pincode || '',
                area: app.area || '',
                builtUpArea: app.builtUpArea || '',
                floors: app.floors || 1,
                constructionType: app.constructionType || 'RCC',
                constructionYear: app.constructionYear || new Date().getFullYear(),
                occupancyStatus: app.occupancyStatus || 'owner_occupied',
                remarks: app.remarks || ''
            });
        } catch (error) {
            toast.error('Failed to fetch application');
            navigate('/clerk/property-applications');
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
    };

    const handleSubmit = async (e, submitForInspection = false) => {
        e.preventDefault();
        setLoading(true);

        try {
            await clerkAPI.updatePropertyApplication(id, formData);

            if (submitForInspection) {
                await clerkAPI.submitPropertyApplication(id);
                toast.success('Application updated and submitted for inspection!');
            } else {
                toast.success('Application updated successfully!');
            }

            navigate('/clerk/property-applications');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to update application');
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
                    onClick={() => navigate('/clerk/property-applications')}
                    className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Applications
                </button>
                <h1 className="ds-page-title">Edit Property Application</h1>
                <p className="text-gray-600 mt-1">Update property registration application details</p>
            </div>

            <form onSubmit={(e) => handleSubmit(e, false)} className="bg-white rounded-lg shadow p-6">
                <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name *</label>
                            <input
                                type="text"
                                name="ownerName"
                                value={formData.ownerName}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Owner Phone</label>
                            <input
                                type="tel"
                                name="ownerPhone"
                                value={formData.ownerPhone}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ward *</label>
                            <select
                                name="wardId"
                                value={formData.wardId}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="">Select Ward</option>
                                {wards.map((ward) => (
                                    <option key={ward.id} value={ward.id}>
                                        {ward.wardName} - {ward.wardNumber}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Property Type *</label>
                            <select
                                name="propertyType"
                                value={formData.propertyType}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="residential">Residential</option>
                                <option value="commercial">Commercial</option>
                                <option value="industrial">Industrial</option>
                                <option value="agricultural">Agricultural</option>
                                <option value="mixed">Mixed</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Usage Type</label>
                            <select
                                name="usageType"
                                value={formData.usageType}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="residential">Residential</option>
                                <option value="commercial">Commercial</option>
                                <option value="industrial">Industrial</option>
                                <option value="agricultural">Agricultural</option>
                                <option value="mixed">Mixed</option>
                                <option value="institutional">Institutional</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Occupancy Status *</label>
                            <select
                                name="occupancyStatus"
                                value={formData.occupancyStatus}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="owner_occupied">Owner Occupied</option>
                                <option value="tenant_occupied">Tenant Occupied</option>
                                <option value="vacant">Vacant</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Address Information</h2>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                            <textarea
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                required
                                rows="3"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                                <input
                                    type="text"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                                <input
                                    type="text"
                                    name="state"
                                    value={formData.state}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Pincode *</label>
                                <input
                                    type="text"
                                    name="pincode"
                                    value={formData.pincode}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Property Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Area (sq.m) *</label>
                            <input
                                type="number"
                                step="0.01"
                                name="area"
                                value={formData.area}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Built-up Area (sq.m)</label>
                            <input
                                type="number"
                                step="0.01"
                                name="builtUpArea"
                                value={formData.builtUpArea}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Number of Floors</label>
                            <input
                                type="number"
                                name="floors"
                                value={formData.floors}
                                onChange={handleChange}
                                min="1"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Construction Type</label>
                            <select
                                name="constructionType"
                                value={formData.constructionType}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="RCC">RCC</option>
                                <option value="Pucca">Pucca</option>
                                <option value="Kutcha">Kutcha</option>
                                <option value="Semi-Pucca">Semi-Pucca</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Construction Year</label>
                            <input
                                type="number"
                                name="constructionYear"
                                value={formData.constructionYear}
                                onChange={handleChange}
                                min="1900"
                                max={new Date().getFullYear()}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                    </div>
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                    <textarea
                        name="remarks"
                        value={formData.remarks}
                        onChange={handleChange}
                        rows="3"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                </div>

                <div className="flex gap-3 justify-end">
                    <button
                        type="button"
                        onClick={() => navigate('/clerk/property-applications')}
                        className="btn btn-secondary"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-secondary"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                        type="button"
                        onClick={(e) => handleSubmit(e, true)}
                        disabled={loading}
                        className="btn btn-primary"
                    >
                        <Send className="w-4 h-4 mr-2" />
                        {loading ? 'Submitting...' : 'Save & Submit'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditPropertyApplication;
