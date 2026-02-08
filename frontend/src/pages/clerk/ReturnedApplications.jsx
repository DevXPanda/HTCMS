import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clerkAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { AlertCircle, FileText, Droplet, Edit } from 'lucide-react';

const ReturnedApplications = () => {
    const [propertyApps, setPropertyApps] = useState([]);
    const [waterApps, setWaterApps] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchReturnedApplications();
    }, []);

    const fetchReturnedApplications = async () => {
        try {
            setLoading(true);

            // Fetch returned property applications
            const propertyResponse = await clerkAPI.getPropertyApplications({ status: 'RETURNED' });
            setPropertyApps(propertyResponse.data.data.applications || []);

            // Fetch returned water applications
            const waterResponse = await clerkAPI.getWaterApplications({ status: 'RETURNED' });
            setWaterApps(waterResponse.data.data.requests || []);

        } catch (error) {
            toast.error('Failed to fetch returned applications');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    const totalReturned = propertyApps.length + waterApps.length;

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Returned Applications</h1>
                <p className="text-gray-600 mt-1">Applications returned by assessor that need your attention</p>
            </div>

            {/* Summary Card */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-6">
                <div className="flex items-start">
                    <AlertCircle className="w-6 h-6 text-orange-600 mr-3 flex-shrink-0 mt-1" />
                    <div>
                        <h2 className="text-lg font-semibold text-orange-900 mb-2">
                            {totalReturned} Application{totalReturned !== 1 ? 's' : ''} Require{totalReturned === 1 ? 's' : ''} Attention
                        </h2>
                        <p className="text-orange-800 text-sm">
                            These applications were returned by the assessor. Please review the return reasons, make necessary corrections, and resubmit them.
                        </p>
                    </div>
                </div>
            </div>

            {totalReturned === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Returned Applications</h3>
                    <p className="text-gray-600">All your applications are in good standing!</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Property Applications */}
                    {propertyApps.length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                                <FileText className="w-5 h-5 mr-2 text-blue-600" />
                                Property Applications ({propertyApps.length})
                            </h2>
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
                                                Address
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Return Reason
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {propertyApps.map((app) => (
                                            <tr key={app.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {app.applicationNumber}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {app.ownerName}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                                                    {app.address}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-orange-600 max-w-md">
                                                    {app.rejectionReason || 'No reason provided'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <button
                                                        onClick={() => navigate(`/clerk/property-applications/${app.id}/edit`)}
                                                        className="flex items-center text-blue-600 hover:text-blue-900"
                                                    >
                                                        <Edit className="w-4 h-4 mr-1" />
                                                        Edit & Resubmit
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Water Applications */}
                    {waterApps.length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                                <Droplet className="w-5 h-5 mr-2 text-cyan-600" />
                                Water Connection Applications ({waterApps.length})
                            </h2>
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
                                                Return Reason
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {waterApps.map((app) => (
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
                                                <td className="px-6 py-4 text-sm text-orange-600 max-w-md">
                                                    {app.returnReason || 'No reason provided'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <button
                                                        onClick={() => navigate(`/clerk/water-applications/${app.id}/edit`)}
                                                        className="flex items-center text-cyan-600 hover:text-cyan-900"
                                                    >
                                                        <Edit className="w-4 h-4 mr-1" />
                                                        Edit & Resubmit
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ReturnedApplications;
