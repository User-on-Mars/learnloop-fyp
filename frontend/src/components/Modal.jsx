import { X } from 'lucide-react';

/**
 * Responsive Modal wrapper component
 * 
 * Provides a consistent modal experience across all screen sizes:
 * - Mobile: Nearly full-screen with outer padding
 * - Desktop: Centered with configurable max-width
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {Function} props.onClose - Callback when modal is closed
 * @param {string} props.title - Modal title (optional)
 * @param {React.ReactNode} props.children - Modal content
 * @param {React.ReactNode} props.footer - Footer content (buttons, actions)
 * @param {string} props.maxWidth - Max width class (default: "max-w-md")
 * @param {boolean} props.showCloseButton - Whether to show close button (default: true)
 * @param {string} props.closeButtonLabel - Aria label for close button (default: "Close modal")
 * @param {boolean} props.preventBackdropClose - Prevent closing on backdrop click (default: false)
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = "max-w-md",
  showCloseButton = true,
  closeButtonLabel = "Close modal",
  preventBackdropClose = false
}) {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !preventBackdropClose) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div 
        className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[90vh] overflow-hidden flex flex-col border border-[#e2e6dc]`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="px-5 sm:px-6 py-4 border-b border-[#e2e6dc] flex items-center justify-between flex-shrink-0">
            {title && (
              <h2 
                id="modal-title" 
                className="text-lg sm:text-xl font-bold text-[#1c1f1a]"
              >
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center hover:bg-[#f5f7f2] active:bg-[#f0f2eb] transition-colors"
                aria-label={closeButtonLabel}
              >
                <X className="w-5 h-5 text-[#565c52]" />
              </button>
            )}
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 sm:py-5">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-5 sm:px-6 py-4 border-t border-[#e2e6dc] flex flex-col sm:flex-row gap-3 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ModalFooter - Helper component for consistent footer button layouts
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Footer buttons
 */
export function ModalFooter({ children }) {
  return (
    <>
      {children}
    </>
  );
}

/**
 * ModalButton - Helper component for modal action buttons
 * 
 * @param {Object} props
 * @param {string} props.variant - Button style variant ("primary" | "secondary" | "danger")
 * @param {Function} props.onClick - Click handler
 * @param {boolean} props.disabled - Whether button is disabled
 * @param {React.ReactNode} props.children - Button content
 * @param {string} props.type - Button type (default: "button")
 */
export function ModalButton({ 
  variant = "secondary", 
  onClick, 
  disabled = false, 
  children,
  type = "button",
  ...props
}) {
  const baseClasses = "flex-1 py-3 min-h-[44px] rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantClasses = {
    primary: "bg-gradient-to-r from-sky-600 to-blue-600 text-white hover:from-sky-700 hover:to-blue-700 active:from-sky-800 active:to-blue-800",
    secondary: "border border-[#e2e6dc] text-[#565c52] hover:bg-[#f4f7f2] active:bg-[#f0f2eb]",
    danger: "bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-700 hover:to-rose-700 active:from-red-800 active:to-rose-800"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]}`}
      {...props}
    >
      {children}
    </button>
  );
}
