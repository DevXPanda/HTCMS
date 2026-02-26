import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { propertyAPI } from '../../services/api';
import { useStaffAuth } from '../../contexts/StaffAuthContext';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import { ArrowLeft, Eye, Home, MapPin, User, FileText, Calendar } from 'lucide-react';

const PropertyDetails = () => {
  const { id } = useParams();
  const { user } = useStaffAuth();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProperty();
  }, [id]);

  const fetchProperty = async () => {
    try {
      setLoading(true);
      const response = await propertyAPI.getById(id);
      setProperty(response.data.data.property);
    } catch (error) {
      toast.error('Failed to fetch property details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  if (!property) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Property Not Found</h2>
        <Link to="/clerk/properties" className="btn btn-primary">
          Back to Properties
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <Link
            to="/clerk/properties"
            className="text-gray-600 hover:text-gray-900 flex items-center"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            Back to Properties
          </Link>
          <div>
            <h1 className="ds-page-title">Property Details</h1>
            <p className="text-gray-600">
              Property Number: {property.propertyNumber}
            </p>
          </div>
        </div>
        
        {/* Read-only badge */}
        <span className="badge badge-warning">
          <Eye className="w-4 h-4 mr-1" />
          Read-only access (Clerk)
        </span>
      </div>

      {/* Property Information Card */}
      <div className="card mb-6">
        <div className="flex items-center mb-4">
          <Home className="w-6 h-6 text-primary-600 mr-2" />
          <h2 className="text-xl font-semibold">Property Information</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="label">Property Number</label>
            <p className="text-gray-900 font-medium">{property.propertyNumber}</p>
          </div>
          
          <div>
            <label className="label">Property Type</label>
            <span className="badge badge-info capitalize">
              {property.propertyType}
            </span>
          </div>
          
          <div>
            <label className="label">Usage Type</label>
            <span className="badge badge-secondary capitalize">
              {property.usageType}
            </span>
          </div>
          
          <div>
            <label className="label">Construction Type</label>
            <p className="text-gray-900">{property.constructionType || 'N/A'}</p>
          </div>
          
          <div>
            <label className="label">Status</label>
            <span className={`badge ${
              property.status === 'active' ? 'badge-success' :
              property.status === 'pending' ? 'badge-warning' :
              property.status === 'disputed' ? 'badge-danger' :
              'badge-info'
            } capitalize`}>
              {property.status || 'active'}
            </span>
          </div>
          
          <div>
            <label className="label">Created Date</label>
            <p className="text-gray-900">
              {property.createdAt 
                ? new Date(property.createdAt).toLocaleDateString()
                : 'N/A'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Location Information */}
      <div className="card mb-6">
        <div className="flex items-center mb-4">
          <MapPin className="w-6 h-6 text-primary-600 mr-2" />
          <h2 className="text-xl font-semibold">Location Information</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="label">Address</label>
            <p className="text-gray-900">{property.address}</p>
          </div>
          
          <div>
            <label className="label">City</label>
            <p className="text-gray-900">{property.city || 'N/A'}</p>
          </div>
          
          <div>
            <label className="label">State</label>
            <p className="text-gray-900">{property.state || 'N/A'}</p>
          </div>
          
          <div>
            <label className="label">Pin Code</label>
            <p className="text-gray-900">{property.pinCode || 'N/A'}</p>
          </div>
          
          <div>
            <label className="label">Ward</label>
            <p className="text-gray-900">
              {property.ward?.wardName || 'N/A'} 
              {property.ward?.wardNumber && ` (${property.ward.wardNumber})`}
            </p>
          </div>
          
          <div>
            <label className="label">Zone</label>
            <p className="text-gray-900">{property.zone || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Owner Information */}
      <div className="card mb-6">
        <div className="flex items-center mb-4">
          <User className="w-6 h-6 text-primary-600 mr-2" />
          <h2 className="text-xl font-semibold">Owner Information</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="label">Owner Name</label>
            <p className="text-gray-900 font-medium">
              {property.ownerName || `${property.owner?.firstName} ${property.owner?.lastName}` || 'N/A'}
            </p>
          </div>
          
          <div>
            <label className="label">Mobile Number</label>
            <p className="text-gray-900">{property.mobileNumber || 'N/A'}</p>
          </div>
          
          <div>
            <label className="label">Email</label>
            <p className="text-gray-900">{property.email || 'N/A'}</p>
          </div>
          
          <div>
            <label className="label">Owner Type</label>
            <p className="text-gray-900">{property.ownerType || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Property Details */}
      <div className="card mb-6">
        <div className="flex items-center mb-4">
          <FileText className="w-6 h-6 text-primary-600 mr-2" />
          <h2 className="text-xl font-semibold">Property Details</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="label">Plot Area</label>
            <p className="text-gray-900">
              {property.plotArea ? `${property.plotArea} sq.ft` : 'N/A'}
            </p>
          </div>
          
          <div>
            <label className="label">Built-up Area</label>
            <p className="text-gray-900">
              {property.builtUpArea ? `${property.builtUpArea} sq.ft` : 'N/A'}
            </p>
          </div>
          
          <div>
            <label className="label">Number of Floors</label>
            <p className="text-gray-900">{property.numberOfFloors || 'N/A'}</p>
          </div>
          
          <div>
            <label className="label">Year Built</label>
            <p className="text-gray-900">{property.yearBuilt || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Assessment Information */}
      <div className="card">
        <div className="flex items-center mb-4">
          <Calendar className="w-6 h-6 text-primary-600 mr-2" />
          <h2 className="text-xl font-semibold">Assessment Information</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="label">Annual Tax</label>
            <p className="text-gray-900 font-medium">
              {property.annualTax ? `₹${property.annualTax.toLocaleString()}` : 'N/A'}
            </p>
          </div>
          
          <div>
            <label className="label">Last Assessment Date</label>
            <p className="text-gray-900">
              {property.lastAssessmentDate 
                ? new Date(property.lastAssessmentDate).toLocaleDateString()
                : 'N/A'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex justify-end space-x-4">
        <Link
          to="/clerk/water-applications/new"
          className="btn btn-primary flex items-center"
        >
          Create Water Connection for This Property
        </Link>
      </div>
    </div>
  );
};

export default PropertyDetails;
