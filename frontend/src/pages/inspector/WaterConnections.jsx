import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Droplet, 
  Eye, 
  Calendar, 
  User, 
  MapPin,
  Building,
  Home,
  CheckCircle,
  XCircle,
  RotateCcw
} from 'lucide-react';
import api from '../../services/api';

const WaterConnectionsInspection = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await api.get('/inspector/water-connections/pending');
      setRequests(response.data);
    } catch (error) {
      console.error('Error fetching water connection requests:', error);
      setError('Failed to fetch water connection requests');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'SUBMITTED': { color: 'bg-blue-100 text-blue-800', icon: Droplet },
      'UNDER_INSPECTION': { color: 'bg-yellow-100 text-yellow-800', icon: Eye }
    };
    
    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', icon: Droplet };
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getConnectionTypeIcon = (type) => {
    const icons = {
      'domestic': Home,
      'commercial': Building,
      'industrial': Building
    };
    return icons[type] || Droplet;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <XCircle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Water Connection Inspections</h1>
          <p className="text-gray-600 mt-1">
            Review and process water connection requests
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <span className="px-3 py-1 bg-cyan-100 text-cyan-800 rounded-full text-sm font-medium">
            {requests.length} Pending
          </span>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Droplet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Requests</h3>
          <p className="text-gray-600">There are no water connection requests pending inspection at this time.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Request
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applicant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Connection Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Property
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests.map((request) => {
                  const ConnectionTypeIcon = getConnectionTypeIcon(request.connectionType);
                  return (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Droplet className="w-5 h-5 text-gray-400 mr-2" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {request.requestNumber}
                            </p>
                            <p className="text-xs text-gray-500">
                              by {request.creator?.firstName} {request.creator?.lastName}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="w-4 h-4 text-gray-400 mr-2" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {request.requester?.firstName} {request.requester?.lastName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {request.requester?.phone || 'No phone'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <ConnectionTypeIcon className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900 capitalize">
                            {request.connectionType}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building className="w-4 h-4 text-gray-400 mr-2" />
                          <div>
                            <p className="text-sm text-gray-900">
                              {request.property?.propertyNumber || 'N/A'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {request.property?.address || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                          <div>
                            <p className="text-sm text-gray-900">
                              {request.propertyLocation}
                            </p>
                            <p className="text-xs text-gray-500">
                              Ward: {request.property?.ward?.name || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(request.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(request.submittedAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link
                          to={`/inspector/water-connections/${request.id}/inspect`}
                          className="inline-flex items-center px-3 py-1 bg-cyan-600 text-white rounded-md hover:bg-cyan-700"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Inspect
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default WaterConnectionsInspection;
