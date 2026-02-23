import React, { useState, useEffect } from 'react';
import {
    Stethoscope,
    Calendar,
    User,
    Activity,
    Plus,
    ChevronRight
} from 'lucide-react';
import api from '../../../services/api';

const CattleMedicalHistory = ({ cattleId }) => {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (cattleId) fetchRecords();
    }, [cattleId]);

    const fetchRecords = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/gaushala/cattle/${cattleId}/medical`);
            setRecords(response.data.data.records);
        } catch (error) {
            console.error('Failed to fetch medical records:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="py-4 text-center text-xs text-gray-400 font-bold uppercase tracking-widest">Loading Records...</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-tight">
                    <Stethoscope className="w-4 h-4 text-primary-600" />
                    Medical History & Vaccinations
                </h3>
                <button className="text-[10px] font-bold text-primary-600 hover:text-primary-700 uppercase flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add Record
                </button>
            </div>

            {records.length === 0 ? (
                <div className="bg-gray-50 border border-dashed border-gray-200 rounded-lg p-8 text-center text-gray-400">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-xs font-medium uppercase tracking-widest leading-relaxed"> No medical history found<br />Record vaccinations or treatments</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {records.map((record) => (
                        <div key={record.id} className="bg-white border border-gray-100 rounded-lg p-3 hover:border-primary-200 transition-colors group">
                            <div className="flex justify-between items-start">
                                <div className="flex gap-3">
                                    <div className={`p-2 rounded-lg ${record.record_type === 'vaccination' ? 'bg-blue-50 text-blue-600' :
                                            record.record_type === 'treatment' ? 'bg-red-50 text-red-600' :
                                                'bg-green-50 text-green-600'
                                        }`}>
                                        <Activity className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-bold text-gray-900 capitalize">{record.record_type}</p>
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{record.record_date}</span>
                                        </div>
                                        <p className="text-xs text-gray-600 mt-1 line-clamp-1">{record.description}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 capitalize bg-gray-50 px-2 py-0.5 rounded">
                                        <User className="w-2.5 h-2.5" /> {record.veterinarian_name || 'Staff'}
                                    </div>
                                    {record.next_followup_date && (
                                        <p className="text-[9px] font-bold text-amber-600 mt-1 uppercase tracking-tighter">
                                            Follow-up: {record.next_followup_date}
                                        </p>
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

export default CattleMedicalHistory;
