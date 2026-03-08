import { useState, useEffect } from 'react';
import { userAPI, wardAPI } from '../../../services/api';
import api from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { Plus, X, Eye, Pencil, Trash2, Filter } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useSelectedUlb } from '../../../contexts/SelectedUlbContext';

const Users = () => {
  const { isAdmin } = useAuth();
  const { effectiveUlbId, isSuperAdmin, selectedUlbId, setSelectedUlbId } = useSelectedUlb();
  const [users, setUsers] = useState([]);
  const [wards, setWards] = useState([]);
  const [ulbs, setUlbs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    role: 'citizen',
    isActive: true
  });
  const [editData, setEditData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    role: 'citizen',
    isActive: true
  });
  const [submitting, setSubmitting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchWards();
  }, [effectiveUlbId]);

  useEffect(() => {
    api.get('/admin-management/ulbs').then((res) => {
      const data = res.data?.data ?? res.data;
      setUlbs(Array.isArray(data) ? data : (data?.ulbs || []));
    }).catch(() => setUlbs([]));
  }, []);

  useEffect(() => {
    const allSelected = users.length > 0 && selectedUsers.length === users.length;
    setSelectAll(allSelected);
  }, [users.length, selectedUsers.length]);

  const fetchWards = async () => {
    try {
      const params = { isActive: true };
      if (effectiveUlbId) params.ulb_id = effectiveUlbId;
      const response = await wardAPI.getAll(params);
      setWards(response.data.data.wards);
    } catch (error) {
      toast.error('Failed to fetch wards');
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = { limit: 100, isActive: true, role: 'citizen' };
      if (effectiveUlbId) params.ulb_id = effectiveUlbId;
      const response = await userAPI.getAll(params);
      setUsers(response.data.data.users);
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = { ...formData, role: 'citizen' };
      if (effectiveUlbId) payload.ulb_id = effectiveUlbId;
      await userAPI.create(payload);
      toast.success('Citizen created successfully!');
      setShowModal(false);
      setFormData({
        firstName: '',
        lastName: '',
        username: '',
        email: '',
        phone: '',
        password: '',
        role: 'citizen',
        isActive: true
      });
      fetchUsers(); // Refresh the user list
    } catch (error) {
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadge = (role) => {
    const badges = {
      admin: 'badge-danger',
      assessor: 'badge-info',
      cashier: 'badge-success',
      tax_collector: 'badge-warning',
      collector: 'badge-warning',
      citizen: 'badge-info',
      clerk: 'badge-purple'
    };
    return badges[role] || 'badge-info';
  };

  const openViewModal = (user) => {
    setSelectedUser(user);
    setShowViewModal(true);
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      username: user.username || '',
      email: user.email || '',
      phone: user.phone || '',
      password: '',
      role: (user.role || 'citizen').toLowerCase(),
      isActive: user.isActive !== false
    });
    setShowEditModal(true);
  };

  const handleEditInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setUpdating(true);
    try {
      const payload = {
        firstName: editData.firstName,
        lastName: editData.lastName,
        username: editData.username,
        email: editData.email,
        phone: editData.phone || null,
        role: 'citizen',
        isActive: editData.isActive
      };
      if (editData.password && editData.password.trim()) payload.password = editData.password;
      await userAPI.update(selectedUser.id, payload);
      toast.success('User updated successfully');
      setShowEditModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to update user');
    } finally {
      setUpdating(false);
    }
  };

  const handleSelectUser = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers([]);
      setSelectAll(false);
    } else {
      setSelectedUsers(users.map(u => u.id));
      setSelectAll(true);
    }
  };

  const clearSelection = () => {
    setSelectedUsers([]);
    setSelectAll(false);
  };

  const openDeleteModal = (user) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const openBulkDeleteModal = () => {
    if (selectedUsers.length === 0) return;
    setShowBulkDeleteModal(true);
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedUsers.length === 0) return;
    setBulkDeleting(true);
    try {
      await Promise.all(selectedUsers.map(id => userAPI.delete(id)));
      toast.success(`${selectedUsers.length} user(s) deleted successfully`);
      setShowBulkDeleteModal(false);
      clearSelection();
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to delete some users');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    setDeletingId(userToDelete.id);
    try {
      await userAPI.delete(userToDelete.id);
      toast.success('User deleted successfully');
      setShowDeleteModal(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to delete user');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="ds-page-title">Citizen Management</h1>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Citizen
        </button>
      </div>

      {/* ULB filter for super admin: filter citizens by selected ULB */}
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

      {isAdmin && selectedUsers.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-800">
            {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={clearSelection} className="btn btn-secondary text-sm">
              Clear selection
            </button>
            <button type="button" onClick={openBulkDeleteModal} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium flex items-center">
              <Trash2 className="w-4 h-4 mr-1" />
              Delete selected
            </button>
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              {isAdmin && (
                <th className="w-12">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-primary-500"
                    title="Select all"
                  />
                </th>
              )}
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Username</th>
              <th>Role</th>
              <th>Status</th>
              {isAdmin && <th className="text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 8 : 6} className="text-center py-8 text-gray-500">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  {isAdmin && (
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleSelectUser(user.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                    </td>
                  )}
                  <td>
                    {user.firstName} {user.lastName}
                  </td>
                  <td>{user.email}</td>
                  <td>{user.phone || '—'}</td>
                  <td>{user.username}</td>
                  <td>
                    <span className={`badge ${getRoleBadge(user.role)} capitalize`}>
                      {user.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <span className={user.isActive ? 'badge badge-success' : 'badge badge-danger'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openViewModal(user)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(user)}
                          className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteModal(user)}
                          disabled={deletingId === user.id}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="modal-title">Add New Citizen</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="John"
                  />
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="johndoe"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g. 9876543210"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  minLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Minimum 6 characters"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                  Active User
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Creating...' : 'Create Citizen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View User Modal */}
      {showViewModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="modal-title">User Details</h2>
              <button
                onClick={() => { setShowViewModal(false); setSelectedUser(null); }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <p><span className="text-gray-500 text-sm">Name:</span> {selectedUser.firstName} {selectedUser.lastName}</p>
              <p><span className="text-gray-500 text-sm">Email:</span> {selectedUser.email}</p>
              <p><span className="text-gray-500 text-sm">Username:</span> {selectedUser.username}</p>
              <p><span className="text-gray-500 text-sm">Phone number:</span> {selectedUser.phone || '—'}</p>
              <p><span className="text-gray-500 text-sm">Role:</span> <span className={`badge ${getRoleBadge(selectedUser.role)} capitalize`}>{selectedUser.role?.replace('_', ' ')}</span></p>
              <p><span className="text-gray-500 text-sm">ULB:</span> {ulbs.find(u => u.id === selectedUser.ulb_id)?.name || '—'}</p>
              <p><span className="text-gray-500 text-sm">Status:</span> <span className={selectedUser.isActive ? 'badge badge-success' : 'badge badge-danger'}>{selectedUser.isActive ? 'Active' : 'Inactive'}</span></p>
            </div>
            <div className="p-6 border-t flex justify-end gap-2">
              <button type="button" onClick={() => { setShowViewModal(false); setSelectedUser(null); }} className="btn btn-secondary">Close</button>
              <button type="button" onClick={() => { setShowViewModal(false); openEditModal(selectedUser); }} className="btn btn-primary flex items-center"><Pencil className="w-4 h-4 mr-1" /> Edit</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="modal-title">Edit User</h2>
              <button onClick={() => { setShowEditModal(false); setSelectedUser(null); }} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input type="text" name="firstName" value={editData.firstName} onChange={handleEditInputChange} required className="input w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input type="text" name="lastName" value={editData.lastName} onChange={handleEditInputChange} required className="input w-full" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                <input type="text" name="username" value={editData.username} onChange={handleEditInputChange} required className="input w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" name="email" value={editData.email} onChange={handleEditInputChange} required className="input w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
                <input type="tel" name="phone" value={editData.phone} onChange={handleEditInputChange} className="input w-full" placeholder="e.g. 9876543210" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password <span className="text-gray-400 text-xs">(leave blank to keep current)</span></label>
                <input type="password" name="password" value={editData.password} onChange={handleEditInputChange} className="input w-full" placeholder="Leave blank to keep" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <p className="text-sm text-gray-600">Citizen</p>
              </div>
              <div className="flex items-center">
                <input type="checkbox" name="isActive" checked={editData.isActive} onChange={handleEditInputChange} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-primary-500" />
                <label className="ml-2 text-sm text-gray-700">Active User</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowEditModal(false); setSelectedUser(null); }} className="flex-1 btn btn-secondary">Cancel</button>
                <button type="submit" disabled={updating} className="flex-1 btn btn-primary">{updating ? 'Updating...' : 'Update User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Delete User</h2>
                <p className="text-sm text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete <span className="font-medium text-gray-900">{userToDelete.firstName} {userToDelete.lastName}</span>?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setShowDeleteModal(false); setUserToDelete(null); }}
                className="flex-1 btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deletingId === userToDelete.id}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {deletingId === userToDelete.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk delete confirmation modal */}
      {showBulkDeleteModal && selectedUsers.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Delete users</h2>
                <p className="text-sm text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete <span className="font-medium text-gray-900">{selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''}</span>?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                className="flex-1 btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDeleteConfirm}
                disabled={bulkDeleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {bulkDeleting ? 'Deleting...' : 'Delete all'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
