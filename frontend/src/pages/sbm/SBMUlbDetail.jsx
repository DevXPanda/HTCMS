import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import DetailPageLayout, { DetailRow } from '../../components/DetailPageLayout';
import { Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

const ULB_TYPE_OPTIONS = [
  { value: 'NAGAR_NIGAM', label: 'Nagar Nigam' },
  { value: 'NAGAR_PALIKA_PARISHAD', label: 'Nagar Palika Parishad' },
  { value: 'NAGAR_PANCHAYAT', label: 'Nagar Panchayat' }
];
const ulbTypeLabel = (value) => ULB_TYPE_OPTIONS.find((o) => o.value === value)?.label || value || '—';

const SBMUlbDetail = () => {
  const { id } = useParams();
  const [ulb, setUlb] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api.get('/admin-management/ulbs', { params: { includeInactive: 'true' } })
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
        const list = Array.isArray(data) ? data : [];
        const found = list.find((u) => u.id === id);
        if (!cancelled) setUlb(found ?? null);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load ULB details');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  if (loading && !ulb) {
    return (
      <div className="flex justify-center py-12">
        <div className="spinner spinner-md" />
      </div>
    );
  }
  if (!ulb) {
    return (
      <div className="card p-6 text-center">
        <p className="text-gray-500">ULB not found.</p>
        <Link to="/sbm/ulbs" className="text-violet-600 hover:underline mt-2 inline-block">Back to ULBs</Link>
      </div>
    );
  }

  return (
    <DetailPageLayout
      title="ULB Details (Read-only)"
      subtitle={ulb.name}
      actionButtons={<Link to="/sbm/ulbs" className="btn btn-secondary">Back to ULBs</Link>}
    >
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-gray-500" />
          ULB Information
        </h2>
        <dl className="space-y-0">
          <DetailRow label="Name" value={ulb.name} />
          <DetailRow label="Type" value={ulbTypeLabel(ulb.ulb_type)} />
          <DetailRow label="State" value={ulb.state} />
          <DetailRow label="District" value={ulb.district} />
          <DetailRow label="Status" value={ulb.status} valueClass={ulb.status === 'ACTIVE' ? 'text-green-700' : 'text-red-700'} />
        </dl>
      </div>
    </DetailPageLayout>
  );
};

export default SBMUlbDetail;
