import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { leaderboardAPI, xpAPI } from '../api/client';
import Sidebar from '../components/Sidebar';
import XpProfileCard from '../components/XpProfileCard';
import LeaderboardTable from '../components/LeaderboardTable';
import { auth } from '../firebase';

const TABS = [
  { id: 'weekly', label: 'Weekly XP' },
  { id: 'streaks', label: 'Streaks' },
  { id: 'alltime', label: 'All-Time' },
];

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState('weekly');
  const [data, setData] = useState({ entries: [], total: 0, page: 1 });
  const [myRanks, setMyRanks] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // XP profile state
  const [xpProfile, setXpProfile] = useState(null);
  const [xpLoading, setXpLoading] = useState(true);
  const [xpError, setXpError] = useState(false);

  const currentUserId = auth.currentUser?.uid;

  const fetchXpProfile = useCallback(async () => {
    setXpLoading(true);
    setXpError(false);
    try {
      const res = await xpAPI.getProfile();
      setXpProfile(res.data);
    } catch {
      setXpError(true);
    } finally {
      setXpLoading(false);
    }
  }, []);

  const fetchBoard = useCallback(async (tab, page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchers = {
        weekly: leaderboardAPI.getWeekly,
        streaks: leaderboardAPI.getStreaks,
        alltime: leaderboardAPI.getAllTime,
      };
      const boardRes = await fetchers[tab](page);
      setData(boardRes.data);

      // Fetch ranks separately so a failure doesn't block the board
      try {
        const ranksRes = await leaderboardAPI.getMyRanks();
        setMyRanks(ranksRes.data);
      } catch {
        setMyRanks(null);
      }
    } catch {
      setError('Failed to load leaderboard data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchXpProfile();
  }, [fetchXpProfile]);

  useEffect(() => {
    fetchBoard(activeTab);
  }, [activeTab, fetchBoard]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const handlePageChange = (newPage) => {
    fetchBoard(activeTab, newPage);
  };

  const metricLabel = activeTab === 'streaks' ? 'Streak Days' : 'XP';

  // Normalize entries to a common { value, tier } shape for the table
  const normalizedEntries = (data.entries || []).map((entry) => {
    if (activeTab === 'weekly') {
      return { ...entry, value: entry.weeklyXp, tier: entry.leagueTier };
    }
    if (activeTab === 'streaks') {
      return { ...entry, value: entry.currentStreak };
    }
    return { ...entry, value: entry.totalXp };
  });

  // Build pinned user row from myRanks (rank only) + xpProfile (values)
  const pinnedRank = myRanks
    ? {
        weekly: myRanks.weeklyRank,
        streaks: myRanks.streakRank,
        alltime: myRanks.allTimeRank,
      }[activeTab]
    : null;

  const pinnedValue = xpProfile
    ? {
        weekly: xpProfile.weeklyXp,
        streaks: xpProfile.currentStreak,
        alltime: xpProfile.totalXp,
      }[activeTab]
    : null;

  return (
    <div className="flex min-h-screen bg-site-bg">
      <Sidebar />

      <main className="flex-1 overflow-y-auto w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-site-ink">Leaderboard</h1>
            <p className="text-site-muted mt-1">See how you stack up against other learners</p>
          </div>

          {/* XP Profile */}
          <div className="mb-6">
            <XpProfileCard
              profile={xpProfile}
              isLoading={xpLoading}
              error={xpError}
              onRetry={fetchXpProfile}
            />
          </div>

          {/* Leaderboard Card */}
          <div className="bg-site-surface rounded-xl shadow-sm border border-site-border">
            {/* Tabs */}
            <div className="flex border-b border-site-border">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-site-accent border-b-2 border-site-accent'
                      : 'text-site-muted hover:text-site-ink'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Pinned user rank */}
            {pinnedRank != null && !isLoading && !error && (
              <div className="px-4 py-3 bg-site-soft border-b border-site-border/50 flex items-center justify-between text-sm">
                <span className="text-site-muted">Your rank</span>
                <span className="font-semibold text-site-ink">
                  #{pinnedRank} · {typeof pinnedValue === 'number' ? pinnedValue.toLocaleString() : pinnedValue} {metricLabel.toLowerCase()}
                </span>
              </div>
            )}

            {/* Error state */}
            {error ? (
              <div className="text-center py-12">
                <p className="text-site-muted text-sm mb-3">{error}</p>
                <button
                  onClick={() => fetchBoard(activeTab)}
                  className="inline-flex items-center gap-1.5 text-sm text-site-accent font-medium hover:text-site-accent-hover"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry
                </button>
              </div>
            ) : (
              <LeaderboardTable
                entries={normalizedEntries}
                total={data.total || 0}
                page={data.page || 1}
                isLoading={isLoading}
                currentUserId={currentUserId}
                metricLabel={metricLabel}
                showTierBadge={activeTab === 'weekly'}
                onPageChange={handlePageChange}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
