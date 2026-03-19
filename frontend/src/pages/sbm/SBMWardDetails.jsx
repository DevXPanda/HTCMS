import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { wardAPI } from '../../services/api';
import DetailPageLayout, { DetailRow } from '../../components/DetailPageLayout';
import { MapPin, Users, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';

const formatWardNumber = (val) => {
  if (val == null || val === '') return '';
  const n = parseInt(String(val).trim(), 10);
  if (!Number.isNaN(n) && n >= 0) return String(n).padStart(3, '0');
  return String(val);
};

const SBMWardDetails = () => {
  const { id } = useParams();
  const [ward, setWard] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [wardRes, statsRes] = await Promise.all([
          wardAPI.getById(id),
          wardAPI.getStatistics(id).catch(() => ({ data: { data: { statistics: null } } }))
        ]);
        if (cancelled) return;
        setWard(wardRes.data?.data?.ward ?? null);
        setStatistics(statsRes.data?.data?.statistics ?? null);
      } catch (e) {
        if (!cancelled) toast.error('Failed to load ward details');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading && !ward) {
    return (
      <div className="flex justify-center py-12">
        <div className="spinner spinner-md" />
      </div>
    );
  }
  if (!ward) {
    return (
      <div className="card p-6 text-center">
        <p className="text-gray-500">Ward not found.</p>
        <Link to="/sbm/wards" className="text-violet-600 hover:underline mt-2 inline-block">Back to Wards</Link>
      </div>
    );
  }

  const summarySection = statistics ? (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="card bg-blue-50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Total Properties</p>
            <p className="text-2xl font-bold text-blue-600">{statistics.totalProperties ?? 0}</p>
          </div>
          <BarChart3 className="w-8 h-8 text-blue-400" />
        </div>
      </div>
      <div className="card bg-green-50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Total Collection</p>
            <p className="text-2xl font-bold text-green-600">
              ₹{parseFloat(statistics.totalCollection || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <BarChart3 className="w-8 h-8 text-green-400" />
        </div>
      </div>
      <div className="card bg-red-50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Outstanding</p>
            <p className="text-2xl font-bold text-red-600">
              ₹{parseFloat(statistics.totalOutstanding || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <BarChart3 className="w-8 h-8 text-red-400" />
        </div>
      </div>
      <div className="card bg-orange-50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Pending Demands</p>
            <p className="text-2xl font-bold text-orange-600">{statistics.pendingDemands ?? 0}</p>
          </div>
          <BarChart3 className="w-8 h-8 text-orange-400" />
        </div>
      </div>
    </div>
  ) : null;

  const staffLabel = (role) => (ward[role] ? (ward[role].full_name || `${ward[role].firstName || ''} ${ward[role].lastName || ''}`).trim() : null);

  return (
    <DetailPageLayout
      title="Ward Details (Read-only)"
      subtitle={ward.wardName}
      actionButtons={
        <Link to="/sbm/wards" className="btn btn-secondary">Back to Wards</Link>
      }
      summarySection={summarySection}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-gray-500" />
            Ward Information
          </h2>
          <dl className="space-y-0">
            <DetailRow label="ULB" value={ward.ulb?.name} />
            <DetailRow label="Ward Number" value={formatWardNumber(ward.wardNumber)} />
            <DetailRow label="Ward Name" value={ward.wardName} />
            <DetailRow
              label="Status"
              value={ward.isActive ? 'Active' : 'Inactive'}
              valueClass={ward.isActive ? 'text-green-700' : 'text-red-700'}
            />
            <DetailRow label="Description" value={ward.description} />
          </dl>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-500" />
            Assigned Staff
          </h2>
          {(ward.collector || ward.clerk || ward.inspector || ward.officer) ? (
            <div className="space-y-4">
              {ward.collector && (
                <div className="pb-3 border-b border-gray-100">
                  <div className="text-xs font-medium text-gray-500 uppercase mb-1">Collector</div>
                  <p className="font-medium text-gray-900">{staffLabel('collector') || '—'}</p>
                  <p className="text-sm text-gray-600">{ward.collector.email}</p>
                  {ward.collector.phone_number && <p className="text-sm text-gray-600">{ward.collector.phone_number}</p>}
                </div>
              )}
              {ward.clerk && (
                <div className="pb-3 border-b border-gray-100">
                  <div className="text-xs font-medium text-gray-500 uppercase mb-1">Clerk</div>
                  <p className="font-medium text-gray-900">{staffLabel('clerk') || '—'}</p>
                  <p className="text-sm text-gray-600">{ward.clerk.email}</p>
                </div>
              )}
              {ward.inspector && (
                <div className="pb-3 border-b border-gray-100">
                  <div className="text-xs font-medium text-gray-500 uppercase mb-1">Inspector</div>
                  <p className="font-medium text-gray-900">{staffLabel('inspector') || '—'}</p>
                  <p className="text-sm text-gray-600">{ward.inspector.email}</p>
                </div>
              )}
              {ward.officer && (
                <div className="pb-3">
                  <div className="text-xs font-medium text-gray-500 uppercase mb-1">Officer</div>
                  <p className="font-medium text-gray-900">{staffLabel('officer') || '—'}</p>
                  <p className="text-sm text-gray-600">{ward.officer.email}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500">No staff assigned to this ward.</p>
          )}
        </div>
      </div>

      {ward.properties && ward.properties.length > 0 && (
        <div className="card mt-6">
          <h2 className="text-lg font-semibold mb-4">Properties in this Ward ({ward.properties.length})</h2>
          <div className="table-wrap">
            <table className="table min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Property Number</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase no-print">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ward.properties.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">{p.propertyNumber}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{p.address || '—'}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">
                      {p.owner ? [p.owner.firstName, p.owner.lastName].filter(Boolean).join(' ') : '—'}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600 capitalize">{p.propertyType || '—'}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${p.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {p.status || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm print-hide-col">
                      <Link to={`/sbm/properties/${p.id}`} className="text-violet-600 hover:text-violet-800">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DetailPageLayout>
  );
};

export default SBMWardDetails;
