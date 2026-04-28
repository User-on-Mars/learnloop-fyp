import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Trophy, Crown } from 'lucide-react';
import { leaderboardAPI, xpAPI, subscriptionAPI } from '../api/client';
import Sidebar from '../components/Sidebar';
import XpProfileCard from '../components/XpProfileCard';
import LeaderboardTable from '../components/LeaderboardTable';
import LeagueInfo from '../components/admin/LeagueInfo';
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
  const [latestRewards, setLatestRewards] = useState([]);

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
    } catch (err) {
      // Distinguish network errors from server errors
      if (err?.code === 'ERR_NETWORK' || err?.message === 'Network Error') {
        setError('Cannot connect to server. Please make sure the backend is running.');
      } else {
        setError('Failed to load leaderboard data');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchXpProfile();
    // Fetch latest weekly rewards
    subscriptionAPI.getLatestRewards().then(res => {
      setLatestRewards(res.data.rewards || []);
    }).catch(() => {});
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

          {/* League Progress */}
          {xpProfile && (
            <div className="mb-6 bg-site-surface rounded-xl shadow-sm border border-site-border p-5">
              <h3 className="text-base font-semibold text-site-ink mb-4">League Progress</h3>
              <LeagueInfo userXp={xpProfile.totalXp || 0} weeklyXp={xpProfile.weeklyXp || 0} />
            </div>
          )}

          {/* Weekly Rewards */}
          <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-semibold text-site-ink">Weekly Pro Rewards</h3>
            </div>

            {/* Reward rules */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-lg font-bold text-amber-700">#1</p>
                <p className="text-xs text-amber-600 font-medium mt-0.5">6 months Pro</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-lg font-bold text-gray-600">#2</p>
                <p className="text-xs text-gray-500 font-medium mt-0.5">3 months Pro</p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-100">
                <p className="text-lg font-bold text-orange-600">#3</p>
                <p className="text-xs text-orange-500 font-medium mt-0.5">1 month Pro</p>
              </div>
            </div>

            <p className="text-xs text-gray-400 mb-4">Top 3 weekly XP earners receive free Pro subscriptions every Sunday at midnight. Rewards stack on existing subscriptions.</p>

            {/* Last week's winners */}
            {latestRewards.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Last Week's Winners</p>
                <div className="space-y-2">
                  {latestRewards.map(r => {
                    const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
                    const isMe = r.userId === currentUserId;
                    return (
                      <div key={r._id} className={`flex items-center gap-3 p-2.5 rounded-lg ${isMe ? 'bg-site-soft border border-site-accent/20' : 'bg-gray-50'}`}>
                        <span className="text-lg w-7 text-center flex-shrink-0">{medals[r.rank]}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-site-ink truncate">
                            {r.userName}
                            {isMe && <span className="text-xs text-site-accent ml-1">(You)</span>}
                          </p>
                          {r.userEmail && (
                            <p className="text-xs text-gray-400 truncate">{r.userEmail}</p>
                          )}
                          <p className="text-xs text-gray-400">{r.weeklyXp} XP</p>
                        </div>
                        <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex-shrink-0">
                          {r.rewardLabel} Pro
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-2">No rewards given yet. Be the first to earn one!</p>
            )}
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
