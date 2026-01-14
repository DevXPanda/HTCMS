import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { propertyAPI } from '../../services/api';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import { ArrowLeft, MapPin, Camera } from 'lucide-react';

const CollectorPropertyDetails = () => {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProperty();
  }, [id]);

  const fetchProperty = async () => {
    try {
      const response = await propertyAPI.getById(id);
      setProperty(response.data.data.property);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch property details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;
  if (!property) return <div>Property not found</div>;

  return (
    <div>
      <Link to="/collector/properties" className="flex items-center text-primary-600 mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Property List
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Property Details</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Property Number</dt>
              <dd className="text-lg font-semibold">{property.propertyNumber}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Property Type</dt>
              <dd className="capitalize">{property.propertyType}</dd>
            </div>
            {property.usageType && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Usage Type</dt>
                <dd className="capitalize">{property.usageType}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd>
                <span className={`badge ${
                  property.status === 'active' ? 'badge-success' :
                  property.status === 'pending' ? 'badge-warning' :
                  property.status === 'disputed' ? 'badge-danger' :
                  'badge-info'
                } capitalize`}>
                  {property.status || 'active'}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Area</dt>
              <dd>{property.area} sq. meters</dd>
            </div>
            {property.builtUpArea && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Built-up Area</dt>
                <dd>{property.builtUpArea} sq. meters</dd>
              </div>
            )}
            {property.floors && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Number of Floors</dt>
                <dd>{property.floors}</dd>
              </div>
            )}
            {property.constructionType && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Construction Type</dt>
                <dd>{property.constructionType}</dd>
              </div>
            )}
            {property.constructionYear && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Construction Year</dt>
                <dd>{property.constructionYear}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">Occupancy Status</dt>
              <dd className="capitalize">{property.occupancyStatus?.replace('_', ' ')}</dd>
            </div>
          </dl>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Address</h2>
          <div className="space-y-2">
            <p>{property.address}</p>
            <p>{property.city}, {property.state}</p>
            <p>PIN: {property.pincode}</p>
            <p className="mt-4">
              <span className="text-sm font-medium text-gray-500">Ward: </span>
              {property.ward?.wardName || 'N/A'}
            </p>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Owner Information</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Name</dt>
              <dd>{property.ownerName || `${property.owner?.firstName} ${property.owner?.lastName}`}</dd>
            </div>
            {property.ownerPhone && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd>{property.ownerPhone}</dd>
              </div>
            )}
            {property.owner?.email && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd>{property.owner.email}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Geolocation */}
        {property.geolocation && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Location
            </h2>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Latitude</dt>
                <dd>{property.geolocation.latitude}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Longitude</dt>
                <dd>{property.geolocation.longitude}</dd>
              </div>
              {property.geolocation.latitude && property.geolocation.longitude && (
                <div className="mt-4">
                  <a
                    href={`https://www.google.com/maps?q=${property.geolocation.latitude},${property.geolocation.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-700 text-sm"
                  >
                    View on Google Maps →
                  </a>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* Photos */}
        {property.photos && property.photos.length > 0 && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Camera className="w-5 h-5 mr-2" />
              Photos
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {property.photos.map((photo, index) => (
                <div key={index} className="relative">
                  <img
                    src={photo}
                    alt={`Property photo ${index + 1}`}
                    className="w-full h-48 object-cover rounded-lg"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/300x200?text=Image+Not+Found';
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {property.remarks && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Remarks</h2>
            <p className="text-gray-600">{property.remarks}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectorPropertyDetails;
