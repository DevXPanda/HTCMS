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
    formState: { errors }
  } = useForm();

  useEffect(() => {
    fetchCollectors();
    fetchULBs();
  }, []);

  const fetchCollectors = async () => {
    try {
      setLoadingCollectors(true);
      const response = await userAPI.getCollectors();
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="ds-page-title">Add New Ward</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6 max-w-2xl">
        <div>
          <label className="label">
            ULB <span className="text-red-500">*</span>
          </label>
          <select
            {...register('ulb_id', { required: 'ULB is required' })}
            className="input"
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">
              Ward Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('wardNumber', { 
                required: 'Ward number is required',
                pattern: {
                  value: /^[A-Z0-9]+$/,
                  message: 'Ward number should contain only letters and numbers'
                }
              })}
              className="input"
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
              className="input"
              placeholder="e.g., Central Ward"
            />
            {errors.wardName && (
              <p className="text-red-500 text-sm mt-1">{errors.wardName.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            {...register('description')}
            className="input"
            rows="3"
            placeholder="Optional description of the ward..."
          />
        </div>

        <div>
          <label className="label">Assign Collector (Optional)</label>
          <select
            {...register('collectorId')}
            className="input"
            disabled={loadingCollectors}
          >
            <option value="">No Collector Assigned</option>
            {loadingCollectors ? (
              <option disabled>Loading collectors...</option>
            ) : collectors.length === 0 ? (
              <option disabled>No collectors available</option>
            ) : (
              collectors.map(collector => (
                <option key={collector.id} value={collector.id}>
                  {collector.firstName} {collector.lastName}
                </option>
              ))
            )}
          </select>
          <p className="text-sm text-gray-500 mt-1">
            You can assign a collector later from the ward details page
          </p>
        </div>

        <div className="flex justify-end space-x-4 pt-4 border-t">
          <Link to="/wards" className="btn btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary flex items-center"
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
