import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../services/api';
import { propertyAPI, wardAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { Plus, Search, Eye, Edit, Filter, X, Download, ArrowRightLeft } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useSelectedUlb } from '../../../contexts/SelectedUlbContext';
import { exportToCSV } from '../../../utils/exportCSV';

const Properties = () => {
  const { effectiveUlbId, isSuperAdmin } = useSelectedUlb();
  const { isAdmin, isAssessor } = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    wardId: '',
    propertyType: '',
    usageType: '',
    status: '',
    constructionType: ''
  });
  const [wards, setWards] = useState([]);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferPropertyRow, setTransferPropertyRow] = useState(null);
  const [ulbs, setUlbs] = useState([]);
  const [transferTargetUlbId, setTransferTargetUlbId] = useState('');
  const [transferTargetWardId, setTransferTargetWardId] = useState('');
  const [transferWards, setTransferWards] = useState([]);
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    fetchWards();
  }, [effectiveUlbId]);

  useEffect(() => {
    fetchProperties();
  }, [search, filters, effectiveUlbId]);

  useEffect(() => {
    if (showTransferModal && isSuperAdmin && ulbs.length === 0) {
      api.get('/admin-management/ulbs').then((res) => {
        if (res.data && Array.isArray(res.data)) setUlbs(res.data);
      }).catch(() => toast.error('Failed to load ULBs'));
    }
  }, [showTransferModal, isSuperAdmin, ulbs.length]);

  useEffect(() => {
    if (!transferTargetUlbId) {
      setTransferWards([]);
      setTransferTargetWardId('');
      return;
    }
    wardAPI.getAll({ ulb_id: transferTargetUlbId }).then((res) => {
      const list = res.data?.data?.wards ?? [];
      setTransferWards(list);
      setTransferTargetWardId('');
    }).catch(() => setTransferWards([]));
  }, [transferTargetUlbId]);

  const idsToTransfer = transferPropertyRow ? [transferPropertyRow.id] : Array.from(selectedIds);

  const openTransferModal = (property) => {
    setTransferPropertyRow(property || null);
    setTransferTargetUlbId('');
    setTransferTargetWardId('');
    setTransferWards([]);
    setShowTransferModal(true);
  };

  const openTransferModalForSelected = () => {
    if (selectedIds.size === 0) return;
    setTransferPropertyRow(null);
    setTransferTargetUlbId('');
    setTransferTargetWardId('');
    setTransferWards([]);
    setShowTransferModal(true);
  };

  const closeTransferModal = () => {
    setShowTransferModal(false);
    setTransferPropertyRow(null);
    setTransferTargetUlbId('');
    setTransferTargetWardId('');
    setTransferWards([]);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === properties.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(properties.map(p => p.id)));
    }
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (idsToTransfer.length === 0 || !transferTargetUlbId) {
      toast.error('Select target ULB');
      return;
    }
    setTransferSubmitting(true);
    const payload = {
      targetUlbId: transferTargetUlbId,
      ...(transferTargetWardId ? { targetWardId: parseInt(transferTargetWardId, 10) } : {})
    };
    try {
      await Promise.all(idsToTransfer.map(id => propertyAPI.transfer(id, payload)));
      const n = idsToTransfer.length;
      toast.success(n === 1 ? 'Property transferred successfully.' : `${n} properties transferred successfully. Target ULB admins can assign or change wards.`);
      setSelectedIds(new Set());
      closeTransferModal();
      fetchProperties();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transfer failed');
    } finally {
      setTransferSubmitting(false);
    }
  };

  const fetchWards = async () => {
    try {
      const params = effectiveUlbId ? { ulb_id: effectiveUlbId } : {};
      const response = await wardAPI.getAll(params);
      setWards(response.data.data.wards);
    } catch (error) {
      console.error('Failed to fetch wards');
    }
  };

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const params = {
        search,
        limit: 10000,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== '')),
        ...(effectiveUlbId ? { ulb_id: effectiveUlbId } : {})
      };
      const response = await propertyAPI.getAll(params);
      setProperties(response.data.data.properties);
    } catch (error) {
      toast.error('Failed to fetch properties');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      wardId: '',
      propertyType: '',
      usageType: '',
      status: '',
      constructionType: ''
    });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProperties();
  };

  const handleExport = async () => {
    try {
      const params = {
        page: 1,
        limit: 5000,
        search,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== '')),
        ...(effectiveUlbId ? { ulb_id: effectiveUlbId } : {})
      };
      const response = await propertyAPI.getAll(params);
      const list = response.data.data.properties || [];
      const rows = list.map(p => ({
        propertyId: p.uniqueCode || p.propertyNumber,
        address: p.address,
        ward: p.ward?.wardName,
        propertyType: p.propertyType,
        usageType: p.usageType,
        area: p.area,
        constructionType: p.constructionType,
        status: p.status
      }));
      exportToCSV(rows, `properties_${new Date().toISOString().slice(0, 10)}`);
      toast.success('Export downloaded');
    } catch (err) {
      toast.error('Export failed');
    }
  };

  if (loading && !properties.length) return <Loading />;

  return (
    <div>
      <div className="ds-page-header">
        <h1 className="ds-page-title">Properties</h1>
        <div className="flex flex-wrap gap-2">
          {(isAdmin || isAssessor) && (
            <Link to="/properties/new" className="btn btn-primary flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              Add Property
            </Link>
          )}
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
          {isSuperAdmin && selectedIds.size > 0 && (
            <button
              type="button"
              onClick={openTransferModalForSelected}
              className="btn btn-primary flex items-center bg-amber-600 hover:bg-amber-700"
            >
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Transfer selected ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative min-w-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Property ID, address, owner name, or city..."
              className="input pl-10 w-full"
            />
          </div>
          <button type="submit" className="btn btn-primary w-full sm:w-auto shrink-0">
            Search
          </button>
        </div>
      </form>

      {/* Filters */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="label">Ward</label>
              <select
                value={filters.wardId}
                onChange={(e) => handleFilterChange('wardId', e.target.value)}
                className="input"
              >
                <option value="">All Wards</option>
                {wards.map(ward => (
                  <option key={ward.id} value={ward.id}>
                    {ward.wardNumber} - {ward.wardName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Property Type</label>
              <select
                value={filters.propertyType}
                onChange={(e) => handleFilterChange('propertyType', e.target.value)}
                className="input"
              >
                <option value="">All Types</option>
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="industrial">Industrial</option>
                <option value="agricultural">Agricultural</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>

            <div>
              <label className="label">Usage Type</label>
              <select
                value={filters.usageType}
                onChange={(e) => handleFilterChange('usageType', e.target.value)}
                className="input"
              >
                <option value="">All Usage</option>
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="industrial">Industrial</option>
                <option value="agricultural">Agricultural</option>
                <option value="mixed">Mixed</option>
                <option value="institutional">Institutional</option>
              </select>
            </div>

            <div>
              <label className="label">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="input"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
                <option value="disputed">Disputed</option>
              </select>
            </div>

            <div>
              <label className="label">Construction</label>
              <select
                value={filters.constructionType}
                onChange={(e) => handleFilterChange('constructionType', e.target.value)}
                className="input"
              >
                <option value="">All</option>
                <option value="RCC">RCC</option>
                <option value="Pucca">Pucca</option>
                <option value="Semi-Pucca">Semi-Pucca</option>
                <option value="Kutcha">Kutcha</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Properties Table */}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {isSuperAdmin && (
                <th className="w-10">
                  <input
                    type="checkbox"
                    checked={properties.length > 0 && selectedIds.size === properties.length}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    title="Select all"
                  />
                </th>
              )}
              <th>Property ID</th>
              <th>Address</th>
              <th>Ward</th>
              <th>Type</th>
              <th>Owner</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {properties.length === 0 ? (
              <tr>
                <td colSpan={isSuperAdmin ? 8 : 7} className="text-center py-8 text-gray-500">
                  No properties found
                </td>
              </tr>
            ) : (
              properties.map((property) => (
                <tr key={property.id}>
                  {isSuperAdmin && (
                    <td className="w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(property.id)}
                        onChange={() => toggleSelect(property.id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                  )}
                  <td className="font-medium">{property.uniqueCode || property.propertyNumber}</td>
                  <td className="max-w-xs truncate">{property.address}</td>
                  <td>{property.ward?.wardName || 'N/A'}</td>
                  <td>
                    <span className="badge badge-info capitalize">
                      {property.propertyType}
                    </span>
                  </td>
                  <td>
                    {property.ownerName || `${property.owner?.firstName} ${property.owner?.lastName}`}
                  </td>
                  <td>
                    <span className={`badge ${property.status === 'active' ? 'badge-success' :
                      property.status === 'pending' ? 'badge-warning' :
                        property.status === 'disputed' ? 'badge-danger' :
                          'badge-info'
                      } capitalize`}>
                      {property.status || 'active'}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/properties/${property.id}`}
                        className="text-primary-600 hover:text-primary-700 flex items-center"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      {(isAdmin || isAssessor) && (
                        <Link
                          to={`/properties/${property.id}/edit`}
                          className="text-green-600 hover:text-green-700 flex items-center"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                      )}
                      {isSuperAdmin && (
                        <button
                          type="button"
                          onClick={() => openTransferModal(property)}
                          className="text-amber-600 hover:text-amber-700 flex items-center"
                          title="Transfer to another ULB"
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Transfer to ULB Modal (Super Admin only) */}
      {showTransferModal && idsToTransfer.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={closeTransferModal}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {idsToTransfer.length === 1 ? 'Transfer property to another ULB' : `Transfer ${idsToTransfer.length} properties to another ULB`}
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {idsToTransfer.length === 1 && transferPropertyRow ? (
                <>Property <strong>{transferPropertyRow.uniqueCode || transferPropertyRow.propertyNumber}</strong> will be moved to the selected ULB. Target ULB admins can then assign or change the ward.</>
              ) : (
                <><strong>{idsToTransfer.length} properties</strong> will be moved to the selected ULB. Target ULB admins can then assign or change wards.</>
              )}
            </p>
            <form onSubmit={handleTransferSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="label">Target ULB</label>
                  <select
                    value={transferTargetUlbId}
                    onChange={(e) => setTransferTargetUlbId(e.target.value)}
                    className="input w-full"
                    required
                  >
                    <option value="">Select ULB</option>
                    {ulbs.map((ulb) => (
                      <option key={ulb.id} value={ulb.id}>{ulb.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Target Ward (optional)</label>
                  <select
                    value={transferTargetWardId}
                    onChange={(e) => setTransferTargetWardId(e.target.value)}
                    className="input w-full"
                    disabled={!transferTargetUlbId}
                  >
                    <option value="">First available ward</option>
                    {transferWards.map((w) => (
                      <option key={w.id} value={w.id}>{w.wardNumber} - {w.wardName}</option>
                    ))}
                  </select>
                  {transferTargetUlbId && transferWards.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">No wards in this ULB. Create wards in the target ULB first.</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={closeTransferModal} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={transferSubmitting}>
                  {transferSubmitting ? 'Transferring…' : 'Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pagination removed */}
    </div>
  );
};

export default Properties;
