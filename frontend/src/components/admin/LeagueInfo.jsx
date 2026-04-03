export default function LeagueInfo({ userXp = 0 }) {
  const leagues = [
    { name: 'Gold league', range: 'Top tier', minXp: 1000, color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { name: 'Silver league', range: 'Rank 11-30', minXp: 500, color: 'bg-gray-50 text-gray-700 border-gray-200' },
    { name: 'Bronze league', range: 'Rank 31-100', minXp: 100, color: 'bg-orange-50 text-orange-700 border-orange-200' },
    { name: 'Newcomer', range: 'New users', minXp: 0, color: 'bg-blue-50 text-blue-700 border-blue-200' }
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
    </div>
  )
}
