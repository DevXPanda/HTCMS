import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { citizenAPI } from '../../services/api';
import Loading from '../../components/Loading';
import { Droplet, MapPin, Calendar, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

const CitizenWaterConnections = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [waterConnections, setWaterConnections] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'connections'); // 'connections' or 'requests'

  useEffect(() => {
    fetchWaterConnections();
    fetchRequests();
  }, []);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'requests') {
      setActiveTab('requests');
    } else {
      setActiveTab('connections');
    }
  }, [searchParams]);

  const fetchWaterConnections = async () => {
    try {
      const response = await citizenAPI.getWaterConnections();
      setWaterConnections(response.data.data.waterConnections || []);
    } catch (error) {
      console.error('Error fetching water connections:', error);
      toast.error('Failed to load water connections');
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      const response = await citizenAPI.getWaterConnectionRequests();
      const requestsData = response.data.data.requests || [];
      console.log('Fetched water connection requests:', requestsData);
      console.log('Number of requests:', requestsData.length);
      setRequests(requestsData);
    } catch (error) {
      console.error('Error fetching water connection requests:', error);
    }
  };

  if (loading) return <Loading />;

  const getStatusBadge = (status) => {
    const statusConfig = {
      ACTIVE: { color: 'bg-green-100 text-green-800 border-green-300', label: 'Active' },
      DRAFT: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Draft' },
      DISCONNECTED: { color: 'bg-red-100 text-red-800 border-red-300', label: 'Disconnected' }
    };
    const config = statusConfig[status] || statusConfig.DRAFT;
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded border ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getConnectionTypeBadge = (type) => {
    const typeConfig = {
      domestic: { color: 'bg-blue-100 text-blue-800', label: 'Domestic' },
      commercial: { color: 'bg-purple-100 text-purple-800', label: 'Commercial' },
      industrial: { color: 'bg-orange-100 text-orange-800', label: 'Industrial' }
    };
    const config = typeConfig[type] || typeConfig.domestic;
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getRequestStatusBadge = (status) => {
    const statusConfig = {
      DRAFT: { color: 'bg-gray-100 text-gray-800 border-gray-300', label: 'Draft', icon: FileText },
      SUBMITTED: { color: 'bg-blue-100 text-blue-800 border-blue-300', label: 'Submitted', icon: Clock },
      UNDER_INSPECTION: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Under Inspection', icon: Clock },
      ESCALATED_TO_OFFICER: { color: 'bg-orange-100 text-orange-800 border-orange-300', label: 'Escalated to Officer', icon: Clock },
      APPROVED: { color: 'bg-green-100 text-green-800 border-green-300', label: 'Approved', icon: CheckCircle },
      REJECTED: { color: 'bg-red-100 text-red-800 border-red-300', label: 'Rejected', icon: XCircle },
      RETURNED: { color: 'bg-purple-100 text-purple-800 border-purple-300', label: 'Returned', icon: XCircle },
      COMPLETED: { color: 'bg-teal-100 text-teal-800 border-teal-300', label: 'Completed', icon: CheckCircle }
    };
    const config = statusConfig[status] || statusConfig.SUBMITTED;
    const Icon = config.icon;
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded border flex items-center gap-1 ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Water Connections</h1>
        <Link
          to="/citizen/water-connection-request"
          className="btn btn-primary bg-primary-600 hover:bg-primary-700"
        >
          Request New Connection
        </Link>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b">
        <div className="flex gap-4">
          <button
            onClick={() => {
              setActiveTab('connections');
              setSearchParams({});
            }}
            className={`pb-3 px-1 font-medium transition-colors ${
              activeTab === 'connections'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Droplet className="w-4 h-4 inline mr-2" />
            Water Connections ({waterConnections.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('requests');
              setSearchParams({ tab: 'requests' });
            }}
            className={`pb-3 px-1 font-medium transition-colors ${
              activeTab === 'requests'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Request History ({requests.length})
          </button>
        </div>
      </div>

      {/* Connections Tab */}
      {activeTab === 'connections' && (
        <>
          {waterConnections.length === 0 ? (
        <div className="card text-center py-12">
          <Droplet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Water Connections</h3>
          <p className="text-gray-500 mb-6">You don't have any water connections yet.</p>
          <Link
            to="/citizen/water-connection-request"
            className="btn btn-primary bg-primary-600 hover:bg-primary-700"
          >
            Request Water Connection
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {waterConnections.map((connection) => (
            <div key={connection.id} className="card">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {connection.connectionNumber}
                  </h3>
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusBadge(connection.status)}
                    {getConnectionTypeBadge(connection.connectionType)}
                    {connection.isMetered && (
                      <span className="px-2 py-1 text-xs font-semibold rounded bg-cyan-100 text-cyan-800">
                        Metered
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-start">
                  <MapPin className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Property</p>
                    <p className="font-medium text-gray-900">
                      {connection.property?.propertyNumber} - {connection.property?.address}
                    </p>
                    {connection.property?.ward && (
                      <p className="text-xs text-gray-500">
                        Ward {connection.property.ward.wardNumber}: {connection.property.ward.wardName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start">
                  <Calendar className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Connection Date</p>
                    <p className="font-medium text-gray-900">
                      {new Date(connection.connectionDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {connection.meterNumber && (
                  <div>
                    <p className="text-sm text-gray-600">Meter Number</p>
                    <p className="font-medium text-gray-900">{connection.meterNumber}</p>
                  </div>
                )}

                {connection.pipeSize && (
                  <div>
                    <p className="text-sm text-gray-600">Pipe Size</p>
                    <p className="font-medium text-gray-900">{connection.pipeSize} inches</p>
                  </div>
                )}

                {connection.monthlyRate && (
                  <div>
                    <p className="text-sm text-gray-600">Monthly Rate</p>
                    <p className="font-medium text-gray-900">
                      ₹{parseFloat(connection.monthlyRate).toLocaleString('en-IN')}
                    </p>
                  </div>
                )}
              </div>

              {connection.remarks && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600 mb-1">Remarks</p>
                  <p className="text-gray-900">{connection.remarks}</p>
                </div>
              )}

              <div className="mt-4 pt-4 border-t">
                <Link
                  to={`/water/connections/${connection.id}`}
                  className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                >
                  View Details →
                </Link>
              </div>
            </div>
          ))}
        </div>
          )}
        </>
      )}

      {/* Requests History Tab */}
      {activeTab === 'requests' && (
        <>
          {console.log('Rendering requests tab. Total requests:', requests.length)}
          {requests.length === 0 ? (
            <div className="card text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Requests Found</h3>
              <p className="text-gray-500 mb-6">You haven't submitted any water connection requests yet.</p>
              <Link
                to="/citizen/water-connection-request"
                className="btn btn-primary bg-primary-600 hover:bg-primary-700"
              >
                Request Water Connection
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {requests.map((request, index) => {
                console.log(`Rendering request ${index + 1}:`, request);
                return (
                <div key={request.id} className="card">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {request.requestNumber}
                      </h3>
                      <div className="flex items-center gap-2 mb-2">
                        {getRequestStatusBadge(request.status)}
                        {getConnectionTypeBadge(request.connectionType)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-start">
                      <MapPin className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-600">Property</p>
                        <p className="font-medium text-gray-900">
                          {request.property?.propertyNumber} - {request.property?.address}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <Calendar className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-600">Requested Date</p>
                        <p className="font-medium text-gray-900">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {request.processedAt && (
                      <div className="flex items-start">
                        <Calendar className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-600">Processed Date</p>
                          <p className="font-medium text-gray-900">
                            {new Date(request.processedAt).toLocaleDateString()}
                          </p>
                          {request.processor && (
                            <p className="text-xs text-gray-500">
                              By {request.processor.firstName} {request.processor.lastName}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {request.waterConnection && (
                      <div>
                        <p className="text-sm text-gray-600">Created Connection</p>
                        <p className="font-medium text-primary-600">
                          {request.waterConnection.connectionNumber}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-1">Property Location</p>
                    <p className="text-gray-900">{request.propertyLocation}</p>
                  </div>

                  {request.remarks && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-1">Your Remarks</p>
                      <p className="text-gray-900">{request.remarks}</p>
                    </div>
                  )}

                  {request.adminRemarks && (
                    <div className="mb-4 pt-4 border-t">
                      <p className="text-sm text-gray-600 mb-1">Admin Remarks</p>
                      <p className="text-gray-900">{request.adminRemarks}</p>
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CitizenWaterConnections;
