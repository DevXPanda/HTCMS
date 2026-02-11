import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { shopTaxAssessmentsAPI, generateShopDemand } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { ArrowLeft, Edit, CheckCircle, XCircle, Send, Store, FileText } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

const ShopAssessmentDetails = () => {
  const { id } = useParams();
  const { isAdmin, isAssessor } = useAuth();
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [generateFinancialYear, setGenerateFinancialYear] = useState('');
  const [generateDueDate, setGenerateDueDate] = useState('');
  const [generateLoading, setGenerateLoading] = useState(false);
  const [lastGeneratedDemandId, setLastGeneratedDemandId] = useState(null);

  useEffect(() => {
    fetchAssessment();
  }, [id]);

  useEffect(() => {
    if (assessment?.financialYear) setGenerateFinancialYear(assessment.financialYear);
  }, [assessment?.financialYear]);

  const fetchAssessment = async () => {
    try {
      const response = await shopTaxAssessmentsAPI.getById(id);
      setAssessment(response.data.data.assessment);
    } catch (error) {
      toast.error('Failed to fetch shop tax assessment');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!window.confirm('Submit this shop tax assessment for approval?')) return;
    try {
      setActionLoading(true);
      await shopTaxAssessmentsAPI.submit(id);
      toast.success('Assessment submitted for approval');
      fetchAssessment();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm('Approve this shop tax assessment?')) return;
    try {
      setActionLoading(true);
      await shopTaxAssessmentsAPI.approve(id);
      toast.success('Assessment approved');
      fetchAssessment();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    const remarks = window.prompt('Rejection remarks:');
    if (remarks == null) return;
    try {
      setActionLoading(true);
      await shopTaxAssessmentsAPI.reject(id, { remarks });
      toast.success('Assessment rejected');
      fetchAssessment();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateDemand = async (e) => {
    e.preventDefault();
    const fy = (generateFinancialYear || '').trim();
    if (!fy) {
      toast.error('Financial year is required');
      return;
    }
    try {
      setGenerateLoading(true);
      const { data } = await generateShopDemand({
        shopTaxAssessmentId: Number(id),
        financialYear: fy,
        ...(generateDueDate ? { dueDate: generateDueDate } : {})
      });
      const demand = data?.data?.demand;
      const alreadyExisted = data?.data?.alreadyExisted === true;
      if (demand?.id) setLastGeneratedDemandId(demand.id);
      toast.success(alreadyExisted ? 'Demand already exists for this assessment and financial year.' : 'Demand generated successfully.');
      setShowGenerateForm(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate demand');
    } finally {
      setGenerateLoading(false);
    }
  };

  if (loading) return <Loading />;
  if (!assessment) return <div>Shop tax assessment not found</div>;

  return (
    <div>
      <Link to="/shop-tax/assessments" className="flex items-center text-primary-600 mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Shop Assessments
      </Link>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Shop Tax Assessment Details</h1>
        <div className="flex gap-2">
          {(isAdmin || isAssessor) && assessment?.status === 'draft' && (
            <>
              <Link
                to={`/shop-tax/assessments/${id}/edit`}
                className="btn btn-primary flex items-center"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Link>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={actionLoading}
                className="btn btn-secondary flex items-center"
              >
                <Send className="w-4 h-4 mr-2" />
                Submit
              </button>
            </>
          )}
          {isAdmin && assessment?.status === 'pending' && (
            <>
              <button
                type="button"
                onClick={handleApprove}
                disabled={actionLoading}
                className="btn btn-success flex items-center"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={actionLoading}
                className="btn btn-danger flex items-center"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </button>
            </>
          )}
          {(isAdmin || isAssessor) && assessment?.status === 'approved' && (
            <button
              type="button"
              onClick={() => setShowGenerateForm((v) => !v)}
              className="btn btn-primary flex items-center"
            >
              <FileText className="w-4 h-4 mr-2" />
              Generate demand
            </button>
          )}
        </div>
      </div>

      {assessment?.status === 'approved' && showGenerateForm && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-4">Generate shop tax demand</h2>
          <form onSubmit={handleGenerateDemand} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Financial year *</label>
              <input
                type="text"
                value={generateFinancialYear}
                onChange={(e) => setGenerateFinancialYear(e.target.value)}
                placeholder="e.g. 2024-25"
                className="input w-full"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due date (optional)</label>
              <input
                type="date"
                value={generateDueDate}
                onChange={(e) => setGenerateDueDate(e.target.value)}
                className="input w-full"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={generateLoading} className="btn btn-primary">
                {generateLoading ? 'Generating…' : 'Generate'}
              </button>
              <button type="button" onClick={() => setShowGenerateForm(false)} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {lastGeneratedDemandId && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <Link to={`/demands/${lastGeneratedDemandId}`} className="text-primary-600 hover:underline font-medium flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            View generated demand
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Assessment Information</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Assessment Number</dt>
              <dd className="text-lg font-semibold">{assessment.assessmentNumber}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Assessment Year</dt>
              <dd>{assessment.assessmentYear}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Financial Year</dt>
              <dd>{assessment.financialYear || '—'}</dd>
            </div>
            {(assessment.assessedValue != null || assessment.rate != null) && (
              <>
                {assessment.assessedValue != null && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Assessed Value</dt>
                    <dd>₹{parseFloat(assessment.assessedValue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</dd>
                  </div>
                )}
                {assessment.rate != null && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Rate</dt>
                    <dd>₹{parseFloat(assessment.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</dd>
                  </div>
                )}
              </>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">Annual Tax Amount</dt>
              <dd className="text-lg font-semibold text-green-600">
                ₹{parseFloat(assessment.annualTaxAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd>
                <span className={`badge ${
                  assessment.status === 'approved' ? 'badge-success' :
                  assessment.status === 'pending' ? 'badge-warning' :
                  assessment.status === 'rejected' ? 'badge-danger' :
                  'badge-info'
                } capitalize`}>
                  {assessment.status}
                </span>
              </dd>
            </div>
            {assessment.assessor && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Assessed By</dt>
                <dd>{assessment.assessor.firstName} {assessment.assessor.lastName}</dd>
              </div>
            )}
            {assessment.approver && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Approved By</dt>
                <dd>{assessment.approver.firstName} {assessment.approver.lastName}</dd>
              </div>
            )}
            {assessment.approvalDate && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Approval Date</dt>
                <dd>{new Date(assessment.approvalDate).toLocaleDateString()}</dd>
              </div>
            )}
            {assessment.remarks && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Remarks</dt>
                <dd className="text-sm text-gray-700">{assessment.remarks}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Store className="w-5 h-5 mr-2" />
            Shop Information
          </h2>
          {assessment.shop ? (
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Shop Number</dt>
                <dd className="font-medium">{assessment.shop.shopNumber}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Shop Name</dt>
                <dd>{assessment.shop.shopName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Type</dt>
                <dd className="capitalize">{assessment.shop.shopType || '—'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd>
                  <span className={`badge ${assessment.shop.status === 'active' ? 'badge-success' : assessment.shop.status === 'closed' ? 'badge-danger' : 'badge-warning'} capitalize`}>
                    {assessment.shop.status}
                  </span>
                </dd>
              </div>
              {assessment.shop.property && (
                <>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Property</dt>
                    <dd>{assessment.shop.property.propertyNumber} – {assessment.shop.property.address}</dd>
                  </div>
                  {assessment.shop.ward && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Ward</dt>
                      <dd>{assessment.shop.ward.wardName}</dd>
                    </div>
                  )}
                </>
              )}
            </dl>
          ) : (
            <p className="text-gray-500">Shop details not loaded</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShopAssessmentDetails;
