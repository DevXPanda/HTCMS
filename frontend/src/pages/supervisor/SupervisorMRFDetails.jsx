import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, XCircle, ArrowLeft, CheckCircle } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import MrfTaskBoard from '../admin/mrf/MrfTaskBoard';

const SupervisorMRFDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [facility, setFacility] = useState(null);
    const [activeTasks, setActiveTasks] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMinimal();
    }, [id]);

    const fetchMinimal = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/mrf/facilities/${id}`);
            if (response.data?.success) {
                setFacility(response.data.data.facility);
                setActiveTasks(response.data.data.stats?.activeTasks ?? 0);
            }
        } catch (error) {
            console.error('Failed to fetch MRF:', error);
            toast.error(error.response?.data?.message || 'Failed to load facility');
            if (error.response?.status === 403) navigate('/supervisor/mrf');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-10 w-64 bg-gray-200 rounded" />
                <div className="h-96 bg-gray-100 rounded-xl" />
            </div>
        );
    }

    if (!facility) {
        return (
            <div className="text-center py-12">
                <XCircle className="w-16 h-16 mx-auto text-red-200 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900">Facility Not Found</h2>
                <p className="text-gray-500 mt-1">You may not have access to this facility.</p>
                <button type="button" onClick={() => navigate('/supervisor/mrf')} className="btn btn-primary mt-6 inline-flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Back to MRF Task Board
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={() => navigate('/supervisor/mrf')}
                        className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
                        title="Back to MRF list"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">{facility.name}</h1>
                        <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                            <MapPin className="w-4 h-4 text-primary-500" /> {facility.location}, Ward {facility.ward?.wardNumber}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <CheckCircle className="w-4 h-4 text-primary-500" />
                    <span className="font-medium">{activeTasks}</span> active tasks
                </div>
            </div>

            <MrfTaskBoard facilityId={id} allowProofOnUpdate />
        </div>
    );
};

export default SupervisorMRFDetails;
