import styles from './ProgressBar.module.css'

interface ProgressBarProps {
  completed: number
  total: number
}

/** Horizontal progress bar with numeric summary. */
export function ProgressBar({ completed, total }: ProgressBarProps) {
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100)

  return (
    <div className={styles.wrapper}>
      <div className={styles.labels}>
        <span className={styles.label}>Progress</span>
        <span className={styles.count}>
          {completed} / {total} nodes done
        </span>
      </div>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
