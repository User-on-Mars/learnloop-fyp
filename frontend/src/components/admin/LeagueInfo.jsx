export default function LeagueInfo({ userXp = 0 }) {
  const leagues = [
    { name: 'Gold league', range: 'Top tier', minXp: 1000, color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { name: 'Silver league', range: 'Rank 11-30', minXp: 500, color: 'bg-gray-50 text-gray-700 border-gray-200' },
    { name: 'Bronze league', range: 'Rank 31-100', minXp: 100, color: 'bg-orange-50 text-orange-700 border-orange-200' },
    { name: 'Newcomer', range: 'New users', minXp: 0, color: 'bg-blue-50 text-blue-700 border-blue-200' }
  ]

  const xpSources = [
    { activity: 'Practice Session (10+ min)', xp: '10 XP', frequency: 'Once per day' },
    { activity: 'Reflection', xp: '20 XP', frequency: 'Once per day' },
    { activity: 'Streak Bonus', xp: '5 XP × streak days', frequency: 'Daily (with 7+ day streak: 2× multiplier)' },
    { activity: 'Template Skill Map Completion', xp: '50 XP', frequency: 'Once per template skill map (all nodes completed)' }
  ]

  const getCurrentLeague = () => {
    if (userXp >= 1000) return 'Gold'
    if (userXp >= 500) return 'Silver'
    if (userXp >= 100) return 'Bronze'
    return 'Newcomer'
  }

  const getNextLeague = () => {
    if (userXp < 100) return leagues[2] // Bronze
    if (userXp < 500) return leagues[1] // Silver
    if (userXp < 1000) return leagues[0] // Gold
    return null
  }

  const currentLeague = getCurrentLeague()
  const nextLeague = getNextLeague()
  const xpToNext = nextLeague ? nextLeague.minXp - userXp : 0

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
              <p className="text-sm font-semibold">{league.name}</p>
              <p className="text-xs mt-1">{league.range}</p>
              <p className="text-xs font-bold mt-2">XP: {league.minXp}+</p>
              {isCurrent && <p className="text-xs font-semibold mt-2">✓ Current</p>}
            </div>
          )
        })}
      </div>

      {userXp !== undefined && (
        <div className="bg-site-surface rounded-xl border border-site-border p-4">
          <p className="text-sm font-semibold text-site-ink">Your Progress</p>
          <p className="text-2xl font-bold text-site-accent mt-2">{userXp} XP</p>
          <p className="text-xs text-site-muted mt-1">Current league: <span className="font-semibold">{currentLeague}</span></p>
          {nextLeague && (
            <p className="text-xs text-site-muted mt-2">
              {xpToNext} XP to reach <span className="font-semibold">{nextLeague.name}</span>
            </p>
          )}
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
            <span className="font-semibold">💡 Tip:</span> Maintain a 7+ day streak to unlock 2× XP multiplier on all activities! Template skill maps award XP when all nodes are completed.
          </p>
        </div>
      </div>
    </div>
  )
}
