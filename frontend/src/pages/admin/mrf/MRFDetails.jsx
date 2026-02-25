import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
    const [facility, setFacility] = useState(null);
    const [stats, setStats] = useState({
        todayWaste: 0,
        monthlyWaste: 0,
        workerCount: 0,
        activeTasks: 0
    });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        fetchMRFDetails();
    }, [id]);

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
        const colors = {
            active: 'bg-green-100 text-green-700 border-green-200',
            maintenance: 'bg-amber-100 text-amber-700 border-amber-200',
            inactive: 'bg-red-100 text-red-700 border-red-200'
        };
        return (
            <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full border ${colors[status] || colors.inactive}`}>
                {status}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto space-y-8 animate-pulse">
                <div className="flex justify-between items-center">
                    <div className="h-10 w-64 bg-gray-200 rounded-lg"></div>
                    <div className="h-10 w-32 bg-gray-200 rounded-lg"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-100 rounded-2xl"></div>)}
                </div>
                <div className="h-[400px] bg-gray-50 rounded-2xl"></div>
            </div>
        );
    }

    if (!facility) {
        return (
            <div className="text-center p-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <XCircle className="w-16 h-16 text-red-100 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-900">Facility Not Found</h2>
                <p className="text-gray-500 mt-2">The Material Recovery Facility you are looking for does not exist or has been removed.</p>
                <button onClick={() => navigate('/mrf/management')} className="mt-6 px-6 py-2 bg-gray-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-primary-600 transition-all">
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
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Upper Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/mrf/management')} className="p-2 bg-white rounded-xl border border-gray-100 shadow-sm text-gray-400 hover:text-primary-600 transition-all">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight">{facility.name}</h1>
                            <StatusBadge status={facility.status} />
                        </div>
                        <p className="text-gray-500 font-medium flex items-center gap-1.5 mt-1">
                            <MapPin className="w-4 h-4 text-primary-500" /> {facility.location}, Ward {facility.ward?.wardNumber}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        to={`/mrf/facilities/${id}/edit`}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                    >
                        <Edit className="w-4 h-4" /> Edit Facility
                    </Link>
                    <button
                        onClick={handleDelete}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white border border-red-100 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-all shadow-sm"
                    >
                        <Trash2 className="w-4 h-4" /> Deactivate
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: "Today's Waste", value: `${stats.todayWaste} KG`, icon: Recycle, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: "Monthly Total", value: `${stats.monthlyWaste / 1000} T`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
                    { label: "Active Workers", value: stats.workerCount, icon: User, color: 'text-purple-600', bg: 'bg-purple-50' },
                    { label: "Active Tasks", value: stats.activeTasks, icon: CheckCircle, color: 'text-amber-600', bg: 'bg-amber-50' }
                ].map((stat, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                        <div className="flex justify-between items-start">
                            <div className={`p-2 rounded-xl ${stat.bg} ${stat.color}`}>
                                <stat.icon className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Live</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                            <p className="text-2xl font-black text-gray-900 mt-1">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs Navigation */}
            <div className="bg-white p-1 rounded-2xl border border-gray-100 shadow-sm flex overflow-x-auto no-scrollbar">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id
                            ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/10'
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                            }`}
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
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-6">
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-primary-500" /> Facility Operational Profile
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Supervisor</p>
                                        <p className="text-sm font-bold text-gray-900">{facility.supervisor?.full_name || 'Not Assigned'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Capacity</p>
                                        <p className="text-sm font-bold text-gray-900">{facility.capacity} Tons / Day</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Contact Person</p>
                                        <p className="text-sm font-bold text-gray-900">{facility.contact_person || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Operating Hours</p>
                                        <p className="text-sm font-bold text-gray-900">{facility.operating_hours || 'Standard'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ward Jurisdiction</p>
                                        <p className="text-sm font-bold text-gray-900">Ward {facility.ward?.wardNumber}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Coordinates</p>
                                        <p className="text-sm font-bold text-gray-900">{facility.latitude || '0'}, {facility.longitude || '0'}</p>
                                    </div>
                                </div>
                                <div className="pt-6 border-t border-gray-50 flex flex-wrap gap-2">
                                    {Array.isArray(facility.waste_types) && facility.waste_types.map((type, i) => (
                                        <span key={i} className="px-3 py-1 bg-gray-50 text-gray-500 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-gray-100">
                                            {type}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Material History Preview */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden text-center p-12 space-y-4">
                                <Clock className="w-12 h-12 mx-auto opacity-10" />
                                <h4 className="text-gray-900 font-bold uppercase tracking-widest text-xs">Processing History</h4>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Detailed logs available in Waste Logs tab</p>
                                <button onClick={() => setActiveTab('waste')} className="mt-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-gray-900/10">Log Today's Entry</button>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                                <MrfSalesLedger facilityId={id} />
                            </div>

                            {/* Efficiency Score */}
                            <div className="bg-gray-900 p-8 rounded-2xl text-white shadow-xl shadow-gray-900/20 space-y-6 relative overflow-hidden">
                                <div className="relative z-10 space-y-1">
                                    <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">Facility Impact</p>
                                    <p className="text-4xl font-black tracking-tighter">{(stats.monthlyWaste / 1000).toFixed(3)} <span className="text-lg opacity-40">Tons</span></p>
                                    <p className="text-[10px] font-bold text-green-400 mt-2">↑ ACTIVE PERFORMANCE</p>
                                </div>
                                <div className="relative z-10 pt-6 border-t border-white/10 grid grid-cols-1 gap-4">
                                    <div>
                                        <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Active Workers</p>
                                        <p className="text-xl font-black mt-1">{stats.workerCount}</p>
                                    </div>
                                </div>
                                <div className="absolute -right-8 -bottom-8 opacity-10">
                                    <TrendingUp className="w-32 h-32" />
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
