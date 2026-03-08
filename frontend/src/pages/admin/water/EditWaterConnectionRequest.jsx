import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { waterConnectionRequestAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';

const EditWaterConnectionRequest = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    propertyLocation: '',
    connectionType: 'domestic',
    remarks: ''
  });

  useEffect(() => {
    fetchRequest();
  }, [id]);

  const fetchRequest = async () => {
    try {
      const response = await waterConnectionRequestAPI.getById(id);
      const r = response.data.data.request;
      setRequest(r);
      setFormData({
        propertyLocation: r.propertyLocation || '',
        connectionType: r.connectionType || 'domestic',
        remarks: r.remarks || ''
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load request');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await waterConnectionRequestAPI.update(id, {
        propertyLocation: formData.propertyLocation,
        connectionType: formData.connectionType,
        remarks: formData.remarks || undefined
      });
      toast.success('Request updated');
      navigate('/water/connection-requests');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update request');
    } finally {
      setLoading(false);
    }
  };

  if (!request) return <Loading />;
  if (!['DRAFT', 'RETURNED'].includes(request.status)) {
    return (
      <div className="card p-6">
        <p className="text-gray-600">Only Draft or Returned requests can be edited.</p>
        <Link to="/water/connection-requests" className="text-primary-600 hover:underline mt-2 inline-block">
          ← Back to Connection Requests
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/water/connection-requests" className="text-primary-600 hover:underline text-sm mb-4 inline-block">
        ← Back to Connection Requests
      </Link>
      <h1 className="ds-page-title mb-2">Edit Water Connection Request</h1>
      <p className="text-gray-600 mb-6">{request.requestNumber}</p>

      <form onSubmit={handleSubmit} className="card max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="label">Property</label>
            <p className="text-gray-900">
              {request.property?.propertyNumber} - {request.property?.address}
            </p>
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
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </button>
          <Link to="/water/connection-requests" className="btn btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
};

export default EditWaterConnectionRequest;
