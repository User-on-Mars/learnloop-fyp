import { X, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * SessionCompletionPrompt - Displays after a session ends
 * Navigates user to log practice page to fill in mood and blockers
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the prompt is visible
 * @param {Function} props.onClose - Callback when prompt is closed
 * @param {Object} props.session - Session data including nodeId, skillId, duration
 */
export default function SessionCompletionPrompt({ 
  isOpen, 
  onClose, 
  session
}) {
  const navigate = useNavigate();

  if (!isOpen || !session) return null;

  const handleCompleteAndLog = () => {
    onClose();
    navigate('/log-practice', { 
      state: { 
        sessionId: session.id,
        nodeId: session.nodeId,
        skillId: session.skillId,
        duration: session.duration
      } 
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">Session Complete!</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-green-100 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 mb-6">
            Great work! Log your practice session to track your progress.
          </p>

          {/* Complete & Log Button */}
          <button
            onClick={handleCompleteAndLog}
            className="w-full py-3 bg-site-accent text-white rounded-lg font-semibold hover:bg-site-accent-hover transition-colors"
          >
            Complete & Log
          </button>
        </div>
      </div>
    </div>
  );
}
