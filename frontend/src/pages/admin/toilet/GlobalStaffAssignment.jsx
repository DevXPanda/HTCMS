import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useBackTo } from '../../../contexts/NavigationContext';
import { useToiletBasePath } from './useToiletBasePath';
import {
    Bath,
    Users,
    Search,
    Filter,
    ArrowRight,
    UserCheck,
    Clock,
    Shield
} from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const GlobalStaffAssignment = () => {
    const base = useToiletBasePath();
    useBackTo(base);
    const [facilities, setFacilities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchFacilities();
    }, []);

    const fetchFacilities = async () => {
        try {
            setLoading(true);
            const response = await api.get('/toilet/facilities');
            if (response.data && response.data.success) {
                setFacilities(response.data.data.facilities);
            }
        } catch (error) {
            console.error('Failed to fetch facilities:', error);
            toast.error('Failed to load facilities.');
        } finally {
            setLoading(false);
        }
    };

    const filteredFacilities = facilities.filter(f =>
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.location.toLowerCase().includes(searchTerm.toLowerCase())
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
                    <h1 className="ds-page-title">Facility Staffing</h1>
                    <p className="ds-page-subtitle flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-primary-500" />
                        Monitor and manage personnel across all toilet facilities
                    </p>
                </div>
            </div>

            <div className="card-flat">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search facilities by name or location..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input pl-10"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredFacilities.map((facility) => (
                    <div key={facility.id} className="card-hover">
                        <div className="flex justify-between items-start mb-4">
                            <div className="h-12 w-12 bg-primary-100 rounded-ds flex items-center justify-center text-primary-600">
                                <Bath className="w-6 h-6" />
                            </div>
                            <span className={facility.status === 'active' ? 'badge badge-success' : 'badge badge-warning'}>
                                {facility.status}
                            </span>
                        </div>

                        <h3 className="ds-section-title mb-1">{facility.name}</h3>
                        <p className="text-sm text-gray-500 mb-4 line-clamp-1 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-primary-400" />
                            {facility.location}
                        </p>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="stat-card py-3">
                                <p className="stat-card-title">
                                    <span>Active Staff</span>
                                    <Users className="w-4 h-4 text-gray-400" />
                                </p>
                                <p className="stat-card-value">{facility.staffAssignments?.length || 0}</p>
                            </div>
                            <div className="stat-card py-3">
                                <p className="stat-card-title">
                                    <span>Coverage</span>
                                    <Shield className="w-4 h-4 text-gray-400" />
                                </p>
                                <p className="stat-card-value">{facility.staffAssignments?.length > 0 ? 'Full' : 'None'}</p>
                            </div>
                        </div>

                        <Link
                            to={`${base}/facilities/${facility.id}/staff`}
                            className="btn btn-primary w-full justify-center"
                        >
                            <UserCheck className="w-4 h-4" /> Manage Assignments <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                ))}

                {filteredFacilities.length === 0 && !loading && (
                    <div className="col-span-full empty-state">
                        <Users className="empty-state-icon text-gray-300" />
                        <h3 className="empty-state-title">No Matching Facilities</h3>
                        <p className="empty-state-text max-w-sm mx-auto">Try adjusting your search terms to find the facility you&apos;re looking for.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GlobalStaffAssignment;
