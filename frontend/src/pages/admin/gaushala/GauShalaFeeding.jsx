import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useBackTo } from '../../../contexts/NavigationContext';
import {
    Plus,
    Search,
    Calendar,
    Eye,
    X
} from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const GauShalaFeeding = () => {
    useBackTo('/gaushala/management');
    const [records, setRecords] = useState([]);
    const [facilities, setFacilities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        gau_shala_facility_id: '',
        record_date: new Date().toISOString().split('T')[0],
        fodder_type: '',
        quantity: '',
        notes: ''
    });

    useEffect(() => {
        fetchFeedingRecords();
        fetchFacilities();
    }, []);

    const fetchFeedingRecords = async () => {
        try {
            setLoading(true);
            const response = await api.get('/gaushala/feeding-records');
            if (response.data && response.data.success) {
                setRecords(response.data.data.feedingRecords);
            }
        } catch (error) {
            console.error('Failed to fetch feeding records:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFacilities = async () => {
        try {
            const response = await api.get('/gaushala/facilities?limit=1000');
            if (response.data && response.data.success) {
                setFacilities(response.data.data.facilities || []);
            }
        } catch (error) {
            console.error('Failed to fetch facilities:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.gau_shala_facility_id || !formData.record_date || !formData.fodder_type) {
            toast.error('Please fill in all required fields.');
            return;
        }
        if (formData.quantity && (isNaN(formData.quantity) || Number(formData.quantity) <= 0)) {
            toast.error('Quantity must be a positive number.');
            return;
        }
        try {
            setSubmitting(true);
            const payload = {
                gau_shala_facility_id: parseInt(formData.gau_shala_facility_id),
                record_date: formData.record_date,
                fodder_type: formData.fodder_type.trim(),
                quantity: formData.quantity ? Number(formData.quantity) : null,
                notes: formData.notes.trim() || null
            };
            const response = await api.post('/gaushala/feeding-records', payload);
            if (response.data && response.data.success) {
                setShowModal(false);
                setFormData({
                    gau_shala_facility_id: '',
                    record_date: new Date().toISOString().split('T')[0],
                    fodder_type: '',
                    quantity: '',
                    notes: ''
                });
                fetchFeedingRecords();
            }
        } catch (error) {
            console.error('Failed to create feeding record:', error);
            toast.error(error.response?.data?.message || 'Failed to create feeding record');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredRecords = records.filter(record => {
        const facilityName = record.facility?.name || '';
        const fodderType = record.fodder_type || '';
        return facilityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            fodderType.toLowerCase().includes(searchTerm.toLowerCase());
    });

    // Metrics Calculation
    const today = new Date().toISOString().split('T')[0];
    const todayTotal = records
        .filter(r => (r.record_date || '').slice(0, 10) === today)
        .reduce((sum, r) => sum + parseFloat(r.quantity || 0), 0);

    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyTotal = records
        .filter(r => (r.record_date || '').slice(0, 7) === currentMonth)
        .reduce((sum, r) => sum + parseFloat(r.quantity || 0), 0);

    const fodderStats = records.reduce((acc, r) => {
        acc[r.fodder_type] = (acc[r.fodder_type] || 0) + parseFloat(r.quantity || 0);
        return acc;
    }, {});

    const mostUsedFodder = Object.entries(fodderStats).length > 0
        ? Object.entries(fodderStats).sort((a, b) => b[1] - a[1])[0][0]
        : 'N/A';

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Feeding & Fodder Logs</h1>
                    <p className="text-gray-600 text-sm">Track animal nutrition and fodder inventory</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="btn btn-primary flex items-center"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Log Feeding
                </button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="text-sm text-gray-500">Total Records</div>
                    <div className="text-2xl font-bold text-gray-900">{records.length}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
                    <div className="text-sm text-gray-500">Today's Total Fodder</div>
                    <div className="text-2xl font-bold text-orange-600">
                        {todayTotal} KG
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                    <div className="text-sm text-gray-500">Monthly Consumption</div>
                    <div className="text-2xl font-bold text-green-600">
                        {monthlyTotal} KG
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                    <div className="text-sm text-gray-500">Most Used Fodder</div>
                    <div className="text-2xl font-bold text-blue-600 capitalize">
                        {mostUsedFodder}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search by Gaushala or fodder type..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gaushala</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Record Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fodder Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">No feeding records found</td>
                                </tr>
                            ) : (
                                filteredRecords.map((record) => (
                                    <tr key={record.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {record.facility?.name || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div className="flex items-center">
                                                <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                                                {new Date(record.record_date).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                                            {record.fodder_type}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                {record.quantity} KG
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                            {record.notes || 'No notes'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <Link to={`/gaushala/facilities/${record.gau_shala_facility_id}`} className="text-primary-600 hover:text-primary-900">
                                                <Eye className="h-5 w-5" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
                        <div className="flex items-center justify-between px-6 py-4 border-b">
                            <h2 className="text-lg font-semibold text-gray-900">Log Feeding Record</h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
                            {/* Select Gaushala Facility */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Gaushala Facility <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.gau_shala_facility_id}
                                    onChange={(e) => setFormData({ ...formData, gau_shala_facility_id: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    required
                                >
                                    <option value="">Select Gaushala Facility</option>
                                    {facilities.map(f => (
                                        <option key={f.id} value={f.id}>{f.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Record Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Record Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={formData.record_date}
                                    onChange={(e) => setFormData({ ...formData, record_date: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    required
                                />
                            </div>

                            {/* Fodder Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Fodder Type <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.fodder_type}
                                    onChange={(e) => setFormData({ ...formData, fodder_type: e.target.value })}
                                    placeholder="e.g. Grass, Hay, Silage"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    required
                                />
                            </div>

                            {/* Quantity */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Quantity (KG) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                    placeholder="Enter quantity in KG"
                                    min="0.01"
                                    step="0.01"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    required
                                />
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Notes <span className="text-gray-400">(Optional)</span>
                                </label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Add any additional notes..."
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                                >
                                    {submitting ? 'Saving...' : 'Save Record'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GauShalaFeeding;
