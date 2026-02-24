import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useBackTo } from '../../../contexts/NavigationContext';
import * as Lucide from 'lucide-react';
import api from '../../../services/api';

const GauShalaCattleTotal = () => {
    useBackTo('/gaushala/management');
    const [animals, setAnimals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterFacility, setFilterFacility] = useState('all');
    const [facilities, setFacilities] = useState([]);

    useEffect(() => {
        fetchAnimals();
        fetchFacilities();
    }, []);

    const fetchFacilities = async () => {
        try {
            const response = await api.get('/gaushala/facilities');
            if (response.data && response.data.success) {
                setFacilities(response.data.data.facilities);
            }
        } catch (error) {
            console.error('Failed to fetch facilities:', error);
        }
    };

    const fetchAnimals = async () => {
        try {
            setLoading(true);
            const response = await api.get('/gaushala/cattle');
            if (response.data && response.data.success) {
                setAnimals(response.data.data.cattle);
            }
        } catch (error) {
            console.error('Failed to fetch animals:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredAnimals = animals.filter(animal => {
        const matchesSearch =
            (animal.tag_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (animal.animal_type || '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchesFacility = filterFacility === 'all' || animal.gau_shala_facility_id?.toString() === filterFacility;

        return matchesSearch && matchesFacility;
    });

    const getHealthBadge = (status) => {
        const config = {
            healthy: { color: 'bg-green-100 text-green-800', icon: Lucide.CheckCircle || Lucide.CircleCheck || Lucide.Circle },
            sick: { color: 'bg-red-100 text-red-800', icon: Lucide.AlertCircle || Lucide.AlertTriangle },
            under_treatment: { color: 'bg-blue-100 text-blue-800', icon: Lucide.Stethoscope || Lucide.Activity },
            critical: { color: 'bg-purple-100 text-purple-800', icon: Lucide.AlertCircle || Lucide.AlertTriangle },
            quarantined: { color: 'bg-yellow-100 text-yellow-800', icon: Lucide.XCircle || Lucide.X }
        };

        const displayStatus = status || 'healthy';
        const item = config[displayStatus] || config.healthy;
        const Icon = item.icon;

        return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${item.color}`}>
                {Icon && <Icon className="w-3 h-3 mr-1" />}
                {displayStatus.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Cattle Registry</h1>
                    <p className="text-gray-600 text-sm">Register and Check data of cattle</p>
                </div>
                <Link
                    to="/gaushala/all-cattle/new"
                    className="btn btn-primary flex items-center"
                >
                    <Lucide.Plus className="h-4 w-4 mr-2" />
                    Register New Animal
                </Link>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="text-sm text-gray-500">Total Cattle</div>
                    <div className="text-2xl font-bold text-gray-900">{animals.length}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                    <div className="text-sm text-gray-500">Healthy</div>
                    <div className="text-2xl font-bold text-green-600">
                        {animals.filter(a => a.health_status === 'healthy' || !a.health_status).length}
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                    <div className="text-sm text-gray-500">Under Treatment</div>
                    <div className="text-2xl font-bold text-blue-600">
                        {animals.filter(a => a.health_status === 'under_treatment').length}
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
                    <div className="text-sm text-gray-500">Critical</div>
                    <div className="text-2xl font-bold text-red-600">
                        {animals.filter(a => a.health_status === 'critical' || a.health_status === 'sick').length}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                        <Lucide.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search by tag number or animal type..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>

                    <div className="relative">
                        <Lucide.Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <select
                            value={filterFacility}
                            onChange={(e) => setFilterFacility(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
                        >
                            <option value="all">All Facilities</option>
                            {facilities.map(f => (
                                <option key={f.id} value={f.id.toString()}>{f.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tag Number</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gaushala</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Animal Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date of Birth</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Health Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredAnimals.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="px-6 py-8 text-center text-gray-500">No animals found</td>
                                </tr>
                            ) : (
                                filteredAnimals.map((animal) => (
                                    <tr key={animal.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <Lucide.Beef className="h-5 w-5 text-orange-500 mr-2" />
                                                <span className="font-medium text-gray-900">{animal.tag_number}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div className="flex items-center">
                                                <Lucide.MapPin className="w-3 h-3 mr-1" />
                                                {animal.facility?.name || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                                            {animal.animal_type}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                            {animal.gender}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {animal.date_of_birth ? new Date(animal.date_of_birth).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getHealthBadge(animal.health_status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-xs">
                                            {animal.notes || 'No notes'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <Link to={`/gaushala/all-cattle`} className="text-primary-600 hover:text-primary-900">
                                                <Lucide.Eye className="h-5 w-5" />
                                            </Link>
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

export default GauShalaCattleTotal;
