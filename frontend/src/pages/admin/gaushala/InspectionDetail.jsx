import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useBackTo } from '../../../contexts/NavigationContext';
import {
    ClipboardCheck,
    Calendar,
    User,
    Beef,
    Edit,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Clock,
    FileText,
    Stethoscope,
    AlertTriangle
} from 'lucide-react';
import api from '../../../services/api';

const InspectionDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [inspection, setInspection] = useState(null);
    const [loading, setLoading] = useState(true);

    useBackTo('/gaushala/inspections');

    useEffect(() => {
        fetchInspectionDetails();
    }, [id]);

    const fetchInspectionDetails = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/gaushala/inspections/${id}`);
            if (response.data && response.data.success) {
                setInspection(response.data.data.inspection);
            }
        } catch (error) {
            console.error('Failed to fetch inspection details:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status.toLowerCase()) {
            case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
            case 'critical': return <XCircle className="w-4 h-4 text-red-500" />;
            case 'follow_up': return <AlertTriangle className="w-4 h-4 text-primary-500" />;
            default: return <AlertTriangle className="w-4 h-4 text-gray-500" />;
        }
    };

    const getStatusBadge = (status) => {
        return (
            <div className="flex items-center gap-2 px-3 py-1 bg-white border border-gray-200 rounded-full shadow-sm">
                {getStatusIcon(status)}
                <span className="text-xs font-bold uppercase text-gray-700">{status}</span>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
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
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Inspection Report</h1>
                    <p className="text-gray-500 text-sm">Reviewing audit as of {new Date(inspection.inspection_date).toLocaleDateString()}</p>
                </div>
                <Link
                    to={`/gaushala/inspections/${id}/edit`}
                    className="btn btn-secondary flex items-center gap-2 text-sm font-semibold px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                    <Edit className="w-4 h-4" /> Edit Report
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Facility Summary Card */}
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="px-6 py-4 bg-gray-50 flex justify-between items-center border-b border-gray-100">
                            <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                <Beef className="w-4 h-4 text-primary-600" />
                                {inspection.facility?.name}
                            </span>
                            {getStatusBadge(inspection.status)}
                        </div>

                        <div className="p-6 grid grid-cols-2 gap-8">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Inspector</p>
                                <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 bg-primary-100 rounded-full flex items-center justify-center text-[10px] font-bold text-primary-600">
                                        {inspection.inspector?.full_name?.[0]}
                                    </div>
                                    <span className="text-sm font-semibold text-gray-900">
                                        {inspection.inspector?.full_name}
                                    </span>
                                </div>
                                <p className="text-[10px] text-gray-500 font-medium uppercase mt-0.5 ml-8">
                                    {inspection.inspector?.role} | ID: {inspection.inspector?.employee_id}
                                </p>
                            </div>
                            <div className="space-y-1 text-right">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Date of Audit</p>
                                <p className="text-sm font-bold text-gray-900">
                                    {new Date(inspection.inspection_date).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Observations */}
                    <div className="bg-white rounded-lg shadow p-6 space-y-6">
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-50 pb-2 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary-600" />
                                General Findings & Observations
                            </h3>
                            <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                                    {inspection.findings || "No detailed observations were recorded during this inspection."}
                                </p>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-50 pb-2 flex items-center gap-2">
                                <Stethoscope className="w-4 h-4 text-orange-600" />
                                Veterinary / Medical Notes
                            </h3>
                            <div className="flex gap-4 p-4 bg-orange-50/50 rounded-lg border border-orange-100/50">
                                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                                    {inspection.veterinary_notes || "No veterinary notes recorded."}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-green-600" />
                            Timeline & Compliance
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-0.5 tracking-widest">Next Inspection Due</p>
                                <p className="text-sm font-bold text-gray-900 font-mono">
                                    {inspection.next_inspection_due ? new Date(inspection.next_inspection_due).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    }) : 'Not Scheduled'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* <div className="bg-primary-900 rounded-lg p-6 text-white shadow-xl shadow-primary-900/10">
                        <h3 className="text-xs font-bold uppercase tracking-widest mb-4 opacity-70">System Log</h3>
                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <div className="h-1 w-1 rounded-full bg-primary-400 mt-2"></div>
                                <div>
                                    <p className="text-xs font-semibold">Report Generated</p>
                                    <p className="text-[10px] opacity-60 tracking-wider font-mono">{new Date(inspection.createdAt).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    </div> */}
                </div>
            </div>
        </div>
    );
};

export default InspectionDetail;
