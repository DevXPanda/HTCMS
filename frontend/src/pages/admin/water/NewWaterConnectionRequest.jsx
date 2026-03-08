import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { waterConnectionRequestAPI, propertyAPI } from '../../../services/api';
import { useSelectedUlb } from '../../../contexts/SelectedUlbContext';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';

const NewWaterConnectionRequest = () => {
  const navigate = useNavigate();
  const { effectiveUlbId } = useSelectedUlb();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingProps, setLoadingProps] = useState(true);
  const [formData, setFormData] = useState({
    propertyId: '',
    propertyLocation: '',
    connectionType: 'domestic',
    remarks: ''
  });

  useEffect(() => {
    fetchProperties();
  }, [effectiveUlbId]);

  const fetchProperties = async () => {
    try {
      setLoadingProps(true);
      const params = { limit: 500, ...(effectiveUlbId ? { ulb_id: effectiveUlbId } : {}) };
      const response = await propertyAPI.getAll(params);
      const list = response.data.data?.properties || response.data.data || [];
      setProperties(Array.isArray(list) ? list : []);
    } catch (error) {
      toast.error('Failed to fetch properties');
      setProperties([]);
    } finally {
      setLoadingProps(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'propertyId' && value) {
      const prop = properties.find((p) => p.id === parseInt(value, 10));
      if (prop && prop.address) {
        setFormData((prev) => ({ ...prev, propertyLocation: prop.address }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.propertyId || !formData.propertyLocation || !formData.connectionType) {
      toast.error('Please fill Property, Property Location, and Connection Type');
      return;
    }
    setLoading(true);
    try {
      await waterConnectionRequestAPI.create({
        propertyId: parseInt(formData.propertyId, 10),
        propertyLocation: formData.propertyLocation,
        connectionType: formData.connectionType,
        remarks: formData.remarks || undefined
      });
      toast.success('Water connection request created');
      navigate('/water/connection-requests');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  if (loadingProps) return <Loading />;

  return (
    <div>
      <Link to="/water/connection-requests" className="text-primary-600 hover:underline text-sm mb-4 inline-block">
        ← Back to Connection Requests
      </Link>
      <h1 className="ds-page-title mb-2">New Water Connection Request</h1>
      <p className="text-gray-600 mb-6">Create a new water connection request (saved as Draft).</p>

      <form onSubmit={handleSubmit} className="card max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="label">Property <span className="text-red-500">*</span></label>
            <select
              name="propertyId"
              value={formData.propertyId}
              onChange={handleChange}
              className="input"
              required
            >
              <option value="">Select property</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.propertyNumber || p.id} - {p.address || 'N/A'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Property Location <span className="text-red-500">*</span></label>
            <textarea
              name="propertyLocation"
              value={formData.propertyLocation}
              onChange={handleChange}
              className="input"
              rows={3}
              required
              placeholder="Detailed location/address for connection"
            />
          </div>
          <div>
            <label className="label">Connection Type <span className="text-red-500">*</span></label>
            <select
              name="connectionType"
              value={formData.connectionType}
              onChange={handleChange}
              className="input"
              required
            >
              <option value="domestic">Domestic</option>
              <option value="commercial">Commercial</option>
              <option value="industrial">Industrial</option>
            </select>
          </div>
          <div>
            <label className="label">Remarks</label>
            <textarea
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              className="input"
              rows={2}
              placeholder="Optional"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Request'}
          </button>
          <Link to="/water/connection-requests" className="btn btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
};

export default NewWaterConnectionRequest;
