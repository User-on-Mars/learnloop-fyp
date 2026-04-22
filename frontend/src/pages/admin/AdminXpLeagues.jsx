import { useState, useEffect } from 'react'
import { Trophy, TrendingUp } from 'lucide-react'
import { adminApi } from '../../api/adminApi'
import DataTable from '../../components/admin/DataTable'
import LeagueInfo from '../../components/admin/LeagueInfo'

export default function AdminXpLeagues() {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [xpSettings, setXpSettings] = useState(null)
  const [settingsLoading, setSettingsLoading] = useState(true)

  useEffect(() => {
    loadLeaderboard()
    loadXpSettings()
  }, [])

  const loadLeaderboard = async () => {
    try {
      setLoading(true)
      // Fetch settings to get leaderboard size, then fetch leaderboard
      const settingsRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/admin/xp-settings`, {
        headers: { Authorization: `Bearer ${await adminApi.getToken()}` }
      })
      const settings = settingsRes.ok ? await settingsRes.json() : {}
      const size = settings.leaderboardSize || 10
      const result = await adminApi.getXpLeaderboard(size)
      setLeaderboard(result.leaderboard || [])
    } catch (error) {
      console.error('Failed to load leaderboard:', error)
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
      render: (val) => <span className="font-semibold text-green-600">{val.toLocaleString()}</span>
    },
    { 
      key: 'totalXp', 
      label: 'Total XP',
      render: (val) => <span className="font-medium text-site-muted text-sm">{val.toLocaleString()}</span>
    },
    {
      key: 'leagueTier',
      label: 'League',
      render: (val) => {
        const leagueColors = {
          'Gold': 'bg-amber-50 text-amber-700 border-amber-200',
          'Silver': 'bg-gray-50 text-gray-700 border-gray-200',
          'Bronze': 'bg-orange-50 text-orange-700 border-orange-200',
          'Newcomer': 'bg-blue-50 text-blue-700 border-blue-200'
        }
        return <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${leagueColors[val] || leagueColors['Newcomer']}`}>{val}</span>
      }
    }
  ]

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-site-ink">XP & Leagues</h1>
        <p className="text-site-muted mt-1">Leaderboard and XP system management</p>
      </div>

      {/* League Info */}
      <LeagueInfo showProgress={false} />

      {/* Next Reset */}
      <div className="bg-site-surface rounded-xl border border-site-border p-5 mb-8">
        <p className="text-sm text-site-faint mb-2">Weekly reset schedule</p>
        <p className="text-2xl font-bold text-site-ink">Every Sunday</p>
        <p className="text-xs text-site-muted mt-2">Leaderboard resets weekly. Users keep total XP but weekly XP resets to 0.</p>
      </div>

      {/* Leaderboard & Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* XP Leaderboard */}
        <div className="bg-site-surface rounded-xl border border-site-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-site-ink">XP leaderboard — this week</h3>
            <button 
              onClick={loadLeaderboard}
              className="text-xs text-site-accent hover:text-site-accent-hover font-medium"
            >
              Refresh
            </button>
          </div>
          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-8 text-site-faint">Loading...</div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-8 text-site-faint">No weekly XP yet</div>
            ) : (
              leaderboard.slice(0, 5).map((user, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-site-bg rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-site-ink">{user.rank}</span>
                    <span className="text-sm font-medium text-site-ink">{user.userName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-semibold text-green-600">{user.weeklyXp.toLocaleString()}</div>
                      <div className="text-xs text-site-faint">{user.totalXp.toLocaleString()} total</div>
                    </div>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${
                      user.leagueTier === 'Gold' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      user.leagueTier === 'Silver' ? 'bg-gray-50 text-gray-700 border-gray-200' :
                      user.leagueTier === 'Bronze' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                      'bg-blue-50 text-blue-700 border-blue-200'
                    }`}>
                      {user.leagueTier}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* XP System Settings */}
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
              <div className="mt-4 pt-4 border-t border-site-border">
                <p className="text-xs font-semibold text-site-ink mb-2">League Thresholds (Weekly XP)</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                    <span className="text-xs text-orange-900">🥉 Bronze</span>
                    <span className="text-xs font-semibold text-orange-700">{xpSettings.bronzeThreshold} XP</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <span className="text-xs text-gray-900">🥈 Silver</span>
                    <span className="text-xs font-semibold text-gray-700">{xpSettings.silverThreshold} XP</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-amber-50 rounded-lg">
                    <span className="text-xs text-amber-900">🥇 Gold</span>
                    <span className="text-xs font-semibold text-amber-700">{xpSettings.goldThreshold} XP</span>
                  </div>
                </div>
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

      {/* Full Leaderboard */}
      <DataTable
        columns={columns}
        data={leaderboard}
        loading={loading}
        empty="No leaderboard data"
      />
    </div>
  )
}
