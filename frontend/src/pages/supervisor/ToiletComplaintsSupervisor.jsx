import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Clock,
    CheckCircle,
    AlertCircle,
    Calendar,
    User,
    ArrowLeft,
    Save,
    MapPin,
    MessageSquare,
    ClipboardList,
    Send,
    PlusCircle,
    Camera,
    X,
    HardHat,
    AlertTriangle,
    RefreshCw,
    XCircle
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useStaffAuth } from '../../contexts/StaffAuthContext';

const ToiletComplaintsSupervisor = () => {
    const { user } = useStaffAuth();
    const navigate = useNavigate();

    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState(null);
    const [notes, setNotes] = useState({});
    const [workers, setWorkers] = useState([]);
    const [selectedWorkers, setSelectedWorkers] = useState({});
    const [showProofModal, setShowProofModal] = useState(null); // complaintId
    const [uploading, setUploading] = useState(false);

    // Camera and Location State
    const [cameraState, setCameraState] = useState({
        showCamera: false,
        cameraType: null, // 'before' or 'after'
        stream: null
    });

    const [proofForm, setProofForm] = useState({
        before_photo: null,
        before_photo_url: null,
        before_photo_latitude: null,
        before_photo_longitude: null,
        before_photo_address: null,
        after_photo: null,
        after_photo_url: null,
        after_photo_latitude: null,
        after_photo_longitude: null,
        after_photo_address: null,
        work_proof_remarks: '',
        escalation_flag: false,
        escalation_reason: ''
    });

    useEffect(() => {
        if (user?.id) {
            fetchAssignedComplaints();
            fetchWorkers();
        }
        return () => {
            if (cameraState.stream) {
                cameraState.stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [user?.id]);

    const fetchAssignedComplaints = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/toilet/complaints/assigned/${user.id}`);
            if (response.data && response.data.success) {
                setComplaints(response.data.data.complaints);
                const initialNotes = {};
                const initialWorkers = {};
                response.data.data.complaints.forEach(c => {
                    initialNotes[c.id] = c.resolutionNotes || '';
                    initialWorkers[c.id] = c.workerId || '';
                });
                setNotes(initialNotes);
                setSelectedWorkers(initialWorkers);
            }
        } catch (error) {
            console.error('Failed to fetch assigned complaints:', error);
            toast.error('Failed to load assigned complaints.');
        } finally {
            setLoading(false);
        }
    };

    const fetchWorkers = async () => {
        try {
            const response = await api.get(`/workers/supervisor/${user.id}`);
            if (response.data && response.data.success) {
                setWorkers(response.data.data.workers);
            }
        } catch (error) {
            console.error('Failed to fetch workers:', error);
        }
    };

    // --- Camera & Location Logic ---
    const getCurrentLocation = () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by your browser'));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                },
                (error) => {
                    reject(error);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });
    };

    const reverseGeocode = async (latitude, longitude) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
                { headers: { 'User-Agent': 'HTCMS/1.0' } }
            );
            if (!response.ok) throw new Error('Reverse geocoding failed');
            const data = await response.json();
            if (data && data.address) {
                const addr = data.address;
                const addressParts = [];
                if (addr.house_number) addressParts.push(addr.house_number);
                if (addr.road) addressParts.push(addr.road);
                if (addr.suburb || addr.neighbourhood) addressParts.push(addr.suburb || addr.neighbourhood);
                if (addr.city || addr.town || addr.village) addressParts.push(addr.city || addr.town || addr.village);
                if (addr.state) addressParts.push(addr.state);
                if (addr.postcode) addressParts.push(addr.postcode);
                return addressParts.join(', ') || data.display_name || 'Address not available';
            }
            return data.display_name || 'Address not available';
        } catch (error) {
            console.error('Reverse geocoding error:', error);
            return null;
        }
    };

    const startCamera = async (type) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            setCameraState({
                showCamera: true,
                cameraType: type,
                stream: stream
            });
            setTimeout(() => {
                const video = document.getElementById(`video-${type}`);
                if (video) video.srcObject = stream;
            }, 100);
        } catch (err) {
            console.error('Error accessing camera:', err);
            toast.error('Failed to access camera. Please grant camera permissions.');
        }
    };

    const stopCamera = () => {
        if (cameraState.stream) {
            cameraState.stream.getTracks().forEach(track => track.stop());
        }
        setCameraState({
            showCamera: false,
            cameraType: null,
            stream: null
        });
    };

    const capturePhoto = async (type) => {
        try {
            toast.loading('Getting location...', { id: 'location' });
            const location = await getCurrentLocation();
            toast.dismiss('location');

            toast.loading('Getting address...', { id: 'geocode' });
            const address = await reverseGeocode(location.latitude, location.longitude);
            toast.dismiss('geocode');

            const video = document.getElementById(`video-${type}`);
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);

            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                if (type === 'before') {
                    setProofForm(prev => ({
                        ...prev,
                        before_photo: blob,
                        before_photo_url: url,
                        before_photo_latitude: location.latitude,
                        before_photo_longitude: location.longitude,
                        before_photo_address: address
                    }));
                } else {
                    setProofForm(prev => ({
                        ...prev,
                        after_photo: blob,
                        after_photo_url: url,
                        after_photo_latitude: location.latitude,
                        after_photo_longitude: location.longitude,
                        after_photo_address: address
                    }));
                }
            }, 'image/jpeg', 0.9);

            stopCamera();
            toast.success(`Photo captured with location!`);
        } catch (err) {
            console.error('Error capturing photo:', err);
            toast.error('Failed to capture photo. Please enable location access.');
        }
    };

    const handleSubmitDetailedProof = async (complaintId) => {
        if (!proofForm.after_photo && !proofForm.escalation_flag) {
            toast.error('Please capture an after photo or mark as escalation.');
            return;
        }

        const workerId = selectedWorkers[complaintId];
        if (!workerId) {
            toast.error('Please assign a worker first.');
            return;
        }

        try {
            setUploading(true);
            const formData = new FormData();

            // Handle Photo Uploads first
            if (proofForm.before_photo) {
                const beforeRes = await uploadFile(proofForm.before_photo);
                formData.append('resolution_before_photo', beforeRes.url);
            }
            if (proofForm.after_photo) {
                const afterRes = await uploadFile(proofForm.after_photo);
                formData.append('resolution_after_photo', afterRes.url);
            }

            formData.append('status', proofForm.escalation_flag ? 'in progress' : 'resolved');
            formData.append('resolutionNotes', proofForm.work_proof_remarks);
            formData.append('workerId', workerId);
            formData.append('resolution_before_lat', proofForm.before_photo_latitude || '');
            formData.append('resolution_before_lng', proofForm.before_photo_longitude || '');
            formData.append('resolution_before_address', proofForm.before_photo_address || '');
            formData.append('resolution_after_lat', proofForm.after_photo_latitude || '');
            formData.append('resolution_after_lng', proofForm.after_photo_longitude || '');
            formData.append('resolution_after_address', proofForm.after_photo_address || '');
            formData.append('is_escalated', proofForm.escalation_flag);
            if (proofForm.escalation_flag) {
                formData.append('escalation_reason', proofForm.escalation_reason);
            }

            // The PUT API expects JSON usually, but if we send FormData it works if handled.
            // Let's convert to JSON if possible, but photos must be URLs.
            // Wait, our backend updateComplaint expects JSON. I should upload photos first.

            const payload = {
                status: proofForm.escalation_flag ? 'in progress' : 'resolved',
                resolutionNotes: proofForm.work_proof_remarks,
                workerId: workerId,
                resolution_before_photo: formData.get('resolution_before_photo'),
                resolution_before_lat: proofForm.before_photo_latitude,
                resolution_before_lng: proofForm.before_photo_longitude,
                resolution_before_address: proofForm.before_photo_address,
                resolution_after_photo: formData.get('resolution_after_photo'),
                resolution_after_lat: proofForm.after_photo_latitude,
                resolution_after_lng: proofForm.after_photo_longitude,
                resolution_after_address: proofForm.after_photo_address,
                is_escalated: proofForm.escalation_flag,
                escalation_reason: proofForm.escalation_reason
            };

            const response = await api.put(`/toilet/complaints/${complaintId}`, payload);
            if (response.data && response.data.success) {
                toast.success('Complaint updated successfully');
                setShowProofModal(null);
                resetProofForm();
                fetchAssignedComplaints();
            }
        } catch (error) {
            console.error('Failed to submit proof:', error);
            toast.error('Failed to submit resolution proof.');
        } finally {
            setUploading(false);
        }
    };

    const uploadFile = async (blob) => {
        const file = new File([blob], 'resolution.jpg', { type: 'image/jpeg' });
        const formData = new FormData();
        formData.append('photo', file);
        const res = await api.post('/upload/toilet-photo', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return res.data.data;
    };

    const resetProofForm = () => {
        setProofForm({
            before_photo: null,
            before_photo_url: null,
            before_photo_latitude: null,
            before_photo_longitude: null,
            before_photo_address: null,
            after_photo: null,
            after_photo_url: null,
            after_photo_latitude: null,
            after_photo_longitude: null,
            after_photo_address: null,
            work_proof_remarks: '',
            escalation_flag: false,
            escalation_reason: ''
        });
    };

    const handleNoteChange = (id, value) => {
        setNotes(prev => ({ ...prev, [id]: value }));
    };

    const handleWorkerChange = (id, value) => {
        setSelectedWorkers(prev => ({ ...prev, [id]: value }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    const getStatusStyle = (status) => {
        const s = status?.toLowerCase();
        if (s === 'resolved') return 'bg-green-100 text-green-700 border-green-200';
        if (s === 'in progress') return 'bg-blue-100 text-blue-700 border-blue-200';
        return 'bg-amber-100 text-amber-700 border-amber-200';
    };

    const getPriorityStyle = (priority) => {
        const p = priority?.toLowerCase();
        if (p === 'high') return 'text-red-600 font-black';
        if (p === 'medium') return 'text-amber-600 font-bold';
        return 'text-green-600 font-bold';
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6 text-left">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <ClipboardList className="w-6 h-6 text-primary-600" />
                        My Assigned Complaints
                    </h1>
                    <p className="text-gray-500 text-sm font-medium">Manage and resolve issues assigned to you</p>
                </div>
                <div className="bg-primary-50 px-4 py-2 rounded-lg border border-primary-100">
                    <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest text-center">Active Tasks</p>
                    <p className="text-xl font-black text-primary-900 text-center">{complaints.filter(c => c.status.toLowerCase() !== 'resolved').length}</p>
                </div>
            </div>

            {complaints.length === 0 ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-gray-100 p-12 text-center">
                    <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">All Clear!</h3>
                    <p className="text-gray-500">No complaints currently assigned to you.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {complaints.map((complaint) => (
                        <div key={complaint.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                            <div className="p-5 sm:p-6">
                                <div className="flex flex-col md:flex-row gap-6">
                                    {/* Left: Info */}
                                    <div className="flex-1 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(complaint.createdAt).toLocaleDateString()}
                                                <span className="text-gray-200">|</span>
                                                <span className={getPriorityStyle(complaint.priority)}>{complaint.priority} Priority</span>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase border shadow-sm ${getStatusStyle(complaint.status)}`}>
                                                {complaint.status}
                                            </span>
                                        </div>

                                        <div>
                                            <h3 className="text-lg font-black text-gray-900 mb-1">{complaint.complaintType}</h3>
                                            <div className="flex items-center gap-1.5 text-gray-600 text-sm font-bold">
                                                <MapPin className="w-4 h-4 text-primary-500" />
                                                {complaint.facility?.name}
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Citizen's Message</p>
                                            <p className="text-sm text-gray-700 font-medium leading-relaxed italic line-clamp-3">
                                                "{complaint.description}"
                                            </p>
                                        </div>

                                        {complaint.photos?.length > 0 && (
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Initial Photos</p>
                                                <div className="flex gap-2 overflow-x-auto pb-1">
                                                    {complaint.photos.map((p, i) => (
                                                        <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="h-16 w-16 rounded-lg border border-gray-200 overflow-hidden flex-shrink-0">
                                                            <img src={p} alt="" className="w-full h-full object-cover" />
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {complaint.status.toLowerCase() === 'resolved' && (
                                            <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-100 space-y-3">
                                                <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Resolution Proof</p>
                                                <div className="flex gap-4">
                                                    {complaint.resolution_before_photo && (
                                                        <div className="flex-1">
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Before (Arrival)</p>
                                                            <a href={complaint.resolution_before_photo} target="_blank" rel="noopener noreferrer" className="block h-24 rounded-lg overflow-hidden border border-green-200">
                                                                <img src={complaint.resolution_before_photo} alt="" className="w-full h-full object-cover" />
                                                            </a>
                                                        </div>
                                                    )}
                                                    {complaint.resolution_after_photo && (
                                                        <div className="flex-1">
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">After (Resolved)</p>
                                                            <a href={complaint.resolution_after_photo} target="_blank" rel="noopener noreferrer" className="block h-24 rounded-lg overflow-hidden border border-green-200">
                                                                <img src={complaint.resolution_after_photo} alt="" className="w-full h-full object-cover" />
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                                {complaint.resolution_after_address && (
                                                    <div className="flex items-start gap-1 text-[10px] text-gray-500 font-medium">
                                                        <MapPin className="w-3 h-3 text-green-500 mt-0.5" />
                                                        {complaint.resolution_after_address}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Right: Actions */}
                                    <div className="md:w-96 space-y-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                <MessageSquare className="w-3 h-3" /> Resolution Notes (Draft)
                                            </label>
                                            <textarea
                                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary-500 outline-none resize-none bg-white min-h-[80px]"
                                                placeholder="Add steps taken to resolve..."
                                                value={notes[complaint.id] || ''}
                                                onChange={(e) => handleNoteChange(complaint.id, e.target.value)}
                                                disabled={complaint.status.toLowerCase() === 'resolved'}
                                            ></textarea>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                <HardHat className="w-3 h-3" /> Assign Worker
                                            </label>
                                            <select
                                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                                                value={selectedWorkers[complaint.id] || ''}
                                                onChange={(e) => handleWorkerChange(complaint.id, e.target.value)}
                                                disabled={complaint.status.toLowerCase() === 'resolved'}
                                            >
                                                <option value="">Select Worker...</option>
                                                {workers.map(w => (
                                                    <option key={w.id} value={w.id}>{w.full_name} ({w.employee_code})</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-2 pt-2">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Update Status</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    onClick={() => {
                                                        setShowProofModal(complaint.id);
                                                        setProofForm(prev => ({ ...prev, work_proof_remarks: notes[complaint.id] }));
                                                    }}
                                                    disabled={updatingId === complaint.id || complaint.status.toLowerCase() === 'resolved'}
                                                    className="btn border-blue-200 text-blue-700 hover:bg-blue-50 text-[10px] font-black py-2.5 rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50"
                                                >
                                                    <Clock className="w-3 h-3" />
                                                    PROOFS
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (!selectedWorkers[complaint.id]) {
                                                            toast.error('Please assign a worker first.');
                                                            return;
                                                        }
                                                        setShowProofModal(complaint.id);
                                                        setProofForm(prev => ({ ...prev, work_proof_remarks: notes[complaint.id] }));
                                                    }}
                                                    disabled={updatingId === complaint.id || complaint.status.toLowerCase() === 'resolved'}
                                                    className="btn bg-green-600 text-white hover:bg-green-700 text-[10px] font-black py-2.5 rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-md shadow-green-100"
                                                >
                                                    <CheckCircle className="w-3 h-3" />
                                                    RESOLVE
                                                </button>
                                            </div>
                                        </div>

                                        {complaint.resolvedAt && (
                                            <div className="text-center pt-2 border-t border-gray-100 mt-2">
                                                <p className="text-[10px] font-bold text-green-600 uppercase">Resolved On</p>
                                                <p className="text-[10px] font-medium text-gray-500">{new Date(complaint.resolvedAt).toLocaleString()}</p>
                                                {complaint.worker && (
                                                    <p className="text-[10px] font-bold text-gray-700 mt-1 capitalize">By: {complaint.worker.full_name}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Work Proof Modal */}
            {showProofModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b flex items-center justify-between bg-white sticky top-0 z-10">
                            <h2 className="text-xl font-bold text-gray-900">Upload Work Proof</h2>
                            <button onClick={() => { setShowProofModal(null); stopCamera(); resetProofForm(); }} className="p-2 hover:bg-gray-100 rounded-full">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                            {/* Before Photo Section */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Before Photo (with Geo Location)</label>
                                {proofForm.before_photo_url ? (
                                    <div className="relative rounded-xl overflow-hidden border shadow-sm">
                                        <img src={proofForm.before_photo_url} className="w-full h-48 object-cover" alt="Before" />
                                        <button onClick={() => setProofForm({ ...proofForm, before_photo: null, before_photo_url: null })} className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full shadow-lg">
                                            <X className="w-4 h-4" />
                                        </button>
                                        <div className="absolute bottom-0 inset-x-0 p-2 bg-black/60 text-[10px] text-white backdrop-blur-sm">
                                            <MapPin className="w-3 h-3 inline mr-1" />
                                            {proofForm.before_photo_address || 'Location captured'}
                                        </div>
                                    </div>
                                ) : cameraState.showCamera && cameraState.cameraType === 'before' ? (
                                    <div className="relative rounded-xl overflow-hidden bg-black border">
                                        <video id="video-before" autoPlay playsInline className="w-full h-48 object-cover" />
                                        <div className="absolute bottom-4 inset-x-0 flex justify-center gap-3">
                                            <button onClick={() => capturePhoto('before')} className="p-4 bg-white rounded-full shadow-2xl hover:scale-105 transition-transform">
                                                <Camera className="w-6 h-6 text-primary-600" />
                                            </button>
                                            <button onClick={stopCamera} className="p-4 bg-red-600 rounded-full shadow-2xl text-white">
                                                <X className="w-6 h-6" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={() => startCamera('before')} className="w-full h-24 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
                                        <Camera className="w-6 h-6 text-gray-400" />
                                        <span className="text-sm font-bold text-gray-500">Capture Before Photo</span>
                                    </button>
                                )}
                            </div>

                            {/* After Photo Section */}
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">After Photo (with Geo Location)</label>
                                {proofForm.after_photo_url ? (
                                    <div className="relative rounded-xl overflow-hidden border shadow-sm">
                                        <img src={proofForm.after_photo_url} className="w-full h-48 object-cover" alt="After" />
                                        <button onClick={() => setProofForm({ ...proofForm, after_photo: null, after_photo_url: null })} className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full shadow-lg">
                                            <X className="w-4 h-4" />
                                        </button>
                                        <div className="absolute bottom-0 inset-x-0 p-2 bg-black/60 text-[10px] text-white backdrop-blur-sm">
                                            <MapPin className="w-3 h-3 inline mr-1" />
                                            {proofForm.after_photo_address || 'Location captured'}
                                        </div>
                                    </div>
                                ) : cameraState.showCamera && cameraState.cameraType === 'after' ? (
                                    <div className="relative rounded-xl overflow-hidden bg-black border">
                                        <video id="video-after" autoPlay playsInline className="w-full h-48 object-cover" />
                                        <div className="absolute bottom-4 inset-x-0 flex justify-center gap-3">
                                            <button onClick={() => capturePhoto('after')} className="p-4 bg-white rounded-full shadow-2xl hover:scale-105 transition-transform">
                                                <Camera className="w-6 h-6 text-primary-600" />
                                            </button>
                                            <button onClick={stopCamera} className="p-4 bg-red-600 rounded-full shadow-2xl text-white">
                                                <X className="w-6 h-6" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={() => startCamera('after')} className="w-full h-24 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
                                        <Camera className="w-6 h-6 text-gray-400" />
                                        <span className="text-sm font-bold text-gray-500">Capture After Photo</span>
                                    </button>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-700">Remarks</label>
                                <textarea
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500 outline-none resize-none bg-gray-50 min-h-[100px]"
                                    placeholder="Add remarks about the work completed"
                                    value={proofForm.work_proof_remarks}
                                    onChange={(e) => setProofForm({ ...proofForm, work_proof_remarks: e.target.value })}
                                ></textarea>
                            </div>

                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="escalate"
                                    className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                                    checked={proofForm.escalation_flag}
                                    onChange={(e) => setProofForm({ ...proofForm, escalation_flag: e.target.checked })}
                                />
                                <label htmlFor="escalate" className="text-sm font-black text-red-600 uppercase">Work not completed (Escalation)</label>
                            </div>

                            {proofForm.escalation_flag && (
                                <div className="animate-in slide-in-from-top-2 duration-200">
                                    <label className="text-xs font-bold text-red-600 uppercase mb-2 block">Reason for Escalation</label>
                                    <textarea
                                        className="w-full px-4 py-3 border-2 border-red-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-red-500 outline-none resize-none bg-red-50 min-h-[80px]"
                                        placeholder="Why couldn't the task be completed?"
                                        value={proofForm.escalation_reason}
                                        onChange={(e) => setProofForm({ ...proofForm, escalation_reason: e.target.value })}
                                    ></textarea>
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-gray-50 border-t flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={() => handleSubmitDetailedProof(showProofModal)}
                                disabled={uploading}
                                className="flex-1 px-6 py-4 bg-green-600 text-white rounded-xl font-black uppercase text-sm shadow-xl shadow-green-100 hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {uploading ? (
                                    <>
                                        <RefreshCw className="w-5 h-5 animate-spin" />
                                        PROCESSING...
                                    </>
                                ) : (
                                    <>
                                        UPLOAD & COMPLETE
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => { setShowProofModal(null); stopCamera(); resetProofForm(); }}
                                className="px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-black uppercase text-sm hover:bg-white active:scale-95 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ToiletComplaintsSupervisor;
