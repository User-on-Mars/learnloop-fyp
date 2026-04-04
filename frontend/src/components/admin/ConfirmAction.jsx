import { AlertCircle, X } from 'lucide-react'

export default function ConfirmAction({ 
  isOpen, 
  title, 
  message, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel',
  isDangerous = false,
  onConfirm = () => {},
  onCancel = () => {},
  loading = false,
  children
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-site-surface rounded-xl border border-site-border p-6 max-w-sm w-full mx-4">
        <div className="flex items-start gap-3 mb-4">
          <div className={`p-2 rounded-lg ${isDangerous ? 'bg-red-50' : 'bg-blue-50'}`}>
            <AlertCircle className={`w-5 h-5 ${isDangerous ? 'text-red-600' : 'text-blue-600'}`} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-site-ink">{title}</h3>
            <p className="text-sm text-site-muted mt-1">{message}</p>
          </div>
          <button onClick={onCancel} className="text-site-muted hover:text-site-ink">
            <X className="w-4 h-4" />
          </button>
        </div>

        {children}
      </div>
    </div>
  )
}
