import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { citizenAPI, propertyAPI } from '../../services/api';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import { ArrowLeft, MapPin } from 'lucide-react';

const WaterConnectionRequest = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [formData, setFormData] = useState({
    propertyId: '',
    propertyLocation: '',
    connectionType: 'domestic',
    remarks: ''
  });

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await citizenAPI.getProperties();
      setProperties(response.data.data.properties || []);
    } catch (error) {
      toast.error('Failed to fetch properties');
    } finally {
      setLoadingProperties(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Auto-fill property location if property is selected
    if (name === 'propertyId' && value) {
      const selectedProperty = properties.find(p => p.id === parseInt(value));
      if (selectedProperty) {
        setFormData(prev => ({
          ...prev,
          propertyId: value,
          propertyLocation: selectedProperty.address || ''
        }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.propertyId || !formData.propertyLocation || !formData.connectionType) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await citizenAPI.createWaterConnectionRequest(formData);
      toast.success('Water connection request submitted successfully!');
      navigate('/citizen/water-connections?tab=requests');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  if (loadingProperties) return <Loading />;

  return (
    <div>
      <button
        onClick={() => navigate('/citizen/water-connections')}
        className="flex items-center text-primary-600 mb-4 hover:text-primary-700"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Water Connections
      </button>

      <div className="mb-6">
        <h1 className="ds-page-title">Request Water Connection</h1>
        <p className="text-gray-600 mt-2">Submit a request for a new water connection</p>
      </div>

      <div className="card max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="propertyId" className="label">
              Select Property <span className="text-red-500">*</span>
            </label>
            <select
              id="propertyId"
              name="propertyId"
              value={formData.propertyId}
              onChange={handleChange}
              required
              className="input"
            >
              <option value="">Select a property</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.propertyNumber} - {property.address}
                </option>
              ))}
            </select>
            {properties.length === 0 && (
              <p className="text-sm text-gray-500 mt-1">
                No properties found. Please add a property first.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="propertyLocation" className="label">
              Property Location/Address <span className="text-red-500">*</span>
            </label>
            <textarea
              id="propertyLocation"
              name="propertyLocation"
              value={formData.propertyLocation}
              onChange={handleChange}
              required
              rows={4}
              className="input"
              placeholder="Enter detailed property location and address for water connection"
            />
            <p className="text-sm text-gray-500 mt-1">
              Provide detailed location information to help with connection installation
            </p>
          </div>

          <div>
            <label htmlFor="connectionType" className="label">
              Connection Type <span className="text-red-500">*</span>
            </label>
            <select
              id="connectionType"
              name="connectionType"
              value={formData.connectionType}
              onChange={handleChange}
              required
              className="input"
            >
              <option value="domestic">Domestic</option>
              <option value="commercial">Commercial</option>
              <option value="industrial">Industrial</option>
            </select>
          </div>

          <div>
            <label htmlFor="remarks" className="label">
              Additional Remarks (Optional)
            </label>
            <textarea
              id="remarks"
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              rows={3}
              className="input"
              placeholder="Any additional information or special requirements"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading || properties.length === 0}
              className="btn btn-primary bg-primary-600 hover:bg-primary-700"
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/citizen/water-connections')}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WaterConnectionRequest;
