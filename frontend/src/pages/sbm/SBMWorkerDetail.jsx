import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { workerAPI } from '../../services/api';
import DetailPageLayout, { DetailRow } from '../../components/DetailPageLayout';
import toast from 'react-hot-toast';

const SBMWorkerDetail = () => {
  const { id } = useParams();
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    workerAPI.getById(id)
      .then((res) => {
        if (!cancelled) setWorker(res.data?.data?.worker ?? null);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load worker details');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  if (loading && !worker) {
    return (
      <div className="flex justify-center py-12">
        <div className="spinner spinner-md" />
      </div>
    );
  }
  if (!worker) {
    return (
      <div className="card p-6 text-center">
        <p className="text-gray-500">Worker not found.</p>
        <Link to="/sbm/workers" className="text-violet-600 hover:underline mt-2 inline-block">Back to Field Workers</Link>
      </div>
    );
  }

  const wardDisplay = worker.ward ? [worker.ward.wardNumber, worker.ward.wardName].filter(Boolean).join(' - ') : (worker.ward_id ?? '—');
  const supervisorStr = worker.supervisor
    ? (worker.supervisor.full_name || '') + (worker.supervisor.employee_id ? ' (' + worker.supervisor.employee_id + ')' : '')
    : '';
  const supervisorDisplay = supervisorStr.trim() || '—';
  const typeDisplay = worker.worker_type === 'OTHER' && worker.worker_type_other ? 'Other (' + worker.worker_type_other + ')' : (worker.worker_type || '—');

  return (
    <DetailPageLayout
      title="Field Worker Details (Read-only)"
      subtitle={worker.full_name ?? worker.name}
      actionButtons={<Link to="/sbm/workers" className="btn btn-secondary">Back to Field Workers</Link>}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Worker Information</h2>
          <dl className="space-y-0">
            <DetailRow label="Employee Code" value={worker.employee_code} />
            <DetailRow label="Full Name" value={worker.full_name ?? worker.name} />
            <DetailRow label="Mobile" value={worker.mobile ?? worker.phone} />
            <DetailRow label="Worker Type" value={typeDisplay} />
            <DetailRow label="Ward" value={wardDisplay} />
            <DetailRow label="Supervisor" value={supervisorDisplay} />
            <DetailRow label="Status" value={worker.status} valueClass={(worker.status || '').toUpperCase() === 'ACTIVE' ? 'text-green-700' : 'text-red-700'} />
          </dl>
        </div>
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Assignment</h2>
          <dl className="space-y-0">
            <DetailRow label="ULB" value={worker.ulb?.name} />
            <DetailRow label="EO" value={worker.eo ? `${worker.eo.full_name || ''} (${worker.eo.employee_id || ''})` : '—'} />
            <DetailRow label="Contractor" value={worker.contractor ? (worker.contractor.company_name || worker.contractor.full_name) : '—'} />
          </dl>
        </div>
      </div>
    </DetailPageLayout>
  );
};

export default SBMWorkerDetail;
