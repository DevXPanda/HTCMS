import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clerkAPI, wardAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, Send } from 'lucide-react';

const NewPropertyApplication = () => {
    const navigate = useNavigate();
    const [wards, setWards] = useState([]);
    const [loading, setLoading] = useState(false);
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
    }, []);

    const fetchWards = async () => {
        try {
            const response = await wardAPI.getAll();
            setWards(response.data.data.wards || []);
        } catch (error) {
            toast.error('Failed to fetch wards');
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
            // Prepare payload with correct types
            const payload = {
                ...formData,
                area: parseFloat(formData.area),
                builtUpArea: formData.builtUpArea ? parseFloat(formData.builtUpArea) : null,
                floors: parseInt(formData.floors, 10),
                constructionYear: parseInt(formData.constructionYear, 10),
                // Ensure wardId is sent if selected
                wardId: formData.wardId ? parseInt(formData.wardId, 10) : null
            };

            // Create application
            const response = await clerkAPI.createPropertyApplication(payload);
            const applicationId = response.data.data.application.id;

            // If submitting for inspection, submit it
            if (submitForInspection) {
                await clerkAPI.submitPropertyApplication(applicationId);
                toast.success('Application created and submitted for inspection!');
            } else {
                toast.success('Application saved as draft!');
            }

            navigate('/clerk/property-applications');
        } catch (error) {
            console.error('Create application error:', error);
            const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to create application';
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

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
                <h1 className="text-3xl font-bold text-gray-900">New Property Application</h1>
                <p className="text-gray-600 mt-1">Create a new property registration application</p>
            </div>

            <form onSubmit={(e) => handleSubmit(e, false)} className="bg-white rounded-lg shadow p-6">
                {/* Basic Information */}
                <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Owner Name *
                            </label>
                            <input
                                type="text"
                                name="ownerName"
                                value={formData.ownerName}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter owner name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Owner Phone
                            </label>
                            <input
                                type="tel"
                                name="ownerPhone"
                                value={formData.ownerPhone}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter phone number"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Ward *
                            </label>
                            <select
                                name="wardId"
                                value={formData.wardId}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Property Type *
                            </label>
                            <select
                                name="propertyType"
                                value={formData.propertyType}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="residential">Residential</option>
                                <option value="commercial">Commercial</option>
                                <option value="industrial">Industrial</option>
                                <option value="agricultural">Agricultural</option>
                                <option value="mixed">Mixed</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Usage Type
                            </label>
                            <select
                                name="usageType"
                                value={formData.usageType}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Occupancy Status *
                            </label>
                            <select
                                name="occupancyStatus"
                                value={formData.occupancyStatus}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="owner_occupied">Owner Occupied</option>
                                <option value="tenant_occupied">Tenant Occupied</option>
                                <option value="vacant">Vacant</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Address Information */}
                <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Address Information</h2>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Address *
                            </label>
                            <textarea
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                required
                                rows="3"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter property address"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    City *
                                </label>
                                <input
                                    type="text"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter city"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    State *
                                </label>
                                <input
                                    type="text"
                                    name="state"
                                    value={formData.state}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter state"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Pincode *
                                </label>
                                <input
                                    type="text"
                                    name="pincode"
                                    value={formData.pincode}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter pincode"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Property Details */}
                <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Property Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Area (sq.m) *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                name="area"
                                value={formData.area}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter area in square meters"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Built-up Area (sq.m)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                name="builtUpArea"
                                value={formData.builtUpArea}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter built-up area"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Number of Floors
                            </label>
                            <input
                                type="number"
                                name="floors"
                                value={formData.floors}
                                onChange={handleChange}
                                min="1"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Construction Type
                            </label>
                            <select
                                name="constructionType"
                                value={formData.constructionType}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="RCC">RCC</option>
                                <option value="Pucca">Pucca</option>
                                <option value="Kutcha">Kutcha</option>
                                <option value="Semi-Pucca">Semi-Pucca</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Construction Year
                            </label>
                            <input
                                type="number"
                                name="constructionYear"
                                value={formData.constructionYear}
                                onChange={handleChange}
                                min="1900"
                                max={new Date().getFullYear()}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
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
                        rows="3"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter any additional remarks or notes"
                    />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end">
                    <button
                        type="button"
                        onClick={() => navigate('/clerk/property-applications')}
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
                        disabled={loading}
                        className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        <Send className="w-4 h-4 mr-2" />
                        {loading ? 'Submitting...' : 'Submit for Inspection'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default NewPropertyApplication;
