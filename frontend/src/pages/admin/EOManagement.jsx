import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, MapPin, AlertTriangle, Eye, Filter, RefreshCw } from 'lucide-react';
import { fieldWorkerMonitoringAPI } from '../../services/api';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Loading from '../../components/Loading';

const EOManagement = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [eoList, setEoList] = useState([]);
  const [ulbs, setUlbs] = useState([]);
  const [selectedUlbId, setSelectedUlbId] = useState('');

  useEffect(() => {
    fetchULBs();
  }, []);

  useEffect(() => {
    fetchEoList();
  }, [selectedUlbId]);

  const fetchULBs = async () => {
    try {
      const response = await api.get('/admin-management/ulbs');
      if (response.data) {
        setUlbs(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch ULBs:', error);
      toast.error('Failed to load ULBs');
    }
  };

  const fetchEoList = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedUlbId) {
        params.ulb_id = selectedUlbId;
      }
      
      const response = await fieldWorkerMonitoringAPI.getEoList(params);
      if (response?.data?.success && response.data.data) {
        setEoList(response.data.data);
      } else {
        setEoList([]);
      }
    } catch (error) {
      console.error('Failed to fetch EO list:', error);
      toast.error(error.response?.data?.message || 'Failed to load EO list');
      setEoList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDashboard = (eo) => {
    // Navigate to dashboard with ulb_id + eo_id filter
    const params = new URLSearchParams();
    if (eo.ulb_id) {
      params.append('ulb_id', eo.ulb_id);
    }
    navigate(`/field-worker-monitoring/eos/${eo.id}/dashboard?${params.toString()}`);
  };

  const handleUlbFilterChange = (ulbId) => {
    setSelectedUlbId(ulbId);
    // Refetch EO list with ULB filter
    fetchEoList();
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">EO Management</h1>
          <p className="text-gray-600 mt-1">Manage and monitor Executive Officers across ULBs</p>
        </div>
        <button
          onClick={fetchEoList}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* ULB Filter */}
      <div className="card mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">Filter by ULB:</label>
          </div>
          <select
            value={selectedUlbId}
            onChange={(e) => handleUlbFilterChange(e.target.value)}
            className="input flex-1 max-w-xs"
          >
            <option value="">All ULBs</option>
            {ulbs.map(ulb => (
              <option key={ulb.id} value={ulb.id}>
                {ulb.name}
              </option>
            ))}
          </select>
          {selectedUlbId && (
            <button
              onClick={() => handleUlbFilterChange('')}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* EO List Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  EO Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ULB Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned Wards
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Workers
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Present Today %
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Geo Violations
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {eoList.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    {selectedUlbId ? 'No EOs found for the selected ULB.' : 'No EOs found.'}
                  </td>
                </tr>
              ) : (
                eoList.map((eo) => (
                  <tr key={eo.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{eo.eo_name}</div>
                          <div className="text-sm text-gray-500">{eo.employee_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{eo.ulb_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {eo.assigned_wards && eo.assigned_wards.length > 0 ? (
                          eo.assigned_wards.map((ward, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              <MapPin className="w-3 h-3 mr-1" />
                              {ward}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-400">No wards assigned</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{eo.total_workers}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">{eo.present_today_pct}%</div>
                        <div className={`ml-2 h-2 w-16 rounded-full ${
                          eo.present_today_pct >= 80 
                            ? 'bg-green-500' 
                            : eo.present_today_pct >= 60 
                            ? 'bg-yellow-500' 
                            : 'bg-red-500'
                        }`} />
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {eo.present_today} / {eo.total_workers}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <AlertTriangle className={`w-4 h-4 mr-1 ${
                          eo.geo_violations > 0 ? 'text-red-500' : 'text-gray-400'
                        }`} />
                        <span className={`text-sm font-medium ${
                          eo.geo_violations > 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {eo.geo_violations}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewDashboard(eo)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Dashboard
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      {eoList.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <div className="text-sm text-gray-600">Total EOs</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{eoList.length}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-600">Total Workers</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {eoList.reduce((sum, eo) => sum + eo.total_workers, 0)}
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-600">Avg. Present %</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {eoList.length > 0
                ? Math.round(
                    eoList.reduce((sum, eo) => sum + eo.present_today_pct, 0) /
                      eoList.length
                  )
                : 0}
              %
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-600">Total Geo Violations</div>
            <div className="text-2xl font-bold text-red-600 mt-1">
              {eoList.reduce((sum, eo) => sum + eo.geo_violations, 0)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EOManagement;
