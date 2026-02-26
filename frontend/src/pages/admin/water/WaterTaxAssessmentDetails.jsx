import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { waterTaxAssessmentAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { FileText, Droplet, Home, Hash, Calendar, Wallet } from 'lucide-react';
import DetailPageLayout, { DetailRow } from '../../../components/DetailPageLayout';

const formatAmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
  if (!assessment) return <div>Water tax assessment not found</div>;

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
          <span className="stat-card-label">Rate</span>
          <span className="stat-card-value text-green-600">{formatAmt(assessment.rate)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Status</span>
          <span className={`badge ${getStatusBadge(assessment.status)} capitalize`}>{assessment.status}</span>
        </div>
        <div className="stat-card">
          <Calendar className="w-5 h-5 text-gray-500" />
          <span className="stat-card-label">Assessment Year</span>
          <span className="stat-card-value">{assessment.assessmentYear}</span>
        </div>
      </div>
    </>
  );

  return (
    <DetailPageLayout
      title="Water Tax Assessment Details"
      subtitle={assessment.assessmentNumber}
      summarySection={summarySection}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="form-section-title flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Assessment Information
          </h2>
          <div className="space-y-0">
            <DetailRow label="Assessment Number" value={assessment.assessmentNumber} />
            <DetailRow label="Assessment Year" value={assessment.assessmentYear} />
            <DetailRow
              label="Assessment Type"
              value={<span className="badge badge-info">{assessment.assessmentType}</span>}
            />
            <DetailRow label="Rate" value={<span className="font-semibold">{formatAmt(assessment.rate)}</span>} />
            <DetailRow
              label="Status"
              value={
                <span className={`badge ${getStatusBadge(assessment.status)} capitalize`}>
                  {assessment.status}
                </span>
              }
            />
            {assessment.remarks && (
              <DetailRow label="Remarks" value={assessment.remarks} />
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="form-section-title flex items-center">
            <Droplet className="w-5 h-5 mr-2" />
            Property & Connection
          </h2>
          <div className="space-y-0">
            {assessment.property && (
              <>
                <DetailRow
                  label="Property Number"
                  value={
                    assessment.propertyId ? (
                      <Link to={`/properties/${assessment.propertyId}`} className="text-primary-600 hover:underline">
                        {assessment.property.propertyNumber}
                      </Link>
                    ) : assessment.property.propertyNumber
                  }
                />
                <DetailRow label="Address" value={assessment.property.address} />
                {assessment.property.ward && (
                  <DetailRow label="Ward" value={assessment.property.ward.wardName} />
                )}
              </>
            )}
            {assessment.waterConnection && (
              <>
                <DetailRow
                  label="Connection Number"
                  value={
                    <Link
                      to={`/water/connections?propertyId=${assessment.propertyId}`}
                      className="text-primary-600 hover:underline"
                    >
                      {assessment.waterConnection.connectionNumber}
                    </Link>
                  }
                />
                <DetailRow label="Connection Type" value={assessment.waterConnection.connectionType} />
                <DetailRow
                  label="Meter Type"
                  value={assessment.waterConnection.isMetered ? 'Metered' : 'Non-metered'}
                />
                {assessment.waterConnection.meterNumber && (
                  <DetailRow label="Meter Number" value={assessment.waterConnection.meterNumber} />
                )}
              </>
            )}
          </div>
        </div>

        {(assessment.assessor || assessment.approver || assessment.createdAt || assessment.updatedAt) && (
          <div className="card lg:col-span-2">
            <h2 className="form-section-title flex items-center">
              <Home className="w-5 h-5 mr-2" />
              Assessment History
            </h2>
            <div className="space-y-0">
              {assessment.assessor && (
                <DetailRow
                  label="Assessed By"
                  value={`${assessment.assessor.firstName} ${assessment.assessor.lastName}`}
                />
              )}
              {assessment.approver && (
                <DetailRow
                  label="Approved By"
                  value={`${assessment.approver.firstName} ${assessment.approver.lastName}`}
                />
              )}
              {assessment.approvalDate && (
                <DetailRow label="Approval Date" value={new Date(assessment.approvalDate).toLocaleDateString()} />
              )}
              {assessment.createdAt && (
                <DetailRow label="Created At" value={new Date(assessment.createdAt).toLocaleString()} />
              )}
              {assessment.updatedAt && (
                <DetailRow label="Last Updated" value={new Date(assessment.updatedAt).toLocaleString()} />
              )}
            </div>
          </div>
        )}
      </div>
    </DetailPageLayout>
  );
};

export default WaterTaxAssessmentDetails;
