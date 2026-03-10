import React, { useState, useEffect } from 'react';
import { Users, Plus, X, RefreshCw, Eye, Pencil } from 'lucide-react';
import { useStaffAuth } from '../../contexts/StaffAuthContext';
import { workerAPI, wardAPI } from '../../services/api';
import api from '../../services/api';
import toast from 'react-hot-toast';

// Worker types (must match backend WORKER_TYPES)
const WORKER_TYPE_OPTIONS = [
  { value: 'ULB', label: 'ULB' },
  { value: 'CONTRACTUAL', label: 'Contractual' },
  { value: 'SWEEPING', label: 'Sweeping' },
  { value: 'TOILET', label: 'Toilet' },
  { value: 'MRF', label: 'MRF' },
  { value: 'CLEANING', label: 'Cleaning' },
  { value: 'DRAINAGE', label: 'Drainage' },
  { value: 'SOLID_WASTE', label: 'Solid Waste' },
  { value: 'ROAD_MAINTENANCE', label: 'Road Maintenance' },
  { value: 'OTHER', label: 'Other' }
];

const SupervisorWorkerManagement = () => {
  const { user } = useStaffAuth();
  const [workers, setWorkers] = useState([]);
  const [loadingWorkers, setLoadingWorkers] = useState(true);
  const [wards, setWards] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    mobile: '',
    worker_type: 'ULB',
    ward_id: '',
    supervisor_id: '',
    contractor_id: '',
    status: 'ACTIVE'
  });

  const fetchWorkers = async () => {
    try {
      setLoadingWorkers(true);
      const res = await workerAPI.getAllWorkers();
      setWorkers(res?.data?.data?.workers || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load workers');
      setWorkers([]);
    } finally {
      setLoadingWorkers(false);
    }
  };

  const fetchWards = async () => {
    if (!user?.ulb_id) return;
    try {
      const res = await wardAPI.getAll({ ulb_id: user.ulb_id });
      setWards(res?.data?.data?.wards || res?.data?.wards || []);
    } catch (err) {
      toast.error('Failed to load wards');
    }
  };

  const fetchSupervisors = async () => {
    try {
      const res = await api.get('/admin-management/employees/by-ulb?role=SUPERVISOR');
      let list = res?.data?.employees || [];
      if (user?.ulb_id) list = list.filter((s) => s.ulb_id === user.ulb_id);
      setSupervisors(list);
    } catch (err) {
      setSupervisors([]);
    }
  };

  const fetchContractors = async () => {
    try {
      const res = await api.get('/admin-management/employees/by-ulb?role=CONTRACTOR');
      let list = res?.data?.employees || [];
      if (user?.ulb_id) list = list.filter((c) => c.ulb_id === user.ulb_id);
      setContractors(list);
    } catch (err) {
      setContractors([]);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchWorkers();
      fetchWards();
      fetchSupervisors();
      fetchContractors();
    }
  }, [user?.id, user?.ulb_id]);

  const openCreate = () => {
    const supervisorWardId = user?.ward_id ? String(user.ward_id) : '';
    setFormData({
      full_name: '',
      mobile: '',
      worker_type: 'ULB',
      ward_id: supervisorWardId,
      supervisor_id: String(user?.id || ''),
      contractor_id: '',
      status: 'ACTIVE'
    });
    setShowCreateModal(true);
  };

  const supervisorHasAssignedWard = !!(user?.ward_id);

  const openEdit = (worker) => {
    setSelectedWorker(worker);
    setFormData({
      full_name: worker.full_name || '',
      mobile: worker.mobile || '',
      worker_type: worker.worker_type || 'ULB',
      ward_id: worker.ward_id || '',
      supervisor_id: worker.supervisor_id != null ? String(worker.supervisor_id) : '',
      contractor_id: worker.contractor_id != null ? String(worker.contractor_id) : '',
      status: worker.status || 'ACTIVE'
    });
    setShowEditModal(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.full_name?.trim() || !formData.mobile?.trim() || !formData.ward_id) {
      toast.error('Name, mobile and ward are required');
      return;
    }
    // Supervisor creating worker: always assign to self
    const supervisorId = user?.id ? parseInt(user.id, 10) : parseInt(formData.supervisor_id, 10);
    if (!supervisorId) {
      toast.error('Unable to assign supervisor. Please try again.');
      return;
    }
    try {
      setLoading(true);
      const payload = {
        full_name: formData.full_name.trim(),
        mobile: formData.mobile.trim(),
        worker_type: (formData.worker_type || 'ULB').toUpperCase().replace(/\s/g, '_'),
        ward_id: parseInt(formData.ward_id),
        supervisor_id: supervisorId,
        status: (formData.status || 'ACTIVE').toUpperCase()
      };
      if (formData.contractor_id) payload.contractor_id = parseInt(formData.contractor_id);
      const res = await workerAPI.createWorker(payload);
      toast.success(`Worker created. Code: ${res.data?.worker?.employee_code || '—'}`);
      setShowCreateModal(false);
      fetchWorkers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create worker');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedWorker?.id) return;
    try {
      setLoading(true);
      const payload = {};
      if (formData.full_name !== undefined) payload.full_name = formData.full_name.trim();
      if (formData.mobile !== undefined) payload.mobile = formData.mobile.trim();
      if (formData.worker_type !== undefined) payload.worker_type = formData.worker_type.toUpperCase().replace(/\s/g, '_');
      if (formData.ward_id !== undefined) payload.ward_id = parseInt(formData.ward_id);
      if (formData.supervisor_id !== undefined) payload.supervisor_id = parseInt(formData.supervisor_id) || null;
      if (formData.contractor_id !== undefined) payload.contractor_id = formData.contractor_id ? parseInt(formData.contractor_id) : null;
      if (formData.status !== undefined) payload.status = formData.status.toUpperCase();
      await workerAPI.updateWorker(selectedWorker.id, payload);
      toast.success('Worker updated');
      setShowEditModal(false);
      setSelectedWorker(null);
      fetchWorkers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update worker');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="ds-page-header">
        <div>
          <h1 className="ds-page-title">Worker Management</h1>
          <p className="ds-page-subtitle">Create and update workers in your ULB (filtered by assigned modules)</p>
        </div>
        <button type="button" onClick={openCreate} className="btn btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Worker
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="ds-section-title mb-0">Workers Assigned to You</h2>
          <button type="button" onClick={fetchWorkers} className="btn btn-secondary text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
        {loadingWorkers ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
          </div>
        ) : workers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p>No workers assigned to you. Create a worker to get started.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Type</th>
                  <th>Ward</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {workers.map((w) => (
                  <tr key={w.id}>
                    <td className="font-medium">{w.employee_code}</td>
                    <td>{w.full_name}</td>
                    <td>{w.mobile}</td>
                    <td>
                      <span className={`badge ${w.worker_type === 'ULB' ? 'badge-info' : 'badge-warning'}`}>{w.worker_type}</span>
                    </td>
                    <td>{w.ward ? `${w.ward.wardNumber} - ${w.ward.wardName}` : '—'}</td>
                    <td>
                      <span className={`badge ${w.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>{w.status}</span>
                    </td>
                    <td>
                      <button type="button" onClick={() => { setSelectedWorker(w); setShowDetailsModal(true); }} className="text-primary-600 hover:text-primary-800 text-sm font-medium">
                        <Eye className="w-4 h-4 inline mr-1" /> View
                      </button>
                      <button type="button" onClick={() => openEdit(w)} className="ml-3 text-primary-600 hover:text-primary-800 text-sm font-medium">
                        <Pencil className="w-4 h-4 inline mr-1" /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Worker</h3>
              <button type="button" onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="modal-body space-y-4">
              <div>
                <label className="label">Full Name *</label>
                <input type="text" className="input" value={formData.full_name} onChange={(e) => setFormData((p) => ({ ...p, full_name: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Mobile *</label>
                <input type="text" className="input" value={formData.mobile} onChange={(e) => setFormData((p) => ({ ...p, mobile: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Worker Type *</label>
                <select className="input" value={formData.worker_type} onChange={(e) => setFormData((p) => ({ ...p, worker_type: e.target.value }))} required>
                  {WORKER_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              {!supervisorHasAssignedWard && (
                <div>
                  <label className="label">Ward *</label>
                  <select className="input" value={formData.ward_id} onChange={(e) => setFormData((p) => ({ ...p, ward_id: e.target.value }))} required>
                    <option value="">Select ward</option>
                    {wards.map((ward) => (
                      <option key={ward.id} value={ward.id}>{ward.wardNumber} - {ward.wardName}</option>
                    ))}
                  </select>
                </div>
              )}
              {/* <div>
                <label className="label">Contractor (optional)</label>
                <select className="input" value={formData.contractor_id} onChange={(e) => setFormData((p) => ({ ...p, contractor_id: e.target.value }))}>
                  <option value="">None</option>
                  {contractors.map((c) => (
                    <option key={c.id} value={c.id}>{c.full_name} {c.company_name ? `(${c.company_name})` : ''}</option>
                  ))}
                </select>
              </div> */}
              <div className="modal-footer flex gap-2 justify-end pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={loading} className="btn btn-primary">{loading ? 'Creating...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedWorker && (
        <div className="modal-overlay" onClick={() => { setShowEditModal(false); setSelectedWorker(null); }}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Worker</h3>
              <button type="button" onClick={() => { setShowEditModal(false); setSelectedWorker(null); }} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleUpdate} className="modal-body space-y-4">
              <div>
                <label className="label">Full Name *</label>
                <input type="text" className="input" value={formData.full_name} onChange={(e) => setFormData((p) => ({ ...p, full_name: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Mobile *</label>
                <input type="text" className="input" value={formData.mobile} onChange={(e) => setFormData((p) => ({ ...p, mobile: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Worker Type *</label>
                <select className="input" value={formData.worker_type} onChange={(e) => setFormData((p) => ({ ...p, worker_type: e.target.value }))} required>
                  {WORKER_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Ward *</label>
                <select className="input" value={formData.ward_id} onChange={(e) => setFormData((p) => ({ ...p, ward_id: e.target.value }))} required>
                  {wards.map((ward) => (
                    <option key={ward.id} value={ward.id}>{ward.wardNumber} - {ward.wardName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Supervisor *</label>
                <select className="input" value={formData.supervisor_id} onChange={(e) => setFormData((p) => ({ ...p, supervisor_id: e.target.value }))} required>
                  {supervisors.map((s) => (
                    <option key={s.id} value={s.id}>{s.full_name} ({s.employee_id})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Contractor (optional)</label>
                <select className="input" value={formData.contractor_id} onChange={(e) => setFormData((p) => ({ ...p, contractor_id: e.target.value }))}>
                  <option value="">None</option>
                  {contractors.map((c) => (
                    <option key={c.id} value={c.id}>{c.full_name} {c.company_name ? `(${c.company_name})` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={formData.status} onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
              <div className="modal-footer flex gap-2 justify-end pt-4">
                <button type="button" onClick={() => { setShowEditModal(false); setSelectedWorker(null); }} className="btn btn-secondary">Cancel</button>
                <button type="submit" disabled={loading} className="btn btn-primary">{loading ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {showDetailsModal && selectedWorker && (
        <div className="modal-overlay" onClick={() => { setShowDetailsModal(false); setSelectedWorker(null); }}>
          <div className="modal-panel max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Worker Details</h3>
              <button type="button" onClick={() => { setShowDetailsModal(false); setSelectedWorker(null); }} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="modal-body space-y-3">
              <p><span className="font-medium text-gray-600">Code:</span> {selectedWorker.employee_code}</p>
              <p><span className="font-medium text-gray-600">Name:</span> {selectedWorker.full_name}</p>
              <p><span className="font-medium text-gray-600">Mobile:</span> {selectedWorker.mobile}</p>
              <p><span className="font-medium text-gray-600">Type:</span> {selectedWorker.worker_type}</p>
              <p><span className="font-medium text-gray-600">Ward:</span> {selectedWorker.ward ? `${selectedWorker.ward.wardNumber} - ${selectedWorker.ward.wardName}` : '—'}</p>
              <p><span className="font-medium text-gray-600">Supervisor:</span> {selectedWorker.supervisor ? `${selectedWorker.supervisor.full_name} (${selectedWorker.supervisor.employee_id})` : '—'}</p>
              <p><span className="font-medium text-gray-600">Status:</span> {selectedWorker.status}</p>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => { setShowDetailsModal(false); setSelectedWorker(null); }} className="btn btn-secondary">Close</button>
              <button type="button" onClick={() => { setShowDetailsModal(false); openEdit(selectedWorker); }} className="btn btn-primary">Edit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupervisorWorkerManagement;
