import { useState } from "react";
import Modal, { ModalButton } from "./Modal";

/**
 * Reusable confirmation dialog component for destructive actions
 * 
 * Uses the responsive Modal component to ensure proper display across all breakpoints.
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={title}
      maxWidth="max-w-md"
      showCloseButton={false}
      preventBackdropClose={isProcessing}
      footer={
        <>
          <ModalButton
            variant="secondary"
            onClick={handleCancel}
            disabled={isProcessing}
          >
            {cancelText}
          </ModalButton>
          <ModalButton
            variant={confirmStyle}
            onClick={handleConfirm}
            disabled={isProcessing || !isTypingValid}
          >
            {isProcessing ? "Processing..." : confirmText}
          </ModalButton>
        </>
      }
    >
      {/* Message */}
      <p className="text-[#565c52] text-sm mb-4 leading-relaxed whitespace-pre-line">
        {message}
      </p>

      {/* Typing Confirmation Input */}
      {requiresTyping && (
        <div className="mb-2">
          <input
            type="text"
            value={typedValue}
            onChange={(e) => setTypedValue(e.target.value)}
            placeholder={`Type "${typingValue}" to confirm`}
            className={`
              w-full px-4 py-3 min-h-[44px] border rounded-xl focus:outline-none focus:ring-2 transition-colors text-sm
              ${isTypingValid && typedValue ? 'border-green-500 focus:ring-green-500' : 'border-[#e2e6dc] focus:ring-sky-500'}
            `}
            disabled={isProcessing}
            autoFocus
          />
          {typedValue && !isTypingValid && (
            <p className="text-red-600 text-xs mt-2">
              Text doesn't match. Please type exactly: "{typingValue}"
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}