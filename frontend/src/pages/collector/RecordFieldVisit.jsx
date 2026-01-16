import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fieldVisitAPI, uploadAPI } from '../../services/api';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import { ArrowLeft, MapPin, User, DollarSign, Calendar, FileText, AlertCircle, CheckCircle, Upload, X, Image as ImageIcon } from 'lucide-react';

const RecordFieldVisit = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { taskId, demandId, propertyId, ownerId } = location.state || {};

  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState(null);
  const [demand, setDemand] = useState(null);
  const [property, setProperty] = useState(null);
  const [owner, setOwner] = useState(null);
  const [followUp, setFollowUp] = useState(null);
  const [formData, setFormData] = useState({
    visitType: '',
    citizenResponse: '',
    expectedPaymentDate: '',
    remarks: '',
    latitude: null,
    longitude: null,
    address: '',
    proofPhotoUrl: '',
    proofNote: ''
  });
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [errors, setErrors] = useState({});
  const [locationError, setLocationError] = useState(null);

  useEffect(() => {
    if (taskId) {
      fetchContext();
      getCurrentLocation();
    } else if (demandId) {
      // Fallback: if taskId not provided, use old method (for backward compatibility)
      toast.error('Task ID required. Redirecting...');
      navigate('/collector/tasks');
    } else {
      toast.error('Invalid task. Redirecting...');
      navigate('/collector/tasks');
    }
  }, [taskId]);

  const fetchContext = async () => {
    try {
      setLoading(true);
      
      // Fetch context data using new endpoint (collector-accessible)
      const response = await fieldVisitAPI.getContext(taskId);
      const contextData = response.data.data.context;
      
      setContext(contextData);
      
      // Set data in expected format for backward compatibility
      setDemand({
        id: contextData.demand.id,
        demandNumber: contextData.demand.demandNumber,
        balanceAmount: contextData.demand.balanceAmount,
        overdueDays: contextData.demand.overdueDays,
        dueDate: contextData.demand.dueDate,
        status: contextData.demand.status
      });
      
      setProperty({
        id: contextData.property.id,
        propertyNumber: contextData.property.propertyNumber,
        address: contextData.property.address
      });
      
      // Parse citizen name (format: "FirstName LastName")
      const nameParts = contextData.citizen.name.split(' ');
      setOwner({
        firstName: nameParts[0] || 'Unknown',
        lastName: nameParts.slice(1).join(' ') || '',
        phone: contextData.citizen.phone
      });
      
      if (contextData.followUp) {
        setFollowUp(contextData.followUp);
        const visitCount = contextData.followUp.visitCount || 0;
        const nextSequence = visitCount + 1;
        
        // Set default visit type based on sequence
        if (nextSequence === 1) {
          setFormData(prev => ({ ...prev, visitType: 'reminder' }));
        } else if (nextSequence === 2) {
          setFormData(prev => ({ ...prev, visitType: 'payment_collection' }));
        } else if (nextSequence === 3) {
          setFormData(prev => ({ ...prev, visitType: 'warning' }));
        } else {
          setFormData(prev => ({ ...prev, visitType: 'final_warning' }));
        }
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch task context';
      toast.error(errorMessage);
      console.error('Failed to fetch context:', error);
      navigate('/collector/tasks');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setFormData(prev => ({
            ...prev,
            latitude,
            longitude
          }));

          // Try to reverse geocode (simplified - in production, use a geocoding service)
          try {
            // This is a placeholder - in production, use a proper geocoding API
            setFormData(prev => ({
              ...prev,
              address: `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`
            }));
          } catch (error) {
            console.error('Geocoding error:', error);
          }
        },
        (error) => {
          setLocationError('Location access denied or unavailable');
          console.error('Geolocation error:', error);
        }
      );
    } else {
      setLocationError('Geolocation not supported by your browser');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }

    // If citizen response changes, handle expected payment date
    if (name === 'citizenResponse') {
      if (value === 'will_pay_later') {
        // Set default to 7 days from now
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 7);
        setFormData(prev => ({
          ...prev,
          expectedPaymentDate: defaultDate.toISOString().split('T')[0]
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          expectedPaymentDate: ''
        }));
      }
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.visitType) {
      newErrors.visitType = 'Visit type is required';
    }
    if (!formData.citizenResponse) {
      newErrors.citizenResponse = 'Citizen response is required';
    }
    if (!formData.remarks || formData.remarks.trim().length < 10) {
      newErrors.remarks = 'Remarks are required (minimum 10 characters)';
    }
    if (formData.citizenResponse === 'will_pay_later' && !formData.expectedPaymentDate) {
      newErrors.expectedPaymentDate = 'Expected payment date is required when citizen promises to pay later';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Please fill all required fields correctly');
      return;
    }

    try {
      setLoading(true);
      
      // Use context data if available, otherwise fallback to state
      const finalDemandId = context?.demand?.id || demandId;
      const finalPropertyId = context?.property?.id || propertyId;
      
      const visitData = {
        demandId: finalDemandId,
        propertyId: finalPropertyId,
        visitType: formData.visitType,
        citizenResponse: formData.citizenResponse,
        expectedPaymentDate: formData.citizenResponse === 'will_pay_later' ? formData.expectedPaymentDate : null,
        remarks: formData.remarks,
        latitude: formData.latitude,
        longitude: formData.longitude,
        address: formData.address,
        proofPhotoUrl: uploadedPhotoUrl || formData.proofPhotoUrl || null,
        proofNote: formData.proofNote || null
      };
      const response = await fieldVisitAPI.create(visitData);
      
      toast.success('Field visit recorded successfully!');
      
      // If notice was triggered, show notification
      if (response.data.data.noticeTriggered) {
        toast.success(`Enforcement notice triggered after ${followUp?.visitCount + 1 || 1} visits`, {
          duration: 5000
        });
      }

      // Navigate back to tasks
      navigate('/collector/tasks');
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to record field visit';
      toast.error(errorMessage);
      
      // If it's a sequence error, show helpful message
      if (errorMessage.includes('Invalid visit type') || errorMessage.includes('skip')) {
        toast.error('Cannot skip visit levels. Please follow the escalation sequence.', {
          duration: 6000
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading && !demand) return <Loading />;

  const getVisitTypeDescription = (type) => {
    const descriptions = {
      reminder: 'Friendly reminder about overdue payment',
      payment_collection: 'Visit to collect payment',
      warning: 'Warning about consequences of non-payment',
      final_warning: 'Final warning before enforcement action'
    };
    return descriptions[type] || '';
  };

  const getCitizenResponseDescription = (response) => {
    const descriptions = {
      will_pay_today: 'Citizen will make payment today',
      will_pay_later: 'Citizen promised to pay on a future date',
      refused_to_pay: 'Citizen refused to make payment',
      not_available: 'Citizen was not available at property'
    };
    return descriptions[response] || '';
  };

  return (
    <div>
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/collector/tasks')}
          className="mr-4 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Record Field Visit</h1>
          <p className="text-gray-600 mt-1">Record your field visit with complete details</p>
        </div>
      </div>

      {/* Property & Demand Info */}
      {demand && property && owner && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-4">Visit Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center">
              <User className="w-5 h-5 mr-2 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Citizen</p>
                <p className="font-medium">{owner.firstName} {owner.lastName}</p>
                {owner.phone && <p className="text-sm text-gray-600">{owner.phone}</p>}
              </div>
            </div>
            <div className="flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Property</p>
                <p className="font-medium">{property.propertyNumber}</p>
                <p className="text-sm text-gray-600">{property.address}</p>
              </div>
            </div>
            <div className="flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Amount Due</p>
                <p className="font-medium text-red-600">
                  ₹{parseFloat(demand.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-gray-600">{demand.overdueDays} days overdue</p>
              </div>
            </div>
          </div>

          {followUp && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-600">Visit Count: <strong>{followUp.visitCount}</strong></span>
                <span className="text-gray-600">Last Visit: <strong>{followUp.lastVisitDate ? new Date(followUp.lastVisitDate).toLocaleDateString() : 'Never'}</strong></span>
                <span className="text-gray-600">Status: <strong className="capitalize">{followUp.escalationStatus}</strong></span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Visit Form */}
      <form onSubmit={handleSubmit} className="card">
        <h2 className="text-lg font-semibold mb-4">Visit Information</h2>

        {/* Visit Type */}
        <div className="mb-4">
          <label className="label">
            Visit Type <span className="text-red-500">*</span>
          </label>
          <select
            name="visitType"
            value={formData.visitType}
            onChange={handleChange}
            className={`input ${errors.visitType ? 'border-red-500' : ''}`}
            required
          >
            <option value="">Select visit type</option>
            <option value="reminder">Reminder</option>
            <option value="payment_collection">Payment Collection</option>
            <option value="warning">Warning</option>
            <option value="final_warning">Final Warning</option>
          </select>
          {formData.visitType && (
            <p className="text-sm text-gray-600 mt-1">{getVisitTypeDescription(formData.visitType)}</p>
          )}
          {errors.visitType && <p className="text-sm text-red-500 mt-1">{errors.visitType}</p>}
        </div>

        {/* Citizen Response */}
        <div className="mb-4">
          <label className="label">
            Citizen Response <span className="text-red-500">*</span>
          </label>
          <select
            name="citizenResponse"
            value={formData.citizenResponse}
            onChange={handleChange}
            className={`input ${errors.citizenResponse ? 'border-red-500' : ''}`}
            required
          >
            <option value="">Select response</option>
            <option value="will_pay_today">Will pay today</option>
            <option value="will_pay_later">Will pay later (with date)</option>
            <option value="refused_to_pay">Refused to pay</option>
            <option value="not_available">Not available</option>
          </select>
          {formData.citizenResponse && (
            <p className="text-sm text-gray-600 mt-1">{getCitizenResponseDescription(formData.citizenResponse)}</p>
          )}
          {errors.citizenResponse && <p className="text-sm text-red-500 mt-1">{errors.citizenResponse}</p>}
        </div>

        {/* Expected Payment Date */}
        {formData.citizenResponse === 'will_pay_later' && (
          <div className="mb-4">
            <label className="label">
              Expected Payment Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="expectedPaymentDate"
              value={formData.expectedPaymentDate}
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
              className={`input ${errors.expectedPaymentDate ? 'border-red-500' : ''}`}
              required
            />
            {errors.expectedPaymentDate && <p className="text-sm text-red-500 mt-1">{errors.expectedPaymentDate}</p>}
          </div>
        )}

        {/* Remarks */}
        <div className="mb-4">
          <label className="label">
            Remarks <span className="text-red-500">*</span>
            <span className="text-gray-500 text-xs ml-2">(Minimum 10 characters)</span>
          </label>
          <textarea
            name="remarks"
            value={formData.remarks}
            onChange={handleChange}
            rows={4}
            className={`input ${errors.remarks ? 'border-red-500' : ''}`}
            placeholder="Describe the visit, citizen's response, and any important details..."
            required
          />
          <p className="text-xs text-gray-500 mt-1">{formData.remarks.length} characters</p>
          {errors.remarks && <p className="text-sm text-red-500 mt-1">{errors.remarks}</p>}
        </div>

        {/* Location Information */}
        <div className="mb-4">
          <label className="label flex items-center">
            <MapPin className="w-4 h-4 mr-2" />
            Location Information
          </label>
          {locationError ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-2">
              <p className="text-sm text-yellow-800">{locationError}</p>
            </div>
          ) : formData.latitude && formData.longitude ? (
            <div className="bg-green-50 border border-green-200 rounded p-3 mb-2">
              <p className="text-sm text-green-800">
                <CheckCircle className="w-4 h-4 inline mr-1" />
                Location captured: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
              </p>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-2">
              <p className="text-sm text-gray-600">Requesting location access...</p>
            </div>
          )}
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="input"
            placeholder="Address or location description (optional)"
          />
        </div>

        {/* Proof (Optional) */}
        <div className="mb-4">
          <label className="label flex items-center">
            <ImageIcon className="w-4 h-4 mr-2" />
            Proof / Evidence (Optional)
          </label>
          
          {/* Image Upload */}
          <div className="mb-3">
            <label className="btn btn-secondary cursor-pointer inline-flex items-center">
              <Upload className="w-4 h-4 mr-2" />
              {uploadingPhoto ? 'Uploading...' : 'Upload Photo from Local Storage'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 5 * 1024 * 1024) {
                      toast.error('File size must be less than 5MB');
                      return;
                    }
                    try {
                      setUploadingPhoto(true);
                      const formData = new FormData();
                      formData.append('photo', file);
                      const response = await uploadAPI.uploadFieldVisitPhoto(formData);
                      const photoUrl = response.data.data.url;
                      setUploadedPhotoUrl(photoUrl);
                      toast.success('Photo uploaded successfully');
                    } catch (error) {
                      toast.error(error.response?.data?.message || 'Failed to upload photo');
                    } finally {
                      setUploadingPhoto(false);
                    }
                  }
                  e.target.value = '';
                }}
                disabled={uploadingPhoto}
              />
            </label>
            <span className="text-sm text-gray-500 ml-3">Max 5MB (JPEG, PNG, GIF, WebP)</span>
          </div>

          {/* Uploaded Photo Preview */}
          {uploadedPhotoUrl && (
            <div className="mb-3 relative inline-block">
              <img
                src={uploadedPhotoUrl}
                alt="Uploaded proof photo"
                className="w-48 h-32 object-cover rounded-lg border border-gray-200"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/200x150?text=Image+Not+Found';
                }}
              />
              <button
                type="button"
                onClick={() => setUploadedPhotoUrl(null)}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Proof Note */}
          <input
            type="text"
            name="proofNote"
            value={formData.proofNote}
            onChange={handleChange}
            className="input mb-2"
            placeholder="Additional proof notes or observations..."
          />
          
          {/* Manual Photo URL (fallback) */}
          <input
            type="url"
            name="proofPhotoUrl"
            value={formData.proofPhotoUrl}
            onChange={handleChange}
            className="input"
            placeholder="Or enter photo URL manually (optional)"
          />
        </div>

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate('/collector/tasks')}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary flex-1"
          >
            {loading ? 'Recording Visit...' : 'Record Field Visit'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RecordFieldVisit;
