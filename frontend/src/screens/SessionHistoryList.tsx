import { useState } from 'react'
import type { Session } from '../types/skillmap'
import { moodEmoji } from '../utils/moodEmoji'
import { relativeDate } from '../utils/dateUtils'
import styles from './SessionHistoryList.module.css'

interface SessionHistoryListProps {
  sessions: Session[]
}

/** Collapsible list of past sessions for a node. */
export function SessionHistoryList({ sessions }: SessionHistoryListProps) {
  const [openId, setOpenId] = useState<string | null>(null)

  if (sessions.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>No sessions yet</p>
        <p className={styles.emptySub}>Start a session to see history here.</p>
      </div>
    )
  }

  return (
    <ul className={styles.list}>
      {sessions.map((session, index) => {
        const open = openId === session.id
        return (
          <li key={session.id} className={styles.row}>
            <button
              type="button"
              className={styles.rowBtn}
              onClick={() => setOpenId(open ? null : session.id)}
            >
              <span className={styles.dot} />
              <span className={styles.rowMain}>
                Session {sessions.length - index} — {relativeDate(session.startedAt)}
              </span>
              {session.reflection && (
                <span className={styles.emoji}>{moodEmoji[session.reflection.mood]}</span>
              )}
              <span className={styles.duration}>
                {session.durationSeconds != null
                  ? `${Math.floor(session.durationSeconds / 60)}m`
                  : '—'}
              </span>
            </button>
            {open && session.reflection && (
              <div className={styles.detail}>
                <p>{session.reflection.whatIPracticed}</p>
                {session.reflection.blockers && (
                  <p className={styles.blockers}>Blockers: {session.reflection.blockers}</p>
                )}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
