import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { noticeAPI } from '../../services/api';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import DetailPageLayout, { DetailRow } from '../../components/DetailPageLayout';

const SBMNoticeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const sp = new URLSearchParams(location.search || '');
  const mod = (sp.get('module') || '').toUpperCase();
  const backTo = mod ? `/sbm/notices?module=${encodeURIComponent(mod)}` : '/sbm/notices';

  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await noticeAPI.getById(id);
        if (!cancelled) setNotice(res.data?.data?.notice ?? null);
      } catch (e) {
        toast.error(e.response?.data?.message || 'Failed to load notice details');
        if (!cancelled) navigate(backTo, { replace: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading && !notice) return <Loading />;
  if (!notice) return null;

  return (
    <DetailPageLayout
      title="Notice Details (Read-only)"
      subtitle={notice.noticeNumber || notice.id}
      actionButtons={<Link to={backTo} className="btn btn-secondary">Back to Notices</Link>}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Notice</h2>
          <dl className="space-y-0">
            <DetailRow label="Notice Number" value={notice.noticeNumber} />
            <DetailRow label="Type" value={notice.noticeType} />
            <DetailRow label="Status" value={notice.status} />
            <DetailRow label="Financial Year" value={notice.financialYear} />
            <DetailRow label="Generated At" value={notice.createdAt ? new Date(notice.createdAt).toLocaleString() : null} />
          </dl>
        </div>
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Linked Records</h2>
          <dl className="space-y-0">
            <DetailRow label="Demand" value={notice.demand?.demandNumber} />
            <DetailRow label="Property" value={notice.property?.propertyNumber} />
            <DetailRow label="Owner" value={notice.owner ? `${notice.owner.firstName || ''} ${notice.owner.lastName || ''}`.trim() : null} />
          </dl>
          <div className="mt-4 flex gap-4 text-sm">
            {notice.demand?.id && (
              <Link
                to={`/sbm/demands/${notice.demand.id}${mod ? `?module=${encodeURIComponent(mod)}` : ''}`}
                className="text-violet-600 hover:text-violet-800 font-medium"
              >
                View Demand →
              </Link>
            )}
            {notice.property?.id && (
              <Link to={`/sbm/properties/${notice.property.id}`} className="text-violet-600 hover:text-violet-800 font-medium">
                View Property →
              </Link>
            )}
          </div>
        </div>
      </div>
    </DetailPageLayout>
  );
};

export default SBMNoticeDetails;

