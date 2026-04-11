import { useState, useEffect } from 'react'

export default function LeagueInfo({ userXp = 0, weeklyXp = 0, showProgress = true }) {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch XP settings from public endpoint (no auth needed for display)
    const fetchSettings = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/admin/xp-settings`)
        if (response.ok) {
          const data = await response.json()
          setSettings(data)
        }
      } catch (error) {
        console.error('Failed to fetch XP settings:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  if (loading || !settings) {
    return <div className="text-site-muted text-sm">Loading league information...</div>
  }

  const leagues = [
    { 
      name: 'Gold league', 
      range: 'Top performers', 
      minXp: settings.goldThreshold, 
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      emoji: '🥇'
    },
    { 
      name: 'Silver league', 
      range: 'Strong progress', 
      minXp: settings.silverThreshold, 
      color: 'bg-gray-50 text-gray-700 border-gray-200',
      emoji: '🥈'
    },
    { 
      name: 'Bronze league', 
      range: 'Good effort', 
      minXp: settings.bronzeThreshold, 
      color: 'bg-orange-50 text-orange-700 border-orange-200',
      emoji: '🥉'
    },
    { 
      name: 'Newcomer', 
      range: 'Getting started', 
      minXp: 0, 
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      emoji: '🌟'
    }
  ]

  const xpSources = [
    { 
      activity: `Practice Session (${settings.practiceXpPerMinute} XP/min)`, 
      xp: 'Variable', 
      frequency: 'Unlimited' 
    },
    { 
      activity: 'Daily Reflection', 
      xp: `${settings.reflectionXp} XP`, 
      frequency: 'Once per day' 
    },
    { 
      activity: '5-Day Streak Bonus', 
      xp: `${settings.streak5DayMultiplier}× multiplier`, 
      frequency: 'On all XP earned' 
    },
    { 
      activity: '7+ Day Streak Bonus', 
      xp: `${settings.streak7DayMultiplier}× multiplier`, 
      frequency: 'On all XP earned' 
    }
  ]

  const getCurrentLeague = () => {
    if (weeklyXp >= settings.goldThreshold) return 'Gold'
    if (weeklyXp >= settings.silverThreshold) return 'Silver'
    if (weeklyXp >= settings.bronzeThreshold) return 'Bronze'
    return 'Newcomer'
  }

  const getNextLeague = () => {
    if (weeklyXp < settings.bronzeThreshold) return leagues[2] // Bronze
    if (weeklyXp < settings.silverThreshold) return leagues[1] // Silver
    if (weeklyXp < settings.goldThreshold) return leagues[0] // Gold
    return null
  }

  const currentLeague = getCurrentLeague()
  const nextLeague = getNextLeague()
  const xpToNext = nextLeague ? nextLeague.minXp - weeklyXp : 0

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {leagues.map((league, idx) => {
          const isCurrent = currentLeague === league.name.split(' ')[0]
          return (
            <div
              key={idx}
              className={`rounded-xl border p-4 ${league.color} ${isCurrent ? 'ring-2 ring-offset-2' : ''}`}
            >
              <p className="text-sm font-semibold flex items-center gap-1">
                <span>{league.emoji}</span>
                <span>{league.name}</span>
              </p>
              <p className="text-xs mt-1">{league.range}</p>
              <p className="text-xs font-bold mt-2">Weekly XP: {league.minXp}+</p>
              {isCurrent && <p className="text-xs font-semibold mt-2">✓ Current</p>}
            </div>
          )
        })}
      </div>

      {showProgress && nextLeague && (
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-4">
          <p className="text-sm font-semibold text-purple-900 mb-2">Next League Progress</p>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="h-3 bg-white/50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((weeklyXp / nextLeague.minXp) * 100, 100)}%` }}
                />
              </div>
            </div>
            <span className="text-xs font-bold text-purple-900 whitespace-nowrap">
              {xpToNext} XP to {nextLeague.emoji} {nextLeague.name.split(' ')[0]}
            </span>
          </div>
        </div>
      )}

      {/* XP Earning Guide */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-4">
        <p className="text-sm font-semibold text-green-900 mb-3">How to Earn XP</p>
        <div className="space-y-2">
          {xpSources.map((source, idx) => (
            <div key={idx} className="flex items-start gap-3 text-xs">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-200 text-green-700 flex items-center justify-center font-bold">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-green-900">{source.activity}</p>
                <p className="text-green-700 mt-0.5">
                  <span className="font-semibold">{source.xp}</span> • {source.frequency}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-green-200">
          <p className="text-xs text-green-700">
            <span className="font-semibold">💡 Tip:</span> Maintain a {settings.streak5DayMultiplier >= 2 ? '5+' : '7+'} day streak to unlock XP multipliers! 
            Leagues are based on weekly XP and reset every Monday.
          </p>
        </div>
      </div>
    </div>
  )
}
