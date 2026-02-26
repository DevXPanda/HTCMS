import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { clerkAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Edit, Send, Droplet, MapPin, Calendar } from 'lucide-react';

const WaterApplicationDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [application, setApplication] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchApplication();
    }, [id]);

    const fetchApplication = async () => {
        try {
            setLoading(true);
            const response = await clerkAPI.getWaterApplicationById(id);
            setApplication(response.data.data.request);
        } catch (error) {
            toast.error('Failed to fetch water application details');
            navigate('/clerk/water-applications');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!window.confirm('Submit this water application for inspection?')) return;

        try {
            await clerkAPI.submitWaterApplication(id);
            toast.success('Water application submitted successfully');
            fetchApplication();
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

    if (!application) {
        return null;
    }

    const canEdit = application.status === 'DRAFT' || application.status === 'RETURNED';
    const canSubmit = application.status === 'DRAFT' || application.status === 'RETURNED';

    return (
        <div>
            <div className="mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Water Application Details</h1>
                        <p className="text-gray-600 mt-1">{application.requestNumber}</p>
                    </div>
                    <div className="flex gap-3">
                        {canEdit && (
                            <button
                                onClick={() => navigate(`/clerk/water-applications/${id}/edit`)}
                                className="flex items-center px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
                            >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                            </button>
                        )}
                        {canSubmit && (
                            <button
                                onClick={handleSubmit}
                                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                                <Send className="w-4 h-4 mr-2" />
                                Submit
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="mb-6">
                <span className={`px-4 py-2 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusBadge(application.status)}`}>
                    {application.status.replace('_', ' ')}
                </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <Droplet className="w-5 h-5 mr-2 text-cyan-600" />
                            Connection Details
                        </h2>
                        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <dt className="text-sm font-medium text-gray-500">Connection Type</dt>
                                <dd className="mt-1 text-sm text-gray-900 capitalize">{application.connectionType}</dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-gray-500">Property ID</dt>
                                <dd className="mt-1 text-sm text-gray-900">{application.propertyId}</dd>
                            </div>
                        </dl>
                    </div>

                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <MapPin className="w-5 h-5 mr-2 text-cyan-600" />
                            Property Location
                        </h2>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{application.propertyLocation}</p>
                    </div>

                    {application.remarks && (
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Remarks</h2>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{application.remarks}</p>
                        </div>
                    )}

                    {application.adminRemarks && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                            <h2 className="text-lg font-semibold text-blue-900 mb-2">Admin Remarks</h2>
                            <p className="text-sm text-blue-800 whitespace-pre-wrap">{application.adminRemarks}</p>
                        </div>
                    )}

                    {(application.status === 'REJECTED' || application.status === 'RETURNED') && application.returnReason && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                            <h2 className="text-lg font-semibold text-orange-900 mb-2">
                                {application.status === 'REJECTED' ? 'Rejection' : 'Return'} Reason
                            </h2>
                            <p className="text-sm text-orange-800 whitespace-pre-wrap">{application.returnReason}</p>
                        </div>
                    )}

                    {(application.decidedByOfficer || application.decidedat || application.officerremarks) && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
                            <h2 className="text-lg font-semibold text-emerald-900 mb-2">Officer Decision</h2>
                            <div className="text-sm text-emerald-900 space-y-2">
                                {application.decidedByOfficer && (
                                    <div>
                                        <span className="font-medium">Approved By:</span>{' '}
                                        {application.decidedByOfficer.firstName} {application.decidedByOfficer.lastName}
                                    </div>
                                )}
                                {application.decidedat && (
                                    <div>
                                        <span className="font-medium">Decided At:</span>{' '}
                                        {new Date(application.decidedat).toLocaleString()}
                                    </div>
                                )}
                                {application.officerremarks && (
                                    <div>
                                        <span className="font-medium">Officer Remarks:</span>{' '}
                                        {application.officerremarks}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Documents */}
                    {application.documents && application.documents.length > 0 && (
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Documents ({application.documents.length})</h2>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Document Type
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                File Name
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                File Size
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Uploaded At
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {application.documents.map((doc, index) => (
                                            <tr key={doc.id || index}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                                                        {doc.documentType?.replace('_', ' ') || 'Document'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {doc.fileName || 'Unknown file'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(2)} KB` : 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'N/A'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {doc.filePath && (
                                                        <a
                                                            href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${doc.filePath}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-cyan-600 hover:text-cyan-900"
                                                            title="Download"
                                                        >
                                                            <svg className="w-5 h-5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                            </svg>
                                                        </a>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <Calendar className="w-5 h-5 mr-2 text-cyan-600" />
                            Timeline
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <dt className="text-sm font-medium text-gray-500">Created</dt>
                                <dd className="mt-1 text-sm text-gray-900">
                                    {new Date(application.createdAt).toLocaleString()}
                                </dd>
                            </div>
                            {application.submittedAt && (
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Submitted</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {new Date(application.submittedAt).toLocaleString()}
                                    </dd>
                                </div>
                            )}
                            {application.inspectedAt && (
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Inspected</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {new Date(application.inspectedAt).toLocaleString()}
                                    </dd>
                                </div>
                            )}
                            {application.processedAt && (
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Processed</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {new Date(application.processedAt).toLocaleString()}
                                    </dd>
                                </div>
                            )}
                            <div>
                                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                                <dd className="mt-1 text-sm text-gray-900">
                                    {new Date(application.updatedAt).toLocaleString()}
                                </dd>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WaterApplicationDetails;
