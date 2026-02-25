import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useBackTo } from '../../../contexts/NavigationContext';
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
    useBackTo('/toilet-management');
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Facility Staffing</h1>
                    <p className="text-gray-500 font-medium flex items-center gap-1.5 mt-1">
                        <Users className="w-4 h-4 text-primary-500" />
                        Monitor and manage personnel across all toilet facilities
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search facilities by name or location..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary-500 transition-all font-medium"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredFacilities.map((facility) => (
                    <div key={facility.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden group">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="h-12 w-12 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600">
                                    <Bath className="w-6 h-6" />
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${facility.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                                    {facility.status}
                                </span>
                            </div>

                            <h3 className="text-lg font-black text-gray-900 mb-1 group-hover:text-primary-600 transition-colors uppercase tracking-tight">
                                {facility.name}
                            </h3>
                            <p className="text-gray-500 text-sm mb-6 line-clamp-1 flex items-center gap-1.5 font-medium">
                                <Clock className="w-3.5 h-3.5 text-primary-400" />
                                {facility.location}
                            </p>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100/50">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Active Staff</p>
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-primary-500" />
                                        <span className="text-xl font-black text-gray-900">
                                            {facility.staffAssignments?.length || 0}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100/50">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Coverage</p>
                                    <div className="flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-green-500" />
                                        <span className="text-xl font-black text-gray-900">
                                            {facility.staffAssignments?.length > 0 ? 'Full' : 'None'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <Link
                                to={`/toilet-management/facilities/${facility.id}/staff`}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all hover:gap-3"
                            >
                                <UserCheck className="w-4 h-4" /> Manage Assignments <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                ))}

                {filteredFacilities.length === 0 && !loading && (
                    <div className="col-span-full py-20 text-center bg-white rounded-2xl border-2 border-dashed border-gray-100">
                        <Users className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No Matching Facilities</h3>
                        <p className="text-gray-500 max-w-xs mx-auto">Try adjusting your search terms to find the facility you're looking for.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GlobalStaffAssignment;
