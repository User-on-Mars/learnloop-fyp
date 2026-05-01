import { useState, useEffect } from 'react';
import { X, Calendar, Clock } from 'lucide-react';
import { useSkillMap } from '../context/SkillMapContext';
import EditNodeForm from './EditNodeForm';
import NodeStatusManager from './NodeStatusManager';

export default function NodeDetailModal({ isOpen, onClose, nodeId }) {
  const { getNodeDetails } = useSkillMap();
  const [nodeData, setNodeData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && nodeId) {
      loadNodeDetails();
    }
  }, [isOpen, nodeId]);

  const loadNodeDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getNodeDetails(nodeId);
      setNodeData(data);
    } catch (err) {
      setError(err.message || 'Failed to load node details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setNodeData(null);
    setError(null);
    onClose();
  };

  const handleNodeUpdate = () => {
    // Reload node details after update
    loadNodeDetails();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-white">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-10 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Node Details</h2>
          <button
            onClick={handleClose}
            className="p-2.5 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Content - Full width on mobile with responsive padding */}
      <div className="w-full px-4 sm:px-6 py-6">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-site-accent"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-300 text-red-700 p-3 sm:p-4 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Content */}
        {!isLoading && !error && nodeData && (
          <div className="space-y-4 sm:space-y-6">
            {/* Node Info */}
            <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
              <div className="flex items-start justify-between mb-2 gap-2">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 break-words flex-1">
                  {nodeData.node.title || `Node ${nodeData.node.order}`}
                </h3>
                <span className="text-xs sm:text-sm font-medium text-gray-500 whitespace-nowrap">
                  Order: {nodeData.node.order}
                </span>
              </div>
              
              {nodeData.node.description && (
                <p className="text-xs sm:text-sm text-gray-700 mb-3 break-words">
                  {nodeData.node.description}
                </p>
              )}

              <div className="flex items-center gap-2">
                <span
                  className={`inline-block px-2.5 sm:px-3 py-1 rounded-full text-xs font-medium ${
                    nodeData.node.status === 'Completed'
                      ? 'bg-green-100 text-green-800'
                      : nodeData.node.status === 'In_Progress'
                      ? 'bg-ll-100 text-ll-800'
                      : nodeData.node.status === 'Unlocked'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {nodeData.node.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Start Session Button */}
            <button
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 min-h-[44px] bg-site-accent text-white rounded-lg font-semibold hover:bg-site-accent-hover transition-colors shadow-md"
            >
              <Clock className="w-5 h-5" />
              Start Session
            </button>

            {/* Edit Node Form */}
            <EditNodeForm 
              node={nodeData.node} 
              onUpdate={handleNodeUpdate}
            />

            {/* Status Manager */}
            <NodeStatusManager 
              node={nodeData.node}
              onUpdate={handleNodeUpdate}
            />

            {/* Linked Sessions */}
            <div>
              <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">
                Practice Sessions ({nodeData.sessions?.length || 0})
              </h4>
              {nodeData.sessions && nodeData.sessions.length > 0 ? (
                <div className="space-y-2">
                  {nodeData.sessions.map((session) => (
                    <div
                      key={session._id}
                      className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-xs sm:text-sm text-gray-700">
                          Duration: {Math.floor(session.duration / 60)} min
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        {new Date(session.date || session.startTime).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-gray-500 italic">No practice sessions yet</p>
              )}
            </div>

            {/* Linked Reflections */}
            <div>
              <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">
                Reflections ({nodeData.reflections?.length || 0})
              </h4>
              {nodeData.reflections && nodeData.reflections.length > 0 ? (
                <div className="space-y-2">
                  {nodeData.reflections.map((reflection) => (
                    <div
                      key={reflection._id}
                      className="bg-white border border-gray-200 rounded-lg p-3"
                    >
                      <p className="text-xs sm:text-sm text-gray-700 mb-2 break-words">
                        {reflection.content}
                      </p>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                        {reflection.mood && (
                          <span className="px-2 py-1 bg-gray-100 rounded">
                            Mood: {reflection.mood}
                          </span>
                        )}
                        <span>
                          {new Date(reflection.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-gray-500 italic">No reflections yet</p>
              )}
            </div>

            {/* Linked Blockers */}
            <div>
              <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">
                Blockers ({nodeData.blockers?.length || 0})
              </h4>
              {nodeData.blockers && nodeData.blockers.length > 0 ? (
                <div className="space-y-2">
                  {nodeData.blockers.map((blocker) => (
                    <div
                      key={blocker._id}
                      className="bg-red-50 border border-red-200 rounded-lg p-3"
                    >
                      <p className="text-xs sm:text-sm text-gray-700 break-words">
                        {blocker.description || blocker.content}
                      </p>
                      <span className="text-xs text-gray-500 mt-1 block">
                        {new Date(blocker.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-gray-500 italic">No blockers reported</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
