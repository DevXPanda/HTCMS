import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import DetailPageLayout, { DetailRow } from '../../components/DetailPageLayout';
import { assessmentAPI } from '../../services/api';
import toast from 'react-hot-toast';

const SBMAssessmentDetails = () => {
  const { id } = useParams();
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    assessmentAPI.getById(id)
      .then((res) => {
        if (cancelled) return;
        setAssessment(res.data?.data?.assessment ?? null);
      })
      .catch((e) => {
        if (!cancelled) toast.error(e.response?.data?.message || 'Failed to load assessment details');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  if (loading && !assessment) {
    return (
      <div className="flex justify-center py-12">
        <div className="spinner spinner-md" />
      </div>
    );
  }
  if (!assessment) {
    return (
      <div className="card p-6 text-center">
        <p className="text-gray-500">Assessment not found.</p>
        <Link to="/sbm/assessments" className="text-violet-600 hover:underline mt-2 inline-block">Back to Assessments</Link>
      </div>
    );
  }

  const property = assessment.property;
  const ownerName = property?.owner ? [property.owner.firstName, property.owner.lastName].filter(Boolean).join(' ') : null;
  const wardName = property?.ward ? [property.ward.wardNumber, property.ward.wardName].filter(Boolean).join(' - ') : null;

  return (
    <DetailPageLayout
      title="Assessment Details (Read-only)"
      subtitle={assessment.assessmentNumber || assessment.id}
      actionButtons={<Link to="/sbm/assessments" className="btn btn-secondary">Back to Assessments</Link>}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Assessment Information</h2>
          <dl className="space-y-0">
            <DetailRow label="Assessment No" value={assessment.assessmentNumber} />
            <DetailRow label="Assessment Year" value={assessment.assessmentYear} />
            <DetailRow label="Status" value={assessment.status} />
            <DetailRow label="Assessed Value" value={assessment.assessedValue != null ? Number(assessment.assessedValue).toLocaleString('en-IN') : null} />
            <DetailRow label="Created At" value={assessment.createdAt ? new Date(assessment.createdAt).toLocaleString() : null} />
          </dl>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Property</h2>
          <dl className="space-y-0">
            <DetailRow
              label="Property Number"
              value={property?.propertyNumber}
              valueClass={property?.id ? 'text-primary-600' : ''}
            />
            <DetailRow label="Owner" value={ownerName} />
            <DetailRow label="Ward" value={wardName} />
            <DetailRow label="Address" value={property?.address} />
          </dl>
          {property?.id && (
            <div className="mt-4">
              <Link to={`/sbm/properties/${property.id}`} className="text-violet-600 hover:text-violet-800 text-sm font-medium">
                View Property →
              </Link>
            </div>
          )}
        </div>
      </div>
    </DetailPageLayout>
  );
};

export default SBMAssessmentDetails;

