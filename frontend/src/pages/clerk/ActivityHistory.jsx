import { useState, useEffect } from 'react';
import { auditLogAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { History, Filter, Calendar } from 'lucide-react';

const ActivityHistory = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    fetchActivities();
  }, [filter]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const params = filter !== 'ALL' ? { actionType: filter } : {};
      const response = await auditLogAPI.getAll(params);
      setActivities(response.data.data.logs || []);
    } catch (error) {
      toast.error('Failed to fetch activity history');
    } finally {
      setLoading(false);
    }
  };

  const getActionStyle = (actionType) => {
    const styles = {
      CREATE: { badge: 'bg-green-100 text-green-800 border-green-200', border: 'border-l-green-500' },
      UPDATE: { badge: 'bg-blue-100 text-blue-800 border-blue-200', border: 'border-l-blue-500' },
      DELETE: { badge: 'bg-red-100 text-red-800 border-red-200', border: 'border-l-red-500' },
      SUBMIT: { badge: 'bg-purple-100 text-purple-800 border-purple-200', border: 'border-l-purple-500' },
      APPROVE: { badge: 'bg-green-100 text-green-800 border-green-200', border: 'border-l-green-500' },
      REJECT: { badge: 'bg-red-100 text-red-800 border-red-200', border: 'border-l-red-500' },
      RETURN: { badge: 'bg-amber-100 text-amber-800 border-amber-200', border: 'border-l-amber-500' }
    };
    return styles[actionType] || { badge: 'bg-gray-100 text-gray-800 border-gray-200', border: 'border-l-gray-400' };
  };

  const filterOptions = ['ALL', 'CREATE', 'UPDATE', 'DELETE', 'SUBMIT', 'APPROVE', 'REJECT', 'RETURN'];

  if (loading && !activities.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="ds-page-header">
        <div>
          <h1 className="ds-page-title flex items-center gap-2">
            <History className="w-7 h-7 text-primary-600" />
            Activity History
          </h1>
          <p className="ds-page-subtitle">Track all your actions and changes</p>
        </div>
      </div>

      <div className="card rounded-xl border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-5 h-5 text-gray-500 shrink-0" />
          <span className="text-sm font-medium text-gray-700 shrink-0">Filter by action:</span>
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => setFilter(action)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === action
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                }`}
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="card rounded-xl border border-gray-100 text-center py-14">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No Activity Found</h3>
          <p className="text-gray-500 text-sm">
            {filter === 'ALL'
              ? 'Your activity history will appear here'
              : `No activities of type: ${filter}`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => {
            const style = getActionStyle(activity.actionType);
            return (
              <div
                key={activity.id}
                className={`bg-white rounded-xl border border-gray-100 border-l-4 ${style.border} shadow-sm hover:shadow-md transition-shadow p-4`}
              >
                <div className="flex flex-wrap items-center gap-2 gap-y-1 mb-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${style.badge}`}>
                    {activity.actionType}
                  </span>
                  <span className="text-sm text-gray-500">{activity.entityType}</span>
                  {activity.entityId != null && (
                    <span className="text-sm text-gray-400">ID: {activity.entityId}</span>
                  )}
                  <span className="text-sm text-gray-400 ml-auto">
                    {new Date(activity.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-gray-900 text-sm leading-snug mb-1">{activity.description}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                  {activity.ipAddress && <span>IP: {activity.ipAddress}</span>}
                  {activity.device && <span>{activity.device}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ActivityHistory;
