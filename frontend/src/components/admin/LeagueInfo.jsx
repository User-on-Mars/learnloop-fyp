import { useState, useEffect } from 'react'
import { Trophy, Medal, Award, Star, Check, Lightbulb, Zap, BookOpen, Flame, Target } from 'lucide-react'

export default function LeagueInfo({ userXp = 0, weeklyXp = 0, showProgress = true }) {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-4 gap-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-24 bg-[#f5f7f2] rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-16 bg-[#f5f7f2] rounded-xl animate-pulse" />
      </div>
    )
  }

  const leagues = [
    { 
      name: 'Gold', 
      fullName: 'Gold League',
      range: 'Top performers', 
      minXp: settings.goldThreshold, 
      color: 'bg-amber-50 border-amber-200',
      textColor: 'text-amber-700',
      Icon: Trophy,
      iconColor: '#f59e0b'
    },
    { 
      name: 'Silver', 
      fullName: 'Silver League',
      range: 'Strong progress', 
      minXp: settings.silverThreshold, 
      color: 'bg-gray-50 border-gray-200',
      textColor: 'text-gray-600',
      Icon: Medal,
      iconColor: '#9ca3af'
    },
    { 
      name: 'Bronze', 
      fullName: 'Bronze League',
      range: 'Good effort', 
      minXp: settings.bronzeThreshold, 
      color: 'bg-orange-50 border-orange-200',
      textColor: 'text-orange-700',
      Icon: Award,
      iconColor: '#ea580c'
    },
    { 
      name: 'Newcomer', 
      fullName: 'Newcomer',
      range: 'Getting started', 
      minXp: 0, 
      color: 'bg-blue-50 border-blue-200',
      textColor: 'text-blue-700',
      Icon: Star,
      iconColor: '#3b82f6'
    }
  ]

  const xpSources = [
    { 
      activity: `Practice Session (${settings.practiceXpPerMinute} XP/min)`, 
      xp: 'Variable', 
      frequency: 'Unlimited',
      Icon: Target,
      iconColor: '#8b5cf6'
    },
    { 
      activity: 'Daily Reflection', 
      xp: `${settings.reflectionXp} XP`, 
      frequency: 'Once per day',
      Icon: BookOpen,
      iconColor: '#10b981'
    },
    { 
      activity: '5-Day Streak Bonus', 
      xp: `${settings.streak5DayMultiplier}x multiplier`, 
      frequency: 'On all XP earned',
      Icon: Flame,
      iconColor: '#f59e0b'
    },
    { 
      activity: '7+ Day Streak Bonus', 
      xp: `${settings.streak7DayMultiplier}x multiplier`, 
      frequency: 'On all XP earned',
      Icon: Zap,
      iconColor: '#ef4444'
    }
  ]

  const getCurrentLeague = () => {
    if (weeklyXp >= settings.goldThreshold) return 'Gold'
    if (weeklyXp >= settings.silverThreshold) return 'Silver'
    if (weeklyXp >= settings.bronzeThreshold) return 'Bronze'
    return 'Newcomer'
  }

  const getNextLeague = () => {
    if (weeklyXp < settings.bronzeThreshold) return leagues[2]
    if (weeklyXp < settings.silverThreshold) return leagues[1]
    if (weeklyXp < settings.goldThreshold) return leagues[0]
    return null
  }

  const currentLeague = getCurrentLeague()
  const nextLeague = getNextLeague()
  const xpToNext = nextLeague ? nextLeague.minXp - weeklyXp : 0

  return (
    <div className="space-y-4">
      {/* League Tiers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {leagues.map((league) => {
          const isCurrent = currentLeague === league.name
          const LeagueIcon = league.Icon
          return (
            <div
              key={league.name}
              className={`rounded-xl border-2 p-3 transition-all ${league.color} ${
                isCurrent ? 'ring-2 ring-offset-2 ring-blue-400 shadow-md' : ''
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <LeagueIcon className="w-4 h-4" style={{ color: league.iconColor }} />
                <p className={`text-sm font-bold ${league.textColor}`}>{league.fullName}</p>
              </div>
              <p className={`text-[11px] ${league.textColor} opacity-80`}>{league.range}</p>
              <p className={`text-[11px] font-bold mt-2 ${league.textColor}`}>
                Weekly XP: {league.minXp}+
              </p>
              {isCurrent && (
                <div className="flex items-center gap-1 mt-2">
                  <Check className="w-3 h-3 text-blue-600" />
                  <span className="text-[11px] font-bold text-blue-600">Current</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Progress to Next League */}
      {showProgress && nextLeague && (
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-4">
          <p className="text-sm font-bold text-purple-900 mb-3">Next League Progress</p>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="h-3 bg-white/60 rounded-full overflow-hidden shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((weeklyXp / nextLeague.minXp) * 100, 100)}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-xs font-bold text-purple-900">{xpToNext} XP to</span>
              <nextLeague.Icon className="w-4 h-4" style={{ color: nextLeague.iconColor }} />
              <span className="text-xs font-bold text-purple-900">{nextLeague.name}</span>
            </div>
          </div>
        </div>
      )}

      {/* XP Earning Guide */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-4">
        <p className="text-sm font-bold text-emerald-900 mb-3">How to Earn XP</p>
        <div className="space-y-2.5">
          {xpSources.map((source, idx) => {
            const SourceIcon = source.Icon
            return (
              <div key={idx} className="flex items-start gap-3">
                <div 
                  className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${source.iconColor}15` }}
                >
                  <SourceIcon className="w-4 h-4" style={{ color: source.iconColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-emerald-900">{source.activity}</p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    <span className="font-bold">{source.xp}</span> • {source.frequency}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-3 pt-3 border-t border-emerald-200 flex items-start gap-2">
          <Lightbulb className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-emerald-700">
            <span className="font-bold">Tip:</span> Maintain a 5+ day streak to unlock XP multipliers! 
            Leagues are based on weekly XP and reset every Sunday.
          </p>
        </div>
      </div>
    </div>
  )
}