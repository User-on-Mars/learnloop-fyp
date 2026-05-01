import { useState, useEffect, useCallback, useMemo, memo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock, ChevronRight, ChevronLeft, ChevronDown, Zap, Award, Target,
  Flame, Trophy, Play, MapPin, TrendingUp,
  Sparkles, ArrowUpRight, BarChart3, LayoutDashboard,
} from "lucide-react";
import { practiceAPI, skillsAPI, xpAPI } from "../api/client.ts";
import client from "../api/client.ts";
import { SkillIcon } from "../components/IconPicker";
import { useAuth } from "../useAuth";
import HeroSection from "../components/HeroSection";
import DataTable from "../components/DataTable";

const MAPS_PER_PAGE = 5;

import FilterDropdown from "../components/FilterDropdown";

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#f8faf6]">
      <div className="px-4 sm:px-6 py-6 space-y-4">
        <div className="h-44 rounded-2xl bg-white/60 animate-pulse border border-[#e2e6dc]" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-52 rounded-2xl bg-white/60 animate-pulse border border-[#e2e6dc]" />
          <div className="h-52 rounded-2xl bg-white/60 animate-pulse border border-[#e2e6dc]" />
        </div>
        <div className="h-64 rounded-2xl bg-white/60 animate-pulse border border-[#e2e6dc]" />
      </div>
    </div>
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
      <div className="min-h-screen bg-[#f8faf6] flex items-center justify-center">
        <div className="bg-red-50 text-red-700 p-5 rounded-xl text-sm border border-red-200 max-w-sm text-center">
          <p className="font-semibold mb-1.5">{error}</p>
          <button onClick={fetchDashboard} className="text-red-500 hover:text-red-700 underline text-xs font-medium">Try again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8faf6]">
      <div className="px-4 sm:px-6 py-6 lg:py-8 space-y-6">

          {/* Hero Greeting */}
          <HeroSection
            title={`${greeting}, ${displayName}`}
            subtitle="Your Learning Dashboard"
            description="Here's your learning overview. Track progress, review sessions, and keep building your skills."
            icon={LayoutDashboard}
            gradientFrom="sky-50"
            gradientVia="white"
            gradientTo="blue-50"
            borderColor="sky-100"
            iconGradientFrom="sky-600"
            iconGradientTo="blue-600"
            subtitleColor="sky-600"
            decorColor1="sky-200"
            decorColor2="blue-200"
            actions={[
              {
                label: "Log Practice",
                icon: Play,
                onClick: () => navigate("/log-practice"),
                variant: "primary"
              },
              {
                label: "RoomSpace",
                icon: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
                onClick: () => navigate("/roomspace"),
                variant: "secondary"
              }
            ]}
            stats={[
              { icon: Zap, color: "#0ea5e9", bg: "bg-sky-100", label: "Total XP", value: totalXp.toLocaleString() },
              { icon: TrendingUp, color: "#3b82f6", bg: "bg-blue-100", label: "Weekly XP", value: weeklyXp.toLocaleString() },
              { icon: Flame, color: "#f97316", bg: "bg-orange-100", label: "Streak", value: `${streak}d` },
              { icon: Trophy, color: "#a855f7", bg: "bg-purple-100", label: "League", value: tier }
            ]}
            statsColumns="grid-cols-2 sm:grid-cols-4"
          />

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
              <div className="flex items-center gap-3 sm:gap-5 p-6 sm:p-7">
                <div className="w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0">
                  <DonutWithCenter
                    segments={[
                      { value: completedNodes, color: '#2e5023' },
                      { value: Math.max(0, totalNodes - completedNodes), color: '#d97706' },
                    ]}
                    size={128} stroke={14} centerText={`${overallPct}%`} centerSub="complete"
                  />
                </div>
                <div className="space-y-2 sm:space-y-3 flex-1 min-w-0">
                  <LegendRow color="#2e5023" label="Completed" value={completedNodes} />
                  <LegendRow color="#d97706" label="In Progress" value={Math.max(0, totalNodes - completedNodes)} />
                </div>
              </div>
            </div>

            {/* RIGHT: Skill Category — donut + legend */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-[#e2e6dc] p-6 sm:p-7">
              <h2 className="text-[17px] font-bold text-site-ink mb-6">Skill Category</h2>
              <div className="flex items-center gap-3 sm:gap-5">
                <div className="w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0">
                  <DonutWithCenter
                    segments={[
                      { value: completedMaps, color: '#2e5023' },
                      { value: inProgressMaps, color: '#d97706' },
                      { value: Math.max(0, unlockedSkills.length - completedMaps - inProgressMaps), color: '#60a5fa' },
                    ]}
                    size={128} stroke={14} centerText={unlockedSkills.length} centerSub="total"
                  />
                </div>
                <div className="flex-1 space-y-2 sm:space-y-3 min-w-0">
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
                <>
                  <DataTable
                    data={filteredSkills.slice((mapPage - 1) * MAPS_PER_PAGE, mapPage * MAPS_PER_PAGE)}
                    columns={[
                      {
                        key: 'index',
                        label: '#',
                        span: 1,
                        render: (skill, i) => (
                          <span className="text-[12px] text-site-faint font-medium">
                            {(mapPage - 1) * MAPS_PER_PAGE + i + 1}
                          </span>
                        )
                      },
                      {
                        key: 'name',
                        label: 'Name',
                        span: 4,
                        render: (skill) => {
                          const color = skill.color || "#2e5023";
                          return (
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border"
                                style={{ backgroundColor: color + '15', borderColor: color + '25', color }}>
                                <SkillIcon name={skill.icon || 'Map'} size={16} />
                              </div>
                              <span className="text-[13px] font-semibold text-site-ink truncate group-hover:text-sky-600 transition-colors">
                                {skill.name}
                              </span>
                            </div>
                          );
                        }
                      },
                      {
                        key: 'nodes',
                        label: 'Nodes',
                        span: 2,
                        align: 'center',
                        render: (skill) => {
                          const done = skill.completedNodes || 0;
                          const total = skill.nodeCount || 0;
                          return (
                            <span className="text-[12px] text-site-muted">{done}/{total}</span>
                          );
                        }
                      },
                      {
                        key: 'progress',
                        label: 'Progress',
                        span: 3,
                        render: (skill) => {
                          const pct = skill.completionPercentage || 0;
                          const color = skill.color || "#2e5023";
                          return (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-[5px] bg-[#e8ece3] rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-500" 
                                  style={{ width: `${pct}%`, backgroundColor: color }} />
                              </div>
                              <span className="text-[11px] font-bold tabular-nums" style={{ color }}>
                                {pct}%
                              </span>
                            </div>
                          );
                        }
                      },
                      {
                        key: 'status',
                        label: 'Status',
                        span: 2,
                        align: 'right',
                        render: (skill) => {
                          const pct = skill.completionPercentage || 0;
                          const isComplete = pct === 100;
                          
                          if (isComplete) {
                            return (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-full border border-emerald-200">
                                <Sparkles className="w-3 h-3" /> Completed
                              </span>
                            );
                          } else if (pct > 0) {
                            return (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 text-[11px] font-bold rounded-full border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> In Progress
                              </span>
                            );
                          } else {
                            return (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-600 text-[11px] font-bold rounded-full border border-gray-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Not Started
                              </span>
                            );
                          }
                        }
                      }
                    ]}
                    renderMobileCard={(skill, i) => {
                      const pct = skill.completionPercentage || 0;
                      const done = skill.completedNodes || 0;
                      const total = skill.nodeCount || 0;
                      const color = skill.color || "#2e5023";
                      const isComplete = pct === 100;
                      
                      return (
                        <>
                          {/* Header Row: Icon + Name + Status */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border"
                                style={{ backgroundColor: color + '15', borderColor: color + '25', color }}>
                                <SkillIcon name={skill.icon || 'Map'} size={16} />
                              </div>
                              <span className="text-[13px] font-semibold text-site-ink truncate">
                                {skill.name}
                              </span>
                            </div>
                            {isComplete ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full border border-emerald-200 flex-shrink-0">
                                <Sparkles className="w-3 h-3" /> Done
                              </span>
                            ) : pct > 0 ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full border border-amber-200 flex-shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-full border border-gray-200 flex-shrink-0">
                                New
                              </span>
                            )}
                          </div>
                          
                          {/* Stats Row: Nodes + Progress */}
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <p className="text-[11px] text-[#9aa094] mb-1 font-medium">Nodes</p>
                              <p className="text-[13px] font-semibold text-site-ink">{done}/{total}</p>
                            </div>
                            <div>
                              <p className="text-[11px] text-[#9aa094] mb-1 font-medium">Progress</p>
                              <p className="text-[13px] font-semibold" style={{ color }}>{pct}%</p>
                            </div>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="h-[5px] bg-[#e8ece3] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" 
                              style={{ width: `${pct}%`, backgroundColor: color }} />
                          </div>
                        </>
                      );
                    }}
                    onRowClick={(skill) => navigate(`/skills/${skill._id}`)}
                    emptyMessage={statusFilter !== 'all' ? 'No matching skill maps' : 'No skill maps yet'}
                    emptyIcon={<MapPin className="w-7 h-7 text-gray-300" />}
                    emptyAction={statusFilter === 'all' ? (
                      <button onClick={() => navigate("/skills")} className="inline-flex items-center gap-1 text-xs text-sky-600 font-bold hover:underline mt-2">
                        Create skill map <ArrowUpRight className="w-3 h-3" />
                      </button>
                    ) : null}
                  />
                  {filteredSkills.length > 0 && (
                    <Pagination page={mapPage} setPage={setMapPage} totalPages={filteredMapPages} />
                  )}
                </>
              )}

              {/* Reflections tab */}
              {activeTab === 'reflections' && (
                <>
                  <DataTable
                    data={filteredReflections.slice((mapPage - 1) * MAPS_PER_PAGE, mapPage * MAPS_PER_PAGE)}
                    columns={[
                      {
                        key: 'date',
                        label: 'Date',
                        span: 3,
                        render: (reflection) => (
                          <span className="text-[12px] text-site-faint">
                            {new Date(reflection.createdAt).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}
                          </span>
                        )
                      },
                      {
                        key: 'mood',
                        label: 'Mood',
                        span: 2,
                        align: 'center',
                        render: (reflection) => {
                          const moods = {
                            Happy: { emoji: '😊', label: 'Happy', cls: 'text-emerald-700 bg-emerald-50' },
                            Neutral: { emoji: '😐', label: 'Neutral', cls: 'text-gray-600 bg-gray-100' },
                            Sad: { emoji: '😔', label: 'Struggling', cls: 'text-blue-700 bg-blue-50' },
                            Energized: { emoji: '⚡', label: 'Energized', cls: 'text-amber-700 bg-amber-50' },
                            Thoughtful: { emoji: '🧠', label: 'Thoughtful', cls: 'text-violet-700 bg-violet-50' }
                          };
                          const m = moods[reflection.mood] || { 
                            emoji: '—', 
                            label: reflection.mood || 'None', 
                            cls: 'text-gray-500 bg-gray-50' 
                          };
                          return (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${m.cls}`}>
                              {m.emoji} {m.label}
                            </span>
                          );
                        }
                      },
                      {
                        key: 'title',
                        label: 'Title',
                        span: 5,
                        render: (reflection) => (
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-site-ink truncate group-hover:text-sky-600 transition-colors">
                              {reflection.title || 'Untitled'}
                            </p>
                            <p className="text-[11px] text-site-faint truncate">
                              {reflection.content?.slice(0, 50)}{reflection.content?.length > 50 ? '...' : ''}
                            </p>
                          </div>
                        )
                      },
                      {
                        key: 'tags',
                        label: 'Tags',
                        span: 2,
                        align: 'right',
                        render: (reflection) => {
                          if (!reflection.tags || reflection.tags.length === 0) {
                            return <span className="text-[11px] text-site-faint">—</span>;
                          }
                          return (
                            <div className="flex flex-wrap gap-1 justify-end">
                              {reflection.tags.slice(0, 2).map((tag, idx) => (
                                <span key={idx} className="inline-flex px-2 py-0.5 bg-sky-100 text-sky-700 text-[9px] font-semibold rounded">
                                  {tag}
                                </span>
                              ))}
                              {reflection.tags.length > 2 && (
                                <span className="text-[9px] text-site-faint">+{reflection.tags.length - 2}</span>
                              )}
                            </div>
                          );
                        }
                      }
                    ]}
                    renderMobileCard={(reflection) => {
                      const moods = {
                        Happy: { emoji: '😊', label: 'Happy', cls: 'text-emerald-700 bg-emerald-50' },
                        Neutral: { emoji: '😐', label: 'Neutral', cls: 'text-gray-600 bg-gray-100' },
                        Sad: { emoji: '😔', label: 'Struggling', cls: 'text-blue-700 bg-blue-50' },
                        Energized: { emoji: '⚡', label: 'Energized', cls: 'text-amber-700 bg-amber-50' },
                        Thoughtful: { emoji: '🧠', label: 'Thoughtful', cls: 'text-violet-700 bg-violet-50' }
                      };
                      const m = moods[reflection.mood] || { 
                        emoji: '—', 
                        label: reflection.mood || 'None', 
                        cls: 'text-gray-500 bg-gray-50' 
                      };
                      
                      return (
                        <>
                          {/* Header Row: Date + Mood */}
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] text-site-faint font-medium">
                              {new Date(reflection.createdAt).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${m.cls}`}>
                              {m.emoji} {m.label}
                            </span>
                          </div>
                          
                          {/* Title */}
                          <div className="mb-3">
                            <p className="text-[13px] font-semibold text-site-ink mb-1">
                              {reflection.title || 'Untitled'}
                            </p>
                            <p className="text-[11px] text-site-faint line-clamp-2">
                              {reflection.content || 'No content'}
                            </p>
                          </div>
                          
                          {/* Tags Row */}
                          {reflection.tags && reflection.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {reflection.tags.map((tag, idx) => (
                                <span key={idx} className="inline-flex px-2 py-0.5 bg-sky-100 text-sky-700 text-[9px] font-semibold rounded">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </>
                      );
                    }}
                    onRowClick={() => navigate("/reflect")}
                    emptyMessage={moodFilter !== 'all' ? 'No matching reflections' : 'No reflections yet'}
                    emptyIcon={<Award className="w-7 h-7 text-gray-300" />}
                    emptyAction={moodFilter === 'all' ? (
                      <button onClick={() => navigate("/reflect")} className="inline-flex items-center gap-1 text-xs text-sky-600 font-bold hover:underline mt-2">
                        Write a reflection <ArrowUpRight className="w-3 h-3" />
                      </button>
                    ) : null}
                  />
                  {filteredReflections.length > 0 && (
                    <Pagination page={mapPage} setPage={setMapPage} totalPages={Math.ceil(filteredReflections.length / MAPS_PER_PAGE)} />
                  )}
                </>
              )}

              {/* Sessions tab */}
              {activeTab === 'sessions' && (
                <>
                  <DataTable
                    data={filteredSessions.slice((mapPage - 1) * MAPS_PER_PAGE, mapPage * MAPS_PER_PAGE)}
                    columns={[
                      {
                        key: 'date',
                        label: 'Date',
                        span: 3,
                        render: (session) => (
                          <span className="text-[12px] text-site-faint">
                            {new Date(session.date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}
                          </span>
                        )
                      },
                      {
                        key: 'skill',
                        label: 'Skill',
                        span: 4,
                        render: (session) => (
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-[#f0f2eb] flex items-center justify-center flex-shrink-0">
                              <span className="text-[#2e5023] text-[11px] font-bold">
                                {session.skillName?.charAt(0).toUpperCase() || 'F'}
                              </span>
                            </div>
                            <span className="text-[13px] font-semibold text-site-ink truncate group-hover:text-sky-600 transition-colors">
                              {session.skillName || 'Free Practice'}
                            </span>
                          </div>
                        )
                      },
                      {
                        key: 'duration',
                        label: 'Duration',
                        span: 2,
                        align: 'center',
                        render: (session) => (
                          <span className="text-[12px] text-site-muted font-semibold">
                            {session.minutesPracticed}min
                          </span>
                        )
                      },
                      {
                        key: 'xp',
                        label: 'XP',
                        span: 3,
                        align: 'right',
                        render: (session) => {
                          const xpEarned = session.xpEarned || 0;
                          return (
                            <div className="flex items-center justify-end gap-1.5">
                              <Zap className="w-3.5 h-3.5 text-amber-500" />
                              <span className="text-[12px] font-bold text-amber-600">
                                +{xpEarned}
                              </span>
                            </div>
                          );
                        }
                      }
                    ]}
                    renderMobileCard={(session) => {
                      const isSkillMap = !!session.skillId;
                      const xpEarned = session.xpEarned || 0;
                      
                      return (
                        <>
                          {/* Header Row: Skill + Date */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-[#f0f2eb] flex items-center justify-center flex-shrink-0">
                                <span className="text-[#2e5023] text-[11px] font-bold">
                                  {session.skillName?.charAt(0).toUpperCase() || 'F'}
                                </span>
                              </div>
                              <span className="text-[13px] font-semibold text-site-ink truncate">
                                {session.skillName || 'Free Practice'}
                              </span>
                            </div>
                            <span className="text-[11px] text-site-faint font-medium flex-shrink-0 ml-2">
                              {new Date(session.date).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </span>
                          </div>
                          
                          {/* Stats Row: Duration + XP */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-[11px] text-[#9aa094] mb-1 font-medium">Duration</p>
                              <p className="text-[13px] font-semibold text-site-ink">
                                {session.minutesPracticed} min
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] text-[#9aa094] mb-1 font-medium">XP Earned</p>
                              <div className="flex items-center gap-1.5">
                                <Zap className="w-3.5 h-3.5 text-amber-500" />
                                <p className="text-[13px] font-semibold text-amber-600">
                                  +{xpEarned}
                                </p>
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    }}
                    onRowClick={() => navigate("/log-practice")}
                    emptyMessage={sessionTypeFilter !== 'all' ? 'No matching sessions' : 'No sessions yet'}
                    emptyIcon={<Clock className="w-7 h-7 text-gray-300" />}
                    emptyAction={sessionTypeFilter === 'all' ? (
                      <button onClick={() => navigate("/log-practice")} className="inline-flex items-center gap-1 text-xs text-sky-600 font-bold hover:underline mt-2">
                        Log a session <ArrowUpRight className="w-3 h-3" />
                      </button>
                    ) : null}
                  />
                  {filteredSessions.length > 0 && (
                    <Pagination page={mapPage} setPage={setMapPage} totalPages={Math.ceil(filteredSessions.length / MAPS_PER_PAGE)} />
                  )}
                </>
              )}
            </div>
          </div>  {/* end Result Card */}

        </div>
      </div>
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
    <div className="relative w-full h-full flex-shrink-0">
      <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }} preserveAspectRatio="xMidYMid meet">
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
        <span className="text-base sm:text-lg font-bold text-site-ink leading-none">{centerText}</span>
        {centerSub && <span className="text-[8px] sm:text-[9px] text-site-faint mt-0.5">{centerSub}</span>}
      </div>
    </div>
  );
});

const LegendRow = memo(function LegendRow({ color, label, value, hidden }) {
  if (hidden) return null;
  return (
    <div className="flex items-center gap-2 sm:gap-2.5">
      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[3px] flex-shrink-0" style={{ backgroundColor: color }} />
      <span className="text-xs sm:text-[13px] text-[#565c52] flex-1 truncate">{label}</span>
      <span className="text-xs sm:text-[13px] font-bold text-site-ink tabular-nums">{value}</span>
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
