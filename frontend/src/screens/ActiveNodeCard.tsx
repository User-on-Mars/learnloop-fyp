import { useNavigate } from 'react-router-dom'
import type { SkillNode } from '../types/skillmap'
import { NodeStatePill } from '../components/shared/NodeStatePill'
import styles from './ActiveNodeCard.module.css'

interface ActiveNodeCardProps {
  mapId: string
  node: SkillNode
  onAddNodeClick: () => void
}

/** Highlights the current working node and exposes quick actions. */
export function ActiveNodeCard({ mapId, node, onAddNodeClick }: ActiveNodeCardProps) {
  const navigate = useNavigate()

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <NodeStatePill state={node.state} nodeType={node.type} />
        <h3 className={styles.title}>{node.title || 'Untitled node'}</h3>
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primary}
          onClick={() => navigate(`/maps/${mapId}/nodes/${node.id}/session`)}
        >
          ▶ Start session
        </button>
        <button
          type="button"
          className={styles.secondary}
          onClick={() => navigate(`/maps/${mapId}/nodes/${node.id}`)}
        >
          ✎ Edit
        </button>
        <button type="button" className={styles.secondary} onClick={onAddNodeClick}>
          + Add node
        </button>
      </div>
    </div>
  )
}
