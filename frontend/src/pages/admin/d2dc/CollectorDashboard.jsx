import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';
import { toast } from 'react-hot-toast';
import {
    CreditCard,
    FileText,
    MapPin,
    TrendingUp,
    User,
    Calendar,
    Search,
    Plus,
    X
} from 'lucide-react';

const CollectorDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    // Property search
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchingProperties, setSearchingProperties] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);

    // Modals
    const [showDemandModal, setShowDemandModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [selectedDemand, setSelectedDemand] = useState(null);

    // Form states
    const [demandForm, setDemandForm] = useState({ remarks: '' });
    const [paymentForm, setPaymentForm] = useState({ amount: '', paymentMode: 'cash', remarks: '' });

    // Activity
    const [recentActivity, setRecentActivity] = useState([]);

    useEffect(() => {
        fetchStats();
        fetchRecentActivity();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const res = await api.get('/d2dc/collector/stats');
            if (res.data.success) {
                setStats(res.data.data);
            }
        } catch (error) {
            console.error('Error fetching collector stats:', error);
            toast.error('Failed to load dashboard stats');
        } finally {
            setLoading(false);
        }
    };

    const fetchRecentActivity = async () => {
        try {
            const res = await api.get('/d2dc/activity?limit=10');
            if (res.data.success) {
                setRecentActivity(res.data.data.activities);
            }
        } catch (error) {
            console.error('Error fetching activity:', error);
        }
    };

    // Property search
    const handleSearchChange = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);

        if (query.length >= 2) {
            setSearchingProperties(true);
            try {
                const res = await api.get(`/d2dc/search/properties?query=${encodeURIComponent(query)}`);
                if (res.data.success) {
                    setSearchResults(res.data.data);
                    setShowSearchResults(true);
                }
            } catch (error) {
                console.error('Error searching properties:', error);
            } finally {
                setSearchingProperties(false);
            }
        } else {
            setSearchResults([]);
            setShowSearchResults(false);
        }
    };

    const handlePropertySelect = (property) => {
        setSelectedProperty(property);
        setSearchQuery(`${property.propertyNumber} - ${property.ownerName}`);
        setShowSearchResults(false);
    };

    const openDemandModal = () => {
        if (!selectedProperty) {
            toast.error('Please select a property first');
            return;
        }
        setShowDemandModal(true);
    };

    const openPaymentModal = () => {
        if (!selectedProperty) {
            toast.error('Please select a property first');
            return;
        }
        if (!selectedProperty.demands || selectedProperty.demands.length === 0) {
            toast.error('No pending D2DC demands for this property');
            return;
        }
        setSelectedDemand(selectedProperty.demands[0]);
        setPaymentForm({ ...paymentForm, amount: selectedProperty.demands[0].balanceAmount });
        setShowPaymentModal(true);
    };

    const handleGenerateDemand = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/d2dc/demand/generate', {
                propertyId: selectedProperty.id,
                remarks: demandForm.remarks
            });
            toast.success(res.data.message || 'Demand generated successfully');
            setShowDemandModal(false);
            setDemandForm({ remarks: '' });
            setSelectedProperty(null);
            setSearchQuery('');
            fetchStats();
            fetchRecentActivity();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to generate demand');
        }
    };

    const handleCollectPayment = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/d2dc/payment/collect', {
                demandId: selectedDemand.id,
                amount: paymentForm.amount,
                paymentMode: paymentForm.paymentMode,
                remarks: paymentForm.remarks
            });
            toast.success(res.data.message || 'Payment collected successfully');
            setShowPaymentModal(false);
            setPaymentForm({ amount: '', paymentMode: 'cash', remarks: '' });
            setSelectedProperty(null);
            setSelectedDemand(null);
            setSearchQuery('');
            fetchStats();
            fetchRecentActivity();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to collect payment');
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
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">D2DC Collector Dashboard</h1>
                    <p className="text-gray-600">Welcome back, {user?.firstName}</p>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={openDemandModal}
                        className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                    >
                        <Plus className="w-4 h-4" />
                        <span>New Demand</span>
                    </button>
                    <button
                        onClick={openPaymentModal}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                        <CreditCard className="w-4 h-4" />
                        <span>Collect Payment</span>
                    </button>
                </div>
            </div>

            {/* Property Search */}
            <div className="bg-white p-4 rounded-lg shadow">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search Property by ID, Owner Name, or Phone..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                    {searchingProperties && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                        </div>
                    )}
                </div>

                {/* Search Results Dropdown */}
                {showSearchResults && searchResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg max-h-64 overflow-y-auto">
                        {searchResults.map((property) => (
                            <div
                                key={property.id}
                                onClick={() => handlePropertySelect(property)}
                                className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-medium text-gray-900">{property.propertyNumber}</p>
                                        <p className="text-sm text-gray-600">{property.ownerName} | {property.ownerPhone || 'N/A'}</p>
                                        <p className="text-xs text-gray-500">{property.ward?.wardName}</p>
                                    </div>
                                    {property.demands && property.demands.length > 0 && (
                                        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
                                            Pending: ₹{property.demands[0].balanceAmount}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Selected Property Info */}
                {selectedProperty && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-semibold text-blue-900">{selectedProperty.propertyNumber}</p>
                                <p className="text-sm text-blue-700">{selectedProperty.ownerName}</p>
                                <p className="text-xs text-blue-600">{selectedProperty.ward?.wardName}</p>
                                {selectedProperty.demands && selectedProperty.demands.length > 0 && (
                                    <p className="text-sm text-amber-700 mt-1">
                                        Active Demand: ₹{selectedProperty.demands[0].balanceAmount} (Balance)
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedProperty(null);
                                    setSearchQuery('');
                                }}
                                className="text-blue-600 hover:text-blue-800"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Assigned Wards Info */}
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <MapPin className="w-5 h-5 mr-2 text-primary-600" />
                    Assigned Wards
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {stats?.wards?.map((ward) => (
                        <div key={ward.id} className="bg-blue-50 p-4 rounded-md border border-blue-100">
                            <h3 className="font-bold text-blue-800">{ward.wardName}</h3>
                            <p className="text-sm text-blue-600">Ward No: {ward.wardNumber}</p>
                        </div>
                    )) || <p className="text-gray-500">No wards assigned</p>}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Properties</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats?.totalProperties || 0}</h3>
                        </div>
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <HomeIcon className="w-6 h-6 text-indigo-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Active Demands</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats?.totalDemands || 0}</h3>
                        </div>
                        <div className="p-2 bg-amber-100 rounded-lg">
                            <FileText className="w-6 h-6 text-amber-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Today's Collection</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">₹{stats?.todayCollection || 0}</h3>
                        </div>
                        <div className="p-2 bg-emerald-100 rounded-lg">
                            <CreditCard className="w-6 h-6 text-emerald-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Today's Demands</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">{stats?.todayDemandsGenerated || 0}</h3>
                        </div>
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Demand Generation Modal */}
            {showDemandModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h3 className="text-lg font-semibold text-gray-900">Generate D2DC Demand</h3>
                            <button onClick={() => setShowDemandModal(false)} className="text-gray-400 hover:text-gray-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleGenerateDemand} className="p-6 space-y-4">
                            <div className="bg-gray-50 p-3 rounded border">
                                <p className="text-sm font-medium text-gray-700">Property</p>
                                <p className="font-semibold text-gray-900">{selectedProperty?.propertyNumber}</p>
                                <p className="text-sm text-gray-600">{selectedProperty?.ownerName}</p>
                            </div>
                            <div className="bg-green-50 p-3 rounded border border-green-200">
                                <p className="text-sm font-medium text-green-700">D2DC Standard Amount</p>
                                <p className="text-2xl font-bold text-green-900">₹50</p>
                                <p className="text-xs text-green-600">System-calculated amount</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Remarks (Optional)</label>
                                <textarea
                                    value={demandForm.remarks}
                                    onChange={e => setDemandForm({ ...demandForm, remarks: e.target.value })}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    rows="2"
                                    placeholder="Any additional notes..."
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowDemandModal(false)}
                                    className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                                >
                                    Generate Demand
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Payment Collection Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h3 className="text-lg font-semibold text-gray-900">Collect Payment (D2DC)</h3>
                            <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCollectPayment} className="p-6 space-y-4">
                            <div className="bg-gray-50 p-3 rounded border">
                                <p className="text-sm font-medium text-gray-700">Property</p>
                                <p className="font-semibold text-gray-900">{selectedProperty?.propertyNumber}</p>
                                <p className="text-sm text-gray-600">{selectedProperty?.ownerName}</p>
                            </div>
                            <div className="bg-amber-50 p-3 rounded border border-amber-200">
                                <p className="text-sm font-medium text-amber-700">Demand Details</p>
                                <div className="mt-1 text-sm space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Total Amount:</span>
                                        <span className="font-semibold text-gray-900">₹{selectedDemand?.totalAmount}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Balance:</span>
                                        <span className="font-bold text-amber-900">₹{selectedDemand?.balanceAmount}</span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Amount Collected (₹)</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    max={selectedDemand?.balanceAmount}
                                    step="0.01"
                                    value={paymentForm.amount}
                                    onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Payment Mode</label>
                                <select
                                    value={paymentForm.paymentMode}
                                    onChange={e => setPaymentForm({ ...paymentForm, paymentMode: e.target.value })}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                >
                                    <option value="cash">Cash</option>
                                    <option value="upi">UPI</option>
                                    <option value="cheque">Cheque</option>
                                    <option value="card">Card</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Remarks (Optional)</label>
                                <textarea
                                    value={paymentForm.remarks}
                                    onChange={e => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    rows="2"
                                    placeholder="Any additional notes..."
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowPaymentModal(false)}
                                    className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                                >
                                    Collect Payment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-800">Recent Collection Activity</h2>
                </div>
                <div className="p-0">
                    {recentActivity && recentActivity.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {recentActivity.map((activity) => (
                                        <tr key={activity.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${activity.type === 'PAYMENT_COLLECTION' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                                                    }`}>
                                                    {activity.type === 'PAYMENT_COLLECTION' ? 'Payment' : 'Demand'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {activity.property?.propertyNumber || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                ₹{activity.amount}
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

// Helper Icon
const HomeIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
);

export default CollectorDashboard;
