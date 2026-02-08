import { useState, useEffect } from 'react';
import { auditLogAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { History, Filter } from 'lucide-react';

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

    const getActionBadge = (actionType) => {
        const badges = {
            CREATE: 'bg-green-100 text-green-700',
            UPDATE: 'bg-blue-100 text-blue-700',
            DELETE: 'bg-red-100 text-red-700',
            SUBMIT: 'bg-purple-100 text-purple-700',
            APPROVE: 'bg-green-100 text-green-700',
            REJECT: 'bg-red-100 text-red-700',
            RETURN: 'bg-orange-100 text-orange-700'
        };
        return badges[actionType] || 'bg-gray-100 text-gray-700';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                    <History className="w-8 h-8 mr-3 text-blue-600" />
                    Activity History
                </h1>
                <p className="text-gray-600 mt-1">Track all your actions and changes</p>
            </div>

            {/* Filter Section */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="flex items-center gap-3">
                    <Filter className="w-5 h-5 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Filter by Action:</span>
                    <div className="flex gap-2 flex-wrap">
                        {['ALL', 'CREATE', 'UPDATE', 'DELETE', 'SUBMIT', 'APPROVE', 'REJECT', 'RETURN'].map((action) => (
                            <button
                                key={action}
                                onClick={() => setFilter(action)}
                                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${filter === action
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {action}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Activities List */}
            {activities.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Activity Found</h3>
                    <p className="text-gray-600">
                        {filter === 'ALL'
                            ? 'Your activity history will appear here'
                            : `No activities of type: ${filter}`}
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow">
                    <div className="divide-y divide-gray-200">
                        {activities.map((activity) => (
                            <div key={activity.id} className="p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionBadge(activity.actionType)}`}>
                                                {activity.actionType}
                                            </span>
                                            <span className="text-sm text-gray-500">
                                                {activity.entityType}
                                            </span>
                                            {activity.entityId && (
                                                <span className="text-sm text-gray-400">
                                                    ID: {activity.entityId}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-gray-900 mb-1">{activity.description}</p>
                                        <div className="flex items-center gap-4 text-sm text-gray-500">
                                            <span>
                                                {new Date(activity.timestamp).toLocaleString()}
                                            </span>
                                            {activity.ipAddress && (
                                                <span>IP: {activity.ipAddress}</span>
                                            )}
                                            {activity.device && (
                                                <span>{activity.device}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActivityHistory;
