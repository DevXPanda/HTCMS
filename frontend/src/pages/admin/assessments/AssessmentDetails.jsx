import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { assessmentAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { ArrowLeft, Edit, CheckCircle, XCircle, Send, FileText } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

const AssessmentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isAssessor } = useAuth();
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchAssessment();
  }, [id]);

  const fetchAssessment = async () => {
    try {
      const response = await assessmentAPI.getById(id);
      setAssessment(response.data.data.assessment);
    } catch (error) {
      toast.error('Failed to fetch assessment details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!window.confirm('Submit this assessment for approval?')) return;
    try {
      setActionLoading(true);
      await assessmentAPI.submit(id);
      toast.success('Assessment submitted for approval');
      fetchAssessment();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to submit assessment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm('Approve this assessment?')) return;
    try {
      setActionLoading(true);
      await assessmentAPI.approve(id);
      toast.success('Assessment approved');
      fetchAssessment();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to approve assessment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    const remarks = window.prompt('Please provide rejection remarks:');
    if (!remarks) return;
    try {
      setActionLoading(true);
      await assessmentAPI.reject(id, { remarks });
      toast.success('Assessment rejected');
      fetchAssessment();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reject assessment');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <Loading />;
  if (!assessment) return <div>Assessment not found</div>;

  return (
    <div>
      <Link to="/assessments" className="flex items-center text-primary-600 mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Assessments
      </Link>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Assessment Details</h1>
        <div className="flex gap-2">
          {(isAdmin || isAssessor) && assessment?.status === 'draft' && (
            <>
              <Link
                to={`/assessments/${id}/edit`}
                className="btn btn-primary flex items-center"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Link>
              <button
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
                onClick={handleApprove}
                disabled={actionLoading}
                className="btn btn-success flex items-center"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="btn btn-danger flex items-center"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </button>
            </>
          )}
        </div>
      </div>

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
              <dt className="text-sm font-medium text-gray-500">Assessed Value</dt>
              <dd className="text-lg">₹{parseFloat(assessment.assessedValue).toLocaleString('en-IN')}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Tax Rate</dt>
              <dd>{assessment.taxRate}%</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Annual Tax Amount</dt>
              <dd className="text-lg font-semibold text-green-600">
                ₹{parseFloat(assessment.annualTaxAmount).toLocaleString('en-IN')}
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
            {assessment.landValue && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Land Value</dt>
                <dd>₹{parseFloat(assessment.landValue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</dd>
              </div>
            )}
            {assessment.buildingValue && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Building Value</dt>
                <dd>₹{parseFloat(assessment.buildingValue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</dd>
              </div>
            )}
            {(assessment.depreciation || assessment.depreciation === 0) && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Depreciation</dt>
                <dd>₹{parseFloat(assessment.depreciation).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</dd>
              </div>
            )}
            {(assessment.exemptionAmount || assessment.exemptionAmount === 0) && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Exemption Amount</dt>
                <dd>₹{parseFloat(assessment.exemptionAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">Net Assessed Value</dt>
              <dd className="text-lg font-semibold">
                ₹{(
                  parseFloat(assessment.assessedValue) - 
                  (parseFloat(assessment.depreciation) || 0) - 
                  (parseFloat(assessment.exemptionAmount) || 0)
                ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </dd>
            </div>
            {assessment.assessor && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Assessed By</dt>
                <dd>
                  {assessment.assessor.firstName} {assessment.assessor.lastName}
                </dd>
              </div>
            )}
            {assessment.approver && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Approved By</dt>
                <dd>
                  {assessment.approver.firstName} {assessment.approver.lastName}
                </dd>
              </div>
            )}
            {assessment.approvalDate && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Approval Date</dt>
                <dd>{new Date(assessment.approvalDate).toLocaleDateString()}</dd>
              </div>
            )}
            {assessment.effectiveDate && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Effective Date</dt>
                <dd>{new Date(assessment.effectiveDate).toLocaleDateString()}</dd>
              </div>
            )}
            {assessment.expiryDate && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Expiry Date</dt>
                <dd>{new Date(assessment.expiryDate).toLocaleDateString()}</dd>
              </div>
            )}
            {assessment.revisionNumber > 0 && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Revision Number</dt>
                <dd>{assessment.revisionNumber}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Property Information</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Property Number</dt>
              <dd>{assessment.property?.propertyNumber}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Address</dt>
              <dd>{assessment.property?.address}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Owner</dt>
              <dd>
                {assessment.property?.owner?.firstName} {assessment.property?.owner?.lastName}
              </dd>
            </div>
            {assessment.property?.ward && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Ward</dt>
                <dd>{assessment.property.ward.wardName}</dd>
              </div>
            )}
          </dl>
        </div>

        {assessment.remarks && (
          <div className="card lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Remarks
            </h2>
            <p className="text-gray-600 whitespace-pre-wrap">{assessment.remarks}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssessmentDetails;
