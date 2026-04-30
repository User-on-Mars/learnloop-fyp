import { useState, useEffect, useCallback, useMemo, memo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock, ChevronRight, ChevronLeft, ChevronDown, Zap, Award, Target,
  Flame, Trophy, Play, MapPin, TrendingUp,
  Sparkles, ArrowUpRight, BarChart3, LayoutDashboard,
} from "lucide-react";
import { practiceAPI, skillsAPI, xpAPI } from "../api/client.ts";
import client from "../api/client.ts";
import Sidebar from "../components/Sidebar";
import { SkillIcon } from "../components/IconPicker";
import { useAuth } from "../useAuth";

const MAPS_PER_PAGE = 5;

import FilterDropdown from "../components/FilterDropdown";

function DashboardSkeleton() {
  return (
    <>
      <Sidebar />
      <div className="pt-16 md:pl-14 min-h-screen bg-[#f8faf6]">
        <div className="px-4 sm:px-6 py-6 space-y-4">
          <div className="h-44 rounded-2xl bg-white/60 animate-pulse border border-[#e2e6dc]" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-52 rounded-2xl bg-white/60 animate-pulse border border-[#e2e6dc]" />
            <div className="h-52 rounded-2xl bg-white/60 animate-pulse border border-[#e2e6dc]" />
          </div>
          <div className="h-64 rounded-2xl bg-white/60 animate-pulse border border-[#e2e6dc]" />
        </div>
      </div>
    </>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const user = useAuth();
  const [stats, setStats] = useState(null);
  const [practices, setPractices] = useState([]);
  const [skills, setSkills] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [xpProfile, setXpProfile] = useState(null);
  const [xpLoading, setXpLoading] = useState(true);
  const [xpError, setXpError] = useState(false);
  const [reflections, setReflections] = useState([]);
  const [mapPage, setMapPage] = useState(1);
  const [activeTab, setActiveTab] = useState('skills');
  const [statusFilter, setStatusFilter] = useState('all');
  const [moodFilter, setMoodFilter] = useState('all');
  const [sessionTypeFilter, setSessionTypeFilter] = useState('all');

  const fetchDashboard = useCallback(async () => {
    try {
      setIsLoading(true); setError("");
      const [statsRes, practicesRes, skillsRes] = await Promise.all([
        practiceAPI.getStats().catch(() => ({ data: { summary: { totalMinutes: 0, totalSessions: 0 }, topSkills: [] } })),
        practiceAPI.getPractices({ limit: 500 }).catch(() => ({ data: { practices: [] } })),
        skillsAPI.getAll().catch(() => ({ data: { skills: [] } })),
      ]);
      setStats(statsRes.data); setPractices(practicesRes.data.practices || []); setSkills(skillsRes.data.skills || []);
      // Fetch reflections
      try { const refRes = await client.get('/reflections'); setReflections(refRes.data || []); } catch { setReflections([]); }
      setXpLoading(true); setXpError(false);
      try { const r = await xpAPI.getProfile(); setXpProfile(r.data); }
      catch { setXpError(true); } finally { setXpLoading(false); }
    } catch (err) { console.error("Dashboard fetch error:", err); setError("Failed to load dashboard data"); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);
  useEffect(() => {
    const fn = () => { if (!document.hidden) fetchDashboard(); };
    document.addEventListener("visibilitychange", fn);
    return () => document.removeEventListener("visibilitychange", fn);
  }, [fetchDashboard]);

  const summary = stats?.summary || {};
  const derived = useMemo(() => {
    const totalMinutes = summary.totalMinutes || 0;
    const totalHours = Math.floor(totalMinutes / 60);
    const totalMins = totalMinutes % 60;
    const totalSessions = summary.totalSessions || 0;
    const today = new Date().toDateString();
    const todayPractices = practices.filter(p => new Date(p.date).toDateString() === today);
    const todayMinutes = todayPractices.reduce((s, p) => s + p.minutesPracticed, 0);
    const totalNodes = skills.reduce((s, sk) => s + (sk.nodeCount || 0), 0);
    const completedNodes = skills.reduce((s, sk) => s + (sk.completedNodes || 0), 0);
    const completedMaps = skills.filter(sk => sk.completionPercentage === 100).length;
    const inProgressMaps = skills.filter(sk => (sk.completionPercentage || 0) > 0 && (sk.completionPercentage || 0) < 100).length;
    const overallPct = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;
    const unlockedSkills = skills.filter(s => !s.locked);
    return { totalHours, totalMins, totalSessions, todayPractices, todayMinutes, totalNodes, completedNodes, completedMaps, inProgressMaps, overallPct, unlockedSkills };
  }, [summary, practices, skills]);
  const { totalHours, totalMins, totalSessions, todayPractices, todayMinutes, totalNodes, completedNodes, completedMaps, inProgressMaps, overallPct, unlockedSkills } = derived;

  const displayName = user?.displayName || user?.email?.split("@")[0] || "Learner";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const xp = xpProfile || {};
  const streak = xp.currentStreak || 0;
  const weeklyXp = xp.weeklyXp || 0;
  const totalXp = xp.totalXp || 0;
  const tier = xp.leagueTier || "Newcomer";
  const totalMapPages = Math.ceil(unlockedSkills.length / MAPS_PER_PAGE);
  const pagedSkills = unlockedSkills.slice((mapPage - 1) * MAPS_PER_PAGE, mapPage * MAPS_PER_PAGE);

  // Filtered & sorted lists for tabs
  const filteredSkills = useMemo(() => {
    if (statusFilter === 'all') return unlockedSkills;
    return unlockedSkills.filter(s => {
      const pct = s.completionPercentage || 0;
      if (statusFilter === 'done') return pct === 100;
      if (statusFilter === 'active') return pct > 0 && pct < 100;
      if (statusFilter === 'new') return pct === 0;
      return true;
    });
  }, [unlockedSkills, statusFilter]);

  const filteredMapPages = Math.ceil(filteredSkills.length / MAPS_PER_PAGE);
  const filteredPagedSkills = filteredSkills.slice((mapPage - 1) * MAPS_PER_PAGE, mapPage * MAPS_PER_PAGE);

  const filteredReflections = useMemo(() => {
    if (moodFilter === 'all') return reflections;
    return reflections.filter(r => r.mood === moodFilter);
  }, [reflections, moodFilter]);

  const filteredSessions = useMemo(() => {
    if (sessionTypeFilter === 'all') return practices;
    if (sessionTypeFilter === 'skillmap') return practices.filter(p => !!p.skillId);
    if (sessionTypeFilter === 'free') return practices.filter(p => !p.skillId);
    return practices;
  }, [practices, sessionTypeFilter]);

  const topSkills = useMemo(() =>
    [...skills].filter(s => !s.locked).sort((a, b) => (b.completionPercentage || 0) - (a.completionPercentage || 0)),
    [skills]
  );

  const timeAgo = useCallback((d) => {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(diff / 3600000);
    if (h < 24) return `${h}h ago`;
    const dy = Math.floor(diff / 86400000);
    if (dy < 7) return `${dy}d ago`;
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }, []);

  if (isLoading) return <DashboardSkeleton />;
  if (error) {
    return (
      <>
        <Sidebar />
        <div className="pt-16 md:pl-14 min-h-screen bg-[#f8faf6] flex items-center justify-center">
          <div className="bg-red-50 text-red-700 p-5 rounded-xl text-sm border border-red-200 max-w-sm text-center">
            <p className="font-semibold mb-1.5">{error}</p>
            <button onClick={fetchDashboard} className="text-red-500 hover:text-red-700 underline text-xs font-medium">Try again</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Sidebar />
      <div className="pt-16 md:pl-14 min-h-screen bg-[#f8faf6]">
        <div className="px-4 sm:px-6 py-6 lg:py-8 space-y-6">

          {/* Hero Greeting */}
          <div className="relative overflow-hidden bg-gradient-to-br from-sky-50 via-white to-blue-50 rounded-2xl border border-sky-100 p-6 sm:p-8">
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-sky-200 opacity-15 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-blue-200 opacity-10 blur-2xl pointer-events-none" />

            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-600 to-blue-600 flex items-center justify-center shadow-sm">
                    <LayoutDashboard className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-[#1c1f1a]">{greeting}, {displayName}</h1>
                    <p className="text-sm text-sky-600 font-medium">Your Learning Dashboard</p>
                  </div>
                </div>
                <p className="text-[#565c52] text-[15px] leading-relaxed max-w-xl">
                  Here's your learning overview. Track progress, review sessions, and keep building your skills.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button onClick={() => navigate("/log-practice")}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-xl text-[13px] font-semibold hover:from-sky-700 hover:to-blue-700 transition-all shadow-lg shadow-sky-500/20 active:scale-[0.97]">
                  <Play className="w-4 h-4" /> Log Practice
                </button>
                <button onClick={() => navigate("/roomspace")}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white text-[#565c52] rounded-xl text-[13px] font-semibold hover:bg-[#f5f7f2] transition-colors border border-[#e2e6dc]">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                  RoomSpace
                </button>
              </div>
            </div>

            {/* Quick XP Stats */}
            <div className="relative grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-sky-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-sky-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-[#1c1f1a] leading-none">{totalXp.toLocaleString()}</p>
                  <p className="text-[11px] text-[#9aa094] mt-0.5">Total XP</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-[#1c1f1a] leading-none">{weeklyXp.toLocaleString()}</p>
                  <p className="text-[11px] text-[#9aa094] mt-0.5">Weekly XP</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-[#1c1f1a] leading-none">{streak}d</p>
                  <p className="text-[11px] text-[#9aa094] mt-0.5">Streak</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-[#1c1f1a] leading-none">{tier}</p>
                  <p className="text-[11px] text-[#9aa094] mt-0.5">League</p>
                </div>
              </div>
            </div>
          </div>

          {/* ═══ 2. Two overview cards ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

            {/* LEFT: Practice Overview — stats | divider | donut + legend */}
            <div className="lg:col-span-3 bg-white rounded-2xl border border-[#e2e6dc] overflow-hidden flex">
              {/* Left section: title + stats */}
              <div className="flex-1 p-6 sm:p-7">
                <h2 className="text-[17px] font-bold text-site-ink mb-6">Practice Overview</h2>
                <div className="grid grid-cols-3 gap-3">
                  <StatBubble icon={<Clock className="w-6 h-6 text-blue-500" />} bg="bg-blue-100" value={`${totalHours}h ${totalMins}m`} label="Total Time" sub={todayMinutes > 0 ? `↑ ${todayMinutes}m today` : null} subUp={todayMinutes > 0} />
                  <StatBubble icon={<BarChart3 className="w-6 h-6 text-amber-600" />} bg="bg-amber-100" value={totalSessions} label="Total Sessions" sub={totalSessions > 0 ? `${Math.round((summary.totalMinutes || 0) / totalSessions)}m avg` : null} subUp={totalSessions > 0} />
                  <StatBubble icon={<Target className="w-6 h-6 text-emerald-600" />} bg="bg-emerald-100" value={totalNodes} label="Total Nodes" sub={`${completedNodes} completed`} subUp={completedNodes > 0} />
                </div>
              </div>
              {/* Full-height divider */}
              <div className="w-px bg-[#e2e6dc]" />
              {/* Right section: donut + legend */}
              <div className="flex items-center gap-5 p-6 sm:p-7">
                <DonutWithCenter
                  segments={[
                    { value: completedNodes, color: '#2e5023' },
                    { value: Math.max(0, totalNodes - completedNodes), color: '#d97706' },
                  ]}
                  size={120} stroke={16} centerText={`${overallPct}%`} centerSub="complete"
                />
                <div className="space-y-3">
                  <LegendRow color="#2e5023" label="Completed" value={completedNodes} />
                  <LegendRow color="#d97706" label="In Progress" value={Math.max(0, totalNodes - completedNodes)} />
                </div>
              </div>
            </div>

            {/* RIGHT: Skill Category — donut + legend */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-[#e2e6dc] p-6 sm:p-7">
              <h2 className="text-[17px] font-bold text-site-ink mb-6">Skill Category</h2>
              <div className="flex items-center gap-5">
                <DonutWithCenter
                  segments={[
                    { value: completedMaps, color: '#2e5023' },
                    { value: inProgressMaps, color: '#d97706' },
                    { value: Math.max(0, unlockedSkills.length - completedMaps - inProgressMaps), color: '#60a5fa' },
                  ]}
                  size={120} stroke={16} centerText={unlockedSkills.length} centerSub="total"
                />
                <div className="flex-1 space-y-3">
                  <LegendRow color="#2e5023" label="Completed" value={completedMaps} />
                  <LegendRow color="#d97706" label="In Progress" value={inProgressMaps} />
                  <LegendRow color="#60a5fa" label="Not Started" value={Math.max(0, unlockedSkills.length - completedMaps - inProgressMaps)} />
                </div>
              </div>
            </div>
          </div>

          {/* ═══ 3. Tabbed section ═══ */}

          {/* Tab Switcher */}
          <div className="bg-white rounded-2xl border border-[#e2e6dc]">
            <div className="px-4 py-3">
              <div className="flex bg-[#f5f7f2] rounded-xl p-1 border border-[#e8ebe4]">
                {[
                  { id: 'skills', label: 'Skill Maps', count: unlockedSkills.length },
                  { id: 'reflections', label: 'Reflections', count: reflections.length },
                  { id: 'sessions', label: 'Sessions', count: practices.length },
                ].map(tab => (
                  <button key={tab.id} onClick={() => { setActiveTab(tab.id); setMapPage(1); setStatusFilter('all'); setMoodFilter('all'); setSessionTypeFilter('all'); }}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      activeTab === tab.id
                        ? 'bg-white text-[#1c1f1a] shadow-sm'
                        : 'text-[#9aa094] hover:text-[#565c52]'
                    }`}>
                    {tab.label} <span className="text-[10px] opacity-60">({tab.count})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Filter row */}
            <div className="px-6 py-3 flex items-center gap-3 border-t border-[#e2e6dc] bg-[#f8faf6] rounded-b-2xl">
              {/* Skills filter */}
              {activeTab === 'skills' && (
                <>
                  <FilterDropdown value={statusFilter} onChange={v => { setStatusFilter(v); setMapPage(1); }}
                    options={[
                      { value: 'all', label: 'All Status' },
                      { value: 'done', label: 'Completed' },
                      { value: 'active', label: 'In Progress' },
                      { value: 'new', label: 'Not Started' },
                    ]} />
                  {statusFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#edf5e9] border border-[#c8dbbe] rounded-full text-[11px] text-[#2e5023] font-semibold">
                      {statusFilter === 'done' ? 'Completed' : statusFilter === 'active' ? 'In Progress' : 'Not Started'}
                      <button onClick={() => { setStatusFilter('all'); setMapPage(1); }} className="text-[#4f7942] hover:text-red-500 ml-0.5 text-sm leading-none transition-colors">×</button>
                    </span>
                  )}
                </>
              )}

              {/* Reflections filter */}
              {activeTab === 'reflections' && (
                <>
                  <FilterDropdown value={moodFilter} onChange={v => { setMoodFilter(v); setMapPage(1); }}
                    options={[
                      { value: 'all', label: 'All Moods' },
                      { value: 'Happy', label: '😊 Happy' },
                      { value: 'Neutral', label: '😐 Neutral' },
                      { value: 'Sad', label: '😔 Struggling' },
                      { value: 'Energized', label: '⚡ Energized' },
                      { value: 'Thoughtful', label: '🧠 Thoughtful' },
                    ]} />
                  {moodFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#edf5e9] border border-[#c8dbbe] rounded-full text-[11px] text-[#2e5023] font-semibold">
                      {moodFilter}
                      <button onClick={() => { setMoodFilter('all'); setMapPage(1); }} className="text-[#4f7942] hover:text-red-500 ml-0.5 text-sm leading-none transition-colors">×</button>
                    </span>
                  )}
                </>
              )}

              {/* Sessions filter */}
              {activeTab === 'sessions' && (
                <>
                  <FilterDropdown value={sessionTypeFilter} onChange={v => { setSessionTypeFilter(v); setMapPage(1); }}
                    options={[
                      { value: 'all', label: 'All Types' },
                      { value: 'skillmap', label: 'Skill Map' },
                      { value: 'free', label: 'Free Practice' },
                    ]} />
                  {sessionTypeFilter !== 'all' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#edf5e9] border border-[#c8dbbe] rounded-full text-[11px] text-[#2e5023] font-semibold">
                      {sessionTypeFilter === 'skillmap' ? 'Skill Map' : 'Free Practice'}
                      <button onClick={() => { setSessionTypeFilter('all'); setMapPage(1); }} className="text-[#4f7942] hover:text-red-500 ml-0.5 text-sm leading-none transition-colors">×</button>
                    </span>
                  )}
                </>
              )}

              <button onClick={() => setMapPage(1)}
                className="px-5 py-2 bg-gradient-to-r from-sky-600 to-blue-600 text-white text-[12px] font-bold rounded-xl hover:from-sky-700 hover:to-blue-700 shadow-sm transition-all active:scale-[0.97]">
                Filter
              </button>
            </div>
          </div>

          {/* ── Result Card (separate) ── */}
          <div className="bg-white rounded-2xl border border-[#e2e6dc]">
            <div className="px-6 pb-6 pt-4">
              {/* Skill Maps tab */}
              {activeTab === 'skills' && (
                filteredSkills.length === 0 ? (
                  <div className="text-center py-10">
                    <MapPin className="w-7 h-7 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-site-muted">{statusFilter !== 'all' ? 'No matching skill maps' : 'No skill maps yet'}</p>
                    {statusFilter === 'all' && (
                      <button onClick={() => navigate("/skills")} className="inline-flex items-center gap-1 text-xs text-sky-600 font-bold hover:underline mt-2">
                        Create skill map <ArrowUpRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Table header */}
                    <div className="grid grid-cols-12 gap-3 px-3 pb-2 text-[11px] font-semibold text-[#9aa094] uppercase tracking-wider">
                      <span className="col-span-1">#</span>
                      <span className="col-span-4">Name</span>
                      <span className="col-span-2 text-center">Nodes</span>
                      <span className="col-span-3">Progress</span>
                      <span className="col-span-2 text-right">Status</span>
                    </div>
                    {/* Rows */}
                    <div className="divide-y divide-[#f0f2eb]">
                      {filteredSkills.slice((mapPage - 1) * MAPS_PER_PAGE, mapPage * MAPS_PER_PAGE).map((skill, i) => {                        const pct = skill.completionPercentage || 0;
                        const done = skill.completedNodes || 0;
                        const total = skill.nodeCount || 0;
                        const color = skill.color || "#2e5023";
                        const isComplete = pct === 100;
                        return (
                          <div key={skill._id} onClick={() => navigate(`/skills/${skill._id}`)}
                            className="grid grid-cols-12 gap-3 items-center px-3 py-3 hover:bg-[#f8faf6] cursor-pointer transition-colors group">
                            <span className="col-span-1 text-[12px] text-site-faint font-medium">{(mapPage - 1) * MAPS_PER_PAGE + i + 1}</span>
                            <div className="col-span-4 flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border"
                                style={{ backgroundColor: color + '15', borderColor: color + '25', color }}>
                                <SkillIcon name={skill.icon || 'Map'} size={16} />
                              </div>
                            <span className="text-[13px] font-semibold text-site-ink truncate group-hover:text-sky-600 transition-colors">{skill.name}</span>
                            </div>
                            <span className="col-span-2 text-center text-[12px] text-site-muted">{done}/{total}</span>
                            <div className="col-span-3 flex items-center gap-2">
                              <div className="flex-1 h-[5px] bg-[#e8ece3] rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
                              </div>
                              <span className="text-[11px] font-bold tabular-nums" style={{ color }}>{pct}%</span>
                            </div>
                            <div className="col-span-2 text-right">
                              {isComplete ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full border border-emerald-200">
                                  <Sparkles className="w-3 h-3" /> Completed
                                </span>
                              ) : pct > 0 ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 text-[11px] font-bold rounded-full border border-amber-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> In Progress
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-600 text-[11px] font-bold rounded-full border border-gray-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Not Started
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <Pagination page={mapPage} setPage={setMapPage} totalPages={filteredMapPages} />
                  </>
                )
              )}

              {/* Reflections tab */}
              {activeTab === 'reflections' && (
                filteredReflections.length === 0 ? (
                  <div className="text-center py-10">
                    <Award className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-site-muted">{moodFilter !== 'all' ? 'No matching reflections' : 'No reflections yet'}</p>
                    {moodFilter === 'all' && (
                      <button onClick={() => navigate("/reflect")} className="inline-flex items-center gap-1 text-xs text-sky-600 font-bold hover:underline mt-2">
                        Write a reflection <ArrowUpRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-12 gap-3 px-3 pb-2 text-[11px] font-semibold text-[#9aa094] uppercase tracking-wider border-b border-[#f0f2eb]">
                      <span className="col-span-1">#</span>
                      <span className="col-span-4">Title</span>
                      <span className="col-span-2 text-center">Mood</span>
                      <span className="col-span-3">Date</span>
                      <span className="col-span-2 text-right">Action</span>
                    </div>
                    <div className="divide-y divide-[#f0f2eb]">
                      {filteredReflections.slice((mapPage-1)*MAPS_PER_PAGE, mapPage*MAPS_PER_PAGE).map((r, i) => {
                        const moods = { Happy: { emoji: '😊', label: 'Happy', cls: 'text-emerald-700 bg-emerald-50' }, Neutral: { emoji: '😐', label: 'Neutral', cls: 'text-gray-600 bg-gray-100' }, Sad: { emoji: '😔', label: 'Struggling', cls: 'text-blue-700 bg-blue-50' }, Energized: { emoji: '⚡', label: 'Energized', cls: 'text-amber-700 bg-amber-50' }, Thoughtful: { emoji: '🧠', label: 'Thoughtful', cls: 'text-violet-700 bg-violet-50' } };
                        const m = moods[r.mood] || { emoji: '—', label: r.mood || 'None', cls: 'text-gray-500 bg-gray-50' };
                        return (
                          <div key={r._id} onClick={() => navigate("/reflect")}
                            className="grid grid-cols-12 gap-3 items-center px-3 py-3.5 hover:bg-[#f8faf6] cursor-pointer transition-colors group">
                            <span className="col-span-1 text-[12px] text-site-faint font-medium">{(mapPage-1)*MAPS_PER_PAGE + i + 1}</span>
                            <div className="col-span-4 min-w-0">
                              <p className="text-[13px] font-semibold text-site-ink truncate group-hover:text-sky-600 transition-colors">{r.title || 'Untitled'}</p>
                              <p className="text-[11px] text-site-faint truncate">{r.content?.slice(0, 50)}{r.content?.length > 50 ? '...' : ''}</p>
                            </div>
                            <div className="col-span-2 flex justify-center">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${m.cls}`}>
                                {m.emoji} {m.label}
                              </span>
                            </div>
                            <span className="col-span-3 text-[12px] text-site-faint">{new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            <div className="col-span-2 text-right">
                              <span className="inline-flex px-3 py-1 bg-sky-600 text-white text-[10px] font-bold rounded-lg">View</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <Pagination page={mapPage} setPage={setMapPage} totalPages={Math.ceil(filteredReflections.length / MAPS_PER_PAGE)} />
                  </>
                )
              )}

              {/* Sessions tab */}
              {activeTab === 'sessions' && (
                filteredSessions.length === 0 ? (
                  <div className="text-center py-10">
                    <Clock className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-site-muted">{sessionTypeFilter !== 'all' ? 'No matching sessions' : 'No sessions yet'}</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-12 gap-2 px-3 pb-2 text-[11px] font-semibold text-[#9aa094] uppercase tracking-wider border-b border-[#f0f2eb]">
                      <span className="col-span-1">#</span>
                      <span className="col-span-3">Skill</span>
                      <span className="col-span-2 text-center">Type</span>
                      <span className="col-span-2 text-center">Duration</span>
                      <span className="col-span-2">When</span>
                      <span className="col-span-2 text-right">Action</span>
                    </div>
                    <div className="divide-y divide-[#f0f2eb]">
                      {filteredSessions.slice((mapPage-1)*MAPS_PER_PAGE, mapPage*MAPS_PER_PAGE).map((p, i) => {
                        const isSkillMap = !!p.skillId;
                        return (
                        <div key={p._id} onClick={() => navigate("/log-practice")}
                          className="grid grid-cols-12 gap-2 items-center px-3 py-3.5 hover:bg-[#f8faf6] cursor-pointer transition-colors group">
                          <span className="col-span-1 text-[12px] text-site-faint font-medium">{(mapPage-1)*MAPS_PER_PAGE + i + 1}</span>
                          <div className="col-span-3 flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-[#f0f2eb] flex items-center justify-center flex-shrink-0">
                              <span className="text-[#2e5023] text-[11px] font-bold">{p.skillName?.charAt(0).toUpperCase()}</span>
                            </div>
                            <span className="text-[13px] font-semibold text-site-ink truncate group-hover:text-sky-600 transition-colors">{p.skillName}</span>
                          </div>
                          <div className="col-span-2 text-center">
                            <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded ${isSkillMap ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                              {isSkillMap ? 'Skill Map' : 'Free'}
                            </span>
                          </div>
                          <span className="col-span-2 text-center text-[12px] text-site-muted">{p.minutesPracticed}min</span>
                          <span className="col-span-2 text-[12px] text-site-faint">{timeAgo(p.date)}</span>
                          <div className="col-span-2 text-right">
                            <span className="inline-flex px-3 py-1 bg-sky-600 text-white text-[10px] font-bold rounded-lg">View Details</span>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                    <Pagination page={mapPage} setPage={setMapPage} totalPages={Math.ceil(filteredSessions.length / MAPS_PER_PAGE)} />
                  </>
                )
              )}
            </div>
          </div>  {/* end Result Card */}

        </div>
      </div>
    </>
  );
}

/* ═══ Sub-components ═══ */

const StatBubble = memo(function StatBubble({ icon, bg, value, label, sub, subUp }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className={`w-12 h-12 rounded-full ${bg} flex items-center justify-center mb-2`}>
        {icon}
      </div>
      <p className="text-xs text-site-faint mb-0.5">{label}</p>
      <p className="text-2xl font-bold text-site-ink leading-none">{value}</p>
      {sub && (
        <p className={`text-[11px] mt-1.5 font-medium ${subUp ? 'text-emerald-600' : 'text-site-muted'}`}>
          {subUp && '↑ '}{sub}
        </p>
      )}
    </div>
  );
});

const DonutWithCenter = memo(function DonutWithCenter({ segments, size, stroke, centerText, centerSub }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const activeSegs = segments.filter(s => s.value > 0);
  const gapDeg = activeSegs.length > 1 ? 2 : 0;
  const totalGapDeg = gapDeg * activeSegs.length;
  const usableDeg = 360 - totalGapDeg;

  let cumDeg = 0;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f0f2eb" strokeWidth={stroke} />
        {activeSegs.map((seg, i) => {
          const segDeg = (seg.value / total) * usableDeg;
          const segLen = (segDeg / 360) * circ;
          const startOffset = (cumDeg / 360) * circ;
          cumDeg += segDeg + gapDeg;
          return (
            <circle key={i} cx={size/2} cy={size/2} r={r}
              fill="none" stroke={seg.color} strokeWidth={stroke}
              strokeDasharray={`${segLen} ${circ - segLen}`}
              strokeDashoffset={-startOffset}
              strokeLinecap="butt"
              className="transition-all duration-700" />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-site-ink leading-none">{centerText}</span>
        {centerSub && <span className="text-[9px] text-site-faint mt-0.5">{centerSub}</span>}
      </div>
    </div>
  );
});

const LegendRow = memo(function LegendRow({ color, label, value, hidden }) {
  if (hidden) return null;
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-3 h-3 rounded-[3px] flex-shrink-0" style={{ backgroundColor: color }} />
      <span className="text-[13px] text-[#565c52] flex-1">{label}</span>
      <span className="text-[13px] font-bold text-site-ink tabular-nums">{value}</span>
    </div>
  );
});



const Pagination = memo(function Pagination({ page, setPage, totalPages }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#f0f2eb]">
      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
        className="flex items-center gap-1 text-[12px] font-medium text-site-muted hover:text-site-ink disabled:opacity-30 disabled:cursor-not-allowed transition-all">
        <ChevronLeft className="w-3.5 h-3.5" /> Previous
      </button>
      <span className="text-[12px] text-site-faint">
        Page <span className="font-bold text-site-ink">{page}</span> of <span className="font-bold text-site-ink">{totalPages}</span>
      </span>
      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
        className="flex items-center gap-1 text-[12px] font-medium text-site-muted hover:text-site-ink disabled:opacity-30 disabled:cursor-not-allowed transition-all">
        Next <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
});
