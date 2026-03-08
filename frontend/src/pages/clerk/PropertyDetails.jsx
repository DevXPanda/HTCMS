import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { propertyAPI } from '../../services/api';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import { Eye, Home, MapPin, User, FileText, Calendar, TrendingUp, Building2, Droplet, Camera } from 'lucide-react';
import DetailPageLayout, { DetailRow } from '../../components/DetailPageLayout';

const PropertyDetails = () => {
  const { id } = useParams();
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
        <Link to="/clerk/properties" className="btn btn-primary">Back to Properties</Link>
      </div>
    );
  }

  const statusBadgeClass = () => {
    const s = (property.status || 'active').toLowerCase();
    if (s === 'active') return 'badge-success';
    if (s === 'pending') return 'badge-warning';
    if (s === 'disputed') return 'badge-danger';
    return 'badge-info';
  };

  return (
    <DetailPageLayout
      backTo="/clerk/properties"
      backLabel="Back to Properties"
      title="Property Details"
      subtitle={property.propertyNumber}
      actionButtons={
        <>
          <span className="badge badge-warning flex items-center">
            <Eye className="w-4 h-4 mr-1" />
            Read-only (Clerk)
          </span>
          <Link to="/clerk/water-applications/new" className="btn btn-primary flex items-center">
            <Droplet className="w-4 h-4 mr-2" />
            Create Water Connection
          </Link>
        </>
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
              <p className="stat-card-value text-lg capitalize">{property.propertyType || property.usageType || '—'}</p>
            </div>
          </div>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card flex flex-col">
          <h2 className="form-section-title flex items-center">
            <Building2 className="w-5 h-5 mr-2 text-primary-600" />
            Property Information
          </h2>
          <div className="flex-1">
          <dl>
            <DetailRow label="Property Number" value={property.propertyNumber} valueClass="font-semibold" />
            <DetailRow label="Property Type" value={property.propertyType} valueClass="capitalize" />
            <DetailRow label="Usage Type" value={property.usageType} valueClass="capitalize" />
            <DetailRow label="Status" value={<span className={`badge capitalize ${statusBadgeClass()}`}>{property.status || 'active'}</span>} />
            <DetailRow label="Construction Type" value={property.constructionType} />
            <DetailRow label="Created Date" value={property.createdAt ? new Date(property.createdAt).toLocaleDateString() : null} />
            <DetailRow label="Plot Area" value={property.plotArea != null ? `${property.plotArea} sq.ft` : property.area != null ? `${property.area} sq. m` : null} />
            <DetailRow label="Built-up Area" value={property.builtUpArea != null ? `${property.builtUpArea} sq.ft` : null} />
            <DetailRow label="Number of Floors" value={property.numberOfFloors ?? property.floors} />
            <DetailRow label="Year Built" value={property.yearBuilt ?? property.constructionYear} />
          </dl>
          </div>
        </div>

        <div className="card flex flex-col">
          <h2 className="form-section-title flex items-center">
            <User className="w-5 h-5 mr-2 text-primary-600" />
            Owner Information
          </h2>
          <div className="flex-1 flex flex-col sm:flex-row gap-4">
            <dl className="flex-1 space-y-1">
              <DetailRow label="Name" value={property.ownerName || [property.owner?.firstName, property.owner?.lastName].filter(Boolean).join(' ') || '—'} />
              <DetailRow label="Mobile" value={property.mobileNumber ?? property.ownerPhone ?? property.owner?.phone} />
              <DetailRow label="Email" value={property.email ?? property.owner?.email} />
              <DetailRow label="Owner Type" value={property.ownerType} />
              <DetailRow label="Address" value={property.address || '—'} />
              <DetailRow label="City" value={property.city} />
              <DetailRow label="State" value={property.state} />
              <DetailRow label="Pin Code" value={property.pinCode ?? property.pincode} />
              <DetailRow label="Ward" value={property.ward ? `${property.ward.wardName || ''}${property.ward.wardNumber ? ` (${property.ward.wardNumber})` : ''}` : null} />
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

        <div className="card flex flex-col">
          <h2 className="form-section-title flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-primary-600" />
            Property Location
          </h2>
          <div className="flex-1">
            {property.geolocation && (property.geolocation.latitude || property.geolocation.longitude) ? (
              <dl>
                <DetailRow label="Latitude" value={property.geolocation.latitude} />
                <DetailRow label="Longitude" value={property.geolocation.longitude} />
                <div className="pt-3 border-t border-gray-100 mt-2">
                  <a href={`https://www.google.com/maps?q=${property.geolocation.latitude},${property.geolocation.longitude}`} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 text-sm font-medium">View on Google Maps →</a>
                </div>
              </dl>
            ) : (
              <p className="text-gray-500 text-sm py-2">No location coordinates</p>
            )}
          </div>
        </div>

        <div className="card flex flex-col">
          <h2 className="form-section-title flex items-center">
            <Camera className="w-5 h-5 mr-2 text-primary-600" />
            Property Photo
          </h2>
          <div className="flex-1 min-h-[120px]">
            {(property.photos == null || property.photos.length === 0) ? (
              <p className="text-gray-500 text-sm py-2">No photos uploaded</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {property.photos.map((photo, index) => (
                  <img key={index} src={photo} alt={`Property ${index + 1}`} className="w-full h-48 object-cover rounded-lg border border-gray-200" onError={(e) => { e.target.src = 'https://via.placeholder.com/300x200?text=Image+Not+Found'; }} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="form-section-title flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-primary-600" />
            Assessment
          </h2>
          <dl>
            <DetailRow label="Annual Tax" value={property.annualTax != null ? `₹${Number(property.annualTax).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : null} />
            <DetailRow label="Last Assessment Date" value={property.lastAssessmentDate ? new Date(property.lastAssessmentDate).toLocaleDateString() : null} />
          </dl>
        </div>
      </div>
    </DetailPageLayout>
  );
};

export default PropertyDetails;
