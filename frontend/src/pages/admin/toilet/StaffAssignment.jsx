import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, UserPlus, Trash2, Shield, Clock, Users } from 'lucide-react';
import api from '../../../services/api';

const StaffAssignment = () => {
    const { id } = useParams();
    const navigate = useNavigate();
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
        try {
            setLoading(true);
            const [facilityRes, assignmentsRes, staffRes] = await Promise.all([
                api.get(`/toilet/facilities/${id}`),
                api.get(`/toilet/facilities/${id}/staff`),
                api.get('/admin-management/users')
            ]);

            if (facilityRes.data.success) setFacility(facilityRes.data.data.facility);
            if (assignmentsRes.data.success) setAssignments(assignmentsRes.data.data.assignments);
            setStaffList(staffRes.data || []);
        } catch (error) {
            console.error('Failed to fetch assignment data:', error);
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
            alert('Failed to assign staff.');
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveAssignment = async (assignmentId) => {
        if (!window.confirm('Are you sure you want to remove this staff assignment?')) return;

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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Staff Assignment</h1>
                    <p className="text-gray-500 text-sm">Managing staff for {facility?.name}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Assignment Form */}
                <div className="md:col-span-1">
                    <form onSubmit={handleAddAssignment} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-6">
                        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-6 flex items-center gap-2">
                            <UserPlus className="w-4 h-4 text-primary-600" />
                            Assign New Staff
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Select Staff Member</label>
                                <select
                                    value={newAssignment.staffId}
                                    onChange={(e) => setNewAssignment(prev => ({ ...prev, staffId: e.target.value }))}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                                >
                                    <option value="">Choose Staff...</option>
                                    {staffList.map(s => (
                                        <option key={s.id} value={s.id}>{s.full_name} ({s.role})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Operational Role</label>
                                <select
                                    value={newAssignment.role}
                                    onChange={(e) => setNewAssignment(prev => ({ ...prev, role: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                                >
                                    <option value="Cleaner">Cleaner / Sanitor</option>
                                    <option value="Security">Security Guard</option>
                                    <option value="Plumber">On-site Plumber</option>
                                    <option value="Supervisor">Facility Supervisor</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Shift Timing</label>
                                <select
                                    value={newAssignment.shift}
                                    onChange={(e) => setNewAssignment(prev => ({ ...prev, shift: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                                >
                                    <option value="Morning">Morning (6 AM - 2 PM)</option>
                                    <option value="Afternoon">Afternoon (2 PM - 10 PM)</option>
                                    <option value="Night">Night (10 PM - 6 AM)</option>
                                    <option value="General">General (9 AM - 6 PM)</option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full py-2 bg-primary-600 text-white rounded-lg font-semibold text-sm hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                            >
                                {saving ? 'Assigning...' : 'Assign to Facility'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Assignments List */}
                <div className="md:col-span-2 space-y-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center bg-gray-50">
                            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                <Users className="w-4 h-4 text-primary-600" />
                                Current Active Staff ({assignments.length})
                            </h2>
                        </div>

                        <div className="divide-y divide-gray-50">
                            {assignments.length > 0 ? (
                                assignments.map((assignment) => (
                                    <div key={assignment.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold">
                                                {assignment.staff?.full_name?.[0]}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">{assignment.staff?.full_name}</p>
                                                <div className="flex gap-3 mt-1">
                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 uppercase">
                                                        <Shield className="w-3 h-3" />
                                                        {assignment.role}
                                                    </span>
                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 uppercase">
                                                        <Clock className="w-3 h-3" />
                                                        {assignment.shift} Shift
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
                                ))
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
