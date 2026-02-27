import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { waterTaxAssessmentAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { Plus, Search, Eye, Filter, X, Download } from 'lucide-react';
import { exportToCSV } from '../../../utils/exportCSV';
import { isRecentDate, sortByCreatedDesc } from '../../../utils/dateUtils';

const WaterTaxAssessments = () => {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    assessmentYear: '',
    assessmentType: ''
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
      const response = await waterTaxAssessmentAPI.getAll(params);
      const list = response.data?.data?.assessments ?? [];
      setAssessments([...list].sort(sortByCreatedDesc));
    } catch (error) {
      toast.error('Failed to fetch water tax assessments');
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
      assessmentType: ''
    });
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
      const response = await waterTaxAssessmentAPI.getAll(params);
      const list = response.data.data.assessments || [];
      const rows = list.map(a => ({
        assessmentNumber: a.assessmentNumber,
        connectionNumber: a.waterConnection?.connectionNumber,
        assessmentYear: a.assessmentYear,
        assessmentType: a.assessmentType,
        rate: a.rate,
        status: a.status
      }));
      exportToCSV(rows, `water_tax_assessments_${new Date().toISOString().slice(0, 10)}`);
      toast.success('Export downloaded');
    } catch (err) {
      toast.error('Export failed');
    }
  };

  if (loading && !assessments.length) return <Loading />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Water Tax Assessments</h1>
        <div className="flex gap-2">
          <Link to="/water/assessments/new" className="btn btn-primary flex items-center">
            <Plus className="w-4 h-4 mr-2" />
            New Assessment
          </Link>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <label className="label">Assessment Type</label>
              <select
                value={filters.assessmentType}
                onChange={(e) => handleFilterChange('assessmentType', e.target.value)}
                className="input"
              >
                <option value="">All Types</option>
                <option value="METERED">Metered</option>
                <option value="FIXED">Fixed</option>
              </select>
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
              <th>Water Connection</th>
              <th>Year</th>
              <th>Type</th>
              <th>Rate</th>
              <th>Status</th>
              <th>Assessor</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {assessments.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center py-8 text-gray-500">
                  No assessments found
                </td>
              </tr>
            ) : (
              assessments.map((assessment) => (
                <tr key={assessment.id}>
                  <td className="font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      {assessment.assessmentNumber}
                      {isRecentDate(assessment.createdAt) && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Recent</span>
                      )}
                    </span>
                  </td>
                  <td>
                    {assessment.property ? (
                      <Link
                        to={`/properties/${assessment.propertyId}`}
                        className="text-primary-600 hover:underline"
                      >
                        {assessment.property.propertyNumber}
                      </Link>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td>
                    {assessment.waterConnection ? (
                      <Link
                        to={`/water/connections?propertyId=${assessment.propertyId}`}
                        className="text-primary-600 hover:underline"
                      >
                        {assessment.waterConnection.connectionNumber}
                      </Link>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td>{assessment.assessmentYear}</td>
                  <td>
                    <span className="badge badge-info">
                      {assessment.assessmentType}
                    </span>
                  </td>
                  <td>₹{parseFloat(assessment.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
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
                    <Link
                      to={`/water/assessments/${assessment.id}`}
                      className="text-primary-600 hover:text-primary-700"
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
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

export default WaterTaxAssessments;
