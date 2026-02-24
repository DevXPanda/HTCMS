import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ClipboardList, Clock, CheckCircle2, AlertCircle, Calendar, MessageSquare, MapPin, PlusCircle } from 'lucide-react';
import api from '../../services/api';

const ToiletComplaintHistory = () => {
    const { user } = useAuth();
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const params = {
                phone: user?.phone || user?.phoneNumber,
                email: user?.email
            };
            const response = await api.get('/toilet/complaints/citizen', { params });
            if (response.data && response.data.success) {
                setComplaints(response.data.data.complaints);
            }
        } catch (error) {
            console.error('Failed to fetch complaint history:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusStyle = (status) => {
        const s = status?.toLowerCase();
        if (s === 'resolved') return 'bg-green-100 text-green-700 border-green-200';
        if (s === 'in progress') return 'bg-blue-100 text-blue-700 border-blue-200';
        return 'bg-amber-100 text-amber-700 border-amber-200';
    };

    const getStatusIcon = (status) => {
        const s = status?.toLowerCase();
        if (s === 'resolved') return <CheckCircle2 className="w-3 h-3" />;
        if (s === 'in progress') return <Clock className="w-3 h-3" />;
        return <AlertCircle className="w-3 h-3" />;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Toilet Complaint History</h1>
                    <p className="text-gray-500 text-sm font-medium">Tracking your submitted complaints and their resolution status</p>
                </div>
                <Link
                    to="/citizen/toilet/file-complaint"
                    className="btn btn-primary flex items-center gap-2"
                >
                    <PlusCircle className="w-4 h-4" /> File New Complaint
                </Link>
            </div>

            {complaints.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-12 text-center shadow-sm">
                    <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ClipboardList className="h-8 w-8 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">No complaints found</h3>
                    <p className="text-gray-500 mt-1">You haven't filed any toilet-related complaints yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {complaints.map((complaint) => (
                        <div key={complaint.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                            <div className="p-5">
                                <div className="flex flex-col md:flex-row justify-between gap-4">
                                    <div className="space-y-3 flex-1">
                                        <div className="flex items-center gap-3">
                                            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusStyle(complaint.status)}`}>
                                                {getStatusIcon(complaint.status)}
                                                {complaint.status}
                                            </span>
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${complaint.priority === 'High' ? 'bg-red-50 text-red-600 border-red-100' :
                                                complaint.priority === 'Medium' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                    'bg-green-50 text-green-600 border-green-100'
                                                }`}>
                                                {complaint.priority} Priority
                                            </span>
                                        </div>

                                        <div className="flex items-start gap-4 text-left">
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900 leading-tight mb-1">{complaint.complaintType}</h3>
                                                <div className="flex items-center gap-4 text-xs text-gray-500 font-medium">
                                                    <div className="flex items-center gap-1">
                                                        <MapPin className="w-3.5 h-3.5 text-primary-500" />
                                                        {complaint.facility?.name}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                        {new Date(complaint.createdAt).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <p className="text-sm text-gray-600 leading-relaxed text-left">
                                                {complaint.description}
                                            </p>
                                        </div>

                                        {complaint.resolutionNotes && (
                                            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <MessageSquare className="w-4 h-4 text-green-600" />
                                                    <p className="text-xs font-bold text-green-800 uppercase tracking-wider">Resolution Details</p>
                                                </div>
                                                <p className="text-sm text-green-700 font-medium text-left">
                                                    {complaint.resolutionNotes}
                                                </p>
                                                {complaint.resolvedAt && (
                                                    <p className="text-[10px] text-green-600 mt-2 font-bold uppercase">
                                                        Resolved on: {new Date(complaint.resolvedAt).toLocaleString()}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {complaint.photos?.length > 0 && (
                                        <div className="md:w-48 space-y-2">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-left">Evidence Photos</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {complaint.photos.map((p, idx) => (
                                                    <a key={idx} href={p} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-lg overflow-hidden border border-gray-200">
                                                        <img src={p} alt="complaint" className="w-full h-full object-cover hover:scale-110 transition-transform" />
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ToiletComplaintHistory;
