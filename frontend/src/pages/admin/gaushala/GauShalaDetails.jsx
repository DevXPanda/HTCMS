import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Beef,
    MapPin,
    CheckCircle,
    XCircle,
    Edit,
    Activity,
    ClipboardList,
    PlusCircle,
    Stethoscope,
    Trash2
} from 'lucide-react';
import api from '../../../services/api';
import CattleMedicalHistory from './CattleMedicalHistory';

const GauShalaDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [facility, setFacility] = useState(null);
    const [loading, setLoading] = useState(true);
    const [cattleCount, setCattleCount] = useState(0);

    useEffect(() => {
        fetchGaushalaDetails();
    }, [id]);

    const fetchGaushalaDetails = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/gaushala/facilities/${id}`);
            if (response.data && response.data.success) {
                setFacility(response.data.data.facility);
                // Assuming cattle are included or fetched separately
                setCattleCount(response.data.data.facility.cattle?.length || 0);
            }
        } catch (error) {
            console.error('Failed to fetch Gaushala details:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (!facility) {
        return (
            <div className="text-center p-12 bg-white rounded-xl border border-gray-100 shadow-sm">
                <p className="text-gray-500">Gaushala facility not found.</p>
                <button onClick={() => navigate(-1)} className="mt-4 text-primary-600 font-semibold underline">Go Back</button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                            <Beef className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{facility.name}</h1>
                            <p className="text-gray-500 text-sm flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" /> {facility.location}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Link
                        to={`/gaushala/facilities/${id}/edit`}
                        className="btn btn-secondary flex items-center gap-2 text-sm"
                    >
                        <Edit className="w-4 h-4" /> Edit
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Stats Bar */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Total Cattle</p>
                            <p className="text-2xl font-black text-gray-900">{cattleCount}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Health Rate</p>
                            <p className="text-2xl font-black text-green-600">96%</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Status</p>
                            <div className="flex items-center justify-center gap-1.5 mt-1">
                                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                <span className="text-xs font-bold uppercase text-green-700">{facility.status}</span>
                            </div>
                        </div>
                    </div>

                    {/* Cattle List Preview */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-50 bg-gray-50 flex justify-between items-center">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                                <Activity className="w-4 h-4 text-orange-600" />
                                Animal Records
                            </h3>
                            <Link to={`/gaushala/facilities/${id}/cattle`} className="text-xs font-semibold text-primary-600 hover:underline">Manage Cattle</Link>
                        </div>
                        <div className="p-6">
                            {facility.cattle?.length > 0 ? (
                                <div className="space-y-4">
                                    {facility.cattle.slice(0, 5).map((animal) => (
                                        <div key={animal.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg border border-gray-50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 bg-orange-50 rounded-full flex items-center justify-center text-orange-700 font-bold text-xs uppercase">
                                                    {animal.animal_type?.[0]}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">Tag: {animal.tag_number || '#' + animal.id}</p>
                                                    <p className="text-[10px] text-gray-500 font-medium uppercase">{animal.animal_type} | {animal.gender}</p>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${animal.health_status === 'healthy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
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

                    {/* Medical History Section */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <CattleMedicalHistory cattleId={null} facilityId={id} />
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Stethoscope className="w-4 h-4 text-orange-600" />
                            Health Compliance
                        </h3>
                        <div className="space-y-4">
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Last Vet Visit</p>
                                <p className="text-sm font-bold text-gray-900">Oct 12, 2023</p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Next Vaccination</p>
                                <p className="text-sm font-bold text-primary-600 underline">Schedule Now</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-orange-600 rounded-2xl p-6 text-white shadow-xl shadow-orange-600/20">
                        <h3 className="text-xs font-bold uppercase tracking-widest mb-4 opacity-80">Feeding Log Summary</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-2xl font-black">420 KG</p>
                                    <p className="text-[10px] opacity-70 uppercase font-bold">Today's Fodder</p>
                                </div>
                                <div className="h-10 w-10 bg-white/20 rounded-lg flex items-center justify-center">
                                    <ClipboardList className="w-5 h-5 text-white" />
                                </div>
                            </div>
                            <button className="w-full py-2 bg-white text-orange-700 rounded-lg text-xs font-bold hover:bg-orange-50 transition-colors">
                                Update Daily Logs
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GauShalaDetails;
