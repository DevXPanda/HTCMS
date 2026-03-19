import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, XCircle, Clock, RefreshCw, Eye, X, FileText, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { paymentApprovalRequestAPI } from '../../../services/api';
import { formatDateIST } from '../../../utils/dateUtils';

const badgeClass = (status) => {
  if (status === 'APPROVED') return 'bg-green-100 text-green-700';
  if (status === 'REJECTED') return 'bg-red-100 text-red-700';
  return 'bg-amber-100 text-amber-700';
};

const formatCurrency = (n) => `₹${parseFloat(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

const PaymentApprovalRequests = () => {
  const role = (localStorage.getItem('role') || '').toString().toUpperCase().replace(/-/g, '_');
  const isSuperAdmin = role === 'ADMIN';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await paymentApprovalRequestAPI.getAll({ limit: 100, status: status || undefined });
      setItems(res.data?.data?.requests || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load approval requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [status]);

  const pendingCount = useMemo(() => items.filter((x) => x.status === 'PENDING').length, [items]);

  const onApprove = async (id) => {
    try {
      setBusyId(id);
      await paymentApprovalRequestAPI.approve(id);
      toast.success('Request approved — adjustment applied and forwarded to collector');
      setDetailItem(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve request');
    } finally {
      setBusyId(null);
    }
  };

  const onReject = async (id) => {
    const reason = window.prompt('Enter rejection reason');
    if (reason === null) return;
    try {
      setBusyId(id);
      await paymentApprovalRequestAPI.reject(id, { rejection_reason: reason });
      toast.success('Request rejected');
      setDetailItem(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject request');
    } finally {
      setBusyId(null);
    }
  };

  const openDetail = async (it) => {
    try {
      setDetailLoading(true);
      setDetailItem(it);
      const res = await paymentApprovalRequestAPI.getById(it.id);
      if (res.data?.success) setDetailItem(res.data.data.request);
    } catch (_) {
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="ds-page-title">Approval Requests</h1>
          <p className="text-sm text-gray-600">
            {isSuperAdmin ? 'Review Account Officer requests and forward approved items to collector.' : 'Track your submitted requests.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm px-2 py-1 rounded bg-amber-50 text-amber-700">Pending: {pendingCount}</span>
          <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <button className="btn btn-secondary flex items-center gap-2" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Demand</th>
              <th>Module</th>
              <th>Adjustment</th>
              <th>Requested By</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={9} className="py-8 text-center text-gray-500">No requests found.</td></tr>
            ) : items.map((it) => (
              <tr key={it.id}>
                <td>{it.id}</td>
                <td>{it.requestType === 'DISCOUNT' ? 'Discount' : 'Penalty Waiver'}</td>
                <td className="font-medium">{it.demand?.demandNumber || it.demandId}</td>
                <td>{it.moduleType}</td>
                <td>{it.adjustmentType} ({Number(it.adjustmentValue || 0).toFixed(2)})</td>
                <td>{it.requester?.full_name || it.requestedByName || '—'}</td>
                <td className="text-sm text-gray-500">{formatDateIST(it.created_at || it.createdAt)}</td>
                <td>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${badgeClass(it.status)}`}>{it.status}</span>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <button className="btn btn-sm btn-secondary" onClick={() => openDetail(it)} title="View Details">
                      <Eye className="w-4 h-4" />
                    </button>
                    {isSuperAdmin && it.status === 'PENDING' && (
                      <>
                        <button className="btn btn-sm btn-primary" onClick={() => onApprove(it.id)} disabled={busyId === it.id}>
                          <CheckCircle2 className="w-4 h-4 mr-1" />Approve
                        </button>
                        <button className="btn btn-sm btn-secondary text-red-600" onClick={() => onReject(it.id)} disabled={busyId === it.id}>
                          <XCircle className="w-4 h-4 mr-1" />Reject
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detailItem && (
        <div className="modal-overlay" onClick={() => setDetailItem(null)}>
          <div className="modal-panel max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Request #{detailItem.id} — {detailItem.requestType === 'DISCOUNT' ? 'Discount' : 'Penalty Waiver'}
              </h3>
              <button type="button" onClick={() => setDetailItem(null)} className="modal-close" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="modal-body space-y-4">
              {detailLoading ? (
                <div className="text-center py-8 text-gray-500">Loading details...</div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1.5 rounded text-sm font-semibold ${badgeClass(detailItem.status)}`}>{detailItem.status}</span>
                    <span className="text-sm text-gray-500">{formatDateIST(detailItem.created_at || detailItem.createdAt)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <InfoBlock label="Request Type" value={detailItem.requestType === 'DISCOUNT' ? 'Discount' : 'Penalty Waiver'} />
                    <InfoBlock label="Module" value={detailItem.moduleType} />
                    <InfoBlock label="Demand" value={detailItem.demand?.demandNumber || `#${detailItem.demandId}`} />
                    <InfoBlock label="Demand Balance" value={formatCurrency(detailItem.demand?.balanceAmount)} />
                    <InfoBlock label="Adjustment Type" value={detailItem.adjustmentType} />
                    <InfoBlock label="Adjustment Value" value={detailItem.adjustmentType === 'PERCENTAGE' ? `${detailItem.adjustmentValue}%` : formatCurrency(detailItem.adjustmentValue)} />
                    <InfoBlock label="Property" value={detailItem.demand?.property?.propertyNumber || '—'} />
                    <InfoBlock label="Ward" value={detailItem.demand?.property?.ward?.wardNumber || '—'} />
                  </div>

                  <div className="border-t pt-4 mt-2">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Requested By</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <InfoBlock label="Name" value={detailItem.requester?.full_name || detailItem.requestedByName || '—'} />
                      <InfoBlock label="Employee ID" value={detailItem.requester?.employee_id || '—'} />
                      <InfoBlock label="ULB ID" value={detailItem.requester?.ulb_id || '—'} />
                    </div>
                  </div>

                  <div className="border-t pt-4 mt-2">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Reason</h4>
                    <p className="text-sm text-gray-800 bg-gray-50 p-3 rounded-md">{detailItem.reason || '—'}</p>
                  </div>

                  {detailItem.documentUrl && (
                    <div className="border-t pt-4 mt-2">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Proof Document</h4>
                      <div className="bg-gray-50 rounded-md p-3">
                        {/\.(jpg|jpeg|png|gif|webp)$/i.test(detailItem.documentUrl) ? (
                          <div className="space-y-2">
                            <img
                              src={detailItem.documentUrl.startsWith('http') ? detailItem.documentUrl : `${window.location.origin}${detailItem.documentUrl}`}
                              alt="Proof document"
                              className="max-h-64 rounded border object-contain"
                            />
                            <a
                              href={detailItem.documentUrl.startsWith('http') ? detailItem.documentUrl : `${window.location.origin}${detailItem.documentUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary-600 hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> Open full size
                            </a>
                          </div>
                        ) : (
                          <a
                            href={detailItem.documentUrl.startsWith('http') ? detailItem.documentUrl : `${window.location.origin}${detailItem.documentUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary-600 hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> View / Download Document
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {detailItem.status === 'REJECTED' && detailItem.rejectionReason && (
                    <div className="border-t pt-4 mt-2">
                      <h4 className="text-sm font-semibold text-red-700 mb-2">Rejection Reason</h4>
                      <p className="text-sm text-red-800 bg-red-50 p-3 rounded-md">{detailItem.rejectionReason}</p>
                    </div>
                  )}

                  {detailItem.status === 'APPROVED' && (
                    <div className="border-t pt-4 mt-2">
                      <h4 className="text-sm font-semibold text-green-700 mb-2">Approval Info</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <InfoBlock label="Approved At" value={formatDateIST(detailItem.approvedAt || detailItem.approved_at)} />
                        <InfoBlock label="Forwarded to Collector" value={detailItem.forwardedCollectorId ? `ID: ${detailItem.forwardedCollectorId}` : 'Not assigned'} />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="modal-footer flex items-center gap-2">
              {isSuperAdmin && detailItem.status === 'PENDING' && (
                <>
                  <button className="btn btn-primary" onClick={() => onApprove(detailItem.id)} disabled={busyId === detailItem.id}>
                    <CheckCircle2 className="w-4 h-4 mr-1" />Approve & Apply
                  </button>
                  <button className="btn btn-secondary text-red-600" onClick={() => onReject(detailItem.id)} disabled={busyId === detailItem.id}>
                    <XCircle className="w-4 h-4 mr-1" />Reject
                  </button>
                </>
              )}
              <button className="btn btn-secondary ml-auto" onClick={() => setDetailItem(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const InfoBlock = ({ label, value }) => (
  <div className="bg-gray-50 p-3 rounded-md">
    <p className="text-xs text-gray-500 uppercase">{label}</p>
    <p className="text-sm font-medium text-gray-900 mt-0.5">{value ?? '—'}</p>
  </div>
);

export default PaymentApprovalRequests;
