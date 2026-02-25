import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Recycle,
    Plus,
    Search,
    Filter,
    MapPin,
    CheckCircle,
    XCircle,
    Edit,
    Eye,
    Download
} from 'lucide-react';
import api from '../../../services/api';
import { exportToCSV } from '../../../utils/exportCSV';

const MRFManagement = () => {
    const [facilities, setFacilities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [wards, setWards] = useState([]);

    useEffect(() => {
        fetchFacilities();
        fetchWards();
    }, []);

    const fetchWards = async () => {
        try {
            const response = await api.get('/wards');
            if (response.data && response.data.success) {
                setWards(response.data.data.wards);
            }
        } catch (error) {
            console.error('Failed to fetch wards:', error);
        }
    };

    const fetchFacilities = async () => {
        try {
            setLoading(true);
            const response = await api.get('/mrf/facilities');
            if (response.data && response.data.success) {
                setFacilities(response.data.data.facilities);
            }
        } catch (error) {
            console.error('Failed to fetch MRF facilities:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        const rows = filteredFacilities.map(f => ({
            name: f.name,
            location: f.location,
            ward: f.ward ? f.ward.wardName : 'N/A',
            status: f.status
        }));
        exportToCSV(rows, `mrf_facilities_${new Date().toISOString().slice(0, 10)}`);
    };

    const filteredFacilities = (facilities || []).filter(facility => {
        const matchesSearch =
            (facility.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (facility.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (facility.ward && (facility.ward.wardName || '').toLowerCase().includes(searchTerm.toLowerCase()));

        return matchesSearch;
    });

    const getStatusBadge = (status) => {
        const statusConfig = {
            active: 'bg-green-100 text-green-800',
            inactive: 'bg-red-100 text-red-800',
            maintenance: 'bg-yellow-100 text-yellow-800'
        };

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[status] || 'bg-gray-100 text-gray-800'}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
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
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Material Recovery Facility (MRF)</h1>
                    <p className="text-gray-600 text-sm">Manage recycling and waste processing centers</p>
                </div>
                <div className="flex gap-2">
                    <Link
                        to="/mrf/facilities/new"
                        className="btn btn-primary flex items-center"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add MRF Center
                    </Link>
                    <button
                        type="button"
                        onClick={handleExport}
                        className="btn btn-secondary flex items-center"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white rounded-lg shadow p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by center name, location, or ward..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                </div>
            </div>

            {/* Facilities List */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Center Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ward</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredFacilities.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                        No MRF centers found
                                    </td>
                                </tr>
                            ) : (
                                filteredFacilities.map((facility) => (
                                    <tr key={facility.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <Recycle className="h-5 w-5 text-green-500 mr-2" />
                                                <span className="font-medium text-gray-900">{facility.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center text-sm text-gray-900">
                                                <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                                                {facility.location}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {facility.ward ? facility.ward.wardName : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(facility.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2">
                                                <Link
                                                    to={`/mrf/facilities/${facility.id}`}
                                                    className="text-primary-600 hover:text-primary-900"
                                                    title="View Details"
                                                >
                                                    <Eye className="h-5 w-5" />
                                                </Link>
                                                <Link
                                                    to={`/mrf/facilities/${facility.id}/edit`}
                                                    className="text-blue-600 hover:text-blue-900"
                                                    title="Edit"
                                                >
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

export default MRFManagement;
