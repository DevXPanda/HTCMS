import React, { useState, useEffect } from 'react';
import { Plus, Users, Search, Filter, Edit, Trash2, Eye, RefreshCw, Shield, CheckSquare, Square } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useConfirm } from '../../components/ConfirmModal';

const AdminManagement = () => {
  const { confirm } = useConfirm();
  const [employees, setEmployees] = useState([]);
  const [wards, setWards] = useState([]);
  const [allWards, setAllWards] = useState([]); // Store all wards for filtering
  const [ulbs, setUlbs] = useState([]);
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
    password: '',
    assigned_ulb: '',
    ulb_id: '',
    ward_id: '',
    eo_id: '',
    supervisor_id: '',
    contractor_id: '',
    worker_type: '',
    company_name: '',
    contact_details: ''
  });

  // Role-based dropdown options (EO, Supervisor, Contractor lists)
  const [eosList, setEosList] = useState([]);
  const [supervisorsList, setSupervisorsList] = useState([]);
  const [contractorsList, setContractorsList] = useState([]);

  const [generatedCredentials, setGeneratedCredentials] = useState(null);

  useEffect(() => {
    fetchEmployees();
    fetchWards();
    fetchULBs();
    fetchStatistics();
  }, [currentPage, filterRole, filterStatus, searchTerm]);

  useEffect(() => {
    if (showAddModal || showEditModal) {
      fetchEos(formData.ulb_id);
      fetchSupervisors(formData.ward_id);
      fetchContractors();
      // Fetch wards filtered by ULB
      if (formData.ulb_id) {
        fetchWards(formData.ulb_id);
      } else {
        fetchWards();
      }
    }
  }, [showAddModal, showEditModal, formData.ulb_id, formData.ward_id]);

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

  const fetchWards = async (ulbId = null) => {
    try {
      const url = ulbId 
        ? `/admin-management/employees/wards?ulb_id=${ulbId}`
        : '/admin-management/employees/wards';
      const response = await api.get(url);
      const data = response?.data;
      // Handle both array response and object with data property
      let wardsList = [];
      if (Array.isArray(data)) {
        wardsList = data;
      } else if (data && Array.isArray(data.data)) {
        wardsList = data.data;
      } else if (data && Array.isArray(data.wards)) {
        wardsList = data.wards;
      }
      
      setAllWards(wardsList);
      // Filter wards based on selected ULB if in form
      if (ulbId && formData.ulb_id === ulbId) {
        setWards(wardsList.filter(w => w.ulb_id === ulbId));
      } else if (!ulbId) {
        setWards(wardsList);
      }
    } catch (error) {
      console.error('Error fetching wards:', error);
      setWards([]);
      setAllWards([]);
    }
  };

  const fetchULBs = async () => {
    try {
      const response = await api.get('/admin-management/ulbs');
      const data = response?.data;
      // Handle both array response and object with data property
      let ulbsList = [];
      if (Array.isArray(data)) {
        ulbsList = data;
      } else if (data && Array.isArray(data.data)) {
        ulbsList = data.data;
      } else if (data && Array.isArray(data.ulbs)) {
        ulbsList = data.ulbs;
      }
      setUlbs(ulbsList);
    } catch (error) {
      console.error('Error fetching ULBs:', error);
      setUlbs([]);
    }
  };

  const fetchEos = async (ulbId = null) => {
    try {
      const url = ulbId
        ? `/admin-management/employees?role=EO&limit=200&ulb_id=${ulbId}`
        : '/admin-management/employees?role=EO&limit=200';
      const res = await api.get(url);
      const employees = res?.data?.employees ?? [];
      // Filter by ULB if provided
      if (ulbId) {
        setEosList(employees.filter(eo => eo.ulb_id === ulbId));
      } else {
        setEosList(employees);
      }
    } catch {
      setEosList([]);
    }
  };
  const fetchSupervisors = async (wardId = null) => {
    try {
      const res = await api.get('/admin-management/employees?role=SUPERVISOR&limit=200');
      const employees = res?.data?.employees ?? [];
      // Filter supervisors by ward if provided
      if (wardId) {
        setSupervisorsList(employees.filter(s => s.ward_id === parseInt(wardId)));
      } else {
        setSupervisorsList(employees);
      }
    } catch {
      setSupervisorsList([]);
    }
  };
  const fetchContractors = async () => {
    try {
      const res = await api.get('/admin-management/employees?role=CONTRACTOR&limit=200');
      setContractorsList(res?.data?.employees ?? []);
    } catch {
      setContractorsList([]);
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
    console.log('📝 Form ward_ids:', formData.ward_ids, 'Type:', typeof formData.ward_ids, 'IsArray:', Array.isArray(formData.ward_ids));

    try {
      // Prepare payload with only required fields - ensure IDs are sent, not names
      // Convert role to uppercase to match database CHECK constraint
      const normalizedRole = formData.role ? formData.role.toUpperCase().replace(/-/g, '_') : formData.role;
      
      const payload = {
        full_name: formData.full_name,
        email: formData.email,
        phone_number: formData.phone_number,
        role: normalizedRole,
        status: formData.status,
        password: formData.password || undefined
      };

      // Add ulb_id (UUID) if present - DO NOT send assigned_ulb (name)
      if (formData.ulb_id) {
        payload.ulb_id = formData.ulb_id;
      }

      // Add ward_ids as array of integers (not names)
      if (formData.ward_ids && Array.isArray(formData.ward_ids) && formData.ward_ids.length > 0) {
        payload.ward_ids = formData.ward_ids.map(id => typeof id === 'string' ? parseInt(id) : id).filter(id => !isNaN(id) && id > 0);
        console.log('📋 Final ward_ids being sent:', payload.ward_ids);
      } else {
        console.warn('⚠️ No ward_ids found in formData:', formData.ward_ids);
      }

      // Add role-specific fields
      if (formData.ward_id) {
        payload.ward_id = typeof formData.ward_id === 'string' ? parseInt(formData.ward_id) : formData.ward_id;
      }
      if (formData.eo_id) {
        payload.eo_id = typeof formData.eo_id === 'string' ? parseInt(formData.eo_id) : formData.eo_id;
      }
      if (formData.supervisor_id) {
        payload.supervisor_id = typeof formData.supervisor_id === 'string' ? parseInt(formData.supervisor_id) : formData.supervisor_id;
      }
      if (formData.contractor_id) {
        payload.contractor_id = typeof formData.contractor_id === 'string' ? parseInt(formData.contractor_id) : formData.contractor_id;
      }
      if (formData.worker_type) {
        payload.worker_type = formData.worker_type;
      }
      if (formData.company_name) {
        payload.company_name = formData.company_name;
      }
      if (formData.contact_details) {
        payload.contact_details = formData.contact_details;
      }

      console.log('📤 Sending payload:', payload);
      console.log('📤 Payload ward_ids:', payload.ward_ids, 'Type:', typeof payload.ward_ids, 'IsArray:', Array.isArray(payload.ward_ids));

      const response = await api.post('/admin-management/employees', payload);

      console.log('✅ API Response:', response.data);

      setGeneratedCredentials(response.data);
      setShowAddModal(false);
      fetchEmployees();
      fetchStatistics();

      setFormData({
        full_name: '',
        role: '',
        phone_number: '',
        email: '',
        ward_ids: [],
        status: 'active',
        password: '',
        assigned_ulb: '',
        ulb_id: '',
        ward_id: '',
        eo_id: '',
        supervisor_id: '',
        contractor_id: '',
        worker_type: '',
        company_name: '',
        contact_details: ''
      });

      // Notify Wards page about ward assignment change
      localStorage.setItem('wardAssignmentUpdated', Date.now().toString());
      localStorage.removeItem('wardAssignmentUpdated');
      window.dispatchEvent(new Event('wardAssignmentUpdated'));
    } catch (error) {
      console.error('❌ Error adding employee:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      toast.error(error.response?.data?.message || 'Error adding employee');
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
      // Prepare payload with only required fields - ensure IDs are sent, not names
      // Convert role to uppercase to match database CHECK constraint
      const normalizedRole = formData.role ? formData.role.toUpperCase().replace(/-/g, '_') : formData.role;
      
      const payload = {
        full_name: formData.full_name,
        email: formData.email,
        phone_number: formData.phone_number,
        role: normalizedRole,
        status: formData.status
      };

      // Add password only if provided
      if (formData.password && formData.password.trim() !== '') {
        payload.password = formData.password;
      }

      // Add ulb_id (UUID) if present - DO NOT send assigned_ulb (name)
      if (formData.ulb_id) {
        payload.ulb_id = formData.ulb_id;
      }

      // Add ward_ids as array of integers (not names)
      if (formData.ward_ids && Array.isArray(formData.ward_ids) && formData.ward_ids.length > 0) {
        payload.ward_ids = formData.ward_ids.map(id => typeof id === 'string' ? parseInt(id) : id);
      }

      // Add role-specific fields
      if (formData.ward_id) {
        payload.ward_id = typeof formData.ward_id === 'string' ? parseInt(formData.ward_id) : formData.ward_id;
      }
      if (formData.eo_id) {
        payload.eo_id = typeof formData.eo_id === 'string' ? parseInt(formData.eo_id) : formData.eo_id;
      }
      if (formData.supervisor_id) {
        payload.supervisor_id = typeof formData.supervisor_id === 'string' ? parseInt(formData.supervisor_id) : formData.supervisor_id;
      }
      if (formData.contractor_id) {
        payload.contractor_id = typeof formData.contractor_id === 'string' ? parseInt(formData.contractor_id) : formData.contractor_id;
      }
      if (formData.worker_type) {
        payload.worker_type = formData.worker_type;
      }
      if (formData.company_name) {
        payload.company_name = formData.company_name;
      }
      if (formData.contact_details) {
        payload.contact_details = formData.contact_details;
      }

      console.log('📤 Sending payload:', payload);

      const response = await api.put(`/admin-management/employees/${selectedEmployee.id}`, payload);

      console.log('✅ Frontend - Update successful:', response.data);

      // Show success message
      if (formData.password && formData.password.trim() !== '') {
        toast.success('Employee updated successfully! Password has been changed.');
      } else {
        toast.success('Employee updated successfully!');
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
        toast.error(errorMessages);
      } else {
        toast.error(error.response?.data?.message || 'Error updating employee');
      }
    }
  };

  const handleDeleteEmployee = async (employeeId) => {
    const ok = await confirm({ title: 'Delete employee', message: 'Are you sure you want to delete this employee?', confirmLabel: 'Delete', variant: 'danger' });
    if (!ok) return;

    try {
      await api.delete(`/admin-management/employees/${employeeId}`);

      fetchEmployees();
      fetchStatistics();
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error(error.response?.data?.message || 'Error deleting employee');
    }
  };

  const handleResetPassword = async (employeeId) => {
    const ok = await confirm({ title: 'Reset password', message: 'Are you sure you want to reset this employee\'s password?', confirmLabel: 'Reset' });
    if (!ok) return;

    try {
      const response = await api.post(`/admin-management/employees/${employeeId}/reset-password`, {});

      toast.success(`Password reset successful. New password: ${response.data.new_password}. Save it securely.`);
      fetchEmployees();
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error(error.response?.data?.message || 'Error resetting password');
    }
  };

  const openEditModal = async (employee) => {
    setSelectedEmployee(employee);
    // Normalize role to uppercase for form
    const normalizedRole = employee.role ? employee.role.toUpperCase().replace(/-/g, '_') : employee.role;
    const formDataUpdate = {
      full_name: employee.full_name,
      role: normalizedRole,
      phone_number: employee.phone_number,
      email: employee.email,
      ward_ids: employee.ward_ids || [],
      status: employee.status,
      password: '',
      assigned_ulb: employee.assigned_ulb || '',
      ulb_id: employee.ulb_id || '',
      ward_id: employee.ward_id || '',
      eo_id: employee.eo_id || '',
      supervisor_id: employee.supervisor_id || '',
      contractor_id: employee.contractor_id || '',
      worker_type: employee.worker_type || '',
      company_name: employee.company_name || '',
      contact_details: employee.contact_details || ''
    };
    setFormData(formDataUpdate);
    
    // Fetch filtered data based on employee's ULB
    if (formDataUpdate.ulb_id) {
      await fetchWards(formDataUpdate.ulb_id);
      await fetchEos(formDataUpdate.ulb_id);
    }
    if (formDataUpdate.ward_id) {
      await fetchSupervisors(formDataUpdate.ward_id);
    }
    
    setShowEditModal(true);
  };

  const openViewModal = (employee) => {
    setSelectedEmployee(employee);
    setShowViewModal(true);
  };

  const getRoleLabel = (role) => {
    const normalizedRole = role ? role.toUpperCase().replace(/-/g, '_') : role;
    const labels = { 
      EO: 'EO', 
      SUPERVISOR: 'Supervisor', 
      FIELD_WORKER: 'Field Worker', 
      CONTRACTOR: 'Contractor',
      CLERK: 'Clerk',
      INSPECTOR: 'Inspector',
      OFFICER: 'Officer',
      COLLECTOR: 'Collector',
      ADMIN: 'Admin'
    };
    return labels[normalizedRole] || (role ? role.charAt(0).toUpperCase() + role.slice(1) : '');
  };
  const getRoleBadgeColor = (role) => {
    const normalizedRole = role ? role.toUpperCase().replace(/-/g, '_') : role;
    const staffColors = {
      CLERK: 'bg-blue-100 text-blue-800',
      INSPECTOR: 'bg-yellow-100 text-yellow-800',
      OFFICER: 'bg-purple-100 text-purple-800',
      COLLECTOR: 'bg-green-100 text-green-800',
      EO: 'bg-indigo-100 text-indigo-800',
      SUPERVISOR: 'bg-teal-100 text-teal-800',
      FIELD_WORKER: 'bg-amber-100 text-amber-800',
      CONTRACTOR: 'bg-slate-100 text-slate-800',
      ADMIN: 'bg-red-100 text-red-800'
    };
    return staffColors[normalizedRole] || 'bg-gray-100 text-gray-800';
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

    const ok = await confirm({ title: 'Delete staff', message: `Are you sure you want to delete ${selectedEmployees.length} staff member(s)?`, confirmLabel: 'Delete', variant: 'danger' });
    if (!ok) return;

    try {
      await api.post('/admin-management/employees/bulk-delete', { employeeIds: selectedEmployees });

      setSelectedEmployees([]);
      setSelectAll(false);
      fetchEmployees();
      fetchStatistics();
    } catch (error) {
      console.error('Error bulk deleting employees:', error);
      toast.error(error.response?.data?.message || 'Error deleting employees');
    }
  };

  const handleBulkStatusChange = async (status) => {
    if (selectedEmployees.length === 0) return;

    const ok = await confirm({ title: 'Update status', message: `Are you sure you want to ${status} ${selectedEmployees.length} staff member(s)?`, confirmLabel: 'Update' });
    if (!ok) return;

    try {
      await api.post('/admin-management/employees/bulk-status-update', { employeeIds: selectedEmployees, status });

      setSelectedEmployees([]);
      setSelectAll(false);
      fetchEmployees();
      fetchStatistics();
    } catch (error) {
      console.error('Error bulk updating employee status:', error);
      toast.error(error.response?.data?.message || 'Error updating employee status');
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Roles</option>
            <option value="CLERK">Clerk</option>
            <option value="INSPECTOR">Inspector</option>
            <option value="OFFICER">Officer</option>
            <option value="COLLECTOR">Collector</option>
            <option value="EO">EO</option>
            <option value="SUPERVISOR">Supervisor</option>
            <option value="FIELD_WORKER">Field Worker</option>
            <option value="CONTRACTOR">Contractor</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-primary-500"
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
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-primary-500"
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
                        {getRoleLabel(employee.role)}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                {/* ULB Dropdown - Mandatory except ADMIN */}
                {formData.role && formData.role.toUpperCase() !== 'ADMIN' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ULB {formData.role.toUpperCase() === 'EO' && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      required={formData.role.toUpperCase() === 'EO'}
                      value={formData.ulb_id || ''}
                      onChange={(e) => {
                        const newUlbId = e.target.value; // This is the UUID from ulb.id
                        setFormData({ 
                          ...formData, 
                          ulb_id: newUlbId, // Store UUID, not name
                          assigned_ulb: '', // Clear name field
                          ward_ids: [],
                          ward_id: '',
                          eo_id: ''
                        });
                        // Reload wards filtered by ULB
                        if (newUlbId) {
                          fetchWards(newUlbId);
                          fetchEos(newUlbId);
                        } else {
                          fetchWards();
                          fetchEos();
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select ULB</option>
                      {ulbs.map(ulb => (
                        <option key={ulb.id} value={ulb.id}>{ulb.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      setFormData({ 
                        ...formData, 
                        role: newRole, 
                        ward_ids: [], 
                        ward_id: '', 
                        eo_id: '', 
                        supervisor_id: '', 
                        contractor_id: '', 
                        assigned_ulb: '', 
                        ulb_id: '',
                        worker_type: '', 
                        company_name: '', 
                        contact_details: '' 
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Role</option>
                    <option value="CLERK">Clerk</option>
                    <option value="INSPECTOR">Inspector</option>
                    <option value="OFFICER">Officer</option>
                    <option value="COLLECTOR">Collector</option>
                    <option value="EO">EO</option>
                    <option value="SUPERVISOR">Supervisor</option>
                    <option value="FIELD_WORKER">Field Worker</option>
                    <option value="CONTRACTOR">Contractor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* EO: Multi-select wards (ULB already selected above) */}
                {formData.role && formData.role.toUpperCase() === 'EO' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Wards <span className="text-red-500">*</span></label>
                      <select
                        multiple
                        required
                        value={formData.ward_ids || []}
                        onChange={(e) => {
                          // Extract all selected ward IDs (integers) from selected options
                          const selectedWardIds = Array.from(e.target.selectedOptions, option => {
                            const wardId = parseInt(option.value);
                            return isNaN(wardId) ? null : wardId;
                          }).filter(id => id !== null);
                          
                          console.log('🔵 Ward selection changed:', {
                            selectedOptions: Array.from(e.target.selectedOptions).map(o => ({ value: o.value, text: o.text })),
                            selectedWardIds,
                            previousWardIds: formData.ward_ids
                          });
                          
                          setFormData({ ...formData, ward_ids: selectedWardIds });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        disabled={!formData.ulb_id}
                        size={Math.min(wards.filter(w => !formData.ulb_id || w.ulb_id === formData.ulb_id).length, 6)}
                      >
                        {wards
                          .filter(w => !formData.ulb_id || w.ulb_id === formData.ulb_id)
                          .filter((ward, index, self) => 
                            ward && ward.id && index === self.findIndex(w => w.id === ward.id)
                          )
                          .map(ward => (
                            <option key={ward.id} value={ward.id}>{ward.wardNumber} - {ward.wardName}</option>
                          ))}
                      </select>
                    <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple wards</p>
                    {!formData.ulb_id && <p className="text-xs text-red-500 mt-1">Please select ULB first</p>}
                  </div>
                )}

                {/* SUPERVISOR: Ward + EO (ULB auto-selected from ward) */}
                {formData.role && formData.role.toUpperCase() === 'SUPERVISOR' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ward <span className="text-red-500">*</span></label>
                      <select
                        required
                        value={formData.ward_id}
                        onChange={async (e) => {
                          const wardId = e.target.value ? parseInt(e.target.value) : '';
                          const selectedWard = allWards.find(w => w.id === wardId);
                          const wardUlbId = selectedWard?.ulb_id;
                          
                          setFormData({ 
                            ...formData, 
                            ward_id: wardId,
                            ulb_id: wardUlbId || formData.ulb_id,
                            eo_id: '' // Reset EO when ward changes
                          });
                          
                          // Reload EOs filtered by ULB
                          if (wardUlbId) {
                            await fetchEos(wardUlbId);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">Select Ward</option>
                        {allWards
                          .filter((ward, index, self) => 
                            ward && ward.id && index === self.findIndex(w => w.id === ward.id)
                          )
                          .map(ward => (
                            <option key={ward.id} value={ward.id}>
                              {ward.wardNumber} - {ward.wardName}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">EO <span className="text-red-500">*</span></label>
                      <select
                        required
                        value={formData.eo_id}
                        onChange={(e) => setFormData({ ...formData, eo_id: e.target.value ? parseInt(e.target.value) : '' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        disabled={!formData.ulb_id}
                      >
                        <option value="">Select EO</option>
                        {eosList.filter(eo => !formData.ulb_id || eo.ulb_id === formData.ulb_id).map(eo => (
                          <option key={eo.id} value={eo.id}>{eo.employee_id} - {eo.full_name}</option>
                        ))}
                      </select>
                      {!formData.ulb_id && <p className="text-xs text-red-500 mt-1">Please select ward first</p>}
                    </div>
                  </>
                )}

                {/* FIELD_WORKER: Worker Type, Ward, Supervisor, Contractor (optional) - ULB auto-selected from ward */}
                {formData.role && formData.role.toUpperCase() === 'FIELD_WORKER' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Worker Type <span className="text-red-500">*</span></label>
                      <select
                        required
                        value={formData.worker_type}
                        onChange={(e) => setFormData({ ...formData, worker_type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">Select Type</option>
                        <option value="ULB">ULB</option>
                        <option value="CONTRACTUAL">CONTRACTUAL</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ward <span className="text-red-500">*</span></label>
                      <select
                        required
                        value={formData.ward_id}
                        onChange={async (e) => {
                          const wardId = e.target.value ? parseInt(e.target.value) : '';
                          const selectedWard = allWards.find(w => w.id === wardId);
                          const wardUlbId = selectedWard?.ulb_id;
                          
                          setFormData({ 
                            ...formData, 
                            ward_id: wardId,
                            ulb_id: wardUlbId || formData.ulb_id,
                            supervisor_id: '' // Reset supervisor when ward changes
                          });
                          
                          // Reload supervisors filtered by ward
                          if (wardId) {
                            await fetchSupervisors(wardId);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">Select Ward</option>
                        {allWards
                          .filter((ward, index, self) => 
                            ward && ward.id && index === self.findIndex(w => w.id === ward.id)
                          )
                          .map(ward => (
                            <option key={ward.id} value={ward.id}>
                              {ward.wardNumber} - {ward.wardName}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor <span className="text-red-500">*</span></label>
                      <select
                        required
                        value={formData.supervisor_id}
                        onChange={(e) => setFormData({ ...formData, supervisor_id: e.target.value ? parseInt(e.target.value) : '' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        disabled={!formData.ward_id}
                      >
                        <option value="">Select Supervisor</option>
                        {supervisorsList.filter(s => !formData.ward_id || s.ward_id === formData.ward_id).map(s => (
                          <option key={s.id} value={s.id}>{s.employee_id} - {s.full_name}</option>
                        ))}
                      </select>
                      {!formData.ward_id && <p className="text-xs text-red-500 mt-1">Please select ward first</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contractor (optional)</label>
                      <select
                        value={formData.contractor_id}
                        onChange={(e) => setFormData({ ...formData, contractor_id: e.target.value ? parseInt(e.target.value) : '' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">None</option>
                        {contractorsList.map(c => (
                          <option key={c.id} value={c.id}>{c.company_name || c.employee_id} - {c.full_name}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* CONTRACTOR: Company name, Contact details */}
                {formData.role && formData.role.toUpperCase() === 'CONTRACTOR' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={formData.company_name}
                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Details <span className="text-red-500">*</span></label>
                      <textarea
                        required
                        value={formData.contact_details}
                        onChange={(e) => setFormData({ ...formData, contact_details: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </>
                )}

                {/* Clerk, Inspector, Officer, Collector: single ward */}
                {formData.role && ['CLERK', 'INSPECTOR', 'OFFICER', 'COLLECTOR'].includes(formData.role.toUpperCase()) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ward Assignment</label>
                    <select
                      required={formData.role && formData.role.toUpperCase() === 'CLERK'}
                      value={formData.ward_ids && formData.ward_ids.length > 0 ? formData.ward_ids[0] : ''}
                      onChange={(e) => setFormData({ ...formData, ward_ids: e.target.value ? [parseInt(e.target.value)] : [] })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select Ward</option>
                      {wards.map(ward => (
                        <option key={ward.id} value={ward.id}>{ward.wardNumber} - {ward.wardName}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                {/* ULB Dropdown - Mandatory except ADMIN */}
                {formData.role && formData.role.toUpperCase() !== 'ADMIN' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ULB {formData.role.toUpperCase() === 'EO' && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      required={formData.role.toUpperCase() === 'EO'}
                      value={formData.ulb_id || ''}
                      onChange={(e) => {
                        const newUlbId = e.target.value; // This is the UUID from ulb.id
                        setFormData({ 
                          ...formData, 
                          ulb_id: newUlbId, // Store UUID, not name
                          assigned_ulb: '', // Clear name field
                          ward_ids: [],
                          ward_id: '',
                          eo_id: ''
                        });
                        // Reload wards filtered by ULB
                        if (newUlbId) {
                          fetchWards(newUlbId);
                          fetchEos(newUlbId);
                        } else {
                          fetchWards();
                          fetchEos();
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select ULB</option>
                      {ulbs.map(ulb => (
                        <option key={ulb.id} value={ulb.id}>{ulb.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => {
                      const newRole = e.target.value;
                      setFormData({ 
                        ...formData, 
                        role: newRole,
                        ward_ids: [],
                        ward_id: '',
                        eo_id: '',
                        supervisor_id: '',
                        ulb_id: (newRole && (newRole.toUpperCase() === 'SUPERVISOR' || newRole.toUpperCase() === 'FIELD_WORKER')) ? formData.ulb_id : ''
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Role</option>
                    <option value="CLERK">Clerk</option>
                    <option value="INSPECTOR">Inspector</option>
                    <option value="OFFICER">Officer</option>
                    <option value="COLLECTOR">Collector</option>
                    <option value="EO">EO</option>
                    <option value="SUPERVISOR">Supervisor</option>
                    <option value="FIELD_WORKER">Field Worker</option>
                    <option value="CONTRACTOR">Contractor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                {formData.role && formData.role.toUpperCase() === 'EO' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Wards</label>
                    <select
                      multiple
                      value={formData.ward_ids || []}
                      onChange={(e) => {
                        // Extract all selected ward IDs (integers) from selected options
                        const selectedWardIds = Array.from(e.target.selectedOptions, option => {
                          const wardId = parseInt(option.value);
                          return isNaN(wardId) ? null : wardId;
                        }).filter(id => id !== null);
                        
                        console.log('🔵 Ward selection changed (edit):', {
                          selectedOptions: Array.from(e.target.selectedOptions).map(o => ({ value: o.value, text: o.text })),
                          selectedWardIds,
                          previousWardIds: formData.ward_ids
                        });
                        
                        setFormData({ ...formData, ward_ids: selectedWardIds });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      disabled={!formData.ulb_id}
                      size={Math.min(wards.filter(w => !formData.ulb_id || w.ulb_id === formData.ulb_id).length, 6)}
                    >
                      {wards
                        .filter(w => !formData.ulb_id || w.ulb_id === formData.ulb_id)
                        .filter((ward, index, self) => 
                          ward && ward.id && index === self.findIndex(w => w.id === ward.id)
                        )
                        .map(ward => (
                          <option key={ward.id} value={ward.id}>{ward.wardNumber} - {ward.wardName}</option>
                        ))}
                    </select>
                    {!formData.ulb_id && <p className="text-xs text-red-500 mt-1">Please select ULB first</p>}
                  </div>
                )}
                {formData.role && formData.role.toUpperCase() === 'SUPERVISOR' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ward</label>
                      <select
                        value={formData.ward_id}
                        onChange={async (e) => {
                          const wardId = e.target.value ? parseInt(e.target.value) : '';
                          const selectedWard = allWards.find(w => w.id === wardId);
                          const wardUlbId = selectedWard?.ulb_id;
                          
                          setFormData({ 
                            ...formData, 
                            ward_id: wardId,
                            ulb_id: wardUlbId || formData.ulb_id,
                            eo_id: ''
                          });
                          
                          if (wardUlbId) {
                            await fetchEos(wardUlbId);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">Select Ward</option>
                        {allWards.map(ward => (
                          <option key={ward.id} value={ward.id}>{ward.wardNumber} - {ward.wardName}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">EO</label>
                      <select
                        value={formData.eo_id}
                        onChange={(e) => setFormData({ ...formData, eo_id: e.target.value ? parseInt(e.target.value) : '' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        disabled={!formData.ulb_id}
                      >
                        <option value="">Select EO</option>
                        {eosList.filter(eo => !formData.ulb_id || eo.ulb_id === formData.ulb_id).map(eo => (
                          <option key={eo.id} value={eo.id}>{eo.employee_id} - {eo.full_name}</option>
                        ))}
                      </select>
                      {!formData.ulb_id && <p className="text-xs text-red-500 mt-1">Please select ward first</p>}
                    </div>
                  </>
                )}
                {formData.role && formData.role.toUpperCase() === 'FIELD_WORKER' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Worker Type</label>
                      <select
                        value={formData.worker_type}
                        onChange={(e) => setFormData({ ...formData, worker_type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">Select Type</option>
                        <option value="ULB">ULB</option>
                        <option value="CONTRACTUAL">CONTRACTUAL</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ward</label>
                      <select
                        value={formData.ward_id}
                        onChange={async (e) => {
                          const wardId = e.target.value ? parseInt(e.target.value) : '';
                          const selectedWard = allWards.find(w => w.id === wardId);
                          const wardUlbId = selectedWard?.ulb_id;
                          
                          setFormData({ 
                            ...formData, 
                            ward_id: wardId,
                            ulb_id: wardUlbId || formData.ulb_id,
                            supervisor_id: ''
                          });
                          
                          if (wardId) {
                            await fetchSupervisors(wardId);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">Select Ward</option>
                        {allWards
                          .filter((ward, index, self) => 
                            ward && ward.id && index === self.findIndex(w => w.id === ward.id)
                          )
                          .map(ward => (
                            <option key={ward.id} value={ward.id}>
                              {ward.wardNumber} - {ward.wardName}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor</label>
                      <select
                        value={formData.supervisor_id}
                        onChange={(e) => setFormData({ ...formData, supervisor_id: e.target.value ? parseInt(e.target.value) : '' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        disabled={!formData.ward_id}
                      >
                        <option value="">Select Supervisor</option>
                        {supervisorsList.filter(s => !formData.ward_id || s.ward_id === formData.ward_id).map(s => (
                          <option key={s.id} value={s.id}>{s.employee_id} - {s.full_name}</option>
                        ))}
                      </select>
                      {!formData.ward_id && <p className="text-xs text-red-500 mt-1">Please select ward first</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contractor (optional)</label>
                      <select
                        value={formData.contractor_id}
                        onChange={(e) => setFormData({ ...formData, contractor_id: e.target.value ? parseInt(e.target.value) : '' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">None</option>
                        {contractorsList.map(c => (
                          <option key={c.id} value={c.id}>{c.company_name || c.employee_id} - {c.full_name}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
                {formData.role && formData.role.toUpperCase() === 'CONTRACTOR' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                      <input
                        type="text"
                        value={formData.company_name}
                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Details</label>
                      <textarea
                        value={formData.contact_details}
                        onChange={(e) => setFormData({ ...formData, contact_details: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </>
                )}
                {formData.role && ['CLERK', 'INSPECTOR', 'OFFICER', 'COLLECTOR'].includes(formData.role.toUpperCase()) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ward Assignment</label>
                    <select
                      value={formData.ward_ids && formData.ward_ids.length > 0 ? formData.ward_ids[0] : ''}
                      onChange={(e) => setFormData({ ...formData, ward_ids: e.target.value ? [parseInt(e.target.value)] : [] })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select Ward</option>
                      {wards
                        .filter((ward, index, self) => 
                          ward && ward.id && index === self.findIndex(w => w.id === ward.id)
                        )
                        .map(ward => (
                          <option key={ward.id} value={ward.id}>{ward.wardNumber} - {ward.wardName}</option>
                        ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-text"
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
                  {getRoleLabel(selectedEmployee.role)}
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
                    : selectedEmployee.ward ? `${selectedEmployee.ward.wardNumber} - ${selectedEmployee.ward.wardName}` : 'No wards assigned'}
                </p>
              </div>
              {selectedEmployee.role && selectedEmployee.role.toUpperCase() === 'EO' && selectedEmployee.assigned_ulb && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Assigned ULB</label>
                  <p className="text-gray-900">{selectedEmployee.assigned_ulb}</p>
                </div>
              )}
              {selectedEmployee.role && selectedEmployee.role.toUpperCase() === 'SUPERVISOR' && selectedEmployee.eo && (
                <div>
                  <label className="text-sm font-medium text-gray-700">EO</label>
                  <p className="text-gray-900">{selectedEmployee.eo.full_name} ({selectedEmployee.eo.employee_id})</p>
                </div>
              )}
              {selectedEmployee.role && selectedEmployee.role.toUpperCase() === 'FIELD_WORKER' && (
                <>
                  {selectedEmployee.worker_type && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Worker Type</label>
                      <p className="text-gray-900">{selectedEmployee.worker_type}</p>
                    </div>
                  )}
                  {selectedEmployee.supervisor && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Supervisor</label>
                      <p className="text-gray-900">{selectedEmployee.supervisor.full_name} ({selectedEmployee.supervisor.employee_id})</p>
                    </div>
                  )}
                  {selectedEmployee.contractor && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Contractor</label>
                      <p className="text-gray-900">{selectedEmployee.contractor.full_name} {selectedEmployee.contractor.company_name && `- ${selectedEmployee.contractor.company_name}`}</p>
                    </div>
                  )}
                </>
              )}
              {selectedEmployee.role && selectedEmployee.role.toUpperCase() === 'CONTRACTOR' && (
                <>
                  {selectedEmployee.company_name && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Company Name</label>
                      <p className="text-gray-900">{selectedEmployee.company_name}</p>
                    </div>
                  )}
                  {selectedEmployee.contact_details && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Contact Details</label>
                      <p className="text-gray-900 whitespace-pre-wrap">{selectedEmployee.contact_details}</p>
                    </div>
                  )}
                </>
              )}
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
