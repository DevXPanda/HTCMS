import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useBackTo } from '../../../contexts/NavigationContext';
import {
  Bath,
  Plus,
  Search,
  Filter,
  MapPin,
  Users,
  CheckCircle,
  XCircle,
  Edit,
  Eye,
  AlertCircle,
  X,
  Download
} from 'lucide-react';
import api from '../../../services/api';
import { exportToCSV } from '../../../utils/exportCSV';

const ToiletFacilities = () => {
  useBackTo('/toilet-management');
  const [toilets, setToilets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    ward: '',
    type: ''
  });
  const [wards, setWards] = useState([]);

  useEffect(() => {
    fetchToilets();
    fetchWards();
  }, []);

  const fetchWards = async () => {
    try {
      const response = await api.get('/wards');
      if (response.data && response.data.success) {
        setWards(response.data.data.wards);
      }
    } catch (error) {
      console.error('Failed to fetch wards:', error);
      toast.error('Failed to load wards.');
    }
  };

  const fetchToilets = async () => {
    try {
      setLoading(true);
      const response = await api.get('/toilet/facilities');
      if (response.data && response.data.success) {
        const formattedData = response.data.data.facilities.map(t => ({
          ...t,
          ward: t.ward ? t.ward.wardName : (t.wardId ? `Ward ${t.wardId}` : 'N/A'),
          assignedStaff: t.staffAssignments?.length || 0,
          lastInspection: t.inspections && t.inspections.length > 0 ? t.inspections[0].inspectionDate : null,
          lastMaintenance: t.maintenanceRecords && t.maintenanceRecords.length > 0 ? t.maintenanceRecords[0].scheduledDate : null
        }));
        setToilets(formattedData);
      }
    } catch (error) {
      console.error('Failed to fetch toilets:', error);
      toast.error('Failed to load toilet facilities.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      ward: '',
      type: ''
    });
  };

  const handleExport = () => {
    const rows = filteredToilets.map(t => ({
      name: t.name,
      location: t.location,
      ward: t.ward,
      type: t.type,
      status: t.status,
      capacity: t.capacity,
      assignedStaff: t.assignedStaff,
      lastInspection: t.lastInspection || 'Never',
      lastMaintenance: t.lastMaintenance || 'Never'
    }));
    exportToCSV(rows, `toilet_facilities_${new Date().toISOString().slice(0, 10)}`);
  };

  const filteredToilets = toilets.filter(toilet => {
    const matchesSearch =
      toilet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      toilet.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      toilet.ward.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !filters.status || toilet.status === filters.status;
    const matchesWard = !filters.ward || toilet.wardId.toString() === filters.ward;
    const matchesType = !filters.type || toilet.type === filters.type;

    return matchesSearch && matchesStatus && matchesWard && matchesType;
  });

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      maintenance: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
      inactive: { color: 'bg-red-100 text-red-800', icon: XCircle }
    };

    const config = statusConfig[status] || statusConfig.inactive;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner spinner-md" />
      </div>
    );
  }

  return (
    <div>
      <div className="ds-page-header">
        <h1 className="ds-page-title">Toilet Facilities</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/toilet-management/facilities/new"
            className="btn btn-primary flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Toilet
          </Link>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary flex items-center"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="btn btn-secondary flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={(e) => { e.preventDefault(); }} className="mb-6">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by toilet name, location, or ward..."
              className="input pl-10"
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </div>
      </form>

      {/* Filters Panel */}
      {showFilters && (
        <div className="card mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Filters</h3>
            <button
              onClick={clearFilters}
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
            >
              <X className="w-4 h-4 mr-1" />
              Clear All
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="input"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="maintenance">Under Maintenance</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="label">Ward</label>
              <select
                value={filters.ward}
                onChange={(e) => handleFilterChange('ward', e.target.value)}
                className="input"
              >
                <option value="">All Wards</option>
                {wards.map(ward => (
                  <option key={ward.id} value={ward.id.toString()}>
                    {ward.wardName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Type</label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="input"
              >
                <option value="">All Types</option>
                <option value="Public">Public</option>
                <option value="Community">Community</option>
                <option value="Pay & Use">Pay & Use</option>
                <option value="Mobile">Mobile</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Toilets List */}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Facility Name</th>
              <th>Location</th>
              <th>Ward</th>
              <th>Type</th>
              <th>Capacity</th>
              <th>Status</th>
              <th>Staff</th>
              <th>Last Inspection</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredToilets.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-8 text-gray-500">
                  No toilet facilities found
                </td>
              </tr>
            ) : (
              filteredToilets.map((toilet) => (
                <tr key={toilet.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center">
                        {toilet.photos?.[0] ? (
                          <img src={toilet.photos[0]} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Bath className="h-5 w-5 text-gray-300" />
                        )}
                      </div>
                      <div>
                        <span className="font-bold text-gray-900 text-sm block">{toilet.name}</span>
                        <span className="text-[10px] text-gray-400 font-medium uppercase">{toilet.type}</span>
                      </div>
                    </div>
                  </td>
                  <td>{toilet.location}</td>
                  <td>{toilet.ward}</td>
                  <td>{toilet.type}</td>
                  <td>{toilet.capacity} users</td>
                  <td>{getStatusBadge(toilet.status)}</td>
                  <td>
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-1 text-gray-400" />
                      {toilet.assignedStaff}
                    </div>
                  </td>
                  <td>
                    {toilet.lastInspection ? new Date(toilet.lastInspection).toLocaleDateString() : 'Never'}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <Link
                        to={`/toilet-management/facilities/${toilet.id}`}
                        className="text-primary-600 hover:text-primary-900"
                        title="View Details"
                      >
                        <Eye className="h-5 w-5" />
                      </Link>
                      <Link
                        to={`/toilet-management/facilities/${toilet.id}/staff`}
                        className="text-green-600 hover:text-green-900"
                        title="Manage Staffing"
                      >
                        <Users className="h-5 w-5" />
                      </Link>
                      <Link
                        to={`/toilet-management/facilities/${toilet.id}/edit`}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit"
                      >
                        <Edit className="h-5 w-5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-card-title"><span>Total Facilities</span></div>
          <p className="stat-card-value">{toilets.length}</p>
        </div>
        <div className="stat-card">
          <div className="stat-card-title"><span>Active</span></div>
          <p className="stat-card-value text-green-600">{toilets.filter(t => t.status === 'active').length}</p>
        </div>
        <div className="stat-card">
          <div className="stat-card-title"><span>Under Maintenance</span></div>
          <p className="stat-card-value text-yellow-600">{toilets.filter(t => t.status === 'maintenance').length}</p>
        </div>
        <div className="stat-card">
          <div className="stat-card-title"><span>Total Capacity</span></div>
          <p className="stat-card-value">{toilets.reduce((sum, t) => sum + (t.capacity || 0), 0)}</p>
        </div>
      </div>
    </div>
  );
};

export default ToiletFacilities;
