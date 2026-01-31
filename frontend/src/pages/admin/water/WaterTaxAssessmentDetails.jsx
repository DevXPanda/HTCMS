import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { waterTaxAssessmentAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { ArrowLeft, FileText } from 'lucide-react';

const WaterTaxAssessmentDetails = () => {
  const { id } = useParams();
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssessment();
  }, [id]);

  const fetchAssessment = async () => {
    try {
      const response = await waterTaxAssessmentAPI.getById(id);
      setAssessment(response.data.data.assessment);
    } catch (error) {
      toast.error('Failed to fetch water tax assessment details');
    } finally {
      setLoading(false);
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

  if (loading) return <Loading />;
  if (!assessment) return <div>Assessment not found</div>;

  return (
    <div>
      <Link to="/water/assessments" className="flex items-center text-primary-600 mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Water Tax Assessments
      </Link>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Water Tax Assessment Details</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Assessment Information
          </h2>
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
              <dt className="text-sm font-medium text-gray-500">Assessment Type</dt>
              <dd>
                <span className="badge badge-info">
                  {assessment.assessmentType}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Rate</dt>
              <dd className="text-lg font-semibold">
                ₹{parseFloat(assessment.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd>
                <span className={`badge ${getStatusBadge(assessment.status)} capitalize`}>
                  {assessment.status}
                </span>
              </dd>
            </div>
            {assessment.remarks && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Remarks</dt>
                <dd className="text-sm text-gray-700">{assessment.remarks}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Property & Connection</h2>
          <dl className="space-y-3">
            {assessment.property && (
              <>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Property Number</dt>
                  <dd>
                    <Link 
                      to={`/properties/${assessment.propertyId}`} 
                      className="text-primary-600 hover:underline"
                    >
                      {assessment.property.propertyNumber}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Address</dt>
                  <dd>{assessment.property.address}</dd>
                </div>
                {assessment.property.ward && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Ward</dt>
                    <dd>{assessment.property.ward.wardName}</dd>
                  </div>
                )}
              </>
            )}
            {assessment.waterConnection && (
              <>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Connection Number</dt>
                  <dd>
                    <Link 
                      to={`/water/connections?propertyId=${assessment.propertyId}`} 
                      className="text-primary-600 hover:underline"
                    >
                      {assessment.waterConnection.connectionNumber}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Connection Type</dt>
                  <dd className="capitalize">{assessment.waterConnection.connectionType}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Meter Type</dt>
                  <dd>{assessment.waterConnection.isMetered ? 'Metered' : 'Non-metered'}</dd>
                </div>
                {assessment.waterConnection.meterNumber && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Meter Number</dt>
                    <dd>{assessment.waterConnection.meterNumber}</dd>
                  </div>
                )}
              </>
            )}
          </dl>
        </div>

        {(assessment.assessor || assessment.approver) && (
          <div className="card lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Assessment History</h2>
            <dl className="space-y-3">
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
              <div>
                <dt className="text-sm font-medium text-gray-500">Created At</dt>
                <dd>{new Date(assessment.createdAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                <dd>{new Date(assessment.updatedAt).toLocaleString()}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
};

export default WaterTaxAssessmentDetails;
