import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { assessmentAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { Plus, Search, Eye, Edit, Filter, X, CheckCircle, XCircle, Send, Download } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { exportToCSV } from '../../../utils/exportCSV';

const Assessments = () => {
  const { isAdmin, isAssessor } = useAuth();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    assessmentYear: '',
    minValue: '',
    maxValue: ''
  });

  useEffect(() => {
    fetchAssessments();
  }, [search, filters]);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      const params = {
        search,
        limit: 10000,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      };
      const response = await assessmentAPI.getAll(params);
      setAssessments(response.data.data.assessments);
    } catch (error) {
      toast.error('Failed to fetch tax assessments');
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
      assessmentYear: '',
      minValue: '',
      maxValue: ''
    });
  };

  const handleSubmit = async (assessmentId) => {
    try {
      await assessmentAPI.submit(assessmentId);
      toast.success('Tax Assessment submitted for approval');
      fetchAssessments();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to submit tax assessment');
    }
  };

  const handleApprove = async (assessmentId) => {
    if (!window.confirm('Are you sure you want to approve this tax assessment?')) return;
    try {
      await assessmentAPI.approve(assessmentId);
      toast.success('Tax Assessment approved');
      fetchAssessments();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to approve assessment');
    }
  };

  const handleReject = async (assessmentId) => {
    const remarks = window.prompt('Please provide rejection remarks:');
    if (!remarks) return;
    try {
      await assessmentAPI.reject(assessmentId, { remarks });
      toast.success('Assessment rejected');
      fetchAssessments();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reject assessment');
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
      const params = { page: 1, limit: 5000, search, ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== '')) };
      const response = await assessmentAPI.getAll(params);
      const list = response.data.data.assessments || [];
      const rows = list.map(a => ({
        assessmentNumber: a.assessmentNumber,
        propertyNumber: a.property?.propertyNumber,
        assessmentYear: a.assessmentYear,
        annualTaxAmount: a.annualTaxAmount,
        status: a.status
      }));
      exportToCSV(rows, `property_assessments_${new Date().toISOString().slice(0, 10)}`);
      toast.success('Export downloaded');
    } catch (err) {
      toast.error('Export failed');
    }
  };

  if (loading && !assessments.length) return <Loading />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Tax Assessments</h1>
        <div className="flex gap-2">
          {(isAdmin || isAssessor) && (
            <Link to="/assessments/new" className="btn btn-primary flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              New Tax Assessment
            </Link>
          )}
          <button
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

      {/* Search */}
      <form onSubmit={(e) => { e.preventDefault(); fetchAssessments(); }} className="mb-6">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by assessment number..."
              className="input pl-10"
            />
          </div>
          <button type="submit" className="btn btn-primary">
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
                placeholder="e.g., 2024"
              />
            </div>

            <div>
              <label className="label">Min Value (₹)</label>
              <input
                type="number"
                value={filters.minValue}
                onChange={(e) => handleFilterChange('minValue', e.target.value)}
                className="input"
                placeholder="0"
              />
            </div>

            <div>
              <label className="label">Max Value (₹)</label>
              <input
                type="number"
                value={filters.maxValue}
                onChange={(e) => handleFilterChange('maxValue', e.target.value)}
                className="input"
                placeholder="0"
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
              <th>Property</th>
              <th>Year</th>
              <th>Assessed Value</th>
              <th>Tax Amount</th>
              <th>Status</th>
              <th>Assessor</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {assessments.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center py-8 text-gray-500">
                  No assessments found
                </td>
              </tr>
            ) : (
              assessments.map((assessment) => (
                <tr key={assessment.id}>
                  <td className="font-medium">{assessment.assessmentNumber}</td>
                  <td>
                    <Link to={`/properties/${assessment.propertyId}`} className="text-primary-600 hover:underline">
                      {assessment.property?.propertyNumber || 'N/A'}
                    </Link>
                  </td>
                  <td>{assessment.assessmentYear}</td>
                  <td>₹{parseFloat(assessment.assessedValue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="font-semibold">₹{parseFloat(assessment.annualTaxAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td>
                    <span className={`badge ${getStatusBadge(assessment.status)} capitalize`}>
                      {assessment.status}
                    </span>
                  </td>
                  <td>
                    {assessment.assessor ?
                      `${assessment.assessor.firstName} ${assessment.assessor.lastName}` :
                      'N/A'}
                  </td>
                  <td>
                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/assessments/${assessment.id}`}
                        className="text-primary-600 hover:text-primary-700"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      {(isAdmin || isAssessor) && assessment.status === 'draft' && (
                        <>
                          <Link
                            to={`/assessments/${assessment.id}/edit`}
                            className="text-green-600 hover:text-green-700"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
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
                            onClick={() => handleApprove(assessment.id)}
                            className="text-green-600 hover:text-green-700"
                            title="Approve"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
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

export default Assessments;
