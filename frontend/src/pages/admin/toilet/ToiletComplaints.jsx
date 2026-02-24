import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useBackTo } from '../../../contexts/NavigationContext';
import {
  AlertCircle,
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Calendar,
  User
} from 'lucide-react';
import api from '../../../services/api';

const ToiletComplaints = () => {
  useBackTo('/toilet-management');
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const response = await api.get('/toilet/complaints');
      if (response.data && response.data.success) {
        const formattedData = response.data.data.complaints.map(c => ({
          ...c,
          toiletName: c.facility ? c.facility.name : 'N/A',
          assignedToName: c.assignee ? c.assignee.full_name : 'Unassigned'
        }));
        setComplaints(formattedData);
      }
    } catch (error) {
      console.error('Failed to fetch complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredComplaints = complaints.filter(complaint => {
    const matchesSearch =
      (complaint.toiletName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (complaint.citizenName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (complaint.description || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || complaint.status?.toLowerCase() === filterStatus.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const s = status?.toLowerCase() || '';
    const statusConfig = {
      pending: { color: 'bg-amber-50 text-amber-700 border-amber-100', icon: Clock },
      'in progress': { color: 'bg-blue-50 text-blue-700 border-blue-100', icon: AlertCircle },
      resolved: { color: 'bg-green-50 text-green-700 border-green-100', icon: CheckCircle },
      closed: { color: 'bg-gray-50 text-gray-700 border-gray-100', icon: XCircle }
    };

    const config = statusConfig[s] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status || 'Pending'}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const p = priority?.toLowerCase() || '';
    const priorityConfig = {
      high: 'bg-red-50 text-red-700 border-red-100',
      medium: 'bg-amber-50 text-amber-700 border-amber-100',
      low: 'bg-green-50 text-green-700 border-green-100'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${priorityConfig[p] || priorityConfig.low}`}>
        {priority || 'Low'}
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Toilet Complaints</h1>
          <p className="text-gray-500 text-sm">Manage citizen reports and track resolution progress</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by facility, citizen, or issue..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Complaints List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Facility & Date
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Citizen Info
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Issue Type & Priority
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Photos
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredComplaints.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <AlertCircle className="w-8 h-8 text-gray-300 mb-2" />
                      <p className="font-medium text-gray-600">No complaints found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredComplaints.map((complaint) => (
                  <tr key={complaint.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{complaint.toiletName}</div>
                      <div className="flex items-center text-[10px] text-gray-500 mt-0.5">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(complaint.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm font-semibold text-gray-800">
                        {complaint.citizenName}
                      </div>
                      <div className="text-[10px] text-gray-500 flex items-center gap-1">
                        <User className="w-3 h-3" /> {complaint.citizenPhone}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{complaint.complaintType}</div>
                      <div className="mt-1">{getPriorityBadge(complaint.priority)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${complaint.assignee ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'}`}>
                          {complaint.assignedToName?.charAt(0)}
                        </div>
                        <span className="text-xs font-semibold text-gray-700">{complaint.assignedToName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex -space-x-2">
                        {complaint.photos?.slice(0, 3).map((p, i) => (
                          <div key={i} className="h-8 w-8 rounded-md border-2 border-white bg-gray-100 overflow-hidden shadow-sm">
                            <img src={p} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                        {complaint.photos?.length > 3 && (
                          <div className="h-8 w-8 rounded-md border-2 border-white bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 shadow-sm">
                            +{complaint.photos.length - 3}
                          </div>
                        )}
                        {(!complaint.photos || complaint.photos.length === 0) && (
                          <span className="text-[10px] text-gray-400 font-medium italic">No photos</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(complaint.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link
                        to={`/toilet-management/complaints/${complaint.id}`}
                        className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors inline-block"
                        title="View & Edit Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Total Reports</div>
          <div className="text-2xl font-bold text-gray-900">{complaints.length}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 border-l-4 border-amber-500">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Pending</div>
          <div className="text-2xl font-bold text-amber-600">
            {complaints.filter(c => c.status?.toLowerCase() === 'pending').length}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 border-l-4 border-blue-500">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">In Progress</div>
          <div className="text-2xl font-bold text-blue-600">
            {complaints.filter(c => c.status?.toLowerCase() === 'in progress').length}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 border-l-4 border-green-500">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Resolved</div>
          <div className="text-2xl font-bold text-green-600">
            {complaints.filter(c => c.status?.toLowerCase() === 'resolved').length}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToiletComplaints;
