import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { demandAPI } from '../../services/api';
import Loading from '../../components/Loading';
import DemandDetailsView from '../../components/DemandDetailsView';
import toast from 'react-hot-toast';

/** Normalize API demand (snake_case or mixed) to camelCase for DemandDetailsView */
function normalizeDemand(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw;
  const total = Number(d.totalAmount ?? d.total_amount ?? 0);
  const paid = Number(d.paidAmount ?? d.paid_amount ?? 0);
  const balance = Number(d.balanceAmount ?? d.balance_amount ?? (total - paid));
  return {
    demandNumber: d.demandNumber ?? d.demand_number,
    serviceType: d.serviceType ?? d.service_type,
    totalAmount: d.totalAmount ?? d.total_amount,
    paidAmount: d.paidAmount ?? d.paid_amount,
    balanceAmount: d.balanceAmount ?? d.balance_amount ?? balance,
    dueDate: d.dueDate ?? d.due_date,
    financialYear: d.financialYear ?? d.financial_year,
    status: d.status,
    baseAmount: d.baseAmount ?? d.base_amount,
    arrearsAmount: d.arrearsAmount ?? d.arrears_amount,
    penaltyAmount: d.penaltyAmount ?? d.penalty_amount,
    interestAmount: d.interestAmount ?? d.interest_amount,
    generatedDate: d.generatedDate ?? d.generated_date,
    generatedBy: d.generatedBy ?? d.generated_by,
    payments: Array.isArray(d.payments) ? d.payments : [],
    property: d.property,
    assessment: d.assessment,
  };
}

const SBMDemandDetails = () => {
  const { id } = useParams();
  const [demand, setDemand] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDemand = async () => {
      try {
        const res = await demandAPI.getById(id);
        const data = res.data?.data ?? res.data;
        const demandObj = data?.demand ?? data;
        setDemand(normalizeDemand(demandObj));
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load demand');
        setDemand(null);
      } finally {
        setLoading(false);
      }
    };
    fetchDemand();
  }, [id]);

  if (loading) return <Loading />;
  if (!demand) return <div className="text-gray-600">Demand not found.</div>;

  const property = demand.property;
  const propertyNumberLink = property?.id ? `/sbm/properties/${property.id}` : undefined;
  const assessmentLink = demand.assessment?.id ? undefined : undefined; // SBM read-only; no assessment detail route required

  return (
    <DemandDetailsView
      demand={demand}
      backTo="/sbm/demands"
      backLabel="Back to Demands list"
      title="Demand Details (Read-only)"
      actionButtons={null}
      propertyNumberLink={propertyNumberLink}
      assessmentLink={assessmentLink}
    >
      <p className="mt-4 text-sm text-gray-500">
        <Link to="/sbm/demands" className="text-primary-600 hover:underline">Back to Demands list</Link>
      </p>
    </DemandDetailsView>
  );
};

export default SBMDemandDetails;
