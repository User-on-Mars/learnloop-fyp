import { useState, useEffect, useCallback } from 'react'
import { Gift, Trophy, Calendar, Search, Filter, ChevronLeft, ChevronRight, Medal, Users, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import { adminApi } from '../../api/adminApi'
import PageTransition from '../../components/admin/PageTransition'
import ErrorState from '../../components/admin/ErrorState'
import AnimatedList from '../../components/admin/AnimatedList'
import { SkeletonCard, SkeletonTable } from '../../components/admin/Skeleton'
import { staggerItem } from '../../components/admin/animations'

const RANK_CONFIG = {
  1: { label: '1st Place', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: '🥇' },
  2: { label: '2nd Place', color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200', icon: '🥈' },
  3: { label: '3rd Place', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', icon: '🥉' },
}

const REWARD_DAYS_OPTIONS = [
  { value: '', label: 'All Durations' },
  { value: '180', label: '6 Months (180 days)' },
  { value: '90', label: '3 Months (90 days)' },
  { value: '30', label: '1 Month (30 days)' },
]

const RANK_OPTIONS = [
  { value: '', label: 'All Ranks' },
  { value: '1', label: '🥇 1st Place' },
  { value: '2', label: '🥈 2nd Place' },
  { value: '3', label: '🥉 3rd Place' },
]

function StatCard({ icon: Icon, label, value, color = 'text-site-accent', bgColor = 'bg-site-accent/10' }) {
  return (
    <motion.div variants={staggerItem} className="bg-site-surface rounded-xl border border-site-border p-5">
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-lg ${bgColor}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <p className="text-xs text-site-muted">{label}</p>
          <p className="text-xl font-bold text-site-ink mt-0.5">{value}</p>
        </div>
      </div>
    </motion.div>
  )
}

function LatestRewardCard({ reward }) {
  const config = RANK_CONFIG[reward.rank] || RANK_CONFIG[3]
  return (
    <motion.div
      variants={staggerItem}
      className={`bg-site-surface rounded-xl border ${config.border} p-5 relative overflow-hidden`}
    >
      <div className="absolute top-3 right-3 text-2xl">{config.icon}</div>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${config.bg}`}>
          <Trophy className={`w-5 h-5 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-site-ink truncate">{reward.userName}</p>
          <p className="text-xs text-site-muted truncate">{reward.userEmail}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
              {config.label}
            </span>
            <span className="text-xs text-site-faint">{reward.weeklyXp.toLocaleString()} XP</span>
          </div>
          <p className="text-xs text-site-muted mt-1.5">
            Reward: <span className="font-medium text-site-ink">{reward.rewardLabel} Pro</span>
          </p>
        </div>
      </div>
    </motion.div>
  )
}

export default function AdminWeeklyRewards() {
  const [rewards, setRewards] = useState([])
  const [latestRewards, setLatestRewards] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Filters
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [rankFilter, setRankFilter] = useState('')
  const [rewardDaysFilter, setRewardDaysFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const fetchRewards = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const params = {
        page,
        limit: 20,
        search,
        startDate,
        endDate,
        rank: rankFilter,
        rewardDays: rewardDaysFilter,
      }
      const data = await adminApi.getRewards(params)
      setRewards(data.rewards || [])
      setTotalPages(data.pages || 1)
      setTotal(data.total || 0)
      setStats(data.stats || null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [page, search, startDate, endDate, rankFilter, rewardDaysFilter])

  const fetchLatest = async () => {
    try {
      const data = await adminApi.getLatestRewards()
      // Deduplicate by userId — keep only the first (highest rank) entry per user
      const seen = new Set()
      const unique = (data.rewards || []).filter(r => {
        if (seen.has(r.userId)) return false
        seen.add(r.userId)
        return true
      })
      setLatestRewards(unique)
    } catch (e) {
      console.error('Failed to fetch latest rewards:', e)
    }
  }

  useEffect(() => { fetchRewards() }, [fetchRewards])
  useEffect(() => { fetchLatest() }, [])

  const clearFilters = () => {
    setSearch('')
    setStartDate('')
    setEndDate('')
    setRankFilter('')
    setRewardDaysFilter('')
    setPage(1)
  }

  const hasActiveFilters = search || startDate || endDate || rankFilter || rewardDaysFilter

  if (error && rewards.length === 0) {
    return (
      <PageTransition>
        <div className="p-6 lg:p-8 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-site-ink">Weekly Rewards</h1>
            <p className="text-site-muted mt-1">Track weekly leaderboard rewards given to top performers</p>
          </div>
          <ErrorState message={error} onRetry={fetchRewards} />
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="p-6 lg:p-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-site-ink">Weekly Rewards</h1>
          <p className="text-site-muted mt-1">Track weekly leaderboard rewards given to top performers</p>
        </div>

        {/* Latest Week Winners Card */}
        {latestRewards.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-site-ink mb-3 flex items-center gap-2">
              <Gift className="w-4 h-4 text-site-accent" />
              Latest Week Winners
              <span className="text-xs text-site-faint font-normal">
                (Week ending {new Date(latestRewards[0]?.weekEndDate).toLocaleDateString()})
              </span>
            </h2>
            <AnimatedList className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {latestRewards.map((r) => (
                <LatestRewardCard key={r._id} reward={r} />
              ))}
            </AnimatedList>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <AnimatedList className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard icon={Gift} label="Total Rewards Given" value={stats.totalRewards} />
            <StatCard icon={Users} label="Unique Winners" value={stats.uniqueUsers} color="text-blue-600" bgColor="bg-blue-50" />
            <StatCard icon={Clock} label="Total Days Awarded" value={stats.totalDaysGiven.toLocaleString()} color="text-purple-600" bgColor="bg-purple-50" />
            <StatCard icon={Trophy} label="Avg Weekly XP" value={stats.avgXp?.toLocaleString() || '0'} color="text-amber-600" bgColor="bg-amber-50" />
          </AnimatedList>
        )}

        {/* Filters Section */}
        <div className="bg-site-surface rounded-xl border border-site-border p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-site-faint" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-9 pr-3 py-2 border border-site-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-site-accent/30 bg-site-bg"
              />
            </div>

            {/* Toggle Filters Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                showFilters || hasActiveFilters
                  ? 'bg-site-accent/10 text-site-accent border-site-accent/30'
                  : 'bg-site-surface text-site-ink border-site-border hover:bg-site-bg'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-site-accent" />
              )}
            </button>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-site-muted hover:text-red-600 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-site-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Date Range - Start */}
              <div>
                <label className="block text-xs font-medium text-site-muted mb-1">From Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1) }}
                  className="w-full px-3 py-2 border border-site-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-site-accent/30 bg-site-bg"
                />
              </div>

              {/* Date Range - End */}
              <div>
                <label className="block text-xs font-medium text-site-muted mb-1">To Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1) }}
                  className="w-full px-3 py-2 border border-site-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-site-accent/30 bg-site-bg"
                />
              </div>

              {/* Rank Filter */}
              <div>
                <label className="block text-xs font-medium text-site-muted mb-1">Rank</label>
                <select
                  value={rankFilter}
                  onChange={(e) => { setRankFilter(e.target.value); setPage(1) }}
                  className="w-full px-3 py-2 border border-site-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-site-accent/30 bg-site-bg"
                >
                  {RANK_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Reward Duration Filter */}
              <div>
                <label className="block text-xs font-medium text-site-muted mb-1">Reward Duration</label>
                <select
                  value={rewardDaysFilter}
                  onChange={(e) => { setRewardDaysFilter(e.target.value); setPage(1) }}
                  className="w-full px-3 py-2 border border-site-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-site-accent/30 bg-site-bg"
                >
                  {REWARD_DAYS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-site-muted">
            {total} reward{total !== 1 ? 's' : ''} found
          </p>
        </div>

        {/* Loading State */}
        {loading && rewards.length === 0 ? (
          <SkeletonTable rows={5} cols={6} />
        ) : (
          <>
            {/* Rewards Table - Desktop */}
            <div className="hidden md:block bg-site-surface rounded-xl border border-site-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-site-border bg-site-bg/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-site-muted uppercase tracking-wider">Rank</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-site-muted uppercase tracking-wider">User</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-site-muted uppercase tracking-wider">Weekly XP</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-site-muted uppercase tracking-wider">Reward</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-site-muted uppercase tracking-wider">Week Ending</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-site-muted uppercase tracking-wider">Extended To</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-site-border">
                  {rewards.map((reward) => {
                    const config = RANK_CONFIG[reward.rank] || RANK_CONFIG[3]
                    return (
                      <tr key={reward._id} className="hover:bg-site-bg/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-sm font-medium ${config.color}`}>
                            <span className="text-lg">{config.icon}</span>
                            #{reward.rank}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-site-ink">{reward.userName}</p>
                          <p className="text-xs text-site-faint">{reward.userEmail}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-semibold text-site-ink">{reward.weeklyXp.toLocaleString()}</span>
                          <span className="text-xs text-site-faint ml-1">XP</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
                            {reward.rewardLabel} Pro
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-site-muted">
                          {new Date(reward.weekEndDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-site-muted">
                          {new Date(reward.subscriptionExtendedTo).toLocaleDateString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Rewards Cards - Mobile */}
            <div className="md:hidden space-y-3">
              {rewards.map((reward) => {
                const config = RANK_CONFIG[reward.rank] || RANK_CONFIG[3]
                return (
                  <div key={reward._id} className={`bg-site-surface rounded-lg border ${config.border} p-4`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{config.icon}</span>
                          <p className="font-medium text-site-ink truncate">{reward.userName}</p>
                        </div>
                        <p className="text-xs text-site-faint mt-0.5 truncate">{reward.userEmail}</p>
                      </div>
                      <span className="text-sm font-bold text-site-ink">{reward.weeklyXp.toLocaleString()} XP</span>
                    </div>
                    <div className="flex items-center gap-3 mt-3 text-xs">
                      <span className={`px-2 py-1 rounded-full font-medium ${config.bg} ${config.color}`}>
                        {reward.rewardLabel} Pro
                      </span>
                      <span className="text-site-faint flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(reward.weekEndDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Empty State */}
            {rewards.length === 0 && !loading && (
              <div className="text-center py-12 text-site-muted">
                <Gift className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No rewards found</p>
                <p className="text-sm mt-1">
                  {hasActiveFilters ? 'Try adjusting your filters' : 'Weekly rewards will appear here after the first leaderboard reset'}
                </p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-2 border border-site-border rounded-lg text-sm font-medium text-site-ink hover:bg-site-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <span className="text-sm text-site-muted px-3">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1 px-3 py-2 border border-site-border rounded-lg text-sm font-medium text-site-ink hover:bg-site-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </PageTransition>
  )
}
