import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
  RefreshCw,
  Calendar,
  CheckCircle,
  Clock,
  MapPin,
  Camera,
  Plus,
  FileText,
  X,
  Upload,
  Image as ImageIcon,
  ClipboardList,
  Bell,
  Shield
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStaffAuth } from '../../contexts/StaffAuthContext';
import { fieldWorkerMonitoringAPI, workerTaskAPI, attendanceAPI, toiletComplaintAPI } from '../../services/api';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useConfirm } from '../../components/ConfirmModal';
import MrfProofCapture from '../../components/MrfProofCapture';

const SupervisorDashboard = () => {
  const { confirm } = useConfirm();
  const { user } = useStaffAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showWorkProofModal, setShowWorkProofModal] = useState(null); // taskId
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [markingAttendance, setMarkingAttendance] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  // Attendance proof modal: before + after photo with live location (all modules)
  const [attendanceProofWorker, setAttendanceProofWorker] = useState(null);
  const [attendanceProofLocation, setAttendanceProofLocation] = useState(null);
  const [attendanceProofBefore, setAttendanceProofBefore] = useState(null); // { blob, previewUrl }
  const [attendanceProofAfter, setAttendanceProofAfter] = useState(null);   // { blob, previewUrl }
  const [attendanceProofStream, setAttendanceProofStream] = useState(null);
  const [attendanceProofLoading, setAttendanceProofLoading] = useState(false);
  const [attendanceProofSubmitting, setAttendanceProofSubmitting] = useState(false);
  const attendanceProofVideoRef = useRef(null);

  const [taskForm, setTaskForm] = useState({
    worker_id: '',
    task_type: 'SWEEPING',
    area_street: '',
    shift: 'MORNING',
    special_instructions: ''
  });

  const [workProofForm, setWorkProofForm] = useState({
    before_photo: null,
    before_photo_latitude: null,
    before_photo_longitude: null,
    before_photo_address: null,
    after_photo: null,
    after_photo_latitude: null,
    after_photo_longitude: null,
    after_photo_address: null,
    work_proof_remarks: '',
    escalation_flag: false,
    escalation_reason: ''
  });

  const [cameraState, setCameraState] = useState({
    showCamera: false,
    cameraType: null, // 'before' or 'after'
    stream: null,
    videoRef: null
  });

  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [mrfTasks, setMrfTasks] = useState([]);
  const [mrfTasksLoading, setMrfTasksLoading] = useState(false);
  const [mrfStatusModal, setMrfStatusModal] = useState(null);
  const [mrfUpdating, setMrfUpdating] = useState(false);
  const [toiletComplaints, setToiletComplaints] = useState([]);
  const [complaintsLoading, setComplaintsLoading] = useState(false);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fieldWorkerMonitoringAPI.getSupervisorDashboardForSelf();
      setData(res?.data?.data ?? null);
    } catch (err) {
      console.error('SupervisorDashboard: Error fetching dashboard:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load dashboard');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      setTasksLoading(true);
      const res = await workerTaskAPI.getTasks({ assigned_date: new Date().toISOString().slice(0, 10) });
      setTasks(res?.data?.data || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      toast.error('Failed to load tasks');
    } finally {
      setTasksLoading(false);
    }
  };

  const fetchMrfTasks = async () => {
    try {
      setMrfTasksLoading(true);
      const res = await api.get('/mrf/tasks');
      setMrfTasks(res?.data?.data?.tasks || []);
    } catch (err) {
      console.error('Error fetching MRF tasks:', err);
      setMrfTasks([]);
    } finally {
      setMrfTasksLoading(false);
    }
  };

  const submitMrfStatusUpdate = async (proof) => {
    if (!mrfStatusModal) return;
    try {
      setMrfUpdating(true);
      await api.patch(`/mrf/tasks/${mrfStatusModal.taskId}/status`, {
        status: mrfStatusModal.newStatus,
        remarks: proof?.remarks,
        proof: proof ? { before: proof.before, after: proof.after, remarks: proof.remarks } : undefined
      });
      toast.success(`Task marked as ${mrfStatusModal.newStatus}`);
      setMrfStatusModal(null);
      fetchMrfTasks();
    } catch (err) {
      console.error('MRF task update error:', err);
      toast.error(err.response?.data?.message || 'Failed to update task');
    } finally {
      setMrfUpdating(false);
    }
  };

  const fetchToiletComplaints = async () => {
    try {
      setComplaintsLoading(true);
      const res = await toiletComplaintAPI.getAssigned(user.id);
      setToiletComplaints(res.data?.data?.complaints || []);
    } catch (err) {
      console.error('Error fetching toilet complaints:', err);
    } finally {
      setComplaintsLoading(false);
    }
  };

  // Assigned modules: from dashboard response or staff user (backward compat: if empty, show all)
  const assignedModules = (data?.supervisor?.assigned_modules ?? user?.assigned_modules ?? []);
  const hasModule = (key) => assignedModules.length === 0 || assignedModules.includes(key);

  useEffect(() => {
    if (user?.id) {
      fetchDashboard();
      fetchTasks();
      const mods = user?.assigned_modules ?? [];
      if (mods.length === 0 || mods.includes('mrf')) fetchMrfTasks();
      if (mods.length === 0 || mods.includes('toilet')) fetchToiletComplaints();
    } else {
      setLoading(false);
    }

    // Cleanup camera stream on unmount
    return () => {
      if (cameraState.stream) {
        cameraState.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [user?.id]);

  // Attach attendance proof stream to video when stream is set
  useEffect(() => {
    if (attendanceProofStream && attendanceProofVideoRef.current) {
      attendanceProofVideoRef.current.srcObject = attendanceProofStream;
    }
  }, [attendanceProofStream]);

  const openAttendanceProofModal = (workerId, workerName) => {
    if (attendanceProofStream) {
      attendanceProofStream.getTracks().forEach((t) => t.stop());
    }
    if (attendanceProofBefore?.previewUrl) URL.revokeObjectURL(attendanceProofBefore.previewUrl);
    if (attendanceProofAfter?.previewUrl) URL.revokeObjectURL(attendanceProofAfter.previewUrl);
    setAttendanceProofWorker({ id: workerId, full_name: workerName });
    setAttendanceProofLocation(null);
    setAttendanceProofBefore(null);
    setAttendanceProofAfter(null);
    setAttendanceProofStream(null);
  };

  const closeAttendanceProofModal = () => {
    if (attendanceProofStream) {
      attendanceProofStream.getTracks().forEach((t) => t.stop());
    }
    if (attendanceProofBefore?.previewUrl) URL.revokeObjectURL(attendanceProofBefore.previewUrl);
    if (attendanceProofAfter?.previewUrl) URL.revokeObjectURL(attendanceProofAfter.previewUrl);
    setAttendanceProofWorker(null);
    setAttendanceProofLocation(null);
    setAttendanceProofBefore(null);
    setAttendanceProofAfter(null);
    setAttendanceProofStream(null);
  };

  const getAttendanceProofLocation = async () => {
    setAttendanceProofLoading(true);
    try {
      const loc = await getCurrentLocation();
      toast.loading('Getting address...', { id: 'att-geo' });
      const address = await reverseGeocode(loc.latitude, loc.longitude);
      toast.dismiss('att-geo');
      setAttendanceProofLocation({ latitude: loc.latitude, longitude: loc.longitude, address: address || null });
      toast.success('Live location captured');
    } catch (err) {
      console.error(err);
      toast.error('Enable location access to add proof');
    } finally {
      setAttendanceProofLoading(false);
    }
  };

  const startAttendanceProofCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setAttendanceProofStream(stream);
    } catch (err) {
      console.error(err);
      toast.error('Camera access denied or unavailable');
    }
  };

  const stopAttendanceProofCamera = () => {
    if (attendanceProofStream) {
      attendanceProofStream.getTracks().forEach((t) => t.stop());
      setAttendanceProofStream(null);
    }
  };

  const drawLocationOnAttendanceCanvas = (ctx, canvas, location, address) => {
    const h = 56;
    const y = canvas.height - h;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, y, canvas.width, h);
    ctx.fillStyle = '#fff';
    ctx.font = '12px sans-serif';
    ctx.fillText(`Lat: ${Number(location.latitude).toFixed(6)}  Lng: ${Number(location.longitude).toFixed(6)}`, 8, y + 18);
    ctx.fillText(address || 'Live location', 8, y + 34);
    ctx.fillText(new Date().toLocaleString(), 8, y + 50);
  };

  const captureAttendanceProofPhoto = async (type) => {
    if (!attendanceProofVideoRef.current || !attendanceProofStream) return;
    setAttendanceProofLoading(true);
    try {
      let loc = attendanceProofLocation;
      if (!loc) {
        loc = await getCurrentLocation();
        const address = await reverseGeocode(loc.latitude, loc.longitude);
        loc = { ...loc, address: address || null };
        setAttendanceProofLocation(loc);
      }
      const video = attendanceProofVideoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      drawLocationOnAttendanceCanvas(ctx, canvas, loc, loc.address);
      const blob = await new Promise((res) => canvas.toBlob((b) => res(b), 'image/jpeg', 0.9));
      if (blob) {
        const previewUrl = URL.createObjectURL(blob);
        if (type === 'before') {
          setAttendanceProofBefore({ blob, previewUrl });
          toast.success('Before photo with location captured');
        } else {
          setAttendanceProofAfter({ blob, previewUrl });
          stopAttendanceProofCamera();
          toast.success('After photo with location captured');
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Capture failed. Enable location and camera.');
    } finally {
      setAttendanceProofLoading(false);
    }
  };

  const submitAttendanceProof = async () => {
    if (!attendanceProofWorker || !attendanceProofBefore || !attendanceProofAfter || !attendanceProofLocation) {
      toast.error('Please capture both before and after photos with live location');
      return;
    }
    setAttendanceProofSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('worker_id', attendanceProofWorker.id);
      formData.append('ward_id', user?.ward_id);
      formData.append('timestamp', new Date().toISOString());
      formData.append('latitude', attendanceProofLocation.latitude);
      formData.append('longitude', attendanceProofLocation.longitude);
      formData.append('before_photo', attendanceProofBefore.blob, `before-${Date.now()}.jpg`);
      formData.append('after_photo', attendanceProofAfter.blob, `after-${Date.now()}.jpg`);
      await attendanceAPI.markWorkerAttendance(formData);
      toast.success(`${attendanceProofWorker.full_name} marked as present with before & after proof`);
      closeAttendanceProofModal();
      await fetchDashboard();
    } catch (err) {
      console.error('Error marking attendance:', err);
      toast.error(err.response?.data?.message || 'Failed to mark attendance');
    } finally {
      setAttendanceProofSubmitting(false);
    }
  };

  const handleMarkAttendance = (workerId, workerName) => {
    if (markingAttendance === workerId) return;
    openAttendanceProofModal(workerId, workerName);
  };

  const handleMarkAllPresent = async () => {
    const ok = await confirm({ title: 'Mark all present', message: 'Are you sure you want to mark all workers as present?', confirmLabel: 'Yes' });
    if (!ok) return;

    try {
      setMarkingAll(true);

      let location = {};
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
        } catch (geoError) {
          console.warn('Geolocation not available:', geoError);
        }
      }

      await attendanceAPI.markAllWorkersPresent(location);
      toast.success('All workers marked as present');
      await fetchDashboard();
    } catch (err) {
      console.error('Error marking all present:', err);
      toast.error(err.response?.data?.message || 'Failed to mark all workers present');
    } finally {
      setMarkingAll(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await workerTaskAPI.createTask(taskForm);
      toast.success('Task assigned successfully');
      setShowTaskModal(false);
      setTaskForm({
        worker_id: '',
        task_type: 'SWEEPING',
        area_street: '',
        shift: 'MORNING',
        special_instructions: ''
      });
      await fetchTasks();
      await fetchDashboard();
    } catch (err) {
      console.error('Error creating task:', err);
      toast.error(err.response?.data?.message || 'Failed to assign task');
    }
  };

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
      // Using OpenStreetMap Nominatim API (free, no API key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'HTCMS/1.0' // Required by Nominatim
          }
        }
      );

      if (!response.ok) {
        throw new Error('Reverse geocoding failed');
      }

      const data = await response.json();

      if (data && data.address) {
        // Build a readable address from the components
        const addr = data.address;
        const addressParts = [];

        if (addr.house_number) addressParts.push(addr.house_number);
        if (addr.road) addressParts.push(addr.road);
        if (addr.suburb || addr.neighbourhood) addressParts.push(addr.suburb || addr.neighbourhood);
        if (addr.city || addr.town || addr.village) addressParts.push(addr.city || addr.town || addr.village);
        if (addr.state_district) addressParts.push(addr.state_district);
        if (addr.state) addressParts.push(addr.state);
        if (addr.postcode) addressParts.push(addr.postcode);
        if (addr.country) addressParts.push(addr.country);

        return addressParts.join(', ') || data.display_name || 'Address not available';
      }

      return data.display_name || 'Address not available';
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null; // Return null if geocoding fails, we'll still show coordinates
    }
  };

  const capturePhoto = async (type) => {
    try {
      // Get current location first
      const location = await getCurrentLocation();

      // Get address using reverse geocoding
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
        if (type === 'before') {
          setWorkProofForm({
            ...workProofForm,
            before_photo: blob,
            before_photo_latitude: location.latitude,
            before_photo_longitude: location.longitude,
            before_photo_address: address
          });
        } else {
          setWorkProofForm({
            ...workProofForm,
            after_photo: blob,
            after_photo_latitude: location.latitude,
            after_photo_longitude: location.longitude,
            after_photo_address: address
          });
        }
      }, 'image/jpeg', 0.9);

      // Stop camera
      stopCamera();
      toast.success(`${type === 'before' ? 'Before' : 'After'} photo captured with location${address ? ' and address' : ''}`);
    } catch (err) {
      console.error('Error capturing photo:', err);
      toast.error('Failed to capture photo. Please enable location access.');
    }
  };

  const startCamera = async (type) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera on mobile
      });

      setCameraState({
        showCamera: true,
        cameraType: type,
        stream: stream
      });

      setTimeout(() => {
        const video = document.getElementById(`video-${type}`);
        if (video) {
          video.srcObject = stream;
        }
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

  const handleUploadWorkProof = async (taskId) => {
    try {
      // Validate that photos are captured
      if (!workProofForm.before_photo || !workProofForm.after_photo) {
        toast.error('Please capture both before and after photos');
        return;
      }

      const formData = new FormData();
      formData.append('before_photo', workProofForm.before_photo);
      formData.append('after_photo', workProofForm.after_photo);
      formData.append('before_photo_latitude', workProofForm.before_photo_latitude);
      formData.append('before_photo_longitude', workProofForm.before_photo_longitude);
      if (workProofForm.before_photo_address) {
        formData.append('before_photo_address', workProofForm.before_photo_address);
      }
      formData.append('after_photo_latitude', workProofForm.after_photo_latitude);
      formData.append('after_photo_longitude', workProofForm.after_photo_longitude);
      if (workProofForm.after_photo_address) {
        formData.append('after_photo_address', workProofForm.after_photo_address);
      }
      formData.append('work_proof_remarks', workProofForm.work_proof_remarks);
      formData.append('escalation_flag', workProofForm.escalation_flag);
      if (workProofForm.escalation_flag) {
        formData.append('escalation_reason', workProofForm.escalation_reason);
      }
      formData.append('status', 'COMPLETED');

      await workerTaskAPI.uploadWorkProof(taskId, formData);
      toast.success('Work proof uploaded successfully');
      setShowWorkProofModal(null);
      setWorkProofForm({
        before_photo: null,
        before_photo_latitude: null,
        before_photo_longitude: null,
        before_photo_address: null,
        after_photo: null,
        after_photo_latitude: null,
        after_photo_longitude: null,
        after_photo_address: null,
        work_proof_remarks: '',
        escalation_flag: false,
        escalation_reason: ''
      });
      await fetchTasks();
      await fetchDashboard();
    } catch (err) {
      console.error('Error uploading work proof:', err);
      toast.error(err.response?.data?.message || 'Failed to upload work proof');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      PRESENT: { color: 'bg-green-100 text-green-800', icon: UserCheck },
      ABSENT: { color: 'bg-red-100 text-red-800', icon: UserX },
      NOT_MARKED: { color: 'bg-yellow-100 text-yellow-800', icon: Clock }
    };
    const badge = badges[status] || badges.NOT_MARKED;
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getGeoStatusBadge = (geoStatus) => {
    if (!geoStatus) return null;
    return geoStatus === 'VALID' ? (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <MapPin className="w-3 h-3" /> Valid
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <AlertTriangle className="w-3 h-3" /> Outside Ward
      </span>
    );
  };

  // Always show loading state while loading
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner spinner-md" />
      </div>
    );
  }

  // Show error state if there's an error and no data
  if (error && !data) {
    return (
      <div className="space-y-4">
        <div className="alert-error">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
          <div>
            <h3 className="alert-error-title">Error</h3>
            <div className="alert-error-text">{error}</div>
          </div>
        </div>
        <button type="button" onClick={fetchDashboard} className="btn btn-primary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  // If no data and no error, show empty state
  if (!data) {
    return (
      <div className="space-y-4">
        <div className="card-flat flex items-center gap-3 border-amber-200 bg-amber-50/50">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">No data available. Please try refreshing.</p>
        </div>
        <button type="button" onClick={fetchDashboard} className="btn btn-primary flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>
    );
  }

  const supervisor = data?.supervisor || {};
  const workers = data?.workers || [];
  const attendancePct = data?.attendance_pct || 0;
  const tasksCompletedToday = data?.tasks_completed_today || 0;
  const alerts = data?.alerts || {};

  const assignedTasks = Array.isArray(tasks) ? tasks.filter(t => t.status === 'ASSIGNED') : [];
  const inProgressTasks = Array.isArray(tasks) ? tasks.filter(t => t.status === 'IN_PROGRESS') : [];
  const completedTasks = Array.isArray(tasks) ? tasks.filter(t => t.status === 'COMPLETED') : [];
  const mrfAssigned = Array.isArray(mrfTasks) ? mrfTasks.filter(t => t.status === 'Assigned') : [];
  const mrfInProgress = Array.isArray(mrfTasks) ? mrfTasks.filter(t => t.status === 'In Progress') : [];
  const mrfCompleted = Array.isArray(mrfTasks) ? mrfTasks.filter(t => t.status === 'Completed') : [];

  const ulbName = data?.supervisor?.ulb_name || null;
  const moduleLabels = { toilet: 'Toilet Management', mrf: 'MRF', gaushala: 'Gau Shala' };

  return (
    <div className="space-y-8">
      {/* Page Header - global layout */}
      <div className="ds-page-header">
        <div>
          <h1 className="ds-page-title">Supervisor Dashboard</h1>
          <p className="ds-page-subtitle">
            {supervisor.full_name || user?.full_name} ({supervisor.employee_id || user?.employee_id})
            {supervisor.ward_name && ` · ${supervisor.ward_name}`}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {ulbName && (
              <span className="badge badge-neutral">ULB: {ulbName}</span>
            )}
            {assignedModules.length > 0 && assignedModules.map((m) => (
              <span key={m} className="badge badge-info">{moduleLabels[m] || m}</span>
            ))}
          </div>
        </div>
        <button type="button" onClick={fetchDashboard} className="btn btn-primary">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Summary Cards - design system stat-cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500 uppercase">Total Workers</p>
            <Users className="h-4 w-4 text-gray-400" />
          </div>
          <p className="text-xl font-bold text-gray-900">{data?.total_workers || 0}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500 uppercase">Present Today</p>
            <UserCheck className="h-4 w-4 text-green-500" />
          </div>
          <p className="text-xl font-bold text-green-600">{data?.present_today || 0}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500 uppercase">Absent Today</p>
            <UserX className="h-4 w-4 text-red-500" />
          </div>
          <p className="text-xl font-bold text-red-600">{data?.absent_today || 0}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500 uppercase">Attendance %</p>
            <Calendar className="h-4 w-4 text-gray-400" />
          </div>
          <p className={`text-xl font-bold ${attendancePct >= 80 ? 'text-green-600' : attendancePct >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
            {attendancePct}%
          </p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500 uppercase">Tasks Completed</p>
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-xl font-bold text-blue-600">{tasksCompletedToday}</p>
        </div>
        {hasModule('toilet') && (
          <Link to="/supervisor/toilet-complaints" className="stat-card flex flex-col justify-between group">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-500 uppercase">Toilet Complaints</p>
              <ClipboardList className="h-4 w-4 text-pink-500" />
            </div>
            <p className="text-xl font-bold text-pink-600 group-hover:text-pink-700">View All</p>
          </Link>
        )}
        {hasModule('gaushala') && (
          <div className="stat-card">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-500 uppercase">Gau Shala</p>
              <ClipboardList className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-xl font-bold text-amber-600">Module</p>
          </div>
        )}
      </div>

      {/* Administration & Reports - design system */}
      <section>
        <h2 className="ds-section-title flex items-center">
          <Shield className="w-5 h-5 mr-2 text-gray-500" />
          Administration & Reports
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <Link
            to="/supervisor/workers"
            className="card-hover flex flex-col items-center justify-center p-5 group"
          >
            <div className="p-3 rounded-full bg-blue-600 text-white mb-3 shadow-sm group-hover:scale-110 transition-transform">
              <Users className="h-6 w-6" />
            </div>
            <span className="text-sm font-medium text-gray-700 group-hover:text-primary-700 text-center">Worker Management</span>
          </Link>
          <Link
            to="/supervisor/notifications"
            className="card-hover flex flex-col items-center justify-center p-5 group"
          >
            <div className="p-3 rounded-full bg-indigo-600 text-white mb-3 shadow-sm group-hover:scale-110 transition-transform">
              <Bell className="h-6 w-6" />
            </div>
            <span className="text-sm font-medium text-gray-700 group-hover:text-primary-700 text-center">Notifications</span>
          </Link>
        </div>
      </section>

      {/* Alerts Section - design system */}
      {(alerts.workers_not_marked_by_9am?.length > 0 || alerts.repeat_absentees?.length > 0 || alerts.geo_violations?.length > 0) && (
        <div className="card-flat border-amber-200 bg-amber-50/50">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="ds-section-title mb-0">Alerts</h3>
          </div>
          <div className="space-y-2">
            {alerts.workers_not_marked_by_9am?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-yellow-800">Workers not marked by 9 AM:</p>
                <ul className="text-sm text-yellow-700 ml-4 list-disc">
                  {alerts.workers_not_marked_by_9am.map((w, idx) => (
                    <li key={idx}>{w.worker_name} ({w.mobile})</li>
                  ))}
                </ul>
              </div>
            )}
            {alerts.repeat_absentees?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-yellow-800">Repeat absentees (3+ days):</p>
                <ul className="text-sm text-yellow-700 ml-4 list-disc">
                  {alerts.repeat_absentees.map((w, idx) => (
                    <li key={idx}>{w.worker_name} - {w.absent_days} days absent</li>
                  ))}
                </ul>
              </div>
            )}
            {alerts.geo_violations?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-yellow-800">Geo violations today:</p>
                <ul className="text-sm text-yellow-700 ml-4 list-disc">
                  {alerts.geo_violations.map((v, idx) => (
                    <li key={idx}>{v.worker_name} - Check-in at {v.checkin_time ? new Date(v.checkin_time).toLocaleTimeString() : 'N/A'}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Attendance Management Section - design system card + table */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="ds-section-title mb-0">Attendance Management</h2>
          <button
            type="button"
            onClick={handleMarkAllPresent}
            disabled={markingAll || workers.filter(w => !w.checkin_time).length === 0}
            className="btn btn-primary text-sm disabled:opacity-50"
          >
            {markingAll ? 'Marking...' : 'Mark All Present'}
          </button>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Worker Name</th>
                <th>Status</th>
                <th>Check-in Time</th>
                <th>Geo Status</th>
                <th>Photo</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {workers.map((worker) => (
                <tr key={worker.id}>
                  <td>
                    <div>
                      <p className="font-medium text-gray-900">{worker.full_name}</p>
                      {worker.mobile && <p className="text-sm text-gray-500">{worker.mobile}</p>}
                    </div>
                  </td>
                  <td>{getStatusBadge(worker.status)}</td>
                  <td className="text-sm text-gray-900">
                    {worker.checkin_time ? new Date(worker.checkin_time).toLocaleTimeString() : '-'}
                  </td>
                  <td>{getGeoStatusBadge(worker.geo_status)}</td>
                  <td>
                    {worker.before_photo_url || worker.after_photo_url ? (
                      <span className="inline-flex items-center gap-2 flex-wrap">
                        {worker.before_photo_url && (
                          <a
                            href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${worker.before_photo_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-800 text-sm"
                          >
                            <Camera className="w-3 h-3" />
                            Before
                          </a>
                        )}
                        {worker.before_photo_url && worker.after_photo_url && <span className="text-gray-400">|</span>}
                        {worker.after_photo_url && (
                          <a
                            href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${worker.after_photo_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-800 text-sm"
                          >
                            <Camera className="w-3 h-3" />
                            After
                          </a>
                        )}
                      </span>
                    ) : worker.photo_url ? (
                      <a
                        href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${worker.photo_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-800"
                      >
                        <Camera className="w-4 h-4" />
                        View
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>
                    {!worker.checkin_time && (
                      <button
                        type="button"
                        onClick={() => handleMarkAttendance(worker.id, worker.full_name)}
                        className="btn btn-primary text-sm py-1.5 px-3"
                      >
                        Mark Present & Add Proof
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Task Management - MRF tasks - only when MRF module assigned */}
      {hasModule('mrf') && (
      <section>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="ds-section-title mb-0">Task Management (MRF)</h2>
          <Link to="/supervisor/mrf" className="btn btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Assign Task
          </Link>
        </div>
        <div className="card p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="stat-card">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Assigned</p>
              <p className="text-2xl font-bold text-blue-600">{mrfAssigned.length}</p>
            </div>
            <div className="stat-card">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">In Progress</p>
              <p className="text-2xl font-bold text-yellow-600">{mrfInProgress.length}</p>
            </div>
            <div className="stat-card">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Completed</p>
              <p className="text-2xl font-bold text-green-600">{mrfCompleted.length}</p>
            </div>
          </div>

          {mrfTasksLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : mrfTasks.length > 0 ? (
            <div className="space-y-2">
              {mrfTasks.map((task) => (
                <div key={task.id} className="card-flat flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium text-gray-900">{task.worker?.full_name || 'Unknown'}</span>
                      <span className="text-sm text-gray-500">{task.facility?.name && ` · ${task.facility.name}`}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${task.status === 'Completed' ? 'bg-green-100 text-green-800' : task.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                        {task.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{task.task_type}{task.remarks ? ` — ${task.remarks}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {task.status === 'Assigned' && (
                      <button
                        type="button"
                        onClick={() => setMrfStatusModal({ taskId: task.id, newStatus: 'In Progress', taskType: task.task_type, workerName: task.worker?.full_name })}
                        className="px-3 py-1.5 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700"
                      >
                        In Progress
                      </button>
                    )}
                    {task.status !== 'Completed' && (
                      <button
                        type="button"
                        onClick={() => setMrfStatusModal({ taskId: task.id, newStatus: 'Completed', taskType: task.task_type, workerName: task.worker?.full_name })}
                        className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No MRF tasks. Use &quot;Assign Task&quot; to open MRF Task Board.</p>
          )}
        </div>
      </section>
      )}

      {/* MRF task status update modal (before/after photo + location on image) */}
      {mrfStatusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 my-4">
            <h3 className="text-sm font-bold text-gray-900 mb-1">Update task · {mrfStatusModal.newStatus}</h3>
            <p className="text-xs text-gray-500 mb-4">{mrfStatusModal.taskType} — {mrfStatusModal.workerName}</p>
            <MrfProofCapture
              submitLabel={mrfUpdating ? 'Updating...' : `Mark as ${mrfStatusModal.newStatus}`}
              submitDisabled={mrfUpdating}
              onSubmit={(proof) => submitMrfStatusUpdate(proof)}
              onCancel={() => setMrfStatusModal(null)}
            />
          </div>
        </div>
      )}

      {/* Attendance proof modal: before + after photo with live location (all modules) */}
      {attendanceProofWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 my-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add proof · {attendanceProofWorker.full_name}</h3>
              <button type="button" onClick={closeAttendanceProofModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">Capture <strong>before</strong> and <strong>after</strong> photos with live location as proof for attendance (required for all modules).</p>

            {!attendanceProofLocation && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={getAttendanceProofLocation}
                  disabled={attendanceProofLoading}
                  className="btn btn-primary w-full flex items-center justify-center gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  {attendanceProofLoading ? 'Getting location...' : 'Get live location'}
                </button>
              </div>
            )}
            {attendanceProofLocation && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                <span className="font-medium">Location: </span>
                {attendanceProofLocation.latitude.toFixed(6)}, {attendanceProofLocation.longitude.toFixed(6)}
                {attendanceProofLocation.address && <p className="mt-1 text-gray-600 truncate" title={attendanceProofLocation.address}>{attendanceProofLocation.address}</p>}
              </div>
            )}

            {(!attendanceProofBefore || !attendanceProofAfter) && (
              <>
                {!attendanceProofStream && (
                  <button
                    type="button"
                    onClick={startAttendanceProofCamera}
                    disabled={!attendanceProofLocation}
                    className="btn btn-secondary w-full flex items-center justify-center gap-2 mb-4"
                  >
                    <Camera className="w-4 h-4" />
                    Open camera
                  </button>
                )}
                {attendanceProofStream && (
                  <div className="mb-4">
                    <video
                      ref={attendanceProofVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full rounded-lg border border-gray-200 bg-black max-h-64 object-contain"
                    />
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {!attendanceProofBefore && (
                        <button
                          type="button"
                          onClick={() => captureAttendanceProofPhoto('before')}
                          disabled={attendanceProofLoading}
                          className="btn btn-primary flex-1 min-w-[140px] flex items-center justify-center gap-2"
                        >
                          <Camera className="w-4 h-4" />
                          {attendanceProofLoading ? 'Capturing...' : 'Capture before'}
                        </button>
                      )}
                      {attendanceProofBefore && !attendanceProofAfter && (
                        <button
                          type="button"
                          onClick={() => captureAttendanceProofPhoto('after')}
                          disabled={attendanceProofLoading}
                          className="btn btn-primary flex-1 min-w-[140px] flex items-center justify-center gap-2"
                        >
                          <Camera className="w-4 h-4" />
                          {attendanceProofLoading ? 'Capturing...' : 'Capture after'}
                        </button>
                      )}
                      <button type="button" onClick={stopAttendanceProofCamera} className="btn btn-secondary">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {attendanceProofBefore && attendanceProofAfter && (
              <div className="mb-4">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Before</p>
                    <img src={attendanceProofBefore.previewUrl} alt="Before" className="w-full rounded-lg border border-gray-200 max-h-40 object-contain bg-gray-100" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">After</p>
                    <img src={attendanceProofAfter.previewUrl} alt="After" className="w-full rounded-lg border border-gray-200 max-h-40 object-contain bg-gray-100" />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={submitAttendanceProof}
                  disabled={attendanceProofSubmitting}
                  className="btn btn-primary w-full flex items-center justify-center gap-2"
                >
                  {attendanceProofSubmitting ? 'Submitting...' : 'Submit attendance with proof'}
                </button>
              </div>
            )}

            <button type="button" onClick={closeAttendanceProofModal} className="w-full mt-2 text-sm text-gray-500 hover:text-gray-700">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Toilet Complaints Panel - only when Toilet module assigned */}
      {hasModule('toilet') && (
      <section>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="ds-section-title mb-0">Toilet Complaints (Assigned to Me)</h2>
          <Link to="/supervisor/toilet-complaints" className="text-sm font-medium text-primary-600 hover:text-primary-800">
            Manage All
          </Link>
        </div>
        <div className="card p-6">
          {complaintsLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : toiletComplaints.length > 0 ? (
            <div className="space-y-4">
              {toiletComplaints.filter(c => c.status?.toLowerCase() !== 'resolved').slice(0, 5).map((complaint) => (
                <div key={complaint.id} className="border border-gray-100 rounded-xl p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-900 text-sm">
                        {complaint.complaintType}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${complaint.priority?.toLowerCase() === 'high' ? 'bg-red-50 text-red-600 border-red-100' :
                          complaint.priority?.toLowerCase() === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                            'bg-green-50 text-green-600 border-green-100'
                        }`}>
                        {complaint.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                      <MapPin className="w-3 h-3" />
                      {complaint.facility?.name}
                    </div>
                  </div>
                  <Link
                    to="/supervisor/toilet-complaints"
                    className="px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-100"
                  >
                    RESOLVE
                  </Link>
                </div>
              ))}
              {toiletComplaints.filter(c => c.status?.toLowerCase() !== 'resolved').length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 text-green-100 mb-2" />
                  <p className="text-sm font-medium">No active complaints! Everything looks good.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <ClipboardList className="w-12 h-12 text-gray-200 mb-2" />
              <p className="text-sm font-medium">No complaints assigned to you.</p>
            </div>
          )}
        </div>
      </section>
      )}

      {/* Task Assignment Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Assign Task</h3>
              <button
                onClick={() => setShowTaskModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Worker</label>
                <select
                  value={taskForm.worker_id}
                  onChange={(e) => setTaskForm({ ...taskForm, worker_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-blue-500"
                >
                  <option value="">Select Worker</option>
                  {workers.map((w) => (
                    <option key={w.id} value={w.id}>{w.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Task Type</label>
                <select
                  value={taskForm.task_type}
                  onChange={(e) => setTaskForm({ ...taskForm, task_type: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-blue-500"
                >
                  <option value="SWEEPING">Sweeping</option>
                  <option value="TOILET">Toilet</option>
                  <option value="MRF">MRF</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Area / Street</label>
                <input
                  type="text"
                  value={taskForm.area_street}
                  onChange={(e) => setTaskForm({ ...taskForm, area_street: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-blue-500"
                  placeholder="Enter area or street name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
                <select
                  value={taskForm.shift}
                  onChange={(e) => setTaskForm({ ...taskForm, shift: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-blue-500"
                >
                  <option value="MORNING">Morning</option>
                  <option value="EVENING">Evening</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
                <textarea
                  value={taskForm.special_instructions}
                  onChange={(e) => setTaskForm({ ...taskForm, special_instructions: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-blue-500"
                  placeholder="Optional special instructions"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Assign Task
                </button>
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Work Proof Upload Modal */}
      {showWorkProofModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Upload Work Proof</h3>
              <button
                onClick={() => {
                  stopCamera();
                  stopCamera();
                  setShowWorkProofModal(null);
                  setWorkProofForm({
                    before_photo: null,
                    before_photo_latitude: null,
                    before_photo_longitude: null,
                    before_photo_address: null,
                    after_photo: null,
                    after_photo_latitude: null,
                    after_photo_longitude: null,
                    after_photo_address: null,
                    work_proof_remarks: '',
                    escalation_flag: false,
                    escalation_reason: ''
                  });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Before Photo Capture */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Before Photo (with Geo Location)</label>
                {workProofForm.before_photo ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <img
                        src={URL.createObjectURL(workProofForm.before_photo)}
                        alt="Before work"
                        className="w-full h-48 object-cover rounded-lg border border-gray-300"
                      />
                      <button
                        onClick={() => setWorkProofForm({ ...workProofForm, before_photo: null, before_photo_latitude: null, before_photo_longitude: null, before_photo_address: null })}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {workProofForm.before_photo_latitude && (
                      <div className="text-xs text-gray-500 space-y-1">
                        <p className="font-medium">Location:</p>
                        {workProofForm.before_photo_address && (
                          <p className="text-gray-700">{workProofForm.before_photo_address}</p>
                        )}
                        <p className="text-gray-500">
                          Coordinates: {workProofForm.before_photo_latitude.toFixed(6)}, {workProofForm.before_photo_longitude.toFixed(6)}
                        </p>
                      </div>
                    )}
                  </div>
                ) : cameraState.showCamera && cameraState.cameraType === 'before' ? (
                  <div className="space-y-2">
                    <div className="relative bg-black rounded-lg overflow-hidden">
                      <video
                        id="video-before"
                        autoPlay
                        playsInline
                        className="w-full h-64 object-cover"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => capturePhoto('before')}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                      >
                        <Camera className="w-4 h-4" />
                        Capture Photo
                      </button>
                      <button
                        onClick={stopCamera}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => startCamera('before')}
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Camera className="w-5 h-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Capture Before Photo</span>
                  </button>
                )}
              </div>

              {/* After Photo Capture */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">After Photo (with Geo Location)</label>
                {workProofForm.after_photo ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <img
                        src={URL.createObjectURL(workProofForm.after_photo)}
                        alt="After work"
                        className="w-full h-48 object-cover rounded-lg border border-gray-300"
                      />
                      <button
                        onClick={() => setWorkProofForm({ ...workProofForm, after_photo: null, after_photo_latitude: null, after_photo_longitude: null, after_photo_address: null })}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {workProofForm.after_photo_latitude && (
                      <div className="text-xs text-gray-500 space-y-1">
                        <p className="font-medium">Location:</p>
                        {workProofForm.after_photo_address && (
                          <p className="text-gray-700">{workProofForm.after_photo_address}</p>
                        )}
                        <p className="text-gray-500">
                          Coordinates: {workProofForm.after_photo_latitude.toFixed(6)}, {workProofForm.after_photo_longitude.toFixed(6)}
                        </p>
                      </div>
                    )}
                  </div>
                ) : cameraState.showCamera && cameraState.cameraType === 'after' ? (
                  <div className="space-y-2">
                    <div className="relative bg-black rounded-lg overflow-hidden">
                      <video
                        id="video-after"
                        autoPlay
                        playsInline
                        className="w-full h-64 object-cover"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => capturePhoto('after')}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                      >
                        <Camera className="w-4 h-4" />
                        Capture Photo
                      </button>
                      <button
                        onClick={stopCamera}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => startCamera('after')}
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Camera className="w-5 h-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Capture After Photo</span>
                  </button>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea
                  value={workProofForm.work_proof_remarks}
                  onChange={(e) => setWorkProofForm({ ...workProofForm, work_proof_remarks: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Add remarks about the work completed"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="escalation"
                  checked={workProofForm.escalation_flag}
                  onChange={(e) => setWorkProofForm({ ...workProofForm, escalation_flag: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="escalation" className="text-sm text-gray-700">Work not completed (Escalation)</label>
              </div>
              {workProofForm.escalation_flag && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Escalation Reason</label>
                  <textarea
                    value={workProofForm.escalation_reason}
                    onChange={(e) => setWorkProofForm({ ...workProofForm, escalation_reason: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Explain why work was not completed"
                  />
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => handleUploadWorkProof(showWorkProofModal)}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Upload & Complete
                </button>
                <button
                  onClick={() => {
                    stopCamera();
                    setShowWorkProofModal(null);
                    setWorkProofForm({
                      before_photo: null,
                      before_photo_latitude: null,
                      before_photo_longitude: null,
                      after_photo: null,
                      after_photo_latitude: null,
                      after_photo_longitude: null,
                      work_proof_remarks: '',
                      escalation_flag: false,
                      escalation_reason: ''
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupervisorDashboard;
