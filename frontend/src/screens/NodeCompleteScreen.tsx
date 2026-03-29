import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import confetti from 'canvas-confetti'
import { ProgressBar } from '../components/shared/ProgressBar'
import { useSkillMapTs } from '../context/SkillMapTsContext'
import styles from './NodeCompleteScreen.module.css'

export interface NodeCompleteLocationState {
  completedTitle: string
  nextTitle?: string
  nextNodeId?: string
  mapComplete?: boolean
  progressPercent?: number
}

/** Celebration after completing a node; offers next step or map victory. */
export default function NodeCompleteScreen() {
  const { mapId } = useParams<{ mapId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { state: mapState } = useSkillMapTs()

  const data = (location.state as NodeCompleteLocationState | null) ?? null
  const completedTitle = data?.completedTitle ?? 'Node'
  const nextTitle = data?.nextTitle
  const nextNodeId = data?.nextNodeId
  const mapComplete = Boolean(data?.mapComplete)
  const barPercent = data?.progressPercent ?? mapState.progress.percent

  useEffect(() => {
    if (!mapComplete) return
    const timer = window.setTimeout(() => {
      void confetti({ particleCount: 120, spread: 80, origin: { y: 0.55 } })
    }, 700)
    return () => window.clearTimeout(timer)
  }, [mapComplete])

  if (!mapId) {
    return <p className={styles.centered}>Missing map.</p>
  }

  if (!data?.completedTitle) {
    return <Navigate to={`/maps/${mapId}`} replace />
  }

  return (
    <div className={styles.page}>
      <motion.div
        className={styles.emoji}
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.2, 1] }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      >
        🎉
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.35 }}
      >
        <h1 className={styles.headline}>Node complete!</h1>
        <p className={styles.line}>You finished {completedTitle}.</p>
      </motion.div>

      {mapComplete ? (
        <motion.p
          className={styles.trophy}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.35 }}
        >
          🏆 Skill map complete!
        </motion.p>
      ) : (
        <>
          <motion.p
            className={styles.unlockIntro}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.35 }}
          >
            Your next node just unlocked:
          </motion.p>
          <motion.div
            className={styles.unlockBadge}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.35 }}
          >
            🔓 {nextTitle ?? 'Next step'} — now unlocked
          </motion.div>
        </>
      )}

      <motion.div
        className={styles.progressWrap}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.5 }}
        >
          <ProgressBar completed={mapState.progress.completed} total={mapState.progress.total} />
        </motion.div>
        <p className={styles.percentNote}>{barPercent}% of content nodes done</p>
      </motion.div>

      <motion.div
        className={styles.buttons}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.35 }}
      >
        {!mapComplete && nextNodeId && nextTitle && (
          <button
            type="button"
            className={styles.primaryBlue}
            onClick={() => navigate(`/maps/${mapId}/nodes/${nextNodeId}`)}
          >
            Start next node — {nextTitle}
          </button>
        )}
        <button type="button" className={styles.secondary} onClick={() => navigate(`/skills/${mapId}`)}>
          Back to Skills
        </button>
      </motion.div>
    </div>
  )
}
