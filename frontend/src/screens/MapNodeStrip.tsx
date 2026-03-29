import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { SkillNode } from '../types/skillmap'
import styles from './MapNodeStrip.module.css'

interface MapNodeStripProps {
  nodes: SkillNode[]
  activeNodeId: string | null
  lockedMessage: string | null
  onSelectNode: (node: SkillNode) => void
  onLockedClick: (previousTitle: string) => void
}

/** Renders the horizontal path of nodes with simple motion. */
export function MapNodeStrip({
  nodes,
  activeNodeId,
  lockedMessage,
  onSelectNode,
  onLockedClick,
}: MapNodeStripProps) {
  const sorted = [...nodes].sort((a, b) => a.position - b.position)
  const [shakeNodeId, setShakeNodeId] = useState<string | null>(null)

  /** Clears the shake animation after it finishes so it can run again on the next tap. */
  useEffect(() => {
    if (!shakeNodeId) return
    const timer = window.setTimeout(() => setShakeNodeId(null), 400)
    return () => window.clearTimeout(timer)
  }, [shakeNodeId])

  return (
    <div className={styles.pathWrap}>
      {lockedMessage && <p className={styles.lockedHint}>{lockedMessage}</p>}
      <div className={styles.path}>
        {sorted.map((node, index) => {
          const isLast = index === sorted.length - 1
          const prev = index > 0 ? sorted[index - 1] : null
          const isActive = node.id === activeNodeId
          const isDone = node.state === 'completed'
          const isLocked = node.state === 'locked'

          let circleClass = styles.circle
          if (isDone) circleClass += ` ${styles.circleDone}`
          else if (isActive) circleClass += ` ${styles.circleActive}`
          else if (isLocked) circleClass += ` ${styles.circleLocked}`
          if (shakeNodeId === node.id) circleClass += ` ${styles.circleShake}`

          const label =
            node.type === 'start' ? '🚩' : node.type === 'goal' ? '🏆' : String(index + 1)

          return (
            <motion.div
              key={node.id}
              className={styles.step}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.06 }}
            >
              <button
                type="button"
                className={circleClass}
                onClick={() => {
                  if (isLocked && prev) {
                    onLockedClick(prev.title || 'the previous node')
                    setShakeNodeId(node.id)
                    return
                  }
                  if (!isLocked) onSelectNode(node)
                }}
                aria-label={node.title}
              >
                {isLocked ? '🔒' : isDone ? '✓' : label}
              </button>
              {!isLast && (
                <div
                  className={`${styles.connector} ${isDone ? styles.connectorDone : ''} ${
                    isActive ? styles.connectorDashed : ''
                  }`}
                />
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
