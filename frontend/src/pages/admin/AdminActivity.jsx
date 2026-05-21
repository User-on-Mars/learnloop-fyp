import { useState, useEffect } from 'react'
import { Activity, ChevronLeft, ChevronRight, Clock, MessageSquare, Play, Search, Timer } from 'lucide-react'
import { motion } from 'framer-motion'

import { adminApi } from '../../api/adminApi'
import FilterDropdown from '../../components/FilterDropdown'
import ThemedDatePicker from '../../components/ThemedDatePicker'
import PageTransition from '../../components/admin/PageTransition'
import ErrorState from '../../components/admin/ErrorState'
import { SkeletonCard } from '../../components/admin/Skeleton'
import AnimatedList from '../../components/admin/AnimatedList'
import { staggerItem } from '../../components/admin/animations'

const MOOD_EMOJIS = { Happy: '😄', Neutral: '😐', Sad: '😟', Energized: '⚡', Thoughtful: '🤔' }
const MOOD_LABELS = { Happy: 'Happy', Neutral: 'Neutral', Sad: 'Struggling', Energized: 'Energized', Thoughtful: 'Thoughtful' }
const MOOD_COLORS = { Happy: 'bg-green-400', Neutral: 'bg-amber-400', Sad: 'bg-rose-400', Energized: 'bg-purple-400', Thoughtful: 'bg-cyan-400' }

const PER_PAGE = 10

const MOOD_OPTIONS = [
  { value: '', label: 'All moods' },
  { value: 'Happy', label: `${MOOD_EMOJIS.Happy} Happy` },
  { value: 'Neutral', label: `${MOOD_EMOJIS.Neutral} Neutral` },
  { value: 'Sad', label: `${MOOD_EMOJIS.Sad} Struggling` },
  { value: 'Energized', label: `${MOOD_EMOJIS.Energized} Energized` },
  { value: 'Thoughtful', label: `${MOOD_EMOJIS.Thoughtful} Thoughtful` }
]

function timeAgo(date) {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function MetricCard({ icon: Icon, label, value, tone = 'green' }) {
  const tones = {
    green: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    purple: 'bg-purple-50 text-purple-700'
  }

  return (
    <motion.div variants={staggerItem} className="bg-site-surface rounded-xl border border-site-border p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tones[tone]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-site-muted">{label}</p>
          <p className="text-xl font-bold text-site-ink mt-0.5">{value}</p>
        </div>
      </div>
    </motion.div>
  )
}

function TypeIcon({ type }) {
  const isPractice = type === 'practice'
  return (
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isPractice ? 'bg-blue-50' : 'bg-purple-50'}`}>
      {isPractice ? <Play className="w-4 h-4 text-blue-500" /> : <MessageSquare className="w-4 h-4 text-purple-500" />}
    </div>
  )
}

export default function AdminActivity() {
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [feedPage, setFeedPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [moodFilter, setMoodFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [platformStats, setPlatformStats] = useState(null)

  useEffect(() => { loadActivity() }, [])

  const loadActivity = async () => {
    try {
      setLoading(true)
      setError(null)
      const [result, stats] = await Promise.all([
        adminApi.getActivity(1, 50),
        platformStats ? Promise.resolve(platformStats) : adminApi.getStats()
      ])
      setActivity(result.activity || [])
      setTotal(result.total || 0)
      if (!platformStats) setPlatformStats(stats)
    } catch (error) {
      console.error('Failed to load activity:', error)
      setError('Failed to load activity. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const practices = activity.filter(a => a.type === 'practice')
  const reflections = activity.filter(a => a.type === 'reflection')

  const totalPracticeCount = platformStats?.content?.practices || practices.length
  const totalReflectionCount = platformStats?.content?.reflections || reflections.length
  const totalPracticeHours = platformStats?.content?.practiceHours || 0
  const pageMinutes = practices.reduce((sum, p) => sum + (p.minutesPracticed || 0), 0)
  const avgDuration = practices.length > 0 ? Math.round(pageMinutes / practices.length) : 0

  const allMoods = ['Happy', 'Neutral', 'Sad', 'Energized', 'Thoughtful']
  const moodCounts = {}
  allMoods.forEach(mood => { moodCounts[mood] = 0 })
  reflections.forEach(reflection => {
    if (reflection.mood && allMoods.includes(reflection.mood)) {
      moodCounts[reflection.mood] = (moodCounts[reflection.mood] || 0) + 1
    }
  })
  const totalMoods = Object.values(moodCounts).reduce((a, b) => a + b, 0) || 1
  const moodData = allMoods
    .map(mood => ({
      mood,
      label: MOOD_LABELS[mood],
      emoji: MOOD_EMOJIS[mood],
      color: MOOD_COLORS[mood],
      pct: Math.round((moodCounts[mood] / totalMoods) * 100),
      count: moodCounts[mood]
    }))
    .sort((a, b) => b.count - a.count)

  const filtered = activity.filter(item => {
    const matchesType = filter === 'all' || item.type === filter
    const searchText = `${item.userName || ''} ${item.userEmail || ''} ${item.skillName || ''} ${item.title || ''}`.toLowerCase()
    const matchesSearch = !search || searchText.includes(search.toLowerCase())
    const matchesMood = !moodFilter || item.mood === moodFilter
    const itemDate = new Date(item.sortDate || item.createdAt)
    const matchesStart = !startDate || itemDate >= new Date(`${startDate}T00:00:00`)
    const matchesEnd = !endDate || itemDate <= new Date(`${endDate}T23:59:59`)

    return matchesType && matchesSearch && matchesMood && matchesStart && matchesEnd
  })
  const totalFiltered = filtered.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PER_PAGE))
  const displayPage = Math.min(feedPage, totalPages)
  const paged = filtered.slice((displayPage - 1) * PER_PAGE, displayPage * PER_PAGE)
  const hasFilters = search || moodFilter || startDate || endDate

  const updateTypeFilter = (value) => {
    setFilter(value)
    setFeedPage(1)
  }

  const clearFilters = () => {
    setSearch('')
    setMoodFilter('')
    setStartDate('')
    setEndDate('')
    setFilter('all')
    setFeedPage(1)
  }

  if (error) {
    return (
      <PageTransition>
        <div className="p-6 lg:p-8 max-w-7xl">
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
      <div className="p-6 lg:p-8 max-w-7xl">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-site-ink">User Activity</h1>
            <p className="text-site-muted mt-1">Recent practices and reflections across the platform</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-site-border bg-site-surface px-3 py-2 text-xs font-medium text-site-muted">
            <Activity className="w-4 h-4 text-site-accent" />
            {total.toLocaleString()} total activity records
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            <SkeletonCard lines={3} />
            <SkeletonCard lines={3} />
            <SkeletonCard lines={3} />
            <SkeletonCard lines={3} />
          </div>
        ) : (
          <>
            <AnimatedList className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              <MetricCard icon={Play} label="Practices" value={totalPracticeCount.toLocaleString()} tone="blue" />
              <MetricCard icon={MessageSquare} label="Reflections" value={totalReflectionCount.toLocaleString()} tone="purple" />
              <MetricCard icon={Timer} label="Avg duration" value={avgDuration > 0 ? `${avgDuration} min` : '-'} tone="amber" />
              <MetricCard icon={Clock} label="Total practice time" value={totalPracticeHours > 0 ? `${totalPracticeHours}h` : '-'} tone="green" />
            </AnimatedList>

            <div className="bg-site-surface rounded-xl border border-site-border p-5 mb-8">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-site-ink">Mood distribution</h3>
                  <p className="text-xs text-site-faint mt-0.5">Based on recent reflections in this activity window</p>
                </div>
                <span className="text-xs font-medium text-site-muted">{reflections.length} reflection{reflections.length === 1 ? '' : 's'}</span>
              </div>

              <div className="flex h-9 rounded-lg overflow-hidden mb-4 bg-site-bg">
                {moodData.filter(m => m.count > 0).length === 0 ? (
                  <div className="w-full flex items-center justify-center text-xs text-site-faint">No mood data yet</div>
                ) : (
                  moodData.filter(m => m.count > 0).map((m, i) => (
                    <div key={i} className={`${m.color} transition-all`} style={{ width: `${m.pct}%` }} title={`${m.label}: ${m.pct}%`} />
                  ))
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2">
                {moodData.map((m, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 rounded-lg bg-site-bg px-3 py-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`w-2.5 h-2.5 rounded-full ${m.color}`} />
                      <span className="text-sm text-site-muted truncate">{m.emoji} {m.label}</span>
                    </div>
                    <span className="text-xs font-semibold text-site-ink">{m.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="bg-site-surface rounded-xl border border-site-border overflow-visible">
          <div className="px-5 py-4 border-b border-site-border">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-semibold text-site-ink text-base">Activity feed</h3>
                <p className="text-xs text-site-faint mt-0.5">{totalFiltered} item{totalFiltered === 1 ? '' : 's'} in current view</p>
              </div>
              <div className="flex gap-1 bg-site-bg rounded-lg p-0.5">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'practice', label: 'Practices' },
                  { key: 'reflection', label: 'Reflections' }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => updateTypeFilter(tab.key)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      filter === tab.key ? 'bg-site-surface text-site-ink shadow-sm' : 'text-site-muted hover:text-site-ink'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_170px_170px_auto] lg:items-end">
              <div className="relative">
                <Search className="w-4 h-4 text-site-faint absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(event) => { setSearch(event.target.value); setFeedPage(1) }}
                  placeholder="Search user, email, skill, or reflection"
                  className="w-full min-h-[42px] pl-9 pr-3 rounded-xl border border-[#c8cec0] bg-white text-sm text-site-ink shadow-sm outline-none transition-all placeholder:text-site-faint focus:border-[#4f7942] focus:ring-2 focus:ring-[#4f7942]/20"
                />
              </div>
              <FilterDropdown
                value={moodFilter}
                onChange={(value) => { setMoodFilter(value); setFeedPage(1) }}
                options={MOOD_OPTIONS}
                minWidth={0}
              />
              <ThemedDatePicker
                label="From"
                value={startDate}
                onChange={(value) => { setStartDate(value); setFeedPage(1) }}
                max={endDate}
              />
              <ThemedDatePicker
                label="To"
                value={endDate}
                onChange={(value) => { setEndDate(value); setFeedPage(1) }}
                min={startDate}
              />
              <button
                type="button"
                onClick={clearFilters}
                disabled={!hasFilters && filter === 'all'}
                className="min-h-[42px] rounded-xl border border-site-border px-4 text-sm font-medium text-site-muted transition-colors hover:bg-site-bg disabled:cursor-not-allowed disabled:opacity-40"
              >
                Clear
              </button>
            </div>
          </div>

          {loading ? (
            <div className="px-5 py-10 text-center text-site-faint text-sm">Loading...</div>
          ) : paged.length === 0 ? (
            <div className="px-5 py-10 text-center text-site-faint text-sm">No activity found</div>
          ) : (
            <AnimatedList className="divide-y divide-site-border/50">
              {paged.map((item, idx) => {
                const isPractice = item.type === 'practice'
                const actionText = isPractice ? 'practiced' : 'reflected'
                const detail = isPractice
                  ? `${item.skillName || 'Practice session'}${item.minutesPracticed ? ` - ${item.minutesPracticed} min` : ''}`
                  : `${MOOD_EMOJIS[item.mood] || ''} ${MOOD_LABELS[item.mood] || item.mood || 'Reflection'}`

                return (
                  <motion.div
                    key={item._id || idx}
                    variants={staggerItem}
                    className="px-5 py-3.5 hover:bg-site-bg/40 transition-colors"
                  >
                    <div className={`rounded-xl border p-4 ${isPractice ? 'border-blue-100 bg-blue-50/30' : 'border-purple-100 bg-purple-50/30'}`}>
                      <div className="flex items-start gap-3">
                        <TypeIcon type={item.type} />

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-site-ink text-sm">{item.userName || 'Unknown'}</p>
                                <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${isPractice ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                  {isPractice ? 'Practice' : 'Reflection'}
                                </span>
                                <span className="text-xs text-site-muted">{actionText}</span>
                              </div>
                              <p className="text-xs text-site-faint truncate mt-0.5">{item.userEmail}</p>
                            </div>

                            <span className="text-xs text-site-faint whitespace-nowrap">{timeAgo(item.sortDate || item.createdAt)}</span>
                          </div>

                          <div className="mt-3 rounded-lg bg-white/80 border border-site-border/70 px-3 py-2">
                            <p className="text-sm font-medium text-site-ink truncate">{detail}</p>
                            {!isPractice && item.title && (
                              <p className="text-xs text-site-muted mt-1 line-clamp-2">"{item.title}"</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatedList>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-site-border">
              <span className="text-xs text-site-faint">
                {(displayPage - 1) * PER_PAGE + 1}-{Math.min(displayPage * PER_PAGE, totalFiltered)} of {totalFiltered}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setFeedPage(p => Math.max(1, p - 1))} disabled={displayPage === 1} className="p-1 rounded border border-site-border disabled:opacity-30 hover:bg-site-bg transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setFeedPage(p)} className={`min-w-[28px] h-7 text-xs rounded font-medium transition-colors ${displayPage === p ? 'bg-site-accent text-white' : 'border border-site-border text-site-ink hover:bg-site-bg'}`}>
                    {p}
                  </button>
                ))}
                <button onClick={() => setFeedPage(p => Math.min(totalPages, p + 1))} disabled={displayPage === totalPages} className="p-1 rounded border border-site-border disabled:opacity-30 hover:bg-site-bg transition-colors">
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
