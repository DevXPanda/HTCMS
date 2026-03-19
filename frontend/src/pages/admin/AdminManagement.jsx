import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Users, Search, Filter, Edit, Trash2, Eye, RefreshCw, Shield, CheckSquare, Square } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useConfirm } from '../../components/ConfirmModal';
import { useSelectedUlb } from '../../contexts/SelectedUlbContext';
import { formatDateIST, formatDateTimeIST } from '../../utils/dateUtils';

// Active roles for new staff. Deprecated roles (kept for future use): Clerk, Inspector, Officer, Contractor.
const ACTIVE_ROLES = [
  { value: 'EO', label: 'EO' },
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'COLLECTOR', label: 'Collector' },
  { value: 'FIELD_WORKER', label: 'Field Worker' },
  { value: 'SFI', label: 'SFI (Sanitary & Food Inspector)' },
  { value: 'ACCOUNT_OFFICER', label: 'Account Officer' }
];
// SBM only for Super Admin (global monitoring, default read-only)
const SBM_ROLE = { value: 'SBM', label: 'SBM (Global Monitoring)' };
const DEPRECATED_ROLE_VALUES = ['CLERK', 'INSPECTOR', 'OFFICER', 'CONTRACTOR'];
// Supervisor assigned modules (stored as values: toilet, mrf, gaushala)
const SUPERVISOR_MODULES = [
  { value: 'toilet', label: 'Toilet Management' },
  { value: 'mrf', label: 'MRF' },
  { value: 'gaushala', label: 'Gau Shala' }
];
// SFI can only be assigned Toilet, MRF, Gaushala (Worker Management is not assignable for SFI)
const SFI_MODULES = [
  { value: 'toilet', label: 'Toilet Management' },
  { value: 'mrf', label: 'MRF' },
  { value: 'gaushala', label: 'Gau Shala' }
];
// Map backend assigned_modules (any format) to SFI_MODULES values for edit form
function normalizeAssignedModulesForForm(raw) {
  if (Array.isArray(raw)) raw = raw.map(m => (m != null ? String(m).trim() : '')).filter(Boolean);
  else if (typeof raw === 'string') raw = raw.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
  else raw = [];
  const values = SFI_MODULES.map(s => s.value);
  const byValue = new Map(values.map(v => [v.toLowerCase(), v]));
  const byLabel = new Map(SFI_MODULES.map(s => [s.label.toLowerCase(), s.value]));
  return raw.map(m => {
    const lower = m.toLowerCase();
    return byValue.get(lower) || byLabel.get(lower) || (values.includes(lower) ? lower : null);
  }).filter(Boolean);
}
const WORKER_TYPE_OPTIONS = [
  { value: 'ULB', label: 'ULB' },
  { value: 'CONTRACTUAL', label: 'Contractual' },
  { value: 'SWEEPING', label: 'Sweeping' },
  { value: 'TOILET', label: 'Toilet' },
  { value: 'MRF', label: 'MRF' },
  { value: 'CLEANING', label: 'Cleaning' },
  { value: 'DRAINAGE', label: 'Drainage' },
  { value: 'SOLID_WASTE', label: 'Solid Waste' },
  { value: 'ROAD_MAINTENANCE', label: 'Road Maintenance' },
  { value: 'OTHER', label: 'Other' }
];

const AdminManagement = () => {
  const location = useLocation();
  const isSfiStaffView = location.pathname.startsWith('/sfi/staff-management');
  const { confirm } = useConfirm();
  const { effectiveUlbId, isSuperAdmin, selectedUlbId, setSelectedUlbId } = useSelectedUlb();
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
    contact_details: '',
    assigned_modules: [],
    sbm_full_crud: false
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
  }, [currentPage, filterRole, filterStatus, searchTerm, effectiveUlbId]);

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

  // When Edit modal opens, ensure ULBs are loaded so dropdown has data
  useEffect(() => {
    if (showEditModal && ulbs.length === 0) {
      fetchULBs();
    }
  }, [showEditModal]);

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
      if (effectiveUlbId) params.append('ulb_id', effectiveUlbId);
      // SFI staff-management page: show only supervisors, not all staff (including SFI)
      if (isSfiStaffView) params.set('role', 'SUPERVISOR');

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
      // When ulbId provided, set wards to that ULB only (so Edit modal has correct list)
      if (ulbId != null && String(ulbId).trim() !== '') {
        setWards(wardsList.filter(w => String(w.ulb_id) === String(ulbId)));
      } else {
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
      const params = new URLSearchParams();
      if (effectiveUlbId) params.append('ulb_id', effectiveUlbId);
      if (isSfiStaffView) params.append('role', 'SUPERVISOR');
      const qs = params.toString() ? `?${params.toString()}` : '';
      const response = await api.get(`/admin-management/employees/statistics${qs}`);
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
      if (normalizedRole === 'SUPERVISOR' && formData.assigned_modules && Array.isArray(formData.assigned_modules)) {
        payload.assigned_modules = formData.assigned_modules;
      }
      if (normalizedRole === 'SBM' && formData.sbm_full_crud !== undefined) {
        payload.sbm_full_crud = Boolean(formData.sbm_full_crud);
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
        contact_details: '',
        assigned_modules: [],
        sbm_full_crud: false
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
      if (normalizedRole === 'SUPERVISOR' && formData.assigned_modules !== undefined) {
        payload.assigned_modules = Array.isArray(formData.assigned_modules) ? formData.assigned_modules : [];
      }
      if (normalizedRole === 'SFI' && formData.assigned_modules !== undefined) {
        payload.assigned_modules = Array.isArray(formData.assigned_modules) ? formData.assigned_modules : [];
      }
      if (normalizedRole === 'SBM' && formData.sbm_full_crud !== undefined) {
        payload.sbm_full_crud = Boolean(formData.sbm_full_crud);
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
    // Ward IDs: ensure numbers so dropdown/chips work; support ward_ids or single ward_id
    const rawWardIds = (employee.ward_ids && employee.ward_ids.length > 0)
      ? employee.ward_ids
      : (employee.ward_id ? [employee.ward_id] : []);
    const initialWardIds = rawWardIds.map(id => parseInt(id, 10)).filter(n => !isNaN(n));
    // Assigned modules: normalize so checkboxes match SFI_MODULES (handles array, string, any casing/label)
    const initialModules = normalizeAssignedModulesForForm(employee.assigned_modules);
    const formDataUpdate = {
      full_name: employee.full_name,
      role: normalizedRole,
      phone_number: employee.phone_number,
      email: employee.email,
      ward_ids: initialWardIds,
      status: employee.status,
      password: '',
      assigned_ulb: employee.assigned_ulb || '',
      ulb_id: employee.ulb_id || '',
      ward_id: employee.ward_id || (initialWardIds[0] ?? ''),
      eo_id: employee.eo_id || '',
      supervisor_id: employee.supervisor_id || '',
      contractor_id: employee.contractor_id || '',
      worker_type: employee.worker_type || '',
      company_name: employee.company_name || '',
      contact_details: employee.contact_details || '',
      assigned_modules: initialModules,
      sbm_full_crud: Boolean(employee.full_crud_enabled)
    };
    setFormData(formDataUpdate);

    // Ensure ULBs and wards are loaded so dropdowns show data (fixes empty ULB dropdown in Edit)
    await fetchULBs();
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
      SFI: 'SFI (Sanitary & Food Inspector)',
      CLERK: 'Clerk',
      INSPECTOR: 'Inspector',
      OFFICER: 'Officer',
      COLLECTOR: 'Collector',
      ADMIN: 'Admin',
      SBM: 'SBM (Global Monitoring)',
      ACCOUNT_OFFICER: 'Account Officer'
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
      SFI: 'bg-cyan-100 text-cyan-800',
      ADMIN: 'bg-red-100 text-red-800',
      SBM: 'bg-violet-100 text-violet-800',
      ACCOUNT_OFFICER: 'bg-indigo-100 text-indigo-800'
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
      const msg = error.response?.data?.message || 'Error deleting employees';
      const hint = error.response?.data?.hint;
      toast.error(hint ? `${msg} ${hint}` : msg);
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
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="ds-page-title">Staff Management</h1>
          <p className="ds-page-subtitle">Manage system staff and their access</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowAddModal(true);
            if (isSfiStaffView) {
              setFormData(prev => ({
                ...prev,
                role: 'SUPERVISOR',
                ulb_id: effectiveUlbId || prev.ulb_id,
                ward_ids: [],
                assigned_modules: []
              }));
            }
          }}
          className="btn btn-primary flex items-center"
        >
          <Plus className="w-4 h-4" />
          {isSfiStaffView ? 'Add Supervisor' : 'Add Staff'}
        </button>
      </div>

      {/* ULB filter for super admin: filter staff by selected ULB */}
      {isSuperAdmin && (
        <div className="card-flat mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <label className="label mb-0">Filter by ULB:</label>
            </div>
            <select
              value={selectedUlbId}
              onChange={(e) => setSelectedUlbId(e.target.value)}
              className="input max-w-xs"
            >
              <option value="">All ULBs</option>
              {ulbs.map((ulb) => (
                <option key={ulb.id} value={ulb.id}>{ulb.name}</option>
              ))}
            </select>
            {selectedUlbId && (
              <button
                type="button"
                onClick={() => setSelectedUlbId('')}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Staff</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.total}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">{statistics.active}</p>
              </div>
              <Shield className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Inactive</p>
                <p className="text-2xl font-bold text-red-600">{statistics.inactive}</p>
              </div>
              <Shield className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <div className="card">
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
      <div className="card mb-6">
        <form onSubmit={(e) => { e.preventDefault(); fetchEmployees(); }} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name, email, phone, or employee ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          {!isSfiStaffView && (
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="input w-auto min-w-[140px]"
            >
              <option value="">All Roles</option>
              <option value="COLLECTOR">Collector</option>
              <option value="EO">EO</option>
              <option value="SUPERVISOR">Supervisor</option>
              <option value="FIELD_WORKER">Field Worker</option>
              <option value="SFI">SFI</option>
              <option value="ACCOUNT_OFFICER">Account Officer</option>
            </select>
          )}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input w-auto min-w-[120px]"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button
            type="button"
            onClick={() => { setSearchTerm(''); setFilterRole(''); setFilterStatus(''); }}
            className="btn btn-secondary flex items-center"
          >
            <RefreshCw className="w-4 h-4" />
            Reset
          </button>
        </form>
      </div>

      {/* Bulk Actions Bar */}
      {selectedEmployees.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-900">
            {selectedEmployees.length} staff member{selectedEmployees.length !== 1 ? 's' : ''} selected
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => handleBulkStatusChange('activate')} className="btn btn-success btn-sm flex items-center">
              <Shield className="w-4 h-4" />
              Activate
            </button>
            <button type="button" onClick={() => handleBulkStatusChange('deactivate')} className="btn btn-sm flex items-center px-3 py-2 bg-amber-600 text-white hover:bg-amber-700 rounded text-sm">
              <Shield className="w-4 h-4" />
              Deactivate
            </button>
            <button type="button" onClick={handleBulkDelete} className="btn btn-danger btn-sm flex items-center">
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
            <button type="button" onClick={() => { setSelectedEmployees([]); setSelectAll(false); }} className="btn btn-secondary btn-sm flex items-center">
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Employees Table */}
      <div className="card p-0">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th className="w-12">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    {/* <span>Select All</span> */}
                  </div>
                </th>
                <th>Employee</th>
                <th>Role</th>
                <th>Contact</th>
                <th>Wards</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-8">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
                    </div>
                  </td>
                </tr>
              ) : (Array.isArray(employees) ? employees : []).length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500">
                    No staff members found
                  </td>
                </tr>
              ) : (
                (Array.isArray(employees) ? employees : []).map((employee) => (
                  <tr key={employee.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(employee.id)}
                        onChange={() => handleSelectEmployee(employee.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                    </td>
                    <td>
                      <div className="font-medium text-gray-900">{employee.full_name}</div>
                      <div className="text-xs text-gray-500">{employee.employee_id}</div>
                    </td>
                    <td>
                      <span className={`badge ${getRoleBadgeColor(employee.role)}`}>
                        {getRoleLabel(employee.role)}
                      </span>
                    </td>
                    <td>
                      <div className="text-sm text-gray-900">{employee.email}</div>
                      <div className="text-xs text-gray-500">{employee.phone_number}</div>
                    </td>
                    <td>
                      <div className="text-sm text-gray-900">
                        {employee.ward_names && employee.ward_names.length > 0
                          ? employee.ward_names.join(', ')
                          : 'No wards assigned'}
                      </div>
                    </td>
                    <td>
                      <span className={employee.status === 'active' ? 'badge badge-success' : 'badge badge-danger'}>
                        {employee.status ? employee.status.charAt(0).toUpperCase() + employee.status.slice(1) : ''}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" onClick={() => openViewModal(employee)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => openEditModal(employee)} className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors" title="Edit">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => handleResetPassword(employee.id)} className="p-2 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors" title="Reset Password">
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => handleDeleteEmployee(employee.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete">
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
          <div className="px-4 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Page {currentPage} of {totalPages ?? 1}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="btn btn-secondary btn-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages ?? 1))}
                  disabled={currentPage === (totalPages ?? 1)}
                  className="btn btn-secondary btn-sm disabled:opacity-50"
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  {isSfiStaffView ? (
                    <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                      Supervisor
                    </div>
                  ) : (
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
                          contact_details: '',
                          assigned_modules: [],
                          sbm_full_crud: newRole.toUpperCase() === 'SBM' ? formData.sbm_full_crud : false
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select Role</option>
                      {ACTIVE_ROLES.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                      {isSuperAdmin && (
                        <option value={SBM_ROLE.value}>{SBM_ROLE.label}</option>
                      )}
                    </select>
                  )}
                </div>
                {/* ULB - shown below Role (mandatory for EO, SFI, SUPERVISOR, SBM, ACCOUNT_OFFICER) */}
                {formData.role && formData.role.toUpperCase() !== 'ADMIN' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ULB {(formData.role.toUpperCase() === 'EO' || formData.role.toUpperCase() === 'SFI' || formData.role.toUpperCase() === 'SUPERVISOR' || formData.role.toUpperCase() === 'SBM' || formData.role.toUpperCase() === 'ACCOUNT_OFFICER') && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      required={formData.role.toUpperCase() === 'EO' || formData.role.toUpperCase() === 'SFI' || formData.role.toUpperCase() === 'SUPERVISOR' || formData.role.toUpperCase() === 'SBM' || formData.role.toUpperCase() === 'ACCOUNT_OFFICER'}
                      value={formData.ulb_id || ''}
                      onChange={(e) => {
                        const newUlbId = e.target.value;
                        setFormData({
                          ...formData,
                          ulb_id: newUlbId,
                          assigned_ulb: '',
                          ward_ids: [],
                          ward_id: '',
                          eo_id: ''
                        });
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

                {/* SBM only (Super Admin): optional full CRUD toggle */}
                {formData.role && formData.role.toUpperCase() === 'SBM' && isSuperAdmin && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.sbm_full_crud || false}
                        onChange={(e) => setFormData({ ...formData, sbm_full_crud: e.target.checked })}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm font-medium text-gray-800">Enable full CRUD permissions</span>
                    </label>
                    <p className="text-xs text-amber-800 mt-1">By default SBM has read-only access. Enable to allow create/edit/delete across modules.</p>
                  </div>
                )}

                {/* EO / SFI: Dropdown to add wards + chips for selected (EO required; SFI optional). */}
                {formData.role && (formData.role.toUpperCase() === 'EO' || formData.role.toUpperCase() === 'SFI') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assigned Wards
                      {formData.role.toUpperCase() === 'EO' && <span className="text-red-500"> *</span>}
                      {formData.role.toUpperCase() === 'SFI' && <span className="text-gray-500 text-xs ml-1">(restricts all module data to these wards)</span>}
                    </label>
                    <select
                      value=""
                      onChange={(e) => {
                        const wardId = e.target.value ? parseInt(e.target.value) : null;
                        if (wardId && !isNaN(wardId)) {
                          const current = formData.ward_ids || [];
                          if (!current.includes(wardId)) setFormData({ ...formData, ward_ids: [...current, wardId] });
                        }
                        e.target.value = '';
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      disabled={!formData.ulb_id}
                    >
                      <option value="">Select ward to add...</option>
                      {wards
                        .filter(w => !formData.ulb_id || String(w.ulb_id) === String(formData.ulb_id))
                        .filter((ward, index, self) =>
                          ward && ward.id && index === self.findIndex(w => w.id === ward.id)
                        )
                        .filter(ward => !(formData.ward_ids || []).includes(ward.id))
                        .map(ward => (
                          <option key={ward.id} value={ward.id}>{ward.wardNumber} - {ward.wardName}</option>
                        ))}
                    </select>
                    {(formData.ward_ids || []).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(formData.ward_ids || []).map(wardId => {
                          const ward = wards.find(w => w.id === wardId);
                          return ward ? (
                            <span
                              key={wardId}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary-100 text-primary-800 text-sm"
                            >
                              {ward.wardNumber} - {ward.wardName}
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, ward_ids: (formData.ward_ids || []).filter(id => id !== wardId) })}
                                className="text-primary-600 hover:text-primary-800 font-bold"
                                aria-label="Remove ward"
                              >
                                ×
                              </button>
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                    {!formData.ulb_id && <p className="text-xs text-red-500 mt-1">Please select ULB first</p>}
                  </div>
                )}

                {/* SUPERVISOR: ULB required, Assigned Wards (multi) filtered by ULB, Assigned Modules (checkboxes) */}
                {formData.role && formData.role.toUpperCase() === 'SUPERVISOR' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Assigned Wards <span className="text-red-500">*</span>
                        <span className="text-gray-500 text-xs ml-1">(filtered by ULB above)</span>
                      </label>
                      <select
                        value=""
                        onChange={(e) => {
                          const wardId = e.target.value ? parseInt(e.target.value) : null;
                          if (wardId && !isNaN(wardId)) {
                            const current = formData.ward_ids || [];
                            if (!current.includes(wardId)) setFormData({ ...formData, ward_ids: [...current, wardId] });
                          }
                          e.target.value = '';
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        disabled={!formData.ulb_id}
                      >
                        <option value="">Select ward to add...</option>
                        {wards
                          .filter(w => formData.ulb_id && String(w.ulb_id) === String(formData.ulb_id))
                          .filter(ward => !(formData.ward_ids || []).includes(ward.id))
                          .map(ward => (
                            <option key={ward.id} value={ward.id}>{ward.wardNumber} - {ward.wardName}</option>
                          ))}
                      </select>
                      {(formData.ward_ids || []).length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {(formData.ward_ids || []).map(wardId => {
                            const ward = wards.find(w => w.id === wardId);
                            return ward ? (
                              <span
                                key={wardId}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary-100 text-primary-800 text-sm"
                              >
                                {ward.wardNumber} - {ward.wardName}
                                <button
                                  type="button"
                                  onClick={() => setFormData({ ...formData, ward_ids: (formData.ward_ids || []).filter(id => id !== wardId) })}
                                  className="text-primary-600 hover:text-primary-800 font-bold"
                                  aria-label="Remove ward"
                                >
                                  ×
                                </button>
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                      {!formData.ulb_id && <p className="text-xs text-red-500 mt-1">Please select ULB first</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Modules (optional)</label>
                      <p className="text-xs text-gray-500 mb-1">Supervisor will see filtered data for these modules only.</p>
                      <div className="flex flex-wrap gap-3">
                        {SUPERVISOR_MODULES.map(({ value, label }) => (
                          <label key={value} className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={(formData.assigned_modules || []).includes(value)}
                              onChange={(e) => {
                                const current = formData.assigned_modules || [];
                                const next = e.target.checked ? [...current, value] : current.filter(m => m !== value);
                                setFormData({ ...formData, assigned_modules: next });
                              }}
                              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                            />
                            <span className="text-sm text-gray-700">{label}</span>
                          </label>
                        ))}
                      </div>
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
                        {WORKER_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
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

                {/* SFI: Optional Supervisor, Optional Assigned Modules */}
                {formData.role && formData.role.toUpperCase() === 'SFI' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor (optional)</label>
                      <select
                        value={formData.supervisor_id || ''}
                        onChange={(e) => setFormData({ ...formData, supervisor_id: e.target.value ? parseInt(e.target.value) : '' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">None</option>
                        {supervisorsList
                          .filter(s => !formData.ulb_id || String(s.ulb_id) === String(formData.ulb_id))
                          .map(s => (
                            <option key={s.id} value={s.id}>{s.full_name} ({s.employee_id})</option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Modules (optional)</label>
                      <div className="flex flex-wrap gap-3">
                        {SFI_MODULES.map(({ value, label }) => (
                          <label key={value} className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={(formData.assigned_modules || []).includes(value)}
                              onChange={(e) => {
                                const current = formData.assigned_modules || [];
                                const next = e.target.checked ? [...current, value] : current.filter(m => m !== value);
                                setFormData({ ...formData, assigned_modules: next });
                              }}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm text-gray-700">{label}</span>
                          </label>
                        ))}
                      </div>
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
                        ulb_id: (newRole && (newRole.toUpperCase() === 'SUPERVISOR' || newRole.toUpperCase() === 'FIELD_WORKER' || newRole.toUpperCase() === 'SFI' || newRole.toUpperCase() === 'SBM' || newRole.toUpperCase() === 'ACCOUNT_OFFICER')) ? formData.ulb_id : '',
                        assigned_modules: (newRole && newRole.toUpperCase() === 'SUPERVISOR') ? (formData.assigned_modules || []) : (newRole && newRole.toUpperCase() === 'SFI' ? (formData.assigned_modules || []) : [])
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Role</option>
                    {(() => {
                      const normalizedCurrent = (selectedEmployee?.role || '').toUpperCase().replace(/-/g, '_');
                      const options = [...ACTIVE_ROLES];
                      if (isSuperAdmin) options.push(SBM_ROLE);
                      if (selectedEmployee && DEPRECATED_ROLE_VALUES.includes(normalizedCurrent)) {
                        const label = (selectedEmployee.role || '').replace(/_/g, ' ');
                        if (!options.some(o => o.value === normalizedCurrent)) {
                          options.push({ value: normalizedCurrent, label });
                        }
                      }
                      return options.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                      ));
                    })()}
                  </select>
                </div>
                {/* ULB - shown below Role (mandatory for EO, SFI, SUPERVISOR, SBM, ACCOUNT_OFFICER) */}
                {formData.role && formData.role.toUpperCase() !== 'ADMIN' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ULB {(formData.role.toUpperCase() === 'EO' || formData.role.toUpperCase() === 'SFI' || formData.role.toUpperCase() === 'SUPERVISOR' || formData.role.toUpperCase() === 'SBM' || formData.role.toUpperCase() === 'ACCOUNT_OFFICER') && <span className="text-red-500">*</span>}
                    </label>
                    <select
                      required={formData.role.toUpperCase() === 'EO' || formData.role.toUpperCase() === 'SFI' || formData.role.toUpperCase() === 'SUPERVISOR' || formData.role.toUpperCase() === 'SBM' || formData.role.toUpperCase() === 'ACCOUNT_OFFICER'}
                      value={formData.ulb_id || ''}
                      onChange={(e) => {
                        const newUlbId = e.target.value;
                        setFormData({
                          ...formData,
                          ulb_id: newUlbId,
                          assigned_ulb: '',
                          ward_ids: [],
                          ward_id: '',
                          eo_id: ''
                        });
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
                {formData.role && formData.role.toUpperCase() === 'SBM' && isSuperAdmin && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.sbm_full_crud || false}
                        onChange={(e) => setFormData({ ...formData, sbm_full_crud: e.target.checked })}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm font-medium text-gray-800">Enable full CRUD permissions</span>
                    </label>
                    <p className="text-xs text-amber-800 mt-1">When enabled, SBM can create/edit/delete across modules; otherwise read-only.</p>
                  </div>
                )}
                {(formData.role && (formData.role.toUpperCase() === 'EO' || formData.role.toUpperCase() === 'SFI' || formData.role.toUpperCase() === 'SUPERVISOR')) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Wards {(formData.role.toUpperCase() === 'SFI' || formData.role.toUpperCase() === 'SUPERVISOR') && <span className="text-gray-500 text-xs">(filtered by ULB)</span>}</label>
                    <select
                      value=""
                      onChange={(e) => {
                        const wardId = e.target.value ? parseInt(e.target.value) : null;
                        if (wardId && !isNaN(wardId)) {
                          const current = formData.ward_ids || [];
                          if (!current.includes(wardId)) setFormData({ ...formData, ward_ids: [...current, wardId] });
                        }
                        e.target.value = '';
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      disabled={!formData.ulb_id}
                    >
                      <option value="">Select ward to add...</option>
                      {wards
                        .filter(w => !formData.ulb_id || String(w.ulb_id) === String(formData.ulb_id))
                        .filter((ward, index, self) =>
                          ward && ward.id && index === self.findIndex(w => w.id === ward.id)
                        )
                        .filter(ward => !(formData.ward_ids || []).includes(ward.id))
                        .map(ward => (
                          <option key={ward.id} value={ward.id}>{ward.wardNumber} - {ward.wardName}</option>
                        ))}
                    </select>
                    {(formData.ward_ids || []).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(formData.ward_ids || []).map(wardId => {
                          const ward = allWards.find(w => w.id === wardId) || wards.find(w => w.id === wardId);
                          return ward ? (
                            <span
                              key={wardId}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary-100 text-primary-800 text-sm"
                            >
                              {ward.wardNumber} - {ward.wardName}
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, ward_ids: (formData.ward_ids || []).filter(id => id !== wardId) })}
                                className="text-primary-600 hover:text-primary-800 font-bold"
                                aria-label="Remove ward"
                              >
                                ×
                              </button>
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                    {!formData.ulb_id && <p className="text-xs text-red-500 mt-1">Please select ULB first</p>}
                  </div>
                )}
                {formData.role && formData.role.toUpperCase() === 'SUPERVISOR' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Modules (optional)</label>
                    <p className="text-xs text-gray-500 mb-1">Supervisor will see filtered data for these modules only.</p>
                    <div className="flex flex-wrap gap-3">
                      {SUPERVISOR_MODULES.map(({ value, label }) => (
                        <label key={value} className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={(formData.assigned_modules || []).includes(value)}
                            onChange={(e) => {
                              const current = formData.assigned_modules || [];
                              const next = e.target.checked ? [...current, value] : current.filter(m => m !== value);
                              setFormData({ ...formData, assigned_modules: next });
                            }}
                            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
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
                        {WORKER_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
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
                {formData.role && formData.role.toUpperCase() === 'SFI' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor (optional)</label>
                      <select
                        value={formData.supervisor_id || ''}
                        onChange={(e) => setFormData({ ...formData, supervisor_id: e.target.value ? parseInt(e.target.value) : '' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">None</option>
                        {supervisorsList
                          .filter(s => !formData.ulb_id || String(s.ulb_id) === String(formData.ulb_id))
                          .map(s => (
                            <option key={s.id} value={s.id}>{s.full_name} ({s.employee_id})</option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Modules (optional)</label>
                      <div className="flex flex-wrap gap-3">
                        {SFI_MODULES.map(({ value, label }) => (
                          <label key={value} className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={(formData.assigned_modules || []).includes(value)}
                              onChange={(e) => {
                                const current = formData.assigned_modules || [];
                                const next = e.target.checked ? [...current, value] : current.filter(m => m !== value);
                                setFormData({ ...formData, assigned_modules: next });
                              }}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="text-sm text-gray-700">{label}</span>
                          </label>
                        ))}
                      </div>
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
                <label className="text-sm font-medium text-gray-700">ULB</label>
                <p className="text-gray-900">
                  {ulbs.find(u => u.id === selectedEmployee.ulb_id)?.name || selectedEmployee.assigned_ulb || '—'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Assigned Wards</label>
                <p className="text-gray-900">
                  {selectedEmployee.ward_names && selectedEmployee.ward_names.length > 0
                    ? selectedEmployee.ward_names.join(', ')
                    : selectedEmployee.ward ? `${selectedEmployee.ward.wardNumber} - ${selectedEmployee.ward.wardName}` : 'No wards assigned'}
                </p>
              </div>
              {selectedEmployee.role && selectedEmployee.role.toUpperCase() === 'SUPERVISOR' && selectedEmployee.eo && (
                <div>
                  <label className="text-sm font-medium text-gray-700">EO</label>
                  <p className="text-gray-900">{selectedEmployee.eo.full_name} ({selectedEmployee.eo.employee_id})</p>
                </div>
              )}
              {selectedEmployee.role && selectedEmployee.role.toUpperCase() === 'SUPERVISOR' && (selectedEmployee.assigned_modules?.length > 0) && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Department Assigned</label>
                  <p className="text-gray-900">
                    {selectedEmployee.assigned_modules?.[0] ? (SUPERVISOR_MODULES.find(s => s.value === selectedEmployee.assigned_modules[0])?.label || selectedEmployee.assigned_modules[0]) : '—'}
                  </p>
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
              {selectedEmployee.role && selectedEmployee.role.toUpperCase() === 'SFI' && (
                <>
                  {selectedEmployee.supervisor && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Supervisor</label>
                      <p className="text-gray-900">{selectedEmployee.supervisor.full_name} ({selectedEmployee.supervisor.employee_id})</p>
                    </div>
                  )}
                  {(selectedEmployee.assigned_modules?.length > 0) && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Assigned Modules</label>
                      <p className="text-gray-900">
                        {selectedEmployee.assigned_modules.map(m => SFI_MODULES.find(s => s.value === m)?.label || (m === 'worker_management' ? 'Worker Mgmt' : m)).join(', ')}
                      </p>
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
                <p className="text-gray-900">{formatDateIST(selectedEmployee.created_at)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Last Login</label>
                <p className="text-gray-900">
                  {selectedEmployee.last_login ? formatDateTimeIST(selectedEmployee.last_login) : 'Never logged in'}
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
