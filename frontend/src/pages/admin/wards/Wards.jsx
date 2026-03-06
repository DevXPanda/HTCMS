import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { wardAPI, userAPI } from '../../../services/api';
import api from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { Plus, Eye, Search, Users, MapPin, Save, X } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useSelectedUlb } from '../../../contexts/SelectedUlbContext';

const Wards = () => {
  const { effectiveUlbId } = useSelectedUlb();
  const { isAdmin } = useAuth();
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [collectors, setCollectors] = useState([]);
  const [loadingCollectors, setLoadingCollectors] = useState(false);
  const [ulbs, setUlbs] = useState([]);
  const [loadingUlbs, setLoadingUlbs] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm();

  useEffect(() => {
    fetchWards();
  }, [search, filterActive, effectiveUlbId]);

  // Listen for ward assignment changes from Staff Management
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'wardAssignmentUpdated') {
        fetchWards();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    const handleCustomEvent = () => fetchWards();
    window.addEventListener('wardAssignmentUpdated', handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('wardAssignmentUpdated', handleCustomEvent);
    };
  }, []);

  const addModalUlbId = watch('ulb_id');

  // When Add modal opens, set default ULB and fetch ULBs
  useEffect(() => {
    if (showAddModal) {
      fetchULBs();
      reset({
        ulb_id: effectiveUlbId || '',
        wardNumber: '',
        wardName: '',
        description: '',
        collectorId: ''
      });
    }
  }, [showAddModal]);

  // When ULB is selected in Add modal, fetch only collectors for that ULB; clear collector when ULB changes
  useEffect(() => {
    if (!showAddModal) return;
    if (addModalUlbId) {
      fetchCollectors(addModalUlbId);
      setValue('collectorId', '');
    } else {
      setCollectors([]);
    }
  }, [showAddModal, addModalUlbId]);

  const fetchWards = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (filterActive !== 'all') params.isActive = filterActive === 'active';
      if (effectiveUlbId) params.ulb_id = effectiveUlbId;

      const response = await wardAPI.getAll(params);
      setWards(response.data.data.wards);
    } catch (error) {
      toast.error('Failed to fetch wards');
    } finally {
      setLoading(false);
    }
  };

  const fetchCollectors = async (ulbId) => {
    try {
      setLoadingCollectors(true);
      const params = ulbId ? { ulb_id: ulbId } : {};
      const response = await userAPI.getCollectors(params);
      setCollectors(response.data.data.collectors || []);
    } catch (error) {
      toast.error('Failed to load collectors');
    } finally {
      setLoadingCollectors(false);
    }
  };

  const fetchULBs = async () => {
    try {
      setLoadingUlbs(true);
      const response = await api.get('/admin-management/ulbs');
      setUlbs(response.data || []);
    } catch (error) {
      toast.error('Failed to load ULBs');
    } finally {
      setLoadingUlbs(false);
    }
  };

  const onAddWardSubmit = async (data) => {
    try {
      setSubmitLoading(true);
      const rawCollectorId = data.collectorId;
      const collectorId = rawCollectorId ? parseInt(rawCollectorId, 10) : null;
      const response = await wardAPI.create({
        wardNumber: data.wardNumber,
        wardName: data.wardName,
        description: data.description || null,
        collectorId: Number.isInteger(collectorId) ? collectorId : null,
        ulb_id: data.ulb_id
      });
      if (response.data.success) {
        toast.success('Ward created successfully!');
        setShowAddModal(false);
        fetchWards();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to create ward');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading && !wards.length) return <Loading />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="ds-page-title">Wards</h1>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Ward
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <form onSubmit={(e) => { e.preventDefault(); fetchWards(); }} className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ward number or name..."
              className="input pl-10"
            />
          </div>
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="input w-auto"
          >
            <option value="all">All Wards</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {wards.length === 0 ? (
          <div className="col-span-full card text-center py-12">
            <p className="text-gray-500">No wards found</p>
          </div>
        ) : (
          wards.map((ward) => (
            <div key={ward.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{ward.wardName}</h3>
                  <p className="text-sm text-gray-500">Ward #{ward.wardNumber}</p>
                </div>
                <span className={`badge ${ward.isActive ? 'badge-success' : 'badge-danger'}`}>
                  {ward.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {ward.ulb && (
                  <div className="flex items-center text-sm">
                    <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="text-gray-600">ULB:</span>
                    <span className="ml-2 font-medium">{ward.ulb.name}</span>
                  </div>
                )}
                <div className="flex items-center text-sm">
                  <Users className="w-4 h-4 mr-2 text-gray-400" />
                  <span className="text-gray-600">Collector:</span>
                  <span className="ml-2 font-medium">
                    {ward.collector
                      ? (ward.collector.full_name ||
                        (ward.collector.firstName && ward.collector.lastName
                          ? `${ward.collector.firstName} ${ward.collector.lastName}`
                          : 'Not Assigned'))
                      : 'Not Assigned'}
                  </span>
                </div>
                {ward.collector && ward.collector.email && (
                  <div className="text-xs text-gray-500 ml-6">
                    {ward.collector.email}
                  </div>
                )}
              </div>

              {ward.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{ward.description}</p>
              )}

              <div className="flex justify-end pt-4 border-t">
                <Link
                  to={`/wards/${ward.id}`}
                  className="text-primary-600 hover:text-primary-700 flex items-center text-sm font-medium"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View Details
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Ward Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowAddModal(false)} aria-hidden="true" />
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-semibold">Add New Ward</h2>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit(onAddWardSubmit)} className="p-6 space-y-4">
                <div>
                  <label className="label">ULB <span className="text-red-500">*</span></label>
                  <select
                    {...register('ulb_id', { required: 'ULB is required' })}
                    className="input w-full"
                    disabled={loadingUlbs}
                  >
                    <option value="">Select ULB</option>
                    {loadingUlbs ? (
                      <option disabled>Loading ULBs...</option>
                    ) : ulbs.length === 0 ? (
                      <option disabled>No ULBs available</option>
                    ) : (
                      ulbs.map(ulb => (
                        <option key={ulb.id} value={ulb.id}>{ulb.name}</option>
                      ))
                    )}
                  </select>
                  {errors.ulb_id && <p className="text-red-500 text-sm mt-1">{errors.ulb_id.message}</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Ward Number <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      {...register('wardNumber', {
                        required: 'Ward number is required',
                        pattern: { value: /^[A-Za-z0-9]+$/, message: 'Letters and numbers only' }
                      })}
                      className="input w-full"
                      placeholder="e.g., W001"
                    />
                    {errors.wardNumber && <p className="text-red-500 text-sm mt-1">{errors.wardNumber.message}</p>}
                  </div>
                  <div>
                    <label className="label">Ward Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      {...register('wardName', { required: 'Ward name is required' })}
                      className="input w-full"
                      placeholder="e.g., Central Ward"
                    />
                    {errors.wardName && <p className="text-red-500 text-sm mt-1">{errors.wardName.message}</p>}
                  </div>
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea
                    {...register('description')}
                    className="input w-full"
                    rows="2"
                    placeholder="Optional description..."
                  />
                </div>
                <div>
                  <label className="label">Assign Collector (Optional)</label>
                  <select
                    {...register('collectorId')}
                    className="input w-full"
                    disabled={loadingCollectors || !addModalUlbId}
                  >
                    <option value="">No Collector Assigned</option>
                    {!addModalUlbId ? (
                      <option disabled>Select ULB first</option>
                    ) : loadingCollectors ? (
                      <option disabled>Loading...</option>
                    ) : collectors.length === 0 ? (
                      <option disabled>No collectors for this ULB</option>
                    ) : (
                      collectors.map(collector => (
                        <option key={collector.id} value={collector.id}>
                          {collector.firstName} {collector.lastName}
                        </option>
                      ))
                    )}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {addModalUlbId ? 'Collectors for selected ULB only. You can assign later from ward details.' : 'Select ULB to see collectors.'}
                  </p>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="btn btn-primary flex items-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {submitLoading ? 'Creating...' : 'Create Ward'}
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

export default Wards;
