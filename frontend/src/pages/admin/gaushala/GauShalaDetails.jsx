import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useBackTo } from '../../../contexts/NavigationContext';
import {
    Beef,
    MapPin,
    Edit,
    Activity,
    PlusCircle,
    Stethoscope,
    Calendar,
    ClipboardList,
    FileText,
    Settings,
    Eye
} from 'lucide-react';
import api from '../../../services/api';
import CattleMedicalHistory from './CattleMedicalHistory';

const GauShalaDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [facility, setFacility] = useState(null);
    const [loading, setLoading] = useState(true);
    const [cattleCount, setCattleCount] = useState(0);
    const [feedingRecords, setFeedingRecords] = useState([]);

    useBackTo('/gaushala/facilities');

    useEffect(() => {
        fetchGaushalaDetails();
        fetchFeedingRecords();
    }, [id]);

    const fetchGaushalaDetails = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/gaushala/facilities/${id}`);
            if (response.data && response.data.success) {
                setFacility(response.data.data.facility);
                setCattleCount(response.data.data.facility.cattle?.length || 0);
            }
        } catch (error) {
            console.error('Failed to fetch Gaushala details:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFeedingRecords = async () => {
        try {
            const response = await api.get(`/gaushala/feeding-records?facility_id=${id}`);
            if (response.data && response.data.success) {
                setFeedingRecords(response.data.data.feedingRecords || []);
            }
        } catch (error) {
            console.error('Failed to fetch feeding records:', error);
        }
    };

    const getHealthRate = () => {
        const cattle = facility?.cattle || [];
        if (cattle.length === 0) return 'N/A';
        const healthy = cattle.filter(c => c.health_status === 'healthy').length;
        return Math.round((healthy / cattle.length) * 100) + '%';
    };

    const getLastInspectionDate = () => {
        const inspections = facility?.inspections || [];
        if (inspections.length === 0) return 'No inspections';
        const sorted = [...inspections].sort((a, b) => new Date(b.inspection_date) - new Date(a.inspection_date));
        return new Date(sorted[0].inspection_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const recentFeedings = feedingRecords.slice(0, 5);

    const today = new Date().toISOString().split('T')[0];
    const todayTotal = feedingRecords
        .filter(r => (r.record_date || '').slice(0, 10) === today)
        .reduce((sum, r) => sum + parseFloat(r.quantity || 0), 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (!facility) {
        return (
            <div className="text-center p-12 bg-white rounded-lg shadow">
                <p className="text-gray-500">Gaushala facility not found.</p>
                <button onClick={() => navigate(-1)} className="mt-4 text-primary-600 font-semibold underline">Go Back</button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{facility.name}</h1>
                    <p className="text-gray-600 text-sm flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {facility.location}
                    </p>
                </div>
                <Link
                    to={`/gaushala/facilities/${id}/edit`}
                    className="btn btn-secondary flex items-center gap-2 text-sm"
                >
                    <Edit className="w-4 h-4" /> Edit
                </Link>
            </div>

            {/* Section 1: Top Summary Row — 4 equal stat cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="text-sm text-gray-500">Total Cattle</div>
                    <div className="text-2xl font-bold text-gray-900">{cattleCount}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                    <div className="text-sm text-gray-500">Health Rate</div>
                    <div className="text-2xl font-bold text-green-600">{getHealthRate()}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                    <div className="text-sm text-gray-500">Status</div>
                    <div className="flex items-center gap-1.5 mt-1">
                        <div className={`h-2 w-2 rounded-full ${facility.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className={`text-sm font-bold uppercase ${facility.status === 'active' ? 'text-green-700' : 'text-red-700'}`}>{facility.status}</span>
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
                    <div className="text-sm text-gray-500">Last Inspection</div>
                    <div className="text-sm font-bold text-gray-900 mt-1">{getLastInspectionDate()}</div>
                </div>
            </div>

            {/* Section 2: Two-column grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column — Animal Records + Recent Feeding Logs */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Animal Records */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="px-6 py-4 bg-gray-50 flex justify-between items-center border-b border-gray-100">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                <Activity className="w-4 h-4 text-orange-600" />
                                Animal Records
                            </h3>
                            <Link to={`/gaushala/facilities/${id}/cattle`} className="text-xs font-semibold text-primary-600 hover:underline">Manage Cattle</Link>
                        </div>
                        <div className="p-6">
                            {facility.cattle?.length > 0 ? (
                                <div className="space-y-3">
                                    {facility.cattle.slice(0, 5).map((animal) => (
                                        <div key={animal.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg border border-gray-50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 bg-orange-50 rounded-full flex items-center justify-center text-orange-700 font-bold text-xs uppercase">
                                                    {animal.animal_type?.[0]}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">Tag: {animal.tag_number || '#' + animal.id}</p>
                                                    <p className="text-xs text-gray-500 font-medium uppercase">{animal.animal_type} | {animal.gender}</p>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${animal.health_status === 'healthy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {animal.health_status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-gray-400 text-sm">No animals registered in this facility.</p>
                                    <Link to={`/gaushala/facilities/${id}/cattle`} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-lg text-xs font-bold hover:bg-orange-100 transition-colors">
                                        <PlusCircle className="w-3.5 h-3.5" />
                                        Add First Animal
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Feeding Logs */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="px-6 py-4 bg-gray-50 flex justify-between items-center border-b border-gray-100">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                <ClipboardList className="w-4 h-4 text-orange-600" />
                                Recent Feeding Logs
                            </h3>
                            <Link to="/gaushala/feeding" className="text-xs font-semibold text-primary-600 hover:underline">View All</Link>
                        </div>
                        <div className="p-6">
                            {recentFeedings.length > 0 ? (
                                <div className="space-y-3">
                                    {recentFeedings.map((record) => (
                                        <div key={record.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg border border-gray-50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 bg-green-50 rounded-full flex items-center justify-center">
                                                    <Beef className="w-4 h-4 text-green-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900 capitalize">{record.fodder_type}</p>
                                                    <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(record.record_date).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                {record.quantity} KG
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-gray-400 text-sm">No feeding records yet.</p>
                                    <Link to="/gaushala/feeding" className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors">
                                        <PlusCircle className="w-3.5 h-3.5" />
                                        Log First Feeding
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column — Health Compliance + Quick Actions */}
                <div className="space-y-6">
                    {/* Health Compliance */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Stethoscope className="w-4 h-4 text-orange-600" />
                            Health Compliance
                        </h3>
                        <div className="space-y-4">
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Last Vet Visit</p>
                                <p className="text-sm font-bold text-gray-900">{getLastInspectionDate()}</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Today's Fodder</p>
                                <p className="text-sm font-bold text-gray-900">{todayTotal} KG</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Next Vaccination</p>
                                <p className="text-sm font-bold text-primary-600">Schedule Now</p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Settings className="w-4 h-4 text-gray-500" />
                            Quick Actions
                        </h3>
                        <div className="space-y-2">
                            <Link
                                to={`/gaushala/facilities/${id}/cattle`}
                                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <div className="h-8 w-8 bg-orange-50 rounded-lg flex items-center justify-center">
                                    <Activity className="w-4 h-4 text-orange-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">Manage Cattle</p>
                                    <p className="text-xs text-gray-400">Add or edit animal records</p>
                                </div>
                            </Link>
                            <Link
                                to="/gaushala/feeding"
                                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <div className="h-8 w-8 bg-green-50 rounded-lg flex items-center justify-center">
                                    <ClipboardList className="w-4 h-4 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">Feeding Logs</p>
                                    <p className="text-xs text-gray-400">Update daily fodder records</p>
                                </div>
                            </Link>
                            <Link
                                to="/gaushala/inspections"
                                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <div className="h-8 w-8 bg-blue-50 rounded-lg flex items-center justify-center">
                                    <FileText className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">Inspections</p>
                                    <p className="text-xs text-gray-400">View inspection history</p>
                                </div>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Medical History Section — Full width */}
            <div className="bg-white rounded-lg shadow p-6">
                <CattleMedicalHistory cattleId={null} facilityId={id} />
            </div>
        </div>
    );
};

export default GauShalaDetails;
