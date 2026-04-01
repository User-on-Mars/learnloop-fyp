import { Flame, Trophy, RefreshCw } from 'lucide-react';

const TIER_CONFIG = {
  Gold: { icon: '🏆', label: 'Gold' },
  Silver: { icon: '🥈', label: 'Silver' },
  Bronze: { icon: '🥉', label: 'Bronze' },
  Newcomer: { icon: '⭐', label: 'Newcomer' },
};

export default function XpProfileCard({ profile, isLoading, error, onRetry }) {
  if (isLoading) {
    return (
      <div className="bg-site-surface rounded-xl shadow-sm border border-site-border p-5">
        <h3 className="text-base font-semibold text-site-ink mb-4">XP Profile</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-3 bg-site-bg rounded-lg animate-pulse">
              <div className="h-4 w-16 bg-gray-200 rounded mb-2" />
              <div className="h-6 w-12 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-site-surface rounded-xl shadow-sm border border-site-border p-5">
        <h3 className="text-base font-semibold text-site-ink mb-3">XP Profile</h3>
        <div className="text-center py-4">
          <p className="text-site-muted text-sm mb-3">XP data unavailable</p>
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 text-sm text-site-accent font-medium hover:text-site-accent-hover"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const {
    totalXp = 0,
    weeklyXp = 0,
    currentStreak = 0,
    leagueTier = 'Newcomer',
    weeklyRank = null,
  } = profile || {};

  const tier = TIER_CONFIG[leagueTier] || TIER_CONFIG.Newcomer;
  const hasMultiplier = currentStreak >= 7;

  return (
    <div className="bg-site-surface rounded-xl shadow-sm border border-site-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-site-ink">XP Profile</h3>
        {hasMultiplier && (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
            <Flame className="w-3 h-3" />
            ×2 XP Active
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCell label="Total XP" value={totalXp.toLocaleString()} />
        <StatCell label="Weekly XP" value={weeklyXp.toLocaleString()} />
        <StatCell
          label="Streak"
          value={
            <span className="inline-flex items-center gap-1">
              <Flame className="w-4 h-4 text-orange-500" />
              {currentStreak}d
            </span>
          }
        />
        <StatCell
          label="League"
          value={
            <span className="inline-flex items-center gap-1">
              <span>{tier.icon}</span>
              {tier.label}
            </span>
          }
        />
        <StatCell
          label="Weekly Rank"
          value={weeklyRank ? `#${weeklyRank}` : '—'}
        />
      </div>
    </div>
  );
}

function StatCell({ label, value }) {
  return (
    <div className="p-3 bg-site-bg rounded-lg text-center">
      <p className="text-xs text-site-faint mb-1">{label}</p>
      <p className="text-lg font-bold text-site-ink">{value}</p>
    </div>
  );
}
