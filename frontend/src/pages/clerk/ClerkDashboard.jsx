import { useState, useEffect } from 'react';
import { clerkAPI } from '../../services/api';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { FileText, Droplet, AlertCircle, CheckCircle, Clock, XCircle, Eye, AlertTriangle, ArrowRight, RefreshCw, Send, Building, Store, FileCheck, Calendar, TrendingUp } from 'lucide-react';

const ClerkDashboard = () => {
    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const response = await clerkAPI.getDashboard();
            setDashboard(response.data.data);
        } catch (error) {
            console.error('Error fetching dashboard:', error);
            toast.error('Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Loading />;

    const statCards = [
        {
            title: 'Property Applications',
            value: dashboard?.propertyApplications?.total || 0,
            icon: FileText,
            color: 'bg-blue-500',
            link: '/clerk/property-applications'
        },
        {
            title: 'Water Applications',
            value: dashboard?.waterApplications?.total || 0,
            icon: Droplet,
            color: 'bg-cyan-500',
            link: '/clerk/water-applications'
        },
        {
            title: 'Returned Applications',
            value: dashboard?.totalReturned || 0,
            icon: AlertCircle,
            color: 'bg-orange-500',
            link: '/clerk/returned-applications'
        },
        {
            title: 'Total Applications',
            value: dashboard?.totalApplications || 0,
            icon: FileText,
            color: 'bg-indigo-500',
            link: '/clerk/property-applications'
        }
    ];

    // Assigned Ward Info Card - get from dashboard response
    const assignedWards = dashboard?.assignedWards || [];
    const assignedWard = assignedWards.length > 0 ? assignedWards[0] : null;

    // Quick Actions - All sidebar navigation items
    const quickActions = [
        { name: 'Property Connections', icon: Building, link: '/clerk/property-connections', color: 'bg-blue-600' },
        { name: 'Water Applications', icon: Droplet, link: '/clerk/water-applications', color: 'bg-cyan-600' },
        { name: 'Existing Water Connections', icon: Building, link: '/clerk/existing-water-connections', color: 'bg-indigo-600' },
        { name: 'Shop Tax Module', icon: Store, link: '/clerk/shop-tax', color: 'bg-amber-600' },
        { name: 'Shop Registration Requests', icon: FileCheck, link: '/clerk/shop-registration-requests', color: 'bg-yellow-600' },
        { name: 'Returned Applications', icon: AlertCircle, link: '/clerk/returned-applications', color: 'bg-orange-600' },
        { name: 'My Attendance', icon: Calendar, link: '/clerk/attendance', color: 'bg-purple-600' },
    ];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="ds-page-header">
                <div>
                    <h1 className="ds-page-title">Clerk Dashboard</h1>
                    <p className="ds-page-subtitle">Ward Management & Applications</p>
                </div>
                <button type="button" onClick={fetchDashboard} className="btn btn-primary">
                    <RefreshCw className="w-4 h-4" /> Refresh Data
                </button>
            </div>

            {/* Quick Actions Section */}
            <section>
                <h2 className="form-section-title flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-primary-600" />
                    Quick Actions
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {quickActions.map((action, index) => (
                        <Link
                            key={index}
                            to={action.link}
                            className="flex flex-col items-center justify-center p-5 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-primary-100 transition-all group"
                        >
                            <div className={`p-3 rounded-full ${action.color} text-white mb-3 shadow-sm group-hover:scale-110 transition-transform`}>
                                <action.icon className="h-6 w-6" />
                            </div>
                            <span className="text-sm font-medium text-gray-700 group-hover:text-primary-700 text-center">{action.name}</span>
                        </Link>
                    ))}
                </div>
            </section>

            {/* Assigned Ward Info */}
            {assignedWard ? (
                <div className="bg-white rounded-lg border border-gray-100 p-6 mb-6 bg-blue-50 border-blue-200">
                    <div className="flex items-center">
                        <div className="bg-blue-500 p-3 rounded-full mr-4">
                            <CheckCircle className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-blue-900">Assigned Ward</h2>
                            <p className="text-blue-700">
                                {assignedWard.wardName || 'Unnamed Ward'}
                                {assignedWard.wardNumber && assignedWard.wardNumber !== '0' && (
                                    <span> ({assignedWard.wardNumber})</span>
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-lg border border-gray-100 p-6 mb-6 bg-orange-50 border-orange-200">
                    <div className="flex items-center">
                        <div className="bg-orange-500 p-3 rounded-full mr-4">
                            <AlertCircle className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-orange-900">No Ward Assigned</h2>
                            <p className="text-orange-700">
                                No ward assigned. Please contact admin.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Today's Tasks / Action Required */}
            <div className="card mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="form-section-title flex items-center">
                        <Clock className="w-5 h-5 mr-2" />
                        Today&apos;s Tasks
                    </h2>
                    <span className="text-sm text-amber-600 font-medium">Action Required</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="stat-card">
                        <div className="stat-card-title">
                            <span>Pending Verification</span>
                            <Eye className="w-5 h-5 text-amber-600" />
                        </div>
                        <p className="stat-card-value text-amber-600">
                            {(dashboard?.propertyApplications?.byStatus?.submitted || 0) + 
                             (dashboard?.waterApplications?.byStatus?.submitted || 0)}
                        </p>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card-title">
                            <span>Returned by Inspector</span>
                            <AlertCircle className="w-5 h-5 text-orange-600" />
                        </div>
                        <p className="stat-card-value text-orange-600">{dashboard?.totalReturned || 0}</p>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card-title">
                            <span>Ready to Forward</span>
                            <Send className="w-5 h-5 text-blue-600" />
                        </div>
                        <p className="stat-card-value text-blue-600">
                            {(dashboard?.propertyApplications?.byStatus?.submitted || 0) + 
                             (dashboard?.waterApplications?.byStatus?.submitted || 0)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Returned / Attention Needed Highlight */}
            {(dashboard?.totalReturned || 0) > 0 && (
                <Link to="/clerk/returned-applications" className="block mb-6">
                    <div className="card card-hover border-red-200 bg-red-50/30">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <div className="bg-red-500 p-3 rounded-full mr-4">
                                    <AlertTriangle className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-red-900">
                                        ⚠️ {dashboard?.totalReturned || 0} applications need correction
                                    </h3>
                                    <p className="text-sm text-red-700">Please review and resubmit</p>
                                </div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-red-600" />
                        </div>
                    </div>
                </Link>
            )}

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {statCards.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <Link key={index} to={stat.link} className="stat-card card-hover">
                            <div className="stat-card-title">
                                <span>{stat.title}</span>
                                <div className={`${stat.color} p-2 rounded-full`}>
                                    <Icon className="w-5 h-5 text-white" />
                                </div>
                            </div>
                            <p className="stat-card-value">{stat.value}</p>
                        </Link>
                    );
                })}
            </div>

            {/* Property Applications Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="card">
                    <h2 className="form-section-title flex items-center">
                        <FileText className="w-5 h-5 mr-2" />
                        Property Applications Status
                    </h2>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center">
                                <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                                <span className="text-gray-700">Draft</span>
                            </div>
                            <span className="font-semibold">{dashboard?.propertyApplications?.byStatus?.draft || 0}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                            <div className="flex items-center">
                                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                                <span className="text-gray-700">Submitted</span>
                            </div>
                            <span className="font-semibold">{dashboard?.propertyApplications?.byStatus?.submitted || 0}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                            <div className="flex items-center">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                                <span className="text-gray-700">Under Inspection</span>
                            </div>
                            <span className="font-semibold">{dashboard?.propertyApplications?.byStatus?.underInspection || 0}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                            <div className="flex items-center">
                                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                <span className="text-gray-700">Approved</span>
                            </div>
                            <span className="font-semibold">{dashboard?.propertyApplications?.byStatus?.approved || 0}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                            <div className="flex items-center">
                                <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                                <span className="text-gray-700">Rejected</span>
                            </div>
                            <span className="font-semibold">{dashboard?.propertyApplications?.byStatus?.rejected || 0}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                            <div className="flex items-center">
                                <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                                <span className="text-gray-700">Returned</span>
                            </div>
                            <span className="font-semibold">{dashboard?.propertyApplications?.byStatus?.returned || 0}</span>
                        </div>
                    </div>
                </div>

                {/* Water Applications Breakdown */}
                <div className="card">
                    <h2 className="form-section-title flex items-center">
                        <Droplet className="w-5 h-5 mr-2" />
                        Water Applications Status
                    </h2>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center">
                                <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                                <span className="text-gray-700">Draft</span>
                            </div>
                            <span className="font-semibold">{dashboard?.waterApplications?.byStatus?.draft || 0}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                            <div className="flex items-center">
                                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                                <span className="text-gray-700">Submitted</span>
                            </div>
                            <span className="font-semibold">{dashboard?.waterApplications?.byStatus?.submitted || 0}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                            <div className="flex items-center">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                                <span className="text-gray-700">Under Inspection</span>
                            </div>
                            <span className="font-semibold">{dashboard?.waterApplications?.byStatus?.underInspection || 0}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                            <div className="flex items-center">
                                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                <span className="text-gray-700">Approved</span>
                            </div>
                            <span className="font-semibold">{dashboard?.waterApplications?.byStatus?.approved || 0}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                            <div className="flex items-center">
                                <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                                <span className="text-gray-700">Rejected</span>
                            </div>
                            <span className="font-semibold">{dashboard?.waterApplications?.byStatus?.rejected || 0}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                            <div className="flex items-center">
                                <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                                <span className="text-gray-700">Returned</span>
                            </div>
                            <span className="font-semibold">{dashboard?.waterApplications?.byStatus?.returned || 0}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Navigation Shortcuts */}
            <div className="card mb-6">
                <h2 className="form-section-title flex items-center">
                    <ArrowRight className="w-5 h-5 mr-2" />
                    Quick Navigation
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link
                        to="/clerk/property-applications?status=SUBMITTED"
                        className="flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                        <div className="flex items-center">
                            <FileText className="w-4 h-4 text-blue-600 mr-2" />
                            <span className="text-sm font-medium text-blue-900">View Submitted Applications</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-blue-600" />
                    </Link>
                    <Link
                        to="/clerk/returned-applications"
                        className="flex items-center justify-between p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                    >
                        <div className="flex items-center">
                            <AlertCircle className="w-4 h-4 text-orange-600 mr-2" />
                            <span className="text-sm font-medium text-orange-900">View Returned Applications</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-orange-600" />
                    </Link>
                    <Link
                        to="/clerk/property-applications?status=UNDER_INSPECTION"
                        className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
                    >
                        <div className="flex items-center">
                            <Clock className="w-4 h-4 text-yellow-600 mr-2" />
                            <span className="text-sm font-medium text-yellow-900">View Under Inspection</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-yellow-600" />
                    </Link>
                </div>
            </div>

            {/* Recent Activity (Ward-Scoped) */}
            <div className="card">
                <h2 className="form-section-title flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    Recent Activity
                </h2>
                {dashboard?.recentActivity && dashboard.recentActivity.length > 0 ? (
                    <div className="space-y-3">
                        {dashboard.recentActivity.map((activity) => (
                            <div key={activity.id} className="border-b pb-3 last:border-b-0">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <span className={`px-2 py-1 rounded text-xs font-semibold mr-3 ${activity.actionType === 'CREATE' ? 'bg-green-100 text-green-800' :
                                                activity.actionType === 'SEND' ? 'bg-blue-100 text-blue-800' :
                                                    activity.actionType === 'UPDATE' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-gray-100 text-gray-800'
                                            }`}>
                                            {activity.actionType}
                                        </span>
                                        <span className="text-sm text-gray-600">{activity.entityType}</span>
                                    </div>
                                    <span className="text-xs text-gray-500">
                                        {new Date(activity.timestamp).toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-900 mt-1">{activity.description}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <div className="text-gray-400 mb-2">
                            <Clock className="w-8 h-8 mx-auto" />
                        </div>
                        <p className="text-gray-500">No recent activity</p>
                        <p className="text-xs text-gray-400 mt-1">Recent actions will appear here</p>
                    </div>
                )}
            </div>

            {/* Additional Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <Link to="/clerk/property-applications/new" className="card card-hover flex items-center">
                    <div className="bg-primary-500 p-3 rounded-full mr-4 shrink-0">
                        <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">Create Property Application</h3>
                        <p className="text-sm text-gray-600">Start a new property registration</p>
                    </div>
                </Link>

                <Link to="/clerk/water-applications/new" className="card card-hover flex items-center">
                    <div className="bg-cyan-500 p-3 rounded-full mr-4 shrink-0">
                        <Droplet className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">Create Water Application</h3>
                        <p className="text-sm text-gray-600">Request a new water connection</p>
                    </div>
                </Link>
            </div>
        </div>
    );
};

export default ClerkDashboard;
