import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clerkAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Droplet, Plus, Eye, Edit, Trash2, Send, ArrowRight, X } from 'lucide-react';
import { useConfirm } from '../../components/ConfirmModal';

const WaterApplications = () => {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');
    const [showProcessModal, setShowProcessModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [processAction, setProcessAction] = useState('forward');
    const [processRemarks, setProcessRemarks] = useState('');
    const navigate = useNavigate();
    const { confirm } = useConfirm();

    useEffect(() => {
        fetchApplications();
    }, [filter]);

    const fetchApplications = async () => {
        try {
            setLoading(true);
            const params = filter !== 'ALL' ? { status: filter } : {};
            console.log('Fetching water applications with filter:', filter, 'params:', params);
            const response = await clerkAPI.getWaterApplications(params);
            const applicationsData = response.data.data.requests || [];
            console.log('Fetched water applications:', applicationsData);
            console.log('Number of applications:', applicationsData.length);
            setApplications(applicationsData);
        } catch (error) {
            console.error('Error fetching water applications:', error);
            toast.error('Failed to fetch water applications');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        const ok = await confirm({ title: 'Delete application', message: 'Are you sure you want to delete this water application?', confirmLabel: 'Delete', variant: 'danger' });
        if (!ok) return;

        try {
            await clerkAPI.deleteWaterApplication(id);
            toast.success('Water application deleted successfully');
            fetchApplications();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to delete application');
        }
    };

    const handleSubmit = async (id) => {
        const ok = await confirm({ title: 'Submit for inspection', message: 'Submit this water application for inspection?', confirmLabel: 'Submit' });
        if (!ok) return;

        try {
            await clerkAPI.submitWaterApplication(id);
            toast.success('Water application submitted successfully');
            fetchApplications();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to submit application');
        }
    };

    const handleProcess = async (id, action) => {
        setSelectedRequest(id);
        setProcessAction(action);
        setShowProcessModal(true);
    };

    const confirmProcess = async () => {
        if (!selectedRequest) return;

        try {
            await clerkAPI.processWaterApplication(selectedRequest, {
                action: processAction,
                remarks: processRemarks
            });
            
            toast.success(`Water application ${processAction}ed successfully`);
            setShowProcessModal(false);
            setSelectedRequest(null);
            setProcessRemarks('');
            fetchApplications();
        } catch (error) {
            toast.error(error.response?.data?.error || `Failed to ${processAction} application`);
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            DRAFT: 'bg-gray-100 text-gray-700',
            SUBMITTED: 'bg-blue-100 text-blue-700',
            UNDER_INSPECTION: 'bg-yellow-100 text-yellow-700',
            APPROVED: 'bg-green-100 text-green-700',
            REJECTED: 'bg-red-100 text-red-700',
            RETURNED: 'bg-orange-100 text-orange-700',
            COMPLETED: 'bg-purple-100 text-purple-700'
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
                    <h1 className="text-3xl font-bold text-gray-900">Water Connection Applications</h1>
                    <p className="text-gray-600 mt-1">Manage water connection requests</p>
                </div>
                <button
                    onClick={() => navigate('/clerk/water-applications/new')}
                    className="flex items-center px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    New Application
                </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto">
                {['ALL', 'DRAFT', 'SUBMITTED', 'UNDER_INSPECTION', 'RETURNED', 'APPROVED', 'REJECTED', 'COMPLETED'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${filter === status
                                ? 'bg-cyan-600 text-white'
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
                    <Droplet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Water Applications Found</h3>
                    <p className="text-gray-600 mb-6">
                        {filter === 'ALL'
                            ? 'Get started by creating your first water connection application'
                            : `No applications with status: ${filter.replace('_', ' ')}`}
                    </p>
                    <button
                        onClick={() => navigate('/clerk/water-applications/new')}
                        className="inline-flex items-center px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
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
                                    Request #
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Property Location
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Connection Type
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Created At
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
                                        {app.requestNumber}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                                        {app.propertyLocation}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                                        {app.connectionType}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(app.status)}`}>
                                            {app.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {new Date(app.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => navigate(`/clerk/water-applications/${app.id}`)}
                                                className="text-cyan-600 hover:text-cyan-900"
                                                title="View Details"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>

                                            {/* Show different actions based on status */}
                                            {app.status === 'SUBMITTED' && (
                                                <>
                                                    <button
                                                        onClick={() => handleProcess(app.id, 'forward')}
                                                        className="text-green-600 hover:text-green-900"
                                                        title="Forward to Inspector"
                                                    >
                                                        <ArrowRight className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleProcess(app.id, 'reject')}
                                                        className="text-red-600 hover:text-red-900"
                                                        title="Reject Application"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}

                                            {(app.status === 'DRAFT' || app.status === 'RETURNED') && (
                                                <>
                                                    <button
                                                        onClick={() => navigate(`/clerk/water-applications/${app.id}/edit`)}
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

            {/* Process Modal */}
            {showProcessModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-lg bg-white">
                        <div className="mt-3">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                {processAction === 'forward' ? 'Forward to Inspector' : 'Reject Application'}
                            </h3>
                            
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Remarks (Optional)
                                </label>
                                <textarea
                                    value={processRemarks}
                                    onChange={(e) => setProcessRemarks(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                    rows={3}
                                    placeholder={
                                        processAction === 'forward' 
                                            ? 'Add any notes for the inspector...' 
                                            : 'Reason for rejection...'
                                    }
                                />
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setShowProcessModal(false);
                                        setSelectedRequest(null);
                                        setProcessRemarks('');
                                    }}
                                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmProcess}
                                    className={`px-4 py-2 rounded-lg text-white ${
                                        processAction === 'forward' 
                                            ? 'bg-green-600 hover:bg-green-700' 
                                            : 'bg-red-600 hover:bg-red-700'
                                    }`}
                                >
                                    {processAction === 'forward' ? 'Forward' : 'Reject'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WaterApplications;
