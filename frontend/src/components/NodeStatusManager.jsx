import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useSkillMap } from '../context/SkillMapContext';

export default function NodeStatusManager({ node, onUpdate }) {
  const { updateNodeStatus } = useSkillMap();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);

  const isLocked = node.status === 'Locked';

  // Define available status transitions based on current status
  const getAvailableStatuses = () => {
    switch (node.status) {
      case 'Unlocked':
        return ['In_Progress', 'Completed'];
      case 'In_Progress':
        return ['Unlocked', 'Completed'];
      case 'Completed':
        return ['Unlocked', 'In_Progress'];
      case 'Locked':
      default:
        return [];
    }
  };

  const availableStatuses = getAvailableStatuses();

  const handleStatusChange = async (newStatus) => {
    setIsUpdating(true);
    setError(null);

    try {
      await updateNodeStatus(node._id, newStatus);
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (err) {
      setError(err.message || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-600 hover:bg-green-700';
      case 'In_Progress':
        return 'bg-site-accent hover:bg-site-accent-hover';
      case 'Unlocked':
        return 'bg-blue-600 hover:bg-blue-700';
      case 'Locked':
        return 'bg-gray-400';
      default:
        return 'bg-gray-600 hover:bg-gray-700';
    }
  };

  const formatStatusLabel = (status) => {
    return status.replace('_', ' ');
  };

  return (
    <div className="border border-gray-200 rounded-lg p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <h4 className="text-base sm:text-lg font-semibold text-gray-900">Manage Status</h4>
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-gray-400" />
          <span className="text-xs sm:text-sm text-gray-600">
            Current: <span className="font-medium">{formatStatusLabel(node.status)}</span>
          </span>
        </div>
      </div>

      {isLocked && (
        <p className="text-xs sm:text-sm text-gray-500 italic">
          Locked nodes cannot have their status changed manually
        </p>
      )}

      {!isLocked && availableStatuses.length > 0 && (
        <div>
          <p className="text-xs sm:text-sm text-gray-600 mb-3">
            Change status to:
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            {availableStatuses.map((status) => (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                disabled={isUpdating}
                className={`w-full sm:flex-1 px-4 py-3 sm:py-2 rounded-lg text-white font-medium transition-colors disabled:opacity-50 min-h-[44px] text-sm ${getStatusColor(status)}`}
              >
                {formatStatusLabel(status)}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 bg-red-50 border border-red-300 text-red-700 p-3 rounded-lg text-xs sm:text-sm">
          {error}
        </div>
      )}

      {isUpdating && (
        <div className="mt-3 flex items-center gap-2 text-xs sm:text-sm text-gray-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-site-accent"></div>
          Updating status...
        </div>
      )}
    </div>
  );
}
