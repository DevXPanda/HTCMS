import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';
import { toast } from 'react-hot-toast';
import {
    Eye,
    MapPin,
    FileText,
    TrendingUp,
    AlertCircle,
    CheckCircle,
    XCircle,
    Clock
} from 'lucide-react';
import { isRecentDate } from '../../../utils/dateUtils';

const InspectorDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    // Monitoring Data
    const [demands, setDemands] = useState([]);
    const [payments, setPayments] = useState([]);
    const [demandPage, setDemandPage] = useState(1);
    const [paymentPage, setPaymentPage] = useState(1);
    const [totalPagesDemands, setTotalPagesDemands] = useState(1);
    const [totalPagesPayments, setTotalPagesPayments] = useState(1);

    // Filter states
    const [demandStatusFilter, setDemandStatusFilter] = useState('');
    const [selectedWard, setSelectedWard] = useState(null);

    useEffect(() => {
        fetchStats();
    }, [selectedWard]); // Re-fetch stats when ward selection changes

    useEffect(() => {
        if (stats?.wards?.length > 0 && selectedWard) {
            // Validate selected ward is still in the list (e.g. if role changed) - optional safety
        }
    }, [stats]);


    useEffect(() => {
        fetchStats();
    }, []);

    useEffect(() => {
        fetchDemands();
    }, [demandPage, demandStatusFilter, selectedWard]);

    useEffect(() => {
        fetchPayments();
    }, [paymentPage, selectedWard]);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const query = selectedWard ? `?wardId=${selectedWard.id}` : '';
            const res = await api.get(`/d2dc/inspector/stats${query}`);
            if (res.data.success) {
                setStats(res.data.data);
                // Also fetch activity with filter
                const activityQuery = selectedWard ? `&wardId=${selectedWard.id}` : '';
                const activityRes = await api.get(`/d2dc/activity?limit=10${activityQuery}`);
                if (activityRes.data.success) {
                    setStats(prev => ({ ...prev, recentActivity: activityRes.data.data.activities }));
                }
            }
        } catch (error) {
            console.error('Error fetching inspector stats:', error);
            toast.error('Failed to load dashboard stats');
        } finally {
            setLoading(false);
        }
    };

    const fetchDemands = async () => {
        try {
            const wardQuery = selectedWard ? `&wardId=${selectedWard.id}` : '';
            const res = await api.get(`/d2dc/demands?page=${demandPage}&limit=10${demandStatusFilter ? `&status=${demandStatusFilter}` : ''}${wardQuery}`);
            if (res.data.success) {
                setDemands(res.data.data.demands);
                setTotalPagesDemands(res.data.data.pages);
            }
        } catch (error) {
            console.error('Error fetching demands:', error);
        }
    };

    const fetchPayments = async () => {
        try {
            const wardQuery = selectedWard ? `&wardId=${selectedWard.id}` : '';
            const res = await api.get(`/d2dc/payments?page=${paymentPage}&limit=10${wardQuery}`);
            if (res.data.success) {
                setPayments(res.data.data.payments);
                setTotalPagesPayments(res.data.data.pages);
            }
        } catch (error) {
            console.error('Error fetching payments:', error);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'paid': return 'bg-green-100 text-green-800';
            case 'partially_paid': return 'bg-yellow-100 text-yellow-800';
            case 'pending': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                {/* <div>
                    <h1 className="text-2xl font-bold text-gray-900">D2DC Inspector Monitoring</h1>
                    <p className="text-gray-600">Monitoring Dashoard for {user?.firstName}</p>
                </div> */}
            </div>

            {/* Ward Overview */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                        <MapPin className="w-5 h-5 mr-2 text-primary-600" />
                        Monitored Wards
                        {selectedWard && (
                            <span className="ml-2 text-sm font-normal text-gray-500">
                                (Filtering by {selectedWard.wardName})
                            </span>
                        )}
                    </h2>
                    {selectedWard && (
                        <button
                            onClick={() => setSelectedWard(null)}
                            className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center"
                        >
                            <XCircle className="w-4 h-4 mr-1" />
                            Clear Filter
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {stats?.wards?.map((ward) => {
                        const isSelected = selectedWard?.id === ward.id;
                        return (
                            <div
                                key={ward.id}
                                onClick={() => setSelectedWard(isSelected ? null : ward)}
                                className={`p-4 rounded-md border cursor-pointer transition-all duration-200 ${isSelected
                                    ? 'bg-purple-100 border-purple-300 ring-2 ring-purple-400 shadow-sm'
                                    : 'bg-purple-50 border-purple-100 hover:bg-purple-100 hover:shadow-md'
                                    }`}
                            >
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className={`font-bold ${isSelected ? 'text-purple-900' : 'text-purple-800'}`}>
                                            {ward.wardName}
                                        </h3>
                                        <p className={`text-sm ${isSelected ? 'text-purple-700' : 'text-purple-600'}`}>
                                            Ward No: {ward.wardNumber}
                                        </p>
                                    </div>
                                    {isSelected && <CheckCircle className="w-5 h-5 text-purple-600" />}
                                </div>
                            </div>
                        );
                    }) || <p className="text-gray-500">No wards assigned for monitoring</p>}
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm text-gray-500">Total Properties</p>
                            <h3 className="text-2xl font-bold text-gray-900">{stats?.stats?.totalProperties || 0}</h3>
                        </div>
                        <Eye className="w-8 h-8 text-blue-200" />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-amber-500">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm text-gray-500">Pending Demands</p>
                            <h3 className="text-2xl font-bold text-gray-900">{stats?.stats?.activeDemands || 0}</h3>
                        </div>
                        <AlertCircle className="w-8 h-8 text-amber-200" />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6 border-l-4 border-emerald-500">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm text-gray-500">Total Collections</p>
                            <h3 className="text-2xl font-bold text-gray-900">₹{stats?.stats?.totalCollections || 0}</h3>
                        </div>
                        <TrendingUp className="w-8 h-8 text-emerald-200" />
                    </div>
                </div>
            </div>

            {/* Demand Monitoring Section */}
            <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-amber-600" />
                        D2DC Demand Monitoring
                    </h2>
                    <select
                        value={demandStatusFilter}
                        onChange={(e) => setDemandStatusFilter(e.target.value)}
                        className="text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    >
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="partially_paid">Partially Paid</option>
                        <option value="paid">Paid</option>
                    </select>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Demand No</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generated By</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {demands.length > 0 ? (
                                demands.map((demand) => (
                                    <tr key={demand.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            <span className="inline-flex items-center gap-1.5">
                                                {demand.demandNumber}
                                                {isRecentDate(demand.createdAt || demand.generatedDate) && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Recent</span>
                                                )}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {demand.property?.propertyNumber}
                                            <div className="text-xs text-gray-400">{demand.property?.ward?.wardName}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            All: ₹{demand.totalAmount}
                                            <div className="text-xs text-red-500">Bal: ₹{demand.balanceAmount}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {demand.generator?.firstName} {demand.generator?.lastName}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(demand.status)}`}>
                                                {demand.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(demand.createdAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                                        No demands found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Demand Pagination */}
                {totalPagesDemands > 1 && (
                    <div className="px-6 py-3 border-t border-gray-200 flex justify-between items-center bg-gray-50">
                        <button
                            onClick={() => setDemandPage(p => Math.max(1, p - 1))}
                            disabled={demandPage === 1}
                            className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-500">Page {demandPage} of {totalPagesDemands}</span>
                        <button
                            onClick={() => setDemandPage(p => Math.min(totalPagesDemands, p + 1))}
                            disabled={demandPage === totalPagesDemands}
                            className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* Payment Monitoring Section */}
            <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2 text-emerald-600" />
                        D2DC Payment Monitoring
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt No</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mode</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Collected By</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {payments.length > 0 ? (
                                payments.map((payment) => (
                                    <tr key={payment.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            <span className="inline-flex items-center gap-1.5">
                                                {payment.receiptNumber}
                                                {isRecentDate(payment.createdAt) && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Recent</span>
                                                )}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {payment.property?.propertyNumber}
                                            <div className="text-xs text-gray-400">{payment.property?.ward?.wardName}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                                            ₹{payment.amount}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                            {payment.paymentMode}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {payment.collectorStaff ? payment.collectorStaff.full_name :
                                                (payment.collector ? `${payment.collector.firstName} ${payment.collector.lastName}` :
                                                    (payment.cashierStaff ? payment.cashierStaff.full_name :
                                                        (payment.cashier ? `${payment.cashier.firstName} ${payment.cashier.lastName}` : 'N/A')
                                                    )
                                                )
                                            }
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(payment.paymentDate).toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                                        No payments found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Payment Pagination */}
                {totalPagesPayments > 1 && (
                    <div className="px-6 py-3 border-t border-gray-200 flex justify-between items-center bg-gray-50">
                        <button
                            onClick={() => setPaymentPage(p => Math.max(1, p - 1))}
                            disabled={paymentPage === 1}
                            className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-500">Page {paymentPage} of {totalPagesPayments}</span>
                        <button
                            onClick={() => setPaymentPage(p => Math.min(totalPagesPayments, p + 1))}
                            disabled={paymentPage === totalPagesPayments}
                            className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* Recent Activity Feed */}
            <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                        <Clock className="w-5 h-5 mr-2 text-blue-600" />
                        Live D2DC Activity Feed
                    </h2>
                </div>
                <div className="p-0">
                    {stats?.recentActivity?.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Collector</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {stats.recentActivity.map((activity) => (
                                        <tr key={activity.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${activity.type === 'PAYMENT_COLLECTION' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                                                    }`}>
                                                    {activity.type === 'PAYMENT_COLLECTION' ? 'Payment' : 'Demand'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {activity.property?.propertyNumber || 'N/A'}
                                                <div className="text-xs text-gray-400">{activity.ward?.wardName}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                ₹{activity.amount}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {activity.collector?.firstName} {activity.collector?.lastName}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(activity.timestamp).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-6 text-center text-gray-500">
                            No recent activity found.
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default InspectorDashboard;
