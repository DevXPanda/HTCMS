import React, { useState, useEffect } from 'react';
import {
    MessageSquare,
    User,
    Calendar,
    MapPin,
    CheckCircle2,
    Clock,
    AlertCircle
} from 'lucide-react';
import api from '../../../services/api';

const FeedbackList = () => {
    const [feedback, setFeedback] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchFeedback();
    }, []);

    const fetchFeedback = async () => {
        try {
            setLoading(true);
            const response = await api.get('/feedback');
            setFeedback(response.data.data.feedback);
        } catch (error) {
            console.error('Failed to fetch feedback:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'resolved': return 'bg-green-100 text-green-700';
            case 'pending': return 'bg-amber-100 text-amber-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    if (loading) return <div className="p-8 text-center text-xs font-bold text-gray-400 animate-pulse uppercase">Loading Citizen Feedback...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Citizen Feedback & Suggestions</h1>
                    <p className="text-sm text-gray-500">Monitor public sentiment and resolve facility-related issues</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-primary-50 rounded-lg">
                        <MessageSquare className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Total Feedback</p>
                        <p className="text-2xl font-black text-gray-900">{feedback.length}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-amber-50 rounded-lg">
                        <Clock className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Pending Review</p>
                        <p className="text-2xl font-black text-amber-600">
                            {feedback.filter(f => f.status === 'pending').length}
                        </p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-green-50 rounded-lg">
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Resolved</p>
                        <p className="text-2xl font-black text-green-600">
                            {feedback.filter(f => f.status === 'resolved').length}
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {feedback.map((item) => (
                    <div key={item.id} className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:border-primary-100 transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100">
                                    <User className="w-5 h-5 text-gray-400" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900">{item.citizen_name || 'Anonymous'}</p>
                                    <div className="flex items-center gap-3 mt-0.5">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1">
                                            <Calendar className="w-3 h-3" /> {(item.createdAt || '').split('T')[0]}
                                        </span>
                                        <span className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1 capitalize">
                                            <MapPin className="w-3 h-3" /> {item.facility_type} {item.facility_id}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusStyle(item.status)}`}>
                                {item.status}
                            </span>
                        </div>

                        <p className="text-gray-700 text-sm leading-relaxed mb-4 bg-gray-50/50 p-4 rounded-lg border border-gray-50 italic">
                            "{item.comments}"
                        </p>

                        <div className="flex gap-2">
                            <button className="px-4 py-1.5 bg-primary-600 text-white text-[10px] font-bold uppercase rounded-lg hover:bg-primary-700">
                                Mark as Resolved
                            </button>
                            <button className="px-4 py-1.5 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase rounded-lg hover:bg-gray-200">
                                Ignore
                            </button>
                        </div>
                    </div>
                ))}
                {feedback.length === 0 && (
                    <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <MessageSquare className="w-12 h-12 mx-auto text-gray-200 mb-4" />
                        <p className="text-gray-400 font-bold uppercase tracking-widest">No feedback submitted yet</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FeedbackList;
