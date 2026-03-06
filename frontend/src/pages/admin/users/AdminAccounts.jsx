import { useState, useEffect } from 'react';
import { userAPI } from '../../../services/api';
import api from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { Plus, X, Eye, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useSelectedUlb } from '../../../contexts/SelectedUlbContext';

const AdminAccounts = () => {
  const { isAdmin } = useAuth();
  const { effectiveUlbId, isSuperAdmin } = useSelectedUlb();
  const [users, setUsers] = useState([]);
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
    ulb_id: '',
    isActive: true
  });
  const [editData, setEditData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    isActive: true
  });
  const [submitting, setSubmitting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  useEffect(() => {
    fetchUsers();
    if (isSuperAdmin) fetchUlbs();
  }, [effectiveUlbId, isSuperAdmin]);

  const fetchUlbs = async () => {
    try {
      const response = await api.get('/admin-management/ulbs');
      const data = response.data?.data ?? response.data;
      setUlbs(Array.isArray(data) ? data : (data?.ulbs || []));
    } catch (error) {
      toast.error('Failed to fetch ULBs');
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = { limit: 100, isActive: true, role: 'admin' };
      // Only filter by ULB for non–super-admin; super admin sees all admin accounts
      if (!isSuperAdmin && effectiveUlbId) params.ulb_id = effectiveUlbId;
      const response = await userAPI.getAll(params);
      setUsers(response.data?.data?.users ?? response.data?.users ?? []);
    } catch (error) {
      toast.error('Failed to fetch admin accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        role: 'admin',
        ulb_id: formData.ulb_id || effectiveUlbId || undefined
      };
      if (!payload.ulb_id && !isSuperAdmin) {
        toast.error('Please select an ULB for the admin.');
        setSubmitting(false);
        return;
      }
      await userAPI.create(payload);
      toast.success('Admin account created successfully');
      setShowModal(false);
      setFormData({ firstName: '', lastName: '', username: '', email: '', phone: '', password: '', ulb_id: '', isActive: true });
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to create admin');
    } finally {
      setSubmitting(false);
    }
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
        role: 'admin',
        isActive: editData.isActive
      };
      if (editData.password?.trim()) payload.password = editData.password;
      await userAPI.update(selectedUser.id, payload);
      toast.success('Admin updated successfully');
      setShowEditModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to update admin');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    setDeletingId(userToDelete.id);
    try {
      await userAPI.delete(userToDelete.id);
      toast.success('Admin account deleted');
      setShowDeleteModal(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to delete admin');
    } finally {
      setDeletingId(null);
    }
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
      isActive: user.isActive !== false
    });
    setShowEditModal(true);
  };

  if (loading && users.length === 0) return <Loading />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="ds-page-title">Admin Management</h1>
        {isAdmin && (
          <button onClick={() => setShowModal(true)} className="btn btn-primary flex items-center">
            <Plus className="w-4 h-4 mr-2" />
            Add Admin
          </button>
        )}
      </div>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Username</th>
              <th>Status</th>
              {isAdmin && <th className="text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="text-center py-8 text-gray-500">
                  No admin accounts found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td>{user.firstName} {user.lastName}</td>
                  <td>{user.email}</td>
                  <td>{user.phone || '—'}</td>
                  <td>{user.username}</td>
                  <td>
                    <span className={user.isActive ? 'badge badge-success' : 'badge badge-danger'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={() => { setSelectedUser(user); setShowViewModal(true); }} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded" title="View"><Eye className="w-4 h-4" /></button>
                        <button type="button" onClick={() => openEditModal(user)} className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded" title="Edit"><Pencil className="w-4 h-4" /></button>
                        <button type="button" onClick={() => { setUserToDelete(user); setShowDeleteModal(true); }} disabled={deletingId === user.id} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Admin Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="modal-title">Add New Admin</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} required className="input w-full" placeholder="John" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} required className="input w-full" placeholder="Doe" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                <input type="text" name="username" value={formData.username} onChange={handleInputChange} required className="input w-full" placeholder="johndoe" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} required className="input w-full" placeholder="john@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="input w-full" placeholder="e.g. 9876543210" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input type="password" name="password" value={formData.password} onChange={handleInputChange} required minLength={6} className="input w-full" placeholder="Minimum 6 characters" />
              </div>
              {isSuperAdmin && ulbs.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign to ULB *</label>
                  <select name="ulb_id" value={formData.ulb_id} onChange={handleInputChange} required className="input w-full">
                    <option value="">Select ULB</option>
                    {ulbs.map((ulb) => (
                      <option key={ulb.id} value={ulb.id}>{ulb.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex items-center">
                <input type="checkbox" id="isActive" name="isActive" checked={formData.isActive} onChange={handleInputChange} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-primary-500" />
                <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">Active User</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn btn-secondary">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 btn btn-primary">{submitting ? 'Creating...' : 'Create Admin'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="modal-title">Admin Details</h2>
              <button onClick={() => { setShowViewModal(false); setSelectedUser(null); }} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 space-y-3">
              <p><span className="text-gray-500 text-sm">Name:</span> {selectedUser.firstName} {selectedUser.lastName}</p>
              <p><span className="text-gray-500 text-sm">Email:</span> {selectedUser.email}</p>
              <p><span className="text-gray-500 text-sm">Username:</span> {selectedUser.username}</p>
              <p><span className="text-gray-500 text-sm">Phone:</span> {selectedUser.phone || '—'}</p>
              <p><span className="text-gray-500 text-sm">Role:</span> Admin</p>
              <p><span className="text-gray-500 text-sm">Status:</span> <span className={selectedUser.isActive ? 'badge badge-success' : 'badge badge-danger'}>{selectedUser.isActive ? 'Active' : 'Inactive'}</span></p>
            </div>
            <div className="p-6 border-t flex justify-end gap-2">
              <button type="button" onClick={() => { setShowViewModal(false); setSelectedUser(null); }} className="btn btn-secondary">Close</button>
              <button type="button" onClick={() => { setShowViewModal(false); openEditModal(selectedUser); }} className="btn btn-primary flex items-center"><Pencil className="w-4 h-4 mr-1" /> Edit</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="modal-title">Edit Admin</h2>
              <button onClick={() => { setShowEditModal(false); setSelectedUser(null); }} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label><input type="text" name="firstName" value={editData.firstName} onChange={(e) => setEditData(prev => ({ ...prev, firstName: e.target.value }))} required className="input w-full" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label><input type="text" name="lastName" value={editData.lastName} onChange={(e) => setEditData(prev => ({ ...prev, lastName: e.target.value }))} required className="input w-full" /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Username *</label><input type="text" name="username" value={editData.username} onChange={(e) => setEditData(prev => ({ ...prev, username: e.target.value }))} required className="input w-full" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Email *</label><input type="email" name="email" value={editData.email} onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))} required className="input w-full" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input type="tel" name="phone" value={editData.phone} onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))} className="input w-full" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">New password (leave blank to keep)</label><input type="password" name="password" value={editData.password} onChange={(e) => setEditData(prev => ({ ...prev, password: e.target.value }))} className="input w-full" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Role</label><p className="text-sm text-gray-600">Admin</p></div>
              <div className="flex items-center">
                <input type="checkbox" name="isActive" checked={editData.isActive} onChange={(e) => setEditData(prev => ({ ...prev, isActive: e.target.checked }))} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-primary-500" />
                <label className="ml-2 text-sm text-gray-700">Active User</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowEditModal(false); setSelectedUser(null); }} className="flex-1 btn btn-secondary">Cancel</button>
                <button type="submit" disabled={updating} className="flex-1 btn btn-primary">{updating ? 'Updating...' : 'Update Admin'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Delete Admin</h2>
            <p className="text-gray-600 mb-4">Are you sure you want to delete {userToDelete.firstName} {userToDelete.lastName}? This cannot be undone.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowDeleteModal(false); setUserToDelete(null); }} className="flex-1 btn btn-secondary">Cancel</button>
              <button type="button" onClick={handleDeleteConfirm} disabled={deletingId === userToDelete.id} className="flex-1 btn bg-red-600 hover:bg-red-700 text-white">{deletingId === userToDelete.id ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAccounts;
