import { useState } from 'react';
import { useSkillMap } from '../context/SkillMapContext';
import { useActiveSessions } from '../context/ActiveSessionContext';
import NodeDetailModal from './NodeDetailModal';

export default function NodeCard({ node }) {
  const [showLockedMessage, setShowLockedMessage] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const { startSession, currentSkill } = useSkillMap();
  const { addSession } = useActiveSessions();

  // Determine if node is clickable
  const isClickable = ['Unlocked', 'In_Progress', 'Completed'].includes(node.status);
  const isLocked = node.status === 'Locked';

  // Status icon rendering
  const renderStatusIcon = () => {
    switch (node.status) {
      case 'Locked':
        return (
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        );
      case 'Completed':
        return (
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'In_Progress':
        return (
          <svg className="w-6 h-6 text-ll-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'Unlocked':
        return (
          <svg className="w-6 h-6 text-ll-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
          </svg>
        );
      default:
        return null;
    }
  };

  // Handle card click
  const handleClick = () => {
    if (isLocked) {
      setShowLockedMessage(true);
      setTimeout(() => setShowLockedMessage(false), 3000);
    } else if (isClickable) {
      setShowDetailModal(true);
    }
  };

  // Handle session start
  const handleStartSession = async (e) => {
    e.stopPropagation(); // Prevent card click
    try {
      // Start session in backend (updates node status)
      const sessionData = await startSession(node._id);
      
      // Add session to active sessions popup with node and skill context
      addSession({
        skillName: currentSkill?.name || `Node ${node.order}`,
        nodeId: node._id,
        skillId: node.skillId,
        tags: [currentSkill?.name || 'Skill Map'],
        notes: node.title || `Node ${node.order}`,
        timer: 0,
        targetTime: 0,
        isCountdown: false,
        isRunning: true
      });
      
      console.log('Session started for node:', node._id);
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  // Show session button for Unlocked and In_Progress nodes
  const showSessionButton = ['Unlocked', 'In_Progress'].includes(node.status);

  return (
    <>
      <div
        onClick={handleClick}
        className={`relative bg-white rounded-lg shadow-md p-4 sm:p-6 transition-all duration-200 ${
          isClickable ? 'cursor-pointer hover:shadow-lg hover:scale-105' : 'cursor-not-allowed'
        } ${isLocked ? 'opacity-75' : ''} min-h-[120px]`}
      >
      {/* START/GOAL labels */}
      {node.isStart && (
        <div className="absolute -top-2.5 sm:-top-3 left-3 sm:left-4 bg-green-500 text-white text-xs font-bold px-2.5 sm:px-3 py-1 rounded-full">
          START
        </div>
      )}
      {node.isGoal && (
        <div className="absolute -top-2.5 sm:-top-3 left-3 sm:left-4 bg-purple-500 text-white text-xs font-bold px-2.5 sm:px-3 py-1 rounded-full">
          GOAL
        </div>
      )}

      {/* Node header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs sm:text-sm font-semibold text-gray-500">
              Node {node.order}
            </span>
            <div className="min-w-[24px] min-h-[24px] flex items-center justify-center">
              {renderStatusIcon()}
            </div>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-gray-900 break-words">
            {node.title || `Node ${node.order}`}
          </h3>
        </div>
      </div>

      {/* Node description */}
      {node.description && (
        <p className="text-xs sm:text-sm text-gray-600 mb-4 line-clamp-2 break-words">
          {node.description}
        </p>
      )}

      {/* Status badge and session button */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span
          className={`inline-block px-2.5 sm:px-3 py-1 rounded-full text-xs font-medium ${
            node.status === 'Completed'
              ? 'bg-green-100 text-green-800'
              : node.status === 'In_Progress'
              ? 'bg-ll-100 text-ll-800'
              : node.status === 'Unlocked'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {node.status.replace('_', ' ')}
        </span>

        {/* Start Practice Session button - touch-friendly */}
        {showSessionButton && (
          <button
            onClick={handleStartSession}
            className="px-3 sm:px-4 py-2 sm:py-1.5 bg-site-accent text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-site-accent-hover active:opacity-90 transition min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
          >
            <span className="hidden sm:inline">Start Session</span>
            <span className="sm:hidden">Start</span>
          </button>
        )}
      </div>

      {/* Locked message */}
      {showLockedMessage && (
        <div className="absolute inset-0 bg-black bg-opacity-75 rounded-lg flex items-center justify-center p-4">
          <div className="text-white text-center">
            <svg className="w-10 sm:w-12 h-10 sm:h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="font-medium text-sm sm:text-base">This node is locked</p>
            <p className="text-xs sm:text-sm text-gray-300 mt-1">
              Complete previous nodes to unlock
            </p>
          </div>
        </div>
      )}
    </div>

    {/* Node Detail Modal */}
    <NodeDetailModal
      isOpen={showDetailModal}
      onClose={() => setShowDetailModal(false)}
      nodeId={node._id}
    />
  </>
  );
}
