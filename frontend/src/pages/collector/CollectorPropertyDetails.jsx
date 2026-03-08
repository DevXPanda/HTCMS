import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { propertyAPI } from '../../services/api';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import { MapPin, Camera, Home, User } from 'lucide-react';
import DetailPageLayout, { DetailRow } from '../../components/DetailPageLayout';

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
  if (!property) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-500 text-lg mb-4">Property not found</p>
        <Link to="/collector/properties" className="btn btn-primary">
          Back to Property List
        </Link>
      </div>
    );
  }

  const propertyCode = property.uniqueCode || property.propertyNumber || `#${id}`;
  const ownerName = property.ownerName || `${property.owner?.firstName || ''} ${property.owner?.lastName || ''}`.trim() || '—';

  return (
    <DetailPageLayout
      title="Property Details"
      subtitle={propertyCode}
      summarySection={
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="stat-card-title flex items-center">
              <span>Property</span>
              <Home className="w-5 h-5 text-gray-400 ml-2" />
            </div>
            <p className="stat-card-value text-lg font-mono">{propertyCode}</p>
          </div>
          <div className="stat-card">
            <div className="stat-card-title"><span>Type</span></div>
            <p className="stat-card-value capitalize">{property.propertyType || '—'}</p>
          </div>
          <div className="stat-card">
            <div className="stat-card-title"><span>Status</span></div>
            <p className="stat-card-value">
              <span className={`badge ${
                property.status === 'active' ? 'badge-success' :
                property.status === 'pending' ? 'badge-warning' :
                property.status === 'disputed' ? 'badge-danger' :
                'badge-info'
              } capitalize`}>
                {property.status || 'active'}
              </span>
            </p>
          </div>
          <div className="stat-card">
            <div className="stat-card-title"><span>Ward</span></div>
            <p className="stat-card-value">{property.ward?.wardName || '—'}</p>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="form-section-title flex items-center">
            <Home className="w-5 h-5 mr-2 text-primary-600" />
            Basic Information
          </h2>
          <dl className="divide-y divide-gray-100">
            <DetailRow label="Property Number" value={property.propertyNumber || property.uniqueCode} valueClass="font-mono" />
            <DetailRow label="Property Type" value={property.propertyType ? property.propertyType.replace('_', ' ') : null} />
            <DetailRow label="Usage Type" value={property.usageType ? property.usageType.replace('_', ' ') : null} />
            <DetailRow
              label="Status"
              value={
                <span className={`badge ${
                  property.status === 'active' ? 'badge-success' :
                  property.status === 'pending' ? 'badge-warning' :
                  property.status === 'disputed' ? 'badge-danger' :
                  'badge-info'
                } capitalize`}>
                  {property.status || 'active'}
                </span>
              }
            />
            <DetailRow label="Area" value={property.area != null ? `${property.area} sq. m` : null} />
            <DetailRow label="Built-up Area" value={property.builtUpArea != null ? `${property.builtUpArea} sq. m` : null} />
            <DetailRow label="Number of Floors" value={property.floors} />
            <DetailRow label="Construction Type" value={property.constructionType} />
            <DetailRow label="Construction Year" value={property.constructionYear} />
            <DetailRow label="Occupancy Status" value={property.occupancyStatus ? property.occupancyStatus.replace('_', ' ') : null} />
          </dl>
        </div>

        <div className="card">
          <h2 className="form-section-title flex items-center">
            <User className="w-5 h-5 mr-2 text-primary-600" />
            Owner Information
          </h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <dl className="divide-y divide-gray-100 flex-1">
              <DetailRow label="Name" value={ownerName} />
              <DetailRow label="Phone" value={property.ownerPhone || property.owner?.phone} />
              <DetailRow label="Email" value={property.owner?.email} />
              <DetailRow label="Address" value={property.address} />
              <DetailRow label="Location" value={[property.city, property.state].filter(Boolean).join(', ')} />
              <DetailRow label="PIN" value={property.pincode} />
              <DetailRow label="Ward" value={property.ward?.wardName} />
            </dl>
            {property.ownerPhotoUrl && (
              <div className="sm:border-l sm:pl-4 border-gray-100 flex-shrink-0 flex flex-col items-start">
                <span className="text-sm font-medium text-gray-500 mb-2">Owner Photo / Document</span>
                {property.ownerPhotoUrl.toLowerCase().includes('pdf') || property.ownerPhotoUrl.endsWith('.pdf') ? (
                  <a
                    href={property.ownerPhotoUrl.startsWith('http') ? property.ownerPhotoUrl : `${window.location.origin}${property.ownerPhotoUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    View PDF document
                  </a>
                ) : (
                  <img
                    src={property.ownerPhotoUrl.startsWith('http') ? property.ownerPhotoUrl : `${window.location.origin}${property.ownerPhotoUrl}`}
                    alt="Owner"
                    className="h-28 w-28 object-cover rounded-lg border border-gray-200 shadow-sm"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="form-section-title flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-primary-600" />
            Property Location
          </h2>
          {property.geolocation && (property.geolocation.latitude || property.geolocation.longitude) ? (
            <dl className="divide-y divide-gray-100">
              <DetailRow label="Latitude" value={property.geolocation.latitude} />
              <DetailRow label="Longitude" value={property.geolocation.longitude} />
              <DetailRow
                label="Map"
                value={
                  <a
                    href={`https://www.google.com/maps?q=${property.geolocation.latitude},${property.geolocation.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    View on Google Maps →
                  </a>
                }
              />
            </dl>
          ) : (
            <p className="text-gray-500 text-sm py-2">No location coordinates</p>
          )}
        </div>

        <div className="card">
          <h2 className="form-section-title flex items-center">
            <Camera className="w-5 h-5 mr-2 text-primary-600" />
            Property Photo
          </h2>
          {(property.photos == null || property.photos.length === 0) ? (
            <p className="text-gray-500 text-sm py-2">No photos uploaded</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {property.photos.map((photo, index) => (
                <div key={index} className="relative">
                  <img
                    src={photo}
                    alt={`Property photo ${index + 1}`}
                    className="w-full h-48 object-cover rounded-lg border border-gray-200"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/300x200?text=Image+Not+Found';
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {property.remarks && (
          <div className="card lg:col-span-2">
            <h2 className="form-section-title">Remarks</h2>
            <p className="text-gray-600">{property.remarks}</p>
          </div>
        )}
      </div>
    </DetailPageLayout>
  );
};

export default CollectorPropertyDetails;
