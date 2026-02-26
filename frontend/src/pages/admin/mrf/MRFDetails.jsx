import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft,
    Recycle,
    MapPin,
    CheckCircle,
    XCircle,
    Edit,
    BarChart3,
    Clock,
    Trash2,
    TrendingUp,
    User,
    Shield,
    Plus,
    Calendar,
    Search,
    Filter,
    FileText,
    AlertCircle
} from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import MrfSalesLedger from './MrfSalesLedger';
import MrfWasteLogs from './MrfWasteLogs';
import MrfWorkerAssignment from './MrfWorkerAssignment';
import MrfTaskBoard from './MrfTaskBoard';
import MrfLinkedComplaints from './MrfLinkedComplaints';

const MRFDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const tabFromUrl = searchParams.get('tab');
    const [facility, setFacility] = useState(null);
    const [stats, setStats] = useState({
        todayWaste: 0,
        monthlyWaste: 0,
        workerCount: 0,
        activeTasks: 0
    });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(tabFromUrl && ['overview', 'workers', 'tasks', 'waste', 'complaints'].includes(tabFromUrl) ? tabFromUrl : 'overview');

    useEffect(() => {
        fetchMRFDetails();
    }, [id]);

    useEffect(() => {
        if (tabFromUrl && ['overview', 'workers', 'tasks', 'waste', 'complaints'].includes(tabFromUrl)) {
            setActiveTab(tabFromUrl);
        }
    }, [tabFromUrl]);

    const fetchMRFDetails = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/mrf/facilities/${id}`);
            if (response.data && response.data.success) {
                setFacility(response.data.data.facility);
                setStats(response.data.data.stats || {
                    todayWaste: 0,
                    monthlyWaste: 0,
                    workerCount: 0,
                    activeTasks: 0
                });
            }
        } catch (error) {
            console.error('Failed to fetch MRF details:', error);
            toast.error('Failed to load facility details');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to deactivate this MRF facility?')) {
            try {
                await api.delete(`/mrf/facilities/${id}`);
                toast.success('Facility deactivated successfully');
                navigate('/mrf/management');
            } catch (error) {
                console.error('Failed to delete facility:', error);
                toast.error('Failed to deactivate facility');
            }
        }
    };

    const StatusBadge = ({ status }) => {
        const map = { active: 'badge-success', maintenance: 'badge-warning', inactive: 'badge-danger' };
        return <span className={`badge ${map[status] || 'badge-neutral'}`}>{status}</span>;
    };

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="flex justify-between items-center">
                    <div className="h-10 w-64 bg-gray-200 rounded-ds" />
                    <div className="h-10 w-32 bg-gray-200 rounded-ds" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-28 stat-card" />)}
                </div>
                <div className="h-96 card" />
            </div>
        );
    }

    if (!facility) {
        return (
            <div className="empty-state">
                <XCircle className="empty-state-icon text-red-200 w-16 h-16 mx-auto mb-4" />
                <h2 className="empty-state-title">Facility Not Found</h2>
                <p className="empty-state-text">The Material Recovery Facility you are looking for does not exist or has been removed.</p>
                <button type="button" onClick={() => navigate('/mrf/management')} className="btn btn-primary mt-6">
                    Back to Management
                </button>
            </div>
        );
    }

    const tabs = [
        { id: 'overview', label: 'Overview', icon: BarChart3 },
        { id: 'workers', label: 'Workers', icon: User },
        { id: 'tasks', label: 'Task Board', icon: CheckCircle },
        { id: 'waste', label: 'Waste Logs', icon: Clock },
        { id: 'complaints', label: 'Complaints', icon: AlertCircle },
    ];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="ds-page-header">
                <div className="flex items-center gap-4">
                    <button type="button" onClick={() => navigate('/mrf/management')} className="btn btn-ghost p-2" aria-label="Back">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="ds-page-title">{facility.name}</h1>
                            <StatusBadge status={facility.status} />
                        </div>
                        <p className="ds-page-subtitle flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-primary-500" /> {facility.location}, Ward {facility.ward?.wardNumber}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link to={`/mrf/facilities/${id}/edit`} className="btn btn-secondary">
                        <Edit className="w-4 h-4" /> Edit Facility
                    </Link>
                    <button type="button" onClick={handleDelete} className="btn btn-danger">
                        <Trash2 className="w-4 h-4" /> Deactivate
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Today's Waste", value: `${stats.todayWaste} KG`, icon: Recycle },
                    { label: "Monthly Total", value: `${stats.monthlyWaste / 1000} T`, icon: TrendingUp },
                    { label: "Active Workers", value: stats.workerCount, icon: User },
                    { label: "Active Tasks", value: stats.activeTasks, icon: CheckCircle }
                ].map((stat, idx) => (
                    <div key={idx} className="stat-card">
                        <div className="stat-card-title">
                            <span>{stat.label}</span>
                            <stat.icon className="h-4 w-4 text-gray-400" />
                        </div>
                        <p className="stat-card-value">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Tabs Navigation */}
            <div className="card-flat p-1 flex overflow-x-auto gap-1">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`btn btn-sm whitespace-nowrap ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            {/* Facility info card */}
                            <div className="card">
                                <h3 className="form-section-title flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-primary-500" /> Facility Operational Profile
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase">Supervisor</p>
                                        <p className="text-sm font-medium text-gray-900 mt-0.5">{facility.supervisor?.full_name || 'Not Assigned'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase">Capacity</p>
                                        <p className="text-sm font-medium text-gray-900 mt-0.5">{facility.capacity} Tons / Day</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase">Contact Person</p>
                                        <p className="text-sm font-medium text-gray-900 mt-0.5">{facility.contact_person || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase">Operating Hours</p>
                                        <p className="text-sm font-medium text-gray-900 mt-0.5">{facility.operating_hours || 'Standard'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase">Ward Jurisdiction</p>
                                        <p className="text-sm font-medium text-gray-900 mt-0.5">Ward {facility.ward?.wardNumber}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase">Coordinates</p>
                                        <p className="text-sm font-medium text-gray-900 mt-0.5">{facility.latitude || '0'}, {facility.longitude || '0'}</p>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-gray-200 flex flex-wrap gap-2 mt-4">
                                    {Array.isArray(facility.waste_types) && facility.waste_types.map((type, i) => (
                                        <span key={i} className="badge badge-neutral">{type}</span>
                                    ))}
                                </div>
                            </div>

                            {/* Material History Preview */}
                            <div className="card text-center">
                                <Clock className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                                <h4 className="ds-section-title">Processing History</h4>
                                <p className="text-sm text-gray-500 mb-4">Detailed logs available in Waste Logs tab</p>
                                <button type="button" onClick={() => setActiveTab('waste')} className="btn btn-primary">Log Today&apos;s Entry</button>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="card">
                                <MrfSalesLedger facilityId={id} />
                            </div>

                            {/* Facility Impact - light card (no dark section) */}
                            <div className="stat-card">
                                <div className="stat-card-title">
                                    <span>Facility Impact (Monthly)</span>
                                    <TrendingUp className="h-4 w-4 text-gray-400" />
                                </div>
                                <p className="stat-card-value">{(stats.monthlyWaste / 1000).toFixed(3)} Tons</p>
                                <p className="text-xs text-green-600 font-medium mt-1">Active performance</p>
                                <div className="pt-4 mt-4 border-t border-gray-100">
                                    <p className="text-xs font-medium text-gray-500 uppercase">Active Workers</p>
                                    <p className="text-lg font-bold text-gray-900 mt-0.5">{stats.workerCount}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'workers' && (
                    <MrfWorkerAssignment
                        facilityId={id}
                        wardId={facility.ward_id}
                    />
                )}

                {activeTab === 'tasks' && (
                    <MrfTaskBoard
                        facilityId={id}
                    />
                )}

                {activeTab === 'waste' && (
                    <MrfWasteLogs
                        facilityId={id}
                        wasteTypes={facility.waste_types}
                    />
                )}

                {activeTab === 'complaints' && (
                    <MrfLinkedComplaints
                        facilityId={id}
                    />
                )}
            </div>
        </div>
    );
};

export default MRFDetails;
