import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { shopTaxAssessmentsAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { Plus, Eye, Edit, Filter, X, CheckCircle, XCircle, Send, Download } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useShopTaxBasePath } from '../../../contexts/ShopTaxBasePathContext';
import { exportToCSV } from '../../../utils/exportCSV';

const ShopAssessments = () => {
  const basePath = useShopTaxBasePath();
  const { isAdmin, isAssessor } = useAuth();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    assessmentYear: ''
  });

  useEffect(() => {
    fetchAssessments();
  }, [filters]);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      const params = {
        limit: 10000,
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))
      };
      const response = await shopTaxAssessmentsAPI.getAll(params);
      setAssessments(response.data.data.assessments || []);
    } catch (error) {
      toast.error('Failed to fetch shop tax assessments');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ status: '', assessmentYear: '' });
  };

  const handleSubmit = async (assessmentId) => {
    try {
      await shopTaxAssessmentsAPI.submit(assessmentId);
      toast.success('Shop tax assessment submitted for approval');
      fetchAssessments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit');
    }
  };

  const handleApprove = async (assessmentId) => {
    if (!window.confirm('Approve this shop tax assessment?')) return;
    try {
      await shopTaxAssessmentsAPI.approve(assessmentId);
      toast.success('Assessment approved');
      fetchAssessments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve');
    }
  };

  const handleReject = async (assessmentId) => {
    const remarks = window.prompt('Rejection remarks:');
    if (remarks == null) return;
    try {
      await shopTaxAssessmentsAPI.reject(assessmentId, { remarks });
      toast.success('Assessment rejected');
      fetchAssessments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: 'badge-info',
      pending: 'badge-warning',
      approved: 'badge-success',
      rejected: 'badge-danger'
    };
    return badges[status] || 'badge-info';
  };

  const handleExport = async () => {
    try {
      const params = { page: 1, limit: 5000, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '')) };
      const response = await shopTaxAssessmentsAPI.getAll(params);
      const list = response.data.data.assessments || [];
      const rows = list.map(a => ({
        assessmentNumber: a.assessmentNumber,
        shop: a.shop ? `${a.shop.shopNumber} - ${a.shop.shopName}` : a.shopId,
        assessmentYear: a.assessmentYear,
        financialYear: a.financialYear,
        annualTaxAmount: a.annualTaxAmount,
        status: a.status
      }));
      exportToCSV(rows, `shop_assessments_${new Date().toISOString().slice(0, 10)}`);
      toast.success('Export downloaded');
    } catch (err) {
      toast.error('Export failed');
    }
  };

  if (loading && !assessments.length) return <Loading />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="ds-page-title">Shop Tax Assessments</h1>
        </div>
        <div className="flex gap-2">
          {(isAdmin || isAssessor || basePath === '/clerk') && (
            <Link to={`${basePath}/shop-tax/assessments/new`} className="btn btn-primary flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              New Shop Assessment
            </Link>
          )}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary flex items-center"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </button>
          <button type="button" onClick={handleExport} className="btn btn-secondary flex items-center">
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="card mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Filters</h3>
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
            >
              <X className="w-4 h-4 mr-1" />
              Clear All
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="label">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="input"
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="label">Assessment Year</label>
              <input
                type="number"
                value={filters.assessmentYear}
                onChange={(e) => handleFilterChange('assessmentYear', e.target.value)}
                className="input"
                placeholder="e.g. 2024"
              />
            </div>
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Assessment Number</th>
              <th>Shop</th>
              <th>Assessment Year</th>
              <th>Financial Year</th>
              <th>Annual Amount</th>
              <th>Status</th>
              <th>Assessor</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {assessments.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-8 text-gray-500">
                  No shop tax assessments found
                </td>
              </tr>
            ) : (
              assessments.map((assessment) => (
                <tr key={assessment.id}>
                  <td className="font-medium">{assessment.assessmentNumber}</td>
                  <td>
                    {assessment.shop
                      ? `${assessment.shop.shopNumber} - ${assessment.shop.shopName}`
                      : `Shop #${assessment.shopId}`}
                  </td>
                  <td>{assessment.assessmentYear}</td>
                  <td>{assessment.financialYear || '—'}</td>
                  <td className="font-semibold">
                    ₹{parseFloat(assessment.annualTaxAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadge(assessment.status)} capitalize`}>
                      {assessment.status}
                    </span>
                  </td>
                  <td>
                    {assessment.assessor
                      ? `${assessment.assessor.firstName} ${assessment.assessor.lastName}`
                      : 'N/A'}
                  </td>
                  <td>
                    <div className="flex items-center space-x-2">
                      <Link
                        to={`${basePath}/shop-tax/assessments/${assessment.id}`}
                        className="text-primary-600 hover:text-primary-700"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      {(isAdmin || isAssessor) && assessment.status === 'draft' && (
                        <>
                          <Link
                            to={`${basePath}/shop-tax/assessments/${assessment.id}/edit`}
                            className="text-green-600 hover:text-green-700"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleSubmit(assessment.id)}
                            className="text-blue-600 hover:text-blue-700"
                            title="Submit for Approval"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {isAdmin && assessment.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleApprove(assessment.id)}
                            className="text-green-600 hover:text-green-700"
                            title="Approve"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(assessment.id)}
                            className="text-red-600 hover:text-red-700"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination removed */}
    </div>
  );
};

export default ShopAssessments;
