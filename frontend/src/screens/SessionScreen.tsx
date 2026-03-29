import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../useAuth.js'
import { useSkillMapTs } from '../context/SkillMapTsContext'
import { useTimer } from '../hooks/useTimer'
import styles from './SessionScreen.module.css'

/** Live practice session: timer, optional notes, path to reflection. */
export default function SessionScreen() {
  const { mapId, nodeId } = useParams<{ mapId: string; nodeId: string }>()
  const navigate = useNavigate()
  const user = useAuth()
  const { startSession, abandonActiveSession } = useSkillMapTs()
  const { seconds, formattedTime, isRunning, pause, resume } = useTimer()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [startError, setStartError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(true)
  const [quickNotes, setQuickNotes] = useState('')

  useEffect(() => {
    if (!nodeId || !user) return
    let cancelled = false
    setIsStarting(true)
    setStartError(null)
    void (async () => {
      try {
        const session = await startSession(nodeId)
        if (!cancelled) setSessionId(session.id)
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error && error.message
              ? error.message
              : 'Could not start session. Try again.'
          setStartError(message)
        }
      } finally {
        if (!cancelled) setIsStarting(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [nodeId, startSession, user])

  const handleCloseSession = async () => {
    if (sessionId) await abandonActiveSession(sessionId)
    if (mapId) navigate(`/maps/${mapId}/nodes/${nodeId}`)
  }

  const goToReflect = () => {
    if (!mapId || !nodeId || !sessionId) return
    navigate(`/maps/${mapId}/nodes/${nodeId}/session/${sessionId}/reflect`, {
      state: { quickNotes, elapsedSeconds: seconds },
    })
  }

  if (user === undefined) {
    return <p className={styles.centered}>Loading…</p>
  }

  if (!user) {
    return <p className={styles.centered}>Sign in to use sessions.</p>
  }

  if (!mapId || !nodeId) {
    return <p className={styles.centered}>Missing route.</p>
  }

  if (isStarting) {
    return (
      <div className={styles.page}>
        <p className={styles.centered}>Starting session…</p>
      </div>
    )
  }

  if (startError) {
    return (
      <div className={styles.page}>
        <div className={styles.errorBox}>
          <p>{startError}</p>
          <button type="button" onClick={() => navigate(`/maps/${mapId}/nodes/${nodeId}`)}>
            Back to node
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <button type="button" className={styles.closeBtn} onClick={() => void handleCloseSession()} aria-label="Close session">
          ×
        </button>
        <h1 className={styles.topTitle}>Session in progress</h1>
        <span className={styles.topSpacer} />
      </header>

      <div className={styles.timerCard}>
        <p className={styles.timerDigits}>{formattedTime}</p>
        <p className={styles.timerLabel}>Session timer</p>
        <div className={styles.timerActions}>
          {isRunning ? (
            <button type="button" className={styles.secondaryBtn} onClick={pause}>
              ⏸ Pause
            </button>
          ) : (
            <button type="button" className={styles.secondaryBtn} onClick={resume}>
              ▶ Resume
            </button>
          )}
          <button type="button" className={styles.endOutline} onClick={goToReflect}>
            ■ End session
          </button>
        </div>
      </div>

      <label className={styles.notesLabel}>
        Quick notes (optional)
        <textarea
          className={styles.notes}
          value={quickNotes}
          onChange={(e) => setQuickNotes(e.target.value)}
          rows={4}
          placeholder="Jot anything you want to remember for reflection…"
        />
      </label>

      <button type="button" className={styles.reflectCta} onClick={goToReflect}>
        End session & reflect
      </button>
    </div>
  )
}
