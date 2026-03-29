import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../useAuth.js'
import { useToast } from '../context/ToastContext.jsx'
import { useSkillMapTs } from '../context/SkillMapTsContext'
import { useActiveSessions } from '../context/ActiveSessionContext'
import { NodeStatePill } from '../components/shared/NodeStatePill'
import { ConfirmInline } from '../components/shared/ConfirmInline'
import { SessionHistoryList } from './SessionHistoryList'
import { moodEmoji } from '../utils/moodEmoji'
import { relativeDate } from '../utils/dateUtils'
import type { Mood } from '../types/skillmap'
import styles from './NodeDetailScreen.module.css'

/** Full-page detail for one node: stats, actions, session history. */
export default function NodeDetailScreen() {
  const { mapId, nodeId } = useParams<{ mapId: string; nodeId: string }>()
  const navigate = useNavigate()
  const user = useAuth()
  const { showError, showSuccess } = useToast()
  const { state, loadMap, loadNodeSessions, clearNodeSessions, markNodeComplete, deleteNodeById, updateNodeContent } =
    useSkillMapTs()
  const { addSession } = useActiveSessions()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editing, setEditing] = useState(false)
  const [titleInput, setTitleInput] = useState('')
  const [descInput, setDescInput] = useState('')
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [showSessionModal, setShowSessionModal] = useState(false)

  const node = useMemo(
    () => state.nodes.find((n) => n.id === nodeId) ?? null,
    [nodeId, state.nodes]
  )

  useEffect(() => {
    if (!nodeId || !mapId || !user?.uid) return
    void loadMap(mapId, user.uid)
  }, [loadMap, mapId, user?.uid])

  useEffect(() => {
    if (!nodeId) return
    let cancelled = false
    setSessionsLoading(true)
    void (async () => {
      try {
        await loadNodeSessions(nodeId)
      } finally {
        if (!cancelled) setSessionsLoading(false)
      }
    })()
    return () => {
      cancelled = true
      clearNodeSessions()
    }
  }, [clearNodeSessions, loadNodeSessions, nodeId])

  // Refresh sessions when returning to this page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && nodeId) {
        void loadNodeSessions(nodeId)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [loadNodeSessions, nodeId])

  useEffect(() => {
    if (node) {
      setTitleInput(node.title)
      setDescInput(node.description ?? '')
    }
  }, [node])

  const lastMood: Mood | null = useMemo(() => {
    const withMood = state.currentNodeSessions.find((s) => s.reflection?.mood)
    return withMood?.reflection?.mood ?? null
  }, [state.currentNodeSessions])

  const lastPracticed = useMemo(() => {
    const latest = state.currentNodeSessions[0]
    return latest?.startedAt
  }, [state.currentNodeSessions])

  if (user === undefined) {
    return <p className={styles.centered}>Loading…</p>
  }

  if (!user) {
    return <p className={styles.centered}>Sign in to view this node.</p>
  }

  if (!mapId || !nodeId) {
    return <p className={styles.centered}>Missing route params.</p>
  }

  if (state.isLoading && !state.skillMap) {
    return <p className={styles.centered}>Loading map…</p>
  }

  if (state.error) {
    return (
      <div className={styles.centered}>
        <p>{state.error}</p>
        <button type="button" onClick={() => loadMap(mapId, user.uid)}>
          Retry
        </button>
      </div>
    )
  }

  if (!node) {
    return <p className={styles.centered}>Node not found.</p>
  }

  const canDelete = node.type !== 'start' && node.type !== 'goal'

  /** Persists title and description edits from the inline form. */
  const handleSaveEdit = async () => {
    try {
      await updateNodeContent(node.id, { title: titleInput, description: descInput })
      setEditing(false)
    } catch {
      showError('Could not save changes.')
    }
  }

  /** Marks this node complete and opens the celebration screen with correct next-step copy. */
  const handleMarkComplete = async () => {
    try {
      const full = await markNodeComplete(node.id)
      const nextWork = full.nodes
        .filter((n) => n.type === 'content')
        .sort((a, b) => a.position - b.position)
        .find((n) => n.state === 'not_started' || n.state === 'in_progress')
      const mapComplete =
        full.progress.total > 0 && full.progress.completed >= full.progress.total && !nextWork
      navigate(`/maps/${mapId}/complete`, {
        state: {
          completedTitle: node.title,
          nextTitle: nextWork?.title,
          nextNodeId: nextWork?.id,
          mapComplete,
          progressPercent: full.progress.percent,
        },
      })
    } catch {
      showError('Could not mark node complete.')
    }
  }

  /** Updates the node state when clicking progress tags */
  const handleStateChange = async (newState: 'not_started' | 'in_progress' | 'completed') => {
    if (newState === node.state) return // Already in this state
    
    try {
      if (newState === 'completed') {
        await handleMarkComplete()
      } else {
        // For not_started and in_progress, we need to update the node state
        // This might require an API call depending on your backend implementation
        await loadMap(mapId!, user!.uid)
      }
    } catch {
      showError(`Could not update progress to ${newState.replace('_', ' ')}.`)
    }
  }

  /** Starts a new practice session */
  const handleStartSession = () => {
    addSession({
      skillName: node.title || 'Untitled',
      tags: [],
      notes: '',
      timer: 25 * 60, // 25 minutes default
      targetTime: 25 * 60,
      isCountdown: true,
      isRunning: true
    })
    setShowSessionModal(false)
    showSuccess?.('Session started! Timer is running.')
    navigate('/log-practice')
  }

  return (
    <div className={styles.page}>
      <button type="button" className={styles.back} onClick={() => navigate(`/skills/${mapId}`)}>
        Back to Skills
      </button>

      <header className={styles.header}>
        {editing ? (
          <div className={styles.editForm}>
            <input value={titleInput} onChange={(e) => setTitleInput(e.target.value)} aria-label="Node title" />
          </div>
        ) : (
          <h1 className={styles.title}>{node.title || 'Untitled'}</h1>
        )}
      </header>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Progress</span>
          <span className={styles.statValue}>
            {node.state === 'not_started' && 'Not Started'}
            {node.state === 'in_progress' && 'In Progress'}
            {node.state === 'completed' && 'Completed'}
            {node.state === 'locked' && 'Locked'}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Sessions</span>
          <span className={styles.statValue}>{node.sessionsCount}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Last practiced</span>
          <span className={styles.statValue}>
            {lastPracticed ? relativeDate(lastPracticed) : '—'}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Last mood</span>
          <span className={styles.statValue}>
            {lastMood ? `${moodEmoji[lastMood]} ${lastMood}` : '—'}
          </span>
        </div>
      </div>

      <section className={styles.card}>
        <h2>Description</h2>
        {editing ? (
          <>
            <textarea
              value={descInput}
              onChange={(e) => setDescInput(e.target.value)}
              rows={3}
              aria-label="Node description"
            />
            <div className={styles.editActions}>
              <button type="button" onClick={handleSaveEdit}>
                Save
              </button>
              <button type="button" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </>
        ) : node.description ? (
          <p>{node.description}</p>
        ) : (
          <button type="button" className={styles.linkish} onClick={() => setEditing(true)}>
            Add description
          </button>
        )}
      </section>

      {node.state === 'locked' && (
        <p className={styles.lockMsg}>Complete the previous node to unlock this step.</p>
      )}

      <div className={styles.actions}>
        {(node.state === 'not_started' || node.state === 'in_progress') && (
          <button
            type="button"
            className={styles.primary}
            onClick={() => navigate(`/maps/${mapId}/nodes/${node.id}/session`)}
          >
            Start session
          </button>
        )}
        {node.state === 'in_progress' && (
          <button type="button" className={styles.secondary} onClick={handleMarkComplete}>
            ✓ Mark complete
          </button>
        )}
        {node.state === 'completed' && (
          <button type="button" className={styles.secondary} onClick={() => setEditing(true)}>
            ✎ Edit
          </button>
        )}
      </div>

      {node.state !== 'locked' && (
        <section className={styles.progressSection}>
          <h3 className={styles.progressTitle}>Update Progress</h3>
          <div className={styles.progressTags}>
            <button
              type="button"
              className={`${styles.progressTag} ${node.state === 'not_started' ? styles.progressTagActive : ''}`}
              onClick={() => handleStateChange('not_started')}
            >
              Not Started
            </button>
            <button
              type="button"
              className={`${styles.progressTag} ${node.state === 'in_progress' ? styles.progressTagActive : ''}`}
              onClick={() => handleStateChange('in_progress')}
            >
              In Progress
            </button>
            <button
              type="button"
              className={`${styles.progressTag} ${node.state === 'completed' ? styles.progressTagActive : ''}`}
              onClick={() => handleStateChange('completed')}
            >
              Completed
            </button>
          </div>
          <button
            type="button"
            className={styles.startSession}
            onClick={() => setShowSessionModal(true)}
          >
            Start Session
          </button>
        </section>
      )}

      {showSessionModal && (
        <div className={styles.modalOverlay} onClick={() => setShowSessionModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Start Practice Session</h2>
              <button type="button" onClick={() => setShowSessionModal(false)} className={styles.modalClose}>
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalSkillName}>{node.title || 'Untitled'}</p>
              <p className={styles.modalHint}>Ready to start practicing? Click below to begin your session.</p>
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={() => setShowSessionModal(false)}
                className={styles.modalCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartSession}
                className={styles.modalConfirm}
              >
                Start Now
              </button>
            </div>
          </div>
        </div>
      )}

      {canDelete && (
        <div className={styles.deleteWrap}>
          <button type="button" className={styles.dangerOutline} onClick={() => setShowDeleteConfirm(true)}>
            ✕ Delete
          </button>
          <AnimatePresence>
            {showDeleteConfirm && (
              <ConfirmInline
                key="delete-node"
                message={`Delete this node and all ${node.sessionsCount} sessions? This cannot be undone.`}
                confirmLabel="Delete"
                isDanger
                onConfirm={async () => {
                  try {
                    await deleteNodeById(node.id)
                    setShowDeleteConfirm(false)
                    navigate(`/maps/${mapId}`)
                  } catch {
                    showError('Could not delete node.')
                  }
                }}
                onCancel={() => setShowDeleteConfirm(false)}
              />
            )}
          </AnimatePresence>
        </div>
      )}

      <section className={styles.historySection}>
        <h2>Session & reflection history</h2>
        <p className={styles.historyHint}>Only sessions and reflections logged for this node appear here.</p>
        {sessionsLoading ? (
          <p className={styles.muted}>Loading sessions…</p>
        ) : (
          <SessionHistoryList sessions={state.currentNodeSessions} />
        )}
      </section>
    </div>
  )
}
