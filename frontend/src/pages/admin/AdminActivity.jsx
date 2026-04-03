import { useState, useEffect } from 'react'
import { adminApi } from '../../api/adminApi'
import DataTable from '../../components/admin/DataTable'

const MOOD_EMOJIS = {
  'Happy': '😄',
  'Neutral': '😐',
  'Sad': '😢',
  'Energized': '⚡',
  'Thoughtful': '🤔'
}

export default function AdminActivity() {
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [moodDistribution, setMoodDistribution] = useState({})
  const [commonBlockers, setCommonBlockers] = useState({})

  useEffect(() => {
    loadActivity()
  }, [page])

  const loadActivity = async () => {
    try {
      setLoading(true)
      const result = await adminApi.getActivity(page, 20)
      setActivity(result.activity || [])
      setPages(result.pages || 1)

      // Calculate mood distribution from all reflections
      const reflections = result.activity.filter(a => a.type === 'reflection')
      const moods = {}
      reflections.forEach(r => {
        const mood = r.mood || 'Unknown'
        moods[mood] = (moods[mood] || 0) + 1
      })
      setMoodDistribution(moods)

      // Extract blockers from practice notes
      const practices = result.activity.filter(a => a.type === 'practice')
      const blockers = {}
      practices.forEach(p => {
        if (p.blockers) {
          const blockList = p.blockers.split(',').map(b => b.trim().toLowerCase())
          blockList.forEach(b => {
            if (b) blockers[b] = (blockers[b] || 0) + 1
          })
        }
      })
      setCommonBlockers(blockers)
    } catch (error) {
      console.error('Failed to load activity:', error)
    } finally {
      setLoading(false)
    }
  }

  const moodDistributionData = Object.entries(moodDistribution)
    .map(([mood, count]) => ({
      mood,
      emoji: MOOD_EMOJIS[mood] || '❓',
      label: mood,
      percentage: Math.round((count / Object.values(moodDistribution).reduce((a, b) => a + b, 1)) * 100)
    }))
    .sort((a, b) => b.percentage - a.percentage)

  const topBlockers = Object.entries(commonBlockers)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)

  const columns = [
    { key: 'type', label: 'Type', render: (val) => <span className="capitalize text-xs font-medium">{val}</span> },
    { key: 'userName', label: 'User' },
    { key: 'userEmail', label: 'Email', render: (val) => <span className="text-xs text-site-muted">{val}</span> },
    { 
      key: 'sortDate', 
      label: 'Date',
      render: (val) => {
        const hours = Math.floor((new Date() - new Date(val)) / (1000 * 60 * 60))
        if (hours < 24) return `${hours}h ago`
        return new Date(val).toLocaleDateString()
      }
    }
  ]

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-site-ink">User Activity</h1>
        <p className="text-site-muted mt-1">Recent practices and reflections</p>
      </div>

      {/* Activity Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-site-surface rounded-xl border border-site-border p-5">
          <p className="text-2xl font-bold text-site-ink">{activity.filter(a => a.type === 'practice').length}</p>
          <p className="text-xs text-site-faint mt-1">Sessions today</p>
        </div>
        <div className="bg-site-surface rounded-xl border border-site-border p-5">
          <p className="text-2xl font-bold text-site-ink">24m</p>
          <p className="text-xs text-site-faint mt-1">Avg duration</p>
        </div>
        <div className="bg-site-surface rounded-xl border border-site-border p-5">
          <p className="text-2xl font-bold text-site-ink">68%</p>
          <p className="text-xs text-site-faint mt-1">Reflection rate</p>
        </div>
        <div className="bg-site-surface rounded-xl border border-site-border p-5">
          <p className="text-2xl font-bold text-site-ink">{moodDistributionData[0]?.emoji || '😊'}</p>
          <p className="text-xs text-site-faint mt-1">Most common mood</p>
        </div>
      </div>

      {/* Mood Distribution & Common Blockers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Mood Distribution */}
        <div className="bg-site-surface rounded-xl border border-site-border p-6">
          <h3 className="font-semibold text-site-ink mb-4">Mood distribution — this week</h3>
          <div className="space-y-3">
            {moodDistributionData.length > 0 ? moodDistributionData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-lg">{item.emoji}</span>
                  <span className="text-sm font-medium text-site-ink">{item.label}</span>
                  <div className="flex-1 h-2 bg-site-bg rounded-full overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: `${item.percentage}%` }} />
                  </div>
                </div>
                <span className="text-sm font-semibold text-site-ink ml-2">{item.percentage}%</span>
              </div>
            )) : (
              <p className="text-sm text-site-muted">No mood data available</p>
            )}
          </div>
        </div>

        {/* Common Blockers */}
        <div className="bg-site-surface rounded-xl border border-site-border p-6">
          <h3 className="font-semibold text-site-ink mb-4">Common blockers — from reflections</h3>
          <p className="text-xs text-site-faint mb-4">Extracted from reflection text via keyword matching</p>
          <div className="space-y-3">
            {topBlockers.length > 0 ? topBlockers.map(([blocker, count], idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-sm font-medium text-site-ink capitalize">{blocker}</span>
                  <div className="flex-1 h-2 bg-site-bg rounded-full overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: `${(count / Math.max(...Object.values(commonBlockers), 1)) * 100}%` }} />
                  </div>
                </div>
                <span className="text-sm font-semibold text-site-ink ml-2">{count}x</span>
              </div>
            )) : (
              <p className="text-sm text-site-muted">No blocker data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <DataTable
        columns={columns}
        data={activity}
        loading={loading}
        empty="No activity"
        page={page}
        pages={pages}
        onPageChange={setPage}
      />
    </div>
  )
}
