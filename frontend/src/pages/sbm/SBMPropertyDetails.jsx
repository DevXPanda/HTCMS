import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { propertyAPI } from '../../services/api';
import Loading from '../../components/Loading';
import DetailPageLayout, { DetailRow } from '../../components/DetailPageLayout';
import { Building2, User, TrendingUp, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

const SBMPropertyDetails = () => {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const res = await propertyAPI.getById(id);
        setProperty(res.data?.data?.property ?? res.data?.property ?? null);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load property');
        setProperty(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProperty();
  }, [id]);

  if (loading) return <Loading />;
  if (!property) return <div className="text-gray-600">Property not found.</div>;

  const statusBadgeClass = () => {
    const s = (property.status || 'active').toLowerCase();
    if (s === 'active') return 'badge-success';
    if (s === 'pending') return 'badge-warning';
    if (s === 'disputed') return 'badge-danger';
    return 'badge-info';
  };

  const ownerName = property.ownerName || [property.owner?.firstName, property.owner?.lastName].filter(Boolean).join(' ') || property.owner_name || '—';
  const ownerPhone = property.ownerPhone || property.owner?.phone || property.owner_phone;
  const ownerEmail = property.owner?.email;

  return (
    <DetailPageLayout
      title="Property Details (Read-only)"
      subtitle={property.propertyNumber || property.uniqueCode}
      actionButtons={null}
      summarySection={
        <>
          <h2 className="form-section-title flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-primary-600" />
            Summary
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stat-card">
              <div className="stat-card-title"><span>Property Number</span></div>
              <p className="stat-card-value text-lg font-bold text-primary-600">{property.propertyNumber || property.uniqueCode || '—'}</p>
            </div>
            <div className="stat-card">
              <div className="stat-card-title"><span>Status</span></div>
              <p className="stat-card-value text-base">
                <span className={`badge capitalize ${statusBadgeClass()}`}>{property.status || 'active'}</span>
              </p>
            </div>
            <div className="stat-card">
              <div className="stat-card-title"><span>Ward</span></div>
              <p className="stat-card-value text-lg">{property.ward?.wardName ?? property.ward_id ?? '—'}</p>
            </div>
            <div className="stat-card">
              <div className="stat-card-title"><span>Type</span></div>
              <p className="stat-card-value text-lg capitalize">{property.propertyType ?? property.property_type ?? '—'}</p>
            </div>
          </div>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card flex flex-col">
          <h2 className="form-section-title flex items-center">
            <Building2 className="w-5 h-5 mr-2 text-primary-600" />
            Basic Information
          </h2>
          <div className="flex-1">
            <dl>
              {(property.uniqueCode || property.unique_code) && <DetailRow label="Property ID" value={property.uniqueCode || property.unique_code} />}
              <DetailRow label="Property Number" value={property.propertyNumber || property.property_number} valueClass="font-semibold" />
              <DetailRow label="Property Type" value={property.propertyType || property.property_type} valueClass="capitalize" />
              <DetailRow label="Usage Type" value={property.usageType || property.usage_type} valueClass="capitalize" />
              <DetailRow
                label="Status"
                value={<span className={`badge capitalize ${statusBadgeClass()}`}>{property.status || 'active'}</span>}
              />
              <DetailRow label="Area" value={property.area != null ? `${property.area} sq. m` : null} />
              <DetailRow label="Built-up Area" value={property.builtUpArea != null || property.built_up_area != null ? `${property.builtUpArea ?? property.built_up_area} sq. m` : null} />
              <DetailRow label="Number of Floors" value={property.floors} />
              <DetailRow label="Construction Type" value={property.constructionType || property.construction_type} />
              <DetailRow label="Construction Year" value={property.constructionYear || property.construction_year} />
              <DetailRow label="Occupancy Status" value={(property.occupancyStatus || property.occupancy_status)?.replace('_', ' ')} valueClass="capitalize" />
            </dl>
          </div>
        </div>

        <div className="card flex flex-col">
          <h2 className="form-section-title flex items-center">
            <User className="w-5 h-5 mr-2 text-primary-600" />
            Owner Information
          </h2>
          <div className="flex-1">
            <dl>
              <DetailRow label="Name" value={ownerName} />
              <DetailRow label="Phone" value={ownerPhone} />
              <DetailRow label="Email" value={ownerEmail} />
              <DetailRow label="Address" value={property.address || '—'} />
              <DetailRow label="Location" value={[property.city, property.state].filter(Boolean).join(', ') || '—'} />
              <DetailRow label="PIN" value={property.pincode} />
              <DetailRow label="Ward" value={property.ward?.wardName ?? property.ward_id} />
            </dl>
          </div>
        </div>

        {property.geolocation && (property.geolocation.latitude || property.geolocation.longitude) && (
          <div className="card flex flex-col lg:col-span-2">
            <h2 className="form-section-title flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-primary-600" />
              Property Location
            </h2>
            <div className="flex-1">
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
          </div>
        )}

        {property.remarks && (
          <div className="card lg:col-span-2">
            <h2 className="form-section-title">Remarks</h2>
            <p className="text-gray-600 text-sm whitespace-pre-wrap">{property.remarks}</p>
          </div>
        )}
      </div>

      <p className="mt-4 text-sm text-gray-500">
        <Link to="/sbm/properties" className="text-primary-600 hover:underline">Back to Properties list</Link>
      </p>
    </DetailPageLayout>
  );
};

export default SBMPropertyDetails;
