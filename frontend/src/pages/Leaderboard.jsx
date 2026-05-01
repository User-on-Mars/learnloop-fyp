import { useState, useEffect, useCallback } from 'react';
import { 
  RefreshCw, Trophy, Crown, Flame, Zap, TrendingUp, 
  ChevronLeft, ChevronRight, Medal, Award, Star, 
  Target, Gift, Calendar, Lightbulb, BookOpen, Check
} from 'lucide-react';
import { leaderboardAPI, xpAPI, subscriptionAPI } from '../api/client';
import HeroSection from '../components/HeroSection';
import { auth } from '../firebase';

const TABS = [
  { id: 'weekly', label: 'Weekly XP', icon: Calendar, color: '#f59e0b' },
  { id: 'streaks', label: 'Streaks', icon: Flame, color: '#ef4444' },
  { id: 'alltime', label: 'All-Time', icon: Trophy, color: '#8b5cf6' },
];

const TIER_CONFIG = {
  Gold: { Icon: Trophy, label: 'Gold', color: '#f59e0b', bg: 'bg-amber-100' },
  Silver: { Icon: Medal, label: 'Silver', color: '#9ca3af', bg: 'bg-gray-100' },
  Bronze: { Icon: Award, label: 'Bronze', color: '#cd7c2f', bg: 'bg-orange-100' },
  Newcomer: { Icon: Star, label: 'Newcomer', color: '#10b981', bg: 'bg-emerald-100' },
};

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState('weekly');
  const [data, setData] = useState({ entries: [], total: 0, page: 1 });
  const [myRanks, setMyRanks] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [xpProfile, setXpProfile] = useState(null);
  const [xpLoading, setXpLoading] = useState(true);
  const [latestRewards, setLatestRewards] = useState([]);

  const currentUserId = auth.currentUser?.uid;

  const fetchXpProfile = useCallback(async () => {
    setXpLoading(true);
    try {
      const res = await xpAPI.getProfile();
      setXpProfile(res.data);
    } catch {
      // ignore
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

      try {
        const ranksRes = await leaderboardAPI.getMyRanks();
        setMyRanks(ranksRes.data);
      } catch {
        setMyRanks(null);
      }
    } catch (err) {
      if (err?.code === 'ERR_NETWORK' || err?.message === 'Network Error') {
        setError('Cannot connect to server.');
      } else {
        setError('Failed to load leaderboard');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchXpProfile();
    subscriptionAPI.getLatestRewards().then(res => {
      setLatestRewards(res.data.rewards || []);
    }).catch(() => {});
  }, [fetchXpProfile]);

  useEffect(() => {
    fetchBoard(activeTab);
  }, [activeTab, fetchBoard]);

  const handleTabChange = (tab) => setActiveTab(tab);
  const handlePageChange = (newPage) => fetchBoard(activeTab, newPage);

  const metricLabel = activeTab === 'streaks' ? 'Days' : 'XP';
  const activeTabConfig = TABS.find(t => t.id === activeTab);

  const normalizedEntries = (data.entries || []).map((entry) => {
    if (activeTab === 'weekly') return { ...entry, value: entry.weeklyXp, tier: entry.leagueTier };
    if (activeTab === 'streaks') return { ...entry, value: entry.currentStreak };
    return { ...entry, value: entry.totalXp };
  });

  const pinnedRank = myRanks ? { weekly: myRanks.weeklyRank, streaks: myRanks.streakRank, alltime: myRanks.allTimeRank }[activeTab] : null;
  const pinnedValue = xpProfile ? { weekly: xpProfile.weeklyXp, streaks: xpProfile.currentStreak, alltime: xpProfile.totalXp }[activeTab] : null;

  const { totalXp = 0, weeklyXp = 0, currentStreak = 0, leagueTier = 'Newcomer', weeklyRank = null } = xpProfile || {};
  const tier = TIER_CONFIG[leagueTier] || TIER_CONFIG.Newcomer;
  const hasMultiplier = currentStreak >= 7;

  return (
    <div className="px-4 sm:px-6 py-6 lg:py-8">

      {/* Hero Header */}
      <HeroSection
            title="Leaderboard"
            subtitle="Compete & Climb"
            description="See how you stack up against other learners. Earn XP, maintain streaks, and climb the ranks!"
            icon={Trophy}
            gradientFrom="amber-50/50"
            gradientVia="[#f8faf6]"
            gradientTo="orange-50/30"
            borderColor="[#e2e6dc]"
            iconGradientFrom="amber-600"
            iconGradientTo="orange-600"
            subtitleColor="amber-600"
            decorColor1="amber-100/30"
            decorColor2="orange-100/20"
            actions={hasMultiplier ? [] : undefined}
            stats={[
              { icon: Zap, color: "#f59e0b", bg: "bg-amber-100", label: "Total XP", value: totalXp.toLocaleString() },
              { icon: TrendingUp, color: "#10b981", bg: "bg-emerald-100", label: "Weekly XP", value: weeklyXp.toLocaleString() },
              { icon: Flame, color: "#ef4444", bg: "bg-red-100", label: "Streak", value: `${currentStreak}d` },
              { icon: Crown, color: tier.color, bg: tier.bg, label: "League", value: tier.label },
              { icon: Target, color: "#8b5cf6", bg: "bg-purple-100", label: "Rank", value: weeklyRank ? `#${weeklyRank}` : '-' }
            ]}
            statsColumns="grid-cols-2 sm:grid-cols-5"
            extraContent={hasMultiplier && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl shadow-sm w-fit">
                <Flame className="w-5 h-5 text-white" />
                <span className="text-white font-bold text-sm">2x XP Active!</span>
              </div>
            )}
          />

          {/* League Progress - Flat Horizontal Layout */}
          {xpProfile && (
            <div className="bg-white rounded-2xl border border-[#e2e6dc] p-5 mb-6 shadow-sm">
              <LeagueInfoFlat userXp={xpProfile.totalXp || 0} weeklyXp={xpProfile.weeklyXp || 0} />
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            
            {/* Left Column - Main Leaderboard */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-[#e2e6dc] overflow-hidden shadow-sm">
                
                {/* Leaderboard Header */}
                <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white">Top Rankings</h2>
                        <p className="text-white/70 text-xs">Updated in real-time</p>
                      </div>
                    </div>
                    {pinnedRank && (
                      <div className="text-right">
                        <p className="text-white/70 text-xs">Your Rank</p>
                        <p className="text-white font-bold text-xl">#{pinnedRank}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tab Switcher */}
                <div className="px-4 py-3 bg-[#f8faf6] border-b border-[#e8ece3]">
                  <div className="flex bg-white rounded-xl p-1 shadow-inner">
                    {TABS.map((tab) => {
                      const TabIcon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => handleTabChange(tab.id)}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                            isActive
                              ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-sm'
                              : 'text-[#9aa094] hover:text-[#565c52]'
                          }`}
                        >
                          <TabIcon className="w-4 h-4" />
                          <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Leaderboard Content */}
                {error ? (
                  <div className="text-center py-12">
                    <Trophy className="w-12 h-12 text-amber-200 mx-auto mb-3" />
                    <p className="text-[#565c52] text-sm mb-4">{error}</p>
                    <button
                      onClick={() => fetchBoard(activeTab)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Retry
                    </button>
                  </div>
                ) : (
                  <TopFiveLeaderboard
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

            {/* Right Column - Rewards & League */}
            <div className="space-y-6">
              
              {/* Weekly Pro Rewards */}
              <div className="bg-white rounded-2xl border border-[#e2e6dc] overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-[#e8ece3] flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-600 to-orange-600 flex items-center justify-center shadow-sm">
                    <Gift className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#1c1f1a]">Weekly Rewards</h3>
                    <p className="text-[11px] text-[#9aa094]">Top 3 earn Pro access</p>
                  </div>
                </div>

                <div className="p-5">
                  {/* Reward Tiers */}
                  <div className="grid grid-cols-3 gap-2 mb-5">
                    {[
                      { rank: 1, reward: '6 months', Icon: Trophy, bg: 'from-amber-500 to-yellow-600' },
                      { rank: 2, reward: '3 months', Icon: Medal, bg: 'from-gray-400 to-gray-500' },
                      { rank: 3, reward: '1 month', Icon: Award, bg: 'from-orange-500 to-amber-700' },
                    ].map((item) => (
                      <div 
                        key={item.rank}
                        className={`relative text-center p-3 rounded-xl bg-gradient-to-br ${item.bg} shadow-sm`}
                      >
                        <item.Icon className="w-6 h-6 text-white mx-auto" />
                        <p className="text-white text-[10px] font-bold mt-1">{item.reward}</p>
                        <p className="text-white/70 text-[9px]">Pro</p>
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] text-[#9aa094] mb-4 leading-relaxed">
                    Top 3 weekly XP earners receive free Pro subscriptions every Sunday.
                  </p>

                  {/* Last Week's Winners */}
                  {latestRewards.length > 0 ? (
                    <div>
                      <p className="text-[10px] font-bold text-[#9aa094] uppercase tracking-wider mb-3">Last Week's Winners</p>
                      <div className="space-y-2">
                        {latestRewards.map(r => {
                          const medalIcons = { 
                            1: <Trophy className="w-4 h-4 text-amber-500" />, 
                            2: <Medal className="w-4 h-4 text-gray-400" />, 
                            3: <Award className="w-4 h-4 text-orange-500" /> 
                          };
                          const isMe = r.userId === currentUserId;
                          return (
                            <div 
                              key={r._id} 
                              className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                                isMe 
                                  ? 'bg-amber-50 border border-amber-200' 
                                  : 'bg-[#f8faf6]'
                              }`}
                            >
                              <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-sm">
                                {medalIcons[r.rank]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-[#1c1f1a] truncate">
                                  {r.userName}
                                  {isMe && <span className="text-amber-600 ml-1">(You)</span>}
                                </p>
                                <p className="text-[10px] text-[#9aa094]">{r.weeklyXp?.toLocaleString()} XP</p>
                              </div>
                              <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-lg">
                                {r.rewardLabel}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-3 bg-[#f8faf6] rounded-xl">
                      <p className="text-xs text-[#9aa094]">No rewards yet this week</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
    </div>
  );
}

/* Stat Card */
function StatCard({ icon: Icon, color, bg, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-lg font-bold text-[#1c1f1a] leading-none">{value}</p>
        <p className="text-[11px] text-[#9aa094] mt-0.5">{label}</p>
      </div>
    </div>
  );
}

/* Top 5 Leaderboard - Always shows 5 slots */
function TopFiveLeaderboard({
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

  // Always show 5 slots
  const slots = [1, 2, 3, 4, 5];

  if (isLoading) {
    return (
      <div className="p-3 space-y-2">
        {slots.map((rank) => (
          <div key={rank} className="flex items-center gap-3 p-3 rounded-xl bg-[#f8faf6] animate-pulse">
            <div className={`w-10 h-10 rounded-xl ${rank <= 3 ? 'bg-amber-100' : 'bg-[#e8ece3]'}`} />
            <div className="flex-1">
              <div className="h-4 w-28 bg-[#e8ece3] rounded" />
            </div>
            <div className="h-5 w-12 bg-[#e8ece3] rounded" />
          </div>
        ))}
      </div>
    );
  }

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-white" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-white" />;
    if (rank === 3) return <Award className="w-5 h-5 text-white" />;
    return <span className="text-sm font-bold text-[#9aa094]">#{rank}</span>;
  };

  const getRankStyle = (rank, hasEntry) => {
    if (!hasEntry) {
      return { bg: 'bg-[#f5f7f2]', text: 'text-[#d0d5ca]' };
    }
    if (rank === 1) return { bg: 'bg-gradient-to-r from-amber-500 to-yellow-600 shadow-sm', text: 'text-white' };
    if (rank === 2) return { bg: 'bg-gradient-to-r from-gray-400 to-gray-500 shadow-sm', text: 'text-white' };
    if (rank === 3) return { bg: 'bg-gradient-to-r from-orange-500 to-amber-700 shadow-sm', text: 'text-white' };
    return { bg: 'bg-[#e8ece3]', text: 'text-[#565c52]' };
  };

  return (
    <div>
      <div className="p-3 space-y-2">
        {slots.map((rank) => {
          const entry = entries.find(e => e.rank === rank);
          const hasEntry = !!entry;
          const isCurrentUser = entry?.userId === currentUserId;
          const rankStyle = getRankStyle(rank, hasEntry);
          const tierConfig = entry?.tier ? TIER_CONFIG[entry.tier] : null;

          return (
            <div
              key={rank}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                isCurrentUser
                  ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300'
                  : hasEntry
                  ? 'bg-white border border-[#e8ece3] hover:border-amber-200'
                  : 'bg-[#fafbf8] border border-[#f0f4ec]'
              }`}
            >
              {/* Rank Badge */}
              <div 
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${rankStyle.bg} ${rankStyle.text}`}
              >
                {hasEntry ? getRankIcon(rank) : <span className="text-sm font-bold">#{rank}</span>}
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                {hasEntry ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-[#1c1f1a] truncate">
                      {entry.displayName || 'Anonymous'}
                    </p>
                    {isCurrentUser && (
                      <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full">
                        You
                      </span>
                    )}
                    {showTierBadge && tierConfig && (
                      <span 
                        className={`flex items-center gap-1 px-2 py-0.5 ${tierConfig.bg} text-[10px] font-bold rounded-full`}
                        style={{ color: tierConfig.color }}
                      >
                        <tierConfig.Icon className="w-3 h-3" /> {tierConfig.label}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-[#d0d5ca]">—</p>
                )}
              </div>

              {/* Value */}
              <div className="text-right flex-shrink-0">
                {hasEntry ? (
                  <p className={`text-lg font-bold ${isCurrentUser ? 'text-amber-600' : 'text-[#1c1f1a]'}`}>
                    {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
                    <span className="text-[10px] text-[#9aa094] ml-1 font-medium">{metricLabel}</span>
                  </p>
                ) : (
                  <p className="text-sm text-[#d0d5ca]">—</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {total > pageSize && (
        <div className="flex items-center justify-between px-3 py-2.5 border-t border-[#e8ece3] bg-[#fafbf8]">
          <span className="text-xs text-[#9aa094]">Page {page}/{totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange?.(page - 1)}
              disabled={!hasPrev}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-[#e2e6dc] text-[#565c52] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <button
              onClick={() => onPageChange?.(page + 1)}
              disabled={!hasNext}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-[#e2e6dc] text-[#565c52] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* League Info Flat - Horizontal layout for below hero */
function LeagueInfoFlat({ userXp = 0, weeklyXp = 0 }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/admin/xp-settings`);
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
        }
      } catch (error) {
        console.error('Failed to fetch XP settings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  if (loading || !settings) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="h-24 bg-[#f5f7f2] rounded-xl animate-pulse" />
        <div className="h-24 bg-[#f5f7f2] rounded-xl animate-pulse" />
        <div className="h-24 bg-[#f5f7f2] rounded-xl animate-pulse" />
      </div>
    );
  }

  const leagues = [
    { name: 'Gold', minXp: settings.goldThreshold, Icon: Trophy, color: '#f59e0b', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
    { name: 'Silver', minXp: settings.silverThreshold, Icon: Medal, color: '#9ca3af', bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600' },
    { name: 'Bronze', minXp: settings.bronzeThreshold, Icon: Award, color: '#ea580c', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
    { name: 'Newcomer', minXp: 0, Icon: Star, color: '#3b82f6', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  ];

  const xpSources = [
    { activity: 'Practice Session', xp: `${settings.practiceXpPerMinute} XP/min`, Icon: Target, color: '#8b5cf6' },
    { activity: 'Daily Reflection', xp: `${settings.reflectionXp} XP`, Icon: BookOpen, color: '#10b981' },
    { activity: '5-Day Streak', xp: `${settings.streak5DayMultiplier}x`, Icon: Flame, color: '#f59e0b' },
    { activity: '7+ Day Streak', xp: `${settings.streak7DayMultiplier}x`, Icon: Zap, color: '#ef4444' },
  ];

  const getCurrentLeague = () => {
    if (weeklyXp >= settings.goldThreshold) return 'Gold';
    if (weeklyXp >= settings.silverThreshold) return 'Silver';
    if (weeklyXp >= settings.bronzeThreshold) return 'Bronze';
    return 'Newcomer';
  };

  const getNextLeague = () => {
    if (weeklyXp < settings.bronzeThreshold) return leagues[2];
    if (weeklyXp < settings.silverThreshold) return leagues[1];
    if (weeklyXp < settings.goldThreshold) return leagues[0];
    return null;
  };

  const currentLeague = getCurrentLeague();
  const nextLeague = getNextLeague();
  const xpToNext = nextLeague ? nextLeague.minXp - weeklyXp : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* League Tiers */}
      <div className="bg-[#f8faf6] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Crown className="w-5 h-5 text-purple-500" />
          <h3 className="text-sm font-bold text-[#1c1f1a]">League Tiers</h3>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {leagues.map((league) => {
            const isCurrent = currentLeague === league.name;
            return (
              <div
                key={league.name}
                className={`rounded-lg border p-2 text-center ${league.bg} ${league.border} ${isCurrent ? 'ring-2 ring-purple-400 ring-offset-1' : ''}`}
              >
                <league.Icon className="w-4 h-4 mx-auto mb-1" style={{ color: league.color }} />
                <p className={`text-[10px] font-bold ${league.text}`}>{league.name}</p>
                <p className={`text-[9px] ${league.text} opacity-70`}>{league.minXp}+ XP</p>
                {isCurrent && <Check className="w-3 h-3 mx-auto mt-1 text-purple-500" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress to Next League */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-5 h-5 text-purple-500" />
          <h3 className="text-sm font-bold text-purple-900">Next League Progress</h3>
        </div>
        {nextLeague ? (
          <>
            <div className="h-3 bg-white/60 rounded-full overflow-hidden shadow-inner mb-2">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((weeklyXp / nextLeague.minXp) * 100, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-purple-700">{weeklyXp} / {nextLeague.minXp} XP</span>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-purple-900">{xpToNext} XP to</span>
                <nextLeague.Icon className="w-4 h-4" style={{ color: nextLeague.color }} />
                <span className="text-xs font-bold text-purple-900">{nextLeague.name}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-purple-700">
            <Trophy className="w-5 h-5 text-amber-500" />
            <span className="text-sm font-medium">You're at the top! Gold League</span>
          </div>
        )}
      </div>

      {/* How to Earn XP */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-5 h-5 text-emerald-500" />
          <h3 className="text-sm font-bold text-emerald-900">How to Earn XP</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {xpSources.map((source, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-white/50 rounded-lg p-2">
              <source.Icon className="w-4 h-4 flex-shrink-0" style={{ color: source.color }} />
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-emerald-900 truncate">{source.activity}</p>
                <p className="text-[10px] font-bold text-emerald-600">{source.xp}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}