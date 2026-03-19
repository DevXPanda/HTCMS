import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import DetailPageLayout, { DetailRow } from '../../components/DetailPageLayout';
import toast from 'react-hot-toast';

const SBMStaffDetail = () => {
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api.get(`/admin-management/employees/${id}`)
      .then((res) => {
        if (!cancelled) setEmployee(res.data ?? null);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load staff details');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  if (loading && !employee) {
    return (
      <div className="flex justify-center py-12">
        <div className="spinner spinner-md" />
      </div>
    );
  }
  if (!employee) {
    return (
      <div className="card p-6 text-center">
        <p className="text-gray-500">Staff not found.</p>
        <Link to="/sbm/staff" className="text-violet-600 hover:underline mt-2 inline-block">Back to Staff</Link>
      </div>
    );
  }

  return (
    <DetailPageLayout
      title="Staff Details (Read-only)"
      subtitle={employee.full_name}
      actionButtons={<Link to="/sbm/staff" className="btn btn-secondary">Back to Staff</Link>}
    >
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Employee Information</h2>
        <dl className="space-y-0">
          <DetailRow label="Employee ID" value={employee.employee_id} />
          <DetailRow label="Full Name" value={employee.full_name} />
          <DetailRow label="Role" value={employee.role} />
          <DetailRow label="Email" value={employee.email} />
          <DetailRow label="Phone" value={employee.phone_number} />
          <DetailRow label="Status" value={employee.status} valueClass={employee.status === 'ACTIVE' ? 'text-green-700' : 'text-gray-700'} />
          <DetailRow label="Wards" value={Array.isArray(employee.ward_names) ? employee.ward_names.join(', ') : employee.ward_names} />
        </dl>
      </div>
    </DetailPageLayout>
  );
};

export default SBMStaffDetail;
