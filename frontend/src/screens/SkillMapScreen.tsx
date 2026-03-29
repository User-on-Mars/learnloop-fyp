import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../useAuth.js'
import { useSkillMapTs } from '../context/SkillMapTsContext'
import { SkeletonLoader } from '../components/shared/SkeletonLoader'
import { ProgressBar } from '../components/shared/ProgressBar'
import { MapNodeStrip } from './MapNodeStrip'
import { ActiveNodeCard } from './ActiveNodeCard'
import styles from './SkillMapScreen.module.css'

/** Overview of one map: path, progress, and the current focus node. */
export default function SkillMapScreen() {
  const { mapId } = useParams<{ mapId: string }>()
  const navigate = useNavigate()
  const user = useAuth()
  const { state, loadMap } = useSkillMapTs()
  const [lockedHint, setLockedHint] = useState<string | null>(null)
  const [addNodeHint, setAddNodeHint] = useState<string | null>(null)

  useEffect(() => {
    if (!mapId || !user?.uid) return
    void loadMap(mapId, user.uid)
  }, [loadMap, mapId, user?.uid])

  const activeContentNode = useMemo(() => {
    const content = state.nodes
      .filter((n) => n.type === 'content')
      .sort((a, b) => a.position - b.position)
    return content.find((n) => n.state === 'not_started' || n.state === 'in_progress') ?? null
  }, [state.nodes])

  const handleLocked = (prevTitle: string) => {
    setLockedHint(`Complete “${prevTitle}” to unlock this step.`)
    window.setTimeout(() => setLockedHint(null), 2500)
  }

  const handleSelectNode = (node: (typeof state.nodes)[0]) => {
    if (!mapId) return
    navigate(`/maps/${mapId}/nodes/${node.id}`)
  }

  if (user === undefined) {
    return <p className={styles.centered}>Loading…</p>
  }

  if (!user) {
    return <p className={styles.centered}>Sign in to view your map.</p>
  }

  if (state.isLoading && !state.skillMap) {
    return (
      <div className={styles.page}>
        <SkeletonLoader />
      </div>
    )
  }

  if (state.error) {
    return (
      <div className={styles.page}>
        <div className={styles.errorBox}>
          <p>{state.error}</p>
          <button type="button" onClick={() => mapId && user && loadMap(mapId, user.uid)}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!state.skillMap || !mapId) {
    return <p className={styles.centered}>Map not found.</p>
  }

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <span className={styles.icon}>{state.skillMap.icon}</span>
        <div>
          <h1 className={styles.mapTitle}>{state.skillMap.title}</h1>
          {state.skillMap.goal && <p className={styles.goal}>{state.skillMap.goal}</p>}
        </div>
      </header>

      <section className={styles.banner}>
        <strong>Goal</strong>
        <p>{state.skillMap.goal || 'No goal text yet.'}</p>
      </section>

      <ProgressBar completed={state.progress.completed} total={state.progress.total} />

      <MapNodeStrip
        nodes={state.nodes}
        activeNodeId={activeContentNode?.id ?? null}
        lockedMessage={lockedHint}
        onSelectNode={handleSelectNode}
        onLockedClick={handleLocked}
      />

      {activeContentNode && (
        <ActiveNodeCard
          mapId={mapId}
          node={activeContentNode}
          onAddNodeClick={() => {
            setAddNodeHint('Adding nodes from here is not available yet.')
            window.setTimeout(() => setAddNodeHint(null), 3000)
          }}
        />
      )}

      {addNodeHint && <p className={styles.hint}>{addNodeHint}</p>}
    </div>
  )
}
