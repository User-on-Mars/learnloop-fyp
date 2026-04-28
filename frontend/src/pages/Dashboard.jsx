import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock, ChevronRight, ChevronLeft, Zap, Award, Target,
  Flame, Trophy, Play, MapPin, TrendingUp,
  Sparkles, ArrowUpRight, BarChart3,
} from "lucide-react";
import { practiceAPI, skillsAPI, xpAPI } from "../api/client.ts";
import client from "../api/client.ts";
import Sidebar from "../components/Sidebar";
import { SkillIcon } from "../components/IconPicker";
import { useAuth } from "../useAuth";

const MAPS_PER_PAGE = 5;

function DashboardSkeleton() {
  return (
    <>
      <Sidebar />
      <div className="pt-16 md:pl-14 min-h-screen bg-[#eef0ea]">
        <div className="px-4 sm:px-6 py-4 space-y-3">
          <div className="h-12 rounded-xl bg-white/60 animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="h-52 rounded-xl bg-white/60 animate-pulse" />
            <div className="h-52 rounded-xl bg-white/60 animate-pulse" />
          </div>
          <div className="h-64 rounded-xl bg-white/60 animate-pulse" />
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
        <div className="pt-16 md:pl-14 min-h-screen bg-[#eef0ea] flex items-center justify-center">
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
      <div className="pt-16 md:pl-14 min-h-screen bg-[#eef0ea]">
        <div className="px-4 sm:px-6 py-4 space-y-3">

          {/* ═══ 1. Greeting bar ═══ */}
          <div className="px-1 pt-4 pb-5 mb-6 flex items-center justify-between border-b border-[#dde1d6]">
            <div>
              <h1 className="text-xl font-bold text-site-ink leading-tight">{greeting}, {displayName}</h1>
              <p className="text-sm text-site-muted mt-0.5">Here's your learning overview</p>
            </div>
            <div className="flex items-center gap-2.5">
              <button onClick={() => navigate("/log-practice")}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-[#2e5023] rounded-lg text-[13px] font-semibold hover:bg-[#f5f7f2] transition-colors border border-[#d4dbc9] active:scale-[0.97]">
                <Play className="w-4 h-4" /> Log Practice
              </button>
              <button onClick={() => navigate("/roomspace")}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-[#2e5023] rounded-lg text-[13px] font-semibold hover:bg-[#f5f7f2] transition-colors border border-[#d4dbc9]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                RoomSpace
              </button>
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
          <h2 className="text-xl font-bold text-site-ink mt-2">My Learning</h2>

          <div className="bg-white rounded-2xl border border-[#e2e6dc]">
            {/* Tabs row */}
            <div className="px-6 pt-5 flex items-center justify-between border-b border-[#e8ece3]">
              <div className="flex gap-6">
                {[
                  { id: 'skills', label: 'Skill Maps', count: unlockedSkills.length },
                  { id: 'reflections', label: 'Reflections', count: reflections.length },
                  { id: 'sessions', label: 'Sessions', count: practices.length },
                ].map(tab => (
                  <button key={tab.id} onClick={() => { setActiveTab(tab.id); setMapPage(1); setStatusFilter('all'); }}
                    className={`pb-3.5 text-[13px] font-semibold border-b-2 transition-colors ${
                      activeTab === tab.id ? 'border-[#2e5023] text-[#2e5023]' : 'border-transparent text-[#9aa094] hover:text-[#565c52]'
                    }`}>
                    {tab.label} <span className="text-[11px] font-normal text-site-faint ml-0.5">({tab.count})</span>
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-site-faint pb-3.5">
                {(() => {
                  const list = activeTab === 'skills' ? filteredSkills : activeTab === 'reflections' ? reflections : practices;
                  if (list.length === 0) return '';
                  return `Showing ${(mapPage - 1) * MAPS_PER_PAGE + 1} - ${Math.min(mapPage * MAPS_PER_PAGE, list.length)} of ${list.length}`;
                })()}
              </span>
            </div>

            {/* Filter row */}
            {activeTab === 'skills' && (
              <div className="px-6 py-3.5 flex items-center gap-2.5 border-b border-[#f0f2eb]">
                <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setMapPage(1); }}
                  className="px-3 py-1.5 border border-[#dde1d6] rounded-lg text-[12px] text-site-ink bg-white focus:outline-none focus:border-[#2e5023]/40 min-w-[140px]">
                  <option value="all">All Status</option>
                  <option value="done">Completed</option>
                  <option value="active">In Progress</option>
                  <option value="new">Not Started</option>
                </select>
                {statusFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#f0f2eb] border border-[#dde1d6] rounded-lg text-[11px] text-site-ink font-medium">
                    {statusFilter === 'done' ? 'Completed' : statusFilter === 'active' ? 'In Progress' : 'Not Started'}
                    <button onClick={() => { setStatusFilter('all'); setMapPage(1); }} className="text-site-faint hover:text-red-500 ml-0.5 text-sm leading-none">×</button>
                  </span>
                )}
                <button onClick={() => setMapPage(1)}
                  className="px-4 py-1.5 bg-[#2e5023] text-white text-[11px] font-semibold rounded-lg hover:bg-[#3a6b2e] transition-colors">
                  Filter
                </button>
              </div>
            )}

            {/* Tab content */}
            <div className="px-6 pb-6 pt-2">
              {/* Skill Maps tab */}
              {activeTab === 'skills' && (
                filteredSkills.length === 0 ? (
                  <div className="text-center py-10">
                    <MapPin className="w-7 h-7 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-site-muted">{statusFilter !== 'all' ? 'No matching skill maps' : 'No skill maps yet'}</p>
                    {statusFilter === 'all' && (
                      <button onClick={() => navigate("/skills")} className="inline-flex items-center gap-1 text-xs text-[#2e5023] font-bold hover:underline mt-2">
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
                      {pagedSkills.map((skill, i) => {                        const pct = skill.completionPercentage || 0;
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
                              <span className="text-[13px] font-semibold text-site-ink truncate group-hover:text-[#2e5023] transition-colors">{skill.name}</span>
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
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full">
                                  <Sparkles className="w-2.5 h-2.5" /> Completed
                                </span>
                              ) : pct > 0 ? (
                                <span className="inline-flex px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full">In Progress</span>
                              ) : (
                                <span className="inline-flex px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded-full">Not Started</span>
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
                reflections.length === 0 ? (
                  <div className="text-center py-10">
                    <Award className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-site-muted">No reflections yet</p>
                    <button onClick={() => navigate("/reflect")} className="inline-flex items-center gap-1 text-xs text-[#2e5023] font-bold hover:underline mt-2">
                      Write a reflection <ArrowUpRight className="w-3 h-3" />
                    </button>
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
                      {reflections.slice((mapPage-1)*MAPS_PER_PAGE, mapPage*MAPS_PER_PAGE).map((r, i) => {
                        const moods = { Happy: { emoji: '😊', label: 'Happy', cls: 'text-emerald-700 bg-emerald-50' }, Neutral: { emoji: '😐', label: 'Neutral', cls: 'text-gray-600 bg-gray-100' }, Sad: { emoji: '😔', label: 'Struggling', cls: 'text-blue-700 bg-blue-50' }, Energized: { emoji: '⚡', label: 'Energized', cls: 'text-amber-700 bg-amber-50' }, Thoughtful: { emoji: '🧠', label: 'Thoughtful', cls: 'text-violet-700 bg-violet-50' } };
                        const m = moods[r.mood] || { emoji: '—', label: r.mood || 'None', cls: 'text-gray-500 bg-gray-50' };
                        return (
                          <div key={r._id} onClick={() => navigate("/reflect")}
                            className="grid grid-cols-12 gap-3 items-center px-3 py-3.5 hover:bg-[#f8faf6] cursor-pointer transition-colors group">
                            <span className="col-span-1 text-[12px] text-site-faint font-medium">{(mapPage-1)*MAPS_PER_PAGE + i + 1}</span>
                            <div className="col-span-4 min-w-0">
                              <p className="text-[13px] font-semibold text-site-ink truncate group-hover:text-[#2e5023] transition-colors">{r.title || 'Untitled'}</p>
                              <p className="text-[11px] text-site-faint truncate">{r.content?.slice(0, 50)}{r.content?.length > 50 ? '...' : ''}</p>
                            </div>
                            <div className="col-span-2 flex justify-center">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${m.cls}`}>
                                {m.emoji} {m.label}
                              </span>
                            </div>
                            <span className="col-span-3 text-[12px] text-site-faint">{new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            <div className="col-span-2 text-right">
                              <span className="inline-flex px-3 py-1 bg-[#2e5023] text-white text-[10px] font-bold rounded-lg">View</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <Pagination page={mapPage} setPage={setMapPage} totalPages={Math.ceil(reflections.length / MAPS_PER_PAGE)} />
                  </>
                )
              )}

              {/* Sessions tab */}
              {activeTab === 'sessions' && (
                practices.length === 0 ? (
                  <div className="text-center py-10">
                    <Clock className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-site-muted">No sessions yet</p>
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
                      {practices.slice((mapPage-1)*MAPS_PER_PAGE, mapPage*MAPS_PER_PAGE).map((p, i) => {
                        const isSkillMap = !!p.skillId;
                        return (
                        <div key={p._id} onClick={() => navigate("/log-practice")}
                          className="grid grid-cols-12 gap-2 items-center px-3 py-3.5 hover:bg-[#f8faf6] cursor-pointer transition-colors group">
                          <span className="col-span-1 text-[12px] text-site-faint font-medium">{(mapPage-1)*MAPS_PER_PAGE + i + 1}</span>
                          <div className="col-span-3 flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-[#f0f2eb] flex items-center justify-center flex-shrink-0">
                              <span className="text-[#2e5023] text-[11px] font-bold">{p.skillName?.charAt(0).toUpperCase()}</span>
                            </div>
                            <span className="text-[13px] font-semibold text-site-ink truncate group-hover:text-[#2e5023] transition-colors">{p.skillName}</span>
                          </div>
                          <div className="col-span-2 text-center">
                            <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded ${isSkillMap ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                              {isSkillMap ? 'Skill Map' : 'Free'}
                            </span>
                          </div>
                          <span className="col-span-2 text-center text-[12px] text-site-muted">{p.minutesPracticed}min</span>
                          <span className="col-span-2 text-[12px] text-site-faint">{timeAgo(p.date)}</span>
                          <div className="col-span-2 text-right">
                            <span className="inline-flex px-3 py-1 bg-[#2e5023] text-white text-[10px] font-bold rounded-lg">View Details</span>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                    <Pagination page={mapPage} setPage={setMapPage} totalPages={Math.ceil(practices.length / MAPS_PER_PAGE)} />
                  </>
                )
              )}
            </div>
          </div>

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
