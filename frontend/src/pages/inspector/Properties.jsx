import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building, 
  MapPin, 
  User, 
  Eye, 
  AlertCircle,
  Filter,
  Search,
  Home
} from 'lucide-react';
import { useStaffAuth } from '../../contexts/StaffAuthContext';
import { inspectorAPI } from '../../services/api';
import api from '../../services/api';

const InspectorProperties = () => {
  const { user } = useStaffAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [wardInfo, setWardInfo] = useState(null);

  useEffect(() => {
    fetchProperties();
    fetchWardInfo();
  }, []);

  useEffect(() => {
    if (wardInfo) {
      console.log('🏢 Inspector Properties - WardInfo updated:', wardInfo);
      console.log('🏢 Inspector Properties - WardDetails:', wardInfo.wardDetails);
      console.log('🏢 Inspector Properties - WardIds:', wardInfo.wardIds);
    }
  }, [wardInfo]);

  const fetchWardInfo = async () => {
    try {
      if (user?.ward_ids && user.ward_ids.length > 0) {
        try {
          console.log('🏢 Inspector Properties - Fetching ward details for IDs:', user.ward_ids);
          const wardResponse = await api.get('/wards', {
            params: { ids: user.ward_ids.join(',') }
          });
          
          console.log('🏢 Inspector Properties - Ward response:', wardResponse.data);
          console.log('🏢 Inspector Properties - Ward response structure:', JSON.stringify(wardResponse.data, null, 2));
          
          const wards = wardResponse.data?.wards || wardResponse.data?.data?.wards || [];
          
          setWardInfo({
            count: user.ward_ids.length,
            wardIds: user.ward_ids,
            wardDetails: wards
          });
        } catch (wardError) {
          console.warn('⚠️ Could not fetch ward details:', wardError);
          setWardInfo({
            count: user.ward_ids.length,
            wardIds: user.ward_ids,
            wardDetails: null
          });
        }
      } else {
        setWardInfo({
          count: 0,
          wardIds: [],
          wardDetails: null
        });
      }
    } catch (error) {
      console.error('Error fetching ward info:', error);
    }
  };

  const fetchProperties = async () => {
    try {
      setLoading(true);
      console.log('🔍 Inspector Properties - Fetching properties...');
      const response = await inspectorAPI.getWardProperties();
      console.log('🔍 Inspector Properties - API Response:', response);
      console.log('🔍 Inspector Properties - Response data:', response.data);
      console.log('🔍 Inspector Properties - Properties array:', response.data?.properties);
      setProperties(response.data?.properties || []);
    } catch (err) {
      setError('Failed to load properties');
      console.error('Properties fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter properties based on search and filters
  const filteredProperties = properties.filter(property => {
    const matchesSearch = 
      property.propertyNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.ownerName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = !propertyTypeFilter || property.propertyType === propertyTypeFilter;
    const matchesStatus = !statusFilter || property.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getPropertyTypeBadge = (type) => {
    const colors = {
      residential: 'bg-blue-100 text-blue-800',
      commercial: 'bg-green-100 text-green-800',
      industrial: 'bg-purple-100 text-purple-800',
      agricultural: 'bg-yellow-100 text-yellow-800',
      mixed: 'bg-gray-100 text-gray-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      disputed: 'bg-orange-100 text-orange-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  // Check if inspector has no wards assigned
  if (wardInfo && wardInfo.count === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Ward Assigned</h2>
          <p className="text-gray-600 mb-6 max-w-md">
            You haven't been assigned to any ward yet. Please contact the administrator to get ward assignments.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md">
            <h3 className="text-sm font-medium text-yellow-800 mb-2">Next Steps:</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Contact your system administrator</li>
              <li>• Request ward assignment for your area</li>
              <li>• Once assigned, refresh this page</li>
            </ul>
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
          <h1 className="text-3xl font-bold text-gray-900">Ward Properties</h1>
          <p className="text-gray-600 mt-1">View all properties in your assigned wards</p>
        </div>
      </div>

      {/* Assigned Ward Information */}
      {/* {wardInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <MapPin className="h-5 w-5 text-blue-600 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-blue-900">
                {wardInfo.count === 1 
                  ? wardInfo.wardDetails && wardInfo.wardDetails.length > 0
                    ? `Assigned Ward: ${wardInfo.wardDetails[0].wardNumber} - ${wardInfo.wardDetails[0].wardName}`
                    : `Assigned Ward: ${wardInfo.wardIds[0]}`
                  : `Assigned Wards: ${wardInfo.count} wards`
                }
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                Showing properties from your assigned wards only
              </p>
            </div>
          </div>
        </div>
      )} */}

      {/* Read-only badge */}
      {/* <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <Eye className="h-5 w-5 text-yellow-600 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-yellow-900">
              Read-only Access (Inspector)
            </h3>
            <p className="text-sm text-yellow-700 mt-1">
              You can view property details for inspection purposes but cannot modify any data
            </p>
          </div>
        </div>
      </div> */}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <Filter className="h-5 w-5 text-gray-500 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by number, address, owner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Property Type Filter */}
          <select
            value={propertyTypeFilter}
            onChange={(e) => setPropertyTypeFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Types</option>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
            <option value="industrial">Industrial</option>
            <option value="agricultural">Agricultural</option>
            <option value="mixed">Mixed</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
            <option value="disputed">Disputed</option>
          </select>

          {/* Results Count */}
          <div className="flex items-center text-sm text-gray-600">
            <span className="font-medium">{filteredProperties.length}</span> properties found
          </div>
        </div>
      </div>

      {/* Properties Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Properties</h2>
        </div>
        
        {filteredProperties.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Property Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Owner Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Property Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProperties.map((property) => (
                  <tr key={property.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Building className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {property.propertyNumber}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-start">
                        <MapPin className="h-4 w-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-900">
                          {property.address}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {property.ownerName || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPropertyTypeBadge(property.propertyType)}`}>
                        {property.propertyType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(property.status)}`}>
                        {property.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        to={`/inspector/properties/${property.id}`}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Building className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No properties found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || propertyTypeFilter || statusFilter
                ? 'Try adjusting your filters'
                : 'No properties available in your assigned wards'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InspectorProperties;
