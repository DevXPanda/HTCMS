import React, { useState, useEffect } from 'react';
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
  Image as ImageIcon
} from 'lucide-react';
import { useStaffAuth } from '../../contexts/StaffAuthContext';
import { fieldWorkerMonitoringAPI, workerTaskAPI, attendanceAPI } from '../../services/api';
import toast from 'react-hot-toast';

const SupervisorDashboard = () => {
  const { user } = useStaffAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Debug: Log component mount
  useEffect(() => {
    console.log('SupervisorDashboard: Component mounted', { userId: user?.id });
  }, []);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showWorkProofModal, setShowWorkProofModal] = useState(null); // taskId
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [markingAttendance, setMarkingAttendance] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

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

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('SupervisorDashboard: Fetching dashboard data...');
      const res = await fieldWorkerMonitoringAPI.getSupervisorDashboardForSelf();
      console.log('SupervisorDashboard: API response:', res);
      console.log('SupervisorDashboard: Data:', res?.data?.data);
      setData(res?.data?.data ?? null);
      if (!res?.data?.data) {
        console.warn('SupervisorDashboard: No data received from API');
      }
    } catch (err) {
      console.error('SupervisorDashboard: Error fetching dashboard:', err);
      console.error('SupervisorDashboard: Error response:', err.response);
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

  useEffect(() => {
    if (user?.id) {
      fetchDashboard();
      fetchTasks();
    } else {
      console.warn('SupervisorDashboard: No user ID found');
      setLoading(false);
    }
    
    // Cleanup camera stream on unmount
    return () => {
      if (cameraState.stream) {
        cameraState.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [user?.id]);

  const handleMarkAttendance = async (workerId, workerName) => {
    if (markingAttendance === workerId) return;

    try {
      setMarkingAttendance(workerId);
      
      // Get current location if available
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

      const formData = new FormData();
      formData.append('worker_id', workerId);
      formData.append('ward_id', user?.ward_id);
      formData.append('timestamp', new Date().toISOString());
      if (location.latitude) formData.append('latitude', location.latitude);
      if (location.longitude) formData.append('longitude', location.longitude);

      await attendanceAPI.markWorkerAttendance(formData);
      toast.success(`${workerName} marked as present`);
      await fetchDashboard();
    } catch (err) {
      console.error('Error marking attendance:', err);
      toast.error(err.response?.data?.message || 'Failed to mark attendance');
    } finally {
      setMarkingAttendance(null);
    }
  };

  const handleMarkAllPresent = async () => {
    if (!confirm('Are you sure you want to mark all workers as present?')) {
      return;
    }

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
    console.log('SupervisorDashboard: Rendering loading state');
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        <span className="ml-4 text-gray-600">Loading dashboard...</span>
      </div>
    );
  }

  // Show error state if there's an error and no data
  if (error && !data) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
        <button
          onClick={fetchDashboard}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  // If no data and no error, show empty state
  if (!data) {
    console.log('SupervisorDashboard: Rendering empty state (no data, no error)');
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-2 text-yellow-700">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          No data available. Please try refreshing.
        </div>
        <button
          onClick={fetchDashboard}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>
    );
  }

  console.log('SupervisorDashboard: Rendering main dashboard', { data });

  const supervisor = data?.supervisor || {};
  const workers = data?.workers || [];
  const attendancePct = data?.attendance_pct || 0;
  const tasksCompletedToday = data?.tasks_completed_today || 0;
  const alerts = data?.alerts || {};

  const assignedTasks = Array.isArray(tasks) ? tasks.filter(t => t.status === 'ASSIGNED') : [];
  const inProgressTasks = Array.isArray(tasks) ? tasks.filter(t => t.status === 'IN_PROGRESS') : [];
  const completedTasks = Array.isArray(tasks) ? tasks.filter(t => t.status === 'COMPLETED') : [];

  const canMarkAttendance = () => {
    try {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      const timeMinutes = hour * 60 + minute;
      return timeMinutes >= 6 * 60 && timeMinutes <= 11 * 60;
    } catch (e) {
      console.error('Error checking attendance window:', e);
      return false;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supervisor Dashboard</h1>
          <p className="text-gray-600">
            {supervisor.full_name || user?.full_name} ({supervisor.employee_id || user?.employee_id})
            {supervisor.ward_name && ` · ${supervisor.ward_name}`}
          </p>
        </div>
        <button
          type="button"
          onClick={fetchDashboard}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Workers</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{data?.total_workers || 0}</p>
            </div>
            <Users className="w-10 h-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Present Today</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{data?.present_today || 0}</p>
            </div>
            <UserCheck className="w-10 h-10 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Absent Today</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{data?.absent_today || 0}</p>
            </div>
            <UserX className="w-10 h-10 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Attendance %</p>
              <p className={`text-2xl font-bold mt-1 ${attendancePct >= 80 ? 'text-green-600' : attendancePct >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                {attendancePct}%
              </p>
            </div>
            <Calendar className="w-10 h-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tasks Completed</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{tasksCompletedToday}</p>
            </div>
            <CheckCircle className="w-10 h-10 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {canMarkAttendance() && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-blue-700">Attendance window: 6:00 AM - 11:00 AM</span>
          </div>
          <button
            onClick={handleMarkAllPresent}
            disabled={markingAll || workers.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {markingAll ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Marking...
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4" />
                Mark All Present
              </>
            )}
          </button>
        </div>
      )}

      {/* Alerts Section */}
      {(alerts.workers_not_marked_by_9am?.length > 0 || alerts.repeat_absentees?.length > 0 || alerts.geo_violations?.length > 0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <h3 className="font-semibold text-yellow-900">Alerts</h3>
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

      {/* Attendance Management Section */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Attendance Management</h2>
          {canMarkAttendance() && (
            <button
              onClick={handleMarkAllPresent}
              disabled={markingAll}
              className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {markingAll ? 'Marking...' : 'Mark All Present'}
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Worker Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-in Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Geo Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Photo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {workers.map((worker) => (
                <tr key={worker.id}>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{worker.full_name}</p>
                      {worker.mobile && <p className="text-sm text-gray-500">{worker.mobile}</p>}
                    </div>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(worker.status)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {worker.checkin_time ? new Date(worker.checkin_time).toLocaleTimeString() : '-'}
                  </td>
                  <td className="px-6 py-4">{getGeoStatusBadge(worker.geo_status)}</td>
                  <td className="px-6 py-4">
                    {worker.photo_url ? (
                      <a
                        href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${worker.photo_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                      >
                        <Camera className="w-4 h-4" />
                        View
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {worker.status === 'NOT_MARKED' && canMarkAttendance() && (
                      <button
                        onClick={() => handleMarkAttendance(worker.id, worker.full_name)}
                        disabled={markingAttendance === worker.id}
                        className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        {markingAttendance === worker.id ? 'Marking...' : 'Mark Present'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Task Assignment Panel */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Task Management</h2>
          <button
            onClick={() => setShowTaskModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Assign Task
          </button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Assigned</h3>
              <p className="text-2xl font-bold text-blue-600">{assignedTasks.length}</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">In Progress</h3>
              <p className="text-2xl font-bold text-yellow-600">{inProgressTasks.length}</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Completed</h3>
              <p className="text-2xl font-bold text-green-600">{completedTasks.length}</p>
            </div>
          </div>

          {tasks.length > 0 ? (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div key={task.id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{task.worker?.full_name || 'Unknown Worker'}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        task.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        task.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{task.task_type} - {task.area_street} ({task.shift})</p>
                    {task.special_instructions && (
                      <p className="text-xs text-gray-500 mt-1">{task.special_instructions}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {task.status !== 'COMPLETED' && (
                      <button
                        onClick={() => setShowWorkProofModal(task.id)}
                        className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                      >
                        Upload Proof
                      </button>
                    )}
                    {task.after_photo_url && (
                      <a
                        href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${task.after_photo_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 flex items-center gap-1"
                      >
                        <ImageIcon className="w-4 h-4" />
                        View Proof
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No tasks assigned today</p>
          )}
        </div>
      </div>

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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter area or street name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
                <select
                  value={taskForm.shift}
                  onChange={(e) => setTaskForm({ ...taskForm, shift: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
