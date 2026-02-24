import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useBackTo } from '../../../contexts/NavigationContext';
import {
    Beef,
    Plus,
    Search,
    Filter,
    MapPin,
    CheckCircle,
    XCircle,
    Eye,
    Edit,
    AlertCircle,
    X,
    Download
} from 'lucide-react';
import api from '../../../services/api';
import { exportToCSV } from '../../../utils/exportCSV';

const GauShalaManagement = () => {
    useBackTo('/gaushala/management');
    const [facilities, setFacilities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        status: '',
        ward: ''
    });
    const [wards, setWards] = useState([]);

    const [cattle, setCattle] = useState([]);
    const [inspections, setInspections] = useState([]);
    const [complaints, setComplaints] = useState([]);

    useEffect(() => {
        fetchData();
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

    const fetchData = async () => {
        try {
            setLoading(true);
            const [facRes, cattleRes, inspRes, compRes] = await Promise.all([
                api.get('/gaushala/facilities'),
                api.get('/gaushala/cattle'),
                api.get('/gaushala/inspections'),
                api.get('/gaushala/complaints')
            ]);

            if (facRes.data && facRes.data.success) {
                setFacilities(facRes.data.data.facilities);
            }
            if (cattleRes.data && cattleRes.data.success) {
                setCattle(cattleRes.data.data.cattle);
            }
            if (inspRes.data && inspRes.data.success) {
                setInspections(inspRes.data.data.inspections);
            }
            if (compRes.data && compRes.data.success) {
                setComplaints(compRes.data.data.complaints);
            }
        } catch (error) {
            console.error('Failed to fetch Gaushala data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
        setFilters({
            status: '',
            ward: ''
        });
    };

    const handleExport = () => {
        const rows = filteredFacilities.map(f => {
            const facilityStats = getFacilityStats(f.id);
            return {
                name: f.name,
                location: f.location,
                ward: f.ward?.wardName || 'N/A',
                status: f.status,
                totalCattle: facilityStats.cattleCount,
                lastInspection: facilityStats.lastInspection || 'N/A',
                totalComplaints: facilityStats.complaintCount
            };
        });
        exportToCSV(rows, `gaushala_facilities_${new Date().toISOString().slice(0, 10)}`);
    };

    const getFacilityStats = (facilityId) => {
        const facilityCattle = cattle.filter(c => c.gau_shala_facility_id === facilityId);
        const facilityInspections = inspections.filter(i => i.gau_shala_facility_id === facilityId);
        const facilityComplaints = complaints.filter(c => c.gau_shala_facility_id === facilityId);

        const lastInsp = facilityInspections.length > 0
            ? new Date(Math.max(...facilityInspections.map(i => new Date(i.inspection_date)))).toLocaleDateString()
            : null;

        return {
            cattleCount: facilityCattle.length,
            complaintCount: facilityComplaints.length,
            lastInspection: lastInsp
        };
    };

    const filteredFacilities = facilities.filter(facility => {
        const name = facility.name || '';
        const location = facility.location || '';
        const wardName = facility.ward?.wardName || '';

        const matchesSearch =
            name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            location.toLowerCase().includes(searchTerm.toLowerCase()) ||
            wardName.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = !filters.status || facility.status === filters.status;
        const matchesWard = !filters.ward || facility.ward_id?.toString() === filters.ward;

        return matchesSearch && matchesStatus && matchesWard;
    });

    const getStatusBadge = (status) => {
        const statusConfig = {
            active: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
            inactive: { color: 'bg-red-100 text-red-800', icon: XCircle }
        };

        const config = statusConfig[status] || statusConfig.inactive;
        const Icon = config.icon;

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
                <Icon className="w-3 h-3 mr-1" />
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
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Gaushala Facilities</h1>
                <div className="flex gap-2">
                    <Link
                        to="/gaushala/facilities/new"
                        className="btn btn-primary flex items-center"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Gaushala
                    </Link>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="btn btn-secondary flex items-center"
                    >
                        <Filter className="w-4 h-4 mr-2" />
                        Filters
                    </button>
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

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="text-sm text-gray-500">Total Gaushalas</div>
                    <div className="text-2xl font-bold text-gray-900">{facilities.length}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="text-sm text-gray-500">Active</div>
                    <div className="text-2xl font-bold text-green-600">
                        {facilities.filter(f => f.status === 'active').length}
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="text-sm text-gray-500">Inactive</div>
                    <div className="text-2xl font-bold text-red-600">
                        {facilities.filter(f => f.status === 'inactive').length}
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="text-sm text-gray-500">Total Cattle</div>
                    <div className="text-2xl font-bold text-orange-600">
                        {cattle.length}
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="text-sm text-gray-500">Pending Complaints</div>
                    <div className="text-2xl font-bold text-red-600">
                        {complaints.filter(c => c.status === 'pending').length}
                    </div>
                </div>
            </div>

            {/* Search */}
            <form onSubmit={(e) => { e.preventDefault(); }} className="mb-6">
                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search by facility name, location, or ward..."
                            className="input pl-10"
                        />
                    </div>
                    <button type="submit" className="btn btn-primary">
                        Search
                    </button>
                </div>
            </form>

            {/* Filters Panel */}
            {showFilters && (
                <div className="card mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Filters</h3>
                        <button
                            onClick={clearFilters}
                            className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
                        >
                            <X className="w-4 h-4 mr-1" />
                            Clear All
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="label">Status</label>
                            <select
                                value={filters.status}
                                onChange={(e) => handleFilterChange('status', e.target.value)}
                                className="input"
                            >
                                <option value="">All Status</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>

                        <div>
                            <label className="label">Ward</label>
                            <select
                                value={filters.ward}
                                onChange={(e) => handleFilterChange('ward', e.target.value)}
                                className="input"
                            >
                                <option value="">All Wards</option>
                                {wards.map(ward => (
                                    <option key={ward.id} value={ward.id.toString()}>
                                        {ward.wardNumber} - {ward.wardName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* Facilities List */}
            <div className="card overflow-x-auto">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Facility Name</th>
                            <th>Location</th>
                            <th>Ward</th>
                            <th>Status</th>
                            <th>Total Cattle</th>
                            <th>Last Inspection</th>
                            <th>Total Complaints</th>
                            <th className="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredFacilities.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="text-center py-8 text-gray-500">
                                    No Gaushala facilities found
                                </td>
                            </tr>
                        ) : (
                            filteredFacilities.map((facility) => {
                                const stats = getFacilityStats(facility.id);
                                return (
                                    <tr key={facility.id}>
                                        <td>
                                            <div className="flex items-center">
                                                <Beef className="h-5 w-5 text-orange-500 mr-2" />
                                                <span className="font-medium text-gray-900">{facility.name}</span>
                                            </div>
                                        </td>
                                        <td>{facility.location}</td>
                                        <td>{facility.ward?.wardName || 'N/A'}</td>
                                        <td>{getStatusBadge(facility.status)}</td>
                                        <td>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                                {stats.cattleCount} cattle
                                            </span>
                                        </td>
                                        <td>{stats.lastInspection || 'Never'}</td>
                                        <td>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${stats.complaintCount > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                                {stats.complaintCount} complaints
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex justify-end gap-2">
                                                <Link
                                                    to={`/gaushala/facilities/${facility.id}`}
                                                    className="text-primary-600 hover:text-primary-900"
                                                    title="View Details"
                                                >
                                                    <Eye className="h-5 w-5" />
                                                </Link>
                                                <Link
                                                    to={`/gaushala/facilities/${facility.id}/edit`}
                                                    className="text-blue-600 hover:text-blue-900"
                                                    title="Edit"
                                                >
                                                    <Edit className="h-5 w-5" />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default GauShalaManagement;
