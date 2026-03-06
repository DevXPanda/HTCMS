import { X, User, Calendar, FileText, Globe, Monitor, Tag } from 'lucide-react';

const AuditLogDetailsModal = ({ log, onClose }) => {
  const ts = log.timestamp || log.createdAt;
  const formattedTime = ts ? new Date(ts).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'medium', hour12: true }) : '—';

  const renderExtraDetails = (data) => {
    if (!data || typeof data !== 'object') return null;
    const entries = Object.entries(data);
    if (entries.length === 0) return null;
    return (
      <div className="space-y-2">
        {entries.map(([key, value]) => (
          <div key={key} className="flex gap-3 text-sm">
            <span className="text-gray-500 shrink-0 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
            <span className="text-gray-900 font-mono break-all">
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Audit log details</h2>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="modal-body space-y-5 overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="card bg-gray-50/80 p-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Timestamp</p>
              <p className="text-sm font-medium text-gray-900">{formattedTime}</p>
            </div>
            <div className="card bg-gray-50/80 p-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Actor</p>
              <p className="text-sm font-medium text-gray-900">
                {log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : 'System'}
              </p>
            </div>
            <div className="card bg-gray-50/80 p-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Role</p>
              <p className="text-sm font-medium text-gray-900 capitalize">{log.actorRole}</p>
            </div>
            <div className="card bg-gray-50/80 p-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Action</p>
              <p className="text-sm font-medium text-gray-900">{log.actionType}</p>
            </div>
            <div className="card bg-gray-50/80 p-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">Entity</p>
              <p className="text-sm font-medium text-gray-900">{log.entityType}{log.entityId != null ? ` #${log.entityId}` : ''}</p>
            </div>
            <div className="card bg-gray-50/80 p-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">IP address</p>
              <p className="text-sm font-mono text-gray-900">{log.ipAddress || '—'}</p>
            </div>
          </div>

          {log.description && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Description</p>
              <p className="text-sm text-gray-900 bg-gray-50/80 rounded-ds p-3 border border-gray-100">{log.description}</p>
            </div>
          )}

          {log.userAgent && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Monitor className="w-3.5 h-3.5" /> User agent
              </p>
              <p className="text-xs text-gray-600 bg-gray-50/80 rounded-ds p-3 border border-gray-100 break-all">{log.userAgent}</p>
            </div>
          )}

          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" /> Additional details
              </p>
              <div className="bg-gray-50/80 rounded-ds p-3 border border-gray-100 text-sm">
                {renderExtraDetails(log.metadata)}
              </div>
            </div>
          )}

          {log.previousData && Object.keys(log.previousData).length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Before change</p>
              <pre className="bg-gray-100 rounded-ds p-3 border border-gray-200 overflow-x-auto text-xs font-mono text-gray-800">
                {JSON.stringify(log.previousData, null, 2)}
              </pre>
            </div>
          )}

          {log.newData && Object.keys(log.newData).length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">After change</p>
              <pre className="bg-green-50 rounded-ds p-3 border border-green-100 overflow-x-auto text-xs font-mono text-gray-800">
                {JSON.stringify(log.newData, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuditLogDetailsModal;
