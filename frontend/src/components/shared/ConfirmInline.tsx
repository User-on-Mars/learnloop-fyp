import { motion } from 'framer-motion'
import styles from './ConfirmInline.module.css'

interface ConfirmInlineProps {
  message: string
  confirmLabel: string
  cancelLabel?: string
  isDanger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Inline confirm panel (no window.confirm). */
export function ConfirmInline({
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  isDanger = false,
  onConfirm,
  onCancel,
}: ConfirmInlineProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18 }}
      className={styles.wrapper}
    >
      <p className={styles.message}>{message}</p>
      <div className={styles.actions}>
        <button
          type="button"
          className={isDanger ? styles.confirmDanger : styles.confirm}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
        <button type="button" className={styles.cancel} onClick={onCancel}>
          {cancelLabel}
        </button>
      </div>
    </motion.div>
  )
}
