import { useState, useEffect } from 'react'
import { CalendarDays, RotateCcw, Search, Trophy } from 'lucide-react'
import { adminApi } from '../../api/adminApi'
import FilterDropdown from '../../components/FilterDropdown'
import { Button, GhostButton } from '../../components/Button'
import ThemedDatePicker from '../../components/ThemedDatePicker'
import DataTable from '../../components/admin/DataTable'
import LeagueInfo from '../../components/admin/LeagueInfo'
import PageTransition from '../../components/admin/PageTransition'
import ErrorState from '../../components/admin/ErrorState'
import AnimatedList from '../../components/admin/AnimatedList'
import { SkeletonCard, SkeletonTable } from '../../components/admin/Skeleton'
import { motion } from 'framer-motion'
import { staggerItem } from '../../components/admin/animations'

const XP_SOURCES = [
  { value: '', label: 'All XP sources' },
  { value: 'practice', label: 'Practice' },
  { value: 'reflection', label: 'Reflection' },
  { value: 'admin_adjustment', label: 'Admin adjustment' },
  { value: 'template_usage', label: 'Template usage' },
  { value: 'skillmap_completion', label: 'Skill map completion' }
]

const LEAGUE_OPTIONS = [
  { value: '', label: 'All leagues' },
  { value: 'Gold', label: 'Gold' },
  { value: 'Silver', label: 'Silver' },
  { value: 'Bronze', label: 'Bronze' },
  { value: 'Newcomer', label: 'Newcomer' }
]

const DEFAULT_FILTERS = { weekOffset: 0, startDate: '', endDate: '', search: '', league: '', source: '' }

function formatDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function weekLabel(week) {
  if (!week) return 'This week'
  if (week.weekOffset === 0) return 'This week'
  if (week.weekOffset === 1) return 'Previous week'
  return `${week.weekOffset} weeks ago`
}

function getFallbackWeeks() {
  return Array.from({ length: 12 }, (_, weekOffset) => ({ weekOffset }))
}

function leagueClass(value) {
  const leagueColors = {
    Gold: 'bg-amber-50 text-amber-700 border-amber-200',
    Silver: 'bg-gray-50 text-gray-700 border-gray-200',
    Bronze: 'bg-orange-50 text-orange-700 border-orange-200',
    Newcomer: 'bg-blue-50 text-blue-700 border-blue-200'
  }
  return leagueColors[value] || leagueColors.Newcomer
}

export default function AdminXpLeagues() {
  const [leaderboard, setLeaderboard] = useState([])
  const [leaderboardMeta, setLeaderboardMeta] = useState(null)
  const [weekOptions, setWeekOptions] = useState([])
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [xpSettings, setXpSettings] = useState(null)
  const [settingsLoading, setSettingsLoading] = useState(true)

  useEffect(() => {
    loadXpSettings()
    loadWeekOptions()
  }, [])

  useEffect(() => {
    loadLeaderboard()
  }, [filters])

  const loadWeekOptions = async () => {
    try {
      const result = await adminApi.getXpLeaderboardWeeks(12)
      setWeekOptions(result.weeks || [])
    } catch (error) {
      console.error('Failed to load leaderboard weeks:', error)
    }
  }

  const loadLeaderboard = async (nextFilters = filters) => {
    try {
      setLoading(true)
      setError(null)
      const settingsRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/admin/xp-settings`, {
        headers: { Authorization: `Bearer ${await adminApi.getToken()}` }
      })
      const settings = settingsRes.ok ? await settingsRes.json() : {}
      const size = settings.leaderboardSize || 50
      const result = await adminApi.getXpLeaderboard(size, nextFilters)
      setLeaderboard(result.leaderboard || [])
      setLeaderboardMeta(result)
    } catch (error) {
      console.error('Failed to load leaderboard:', error)
      setError('Failed to load leaderboard')
    } finally {
      setLoading(false)
    }
  }

  const loadXpSettings = async () => {
    try {
      setSettingsLoading(true)
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/admin/xp-settings`)
      if (response.ok) {
        const data = await response.json()
        setXpSettings(data)
      }
    } catch (error) {
      console.error('Failed to load XP settings:', error)
    } finally {
      setSettingsLoading(false)
    }
  }

  const updateDraftFilter = (key, value) => {
    setDraftFilters(prev => ({ ...prev, [key]: value }))
  }

  const applyFilters = (event) => {
    event.preventDefault()
    setFilters(draftFilters)
  }

  const clearFilters = () => {
    setDraftFilters(DEFAULT_FILTERS)
    setFilters(DEFAULT_FILTERS)
  }

  const weeks = weekOptions.length > 0 ? weekOptions : getFallbackWeeks()
  const weekFilterOptions = weeks.map(week => ({
    value: String(week.weekOffset),
    label: week.weekStart ? `${weekLabel(week)} (${formatDate(week.weekStart)})` : weekLabel(week)
  }))
  const selectedWeek = weeks.find(week => week.weekOffset === Number(filters.weekOffset))
  const hasCustomRange = Boolean(filters.startDate || filters.endDate)
  const draftHasCustomRange = Boolean(draftFilters.startDate || draftFilters.endDate)
  const activeWeekLabel = hasCustomRange ? 'Custom date range' : weekLabel(selectedWeek || { weekOffset: Number(filters.weekOffset) })
  const rangeLabel = leaderboardMeta ? `${formatDate(leaderboardMeta.weekStart)} - ${formatDate(leaderboardMeta.weekEnd)}` : ''
  const hasDraftChanges = JSON.stringify(draftFilters) !== JSON.stringify(filters)
  const hasFilters = filters.weekOffset !== 0 || filters.startDate || filters.endDate || filters.search || filters.league || filters.source

  const columns = [
    {
      key: 'rank',
      label: '#',
      render: (val) => (
        <div className="flex items-center gap-2">
          {val <= 3 ? (
            <Trophy className={`w-4 h-4 ${val === 1 ? 'text-yellow-500' : val === 2 ? 'text-gray-400' : 'text-orange-600'}`} />
          ) : null}
          <span className="font-semibold">{val}</span>
        </div>
      )
    },
    { key: 'userName', label: 'User' },
    {
      key: 'weeklyXp',
      label: 'Weekly XP',
      render: (val) => <span className="font-semibold text-green-600">{(val || 0).toLocaleString()}</span>
    },
    {
      key: 'totalXp',
      label: 'Total XP',
      render: (val) => <span className="font-medium text-site-muted text-sm">{(val || 0).toLocaleString()}</span>
    },
    {
      key: 'leagueTier',
      label: 'League',
      render: (val) => <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${leagueClass(val)}`}>{val}</span>
    }
  ]

  return (
    <PageTransition>
      <div className="p-6 lg:p-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-site-ink">XP & Leagues</h1>
          <p className="text-site-muted mt-1">Leaderboard and XP system management</p>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={() => loadLeaderboard()} />
        ) : loading ? (
          <>
            <SkeletonCard lines={3} />
            <div className="mt-8 mb-8">
              <SkeletonCard lines={2} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <SkeletonCard lines={5} />
              <SkeletonCard lines={8} />
            </div>
            <SkeletonTable rows={10} columns={5} />
          </>
        ) : (
          <>
            <LeagueInfo showProgress={false} />

            <div className="bg-site-surface rounded-xl border border-site-border p-5 mb-8">
              <p className="text-sm text-site-faint mb-2">Weekly reset schedule</p>
              <p className="text-2xl font-bold text-site-ink">Every Sunday</p>
              <p className="text-xs text-site-muted mt-2">Leaderboard resets weekly. Users keep total XP but weekly XP resets to 0.</p>
            </div>

            <div className="bg-site-surface rounded-xl border border-site-border p-5 mb-8">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium text-site-muted">
                    <CalendarDays className="w-4 h-4" />
                    <span>{activeWeekLabel}</span>
                  </div>
                  <h2 className="text-xl font-semibold text-site-ink mt-1">Leaderboard history</h2>
                </div>
                <div className="rounded-lg bg-[#edf5e9] px-3 py-2 text-sm font-medium text-[#2e5023]">
                  <p className="text-xs text-[#4f7942]">{rangeLabel}</p>
                </div>
              </div>

              <form onSubmit={applyFilters} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1.1fr)_minmax(160px,0.8fr)_minmax(190px,0.9fr)_minmax(220px,1fr)_auto] gap-3 items-center">
                  <FilterDropdown
                    value={String(draftFilters.weekOffset)}
                    onChange={(value) => updateDraftFilter('weekOffset', Number(value))}
                    options={weekFilterOptions}
                    minWidth={220}
                  />

                  <FilterDropdown
                    value={draftFilters.league}
                    onChange={(value) => updateDraftFilter('league', value)}
                    options={LEAGUE_OPTIONS}
                    minWidth={160}
                  />

                  <FilterDropdown
                    value={draftFilters.source}
                    onChange={(value) => updateDraftFilter('source', value)}
                    options={XP_SOURCES}
                    minWidth={190}
                  />

                  <div className="relative">
                    <Search className="w-4 h-4 text-site-faint absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={draftFilters.search}
                      onChange={(event) => updateDraftFilter('search', event.target.value)}
                      placeholder="Search users"
                      className="w-full min-h-[42px] pl-9 pr-3 rounded-xl border border-[#c8cec0] bg-white text-sm text-site-ink shadow-sm outline-none transition-all placeholder:text-site-faint focus:border-[#4f7942] focus:ring-2 focus:ring-[#4f7942]/20"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={!hasDraftChanges} className="w-auto min-w-[120px] py-2 min-h-[42px] px-4">
                      Apply
                    </Button>
                    <GhostButton type="button" onClick={clearFilters} disabled={!hasFilters && !hasDraftChanges} className="w-[42px] min-h-[42px] p-0 flex items-center justify-center" aria-label="Clear filters">
                      <RotateCcw className="w-4 h-4" />
                    </GhostButton>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_auto] gap-3 items-end rounded-lg border border-[#d8e6d2] bg-[#f4f7f2] p-3">
                  <ThemedDatePicker
                    label="From date"
                    value={draftFilters.startDate}
                    onChange={(value) => updateDraftFilter('startDate', value)}
                    max={draftFilters.endDate}
                  />
                  <ThemedDatePicker
                    label="To date"
                    value={draftFilters.endDate}
                    onChange={(value) => updateDraftFilter('endDate', value)}
                    min={draftFilters.startDate}
                  />
                  <p className="text-xs font-medium text-[#4f7942] md:pb-2">
                    {draftHasCustomRange ? 'Date range overrides week selection.' : 'Use dates for a manual range.'}
                  </p>
                </div>
              </form>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-site-surface rounded-xl border border-site-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-site-ink">XP leaderboard - {activeWeekLabel.toLowerCase()}</h3>
                    <p className="text-xs text-site-faint mt-1">{leaderboard.length} ranked user{leaderboard.length === 1 ? '' : 's'}</p>
                  </div>
                  <button
                    onClick={() => loadLeaderboard()}
                    className="text-xs text-site-accent hover:text-site-accent-hover font-medium"
                  >
                    Refresh
                  </button>
                </div>
                <AnimatedList className="space-y-2">
                  {leaderboard.length === 0 ? (
                    <div className="text-center py-8 text-site-faint">No XP found for these filters</div>
                  ) : (
                    leaderboard.slice(0, 5).map((user, idx) => (
                      <motion.div key={user.userId || idx} variants={staggerItem} className="flex items-center justify-between p-3 bg-site-bg rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-site-ink">{user.rank}</span>
                          <span className="text-sm font-medium text-site-ink">{user.userName}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-semibold text-green-600">{user.weeklyXp.toLocaleString()}</div>
                            <div className="text-xs text-site-faint">{user.totalXp.toLocaleString()} total</div>
                          </div>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${leagueClass(user.leagueTier)}`}>
                            {user.leagueTier}
                          </span>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatedList>
              </div>

              <div className="bg-site-surface rounded-xl border border-site-border p-6">
                <h3 className="font-semibold text-site-ink mb-4">XP system settings</h3>
                {settingsLoading ? (
                  <div className="text-center py-8 text-site-faint">Loading settings...</div>
                ) : xpSettings ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-site-bg rounded-lg">
                      <span className="text-sm text-site-ink">Practice XP per minute</span>
                      <span className="font-semibold text-site-accent">{xpSettings.practiceXpPerMinute} XP/min</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-site-bg rounded-lg">
                      <span className="text-sm text-site-ink">Daily Reflection XP</span>
                      <span className="font-semibold text-site-accent">{xpSettings.reflectionXp} XP</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-site-bg rounded-lg">
                      <span className="text-sm text-site-ink">5-Day Streak Multiplier</span>
                      <span className="font-semibold text-site-accent">{xpSettings.streak5DayMultiplier}x</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-site-bg rounded-lg">
                      <span className="text-sm text-site-ink">7+ Day Streak Multiplier</span>
                      <span className="font-semibold text-site-accent">{xpSettings.streak7DayMultiplier}x</span>
                    </div>
                    <button
                      onClick={() => window.location.href = '/admin/settings'}
                      className="w-full px-4 py-2 border border-site-border rounded-lg text-site-ink hover:bg-site-bg transition-colors text-sm font-medium mt-2"
                    >
                      Edit XP settings
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-site-faint">Failed to load settings</div>
                )}
              </div>
            </div>

            <DataTable
              columns={columns}
              data={leaderboard}
              loading={false}
              empty="No leaderboard data"
            />
          </>
        )}
      </div>
    </PageTransition>
  )
}
