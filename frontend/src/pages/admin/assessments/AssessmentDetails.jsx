import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { assessmentAPI, taxAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { ArrowLeft, Edit, CheckCircle, XCircle, Send, FileText, Droplet, Home, Calculator } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

const AssessmentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isAssessor } = useAuth();
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
    if (!window.confirm('Submit this tax assessment for approval?')) return;
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
    if (!window.confirm('Approve this tax assessment?')) return;
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

  return (
    <div>
      <Link to="/assessments" className="flex items-center text-primary-600 mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Assessments
      </Link>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Tax Assessment Details</h1>
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
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Home className="w-5 h-5 mr-2" />
            Property Information
          </h2>
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

          {/* Water Connections Section */}
          {unifiedSummary?.property?.waterConnections && unifiedSummary.property.waterConnections.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
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
                        {connection.meterNumber && (
                          <p className="text-sm text-gray-600 mt-1">Meter: {connection.meterNumber}</p>
                        )}
                      </div>
                      <span className={`badge ${connection.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`}>
                        {connection.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Unified Assessment Breakdown */}
        {unifiedSummary && (unifiedSummary.propertyAssessment || unifiedSummary.waterAssessments?.length > 0) && (
          <div className="card lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
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
                      <dd className="font-semibold">
                        ₹{parseFloat(unifiedSummary.propertyAssessment.assessedValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-blue-700">Tax Rate</dt>
                      <dd className="font-semibold">{unifiedSummary.propertyAssessment.taxRate}%</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-blue-700">Property Tax Amount</dt>
                      <dd className="font-semibold text-green-600">
                        ₹{parseFloat(unifiedSummary.propertyAssessment.annualTaxAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </dd>
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
                                ₹{parseFloat(waterAssessment.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                {waterAssessment.assessmentType === 'FIXED' ? '/month' : '/unit'}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs text-gray-600">Water Tax Amount</dt>
                              <dd className="font-semibold text-green-600">
                                ₹{annualAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-xs text-gray-600">Penalty</dt>
                              <dd className="font-medium">₹0.00</dd>
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
                      <dd className="font-semibold">
                        ₹{parseFloat(unifiedSummary.unifiedDemand.items?.filter(i => i.taxType === 'PROPERTY').reduce((sum, item) => sum + parseFloat(item.totalAmount || 0), 0) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-purple-700">Water Tax Total</dt>
                      <dd className="font-semibold">
                        ₹{parseFloat(unifiedSummary.unifiedDemand.items?.filter(i => i.taxType === 'WATER').reduce((sum, item) => sum + parseFloat(item.totalAmount || 0), 0) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-purple-700">Total Penalty</dt>
                      <dd className="font-semibold">
                        ₹{parseFloat(unifiedSummary.unifiedDemand.penaltyAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-purple-700">Total Interest</dt>
                      <dd className="font-semibold">
                        ₹{parseFloat(unifiedSummary.unifiedDemand.interestAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </dd>
                    </div>
                    <div className="text-xs text-purple-700 bg-purple-100 border border-purple-200 rounded p-2">
                      Penalty/interest are applied on the total demand (demand-level), not per item.
                    </div>
                    <div className="border-t border-purple-300 pt-2 mt-2">
                      <div className="flex justify-between">
                        <dt className="text-lg font-bold text-purple-900">GRAND TOTAL PAYABLE</dt>
                        <dd className="text-2xl font-bold text-purple-900">
                          ₹{parseFloat(unifiedSummary.unifiedDemand.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </dd>
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
