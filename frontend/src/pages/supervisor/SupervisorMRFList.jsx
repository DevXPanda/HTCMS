import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Recycle, Search, MapPin, Eye, CheckCircle, ClipboardList } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const SupervisorMRFList = () => {
    const navigate = useNavigate();
    const [facilities, setFacilities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchFacilities();
    }, []);

    const fetchFacilities = async () => {
        try {
            setLoading(true);
            const response = await api.get('/mrf/facilities');
            if (response.data?.success) {
                setFacilities(response.data.data.facilities || []);
            }
        } catch (error) {
            console.error('Failed to fetch MRF facilities:', error);
            toast.error(error.response?.data?.message || 'Failed to load your MRF facilities');
        } finally {
            setLoading(false);
        }
    };

    const filteredFacilities = (facilities || []).filter(facility => {
        const term = (searchTerm || '').toLowerCase();
        return (
            (facility.name || '').toLowerCase().includes(term) ||
            (facility.location || '').toLowerCase().includes(term) ||
            (facility.ward?.wardName || '').toLowerCase().includes(term)
        );
    });

    const getStatusBadge = (status) => {
        const map = { active: 'bg-green-100 text-green-800', inactive: 'bg-red-100 text-red-800', maintenance: 'bg-yellow-100 text-yellow-800' };
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-800'}`}>
                {(status || '').charAt(0).toUpperCase() + (status || '').slice(1)}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-500 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <ClipboardList className="w-7 h-7 text-primary-600" />
                        MRF Task Board
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Assign and update tasks for your assigned facilities</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, location, or ward..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>
                </div>
                <div className="divide-y divide-gray-100">
                    {filteredFacilities.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <Recycle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                            <p className="font-medium">No MRF facilities assigned to you</p>
                            <p className="text-sm mt-1">Contact admin to be assigned to an MRF facility.</p>
                        </div>
                    ) : (
                        filteredFacilities.map((facility) => (
                            <div key={facility.id} className="p-4 hover:bg-gray-50/50 flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="h-12 w-12 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                                        <Recycle className="w-6 h-6 text-primary-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-gray-900 truncate">{facility.name}</p>
                                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                                            <MapPin className="w-3.5 h-3.5" />
                                            {facility.location}, Ward {facility.ward?.wardNumber}
                                        </p>
                                        <div className="mt-1.5">{getStatusBadge(facility.status)}</div>
                                    </div>
                                </div>
                                <Link
                                    to={`/supervisor/mrf/facilities/${facility.id}`}
                                    className="btn btn-primary btn-sm inline-flex items-center gap-2"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    Open Task Board
                                </Link>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default SupervisorMRFList;
