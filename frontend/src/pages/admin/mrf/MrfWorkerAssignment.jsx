import React, { useState, useEffect } from 'react';
import {
    Plus,
    User,
    Clock,
    Trash2,
    Shield,
    AlertCircle,
    CheckCircle,
    Search,
    UserPlus,
    X
} from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const MrfWorkerAssignment = ({ facilityId, wardId }) => {
    const [assignments, setAssignments] = useState([]);
    const [availableWorkers, setAvailableWorkers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedWorkerId, setSelectedWorkerId] = useState('');
    const [shift, setShift] = useState('MORNING');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (facilityId) {
            fetchAssignments();
        }
    }, [facilityId]);

    const fetchAssignments = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/mrf/assignments?facility_id=${facilityId}`);
            if (response.data.success) {
                setAssignments(response.data.data.assignments);
            }
        } catch (error) {
            console.error('Failed to fetch assignments:', error);
            toast.error('Failed to load worker assignments');
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailableWorkers = async () => {
        try {
            // Fetch workers for the ward. If wardId is not available, we might need to handle it.
            // Using /workers endpoint which supports ward_id filter
            const response = await api.get(`/workers?ward_id=${wardId}&status=ACTIVE`);
            if (response.data.success) {
                // Filter out already assigned workers for the same facility if needed, 
                // but workers can have multiple non-active or different shift assignments (though DB constraint prevents same shift)
                setAvailableWorkers(response.data.data.workers || []);
            }
        } catch (error) {
            console.error('Failed to fetch available workers:', error);
            toast.error('Failed to load available workers');
        }
    };

    const handleAssign = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/mrf/assignments', {
                mrf_facility_id: facilityId,
                worker_id: selectedWorkerId,
                shift: shift
            });
            if (response.data.success) {
                toast.success('Worker assigned successfully');
                setShowAssignModal(false);
                fetchAssignments();
                setSelectedWorkerId('');
            }
        } catch (error) {
            console.error('Assignment error:', error);
            toast.error(error.response?.data?.message || 'Failed to assign worker');
        }
    };

    const handleDeactivate = async (assignmentId) => {
        if (!window.confirm('Are you sure you want to deactivate this worker assignment?')) return;
        try {
            const response = await api.patch(`/mrf/assignments/${assignmentId}/deactivate`);
            if (response.data.success) {
                toast.success('Assignment deactivated');
                fetchAssignments();
            }
        } catch (error) {
            console.error('Deactivation error:', error);
            toast.error('Failed to deactivate assignment');
        }
    };

    const openModal = () => {
        fetchAvailableWorkers();
        setShowAssignModal(true);
    };

    if (loading) return <div className="p-12 text-center text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">Retrieving Crew Assignments...</div>;

    const filteredWorkers = (availableWorkers || []).filter(w =>
        (w.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (w.employee_code || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                        <User className="w-5 h-5 text-primary-600" /> Facility Personnel
                    </h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight mt-1">Manage active workers and shift rotations</p>
                </div>
                <button
                    onClick={openModal}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-600 transition-all shadow-lg shadow-gray-900/10"
                >
                    <UserPlus className="w-4 h-4" /> Assign Worker
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assignments.length === 0 ? (
                    <div className="md:col-span-3 bg-gray-50 border border-dashed border-gray-200 rounded-3xl p-16 text-center space-y-4">
                        <User className="w-16 h-16 mx-auto opacity-10 text-gray-400" />
                        <div className="space-y-1">
                            <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">No Workers Assigned</h4>
                            <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">Assign street sweepers or collection staff to this MRF facility for task management.</p>
                        </div>
                        <button onClick={openModal} className="px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm">Assign First Worker</button>
                    </div>
                ) : (
                    assignments.map((asgn) => (
                        <div key={asgn.id} className={`bg-white rounded-2xl border ${asgn.isActive ? 'border-gray-100 shadow-sm' : 'border-gray-100 opacity-60 grayscale'} p-6 space-y-4 relative overflow-hidden group`}>
                            <div className="flex justify-between items-start relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-primary-900 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary-900/20">
                                        {asgn.worker?.full_name?.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-gray-900 leading-none">{asgn.worker?.full_name}</h4>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{asgn.worker?.employee_code}</p>
                                    </div>
                                </div>
                                <div className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${asgn.shift === 'MORNING' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                    asgn.shift === 'EVENING' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                        'bg-indigo-50 text-indigo-600 border border-indigo-100'
                                    }`}>
                                    {asgn.shift}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50 relative z-10">
                                <div className="space-y-1">
                                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Assigned On</p>
                                    <p className="text-[10px] font-bold text-gray-900">{new Date(asgn.assigned_date).toLocaleDateString()}</p>
                                </div>
                                <div className="space-y-1 text-right">
                                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Type</p>
                                    <p className="text-[10px] font-bold text-gray-900">{asgn.worker?.worker_type}</p>
                                </div>
                            </div>

                            {asgn.isActive && (
                                <button
                                    onClick={() => handleDeactivate(asgn.id)}
                                    className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    title="Deactivate Assignment"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}

                            {!asgn.isActive && (
                                <div className="absolute inset-0 flex items-center justify-center bg-gray-50/10 backdrop-blur-[1px]">
                                    <span className="bg-gray-100 px-3 py-1 rounded-lg border border-gray-200 text-[10px] font-black text-gray-500 uppercase tracking-widest">Deactivated</span>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Assignment Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 bg-gray-900 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-widest">Assign Worker</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Select a worker for {shift} shift</p>
                            </div>
                            <button onClick={() => setShowAssignModal(false)} className="p-2 hover:bg-white/10 rounded-xl">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name or code..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Shift</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['MORNING', 'EVENING', 'NIGHT'].map(s => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => setShift(s)}
                                            className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${shift === s
                                                ? 'bg-primary-900 text-white border-primary-900 shadow-lg shadow-primary-900/20'
                                                : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
                                                }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Available Workers in Ward</label>
                                <div className="max-h-64 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                    {filteredWorkers.length === 0 ? (
                                        <div className="py-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No matching workers found</p>
                                        </div>
                                    ) : (
                                        filteredWorkers.map(w => (
                                            <button
                                                key={w.id}
                                                onClick={() => setSelectedWorkerId(w.id)}
                                                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${selectedWorkerId === w.id
                                                    ? 'bg-primary-50 border-primary-200 shadow-sm'
                                                    : 'bg-white border-gray-100 hover:border-gray-200'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 font-bold text-xs">
                                                        {w.full_name?.charAt(0)}
                                                    </div>
                                                    <div className="text-left">
                                                        <p className={`text-sm font-bold ${selectedWorkerId === w.id ? 'text-primary-900' : 'text-gray-900'}`}>{w.full_name}</p>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{w.employee_code}</p>
                                                    </div>
                                                </div>
                                                {selectedWorkerId === w.id && <CheckCircle className="w-5 h-5 text-primary-600" />}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={handleAssign}
                                disabled={!selectedWorkerId}
                                className="w-full bg-gray-900 text-white rounded-2xl py-4 font-black text-xs uppercase tracking-widest hover:bg-primary-600 transition-all shadow-xl shadow-gray-900/10 disabled:opacity-50 disabled:grayscale"
                            >
                                Confirm Assignment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MrfWorkerAssignment;
