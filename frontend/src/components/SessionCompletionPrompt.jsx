import { useState } from 'react';
import { X, MessageSquare, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from './Button';

/**
 * SessionCompletionPrompt - Displays after a session ends
 * Provides options to add reflection or report blocker, both pre-linked to the node
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the prompt is visible
 * @param {Function} props.onClose - Callback when prompt is closed
 * @param {Object} props.session - Session data including nodeId, skillId, duration
 * @param {Function} props.onAddReflection - Callback when user chooses to add reflection
 * @param {Function} props.onReportBlocker - Callback when user chooses to report blocker (optional)
 */
export default function SessionCompletionPrompt({ 
  isOpen, 
  onClose, 
  session,
  onAddReflection,
  onReportBlocker 
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !session) return null;

  const handleAddReflection = async () => {
    setIsSubmitting(true);
    try {
      await onAddReflection?.(session);
      onClose();
    } catch (error) {
      console.error('Error adding reflection:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReportBlocker = async () => {
    setIsSubmitting(true);
    try {
      await onReportBlocker?.(session);
      onClose();
    } catch (error) {
      console.error('Error reporting blocker:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onClose();
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
            onClick={handleSkip}
            className="text-white hover:text-green-100 transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 mb-6">
            Great work! Would you like to capture your learning insights?
          </p>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Add Reflection Button */}
            <button
              onClick={handleAddReflection}
              disabled={isSubmitting}
              className="w-full flex items-center gap-3 p-4 bg-site-soft hover:bg-site-bg border-2 border-site-border rounded-lg transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-site-accent rounded-full flex items-center justify-center group-hover:bg-site-accent-hover transition-colors">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-gray-900">Add Reflection</h3>
                <p className="text-sm text-gray-600">
                  Capture what you learned and how it went
                </p>
              </div>
            </button>

            {/* Report Blocker Button (if callback provided) */}
            {onReportBlocker && (
              <button
                onClick={handleReportBlocker}
                disabled={isSubmitting}
                className="w-full flex items-center gap-3 p-4 bg-orange-50 hover:bg-orange-100 border-2 border-orange-200 rounded-lg transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center group-hover:bg-orange-700 transition-colors">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-gray-900">Report Blocker</h3>
                  <p className="text-sm text-gray-600">
                    Document any obstacles you encountered
                  </p>
                </div>
              </button>
            )}
          </div>

          {/* Skip Button */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <Button
              onClick={handleSkip}
              disabled={isSubmitting}
              variant="secondary"
              className="w-full"
            >
              Skip for Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
