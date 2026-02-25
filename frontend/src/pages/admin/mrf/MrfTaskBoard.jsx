import React, { useState, useEffect } from 'react';
import {
    Plus,
    CheckCircle,
    Clock,
    AlertCircle,
    User,
    BarChart3,
    Calendar,
    ArrowRight,
    Search,
    Filter,
    ClipboardList,
    MoreVertical,
    Check
} from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const MrfTaskBoard = ({ facilityId }) => {
    const [tasks, setTasks] = useState([]);
    const [assignedWorkers, setAssignedWorkers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [taskData, setTaskData] = useState({
        worker_id: '',
        task_type: 'Sorting',
        remarks: ''
    });

    const taskTypes = ['Sorting', 'Baling', 'Composting', 'Dispatch', 'Maintenance'];
    const statusColors = {
        'Assigned': 'bg-blue-100 text-blue-700 border-blue-200',
        'In Progress': 'bg-amber-100 text-amber-700 border-amber-200',
        'Completed': 'bg-green-100 text-green-700 border-green-200'
    };

    useEffect(() => {
        if (facilityId) {
            fetchTasks();
            fetchAssignedWorkers();
        }
    }, [facilityId]);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/mrf/tasks?facility_id=${facilityId}`);
            if (response.data.success) {
                setTasks(response.data.data.tasks);
            }
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
            toast.error('Failed to load tasks');
        } finally {
            setLoading(false);
        }
    };

    const fetchAssignedWorkers = async () => {
        try {
            const response = await api.get(`/mrf/assignments?facility_id=${facilityId}`);
            if (response.data.success) {
                const active = response.data.data.assignments
                    .filter(a => a.isActive)
                    .map(a => ({
                        id: a.worker?.id,
                        full_name: a.worker?.full_name,
                        employee_code: a.worker?.employee_code
                    }));
                setAssignedWorkers(active);
            }
        } catch (error) {
            console.error('Failed to fetch workers:', error);
        }
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/mrf/tasks', {
                ...taskData,
                mrf_facility_id: facilityId
            });
            if (response.data.success) {
                toast.success('Task assigned successfully');
                setShowTaskForm(false);
                fetchTasks();
                setTaskData({ worker_id: '', task_type: 'Sorting', remarks: '' });
            }
        } catch (error) {
            console.error('Task creation error:', error);
            toast.error('Failed to assign task');
        }
    };

    const handleUpdateStatus = async (taskId, newStatus) => {
        try {
            const response = await api.patch(`/mrf/tasks/${taskId}/status`, { status: newStatus });
            if (response.data.success) {
                toast.success(`Task marked as ${newStatus}`);
                fetchTasks();
            }
        } catch (error) {
            console.error('Status update error:', error);
            toast.error('Failed to update task status');
        }
    };

    if (loading) return <div className="p-12 text-center text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">Organizing Task Board...</div>;

    const tasksByStatus = {
        'Assigned': tasks.filter(t => t.status === 'Assigned'),
        'In Progress': tasks.filter(t => t.status === 'In Progress'),
        'Completed': tasks.filter(t => t.status === 'Completed')
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-primary-600" /> Operational Task Board
                    </h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight mt-1">Assign and monitor real-time facility operations</p>
                </div>
                <button
                    onClick={() => setShowTaskForm(!showTaskForm)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-600 transition-all shadow-lg shadow-gray-900/10 active:scale-95"
                >
                    {showTaskForm ? 'Cancel Assignment' : <><Plus className="w-4 h-4" /> New Task Assignment</>}
                </button>
            </div>

            {showTaskForm && (
                <form onSubmit={handleCreateTask} className="bg-gray-50 border border-gray-100 rounded-2xl p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Worker</label>
                        <select
                            required
                            value={taskData.worker_id}
                            onChange={e => setTaskData({ ...taskData, worker_id: e.target.value })}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                        >
                            <option value="">Choose assigned worker</option>
                            {assignedWorkers.map(w => <option key={w.id} value={w.id}>{w.full_name} ({w.employee_code})</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Task Category</label>
                        <div className="grid grid-cols-2 gap-2">
                            {taskTypes.map(type => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setTaskData({ ...taskData, task_type: type })}
                                    className={`py-2 px-3 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${taskData.task_type === type
                                        ? 'bg-primary-900 text-white border-primary-900'
                                        : 'bg-white text-gray-400 border-gray-100'
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-2 md:col-span-2 lg:col-span-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Remarks (Optional)</label>
                        <textarea
                            placeholder="Specific instructions for the worker..."
                            value={taskData.remarks}
                            onChange={e => setTaskData({ ...taskData, remarks: e.target.value })}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary-500 outline-none transition-all h-[42px] resize-none"
                        ></textarea>
                    </div>
                    <div className="lg:col-span-3 flex justify-end">
                        <button type="submit" className="px-12 py-3 bg-primary-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20">
                            Create & Assign Task
                        </button>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {Object.entries(tasksByStatus).map(([status, group]) => (
                    <div key={status} className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${status === 'Assigned' ? 'bg-blue-500' :
                                    status === 'In Progress' ? 'bg-amber-500' : 'bg-green-500'
                                    }`}></div>
                                <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">{status}</h4>
                                <span className="bg-gray-100 text-gray-400 text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full leading-none">
                                    {group.length}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-4 min-h-[400px] bg-gray-50/50 rounded-3xl p-4 border border-dashed border-gray-100">
                            {group.length === 0 ? (
                                <div className="py-12 text-center text-gray-300">
                                    <p className="text-[10px] font-bold uppercase tracking-widest">Empty</p>
                                </div>
                            ) : (
                                group.map((task) => (
                                    <div key={task.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4 group hover:border-primary-200 transition-all">
                                        <div className="flex justify-between items-start">
                                            <span className="px-2 py-1 bg-gray-900 text-white text-[8px] font-black uppercase tracking-widest rounded-lg">
                                                {task.task_type}
                                            </span>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {status === 'Assigned' && (
                                                    <button
                                                        onClick={() => handleUpdateStatus(task.id, 'In Progress')}
                                                        className="p-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100"
                                                        title="Start Progress"
                                                    >
                                                        <Clock className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                {status !== 'Completed' && (
                                                    <button
                                                        onClick={() => handleUpdateStatus(task.id, 'Completed')}
                                                        className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
                                                        title="Mark Completed"
                                                    >
                                                        <Check className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <p className="text-xs font-black text-gray-900">{task.worker?.full_name}</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{task.worker?.employee_code}</p>
                                        </div>

                                        {task.remarks && (
                                            <p className="text-[10px] text-gray-500 font-medium italic border-l-2 border-gray-100 pl-2 leading-relaxed">
                                                "{task.remarks}"
                                            </p>
                                        )}

                                        <div className="pt-3 border-t border-gray-50 flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 text-gray-400">
                                                <Calendar className="w-3 h-3" />
                                                <span className="text-[10px] font-black uppercase">{new Date(task.assigned_date).toLocaleDateString()}</span>
                                            </div>
                                            {task.completed_at && (
                                                <div className="flex items-center gap-1.5 text-green-500">
                                                    <CheckCircle className="w-3 h-3" />
                                                    <span className="text-[10px] font-black uppercase">DONE</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MrfTaskBoard;
