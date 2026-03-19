import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { userAPI } from '../../services/api';
import DetailPageLayout, { DetailRow } from '../../components/DetailPageLayout';
import toast from 'react-hot-toast';

const SBMAdminAccountDetail = () => {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [ulbs, setUlbs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin-management/ulbs').then((res) => {
      const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setUlbs(Array.isArray(data) ? data : []);
    }).catch(() => setUlbs([]));
  }, []);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    userAPI.getById(id)
      .then((res) => {
        if (!cancelled) setUser(res.data?.data?.user ?? res.data?.user ?? null);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load admin account details');
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
        <p className="text-gray-500">Admin account not found.</p>
        <Link to="/sbm/admin-accounts" className="text-violet-600 hover:underline mt-2 inline-block">Back to Admin Management</Link>
      </div>
    );
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || '—';
  const ulbName = user.ulb_id ? (ulbs.find((u) => u.id === user.ulb_id)?.name ?? user.ulb_id) : '—';

  return (
    <DetailPageLayout
      title="Admin Account Details (Read-only)"
      subtitle={fullName}
      actionButtons={<Link to="/sbm/admin-accounts" className="btn btn-secondary">Back to Admin Management</Link>}
    >
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Account Information</h2>
        <dl className="space-y-0">
          <DetailRow label="Name" value={fullName} />
          <DetailRow label="Email" value={user.email} />
          <DetailRow label="Username" value={user.username} />
          <DetailRow label="ULB" value={ulbName} />
          <DetailRow label="Status" value={user.isActive !== false ? 'Active' : 'Inactive'} valueClass={user.isActive !== false ? 'text-green-700' : 'text-gray-700'} />
        </dl>
      </div>
    </DetailPageLayout>
  );
};

export default SBMAdminAccountDetail;
