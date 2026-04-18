import { X, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SessionCompletionPrompt({ isOpen, onClose, session }) {
  const navigate = useNavigate();

  if (!isOpen || !session) return null;

  const handleGoToNode = () => {
    onClose();
    // Room session — navigate to room node detail
    if (session.roomId && session.roomSkillMapId && session.nodeId) {
      navigate(`/roomspace/${session.roomId}/skill-maps/${session.roomSkillMapId}/nodes/${session.nodeId}`);
      return;
    }
    // Personal skill map session
    if (session.skillId && session.nodeId) {
      navigate(`/skills/${session.skillId}/nodes/${session.nodeId}`);
      return;
    }
    navigate('/log-practice');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 text-center">
        <div className="flex justify-end mb-2">
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-gray-900 mb-2">Session Complete!</h2>
        <p className="text-sm text-gray-500 mb-5">Great work! Go to the node to log your practice.</p>
        <button
          onClick={handleGoToNode}
          className="w-full py-2.5 bg-site-accent text-white rounded-lg font-semibold hover:bg-site-accent-hover transition-colors"
        >
          Go to Node
        </button>
      </div>
    </div>
  );
}
