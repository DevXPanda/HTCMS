import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useBackTo } from '../../../contexts/NavigationContext';
import {
    ClipboardCheck,
    Plus,
    Search,
    Filter,
    CheckCircle,
    XCircle,
    Eye,
    Calendar,
    Edit
} from 'lucide-react';
import api from '../../../services/api';

const GauShalaInspections = () => {
    useBackTo('/gaushala/management');
    const [inspections, setInspections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        fetchInspections();
    }, []);

    const fetchInspections = async () => {
        try {
            setLoading(true);
            const response = await api.get('/gaushala/inspections');
            if (response.data && response.data.success) {
                setInspections(response.data.data.inspections);
            }
        } catch (error) {
            console.error('Failed to fetch Gaushala inspections:', error);
        } finally {
            setLoading(false);
        }
    };

    const isOverdue = (inspection) => {
        if (inspection.status === 'completed' || !inspection.next_inspection_due) return false;
        return new Date(inspection.next_inspection_due) < new Date();
    };

    const filteredInspections = inspections.filter(inspection => {
        const facilityName = inspection.facility?.name || '';
        const inspectorName = inspection.inspector ? inspection.inspector.full_name : 'N/A';
        const matchesSearch =
            facilityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inspectorName.toLowerCase().includes(searchTerm.toLowerCase());

        let matchesStatus = filterStatus === 'all' || inspection.status === filterStatus;
        if (filterStatus === 'overdue') {
            matchesStatus = isOverdue(inspection);
        }

        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (inspection) => {
        const status = inspection.status;
        if (isOverdue(inspection)) {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <XCircle className="w-3 h-3 mr-1" />
                    Overdue
                </span>
            );
        }

        if (status === 'completed') {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Completed
                </span>
            );
        } else if (status === 'pending') {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <Calendar className="w-3 h-3 mr-1" />
                    Pending
                </span>
            );
        } else if (status === 'critical') {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <XCircle className="w-3 h-3 mr-1" />
                    Critical
                </span>
            );
        } else if (status === 'follow_up') {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <Filter className="w-3 h-3 mr-1" />
                    Follow Up
                </span>
            );
        } else {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
            );
        }
    };

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
                    <h1 className="text-2xl font-bold text-gray-900">Gaushala Inspections</h1>
                    <p className="text-gray-600 text-sm">Schedule and track veterinary and facility inspections</p>
                </div>
                <Link
                    to="/gaushala/inspections/new"
                    className="btn btn-primary flex items-center"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Inspection
                </Link>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search by Gaushala name or inspector..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>

                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                            <option value="overdue">Overdue</option>
                            <option value="critical">Critical</option>
                            <option value="follow_up">Follow Up</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="text-sm text-gray-500">Total Inspections</div>
                    <div className="text-2xl font-bold text-gray-900">{inspections.length}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                    <div className="text-sm text-gray-500">Completed</div>
                    <div className="text-2xl font-bold text-green-600">
                        {inspections.filter(i => i.status === 'completed').length}
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
                    <div className="text-sm text-gray-500">Pending</div>
                    <div className="text-2xl font-bold text-yellow-600">
                        {inspections.filter(i => i.status === 'pending').length}
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
                    <div className="text-sm text-gray-500">Overdue</div>
                    <div className="text-2xl font-bold text-red-600">
                        {inspections.filter(i => isOverdue(i)).length}
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gaushala</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inspection Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inspector</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Findings</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Veterinary Notes</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Due</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredInspections.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="px-6 py-8 text-center text-gray-500">No inspections found</td>
                                </tr>
                            ) : (
                                filteredInspections.map((inspection) => (
                                    <tr key={inspection.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{inspection.facility?.name || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center text-sm text-gray-900">
                                                <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                                                {new Date(inspection.inspection_date).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {inspection.inspector ? inspection.inspector.full_name : 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 truncate max-w-xs">{inspection.findings || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900 truncate max-w-xs">{inspection.veterinary_notes || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {inspection.next_inspection_due ? new Date(inspection.next_inspection_due).toLocaleDateString() : 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(inspection)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2">
                                                <Link to={`/gaushala/inspections/${inspection.id}`} className="text-primary-600 hover:text-primary-900" title="View Inspection">
                                                    <Eye className="h-5 w-5" />
                                                </Link>
                                                <Link to={`/gaushala/inspections/${inspection.id}/edit`} className="text-blue-600 hover:text-blue-900" title="Edit Inspection">
                                                    <Edit className="h-5 w-5" />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default GauShalaInspections;
