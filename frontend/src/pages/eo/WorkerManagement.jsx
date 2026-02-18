import React, { useState, useEffect } from 'react';
import { Users, Plus, X, AlertTriangle, CheckCircle, RefreshCw, Eye, Image as ImageIcon, FileText, Calendar, MapPin } from 'lucide-react';
import { useStaffAuth } from '../../contexts/StaffAuthContext';
import { workerAPI, wardAPI } from '../../services/api';
import api from '../../services/api';
import toast from 'react-hot-toast';

const WorkerManagement = () => {
  const { user } = useStaffAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [workers, setWorkers] = useState([]);
  const [loadingWorkers, setLoadingWorkers] = useState(true);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [showWorkerDetailsModal, setShowWorkerDetailsModal] = useState(false);
  const [wards, setWards] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [loadingWards, setLoadingWards] = useState(false);
  const [loadingSupervisors, setLoadingSupervisors] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    mobile: '',
    worker_type: 'ULB',
    ward_id: '',
    supervisor_id: '',
    contractor_id: '',
    status: 'ACTIVE'
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchWards();
    fetchSupervisors();
    fetchContractors();
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    try {
      setLoadingWorkers(true);
      const res = await workerAPI.getAllWorkers();
      if (res.data.success) {
        setWorkers(res.data.data.workers || []);
      } else {
        setWorkers([]);
      }
    } catch (err) {
      console.error('Error fetching workers:', err);
      toast.error('Failed to load workers');
      setWorkers([]);
    } finally {
      setLoadingWorkers(false);
    }
  };

  const fetchWards = async () => {
    try {
      setLoadingWards(true);
      const res = await wardAPI.getAll({ ulb_id: user?.ulb_id });
      setWards(res?.data?.data?.wards || []);
    } catch (err) {
      console.error('Error fetching wards:', err);
      toast.error('Failed to load wards');
    } finally {
      setLoadingWards(false);
    }
  };

  const fetchSupervisors = async (wardId = null) => {
    try {
      setLoadingSupervisors(true);
      // Fetch supervisors under this EO's ULB using the new by-ulb endpoint
      const res = await api.get(`/admin-management/employees/by-ulb?role=SUPERVISOR`);
      if (res.data.success) {
        let supervisorsList = res.data.employees || [];
        // Filter by ward if wardId is provided
        if (wardId) {
          supervisorsList = supervisorsList.filter(sup => sup.ward_id === parseInt(wardId));
        }
        setSupervisors(supervisorsList);
      } else {
        setSupervisors([]);
      }
    } catch (err) {
      console.error('Error fetching supervisors:', err);
      toast.error('Failed to load supervisors');
      setSupervisors([]);
    } finally {
      setLoadingSupervisors(false);
    }
  };

  const fetchContractors = async () => {
    try {
      // Fetch contractors under this EO's ULB using the new by-ulb endpoint
      const res = await api.get(`/admin-management/employees/by-ulb?role=CONTRACTOR`);
      if (res.data.success) {
        setContractors(res.data.employees || []);
      } else {
        setContractors([]);
      }
    } catch (err) {
      console.error('Error fetching contractors:', err);
      // Contractors are optional, so don't show error
      setContractors([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }
    
    if (!formData.mobile.trim()) {
      newErrors.mobile = 'Mobile number is required';
    } else if (!/^[0-9+\-\s()]{10,20}$/.test(formData.mobile.trim())) {
      newErrors.mobile = 'Invalid mobile number format';
    }
    
    if (!formData.ward_id) {
      newErrors.ward_id = 'Ward is required';
    }
    
    if (!formData.supervisor_id) {
      newErrors.supervisor_id = 'Supervisor is required';
    }
    
    if (!formData.worker_type) {
      newErrors.worker_type = 'Worker type is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      // Validate required fields are not empty
      if (!formData.ward_id || !formData.supervisor_id) {
        toast.error('Please select ward and supervisor');
        setLoading(false);
        return;
      }

      // Validate IDs are valid integers
      const wardId = parseInt(formData.ward_id);
      const supervisorId = parseInt(formData.supervisor_id);
      
      if (isNaN(wardId) || wardId <= 0) {
        toast.error('Invalid ward selected');
        setLoading(false);
        return;
      }
      
      if (isNaN(supervisorId) || supervisorId <= 0) {
        toast.error('Invalid supervisor selected');
        setLoading(false);
        return;
      }

      const payload = {
        full_name: formData.full_name.trim(),
        mobile: formData.mobile.trim(),
        worker_type: formData.worker_type.toUpperCase(),
        ward_id: wardId,
        supervisor_id: supervisorId,
        status: (formData.status || 'ACTIVE').toUpperCase()
      };

      // Only include contractor_id if it's a valid non-empty value
      // Don't send it at all if empty to avoid validation errors
      if (formData.contractor_id && 
          formData.contractor_id !== '' && 
          formData.contractor_id !== 'null' && 
          formData.contractor_id !== null &&
          formData.contractor_id !== undefined) {
        const contractorId = parseInt(formData.contractor_id);
        if (!isNaN(contractorId) && contractorId > 0) {
          payload.contractor_id = contractorId;
        }
      }

      console.log('Creating worker with payload:', payload);

      const res = await workerAPI.createWorker(payload);
      
      if (res.data.success) {
        toast.success(`Worker created successfully! Employee Code: ${res.data.worker.employee_code}`);
        setShowCreateModal(false);
        setFormData({
          full_name: '',
          mobile: '',
          worker_type: 'ULB',
          ward_id: '',
          supervisor_id: '',
          contractor_id: '',
          status: 'ACTIVE'
        });
        setErrors({});
        await fetchWorkers(); // Refresh workers list
      }
    } catch (err) {
      console.error('Error creating worker:', err);
      console.error('Error response:', err.response?.data);
      
      // Extract error message
      let errorMessage = 'Failed to create worker';
      
      if (err.response?.data) {
        // Check for validation errors array
        if (err.response.data.errors && Array.isArray(err.response.data.errors)) {
          const errorMessages = err.response.data.errors.map(e => 
            `${e.param || 'Field'}: ${e.msg || e.message || 'Invalid value'}`
          ).join(', ');
          errorMessage = `Validation failed: ${errorMessages}`;
        } else if (err.response.data.message) {
          errorMessage = err.response.data.message;
        }
      }
      
      toast.error(errorMessage);
      
      // Set field-specific errors if provided
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        const fieldErrors = {};
        err.response.data.errors.forEach(error => {
          if (error.param) {
            fieldErrors[error.param] = error.msg || error.message;
          }
        });
        setErrors(fieldErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  // Filter supervisors by selected ward
  const filteredSupervisors = formData.ward_id
    ? supervisors.filter(sup => sup.ward_id === parseInt(formData.ward_id))
    : supervisors;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Worker Management</h1>
          <p className="text-gray-600">Create and manage field workers</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Create Worker
        </button>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900 mb-1">Worker Account Creation</h3>
            <p className="text-sm text-blue-700">
              Workers do not have login credentials. Attendance is marked by supervisors. 
              Employee codes are auto-generated in the format: <strong>WRK-{'{WARD_CODE}'}-{'{NUMBER}'}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Workers List */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">All Workers</h2>
          <button
            onClick={fetchWorkers}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
        
        {loadingWorkers ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">Loading workers...</p>
          </div>
        ) : workers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p>No workers found. Create your first worker to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mobile</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Worker Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ward</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supervisor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proofs</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {workers.map((worker) => (
                  <tr key={worker.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{worker.employee_code}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{worker.full_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{worker.mobile}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        worker.worker_type === 'ULB' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {worker.worker_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {worker.ward ? `${worker.ward.wardNumber} - ${worker.ward.wardName}` : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {worker.supervisor ? `${worker.supervisor.full_name} (${worker.supervisor.employee_id})` : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        worker.status === 'ACTIVE' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {worker.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {worker.proofs && worker.proofs.length > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                            <FileText className="w-3 h-3" />
                            {worker.proofs.length} proof{worker.proofs.length !== 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">No proofs</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedWorker(worker);
                          setShowWorkerDetailsModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Worker Details Modal with Proofs */}
      {showWorkerDetailsModal && selectedWorker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold text-gray-900">Worker Details</h3>
              <button
                onClick={() => {
                  setShowWorkerDetailsModal(false);
                  setSelectedWorker(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Worker Basic Information */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-4">Basic Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Employee Code</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedWorker?.employee_code || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Full Name</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedWorker?.full_name || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Mobile</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedWorker?.mobile || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Worker Type</label>
                    <p className="text-sm text-gray-900 mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        selectedWorker?.worker_type === 'ULB' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {selectedWorker?.worker_type || 'N/A'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Ward</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {selectedWorker?.ward ? `${selectedWorker.ward.wardNumber || ''} - ${selectedWorker.ward.wardName || ''}` : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">ULB</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {selectedWorker?.ulb?.name || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <p className="text-sm text-gray-900 mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        selectedWorker?.status === 'ACTIVE' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedWorker?.status || 'N/A'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Supervisor</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {selectedWorker?.supervisor ? `${selectedWorker.supervisor.full_name || ''} (${selectedWorker.supervisor.employee_id || ''})` : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">EO</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {selectedWorker?.eo ? `${selectedWorker.eo.full_name || ''} (${selectedWorker.eo.employee_id || ''})` : '-'}
                    </p>
                  </div>
                  {selectedWorker?.contractor && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Contractor</label>
                      <p className="text-sm text-gray-900 mt-1">
                        {selectedWorker.contractor.company_name || selectedWorker.contractor.full_name || ''} ({selectedWorker.contractor.employee_id || ''})
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Work Proofs Section */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Work Proofs ({selectedWorker.proofs?.length || 0})
                </h4>
                {selectedWorker.proofs && selectedWorker.proofs.length > 0 ? (
                  <div className="space-y-4">
                    {selectedWorker.proofs.map((proof, index) => (
                      <div key={proof.id || index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-gray-900">Task: {proof.task_type}</span>
                              <span className="text-xs text-gray-500">•</span>
                              <span className="text-sm text-gray-600">{proof.area_street}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Calendar className="w-3 h-3" />
                              <span>Assigned: {proof.assigned_date ? new Date(proof.assigned_date).toLocaleDateString() : 'N/A'}</span>
                              {proof.completed_at && (
                                <>
                                  <span>•</span>
                                  <span>Completed: {new Date(proof.completed_at).toLocaleDateString()}</span>
                                </>
                              )}
                            </div>
                            {proof.supervisor && (
                              <div className="text-xs text-gray-500 mt-1">
                                Supervisor: {proof.supervisor.full_name} ({proof.supervisor.employee_id})
                              </div>
                            )}
                          </div>
                          {proof.escalation_flag && (
                            <span className="inline-flex px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                              Escalated
                            </span>
                          )}
                        </div>
                        
                        {proof.work_proof_remarks && (
                          <div className="mb-3">
                            <label className="text-xs font-medium text-gray-700">Remarks:</label>
                            <p className="text-sm text-gray-600 mt-1">{proof.work_proof_remarks}</p>
                          </div>
                        )}
                        
                        {proof.escalation_reason && (
                          <div className="mb-3 p-2 bg-orange-50 rounded">
                            <label className="text-xs font-medium text-orange-700">Escalation Reason:</label>
                            <p className="text-sm text-orange-600 mt-1">{proof.escalation_reason}</p>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {proof.before_photo_url && (
                            <div>
                              <label className="text-xs font-medium text-gray-700 mb-1 block">Before Photo</label>
                              <a
                                href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${proof.before_photo_url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block border border-gray-200 rounded-lg overflow-hidden hover:border-blue-500 transition-colors"
                              >
                                <img
                                  src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${proof.before_photo_url}`}
                                  alt="Before work"
                                  className="w-full h-48 object-cover"
                                  onError={(e) => {
                                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage not found%3C/text%3E%3C/svg%3E';
                                  }}
                                />
                                <div className="p-2 bg-gray-50">
                                  <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                                    <ImageIcon className="w-3 h-3" />
                                    <span>Click to view full size</span>
                                  </div>
                                  {proof.before_photo_latitude != null && proof.before_photo_longitude != null && (
                                    <div className="text-xs text-gray-500 mt-1 space-y-1">
                                      <div className="flex items-start gap-1">
                                        <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1">
                                          {proof.before_photo_address && (
                                            <p className="text-gray-700 font-medium mb-1">{proof.before_photo_address}</p>
                                          )}
                                          <a
                                            href={`https://www.google.com/maps?q=${proof.before_photo_latitude},${proof.before_photo_longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline"
                                          >
                                            {Number(proof.before_photo_latitude).toFixed(6)}, {Number(proof.before_photo_longitude).toFixed(6)}
                                          </a>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </a>
                            </div>
                          )}
                          {proof.after_photo_url && (
                            <div>
                              <label className="text-xs font-medium text-gray-700 mb-1 block">After Photo</label>
                              <a
                                href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${proof.after_photo_url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block border border-gray-200 rounded-lg overflow-hidden hover:border-blue-500 transition-colors"
                              >
                                <img
                                  src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${proof.after_photo_url}`}
                                  alt="After work"
                                  className="w-full h-48 object-cover"
                                  onError={(e) => {
                                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage not found%3C/text%3E%3C/svg%3E';
                                  }}
                                />
                                <div className="p-2 bg-gray-50">
                                  <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                                    <ImageIcon className="w-3 h-3" />
                                    <span>Click to view full size</span>
                                  </div>
                                  {proof.after_photo_latitude != null && proof.after_photo_longitude != null && (
                                    <div className="text-xs text-gray-500 mt-1 space-y-1">
                                      <div className="flex items-start gap-1">
                                        <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1">
                                          {proof.after_photo_address && (
                                            <p className="text-gray-700 font-medium mb-1">{proof.after_photo_address}</p>
                                          )}
                                          <a
                                            href={`https://www.google.com/maps?q=${proof.after_photo_latitude},${proof.after_photo_longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline"
                                          >
                                            {Number(proof.after_photo_latitude).toFixed(6)}, {Number(proof.after_photo_longitude).toFixed(6)}
                                          </a>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm">No work proofs available yet.</p>
                    <p className="text-xs text-gray-400 mt-1">Proofs will appear here when supervisors upload them.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Worker Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold text-gray-900">Create New Worker</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setFormData({
                    full_name: '',
                    mobile: '',
                    worker_type: 'ULB',
                    ward_id: '',
                    supervisor_id: '',
                    contractor_id: '',
                    status: 'ACTIVE'
                  });
                  setErrors({});
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.full_name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter full name"
                  />
                  {errors.full_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.full_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.mobile ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter mobile number"
                  />
                  {errors.mobile && (
                    <p className="mt-1 text-sm text-red-600">{errors.mobile}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Worker Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="worker_type"
                    value={formData.worker_type}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.worker_type ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="ULB">ULB</option>
                    <option value="CONTRACTUAL">CONTRACTUAL</option>
                  </select>
                  {errors.worker_type && (
                    <p className="mt-1 text-sm text-red-600">{errors.worker_type}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ward <span className="text-red-500">*</span>
                  </label>
                  {loadingWards ? (
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
                      <span className="text-sm text-gray-500">Loading wards...</span>
                    </div>
                  ) : (
                    <select
                      name="ward_id"
                      value={formData.ward_id}
                      onChange={async (e) => {
                        handleInputChange(e);
                        const selectedWardId = e.target.value;
                        // Reset supervisor when ward changes
                        setFormData(prev => ({ ...prev, supervisor_id: '' }));
                        // Reload supervisors filtered by selected ward
                        if (selectedWardId) {
                          await fetchSupervisors(selectedWardId);
                        } else {
                          await fetchSupervisors();
                        }
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.ward_id ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select Ward</option>
                      {wards.map((ward) => (
                        <option key={ward.id} value={ward.id}>
                          {ward.wardNumber} - {ward.wardName}
                        </option>
                      ))}
                    </select>
                  )}
                  {errors.ward_id && (
                    <p className="mt-1 text-sm text-red-600">{errors.ward_id}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supervisor <span className="text-red-500">*</span>
                  </label>
                  {loadingSupervisors ? (
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
                      <span className="text-sm text-gray-500">Loading supervisors...</span>
                    </div>
                  ) : (
                    <select
                      name="supervisor_id"
                      value={formData.supervisor_id}
                      onChange={handleInputChange}
                      disabled={!formData.ward_id}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.supervisor_id ? 'border-red-500' : 'border-gray-300'
                      } ${!formData.ward_id ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    >
                      <option value="">
                        {formData.ward_id ? 'Select Supervisor' : 'Select Ward First'}
                      </option>
                      {filteredSupervisors.map((sup) => (
                        <option key={sup.id} value={sup.id}>
                          {sup.full_name} ({sup.employee_id})
                        </option>
                      ))}
                    </select>
                  )}
                  {errors.supervisor_id && (
                    <p className="mt-1 text-sm text-red-600">{errors.supervisor_id}</p>
                  )}
                  {formData.ward_id && filteredSupervisors.length === 0 && (
                    <p className="mt-1 text-sm text-yellow-600">
                      No supervisors available for this ward
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contractor (Optional)
                  </label>
                  <select
                    name="contractor_id"
                    value={formData.contractor_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">None (Direct ULB Worker)</option>
                    {contractors.filter((contractor, index, self) => 
                      index === self.findIndex(c => c.id === contractor.id)
                    ).map((contractor) => (
                      <option key={contractor.id} value={contractor.id}>
                        {contractor.company_name || contractor.full_name} ({contractor.employee_id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 inline mr-2" />
                      Create Worker
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({
                      full_name: '',
                      mobile: '',
                      worker_type: 'ULB',
                      ward_id: '',
                      supervisor_id: '',
                      contractor_id: '',
                      status: 'ACTIVE'
                    });
                    setErrors({});
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerManagement;
