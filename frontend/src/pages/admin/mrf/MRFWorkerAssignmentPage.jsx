import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useBackTo } from '../../../contexts/NavigationContext';
import {
    Recycle,
    Users,
    Search,
    ArrowRight,
    UserCheck,
    MapPin,
    Shield
} from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const MRFWorkerAssignmentPage = () => {
    useBackTo('/mrf');
    const [facilities, setFacilities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchFacilities();
    }, []);

    const fetchFacilities = async () => {
        try {
            setLoading(true);
            const response = await api.get('/mrf/facilities?limit=100');
            if (response.data && response.data.success) {
                setFacilities(response.data.data.facilities || []);
            }
        } catch (error) {
            console.error('Failed to fetch MRF facilities:', error);
            toast.error('Failed to load facilities.');
        } finally {
            setLoading(false);
        }
    };

    const filteredFacilities = facilities.filter(f =>
        (f.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.ward?.wardName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner spinner-md" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="ds-page-header">
                <div>
                    <h1 className="ds-page-title">Worker Assignment</h1>
                    <p className="ds-page-subtitle flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-primary-500" />
                        Assign workers to MRF facilities
                    </p>
                </div>
            </div>

            <div className="card">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search facilities by name, location, or ward..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input pl-10 w-full"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredFacilities.map((facility) => (
                    <div key={facility.id} className="card card-hover p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="h-12 w-12 bg-green-100 rounded-ds flex items-center justify-center text-green-600 shrink-0">
                                <Recycle className="w-6 h-6" />
                            </div>
                            <span className={facility.status === 'active' ? 'badge badge-success' : 'badge badge-warning'}>
                                {facility.status}
                            </span>
                        </div>

                        <h3 className="ds-section-title mb-1 truncate" title={facility.name}>{facility.name}</h3>
                        <p className="text-sm text-gray-500 mb-4 line-clamp-1 flex items-center gap-1.5 min-h-[1.25rem]">
                            <MapPin className="w-3.5 h-3.5 text-primary-400 shrink-0" />
                            <span className="truncate">{facility.location || '—'}</span>
                        </p>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="stat-card py-3 px-3">
                                <p className="stat-card-title flex items-center justify-between gap-1">
                                    <span className="text-xs uppercase tracking-wide text-gray-500">Ward</span>
                                    <Shield className="w-4 h-4 text-gray-400 shrink-0" />
                                </p>
                                <p className="stat-card-value text-sm font-semibold text-gray-900 truncate" title={facility.ward?.wardName}>
                                    {facility.ward?.wardName || 'N/A'}
                                </p>
                            </div>
                            <div className="stat-card py-3 px-3">
                                <p className="stat-card-title flex items-center justify-between gap-1">
                                    <span className="text-xs uppercase tracking-wide text-gray-500">Assigned</span>
                                    <Users className="w-4 h-4 text-gray-400 shrink-0" />
                                </p>
                                <p className="stat-card-value text-lg font-bold text-primary-600">
                                    {typeof facility.workerCount === 'number' ? facility.workerCount : 0}
                                </p>
                            </div>
                        </div>

                        <Link
                            to={`/mrf/facilities/${facility.id}?tab=workers`}
                            className="btn btn-primary w-full justify-center mt-2"
                        >
                            <UserCheck className="w-4 h-4" /> Manage Assignments <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                ))}

                {filteredFacilities.length === 0 && !loading && (
                    <div className="col-span-full empty-state">
                        <Users className="empty-state-icon text-gray-300" />
                        <h3 className="empty-state-title">No Matching Facilities</h3>
                        <p className="empty-state-text max-w-sm mx-auto">Try adjusting your search or add MRF centers first.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MRFWorkerAssignmentPage;
