import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Settings,
    Calendar,
    User,
    IndianRupee,
    CheckCircle2,
    Clock,
    MapPin,
    Edit,
    ClipboardList
} from 'lucide-react';
import { useBackTo } from '../../../contexts/NavigationContext';
import api from '../../../services/api';

const MaintenanceDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    useBackTo('/toilet-management/maintenance');
    const [record, setRecord] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMaintenanceDetails();
    }, [id]);

    const fetchMaintenanceDetails = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/toilet/maintenance/${id}`);
            if (response.data && response.data.success) {
                setRecord(response.data.data.maintenanceRecord);
            }
        } catch (error) {
            console.error('Failed to fetch maintenance details:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-700 border-green-200';
            case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (!record) {
        return (
            <div className="text-center p-12 bg-white rounded-xl border border-gray-100">
                <p className="text-gray-500">Maintenance record not found.</p>
                <button onClick={() => navigate(-1)} className="mt-4 text-primary-600 font-semibold underline">Go Back</button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Maintenance Detail</h1>
                    <p className="text-gray-500 text-sm">Ref ID: MNT-{record.id.toString().padStart(4, '0')}</p>
                </div>
                <Link
                    to={`/toilet-management/maintenance/${record.id}/edit`}
                    className="btn btn-secondary flex items-center gap-2 text-sm font-semibold"
                >
                    <Edit className="w-4 h-4" /> Edit Record
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Main Info Card */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex justify-between items-start">
                            <div className="space-y-3">
                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border ${record.priority === 'high' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                    {record.priority} priority
                                </span>
                                <h2 className="text-xl font-bold text-gray-900">{record.type}</h2>
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <span className="flex items-center gap-1.5 font-medium">
                                        <MapPin className="w-4 h-4 text-primary-500" />
                                        {record.facility?.name}
                                    </span>
                                </div>
                            </div>
                            <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase border ${getStatusStyle(record.status)}`}>
                                {record.status.replace('_', ' ')}
                            </div>
                        </div>

                        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date Scheduled</p>
                                <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    {new Date(record.scheduledDate).toLocaleDateString()}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Assigned Staff</p>
                                <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                                    <User className="w-4 h-4 text-gray-400" />
                                    {record.staff?.full_name}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Completion Date</p>
                                <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    {record.completedDate ? new Date(record.completedDate).toLocaleDateString() : 'Pending'}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Actual Cost</p>
                                <div className="flex items-center gap-2 text-sm font-bold text-primary-600">
                                    <IndianRupee className="w-4 h-4" />
                                    {record.cost || '0.00'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notes Card */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Maintenance Notes</h3>
                        <div className="p-4 bg-gray-50 rounded-xl">
                            <p className="text-sm text-gray-700 leading-relaxed">
                                {record.notes || "No detailed notes provided for this maintenance activity."}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Materials Used</h3>
                        {record.materialsUsed?.length > 0 ? (
                            <div className="space-y-2">
                                {record.materialsUsed.map((m, idx) => (
                                    <div key={idx} className="flex justify-between p-2 bg-gray-50 rounded-lg text-xs font-semibold text-gray-700">
                                        <span>{m}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 italic">No materials list provided</p>
                        )}
                    </div>

                    <div className="bg-gray-900 rounded-2xl p-6 text-white">
                        <CheckCircle2 className="w-8 h-8 text-green-400 mb-4" />
                        <h3 className="text-sm font-bold mb-2">Completion Status</h3>
                        <p className="text-xs opacity-60 mb-6">Verified by the assigned engineer upon task completion.</p>
                        {record.status === 'completed' ? (
                            <div className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-[10px] font-bold uppercase text-center">
                                Task Verified & Closed
                            </div>
                        ) : (
                            <div className="px-4 py-2 bg-white/10 text-white opacity-60 rounded-lg text-[10px] font-bold uppercase text-center">
                                Awaiting Verification
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MaintenanceDetails;
