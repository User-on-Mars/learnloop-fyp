import { useState, useEffect, useCallback } from 'react';
import { Crown, ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import { adminApi } from '../../api/adminApi';

export default function AdminSubscriptions() {
  const [tab, setTab] = useState('subscriptions');
  const [subs, setSubs] = useState([]);
  const [subTotal, setSubTotal] = useState(0);
  const [subPage, setSubPage] = useState(1);
  const [subPages, setSubPages] = useState(1);
  const [tierFilter, setTierFilter] = useState('');
  const [rewards, setRewards] = useState([]);
  const [rewardTotal, setRewardTotal] = useState(0);
  const [rewardPage, setRewardPage] = useState(1);
  const [rewardPages, setRewardPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchSubs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: subPage, limit: 20 };
      if (tierFilter) params.tier = tierFilter;
      const res = await adminApi.getSubscriptions({ page: subPage, limit: 20, ...(tierFilter ? { tier: tierFilter } : {}) });
      setSubs(res.subscriptions || []);
      setSubTotal(res.total || 0);
      setSubPages(res.pages || 1);
    } catch (err) { console.error('Failed to fetch subscriptions:', err); }
    finally { setLoading(false); }
  }, [subPage, tierFilter]);

  const fetchRewards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getRewards({ page: rewardPage, limit: 30 });
      setRewards(res.rewards || []);
      setRewardTotal(res.total || 0);
      setRewardPages(res.pages || 1);
    } catch (err) { console.error('Failed to fetch rewards:', err); }
    finally { setLoading(false); }
  }, [rewardPage]);

  useEffect(() => {
    if (tab === 'subscriptions') fetchSubs();
    else fetchRewards();
  }, [tab, fetchSubs, fetchRewards]);

  const proCount = subs.filter(s => s.tier === 'pro').length;

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-site-ink">Subscriptions</h1>
        <p className="text-site-muted mt-1">Manage subscriptions and view weekly rewards</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-site-bg rounded-lg p-1 w-fit">
        <button onClick={() => setTab('subscriptions')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'subscriptions' ? 'bg-white text-site-ink shadow-sm' : 'text-site-muted hover:text-site-ink'}`}>
          Subscriptions
        </button>
        <button onClick={() => setTab('rewards')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === 'rewards' ? 'bg-white text-site-ink shadow-sm' : 'text-site-muted hover:text-site-ink'}`}>
          Weekly Rewards
        </button>
      </div>

      {tab === 'subscriptions' && (
        <>
          {/* Filter */}
          <div className="flex gap-3 mb-4">
            <select value={tierFilter} onChange={e => { setTierFilter(e.target.value); setSubPage(1); }}
              className="px-3 py-2 border border-site-border rounded-lg text-sm bg-site-surface text-site-ink">
              <option value="">All Plans</option>
              <option value="pro">Pro</option>
              <option value="free">Free</option>
            </select>
            <span className="text-sm text-site-muted self-center">{subTotal} total</span>
          </div>

          {/* Table */}
          <div className="bg-site-surface rounded-xl border border-site-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-site-bg border-b border-site-border">
                    <th className="text-left px-4 py-3 font-semibold text-site-muted">User</th>
                    <th className="text-left px-4 py-3 font-semibold text-site-muted">Plan</th>
                    <th className="text-left px-4 py-3 font-semibold text-site-muted">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-site-muted">Period End</th>
                    <th className="text-left px-4 py-3 font-semibold text-site-muted">Canceled</th>
                    <th className="text-left px-4 py-3 font-semibold text-site-muted">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-site-faint">Loading...</td></tr>
                  ) : subs.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-site-faint">No subscriptions found</td></tr>
                  ) : subs.map(s => (
                    <tr key={s._id} className="border-b border-site-border/50 hover:bg-site-bg/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-site-ink">{s.userName}</p>
                        <p className="text-xs text-site-faint">{s.userEmail}</p>
                      </td>
                      <td className="px-4 py-3">
                        {s.tier === 'pro' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold">
                            <Crown className="w-3 h-3" /> Pro
                          </span>
                        ) : (
                          <span className="text-site-faint text-xs">Free</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${s.status === 'active' ? 'text-green-600' : s.status === 'canceled' ? 'text-amber-600' : 'text-gray-500'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-site-faint">
                        {s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-site-faint">
                        {s.canceledAt ? new Date(s.canceledAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-site-faint">
                        {new Date(s.updatedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {subPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-site-border">
                <span className="text-sm text-site-faint">Page {subPage} of {subPages}</span>
                <div className="flex gap-2">
                  <button onClick={() => setSubPage(p => Math.max(1, p - 1))} disabled={subPage === 1}
                    className="p-2 border border-site-border rounded-lg disabled:opacity-40 hover:bg-site-bg"><ChevronLeft className="w-4 h-4" /></button>
                  <button onClick={() => setSubPage(p => Math.min(subPages, p + 1))} disabled={subPage >= subPages}
                    className="p-2 border border-site-border rounded-lg disabled:opacity-40 hover:bg-site-bg"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'rewards' && (
        <>
          <p className="text-sm text-site-muted mb-4">{rewardTotal} total rewards given</p>
          <div className="bg-site-surface rounded-xl border border-site-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-site-bg border-b border-site-border">
                    <th className="text-left px-4 py-3 font-semibold text-site-muted">Week</th>
                    <th className="text-center px-4 py-3 font-semibold text-site-muted">Rank</th>
                    <th className="text-left px-4 py-3 font-semibold text-site-muted">User</th>
                    <th className="text-center px-4 py-3 font-semibold text-site-muted">Weekly XP</th>
                    <th className="text-left px-4 py-3 font-semibold text-site-muted">Reward</th>
                    <th className="text-left px-4 py-3 font-semibold text-site-muted">Extended To</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-site-faint">Loading...</td></tr>
                  ) : rewards.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-site-faint">No rewards yet. Rewards are given every Sunday at midnight to the top 3 weekly XP earners.</td></tr>
                  ) : rewards.map(r => {
                    const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
                    return (
                      <tr key={r._id} className="border-b border-site-border/50 hover:bg-site-bg/50">
                        <td className="px-4 py-3 text-xs text-site-faint">{new Date(r.weekEndDate).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-center text-lg">{medals[r.rank] || `#${r.rank}`}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-site-ink">{r.userName}</p>
                          <p className="text-xs text-site-faint">{r.userEmail}</p>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-site-ink">{r.weeklyXp}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold">
                            <Trophy className="w-3 h-3" /> {r.rewardLabel} Pro
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-site-faint">{new Date(r.subscriptionExtendedTo).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {rewardPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-site-border">
                <span className="text-sm text-site-faint">Page {rewardPage} of {rewardPages}</span>
                <div className="flex gap-2">
                  <button onClick={() => setRewardPage(p => Math.max(1, p - 1))} disabled={rewardPage === 1}
                    className="p-2 border border-site-border rounded-lg disabled:opacity-40 hover:bg-site-bg"><ChevronLeft className="w-4 h-4" /></button>
                  <button onClick={() => setRewardPage(p => Math.min(rewardPages, p + 1))} disabled={rewardPage >= rewardPages}
                    className="p-2 border border-site-border rounded-lg disabled:opacity-40 hover:bg-site-bg"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
