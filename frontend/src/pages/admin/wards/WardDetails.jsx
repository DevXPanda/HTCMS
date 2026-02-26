import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { wardAPI, userAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { ArrowLeft, Edit, Users, BarChart3, Save, X } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

const WardDetails = () => {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const [ward, setWard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [showAssignCollector, setShowAssignCollector] = useState(false);
  const [collectors, setCollectors] = useState([]);
  const [selectedCollector, setSelectedCollector] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchWard();
    fetchStatistics();
    if (isAdmin) {
      fetchCollectors();
    }
  }, [id, isAdmin]);

  const fetchWard = async () => {
    try {
      const response = await wardAPI.getById(id);
      setWard(response.data.data.ward);
      setSelectedCollector(response.data.data.ward.collectorId?.toString() || '');
    } catch (error) {
      toast.error('Failed to fetch ward details');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      setLoadingStats(true);
      const response = await wardAPI.getStatistics(id);
      setStatistics(response.data.data.statistics);
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchCollectors = async () => {
    try {
      const response = await userAPI.getCollectors();
      setCollectors(response.data.data.collectors || []);
    } catch (error) {
      console.error('Failed to load collectors:', error);
      toast.error('Failed to load collectors');
    }
  };

  const handleAssignCollector = async () => {
    try {
      setAssigning(true);
      await wardAPI.assignCollector(id, {
        collectorId: selectedCollector ? parseInt(selectedCollector) : null
      });
      toast.success('Collector assigned successfully');
      setShowAssignCollector(false);
      fetchWard();
      fetchStatistics();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to assign collector');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) return <Loading />;
  if (!ward) return <div>Ward not found</div>;

  return (
    <div>
      <Link to="/wards" className="flex items-center text-primary-600 mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Wards
      </Link>

      <div className="flex justify-between items-center mb-6">
        <h1 className="ds-page-title">Ward Details</h1>
        {isAdmin && (
          <button
            onClick={() => setShowAssignCollector(!showAssignCollector)}
            className="btn btn-primary flex items-center"
          >
            <Users className="w-4 h-4 mr-2" />
            {ward.collector ? 'Change Collector' : 'Assign Collector'}
          </button>
        )}
      </div>

      {/* Assign Collector Form */}
      {showAssignCollector && isAdmin && (
        <div className="card mb-6 bg-blue-50 border border-blue-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Assign Collector</h3>
            <button
              onClick={() => setShowAssignCollector(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex gap-4">
            <select
              value={selectedCollector}
              onChange={(e) => setSelectedCollector(e.target.value)}
              className="input flex-1"
            >
              <option value="">No Collector (Unassign)</option>
              {collectors.length === 0 ? (
                <option disabled>No collectors available</option>
              ) : (
                collectors.map(collector => (
                  <option key={collector.id} value={collector.id}>
                    {collector.firstName} {collector.lastName}
                  </option>
                ))
              )}
            </select>
            <button
              onClick={handleAssignCollector}
              disabled={assigning}
              className="btn btn-primary flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              {assigning ? 'Assigning...' : 'Assign'}
            </button>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="card bg-blue-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Properties</p>
                <p className="text-2xl font-bold text-blue-600">{statistics.totalProperties}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div className="card bg-green-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Collection</p>
                <p className="text-2xl font-bold text-green-600">
                  ₹{parseFloat(statistics.totalCollection || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <div className="card bg-red-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Outstanding</p>
                <p className="text-2xl font-bold text-red-600">
                  ₹{parseFloat(statistics.totalOutstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-red-400" />
            </div>
          </div>
          <div className="card bg-orange-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Demands</p>
                <p className="text-2xl font-bold text-orange-600">{statistics.pendingDemands}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-orange-400" />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Ward Information</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">ULB</dt>
              <dd className="font-semibold">{ward.ulb ? ward.ulb.name : 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Ward Number</dt>
              <dd className="text-lg font-semibold">{ward.wardNumber}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Ward Name</dt>
              <dd>{ward.wardName}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd>
                <span className={ward.isActive ? 'badge badge-success' : 'badge badge-danger'}>
                  {ward.isActive ? 'Active' : 'Inactive'}
                </span>
              </dd>
            </div>
            {ward.description && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd>{ward.description}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Assigned Staffs
          </h2>
          {(ward.collector || ward.clerk || ward.inspector || ward.officer) ? (
            <div className="space-y-4">
              {/* Collector */}
              {ward.collector && (
                <div className="pb-3 border-b border-gray-200">
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Collector</div>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Name</dt>
                      <dd className="font-semibold">
                        {ward.collector.full_name || `${ward.collector.firstName} ${ward.collector.lastName}`}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd>{ward.collector.email}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Phone</dt>
                      <dd>{ward.collector.phone_number || ward.collector.phone || 'N/A'}</dd>
                    </div>
                    {isAdmin && (
                      <div className="pt-2">
                        <Link
                          to={`/users/${ward.collector.id}`}
                          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                        >
                          View Profile →
                        </Link>
                      </div>
                    )}
                  </dl>
                </div>
              )}

              {/* Clerk */}
              {ward.clerk && (
                <div className="pb-3 border-b border-gray-200">
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Clerk</div>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Name</dt>
                      <dd className="font-semibold">
                        {ward.clerk.full_name || `${ward.clerk.firstName} ${ward.clerk.lastName}`}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd>{ward.clerk.email}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Phone</dt>
                      <dd>{ward.clerk.phone_number || ward.clerk.phone || 'N/A'}</dd>
                    </div>
                    {isAdmin && (
                      <div className="pt-2">
                        <Link
                          to={`/users/${ward.clerk.id}`}
                          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                        >
                          View Profile →
                        </Link>
                      </div>
                    )}
                  </dl>
                </div>
              )}

              {/* Inspector */}
              {ward.inspector && (
                <div className="pb-3 border-b border-gray-200">
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Inspector</div>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Name</dt>
                      <dd className="font-semibold">
                        {ward.inspector.full_name || `${ward.inspector.firstName} ${ward.inspector.lastName}`}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd>{ward.inspector.email}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Phone</dt>
                      <dd>{ward.inspector.phone_number || ward.inspector.phone || 'N/A'}</dd>
                    </div>
                    {isAdmin && (
                      <div className="pt-2">
                        <Link
                          to={`/users/${ward.inspector.id}`}
                          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                        >
                          View Profile →
                        </Link>
                      </div>
                    )}
                  </dl>
                </div>
              )}

              {/* Officer */}
              {ward.officer && (
                <div className="pb-3">
                  <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Officer</div>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Name</dt>
                      <dd className="font-semibold">
                        {ward.officer.full_name || `${ward.officer.firstName} ${ward.officer.lastName}`}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd>{ward.officer.email}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Phone</dt>
                      <dd>{ward.officer.phone_number || ward.officer.phone || 'N/A'}</dd>
                    </div>
                    {isAdmin && (
                      <div className="pt-2">
                        <Link
                          to={`/users/${ward.officer.id}`}
                          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                        >
                          View Profile →
                        </Link>
                      </div>
                    )}
                  </dl>
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="text-gray-500 mb-3">No staff assigned to this ward</p>
              {isAdmin && (
                <button
                  onClick={() => setShowAssignCollector(true)}
                  className="btn btn-secondary text-sm"
                >
                  Assign Collector
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {ward.properties && ward.properties.length > 0 && (
        <div className="card mt-6 lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Properties in this Ward ({ward.properties.length})</h2>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Property Number</th>
                  <th>Address</th>
                  <th>Owner</th>
                  <th>Property Type</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ward.properties.map((property) => (
                  <tr key={property.id}>
                    <td className="font-medium">{property.propertyNumber}</td>
                    <td>{property.address}</td>
                    <td>
                      {property.owner ? (
                        <>
                          {property.owner.firstName} {property.owner.lastName}
                        </>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td className="capitalize">{property.propertyType || 'N/A'}</td>
                    <td>
                      <span className={`badge ${property.status === 'active' ? 'badge-success' :
                          property.status === 'inactive' ? 'badge-danger' :
                            'badge-warning'
                        } capitalize`}>
                        {property.status || 'active'}
                      </span>
                    </td>
                    <td>
                      <Link
                        to={`/properties/${property.id}`}
                        className="text-primary-600 hover:text-primary-700 text-sm"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default WardDetails;
