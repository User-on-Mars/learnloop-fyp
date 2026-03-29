import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../useAuth.js'
import { useToast } from '../context/ToastContext.jsx'
import { useSkillMapTs } from '../context/SkillMapTsContext'
import type { Mood } from '../types/skillmap'
import { moodEmoji, moodPickerOptions } from '../utils/moodEmoji'
import styles from './ReflectionScreen.module.css'

interface ReflectLocationState {
  quickNotes?: string
  elapsedSeconds?: number
}

/** Post-session reflection form: mood, practice notes, optional blockers. */
export default function ReflectionScreen() {
  const { mapId, nodeId, sessionId } = useParams<{
    mapId: string
    nodeId: string
    sessionId: string
  }>()
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuth()
  const { showSuccess, showWarning } = useToast()
  const { state, endSession, markNodeComplete, abandonActiveSession } = useSkillMapTs()

  const locationState = (location.state as ReflectLocationState | null) ?? {}
  const elapsedSeconds = typeof locationState.elapsedSeconds === 'number' ? locationState.elapsedSeconds : 0

  const [mood, setMood] = useState<Mood | null>(null)
  const [whatIPracticed, setWhatIPracticed] = useState(() => locationState.quickNotes?.trim() ?? '')
  const [blockers, setBlockers] = useState('')
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const node = useMemo(() => state.nodes.find((n) => n.id === nodeId) ?? null, [nodeId, state.nodes])

  const moodError = submitAttempted && !mood
  const practiceError =
    submitAttempted && (whatIPracticed.trim().length < 10 || whatIPracticed.length > 500)
  const charsRemaining = 500 - whatIPracticed.length
  const showLengthWarn = charsRemaining <= 50

  const buildReflection = () => {
    if (!mood) return null
    return {
      mood,
      whatIPracticed: whatIPracticed.trim(),
      blockers: blockers.trim() || undefined,
    }
  }

  const navigateToNode = () => {
    if (mapId && nodeId) navigate(`/maps/${mapId}/nodes/${nodeId}`)
    else if (mapId) navigate(`/maps/${mapId}`)
  }

  const handleSaveReflection = async () => {
    setSubmitAttempted(true)
    const reflection = buildReflection()
    if (!reflection || whatIPracticed.trim().length < 10 || whatIPracticed.length > 500) return
    if (!sessionId) return
    setIsSaving(true)
    try {
      await endSession(sessionId, elapsedSeconds, reflection)
      showSuccess('Reflection saved.')
      navigateToNode()
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveAndComplete = async () => {
    setSubmitAttempted(true)
    const reflection = buildReflection()
    if (!reflection || whatIPracticed.trim().length < 10 || whatIPracticed.length > 500) return
    if (!sessionId || !nodeId || !mapId) return
    setIsSaving(true)
    try {
      await endSession(sessionId, elapsedSeconds, reflection)
      const full = await markNodeComplete(nodeId)
      const nextWork = full.nodes
        .filter((n) => n.type === 'content')
        .sort((a, b) => a.position - b.position)
        .find((n) => n.state === 'not_started' || n.state === 'in_progress')
      const mapComplete =
        full.progress.total > 0 && full.progress.completed >= full.progress.total && !nextWork
      navigate(`/maps/${mapId}/complete`, {
        state: {
          completedTitle: node?.title ?? 'Node',
          nextTitle: nextWork?.title,
          nextNodeId: nextWork?.id,
          mapComplete,
          progressPercent: full.progress.percent,
        },
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSkip = async () => {
    if (!sessionId) return
    setIsSaving(true)
    try {
      await abandonActiveSession(sessionId)
      showWarning('Reflection skipped.')
      navigateToNode()
    } finally {
      setIsSaving(false)
    }
  }

  if (user === undefined) return <p className={styles.centered}>Loading…</p>
  if (!user) return <p className={styles.centered}>Sign in to continue.</p>
  if (!mapId || !nodeId || !sessionId) {
    return <p className={styles.centered}>Missing route.</p>
  }

  return (
    <div className={styles.page}>
      <div className={styles.savedStrip}>Session saved</div>

      <h1 className={styles.title}>Reflect on your session</h1>
      <p className={styles.sub}>Help your future self remember what happened.</p>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>How did it feel? (required)</legend>
        <div className={styles.moodRow}>
          {moodPickerOptions.map((option) => {
            const selected = mood === option.value
            return (
              <button
                key={option.value}
                type="button"
                className={`${styles.moodBtn} ${selected ? styles.moodBtnSelected : ''}`}
                onClick={() => setMood(option.value)}
              >
                <span className={styles.moodEmoji}>{moodEmoji[option.value]}</span>
                <span className={styles.moodLabel}>{option.label}</span>
              </button>
            )
          })}
        </div>
        {moodError && <p className={styles.fieldError}>Please choose a mood.</p>}
      </fieldset>

      <label className={styles.blockLabel}>
        What did you practice? (required, min 10 characters)
        <textarea
          className={styles.textarea}
          value={whatIPracticed}
          onChange={(e) => setWhatIPracticed(e.target.value)}
          rows={4}
          maxLength={500}
        />
        <span className={showLengthWarn ? styles.charCountWarn : styles.charCount}>
          {whatIPracticed.length} / 500
        </span>
        {practiceError && (
          <p className={styles.fieldError}>Enter at least 10 characters (max 500).</p>
        )}
      </label>

      <label className={styles.blockLabel}>
        Any blockers? (optional)
        <textarea
          className={styles.textarea}
          value={blockers}
          onChange={(e) => setBlockers(e.target.value)}
          rows={3}
          placeholder="What slowed you down or confused you?"
        />
      </label>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primary}
          disabled={isSaving}
          onClick={handleSaveReflection}
        >
          Save reflection ✓
        </button>
        <button
          type="button"
          className={styles.primaryBlue}
          disabled={isSaving}
          onClick={handleSaveAndComplete}
        >
          Save & mark node complete ✓
        </button>
        <button type="button" className={styles.skip} disabled={isSaving} onClick={handleSkip}>
          Skip
        </button>
      </div>
    </div>
  )
}
