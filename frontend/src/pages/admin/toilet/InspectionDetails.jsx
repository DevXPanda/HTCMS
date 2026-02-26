import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Calendar,
    User,
    MapPin,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    FileText,
    Camera,
    Edit
} from 'lucide-react';
import { useBackTo } from '../../../contexts/NavigationContext';
import api from '../../../services/api';

const InspectionDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    useBackTo('/toilet-management/inspections');
    const [inspection, setInspection] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            fetchInspectionDetails();
        }
    }, [id]);

    const fetchInspectionDetails = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/toilet/inspections/${id}`);
            if (response.data && response.data.success) {
                setInspection(response.data.data.inspection);
            } else {
                setInspection(null);
            }
        } catch (error) {
            console.error('Failed to fetch inspection details:', error);
            setInspection(null);
        } finally {
            setLoading(false);
        }
    };

    const [updatingStatus, setUpdatingStatus] = useState(false);

    const handleStatusChange = async (newStatus) => {
        try {
            setUpdatingStatus(true);
            const response = await api.put(`/toilet/inspections/${id}`, {
                ...inspection,
                status: newStatus
            });
            if (response.data && response.data.success) {
                setInspection(prev => ({ ...prev, status: newStatus }));
            }
        } catch (error) {
            console.error('Failed to update status:', error);
        } finally {
            setUpdatingStatus(false);
        }
    };

    const getStatusIcon = (status) => {
        const s = status?.toLowerCase() || '';
        if (s === 'good' || s === 'passed' || s === 'excellent') return <CheckCircle2 className="w-5 h-5 text-green-500" />;
        if (s === 'poor' || s === 'failed' || s === 'critical') return <XCircle className="w-5 h-5 text-red-500" />;
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    };

    const ParamBadge = ({ label, value }) => {
        const isGood = value === 'Good' || value === 'Working';
        const isPoor = value === 'Poor' || value === 'Not Working';

        return (
            <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
                <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${isGood ? 'bg-green-500' : isPoor ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
                    <span className="text-sm font-bold text-gray-900">{value}</span>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner spinner-md" />
            </div>
        );
    }

    if (!inspection) {
        return (
            <div className="text-center p-12 bg-white rounded-xl border border-gray-100 shadow-sm">
                <p className="text-gray-500">Inspection record not found.</p>
                <button onClick={() => navigate(-1)} className="mt-4 text-primary-600 font-semibold underline">Go Back</button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="ds-page-title">Inspection Report</h1>
                    <p className="text-gray-500 text-sm">Reviewing audit as of {new Date(inspection.inspectionDate).toLocaleDateString()}</p>
                </div>
                <Link
                    to={`/toilet-management/inspections/${inspection.id}/edit`}
                    className="btn btn-secondary flex items-center gap-2 text-sm font-semibold"
                >
                    <Edit className="w-4 h-4" /> Edit Report
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Facility Summary Card */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 bg-gray-50 flex justify-between items-center border-b border-gray-100">
                            <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                <MapPin className="w-4 h-4 text-primary-600" />
                                {inspection.facility?.name}
                            </span>
                            <div className="relative">
                                <select
                                    value={inspection.status?.toLowerCase()}
                                    onChange={(e) => handleStatusChange(e.target.value)}
                                    disabled={updatingStatus}
                                    className={`appearance-none flex items-center gap-2 pl-10 pr-8 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-bold uppercase text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer ${updatingStatus ? 'opacity-50' : ''}`}
                                >
                                    <option value="good">Good</option>
                                    <option value="passed">Passed</option>
                                    <option value="excellent">Excellent</option>
                                    <option value="satisfactory">Satisfactory</option>
                                    <option value="poor">Poor</option>
                                    <option value="failed">Failed</option>
                                    <option value="critical">Critical</option>
                                </select>
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                    {getStatusIcon(inspection.status)}
                                </div>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 grid grid-cols-2 gap-8">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Inspector</p>
                                <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 bg-primary-100 rounded-full flex items-center justify-center text-[10px] font-bold text-primary-600">
                                        {inspection.inspector?.full_name?.[0]}
                                    </div>
                                    <span className="text-sm font-semibold text-gray-900">
                                        {inspection.inspector?.full_name}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-1 text-right">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Date of Audit</p>
                                <p className="text-sm font-bold text-gray-900">{new Date(inspection.inspectionDate).toDateString()}</p>
                            </div>
                        </div>
                    </div>

                    {/* Checklist Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <ParamBadge label="Cleanliness" value={inspection.cleanliness} />
                        <ParamBadge label="Maintenance" value={inspection.maintenance} />
                        <ParamBadge label="Water Supply" value={inspection.waterSupply} />
                        <ParamBadge label="Electricity" value={inspection.electricity} />
                        <ParamBadge label="Ventilation" value={inspection.ventilation} />
                        <ParamBadge label="Lighting" value={inspection.lighting} />
                    </div>

                    {/* Observations */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-50 pb-2">Observation Notes</h3>
                        <div className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                            <FileText className="w-5 h-5 text-primary-400 shrink-0" />
                            <p className="text-sm text-gray-600 leading-relaxed italic">
                                {inspection.notes || "No detailed observations were recorded during this inspection."}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Sidebar: Photos & History */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Camera className="w-4 h-4 text-primary-600" />
                            Visual Evidence
                        </h3>
                        {inspection.photos?.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2">
                                {inspection.photos.map((p, idx) => (
                                    <div key={idx} className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                        <img src={p} alt={`evidence-${idx}`} className="w-full h-full object-cover" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 border border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-center">
                                <Camera className="w-8 h-8 text-gray-300 mb-2" />
                                <p className="text-xs text-gray-400">No photos uploaded for this report</p>
                            </div>
                        )}
                    </div>

                    <div className="bg-primary-900 rounded-xl p-6 text-white shadow-xl shadow-primary-900/10">
                        <h3 className="text-xs font-bold uppercase tracking-widest mb-4 opacity-60">System Log</h3>
                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <div className="h-1 w-1 rounded-full bg-primary-400 mt-2"></div>
                                <div>
                                    <p className="text-xs font-semibold">Report Generated</p>
                                    <p className="text-[10px] opacity-60">{new Date(inspection.createdAt).toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <div className="h-1 w-1 rounded-full bg-primary-400 mt-2"></div>
                                <div>
                                    <p className="text-xs font-semibold">Last Modified</p>
                                    <p className="text-[10px] opacity-60">{new Date(inspection.updatedAt).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InspectionDetails;
