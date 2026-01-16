import { X, Calendar, Clock, MapPin, Monitor, Smartphone, Tablet, Globe, User, Info } from 'lucide-react';

const AttendanceDetailsModal = ({ record, onClose }) => {
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDuration = (minutes) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} hour${hours !== 1 ? 's' : ''} ${mins} minute${mins !== 1 ? 's' : ''}`;
  };

  const getDeviceIcon = (deviceType) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="w-5 h-5" />;
      case 'tablet':
        return <Tablet className="w-5 h-5" />;
      default:
        return <Monitor className="w-5 h-5" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Attendance Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Collector Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Collector Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Name</label>
                <p className="text-gray-900 font-medium">
                  {record.collector?.firstName} {record.collector?.lastName}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="text-gray-900">{record.collector?.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Phone</label>
                <p className="text-gray-900">{record.collector?.phone || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Attendance Times */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Attendance Times
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500 flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Login Time (Punch In)
                </label>
                <p className="text-gray-900 font-medium">{formatDateTime(record.loginAt)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Logout Time (Punch Out)
                </label>
                <p className="text-gray-900 font-medium">
                  {record.logoutAt ? formatDateTime(record.logoutAt) : 'Active Session'}
                </p>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-500">Working Duration</label>
                <p className="text-gray-900 font-medium text-lg">
                  {formatDuration(record.workingDurationMinutes)}
                </p>
              </div>
            </div>
          </div>

          {/* Location Information */}
          {(record.loginLatitude || record.loginLongitude || record.loginAddress) && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Location Information
              </h3>
              <div className="space-y-2">
                {record.loginAddress && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Address</label>
                    <p className="text-gray-900">{record.loginAddress}</p>
                  </div>
                )}
                {(record.loginLatitude || record.loginLongitude) && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Latitude</label>
                      <p className="text-gray-900 font-mono">{record.loginLatitude || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Longitude</label>
                      <p className="text-gray-900 font-mono">{record.loginLongitude || 'N/A'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Device Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              {getDeviceIcon(record.deviceType)}
              <span className="ml-2">Device Information</span>
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Device Type</label>
                <p className="text-gray-900 capitalize">{record.deviceType}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 flex items-center">
                  {record.source === 'mobile' ? <Smartphone className="w-4 h-4 mr-1" /> : <Globe className="w-4 h-4 mr-1" />}
                  Source
                </label>
                <p className="text-gray-900 capitalize">{record.source}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Browser</label>
                <p className="text-gray-900">{record.browserName || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Operating System</label>
                <p className="text-gray-900">{record.operatingSystem || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-500">IP Address</label>
                <p className="text-gray-900 font-mono">{record.ipAddress}</p>
              </div>
            </div>
          </div>

          {/* System Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Info className="w-5 h-5 mr-2" />
              System Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Auto Marked</label>
                <p className="text-gray-900">
                  {record.isAutoMarked ? (
                    <span className="text-green-600 font-medium">Yes (Automatic)</span>
                  ) : (
                    <span className="text-gray-600">No</span>
                  )}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Record Created</label>
                <p className="text-gray-900">{formatDateTime(record.createdAt)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="btn btn-primary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttendanceDetailsModal;
