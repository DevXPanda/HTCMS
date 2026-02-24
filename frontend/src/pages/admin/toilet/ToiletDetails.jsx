import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Bath,
  MapPin,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  ArrowLeft,
  ClipboardCheck,
  Wrench,
  FileText,
  UserPlus,
  PlusCircle
} from 'lucide-react';
import { useBackTo } from '../../../contexts/NavigationContext';
import api from '../../../services/api';

const ToiletDetails = () => {
  const { id } = useParams();
  useBackTo('/toilet-management/facilities');
  const [toilet, setToilet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inspections, setInspections] = useState([]);
  const [maintenance, setMaintenance] = useState([]);

  useEffect(() => {
    fetchToiletDetails();
    fetchInspections();
    fetchMaintenance();
  }, [id]);

  const fetchToiletDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/toilet/facilities/${id}`);
      if (response.data && response.data.success) {
        const facilityData = response.data.data.facility;
        setToilet({
          ...facilityData,
          ward: facilityData.ward ? facilityData.ward.wardName : 'N/A',
        });

        // Use data from the same response if available
        if (facilityData.inspections) {
          setInspections(facilityData.inspections.map(i => ({
            ...i,
            date: i.inspectionDate,
            inspector: i.inspector ? `${i.inspector.firstName} ${i.inspector.lastName}` : 'Unknown'
          })));
        }

        if (facilityData.maintenanceRecords) {
          setMaintenance(facilityData.maintenanceRecords.map(m => ({
            ...m,
            date: m.scheduledDate,
            staff: m.staff ? m.staff.full_name : 'Unknown'
          })));
        }
      }
    } catch (error) {
      console.error('Failed to fetch toilet details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInspections = async () => {
    // Already handled in fetchToiletDetails for the recent ones
  };

  const fetchMaintenance = async () => {
    // Already handled in fetchToiletDetails for the recent ones
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      maintenance: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
      inactive: { color: 'bg-red-100 text-red-800', icon: XCircle }
    };

    const config = statusConfig[status] || statusConfig.inactive;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        <Icon className="w-4 h-4 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!toilet) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Toilet facility not found</p>
        <Link to="/toilet-management/facilities" className="text-primary-600 hover:underline mt-4 inline-block">
          Back to Facilities
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{toilet.name}</h1>
          <p className="text-gray-600 text-sm">{toilet.location}</p>
        </div>
        <Link
          to={`/toilet-management/facilities/${id}/edit`}
          className="btn btn-primary flex items-center"
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit Facility
        </Link>
      </div>

      {/* Main Info Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">{getStatusBadge(toilet.status)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Type</dt>
                <dd className="mt-1 text-sm text-gray-900">{toilet.type}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Ward</dt>
                <dd className="mt-1 text-sm text-gray-900">{toilet.ward}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Capacity</dt>
                <dd className="mt-1 text-sm text-gray-900">{toilet.capacity} users</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Opening Hours</dt>
                <dd className="mt-1 text-sm text-gray-900">{toilet.openingHours}</dd>
              </div>
            </dl>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Location & Contact</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  Location
                </dt>
                <dd className="mt-1 text-sm text-gray-900">{toilet.location}</dd>
                <dd className="mt-1 text-xs text-gray-500">
                  Coordinates: {toilet.latitude}, {toilet.longitude}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Contact Person</dt>
                <dd className="mt-1 text-sm text-gray-900">{toilet.contactPerson}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Contact Number</dt>
                <dd className="mt-1 text-sm text-gray-900">{toilet.contactNumber}</dd>
              </div>
            </dl>
          </div>
        </div>

        {toilet.amenities && toilet.amenities.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Amenities</h3>
            <div className="flex flex-wrap gap-2">
              {toilet.amenities.map((amenity, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {amenity}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Assigned Staff */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Users className="w-5 h-5 mr-2 text-gray-400" />
            Assigned Staff
          </h2>
          <div className="flex gap-2">
            <Link
              to={`/toilet-management/staff?facilityId=${id}`}
              className="px-3 py-1.5 bg-primary-50 text-primary-600 rounded-lg text-xs font-bold hover:bg-primary-100 transition-colors flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Assign Staff
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {toilet.assignedStaff && toilet.assignedStaff.length > 0 ? (
            toilet.assignedStaff.map((staff) => (
              <div key={staff.id} className="border border-gray-200 rounded-lg p-4">
                <div className="font-medium text-gray-900">{staff.name}</div>
                <div className="text-sm text-gray-500">{staff.role}</div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm">No staff assigned</p>
          )}
        </div>
      </div>

      {/* Recent Inspections */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <ClipboardCheck className="w-5 h-5 mr-2 text-gray-400" />
            Recent Inspections
          </h2>
          <div className="flex gap-3 items-center">
            <Link
              to={`/toilet-management/inspections/new?facilityId=${id}`}
              className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Record Inspection
            </Link>
            <Link
              to="/toilet-management/inspections"
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              View All
            </Link>
          </div>
        </div>
        <div className="space-y-4">
          {inspections.length > 0 ? (
            inspections.map((inspection) => (
              <div key={inspection.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium text-gray-900">{inspection.inspector}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(inspection.date).toLocaleDateString()}
                    </div>
                  </div>
                  {inspection.status === 'passed' ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
                <div className="text-sm text-gray-700 mt-2">
                  <div>Cleanliness: {inspection.cleanliness}</div>
                  <div>Maintenance: {inspection.maintenance}</div>
                  {inspection.notes && (
                    <div className="mt-2 text-gray-600">{inspection.notes}</div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm">No inspections recorded</p>
          )}
        </div>
      </div>

      {/* Maintenance History */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Wrench className="w-5 h-5 mr-2 text-gray-400" />
            Maintenance History
          </h2>
          <div className="flex gap-3 items-center">
            <Link
              to={`/toilet-management/maintenance/new?facilityId=${id}`}
              className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Schedule Maintenance
            </Link>
            <Link
              to="/toilet-management/maintenance"
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              View All
            </Link>
          </div>
        </div>
        <div className="space-y-4">
          {maintenance.length > 0 ? (
            maintenance.map((item) => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium text-gray-900">{item.type}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(item.date).toLocaleDateString()} - {item.staff}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${item.status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                    }`}>
                    {item.status}
                  </span>
                </div>
                {item.notes && (
                  <div className="text-sm text-gray-600 mt-2">{item.notes}</div>
                )}
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm">No maintenance records</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ToiletDetails;
