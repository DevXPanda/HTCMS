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
    ClipboardList,
    Camera
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
                <div className="spinner spinner-md" />
            </div>
        );
    }

    if (!record) {
        return (
            <div className="empty-state">
                <p className="text-gray-500">Maintenance record not found.</p>
                <button onClick={() => navigate(-1)} className="btn btn-primary mt-4">Go Back</button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="ds-page-header flex flex-wrap justify-between items-start gap-4">
                <div>
                    <h1 className="ds-page-title">Maintenance Detail</h1>
                    <p className="ds-page-subtitle">Ref ID: MNT-{record.id.toString().padStart(4, '0')}</p>
                </div>
                <Link
                    to={`/toilet-management/maintenance/${record.id}/edit`}
                    className="btn btn-secondary flex items-center gap-2"
                >
                    <Edit className="w-4 h-4" /> Edit Record
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Main Info Card */}
                    <div className="card overflow-hidden p-0">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-start">
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
                            <span className={`badge ${record.status === 'completed' ? 'badge-success' : record.status === 'in_progress' ? 'badge-info' : record.status === 'cancelled' ? 'badge-danger' : 'badge-warning'}`}>
                                {record.status.replace('_', ' ')}
                            </span>
                        </div>

                        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="space-y-1">
                                <p className="ds-section-title-muted">Date Scheduled</p>
                                <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    {new Date(record.scheduledDate).toLocaleDateString()}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="ds-section-title-muted">Assigned Staff</p>
                                <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                                    <User className="w-4 h-4 text-gray-400" />
                                    {record.staff?.full_name}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="ds-section-title-muted">Completion Date</p>
                                <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    {record.completedDate ? new Date(record.completedDate).toLocaleDateString() : 'Pending'}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="ds-section-title-muted">Actual Cost</p>
                                <div className="flex items-center gap-2 text-sm font-bold text-primary-600">
                                    <IndianRupee className="w-4 h-4" />
                                    {record.cost || '0.00'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notes Card */}
                    <div className="card">
                        <h3 className="form-section-title mb-4">Maintenance Notes</h3>
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                            <p className="text-sm text-gray-700 leading-relaxed">
                                {record.notes || "No detailed notes provided for this maintenance activity."}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Photos */}
                    <div className="card">
                        <h3 className="form-section-title mb-4 flex items-center gap-2">
                            <Camera className="w-4 h-4 text-primary-600" />
                            Maintenance Photos
                        </h3>
                        {record.photos?.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2">
                                {record.photos.map((p, idx) => (
                                    <div key={idx} className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                        <img src={p} alt={`maintenance-${idx}`} className="w-full h-full object-cover" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 border border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-center">
                                <Camera className="w-8 h-8 text-gray-300 mb-2" />
                                <p className="text-xs text-gray-400">No photos uploaded</p>
                            </div>
                        )}
                    </div>

                    {/* Materials */}
                    <div className="card">
                        <h3 className="form-section-title mb-4 flex items-center gap-2">
                            <ClipboardList className="w-4 h-4 text-primary-600" />
                            Materials Used
                        </h3>
                        {record.materialsUsed?.length > 0 ? (
                            <div className="space-y-3">
                                {record.materialsUsed.map((m, idx) => (
                                    <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className="font-semibold text-xs text-gray-900 mb-1">{typeof m === 'object' ? m.name : m}</div>
                                        <div className="flex justify-between items-center text-[10px] text-gray-500">
                                            <span>Qty: {m.quantity || 'N/A'}</span>
                                            <span className="font-bold text-primary-600">₹{m.cost || 0}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 italic">No materials list provided</p>
                        )}
                    </div>

                    <div className="card border-green-200 bg-green-50/50">
                        <CheckCircle2 className="w-8 h-8 text-green-600 mb-4" />
                        <h3 className="form-section-title mb-2">Completion Status</h3>
                        <p className="text-sm text-gray-600 mb-4">Verified by the assigned engineer upon task completion.</p>
                        {record.status === 'completed' ? (
                            <div className="badge badge-success w-full justify-center py-2">
                                Task Verified & Closed
                            </div>
                        ) : (
                            <div className="badge badge-neutral w-full justify-center py-2">
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
