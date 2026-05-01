import { AlertCircle, X, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { backdropVariants, modalVariants } from './animations'

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
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          <motion.div
            className="bg-site-surface rounded-xl border border-site-border p-6 max-w-sm w-full mx-4"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
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

            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                onClick={onCancel}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-site-border text-site-muted hover:text-site-ink hover:bg-site-soft transition-colors disabled:opacity-50"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors disabled:opacity-50 flex items-center gap-2 ${
                  isDangerous
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-site-accent hover:opacity-90'
                }`}
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
