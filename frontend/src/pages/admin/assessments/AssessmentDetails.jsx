import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { assessmentAPI, taxAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { Edit, CheckCircle, XCircle, Send, FileText, Droplet, Home, Calculator, Hash, Calendar, Wallet } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useConfirm } from '../../../components/ConfirmModal';
import DetailPageLayout, { DetailRow } from '../../../components/DetailPageLayout';

const formatAmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const AssessmentDetails = () => {
  const { id } = useParams();
  const { isAdmin, isAssessor } = useAuth();
  const { confirm } = useConfirm();
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [unifiedSummary, setUnifiedSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  useEffect(() => {
    fetchAssessment();
  }, [id]);

  useEffect(() => {
    if (assessment?.propertyId) {
      fetchUnifiedSummary();
    }
  }, [assessment]);

  const fetchAssessment = async () => {
    try {
      const response = await assessmentAPI.getById(id);
      setAssessment(response.data.data.assessment);
    } catch (error) {
      toast.error('Failed to fetch tax assessment details');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnifiedSummary = async () => {
    if (!assessment?.propertyId) return;
    try {
      setLoadingSummary(true);
      const response = await taxAPI.getUnifiedSummary({
        propertyId: assessment.propertyId,
        assessmentYear: assessment.assessmentYear
      });
      setUnifiedSummary(response.data.data);
    } catch (error) {
      console.error('Failed to fetch unified summary:', error);
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleSubmit = async () => {
    const ok = await confirm({ title: 'Submit for approval', message: 'Submit this tax assessment for approval?', confirmLabel: 'Submit' });
    if (!ok) return;
    try {
      setActionLoading(true);
      await assessmentAPI.submit(id);
      toast.success('Tax Assessment submitted for approval');
      fetchAssessment();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to submit tax assessment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    const ok = await confirm({ title: 'Approve assessment', message: 'Approve this tax assessment?', confirmLabel: 'Approve' });
    if (!ok) return;
    try {
      setActionLoading(true);
      await assessmentAPI.approve(id);
      toast.success('Tax Assessment approved');
      fetchAssessment();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to approve tax assessment');
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
      toast.success('Tax Assessment rejected');
      fetchAssessment();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reject tax assessment');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <Loading />;
  if (!assessment) return <div>Tax Assessment not found</div>;

  const actionButtons = (
    <>
      {(isAdmin || isAssessor) && assessment?.status === 'draft' && (
        <>
          <Link to={`/assessments/${id}/edit`} className="btn btn-primary flex items-center">
            <Edit className="w-4 h-4 mr-2" /> Edit
          </Link>
          <button onClick={handleSubmit} disabled={actionLoading} className="btn btn-secondary flex items-center">
            <Send className="w-4 h-4 mr-2" /> Submit
          </button>
        </>
      )}
      {isAdmin && assessment?.status === 'pending' && (
        <>
          <button onClick={handleApprove} disabled={actionLoading} className="btn btn-success flex items-center">
            <CheckCircle className="w-4 h-4 mr-2" /> Approve
          </button>
          <button onClick={handleReject} disabled={actionLoading} className="btn btn-danger flex items-center">
            <XCircle className="w-4 h-4 mr-2" /> Reject
          </button>
        </>
      )}
    </>
  );

  const summarySection = (
    <>
      <h2 className="form-section-title">Summary</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <Hash className="w-5 h-5 text-gray-500" />
          <span className="stat-card-label">Assessment Number</span>
          <span className="stat-card-value">{assessment.assessmentNumber}</span>
        </div>
        <div className="stat-card">
          <Wallet className="w-5 h-5 text-gray-500" />
          <span className="stat-card-label">Annual Tax Amount</span>
          <span className="stat-card-value text-green-600">{formatAmt(assessment.annualTaxAmount)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Status</span>
          <span className={`badge ${
            assessment.status === 'approved' ? 'badge-success' :
            assessment.status === 'pending' ? 'badge-warning' :
            assessment.status === 'rejected' ? 'badge-danger' : 'badge-info'
          } capitalize`}>{assessment.status}</span>
        </div>
        <div className="stat-card">
          <Calendar className="w-5 h-5 text-gray-500" />
          <span className="stat-card-label">Assessment Year</span>
          <span className="stat-card-value">{assessment.assessmentYear}</span>
        </div>
      </div>
    </>
  );

  const netAssessedValue = (
    parseFloat(assessment.assessedValue) -
    (parseFloat(assessment.depreciation) || 0) -
    (parseFloat(assessment.exemptionAmount) || 0)
  );

  return (
    <DetailPageLayout
      backTo="/assessments"
      backLabel="Back to Assessments"
      title="Tax Assessment Details"
      subtitle={assessment.assessmentNumber}
      actionButtons={actionButtons}
      summarySection={summarySection}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="form-section-title flex items-center">
            <Calculator className="w-5 h-5 mr-2" />
            Assessment Information
          </h2>
          <div className="space-y-0">
            <DetailRow label="Assessment Number" value={assessment.assessmentNumber} />
            <DetailRow label="Assessment Year" value={assessment.assessmentYear} />
            <DetailRow label="Assessed Value" value={formatAmt(assessment.assessedValue)} />
            <DetailRow label="Tax Rate" value={`${assessment.taxRate}%`} />
            <DetailRow label="Annual Tax Amount" value={<span className="font-semibold text-green-600">{formatAmt(assessment.annualTaxAmount)}</span>} />
            <DetailRow
              label="Status"
              value={
                <span className={`badge ${
                  assessment.status === 'approved' ? 'badge-success' :
                  assessment.status === 'pending' ? 'badge-warning' :
                  assessment.status === 'rejected' ? 'badge-danger' : 'badge-info'
                } capitalize`}>{assessment.status}</span>
              }
            />
            {assessment.landValue != null && <DetailRow label="Land Value" value={formatAmt(assessment.landValue)} />}
            {assessment.buildingValue != null && <DetailRow label="Building Value" value={formatAmt(assessment.buildingValue)} />}
            {(assessment.depreciation != null || assessment.depreciation === 0) && <DetailRow label="Depreciation" value={formatAmt(assessment.depreciation)} />}
            {(assessment.exemptionAmount != null || assessment.exemptionAmount === 0) && <DetailRow label="Exemption Amount" value={formatAmt(assessment.exemptionAmount)} />}
            <DetailRow label="Net Assessed Value" value={<span className="font-semibold">{formatAmt(netAssessedValue)}</span>} />
            {assessment.assessor && <DetailRow label="Assessed By" value={`${assessment.assessor.firstName} ${assessment.assessor.lastName}`} />}
            {assessment.approver && <DetailRow label="Approved By" value={`${assessment.approver.firstName} ${assessment.approver.lastName}`} />}
            {assessment.approvalDate && <DetailRow label="Approval Date" value={new Date(assessment.approvalDate).toLocaleDateString()} />}
            {assessment.effectiveDate && <DetailRow label="Effective Date" value={new Date(assessment.effectiveDate).toLocaleDateString()} />}
            {assessment.expiryDate && <DetailRow label="Expiry Date" value={new Date(assessment.expiryDate).toLocaleDateString()} />}
            {assessment.revisionNumber > 0 && <DetailRow label="Revision Number" value={assessment.revisionNumber} />}
          </div>
        </div>

        <div className="card">
          <h2 className="form-section-title flex items-center">
            <Home className="w-5 h-5 mr-2" />
            Property Information
          </h2>
          <div className="space-y-0">
            <DetailRow
              label="Property Number"
              value={assessment.property?.id ? (
                <Link to={`/properties/${assessment.property.id}`} className="text-primary-600 hover:underline">{assessment.property?.propertyNumber}</Link>
              ) : assessment.property?.propertyNumber}
            />
            <DetailRow label="Address" value={assessment.property?.address} />
            <DetailRow
              label="Owner"
              value={assessment.property?.owner ? `${assessment.property.owner.firstName} ${assessment.property.owner.lastName}` : '—'}
            />
            {assessment.property?.ward && <DetailRow label="Ward" value={assessment.property.ward.wardName} />}
          </div>

          {unifiedSummary?.property?.waterConnections && unifiedSummary.property.waterConnections.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h3 className="form-section-title flex items-center">
                <Droplet className="w-5 h-5 mr-2" />
                Water Connections
              </h3>
              <div className="space-y-3">
                {unifiedSummary.property.waterConnections.map((connection) => (
                  <div key={connection.id} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium">{connection.connectionNumber}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="badge badge-info text-xs">{connection.connectionType}</span>
                          <span className={`badge text-xs ${connection.isMetered ? 'badge-success' : 'badge-secondary'}`}>
                            {connection.isMetered ? 'Metered' : 'Non-metered'}
                          </span>
                        </div>
                        {connection.meterNumber && <p className="text-sm text-gray-600 mt-1">Meter: {connection.meterNumber}</p>}
                      </div>
                      <span className={`badge ${connection.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`}>{connection.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {unifiedSummary && (unifiedSummary.propertyAssessment || unifiedSummary.waterAssessments?.length > 0) && (
          <div className="card lg:col-span-2">
            <h2 className="form-section-title flex items-center">
              <Calculator className="w-5 h-5 mr-2" />
              Unified Tax Assessment Breakdown
            </h2>
            
            <div className="space-y-6">
              {/* Property Tax Breakdown */}
              {unifiedSummary.propertyAssessment && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-800 mb-3">Property Tax</h3>
                  <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <dt className="text-sm text-blue-700">Assessed Value</dt>
                      <dd className="font-semibold">{formatAmt(unifiedSummary.propertyAssessment.assessedValue)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-blue-700">Tax Rate</dt>
                      <dd className="font-semibold">{unifiedSummary.propertyAssessment.taxRate}%</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-blue-700">Property Tax Amount</dt>
                      <dd className="font-semibold text-green-600">{formatAmt(unifiedSummary.propertyAssessment.annualTaxAmount)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-blue-700">Status</dt>
                      <dd>
                        <span className={`badge ${unifiedSummary.propertyAssessment.status === 'approved' ? 'badge-success' : 'badge-warning'} capitalize`}>
                          {unifiedSummary.propertyAssessment.status}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>
              )}

              {/* Water Tax Breakdown */}
              {unifiedSummary.waterAssessments && unifiedSummary.waterAssessments.length > 0 && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-green-800 mb-3">Water Tax (Per Connection)</h3>
                  <div className="space-y-4">
                    {unifiedSummary.waterAssessments.map((waterAssessment) => {
                      const connection = unifiedSummary.property?.waterConnections?.find(
                        c => c.id === waterAssessment.waterConnectionId
                      );
                      const annualAmount = waterAssessment.assessmentType === 'FIXED'
                        ? parseFloat(waterAssessment.rate || 0) * 12
                        : parseFloat(waterAssessment.rate || 0) * 1000; // Estimated for metered
                      
                      return (
                        <div key={waterAssessment.id} className="bg-white p-3 rounded border">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium">Connection: {connection?.connectionNumber || waterAssessment.waterConnectionId}</p>
                              <p className="text-sm text-gray-600">{connection?.connectionType || 'N/A'}</p>
                            </div>
                            <span className={`badge ${waterAssessment.status === 'approved' ? 'badge-success' : 'badge-warning'} capitalize`}>
                              {waterAssessment.status}
                            </span>
                          </div>
                          <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                            <div>
                              <dt className="text-xs text-gray-600">Assessment Type</dt>
                              <dd className="font-medium">{waterAssessment.assessmentType}</dd>
                            </div>
                            <div>
                              <dt className="text-xs text-gray-600">Rate</dt>
                              <dd className="font-medium">
                                {formatAmt(waterAssessment.rate)}{waterAssessment.assessmentType === 'FIXED' ? '/month' : '/unit'}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs text-gray-600">Water Tax Amount</dt>
                              <dd className="font-semibold text-green-600">{formatAmt(annualAmount)}</dd>
                            </div>
                            <div>
                              <dt className="text-xs text-gray-600">Penalty</dt>
                              <dd className="font-medium">{formatAmt(0)}</dd>
                            </div>
                          </dl>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Grand Total Summary */}
              {unifiedSummary.unifiedDemand && (
                <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-300">
                  <h3 className="font-bold text-purple-800 mb-3 text-lg">Grand Total Summary</h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-purple-700">Property Tax Total</dt>
                      <dd className="font-semibold">{formatAmt(unifiedSummary.unifiedDemand.items?.filter(i => i.taxType === 'PROPERTY').reduce((sum, item) => sum + parseFloat(item.totalAmount || 0), 0))}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-purple-700">Water Tax Total</dt>
                      <dd className="font-semibold">{formatAmt(unifiedSummary.unifiedDemand.items?.filter(i => i.taxType === 'WATER').reduce((sum, item) => sum + parseFloat(item.totalAmount || 0), 0))}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-purple-700">Total Penalty</dt>
                      <dd className="font-semibold">{formatAmt(unifiedSummary.unifiedDemand.penaltyAmount)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-purple-700">Total Interest</dt>
                      <dd className="font-semibold">{formatAmt(unifiedSummary.unifiedDemand.interestAmount)}</dd>
                    </div>
                    <div className="text-xs text-purple-700 bg-purple-100 border border-purple-200 rounded p-2">
                      Penalty/interest are applied on the total demand (demand-level), not per item.
                    </div>
                    <div className="border-t border-purple-300 pt-2 mt-2">
                      <div className="flex justify-between">
                        <dt className="text-lg font-bold text-purple-900">GRAND TOTAL PAYABLE</dt>
                        <dd className="text-2xl font-bold text-purple-900">{formatAmt(unifiedSummary.unifiedDemand.totalAmount)}</dd>
                      </div>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          </div>
        )}

        {assessment.remarks && (
          <div className="card lg:col-span-2">
            <h2 className="form-section-title flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Remarks
            </h2>
            <p className="text-gray-600 whitespace-pre-wrap">{assessment.remarks}</p>
          </div>
        )}
      </div>
    </DetailPageLayout>
  );
};

export default AssessmentDetails;
