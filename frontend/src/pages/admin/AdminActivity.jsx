import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'

import { adminApi } from '../../api/adminApi'
import PageTransition from '../../components/admin/PageTransition'
import ErrorState from '../../components/admin/ErrorState'
import { SkeletonCard, SkeletonTable } from '../../components/admin/Skeleton'
import AnimatedList from '../../components/admin/AnimatedList'
import { staggerItem } from '../../components/admin/animations'

const MOOD_EMOJIS = { Happy: '😄', Neutral: '😐', Sad: '😟', Energized: '⚡', Thoughtful: '🤔' }
const MOOD_LABELS = { Happy: 'Happy', Neutral: 'Neutral', Sad: 'Struggling', Energized: 'Energized', Thoughtful: 'Thoughtful' }
const MOOD_COLORS = { Happy: 'bg-green-400', Neutral: 'bg-amber-400', Sad: 'bg-rose-400', Energized: 'bg-purple-400', Thoughtful: 'bg-cyan-400' }

const PER_PAGE = 15

function timeAgo(date) {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function AdminActivity() {
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState('all')
  const [platformStats, setPlatformStats] = useState(null)
  const navigate = useNavigate()

  useEffect(() => { loadActivity() }, [page])

  const loadActivity = async () => {
    try {
      setLoading(true)
      setError(null)
      const [result, stats] = await Promise.all([
        adminApi.getActivity(page, 50),
        platformStats ? Promise.resolve(platformStats) : adminApi.getStats()
      ])
      setActivity(result.activity || [])
      setTotal(result.total || 0)
      setPages(result.pages || 1)
      if (!platformStats) setPlatformStats(stats)
    } catch (error) {
      console.error('Failed to load activity:', error)
      setError('Failed to load activity. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Compute stats — use platform-wide totals from stats API
  const practices = activity.filter(a => a.type === 'practice')
  const reflections = activity.filter(a => a.type === 'reflection')

  const totalPracticeCount = platformStats?.content?.practices || practices.length
  const totalReflectionCount = platformStats?.content?.reflections || reflections.length
  const totalPracticeHours = platformStats?.content?.practiceHours || 0

  const pageMinutes = practices.reduce((sum, p) => sum + (p.minutesPracticed || 0), 0)
  const avgDuration = practices.length > 0 ? Math.round(pageMinutes / practices.length) : 0

  // Mood distribution from reflections on current page — always show all moods
  const ALL_MOODS = ['Happy', 'Neutral', 'Sad', 'Energized', 'Thoughtful']
  const moodCounts = {}
  ALL_MOODS.forEach(m => { moodCounts[m] = 0 })
  reflections.forEach(r => {
    if (r.mood && ALL_MOODS.includes(r.mood)) {
      moodCounts[r.mood] = (moodCounts[r.mood] || 0) + 1
    }
  })
  const totalMoods = Object.values(moodCounts).reduce((a, b) => a + b, 0) || 1
  const moodData = ALL_MOODS
    .map(mood => ({ mood, label: MOOD_LABELS[mood], emoji: MOOD_EMOJIS[mood], color: MOOD_COLORS[mood], pct: Math.round((moodCounts[mood] / totalMoods) * 100), count: moodCounts[mood] }))
    .sort((a, b) => b.count - a.count)

  // Filter activity for display
  const filtered = filter === 'all' ? activity : activity.filter(a => a.type === filter)
  const totalFiltered = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PER_PAGE))
  const displayPage = Math.min(page, totalPages)
  const paged = filtered.slice((displayPage - 1) * PER_PAGE, displayPage * PER_PAGE)

  if (error) {
    return (
      <PageTransition>
        <div className="p-6 lg:p-8 max-w-6xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-site-ink">User Activity</h1>
            <p className="text-site-muted mt-1">Recent practices and reflections across the platform</p>
          </div>
          <ErrorState message={error} onRetry={loadActivity} />
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="p-6 lg:p-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-site-ink">User Activity</h1>
          <p className="text-site-muted mt-1">Recent practices and reflections across the platform</p>
        </div>

        {/* Stats + Mood row */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <SkeletonCard lines={4} />
            <div className="lg:col-span-2">
              <SkeletonCard lines={3} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Quick stats */}
            <div className="bg-site-surface rounded-xl border border-site-border p-5 lg:col-span-1">
              <h3 className="text-xs font-semibold text-site-faint uppercase tracking-wider mb-4">Snapshot</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-site-muted">Practices</span>
                  <span className="text-sm font-bold text-site-ink">{totalPracticeCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-site-muted">Reflections</span>
                  <span className="text-sm font-bold text-site-ink">{totalReflectionCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-site-muted">Avg duration</span>
                  <span className="text-sm font-bold text-site-ink">{avgDuration > 0 ? `${avgDuration} min` : '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-site-muted">Total practice time</span>
                  <span className="text-sm font-bold text-site-ink">{totalPracticeHours > 0 ? `${totalPracticeHours}h` : '—'}</span>
                </div>
              </div>
            </div>

            {/* Mood distribution */}
            <div className="bg-site-surface rounded-xl border border-site-border p-5 lg:col-span-2">
              <h3 className="text-xs font-semibold text-site-faint uppercase tracking-wider mb-4">Mood distribution</h3>
              {moodData.length === 0 ? (
                <p className="text-sm text-site-faint py-4 text-center">No mood data yet</p>
              ) : (
                <>
                  {/* Stacked bar — only show moods with data */}
                  <div className="flex h-8 rounded-lg overflow-hidden mb-4 bg-site-bg">
                    {moodData.filter(m => m.count > 0).map((m, i) => (
                      <div key={i} className={`${m.color} transition-all`} style={{ width: `${m.pct}%` }} title={`${m.label}: ${m.pct}%`} />
                    ))}
                  </div>
                  {/* Legend — always show all 5 moods */}
                  <div className="flex flex-wrap gap-x-5 gap-y-2">
                    {moodData.map((m, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${m.color}`} />
                        <span className="text-sm text-site-muted">{m.emoji} {m.label}</span>
                        <span className="text-xs text-site-faint">{m.pct}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Activity Feed */}
        <div className="bg-site-surface rounded-xl border border-site-border">
          {/* Header + filter tabs */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-site-border">
            <h3 className="font-semibold text-site-ink text-sm">Activity feed</h3>
            <div className="flex gap-1 bg-site-bg rounded-lg p-0.5">
              {[
                { key: 'all', label: 'All' },
                { key: 'practice', label: 'Practices' },
                { key: 'reflection', label: 'Reflections' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => { setFilter(tab.key); setPage(1) }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    filter === tab.key ? 'bg-site-surface text-site-ink shadow-sm' : 'text-site-muted hover:text-site-ink'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Feed list */}
          {loading ? (
            <div className="px-5 py-10 text-center text-site-faint text-sm">Loading...</div>
          ) : paged.length === 0 ? (
            <div className="px-5 py-10 text-center text-site-faint text-sm">No activity found</div>
          ) : (
            <AnimatedList className="divide-y divide-site-border/50">
              {paged.map((item, idx) => (
                <motion.div
                  key={item._id || idx}
                  variants={staggerItem}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-site-bg/50 transition-colors"
                >
                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    item.type === 'practice' ? 'bg-blue-50' : 'bg-purple-50'
                  }`}>
                    {item.type === 'practice'
                      ? <Play className="w-4 h-4 text-blue-500" />
                      : <MessageSquare className="w-4 h-4 text-purple-500" />
                    }
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-site-ink text-sm">{item.userName || 'Unknown'}</span>
                      <span className="text-xs text-site-faint">
                        {item.type === 'practice' ? 'practiced' : 'reflected'}
                      </span>
                      {item.type === 'practice' && item.skillName && (
                        <span className="text-xs font-medium text-site-accent">{item.skillName}</span>
                      )}
                      {item.type === 'practice' && item.minutesPracticed && (
                        <span className="text-xs text-site-faint">· {item.minutesPracticed} min</span>
                      )}
                      {item.type === 'reflection' && item.mood && (
                        <span className="text-xs">{MOOD_EMOJIS[item.mood] || ''} {MOOD_LABELS[item.mood] || item.mood}</span>
                      )}
                    </div>
                    <p className="text-xs text-site-faint truncate">{item.userEmail}</p>
                    {item.type === 'reflection' && item.title && (
                      <p className="text-xs text-site-muted mt-0.5 truncate">"{item.title}"</p>
                    )}
                  </div>

                  {/* Time */}
                  <span className="text-xs text-site-faint flex-shrink-0">{timeAgo(item.sortDate || item.createdAt)}</span>
                </motion.div>
              ))}
            </AnimatedList>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-site-border">
              <span className="text-xs text-site-faint">
                {(displayPage - 1) * PER_PAGE + 1}–{Math.min(displayPage * PER_PAGE, totalFiltered)} of {totalFiltered}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={displayPage === 1} className="p-1 rounded border border-site-border disabled:opacity-30 hover:bg-site-bg transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)} className={`min-w-[28px] h-7 text-xs rounded font-medium transition-colors ${displayPage === p ? 'bg-site-accent text-white' : 'border border-site-border text-site-ink hover:bg-site-bg'}`}>
                    {p}
                  </button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={displayPage === totalPages} className="p-1 rounded border border-site-border disabled:opacity-30 hover:bg-site-bg transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  )
}
