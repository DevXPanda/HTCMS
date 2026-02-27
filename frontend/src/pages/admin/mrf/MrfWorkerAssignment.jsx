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
import { useConfirm } from '../../../components/ConfirmModal';

const MrfWorkerAssignment = ({ facilityId, wardId }) => {
    const { confirm } = useConfirm();
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
        if (!facilityId) return;
        try {
            setLoading(true);
            const response = await api.get(`/mrf/assignments?facility_id=${facilityId}`);
            if (response.data && response.data.success) {
                const list = response.data.data?.assignments;
                setAssignments(Array.isArray(list) ? list : []);
            }
        } catch (error) {
            console.error('Failed to fetch assignments:', error);
            toast.error('Failed to load worker assignments');
            setAssignments([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailableWorkers = async () => {
        try {
            const hasWard = wardId != null && wardId !== '' && !Number.isNaN(Number(wardId));
            const params = new URLSearchParams({ status: 'ACTIVE' });
            if (hasWard) params.set('ward_id', String(wardId));
            const response = await api.get(`/workers?${params.toString()}`);
            if (response.data && response.data.success) {
                const list = response.data.data?.workers;
                setAvailableWorkers(Array.isArray(list) ? list : []);
            } else {
                setAvailableWorkers([]);
            }
        } catch (error) {
            console.error('Failed to fetch available workers:', error);
            const msg = error.response?.status === 403
                ? 'You do not have permission to view workers.'
                : 'Failed to load available workers.';
            toast.error(msg);
            setAvailableWorkers([]);
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
        const ok = await confirm({ title: 'Deactivate assignment', message: 'Are you sure you want to deactivate this worker assignment?', confirmLabel: 'Deactivate', variant: 'danger' });
        if (!ok) return;
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
            <div className="card flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 className="form-section-title flex items-center gap-2">
                        <User className="w-5 h-5 text-primary-600" /> Facility Personnel
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">Manage active workers and shift rotations</p>
                </div>
                <button type="button" onClick={openModal} className="btn btn-primary">
                    <UserPlus className="w-4 h-4" /> Assign Worker
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assignments.length === 0 ? (
                    <div className="md:col-span-3 empty-state">
                        <User className="empty-state-icon text-gray-300" />
                        <h4 className="empty-state-title">No Workers Assigned</h4>
                        <p className="empty-state-text max-w-sm mx-auto">Assign street sweepers or collection staff to this MRF facility for task management.</p>
                        <button type="button" onClick={openModal} className="btn btn-primary mt-4">Assign First Worker</button>
                    </div>
                ) : (
                    assignments.map((asgn) => (
                        <div key={asgn.id} className={`card relative ${!asgn.isActive ? 'opacity-60' : ''}`}>
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-primary-100 rounded-ds flex items-center justify-center text-primary-600 font-semibold text-lg">
                                        {asgn.worker?.full_name?.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-gray-900">{asgn.worker?.full_name}</h4>
                                        <p className="text-xs text-gray-500 mt-0.5">{asgn.worker?.employee_code}</p>
                                    </div>
                                </div>
                                <span className={`badge ${asgn.shift === 'MORNING' ? 'badge-warning' : asgn.shift === 'EVENING' ? 'badge-info' : 'badge-neutral'}`}>
                                    {asgn.shift}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 mt-4">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase">Assigned On</p>
                                    <p className="text-sm font-medium text-gray-900 mt-0.5">{new Date(asgn.createdAt || asgn.assigned_date || asgn.created_at).toLocaleDateString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500 uppercase">Type</p>
                                    <p className="text-sm font-medium text-gray-900 mt-0.5">{asgn.worker?.worker_type}</p>
                                </div>
                            </div>

                            {asgn.isActive && (
                                <button
                                    type="button"
                                    onClick={() => handleDeactivate(asgn.id)}
                                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-ds transition-colors"
                                    title="Deactivate Assignment"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}

                            {!asgn.isActive && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-ds-lg">
                                    <span className="badge badge-neutral">Deactivated</span>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Assignment Modal */}
            {showAssignModal && (
                <div className="modal-overlay">
                    <div className="modal-panel modal-panel-lg max-w-lg">
                        <div className="modal-header">
                            <div>
                                <h3 className="modal-title">Assign Worker</h3>
                                <p className="text-sm text-gray-500 mt-0.5">Select a worker for {shift} shift</p>
                            </div>
                            <button type="button" onClick={() => setShowAssignModal(false)} className="modal-close" aria-label="Close">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="modal-body space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name or code..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="input pl-10"
                                />
                            </div>

                            <div>
                                <label className="label">Select Shift</label>
                                <div className="flex flex-wrap gap-2">
                                    {['MORNING', 'EVENING', 'NIGHT'].map(s => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => setShift(s)}
                                            className={`btn btn-sm ${shift === s ? 'btn-primary' : 'btn-secondary'}`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="label">Available Workers in Ward</label>
                                <div className="max-h-64 overflow-y-auto space-y-2 mt-2 pr-1">
                                    {filteredWorkers.length === 0 ? (
                                        <div className="py-8 text-center bg-gray-50 rounded-ds border border-dashed border-gray-200">
                                            <p className="text-sm text-gray-500">No matching workers found</p>
                                        </div>
                                    ) : (
                                        filteredWorkers.map(w => (
                                            <button
                                                key={w.id}
                                                type="button"
                                                onClick={() => setSelectedWorkerId(w.id)}
                                                className={`w-full flex items-center justify-between p-3 rounded-ds border text-left transition-colors ${selectedWorkerId === w.id
                                                    ? 'bg-primary-50 border-primary-200'
                                                    : 'bg-white border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-gray-100 rounded-ds flex items-center justify-center text-gray-600 font-medium text-sm">
                                                        {w.full_name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className={`text-sm font-medium ${selectedWorkerId === w.id ? 'text-primary-700' : 'text-gray-900'}`}>{w.full_name}</p>
                                                        <p className="text-xs text-gray-500">{w.employee_code}</p>
                                                    </div>
                                                </div>
                                                {selectedWorkerId === w.id && <CheckCircle className="w-5 h-5 text-primary-600" />}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button type="button" onClick={() => setShowAssignModal(false)} className="btn btn-secondary">Cancel</button>
                            <button type="button" onClick={handleAssign} disabled={!selectedWorkerId} className="btn btn-primary">
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
