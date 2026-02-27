import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { clerkAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Edit, Send, FileText, MapPin, Home, Calendar } from 'lucide-react';
import { useConfirm } from '../../components/ConfirmModal';

const PropertyApplicationDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { confirm } = useConfirm();
    const [application, setApplication] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchApplication();
    }, [id]);

    const fetchApplication = async () => {
        try {
            setLoading(true);
            const response = await clerkAPI.getPropertyApplicationById(id);
            setApplication(response.data.data.application);
        } catch (error) {
            toast.error('Failed to fetch application details');
            navigate('/clerk/property-applications');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        const ok = await confirm({ title: 'Submit for inspection', message: 'Submit this application for inspection?', confirmLabel: 'Submit' });
        if (!ok) return;

        try {
            await clerkAPI.submitPropertyApplication(id);
            toast.success('Application submitted successfully');
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
                        <h1 className="text-3xl font-bold text-gray-900">Property Application Details</h1>
                        <p className="text-gray-600 mt-1">{application.applicationNumber}</p>
                    </div>
                    <div className="flex gap-3">
                        {canEdit && (
                            <button
                                onClick={() => navigate(`/clerk/property-applications/${id}/edit`)}
                                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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

            {/* Status Badge */}
            <div className="mb-6">
                <span className={`px-4 py-2 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusBadge(application.status)}`}>
                    {application.status.replace('_', ' ')}
                </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Owner Information */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <Home className="w-5 h-5 mr-2 text-blue-600" />
                            Owner Information
                        </h2>
                        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <dt className="text-sm font-medium text-gray-500">Owner Name</dt>
                                <dd className="mt-1 text-sm text-gray-900">{application.ownerName}</dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-gray-500">Owner Phone</dt>
                                <dd className="mt-1 text-sm text-gray-900">{application.ownerPhone || 'N/A'}</dd>
                            </div>
                        </dl>
                    </div>

                    {/* Property Details */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <FileText className="w-5 h-5 mr-2 text-blue-600" />
                            Property Details
                        </h2>
                        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <dt className="text-sm font-medium text-gray-500">Property Type</dt>
                                <dd className="mt-1 text-sm text-gray-900 capitalize">{application.propertyType}</dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-gray-500">Usage Type</dt>
                                <dd className="mt-1 text-sm text-gray-900 capitalize">{application.usageType || 'N/A'}</dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-gray-500">Area (sq.m)</dt>
                                <dd className="mt-1 text-sm text-gray-900">{application.area}</dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-gray-500">Built-up Area (sq.m)</dt>
                                <dd className="mt-1 text-sm text-gray-900">{application.builtUpArea || 'N/A'}</dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-gray-500">Floors</dt>
                                <dd className="mt-1 text-sm text-gray-900">{application.floors}</dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-gray-500">Construction Type</dt>
                                <dd className="mt-1 text-sm text-gray-900">{application.constructionType || 'N/A'}</dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-gray-500">Construction Year</dt>
                                <dd className="mt-1 text-sm text-gray-900">{application.constructionYear || 'N/A'}</dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-gray-500">Occupancy Status</dt>
                                <dd className="mt-1 text-sm text-gray-900 capitalize">{application.occupancyStatus?.replace('_', ' ')}</dd>
                            </div>
                        </dl>
                    </div>

                    {/* Address */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                            Address
                        </h2>
                        <p className="text-sm text-gray-900 mb-4">{application.address}</p>
                        <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <dt className="text-sm font-medium text-gray-500">City</dt>
                                <dd className="mt-1 text-sm text-gray-900">{application.city}</dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-gray-500">State</dt>
                                <dd className="mt-1 text-sm text-gray-900">{application.state}</dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-gray-500">Pincode</dt>
                                <dd className="mt-1 text-sm text-gray-900">{application.pincode}</dd>
                            </div>
                        </dl>
                    </div>

                    {/* Remarks */}
                    {application.remarks && (
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Remarks</h2>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{application.remarks}</p>
                        </div>
                    )}

                    {/* Rejection/Return Reason */}
                    {(application.status === 'REJECTED' || application.status === 'RETURNED') && application.rejectionReason && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                            <h2 className="text-lg font-semibold text-orange-900 mb-2">
                                {application.status === 'REJECTED' ? 'Rejection' : 'Return'} Reason
                            </h2>
                            <p className="text-sm text-orange-800 whitespace-pre-wrap">{application.rejectionReason}</p>
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
                </div>

                {/* Timeline Sidebar */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <Calendar className="w-5 h-5 mr-2 text-blue-600" />
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

export default PropertyApplicationDetails;
