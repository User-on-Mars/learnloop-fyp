import { useState } from "react";

/**
 * Reusable confirmation dialog component for destructive actions
 * 
 * @param {Object} props
 * @param {string} props.title - Dialog title
 * @param {string} props.message - Confirmation message/warning text
 * @param {string} props.confirmText - Text for confirm button (default: "Confirm")
 * @param {string} props.cancelText - Text for cancel button (default: "Cancel")
 * @param {string} props.confirmStyle - Style variant for confirm button ("danger" | "primary")
 * @param {Function} props.onConfirm - Callback when user confirms (can be async)
 * @param {Function} props.onCancel - Callback when user cancels
 * @param {boolean} props.isOpen - Whether dialog is visible
 * @param {boolean} props.requiresTyping - Whether user must type a value to confirm
 * @param {string} props.typingValue - Expected value user must type (case-sensitive)
 */
export default function ConfirmationDialog({
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmStyle = "primary",
  onConfirm,
  onCancel,
  isOpen = true,
  requiresTyping = false,
  typingValue = ""
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [typedValue, setTypedValue] = useState("");

  if (!isOpen) return null;

  const isTypingValid = !requiresTyping || typedValue === typingValue;

  const handleConfirm = async () => {
    if (isProcessing || !isTypingValid) return;
    
    setIsProcessing(true);
    try {
      await onConfirm();
    } catch (error) {
      console.error("Confirmation action failed:", error);
      // Let the parent handle error display
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    if (isProcessing) return;
    setTypedValue(""); // Reset typed value
    onCancel();
  };

  // Determine confirm button styles based on variant
  const confirmButtonClass = confirmStyle === "danger"
    ? "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
    : "bg-site-accent text-white hover:bg-site-accent-hover focus:ring-site-accent";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-site-surface rounded-2xl shadow-xl w-full max-w-md p-6 border border-site-border">
        {/* Title */}
        <h3 className="text-lg font-bold text-site-ink mb-2">{title}</h3>
        
        {/* Message */}
        <p className="text-site-muted text-sm mb-4 leading-relaxed whitespace-pre-line">{message}</p>

        {/* Typing Confirmation Input */}
        {requiresTyping && (
          <div className="mb-6">
            <input
              type="text"
              value={typedValue}
              onChange={(e) => setTypedValue(e.target.value)}
              placeholder={`Type "${typingValue}" to confirm`}
              className={`
                w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-colors
                ${isTypingValid && typedValue ? 'border-green-500 focus:ring-green-500' : 'border-site-border focus:ring-site-accent'}
              `}
              disabled={isProcessing}
              autoFocus
            />
            {typedValue && !isTypingValid && (
              <p className="text-red-600 text-xs mt-1">
                Text doesn't match. Please type exactly: "{typingValue}"
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            disabled={isProcessing}
            className="flex-1 py-2.5 border border-site-border text-site-muted rounded-lg font-medium hover:bg-site-bg focus:outline-none focus:ring-2 focus:ring-site-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing || !isTypingValid}
            className={`flex-1 py-2.5 rounded-lg font-medium focus:outline-none focus:ring-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${confirmButtonClass}`}
          >
            {isProcessing ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}