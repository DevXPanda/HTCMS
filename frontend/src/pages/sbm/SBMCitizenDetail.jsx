import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { userAPI } from '../../services/api';
import DetailPageLayout, { DetailRow } from '../../components/DetailPageLayout';
import toast from 'react-hot-toast';

const SBMCitizenDetail = () => {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    userAPI.getById(id)
      .then((res) => {
        if (!cancelled) setUser(res.data?.data?.user ?? res.data?.user ?? null);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load citizen details');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  if (loading && !user) {
    return (
      <div className="flex justify-center py-12">
        <div className="spinner spinner-md" />
      </div>
    );
  }
  if (!user) {
    return (
      <div className="card p-6 text-center">
        <p className="text-gray-500">Citizen not found.</p>
        <Link to="/sbm/citizen" className="text-violet-600 hover:underline mt-2 inline-block">Back to Citizen</Link>
      </div>
    );
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || '—';

  return (
    <DetailPageLayout
      title="Citizen Details (Read-only)"
      subtitle={fullName}
      actionButtons={<Link to="/sbm/citizen" className="btn btn-secondary">Back to Citizen</Link>}
    >
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">User Information</h2>
        <dl className="space-y-0">
          <DetailRow label="Name" value={fullName} />
          <DetailRow label="Email" value={user.email} />
          <DetailRow label="Phone" value={user.phone} />
          <DetailRow label="Username" value={user.username} />
          <DetailRow label="Status" value={user.isActive !== false ? 'Active' : 'Inactive'} valueClass={user.isActive !== false ? 'text-green-700' : 'text-gray-700'} />
        </dl>
      </div>
    </DetailPageLayout>
  );
};

export default SBMCitizenDetail;
