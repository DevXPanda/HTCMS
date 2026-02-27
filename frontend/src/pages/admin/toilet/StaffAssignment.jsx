import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, PlusCircle, Trash2, Shield, Clock, Users, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { useBackTo } from '../../../contexts/NavigationContext';
import { useConfirm } from '../../../components/ConfirmModal';
import api from '../../../services/api';

const StaffAssignment = () => {
    const { confirm } = useConfirm();
    const { id } = useParams();
    const navigate = useNavigate();
    useBackTo(id ? `/toilet-management/facilities/${id}` : '/toilet-management/facilities');
    const [facility, setFacility] = useState(null);
    const [assignments, setAssignments] = useState([]);
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [newAssignment, setNewAssignment] = useState({
        staffId: '',
        role: 'Cleaner',
        shift: 'Morning'
    });

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        if (!id || id === 'undefined') return;
        try {
            setLoading(true);
            const [facilityRes, assignmentsRes, staffRes] = await Promise.all([
                api.get(`/toilet/facilities/${id}`),
                api.get(`/toilet/facilities/${id}/staff`),
                api.get('/admin-management/employees?limit=1000')
            ]);

            if (facilityRes.data?.success) setFacility(facilityRes.data.data.facility);
            if (assignmentsRes.data?.success) setAssignments(assignmentsRes.data.data?.assignments || []);
            setStaffList(staffRes.data?.employees || []);
        } catch (error) {
            console.error('Failed to fetch assignment data:', error);
            toast.error('Failed to load staffing data.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddAssignment = async (e) => {
        e.preventDefault();
        if (!newAssignment.staffId) return;

        setSaving(true);
        try {
            await api.post(`/toilet/facilities/${id}/staff`, newAssignment);
            setNewAssignment({ staffId: '', role: 'Cleaner', shift: 'Morning' });
            fetchData(); // Refresh list
        } catch (error) {
            console.error('Failed to add assignment:', error);
            toast.error(error.response?.data?.message || 'Failed to assign staff.');
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveAssignment = async (assignmentId) => {
        const ok = await confirm({ title: 'Remove assignment', message: 'Are you sure you want to remove this staff assignment?', confirmLabel: 'Remove', variant: 'danger' });
        if (!ok) return;

        try {
            await api.delete(`/toilet/facilities/${id}/staff/${assignmentId}`);
            fetchData();
        } catch (error) {
            console.error('Failed to remove assignment:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner spinner-md" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="ds-page-header">
                <div>
                    <h1 className="ds-page-title">Staff Assignment</h1>
                    <p className="ds-page-subtitle">Managing staff for {facility?.name || '...'}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Assignment Form */}
                <div className="md:col-span-1">
                    <form onSubmit={handleAddAssignment} className="card sticky top-6">
                        <h2 className="form-section-title flex items-center gap-2">
                            <PlusCircle className="w-4 h-4 text-primary-500" />
                            Assign New Staff
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="label label-required">Select Staff Member</label>
                                <select
                                    value={newAssignment.staffId}
                                    onChange={(e) => setNewAssignment(prev => ({ ...prev, staffId: e.target.value }))}
                                    required
                                    className="input"
                                >
                                    <option value="">Choose Staff...</option>
                                    {(staffList || []).map(s => (
                                        <option key={s.id} value={s.id}>{s.full_name} ({s.role})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="label">Operational Role</label>
                                <select
                                    value={newAssignment.role}
                                    onChange={(e) => setNewAssignment(prev => ({ ...prev, role: e.target.value }))}
                                    className="input"
                                >
                                    <option value="Cleaner">Cleaner / Sanitor</option>
                                    <option value="Security">Security Guard</option>
                                    <option value="Plumber">On-site Plumber</option>
                                    <option value="Supervisor">Facility Supervisor</option>
                                </select>
                            </div>

                            <div>
                                <label className="label">Shift Timing</label>
                                <select
                                    value={newAssignment.shift}
                                    onChange={(e) => setNewAssignment(prev => ({ ...prev, shift: e.target.value }))}
                                    className="input"
                                >
                                    <option value="Morning">Morning (6 AM - 2 PM)</option>
                                    <option value="Afternoon">Afternoon (2 PM - 10 PM)</option>
                                    <option value="Night">Night (10 PM - 6 AM)</option>
                                    <option value="General">General (9 AM - 6 PM)</option>
                                </select>
                            </div>

                            <button type="submit" disabled={saving} className="btn btn-primary w-full mt-2">
                                {saving ? 'Assigning...' : 'Assign to Facility'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Assignments List */}
                <div className="md:col-span-2 space-y-4">
                    <div className="card p-0 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <h2 className="form-section-title flex items-center gap-2 mb-0">
                                <Users className="w-4 h-4 text-primary-500" />
                                Current Active Staff ({(assignments || []).length})
                            </h2>
                        </div>

                        <div className="divide-y divide-gray-50">
                            {(assignments || []).length > 0 ? (
                                (assignments || []).map((assignment) => {
                                    if (!assignment) return null;
                                    return (
                                        <div key={assignment.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold">
                                                    {assignment.staff?.full_name?.[0] || 'S'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-gray-900 uppercase tracking-tight">
                                                        {assignment.staff?.full_name || 'N/A'}
                                                    </p>
                                                    <div className="flex gap-3 mt-1">
                                                        <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 uppercase">
                                                            <Shield className="w-3 h-3" />
                                                            {assignment.role || 'Staff'}
                                                        </span>
                                                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 uppercase">
                                                            <Clock className="w-3 h-3" />
                                                            {assignment.shift || 'General'} Shift
                                                        </span>
                                                        <span className="flex items-center gap-1 text-[10px] font-bold text-gray-500 uppercase">
                                                            <Calendar className="w-3 h-3" />
                                                            Assigned: {assignment.assignedDate ? new Date(assignment.assignedDate).toLocaleDateString() : 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveAssignment(assignment.id)}
                                                className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="p-12 text-center text-gray-400">
                                    <p className="text-sm">No staff members assigned to this facility yet.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3">
                        <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                        <p className="text-xs text-amber-800 leading-relaxed">
                            <strong>Note:</strong> Staff assignments are used for attendance tracking and task allocation. Ensure shifts do not overlap for the same personnel across different facilities.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StaffAssignment;
