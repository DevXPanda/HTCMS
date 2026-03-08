import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { Plus, Building2, MapPin, Save, X, Pencil } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useSelectedUlb } from '../../../contexts/SelectedUlbContext';

const ULBManagement = () => {
  const { isAdmin } = useAuth();
  const { isSuperAdmin } = useSelectedUlb();

  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  const [ulbs, setUlbs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUlb, setEditingUlb] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm();

  useEffect(() => {
    fetchUlbs();
  }, []);

  const fetchUlbs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin-management/ulbs', { params: { includeInactive: 'true' } });
      setUlbs(Array.isArray(response.data) ? response.data : response.data?.data || []);
    } catch (error) {
      toast.error('Failed to load ULBs');
      setUlbs([]);
    } finally {
      setLoading(false);
    }
  };

  const onAddSubmit = async (data) => {
    try {
      setSubmitLoading(true);
      await api.post('/admin-management/ulbs', {
        name: data.name.trim(),
        state: data.state?.trim() || null,
        district: data.district?.trim() || null,
        status: data.status || 'ACTIVE'
      });
      toast.success('ULB created successfully');
      setShowAddModal(false);
      reset();
      fetchUlbs();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create ULB');
    } finally {
      setSubmitLoading(false);
    }
  };

  const openEdit = (ulb) => {
    setEditingUlb(ulb);
    setValue('name', ulb.name);
    setValue('state', ulb.state || '');
    setValue('district', ulb.district || '');
    setValue('status', ulb.status || 'ACTIVE');
    setShowEditModal(true);
  };

  const onEditSubmit = async (data) => {
    if (!editingUlb) return;
    try {
      setSubmitLoading(true);
      await api.put(`/admin-management/ulbs/${editingUlb.id}`, {
        name: data.name.trim(),
        state: data.state?.trim() || null,
        district: data.district?.trim() || null,
        status: data.status || 'ACTIVE'
      });
      toast.success('ULB updated successfully');
      setShowEditModal(false);
      setEditingUlb(null);
      reset();
      fetchUlbs();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update ULB');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading && !ulbs.length) return <Loading />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="ds-page-title">ULB Management</h1>
        {isAdmin && (
          <button
            type="button"
            onClick={() => { setShowAddModal(true); reset(); }}
            className="btn btn-primary flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add ULB
          </button>
        )}
      </div>

      <p className="text-gray-600 mb-6">
        Create and manage Urban Local Bodies. Assign staff to ULBs from Staff Management.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ulbs.length === 0 ? (
          <div className="col-span-full card text-center py-12">
            <Building2 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No ULBs found. Add one to get started.</p>
          </div>
        ) : (
          ulbs.map((ulb) => (
            <div key={ulb.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary-600" />
                  <h3 className="text-lg font-semibold text-gray-900">{ulb.name}</h3>
                </div>
                <span className={`badge ${ulb.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                  {ulb.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="space-y-2 mb-4">
                {ulb.state && (
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
                    <span>State: {ulb.state}</span>
                  </div>
                )}
                {ulb.district && (
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
                    <span>District: {ulb.district}</span>
                  </div>
                )}
                {!ulb.state && !ulb.district && (
                  <p className="text-sm text-gray-500">No location set</p>
                )}
              </div>
              {isAdmin && (
                <div className="flex justify-end pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => openEdit(ulb)}
                    className="text-primary-600 hover:text-primary-700 flex items-center text-sm font-medium"
                  >
                    <Pencil className="w-4 h-4 mr-1" />
                    Edit
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add ULB Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowAddModal(false)} aria-hidden="true" />
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-semibold">Add New ULB</h2>
                <button type="button" onClick={() => setShowAddModal(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" aria-label="Close">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit(onAddSubmit)} className="p-6 space-y-4">
                <div>
                  <label className="label">Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    {...register('name', { required: 'Name is required' })}
                    className="input w-full"
                    placeholder="e.g., Municipal Corporation"
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">State</label>
                    <input type="text" {...register('state')} className="input w-full" placeholder="Optional" />
                  </div>
                  <div>
                    <label className="label">District</label>
                    <input type="text" {...register('district')} className="input w-full" placeholder="Optional" />
                  </div>
                </div>
                <div>
                  <label className="label">Status</label>
                  <select {...register('status')} className="input w-full">
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">Cancel</button>
                  <button type="submit" disabled={submitLoading} className="btn btn-primary flex items-center">
                    <Save className="w-4 h-4 mr-2" />
                    {submitLoading ? 'Creating...' : 'Create ULB'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit ULB Modal */}
      {showEditModal && editingUlb && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => { setShowEditModal(false); setEditingUlb(null); }} aria-hidden="true" />
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-semibold">Edit ULB</h2>
                <button type="button" onClick={() => { setShowEditModal(false); setEditingUlb(null); }} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" aria-label="Close">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit(onEditSubmit)} className="p-6 space-y-4">
                <div>
                  <label className="label">Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    {...register('name', { required: 'Name is required' })}
                    className="input w-full"
                  />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">State</label>
                    <input type="text" {...register('state')} className="input w-full" />
                  </div>
                  <div>
                    <label className="label">District</label>
                    <input type="text" {...register('district')} className="input w-full" />
                  </div>
                </div>
                <div>
                  <label className="label">Status</label>
                  <select {...register('status')} className="input w-full">
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button type="button" onClick={() => { setShowEditModal(false); setEditingUlb(null); }} className="btn btn-secondary">Cancel</button>
                  <button type="submit" disabled={submitLoading} className="btn btn-primary flex items-center">
                    <Save className="w-4 h-4 mr-2" />
                    {submitLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ULBManagement;
