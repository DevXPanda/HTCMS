import React, { useState, useEffect } from 'react';
import { Plus, Users, Search, Filter, Edit, Trash2, Eye, RefreshCw, Shield, CheckSquare, Square } from 'lucide-react';
import api from '../../services/api';

const AdminManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [wards, setWards] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // Form state for add/edit
  const [formData, setFormData] = useState({
    full_name: '',
    role: '',
    phone_number: '',
    email: '',
    ward_ids: [],
    status: 'active',
    password: ''
  });

  const [generatedCredentials, setGeneratedCredentials] = useState(null);

  useEffect(() => {
    fetchEmployees();
    fetchWards();
    fetchStatistics();
  }, [currentPage, filterRole, filterStatus, searchTerm]);

  useEffect(() => {
    // Clear selections when filters change
    setSelectedEmployees([]);
    setSelectAll(false);
  }, [filterRole, filterStatus, searchTerm]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10,
      });

      if (filterRole) params.append('role', filterRole);
      if (filterStatus) params.append('status', filterStatus);
      if (searchTerm) params.append('search', searchTerm);

      const response = await api.get(`/admin-management/employees?${params}`);
      const data = response?.data;

      if (data && Array.isArray(data.employees)) {
        setEmployees(data.employees);
        setTotalPages(data.pagination?.totalPages ?? 1);
      } else {
        setEmployees([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const fetchWards = async () => {
    try {
      const response = await api.get('/admin-management/employees/wards');
      const data = response?.data;
      setWards(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching wards:', error);
      setWards([]);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await api.get('/admin-management/employees/statistics');
      setStatistics(response?.data ?? null);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      setStatistics(null);
    }
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    console.log('🔵 Add Employee button clicked!');
    console.log('📝 Form data:', formData);

    try {
      const response = await api.post('/admin-management/employees', formData);

      console.log('✅ API Response:', response.data);

      setGeneratedCredentials(response.data);
      setShowAddModal(false);
      fetchEmployees();
      fetchStatistics();

      // Reset form
      setFormData({
        full_name: '',
        role: '',
        phone_number: '',
        email: '',
        ward_ids: [],
        status: 'active',
        password: ''
      });

      // Notify Wards page about ward assignment change
      localStorage.setItem('wardAssignmentUpdated', Date.now().toString());
      localStorage.removeItem('wardAssignmentUpdated');
      window.dispatchEvent(new Event('wardAssignmentUpdated'));
    } catch (error) {
      console.error('❌ Error adding employee:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      alert(error.response?.data?.message || 'Error adding employee');
    }
  };

  const handleEditEmployee = async (e) => {
    e.preventDefault();
    console.log('🔍 Frontend - Submitting edit form with data:', {
      ...formData,
      password: formData.password ? '***' : 'EMPTY',
      passwordLength: formData.password ? formData.password.length : 0
    });

    try {
      const response = await api.put(`/admin-management/employees/${selectedEmployee.id}`, formData);

      console.log('✅ Frontend - Update successful:', response.data);

      // Show success message
      if (formData.password && formData.password.trim() !== '') {
        alert('Employee updated successfully! Password has been changed.');
      } else {
        alert('Employee updated successfully!');
      }

      setShowEditModal(false);
      fetchEmployees();
      setSelectedEmployee(null);

      // Notify Wards page about ward assignment change
      // Use localStorage for cross-tab communication
      localStorage.setItem('wardAssignmentUpdated', Date.now().toString());
      localStorage.removeItem('wardAssignmentUpdated'); // Clean up immediately

      // Dispatch custom event for same-tab communication
      window.dispatchEvent(new Event('wardAssignmentUpdated'));
    } catch (error) {
      console.error('❌ Frontend - Error updating employee:', error);
      console.error('❌ Frontend - Error response:', error.response?.data);

      // Show detailed error message
      if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors.map(err => err.msg).join('\n');
        alert(`Validation failed:\n${errorMessages}`);
      } else {
        alert(error.response?.data?.message || 'Error updating employee');
      }
    }
  };

  const handleDeleteEmployee = async (employeeId) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;

    try {
      await api.delete(`/admin-management/employees/${employeeId}`);

      fetchEmployees();
      fetchStatistics();
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert(error.response?.data?.message || 'Error deleting employee');
    }
  };

  const handleResetPassword = async (employeeId) => {
    if (!confirm('Are you sure you want to reset this employee\'s password?')) return;

    try {
      const response = await api.post(`/admin-management/employees/${employeeId}/reset-password`, {});

      alert(`Password reset successful!\n\nNew Password: ${response.data.new_password}\n\nSave this password securely.`);
      fetchEmployees();
    } catch (error) {
      console.error('Error resetting password:', error);
      alert(error.response?.data?.message || 'Error resetting password');
    }
  };

  const openEditModal = (employee) => {
    setSelectedEmployee(employee);
    setFormData({
      full_name: employee.full_name,
      role: employee.role,
      phone_number: employee.phone_number,
      email: employee.email,
      ward_ids: employee.ward_ids || [],
      status: employee.status,
      password: ''
    });
    setShowEditModal(true);
  };

  const openViewModal = (employee) => {
    setSelectedEmployee(employee);
    setShowViewModal(true);
  };

  const getRoleBadgeColor = (role) => {
    // Only handle staff roles - all others get default gray
    const staffColors = {
      clerk: 'bg-blue-100 text-blue-800',
      inspector: 'bg-yellow-100 text-yellow-800',
      officer: 'bg-purple-100 text-purple-800',
      collector: 'bg-green-100 text-green-800'
    };

    // Return staff color if it's a valid staff role, otherwise gray
    return staffColors[role] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadgeColor = (status) => {
    return status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const handleSelectEmployee = (employeeId) => {
    setSelectedEmployees(prev => {
      if (prev.includes(employeeId)) {
        return prev.filter(id => id !== employeeId);
      } else {
        return [...prev, employeeId];
      }
    });
  };

  const handleSelectAll = () => {
    const list = Array.isArray(employees) ? employees : [];
    if (selectAll) {
      setSelectedEmployees([]);
      setSelectAll(false);
    } else {
      setSelectedEmployees(list.map(emp => emp.id));
      setSelectAll(true);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedEmployees.length === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedEmployees.length} staff member(s)?`)) return;

    try {
      await api.post('/admin-management/employees/bulk-delete', { employeeIds: selectedEmployees });

      setSelectedEmployees([]);
      setSelectAll(false);
      fetchEmployees();
      fetchStatistics();
    } catch (error) {
      console.error('Error bulk deleting employees:', error);
      alert(error.response?.data?.message || 'Error deleting employees');
    }
  };

  const handleBulkStatusChange = async (status) => {
    if (selectedEmployees.length === 0) return;

    if (!confirm(`Are you sure you want to ${status} ${selectedEmployees.length} staff member(s)?`)) return;

    try {
      await api.post('/admin-management/employees/bulk-status-update', { employeeIds: selectedEmployees, status });

      setSelectedEmployees([]);
      setSelectAll(false);
      fetchEmployees();
      fetchStatistics();
    } catch (error) {
      console.error('Error bulk updating employee status:', error);
      alert(error.response?.data?.message || 'Error updating employee status');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-600">Manage system staff and their access</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Staff
        </button>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Staff</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.total}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">{statistics.active}</p>
              </div>
              <Shield className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Inactive</p>
                <p className="text-2xl font-bold text-red-600">{statistics.inactive}</p>
              </div>
              <Shield className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Roles</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.by_role?.length || 0}</p>
              </div>
              <Users className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name, email, phone, or employee ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Roles</option>
            <option value="clerk">Clerk</option>
            <option value="inspector">Inspector</option>
            <option value="officer">Officer</option>
            <option value="collector">Collector</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterRole('');
              setFilterStatus('');
            }}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            Reset
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedEmployees.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-blue-900">
                {selectedEmployees.length} staff member{selectedEmployees.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkStatusChange('activate')}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                <Shield className="w-4 h-4" />
                Activate
              </button>
              <button
                onClick={() => handleBulkStatusChange('deactivate')}
                className="flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
              >
                <Shield className="w-4 h-4" />
                Deactivate
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
              <button
                onClick={() => {
                  setSelectedEmployees([]);
                  setSelectAll(false);
                }}
                className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employees Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span>Select All</span>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Wards
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
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) : (Array.isArray(employees) ? employees : []).length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                    No staff members found
                  </td>
                </tr>
              ) : (
                (Array.isArray(employees) ? employees : []).map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(employee.id)}
                        onChange={() => handleSelectEmployee(employee.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{employee.full_name}</div>
                        <div className="text-sm text-gray-500">{employee.employee_id}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(employee.role)}`}>
                        {employee.role.charAt(0).toUpperCase() + employee.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{employee.email}</div>
                      <div className="text-sm text-gray-500">{employee.phone_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {employee.ward_names && employee.ward_names.length > 0
                          ? employee.ward_names.join(', ')
                          : 'No wards assigned'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(employee.status)}`}>
                        {employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openViewModal(employee)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(employee)}
                          className="text-green-600 hover:text-green-900"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleResetPassword(employee.id)}
                          className="text-yellow-600 hover:text-yellow-900"
                          title="Reset Password"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteEmployee(employee.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {(totalPages ?? 1) > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Page {currentPage} of {totalPages ?? 1}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages ?? 1))}
                  disabled={currentPage === (totalPages ?? 1)}
                  className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Add New Staff</h2>
            <form onSubmit={handleAddEmployee}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Role</option>
                    <option value="clerk">Clerk</option>
                    <option value="inspector">Inspector</option>
                    <option value="officer">Officer</option>
                    <option value="collector">Collector</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ward Assignment</label>
                  <select
                    required
                    value={formData.ward_ids && formData.ward_ids.length > 0 ? formData.ward_ids[0] : ''}
                    onChange={(e) => setFormData({ ...formData, ward_ids: e.target.value ? [parseInt(e.target.value)] : [] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Ward</option>
                    {wards.length === 0 ? (
                      <option value="" disabled>
                        No wards available. Please add wards first.
                      </option>
                    ) : (
                      wards.map(ward => (
                        <option key={ward.id} value={ward.id}>
                          {ward.wardNumber} - {ward.wardName}
                        </option>
                      ))
                    )}
                  </select>
                  {wards.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">
                      No wards found. Please create wards in the Wards section first.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Employee
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Generated Credentials Modal */}
      {generatedCredentials && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="mb-4">
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <Shield className="w-6 h-6" />
                <h3 className="text-lg font-bold">Employee Created Successfully!</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">Please save these credentials securely. They will not be shown again.</p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Employee ID:</label>
                <div className="font-mono text-sm bg-white p-2 rounded border">{generatedCredentials.employee.employee_id}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Password:</label>
                <div className="font-mono text-sm bg-white p-2 rounded border">{generatedCredentials.employee.password}</div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> The employee will be required to change their password on first login.
              </p>
            </div>

            <button
              onClick={() => setGeneratedCredentials(null)}
              className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              I Have Saved the Credentials
            </button>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {showEditModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[85vh] overflow-y-auto relative">
            <h2 className="text-xl font-bold mb-4">Edit Staff</h2>
            <form onSubmit={handleEditEmployee}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Role</option>
                    <option value="clerk">Clerk</option>
                    <option value="inspector">Inspector</option>
                    <option value="officer">Officer</option>
                    <option value="collector">Collector</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ward Assignment</label>
                  <select
                    required
                    value={formData.ward_ids && formData.ward_ids.length > 0 ? formData.ward_ids[0] : ''}
                    onChange={(e) => setFormData({ ...formData, ward_ids: e.target.value ? [parseInt(e.target.value)] : [] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Ward</option>
                    {wards.length === 0 ? (
                      <option value="" disabled>
                        No wards available. Please add wards first.
                      </option>
                    ) : (
                      wards.map(ward => (
                        <option key={ward.id} value={ward.id}>
                          {ward.wardNumber} - {ward.wardName}
                        </option>
                      ))
                    )}
                  </select>
                  {wards.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">
                      No wards found. Please create wards in the Wards section first.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password <span className="text-gray-500 text-xs">(Leave empty to keep current password)</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter new password (optional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-text"
                    style={{ pointerEvents: 'auto', zIndex: 10 }}
                  />
                  {formData.password && (
                    <p className="text-xs text-blue-600 mt-1">
                      Password will be updated. Employee will need to use this new password for next login.
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Password must be at least 4 characters long
                  </p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Update Employee
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedEmployee(null);
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Employee Modal */}
      {showViewModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Employee Details</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Full Name</label>
                <p className="text-gray-900">{selectedEmployee.full_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Employee ID</label>
                <p className="text-gray-900 font-mono">{selectedEmployee.employee_id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Role</label>
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(selectedEmployee.role)}`}>
                  {selectedEmployee.role.charAt(0).toUpperCase() + selectedEmployee.role.slice(1)}
                </span>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <p className="text-gray-900">{selectedEmployee.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Phone Number</label>
                <p className="text-gray-900">{selectedEmployee.phone_number}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Assigned Wards</label>
                <p className="text-gray-900">
                  {selectedEmployee.ward_names && selectedEmployee.ward_names.length > 0
                    ? selectedEmployee.ward_names.join(', ')
                    : 'No wards assigned'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(selectedEmployee.status)}`}>
                  {selectedEmployee.status.charAt(0).toUpperCase() + selectedEmployee.status.slice(1)}
                </span>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Created By</label>
                <p className="text-gray-900">
                  {selectedEmployee.creator ? `${selectedEmployee.creator.firstName} ${selectedEmployee.creator.lastName}` : 'Unknown'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Created At</label>
                <p className="text-gray-900">{new Date(selectedEmployee.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Last Login</label>
                <p className="text-gray-900">
                  {selectedEmployee.last_login ? new Date(selectedEmployee.last_login).toLocaleString() : 'Never logged in'}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowViewModal(false);
                setSelectedEmployee(null);
              }}
              className="w-full mt-6 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagement;
