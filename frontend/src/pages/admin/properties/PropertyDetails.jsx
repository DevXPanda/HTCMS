import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { propertyAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { Edit, MapPin, Camera, Home, Building2, User, TrendingUp } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import DetailPageLayout, { DetailRow } from '../../../components/DetailPageLayout';

const PropertyDetails = () => {
  const { id } = useParams();
  const { isAdmin, isAssessor } = useAuth();
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
      toast.error('Failed to fetch property details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;
  if (!property) return <div>Property not found</div>;

  const statusBadgeClass = () => {
    const s = (property.status || 'active').toLowerCase();
    if (s === 'active') return 'badge-success';
    if (s === 'pending') return 'badge-warning';
    if (s === 'disputed') return 'badge-danger';
    return 'badge-info';
  };

  return (
    <DetailPageLayout
      backTo="/properties"
      backLabel="Back to Properties"
      title="Property Details"
      subtitle={property.propertyNumber}
      actionButtons={
        (isAdmin || isAssessor) && (
          <Link to={`/properties/${id}/edit`} className="btn btn-primary flex items-center">
            <Edit className="w-4 h-4 mr-2" />
            Edit Property
          </Link>
        )
      }
      summarySection={
        <>
          <h2 className="form-section-title flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-primary-600" />
            Summary
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stat-card">
              <div className="stat-card-title"><span>Property Number</span></div>
              <p className="stat-card-value text-lg font-bold text-primary-600">{property.propertyNumber}</p>
            </div>
            <div className="stat-card">
              <div className="stat-card-title"><span>Status</span></div>
              <p className="stat-card-value text-base">
                <span className={`badge capitalize ${statusBadgeClass()}`}>{property.status || 'active'}</span>
              </p>
            </div>
            <div className="stat-card">
              <div className="stat-card-title"><span>Ward</span></div>
              <p className="stat-card-value text-lg">{property.ward?.wardName || '—'}</p>
            </div>
            <div className="stat-card">
              <div className="stat-card-title"><span>Type</span></div>
              <p className="stat-card-value text-lg capitalize">{property.propertyType || '—'}</p>
            </div>
          </div>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="form-section-title flex items-center">
            <Building2 className="w-5 h-5 mr-2 text-primary-600" />
            Basic Information
          </h2>
          <dl>
            {property.uniqueCode && <DetailRow label="Property ID" value={property.uniqueCode} />}
            <DetailRow label="Property Number" value={property.propertyNumber} valueClass="font-semibold" />
            <DetailRow label="Property Type" value={property.propertyType} valueClass="capitalize" />
            <DetailRow label="Usage Type" value={property.usageType} valueClass="capitalize" />
            <DetailRow
              label="Status"
              value={<span className={`badge capitalize ${statusBadgeClass()}`}>{property.status || 'active'}</span>}
            />
            <DetailRow label="Area" value={property.area != null ? `${property.area} sq. m` : null} />
            <DetailRow label="Built-up Area" value={property.builtUpArea != null ? `${property.builtUpArea} sq. m` : null} />
            <DetailRow label="Number of Floors" value={property.floors} />
            <DetailRow label="Construction Type" value={property.constructionType} />
            <DetailRow label="Construction Year" value={property.constructionYear} />
            <DetailRow label="Occupancy Status" value={property.occupancyStatus?.replace('_', ' ')} valueClass="capitalize" />
          </dl>
        </div>

        <div className="card">
          <h2 className="form-section-title flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-primary-600" />
            Address
          </h2>
          <dl>
            <DetailRow label="Address" value={property.address || '—'} />
            <DetailRow label="Location" value={[property.city, property.state].filter(Boolean).join(', ') || '—'} />
            <DetailRow label="PIN" value={property.pincode} />
            <DetailRow label="Ward" value={property.ward?.wardName} />
          </dl>
        </div>

        <div className="card">
          <h2 className="form-section-title flex items-center">
            <User className="w-5 h-5 mr-2 text-primary-600" />
            Owner Information
          </h2>
          <dl>
            <DetailRow
              label="Name"
              value={property.ownerName || [property.owner?.firstName, property.owner?.lastName].filter(Boolean).join(' ') || '—'}
            />
            <DetailRow label="Phone" value={property.ownerPhone || property.owner?.phone} />
            <DetailRow label="Email" value={property.owner?.email} />
          </dl>
        </div>

        {property.geolocation && (property.geolocation.latitude || property.geolocation.longitude) && (
          <div className="card">
            <h2 className="form-section-title flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-primary-600" />
              Location
            </h2>
            <dl>
              <DetailRow label="Latitude" value={property.geolocation.latitude} />
              <DetailRow label="Longitude" value={property.geolocation.longitude} />
              <div className="pt-3 border-t border-gray-100 mt-2">
                <a
                  href={`https://www.google.com/maps?q=${property.geolocation.latitude},${property.geolocation.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  View on Google Maps →
                </a>
              </div>
            </dl>
          </div>
        )}

        {(property.photos == null || property.photos.length === 0) && (
          <div className="card lg:col-span-2">
            <h2 className="form-section-title flex items-center">
              <Camera className="w-5 h-5 mr-2 text-primary-600" />
              Photos
            </h2>
            <p className="text-gray-500 text-sm">No photos uploaded</p>
          </div>
        )}
        {property.photos && property.photos.length > 0 && (
          <div className="card lg:col-span-2">
            <h2 className="form-section-title flex items-center">
              <Camera className="w-5 h-5 mr-2 text-primary-600" />
              Photos
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {property.photos.map((photo, index) => (
                <div key={index} className="relative">
                  <img
                    src={photo}
                    alt={`Property ${index + 1}`}
                    className="w-full h-48 object-cover rounded-lg border border-gray-200"
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
          <div className="card lg:col-span-2">
            <h2 className="form-section-title">Remarks</h2>
            <p className="text-gray-600 text-sm whitespace-pre-wrap">{property.remarks}</p>
          </div>
        )}
      </div>
    </DetailPageLayout>
  );
};

export default PropertyDetails;
