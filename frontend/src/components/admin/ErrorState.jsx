import { AlertCircle } from 'lucide-react'

/**
 * Error state component for admin pages.
 * Displays a centered card with an error icon, message, and optional retry button.
 */
export default function ErrorState({ message, onRetry }) {
  return (
    <div className="bg-site-surface rounded-xl border border-site-border p-8 flex flex-col items-center justify-center text-center">
      <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
      <p className="text-site-ink font-medium mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-site-accent text-white rounded-lg text-sm font-medium hover:opacity-90 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  )
}
