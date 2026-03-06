import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { wardAPI, userAPI } from '../../../services/api';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';

const AddWard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [collectors, setCollectors] = useState([]);
  const [loadingCollectors, setLoadingCollectors] = useState(true);
  const [ulbs, setUlbs] = useState([]);
  const [loadingUlbs, setLoadingUlbs] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch
  } = useForm();

  const selectedUlbId = watch('ulb_id');

  useEffect(() => {
    fetchULBs();
  }, []);

  useEffect(() => {
    if (selectedUlbId) {
      fetchCollectors(selectedUlbId);
    } else {
      setCollectors([]);
    }
  }, [selectedUlbId]);

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

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      const response = await wardAPI.create({
        wardNumber: data.wardNumber,
        wardName: data.wardName,
        description: data.description || null,
        collectorId: data.collectorId ? parseInt(data.collectorId) : null,
        ulb_id: data.ulb_id
      });

      if (response.data.success) {
        toast.success('Ward created successfully!');
        navigate('/wards');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to create ward');
    } finally {
      setLoading(false);
    }
  };

  if (loadingCollectors || loadingUlbs) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="ds-page-title">Add New Ward</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 md:p-8 w-full max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="label">
              ULB <span className="text-red-500">*</span>
            </label>
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
                  <option key={ulb.id} value={ulb.id}>
                    {ulb.name}
                  </option>
                ))
              )}
            </select>
            {errors.ulb_id && (
              <p className="text-red-500 text-sm mt-1">{errors.ulb_id.message}</p>
            )}
          </div>

          <div>
            <label className="label">
              Ward Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('wardNumber', {
                required: 'Ward number is required',
                pattern: {
                  value: /^[A-Za-z0-9]+$/,
                  message: 'Ward number should contain only letters and numbers'
                }
              })}
              className="input w-full"
              placeholder="e.g., W001"
            />
            {errors.wardNumber && (
              <p className="text-red-500 text-sm mt-1">{errors.wardNumber.message}</p>
            )}
          </div>

          <div>
            <label className="label">
              Ward Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('wardName', { required: 'Ward name is required' })}
              className="input w-full"
              placeholder="e.g., Central Ward"
            />
            {errors.wardName && (
              <p className="text-red-500 text-sm mt-1">{errors.wardName.message}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="label">Description</label>
            <textarea
              {...register('description')}
              className="input w-full"
              rows="3"
              placeholder="Optional description of the ward..."
            />
          </div>

          <div className="md:col-span-2">
            <label className="label">Assign Collector (Optional)</label>
            <select
              {...register('collectorId')}
              className="input w-full"
              disabled={loadingCollectors || !selectedUlbId}
            >
              <option value="">No Collector Assigned</option>
              {!selectedUlbId ? (
                <option disabled>Select ULB first</option>
              ) : loadingCollectors ? (
                <option disabled>Loading collectors...</option>
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
            <p className="text-sm text-gray-500 mt-1">
              {selectedUlbId ? 'Collectors for selected ULB only. You can assign later from ward details.' : 'Select ULB to see collectors.'}
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 pt-6 mt-6 border-t">
          <Link to="/wards" className="btn btn-secondary order-2 sm:order-1">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary flex items-center justify-center order-1 sm:order-2"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Creating...' : 'Create Ward'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddWard;
