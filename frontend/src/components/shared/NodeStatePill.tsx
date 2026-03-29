import type { NodeState, NodeType } from '../../types/skillmap'
import styles from './NodeStatePill.module.css'

interface NodeStatePillProps {
  state: NodeState
  nodeType?: NodeType
}

/** Small colored label for node state (or start/goal). */
export function NodeStatePill({ state, nodeType }: NodeStatePillProps) {
  if (nodeType === 'start') {
    return <span className={`${styles.pill} ${styles.start}`}>start</span>
  }
  if (nodeType === 'goal') {
    return <span className={`${styles.pill} ${styles.goal}`}>goal</span>
  }

  const labels: Record<NodeState, string> = {
    not_started: 'unlocked',
    in_progress: 'in progress',
    completed: 'done',
    locked: 'locked',
  }

  return <span className={`${styles.pill} ${styles[state]}`}>{labels[state]}</span>
}
