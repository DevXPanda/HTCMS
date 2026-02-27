import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { shopTaxAssessmentsAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { Edit, CheckCircle, XCircle, Send, Store, TrendingUp, Calculator } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useConfirm } from '../../../components/ConfirmModal';
import { useShopTaxBasePath } from '../../../contexts/ShopTaxBasePathContext';
import DetailPageLayout, { DetailRow } from '../../../components/DetailPageLayout';

const formatAmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ShopAssessmentDetails = () => {
  const { id } = useParams();
  const basePath = useShopTaxBasePath();
  const { isAdmin, isAssessor } = useAuth();
  const { confirm } = useConfirm();
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchAssessment();
  }, [id]);

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
    const ok = await confirm({ title: 'Submit for approval', message: 'Submit this shop tax assessment for approval?', confirmLabel: 'Submit' });
    if (!ok) return;
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
    const ok = await confirm({ title: 'Approve assessment', message: 'Approve this shop tax assessment?', confirmLabel: 'Approve' });
    if (!ok) return;
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

  if (loading) return <Loading />;
  if (!assessment) return <div>Shop tax assessment not found</div>;

  const statusBadgeClass = () => {
    const s = (assessment.status || '').toLowerCase();
    if (s === 'approved') return 'badge-success';
    if (s === 'pending') return 'badge-warning';
    if (s === 'rejected') return 'badge-danger';
    return 'badge-info';
  };

  const shopStatusBadgeClass = () => {
    const s = (assessment.shop?.status || '').toLowerCase();
    if (s === 'active') return 'badge-success';
    if (s === 'closed') return 'badge-danger';
    return 'badge-warning';
  };

  const actionButtons = (
    <div className="flex gap-2">
      {(isAdmin || isAssessor || basePath === '/clerk') && assessment?.status === 'draft' && (
        <>
          <Link
            to={`${basePath}/shop-tax/assessments/${id}/edit`}
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
    </div>
  );

  return (
    <DetailPageLayout
      backTo={`${basePath}/shop-tax/assessments`}
      backLabel="Back to Shop Tax Assessments"
      showBackLink={false}
      title="Shop Tax Assessment Details"
      subtitle={assessment.assessmentNumber}
      actionButtons={actionButtons}
      summarySection={
        <>
          <h2 className="form-section-title flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-primary-600" />
            Summary
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stat-card">
              <div className="stat-card-title"><span>Assessment Number</span></div>
              <p className="stat-card-value text-lg font-bold text-primary-600">{assessment.assessmentNumber}</p>
            </div>
            <div className="stat-card">
              <div className="stat-card-title"><span>Status</span></div>
              <p className="stat-card-value text-base">
                <span className={`badge capitalize ${statusBadgeClass()}`}>{assessment.status}</span>
              </p>
            </div>
            <div className="stat-card">
              <div className="stat-card-title"><span>Annual Tax Amount</span></div>
              <p className="stat-card-value text-lg font-bold text-green-600">{formatAmt(assessment.annualTaxAmount)}</p>
            </div>
            <div className="stat-card">
              <div className="stat-card-title"><span>Assessment Year</span></div>
              <p className="stat-card-value text-lg font-bold">{assessment.assessmentYear}</p>
            </div>
          </div>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="form-section-title flex items-center">
            <Calculator className="w-5 h-5 mr-2 text-primary-600" />
            Assessment Information
          </h2>
          <dl>
            <DetailRow label="Assessment Number" value={assessment.assessmentNumber} valueClass="font-semibold" />
            <DetailRow label="Assessment Year" value={assessment.assessmentYear} />
            <DetailRow label="Financial Year" value={assessment.financialYear} />
            <DetailRow label="Assessed Value" value={assessment.assessedValue != null ? formatAmt(assessment.assessedValue) : null} valueClass="text-primary-600" />
            <DetailRow label="Rate" value={assessment.rate != null ? formatAmt(assessment.rate) : null} />
            <DetailRow label="Annual Tax Amount" value={formatAmt(assessment.annualTaxAmount)} valueClass="font-semibold text-green-600" />
            <DetailRow
              label="Status"
              value={<span className={`badge capitalize ${statusBadgeClass()}`}>{assessment.status}</span>}
            />
            <DetailRow label="Assessed By" value={assessment.assessor ? `${assessment.assessor.firstName} ${assessment.assessor.lastName}` : null} />
            <DetailRow label="Approved By" value={assessment.approver ? `${assessment.approver.firstName} ${assessment.approver.lastName}` : null} />
            <DetailRow label="Approval Date" value={assessment.approvalDate ? new Date(assessment.approvalDate).toLocaleDateString() : null} />
            <DetailRow label="Remarks" value={assessment.remarks} valueClass="text-sm text-gray-700" />
          </dl>
        </div>

        <div className="card">
          <h2 className="form-section-title flex items-center">
            <Store className="w-5 h-5 mr-2 text-primary-600" />
            Shop Information
          </h2>
          {assessment.shop ? (
            <dl>
              <DetailRow
                label="Shop Number"
                value={
                  assessment.shop.id ? (
                    <Link to={`${basePath}/shop-tax/shops/${assessment.shop.id}`} className="text-primary-600 hover:underline font-medium">
                      {assessment.shop.shopNumber}
                    </Link>
                  ) : (
                    assessment.shop.shopNumber
                  )
                }
              />
              <DetailRow label="Shop Name" value={assessment.shop.shopName} />
              <DetailRow label="Type" value={assessment.shop.shopType} valueClass="capitalize" />
              <DetailRow
                label="Status"
                value={<span className={`badge capitalize ${shopStatusBadgeClass()}`}>{assessment.shop.status}</span>}
              />
              {assessment.shop.property && (
                <DetailRow
                  label="Property"
                  value={
                    assessment.shop.propertyId ? (
                      <Link to={`${basePath}/properties/${assessment.shop.propertyId}`} className="text-primary-600 hover:underline">
                        {assessment.shop.property.propertyNumber} – {assessment.shop.property.address}
                      </Link>
                    ) : (
                      `${assessment.shop.property.propertyNumber} – ${assessment.shop.property.address}`
                    )
                  }
                />
              )}
              <DetailRow label="Ward" value={assessment.shop.ward?.wardName} />
            </dl>
          ) : (
            <p className="text-gray-500 text-sm">Shop details not loaded</p>
          )}
        </div>
      </div>
    </DetailPageLayout>
  );
};

export default ShopAssessmentDetails;
