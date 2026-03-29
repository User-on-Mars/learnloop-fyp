import styles from './SkeletonLoader.module.css'

/** Placeholder layout shown before the first skill map payload arrives. */
export function SkeletonLoader() {
  return (
    <div className={styles.wrapper} data-testid="skeleton-ui">
      <div className={styles.topBar}>
        <div className={`${styles.block} ${styles.icon}`} />
        <div className={styles.titleGroup}>
          <div className={`${styles.block} ${styles.title}`} />
          <div className={`${styles.block} ${styles.subtitle}`} />
        </div>
      </div>

      <div className={`${styles.block} ${styles.banner}`} />

      <div className={`${styles.block} ${styles.progressBar}`} />

      <div className={styles.nodePath}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={styles.nodeGroup}>
            <div
              className={`${styles.block} ${styles.nodeCircle}`}
              data-testid="skeleton-node-circle"
            />
            <div className={`${styles.block} ${styles.nodeLabel}`} />
          </div>
        ))}
      </div>

      <div className={`${styles.block} ${styles.activeCard}`} />
    </div>
  )
}
