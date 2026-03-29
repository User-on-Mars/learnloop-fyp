import { useNavigate, useParams } from 'react-router-dom';

export default function NodeCard({ node, compact = false }) {
  const { skillId } = useParams();
  const navigate = useNavigate();

  const isLocked = node.status === 'Locked';

  // Status icon rendering
  const renderStatusIcon = () => {
    switch (node.status) {
      case 'Locked':
        return (
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        );
      case 'Completed':
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'In_Progress':
        return (
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'Unlocked':
        return (
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const handleGoToNodePage = () => {
    if (!skillId) return;
    navigate(`/maps/${skillId}/nodes/${node._id}`);
  };

  const handleStartSession = (e) => {
    e.stopPropagation();
    if (!skillId) return;
    navigate(`/maps/${skillId}/nodes/${node._id}/session`);
  };

  // Show session button for Unlocked and In_Progress nodes
  const showSessionButton = ['Unlocked', 'In_Progress'].includes(node.status);

  if (compact) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleGoToNodePage}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleGoToNodePage();
          }
        }}
        className={`bg-white rounded-lg p-3 transition-all duration-200 border-2 cursor-pointer hover:shadow-md ${
          node.status === 'Completed'
            ? 'border-green-500 bg-green-50'
            : node.status === 'Unlocked' || node.status === 'In_Progress'
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-gray-50 opacity-75'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            {renderStatusIcon()}
            <h3 className="text-sm font-bold text-gray-900 truncate">
              {node.title || `Node ${node.order}`}
            </h3>
          </div>
          
          {showSessionButton && (
            <button
              type="button"
              onClick={handleStartSession}
              className="px-3 py-1.5 bg-site-accent text-white text-xs font-medium rounded-lg hover:bg-site-accent-hover transition shrink-0"
            >
              Start Session
            </button>
          )}
        </div>

        {node.description && (
          <p className="text-xs text-gray-600 mt-2 line-clamp-1">
            {node.description}
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={handleGoToNodePage}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleGoToNodePage();
          }
        }}
        className={`relative bg-white rounded-lg p-4 sm:p-6 transition-colors duration-200 border border-site-accent-border outline-none focus-visible:ring-2 focus-visible:ring-site-accent focus-visible:ring-offset-0 cursor-pointer hover:border-site-accent hover:shadow-sm active:border-site-accent ${
          isLocked ? 'opacity-75' : ''
        } min-h-[120px]`}
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
            type="button"
            onClick={handleStartSession}
            className="px-3 sm:px-4 py-2 sm:py-1.5 bg-site-accent text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-site-accent-hover active:opacity-90 transition min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-site-accent"
          >
            <span className="hidden sm:inline">Start Session</span>
            <span className="sm:hidden">Start</span>
          </button>
        )}
      </div>

    </div>
  </>
  );
}
