import { X, User, Calendar, FileText, Globe, Monitor } from 'lucide-react';

const AuditLogDetailsModal = ({ log, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold">Audit Log Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-sm text-gray-500 flex items-center mb-1">
                <Calendar className="w-4 h-4 mr-1" />
                Timestamp
              </label>
              <p className="font-medium">{new Date(log.timestamp).toLocaleString()}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500 flex items-center mb-1">
                <User className="w-4 h-4 mr-1" />
                Actor
              </label>
              <p className="font-medium">
                {log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : 'System'}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Role</label>
              <p className="font-medium capitalize">{log.actorRole}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Action Type</label>
              <p className="font-medium">{log.actionType}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Entity Type</label>
              <p className="font-medium">{log.entityType}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Entity ID</label>
              <p className="font-medium">{log.entityId || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500 flex items-center mb-1">
                <Globe className="w-4 h-4 mr-1" />
                IP Address
              </label>
              <p className="font-medium">{log.ipAddress || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500 flex items-center mb-1">
                <Monitor className="w-4 h-4 mr-1" />
                User Agent
              </label>
              <p className="text-sm text-gray-600 truncate" title={log.userAgent}>
                {log.userAgent || 'N/A'}
              </p>
            </div>
          </div>

          {/* Description */}
          {log.description && (
            <div>
              <label className="text-sm text-gray-500 flex items-center mb-2">
                <FileText className="w-4 h-4 mr-1" />
                Description
              </label>
              <p className="text-gray-900">{log.description}</p>
            </div>
          )}

          {/* Previous Data */}
          {log.previousData && (
            <div>
              <label className="text-sm text-gray-500 mb-2 block">Previous Data</label>
              <pre className="bg-gray-50 p-4 rounded border overflow-x-auto text-sm">
                {JSON.stringify(log.previousData, null, 2)}
              </pre>
            </div>
          )}

          {/* New Data */}
          {log.newData && (
            <div>
              <label className="text-sm text-gray-500 mb-2 block">New Data</label>
              <pre className="bg-green-50 p-4 rounded border overflow-x-auto text-sm">
                {JSON.stringify(log.newData, null, 2)}
              </pre>
            </div>
          )}

          {/* Metadata */}
          {log.metadata && (
            <div>
              <label className="text-sm text-gray-500 mb-2 block">Metadata</label>
              <pre className="bg-blue-50 p-4 rounded border overflow-x-auto text-sm">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="p-6 border-t flex justify-end">
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuditLogDetailsModal;
