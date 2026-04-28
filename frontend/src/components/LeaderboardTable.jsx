import { ChevronLeft, ChevronRight, Trophy, Medal, Award, Star } from 'lucide-react';

const TIER_BADGES = {
  Gold: <Trophy className="w-4 h-4 text-amber-500" />,
  Silver: <Medal className="w-4 h-4 text-gray-400" />,
  Bronze: <Award className="w-4 h-4 text-amber-700" />,
  Newcomer: <Star className="w-4 h-4 text-site-accent" />,
};

function SkeletonRows({ count = 5 }) {
  return Array.from({ length: count }, (_, i) => (
    <tr key={i} className="animate-pulse">
      <td className="px-4 py-3"><div className="h-4 w-8 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3"><div className="h-4 w-32 bg-gray-200 rounded" /></td>
      <td className="px-4 py-3 text-right"><div className="h-4 w-16 bg-gray-200 rounded ml-auto" /></td>
    </tr>
  ));
}

export default function LeaderboardTable({
  entries = [],
  total = 0,
  page = 1,
  pageSize = 10,
  isLoading = false,
  currentUserId,
  metricLabel = 'XP',
  showTierBadge = false,
  onPageChange,
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr className="border-b border-site-border text-left text-xs text-site-faint uppercase tracking-wider">
              <th className="px-4 py-2 w-16">Rank</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2 text-right">{metricLabel}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <SkeletonRows />
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-12 text-center">
                  <p className="text-site-muted font-medium mb-1">No one on the board yet</p>
                  <p className="text-xs text-site-faint">Be the first to earn XP and claim your spot on the leaderboard!</p>
                </td>
              </tr>
            ) : (
              entries.map((entry) => {
                const isCurrentUser = entry.userId === currentUserId;
                return (
                  <tr
                    key={entry.userId}
                    className={`border-b border-site-border/50 transition-colors ${
                      isCurrentUser
                        ? 'bg-site-soft font-semibold'
                        : 'hover:bg-site-bg'
                    }`}
                  >
                    <td className="px-4 py-3 text-site-muted">#{entry.rank}</td>
                    <td className="px-4 py-3 text-site-ink">
                      <span className="flex items-center gap-2">
                        {showTierBadge && entry.tier && (
                          <span title={entry.tier}>{TIER_BADGES[entry.tier] || ''}</span>
                        )}
                        {entry.displayName || 'Anonymous'}
                        {isCurrentUser && (
                          <span className="text-xs text-site-accent">(you)</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-site-ink">
                      {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-between pt-4 px-1">
          <span className="text-xs text-site-faint">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange?.(page - 1)}
              disabled={!hasPrev}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-site-border text-site-muted hover:bg-site-bg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <button
              onClick={() => onPageChange?.(page + 1)}
              disabled={!hasNext}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-site-border text-site-muted hover:bg-site-bg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
