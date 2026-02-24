import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
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
  PlusCircle,
  Camera,
  Info,
  Clock
} from 'lucide-react';
import { useBackTo } from '../../../contexts/NavigationContext';
import api from '../../../services/api';

const ToiletDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
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
          ward: facilityData.ward ? facilityData.ward.wardName : (facilityData.wardId ? `Ward ${facilityData.wardId}` : 'N/A'),
        });

        if (facilityData.inspections) {
          setInspections(facilityData.inspections.map(i => ({
            ...i,
            date: i.inspectionDate,
            inspector: i.inspector ? i.inspector.full_name : 'Unknown'
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
      toast.error('Failed to load facility details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchInspections = async () => { };
  const fetchMaintenance = async () => { };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-green-50 text-green-700 border-green-100', icon: CheckCircle },
      maintenance: { color: 'bg-yellow-50 text-yellow-700 border-yellow-100', icon: AlertCircle },
      inactive: { color: 'bg-red-50 text-red-700 border-red-100', icon: XCircle }
    };

    const config = statusConfig[status] || statusConfig.inactive;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${config.color}`}>
        <Icon className="w-3.5 h-3.5" />
        {status}
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
      <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <p className="text-gray-500">Toilet facility not found</p>
        <Link to="/toilet-management/facilities" className="text-primary-600 font-bold underline mt-4 inline-block">
          Back to Facilities
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Container */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">{toilet.name}</h1>
            {getStatusBadge(toilet.status)}
          </div>
          <p className="text-gray-500 font-medium flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-primary-500" />
            {toilet.location} <span className="text-gray-300">•</span> {toilet.ward}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to={`/toilet-management/facilities/${id}/edit`}
            className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition-all flex items-center gap-2"
          >
            <Edit className="h-4 w-4" /> Edit Facility
          </Link>
          <Link
            to={`/toilet-management/facilities/${id}/staff`}
            className="px-5 py-2.5 bg-primary-600 rounded-xl text-sm font-bold text-white hover:bg-primary-700 shadow-lg shadow-primary-600/20 transition-all flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" /> Staffing
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Main Info Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div>
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Info className="w-4 h-4 text-primary-600" /> Facility DNA
                  </h3>
                  <dl className="grid grid-cols-2 gap-y-4 gap-x-6">
                    <div>
                      <dt className="text-[10px] font-bold text-gray-400 uppercase">Operational Type</dt>
                      <dd className="text-sm font-bold text-gray-900 mt-0.5">{toilet.type}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold text-gray-400 uppercase">Daily Capacity</dt>
                      <dd className="text-sm font-bold text-gray-900 mt-0.5">{toilet.capacity || 'N/A'} users</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-[10px] font-bold text-gray-400 uppercase">Operating Hours</dt>
                      <dd className="text-sm font-bold text-gray-900 mt-0.5 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" /> {toilet.openingHours || 'Not specified'}
                      </dd>
                    </div>
                  </dl>
                </div>

                {toilet.amenities?.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Available Amenities</h3>
                    <div className="flex flex-wrap gap-2">
                      {toilet.amenities.map((amenity, index) => (
                        <span key={index} className="px-3 py-1 bg-gray-50 border border-gray-100 rounded-lg text-[10px] font-bold text-gray-700 flex items-center gap-1.5">
                          <CheckCircle className="w-3 h-3 text-green-500" /> {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6 border-l border-gray-50 md:pl-10">
                <div>
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Location & Contact</h3>
                  <dl className="space-y-4">
                    <div>
                      <dt className="text-[10px] font-bold text-gray-400 uppercase">Coordinates</dt>
                      <dd className="text-xs font-mono text-gray-600 mt-1 bg-gray-50 p-2 rounded-lg border border-gray-100">
                        {toilet.latitude || '0.00'}, {toilet.longitude || '0.00'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold text-gray-400 uppercase">Superintendent</dt>
                      <dd className="text-sm font-bold text-gray-900 mt-0.5">{toilet.contactPerson || 'No staff assigned'}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold text-gray-400 uppercase">Emergency Contact</dt>
                      <dd className="text-sm font-bold text-primary-600 mt-0.5">{toilet.contactNumber || 'N/A'}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>

            {toilet.notes && (
              <div className="px-8 py-4 bg-gray-50 border-t border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1.5">
                  <FileText className="w-3 h-3" /> Management Notes
                </p>
                <p className="text-xs text-gray-600 italic">"{toilet.notes}"</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recent Inspections */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-primary-600" /> Audit Logs
                </h2>
                <Link to="/toilet-management/inspections" className="text-[10px] font-bold text-primary-600 uppercase underline">All</Link>
              </div>
              <div className="space-y-3">
                {inspections.slice(0, 3).map((inspection) => (
                  <div key={inspection.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex justify-between items-start mb-2">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-gray-900">{inspection.inspector}</p>
                        <p className="text-[10px] text-gray-500 font-medium">{new Date(inspection.date).toLocaleDateString()}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${inspection.status === 'Pass' || inspection.status === 'passed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {inspection.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-500">
                      <p>Clean: <span className="font-bold text-gray-700">{inspection.cleanliness}</span></p>
                      <p>Maint: <span className="font-bold text-gray-700">{inspection.maintenance}</span></p>
                    </div>
                  </div>
                ))}
                {inspections.length === 0 && <p className="text-xs text-gray-400 italic text-center py-4">No inspection history found</p>}
              </div>
              <Link
                to={`/toilet-management/inspections/new?facilityId=${id}`}
                className="w-full py-2 bg-gray-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-black transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" /> New Inspection
              </Link>
            </div>

            {/* Maintenance History */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                <h2 className="text-xs font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-primary-600" /> Maintenance
                </h2>
                <Link to="/toilet-management/maintenance" className="text-[10px] font-bold text-primary-600 uppercase underline">All</Link>
              </div>
              <div className="space-y-3">
                {maintenance.slice(0, 3).map((item) => (
                  <div key={item.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex justify-between items-start mb-2">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-gray-900">{item.type}</p>
                        <p className="text-[10px] text-gray-500 font-medium">{new Date(item.date).toLocaleDateString()}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${item.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {item.status?.replace('_', ' ')}
                      </span>
                    </div>
                    {item.staff && <p className="text-[10px] text-gray-600 font-medium">Assigned: <span className="font-bold text-gray-900">{item.staff}</span></p>}
                  </div>
                ))}
                {maintenance.length === 0 && <p className="text-xs text-gray-400 italic text-center py-4">No maintenance history found</p>}
              </div>
              <Link
                to={`/toilet-management/maintenance/new?facilityId=${id}`}
                className="w-full py-2 bg-gray-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-black transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Schedule Activity
              </Link>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Photo Gallery */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2 border-b border-gray-50 pb-3">
              <Camera className="w-4 h-4 text-primary-600" /> Visual Register
            </h3>
            {toilet.photos?.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {toilet.photos.map((p, idx) => (
                  <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-gray-100 shadow-inner group">
                    <img src={p} alt={`facility-${idx}`} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                <Camera className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">No Photos Recorded</p>
              </div>
            )}
            <Link to={`/toilet-management/facilities/${id}/edit`} className="w-full py-2 bg-gray-50 text-gray-700 rounded-xl text-[10px] font-black uppercase text-center block hover:bg-gray-100 transition-colors">
              Manage Media
            </Link>
          </div>

          {/* Assigned Staff */}
          {/* <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2 border-b border-gray-50 pb-3">
              <Users className="w-4 h-4 text-primary-600" /> Duty Roster
            </h3>
            <div className="space-y-3">
              {toilet.staffAssignments?.length > 0 ? (
                toilet.staffAssignments.map((assignment) => (
                  <div key={assignment.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                    <div className="h-8 w-8 bg-white rounded-full flex items-center justify-center text-primary-600 font-black text-xs shadow-sm ring-2 ring-gray-100">
                      {assignment.staff?.full_name?.[0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-black text-gray-900">{assignment.staff?.full_name}</p>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">{assignment.role} • {assignment.shift}</p>
                    </div>
                    {assignment.isActive && <div className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />}
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-gray-400 font-bold text-center py-4">No personnel deployed</p>
              )}
            </div>
            <Link to={`/toilet-management/facilities/${id}/staff`} className="w-full py-2 bg-primary-50 text-primary-700 rounded-xl text-[10px] font-black uppercase text-center block hover:bg-primary-100 transition-colors">
              Manage Deployment
            </Link>
          </div> */}

          {/* System Telemetry */}
          <div className="p-6 bg-gray-900 rounded-2xl text-white shadow-xl shadow-gray-900/10">
            <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4 tracking-hero">System Logs</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="h-1.5 w-1.5 rounded-full bg-primary-400 mt-2"></div>
                <div>
                  <p className="text-[10px] font-bold text-white/50 uppercase">Registered</p>
                  <p className="text-[11px] font-medium">{new Date(toilet.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-1.5 w-1.5 rounded-full bg-primary-400 mt-2"></div>
                <div>
                  <p className="text-[10px] font-bold text-white/50 uppercase">Synchronized</p>
                  <p className="text-[11px] font-medium">{new Date(toilet.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToiletDetails;
