import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clerkAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { FileText, Plus, Eye, Edit, Trash2, Send } from 'lucide-react';

const PropertyApplications = () => {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');
    const navigate = useNavigate();

    useEffect(() => {
        fetchApplications();
    }, [filter]);

    const fetchApplications = async () => {
        try {
            setLoading(true);
            const params = filter !== 'ALL' ? { status: filter } : {};
            const response = await clerkAPI.getPropertyApplications(params);
            setApplications(response.data.data.applications || []);
        } catch (error) {
            toast.error('Failed to fetch applications');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this application?')) return;

        try {
            await clerkAPI.deletePropertyApplication(id);
            toast.success('Application deleted successfully');
            fetchApplications();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to delete application');
        }
    };

    const handleSubmit = async (id) => {
        if (!window.confirm('Submit this application for inspection?')) return;

        try {
            await clerkAPI.submitPropertyApplication(id);
            toast.success('Application submitted successfully');
            fetchApplications();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to submit application');
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            DRAFT: 'bg-gray-100 text-gray-700',
            SUBMITTED: 'bg-blue-100 text-blue-700',
            UNDER_INSPECTION: 'bg-yellow-100 text-yellow-700',
            APPROVED: 'bg-green-100 text-green-700',
            REJECTED: 'bg-red-100 text-red-700',
            RETURNED: 'bg-orange-100 text-orange-700'
        };
        return badges[status] || 'bg-gray-100 text-gray-700';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Property Applications</h1>
                    <p className="text-gray-600 mt-1">Manage property registration applications</p>
                </div>
                <button
                    onClick={() => navigate('/clerk/property-applications/new')}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    New Application
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto">
                {['ALL', 'DRAFT', 'SUBMITTED', 'UNDER_INSPECTION', 'RETURNED', 'APPROVED', 'REJECTED'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${filter === status
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        {status.replace('_', ' ')}
                    </button>
                ))}
            </div>

            {/* Applications List */}
            {applications.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Applications Found</h3>
                    <p className="text-gray-600 mb-6">
                        {filter === 'ALL'
                            ? 'Get started by creating your first property application'
                            : `No applications with status: ${filter.replace('_', ' ')}`}
                    </p>
                    <button
                        onClick={() => navigate('/clerk/property-applications/new')}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Application
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Application #
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Owner Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Property Type
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Address
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {applications.map((app) => (
                                <tr key={app.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {app.applicationNumber}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {app.ownerName}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                                        {app.propertyType}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                                        {app.address}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(app.status)}`}>
                                            {app.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => navigate(`/clerk/property-applications/${app.id}`)}
                                                className="text-blue-600 hover:text-blue-900"
                                                title="View Details"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>

                                            {(app.status === 'DRAFT' || app.status === 'RETURNED') && (
                                                <>
                                                    <button
                                                        onClick={() => navigate(`/clerk/property-applications/${app.id}/edit`)}
                                                        className="text-green-600 hover:text-green-900"
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleSubmit(app.id)}
                                                        className="text-purple-600 hover:text-purple-900"
                                                        title="Submit"
                                                    >
                                                        <Send className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(app.id)}
                                                        className="text-red-600 hover:text-red-900"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default PropertyApplications;
