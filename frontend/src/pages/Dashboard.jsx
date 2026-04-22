import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock, ChevronRight, ChevronLeft, Zap, Award, Target,
  Flame, Trophy, Play, BookOpen, MapPin, ArrowRight,
} from "lucide-react";
import { practiceAPI, skillsAPI, xpAPI } from "../api/client.ts";
import Sidebar from "../components/Sidebar";
import { Avatar } from "../components/Avatar";
import { useAuth } from "../useAuth";

const MAPS_PER_PAGE = 6;

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
  const [mapPage, setMapPage] = useState(1);

  const fetchDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const [statsRes, practicesRes, skillsRes] = await Promise.all([
        practiceAPI.getStats().catch(() => ({ data: { summary: { totalMinutes: 0, totalSessions: 0 }, topSkills: [] } })),
        practiceAPI.getPractices({ limit: 5 }).catch(() => ({ data: { practices: [] } })),
        skillsAPI.getAll().catch(() => ({ data: { skills: [] } })),
      ]);
      setStats(statsRes.data);
      setPractices(practicesRes.data.practices || []);
      setSkills(skillsRes.data.skills || []);
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

  // Derived
  const summary = stats?.summary || {};
  const totalHours = Math.floor((summary.totalMinutes || 0) / 60);
  const totalMins = (summary.totalMinutes || 0) % 60;
  const totalSessions = summary.totalSessions || 0;
  const today = new Date().toDateString();
  const todayPractices = practices.filter(p => new Date(p.date).toDateString() === today);
  const todayMinutes = todayPractices.reduce((s, p) => s + p.minutesPracticed, 0);
  const totalNodes = skills.reduce((s, sk) => s + (sk.nodeCount || 0), 0);
  const completedNodes = skills.reduce((s, sk) => s + (sk.completedNodes || 0), 0);
  const completedMaps = skills.filter(sk => sk.completionPercentage === 100).length;
  const inProgressMaps = skills.filter(sk => (sk.completionPercentage || 0) > 0 && (sk.completionPercentage || 0) < 100).length;
  const overallPct = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;
  const displayName = user?.displayName || user?.email?.split("@")[0] || "Learner";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const xp = xpProfile || {};
  const streak = xp.currentStreak || 0;
  const weeklyXp = xp.weeklyXp || 0;
  const totalXp = xp.totalXp || 0;
  const tier = xp.leagueTier || "Newcomer";

  // Pagination
  const unlockedSkills = skills.filter(s => !s.locked);
  const totalMapPages = Math.ceil(unlockedSkills.length / MAPS_PER_PAGE);
  const pagedSkills = unlockedSkills.slice((mapPage - 1) * MAPS_PER_PAGE, mapPage * MAPS_PER_PAGE);

  const timeAgo = (d) => {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(diff / 3600000);
    if (h < 24) return `${h}h ago`;
    const dy = Math.floor(diff / 86400000);
    if (dy < 7) return `${dy}d ago`;
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-site-bg">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-site-accent border-t-transparent rounded-full animate-spin" />
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-site-bg">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100">
            {error} <button onClick={fetchDashboard} className="ml-2 underline">Retry</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-site-bg">
      <Sidebar />
      <main className="flex-1 overflow-y-auto w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

          {/* ─── Profile Card ─── */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              {/* Avatar + Name */}
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="relative flex-shrink-0">
                  <Avatar
                    photoURL={user?.photoURL}
                    displayName={user?.displayName}
                    email={user?.email}
                    size="lg"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-400 border-2 border-white rounded-full" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 font-medium">{greeting}</p>
                  <h1 className="text-xl sm:text-2xl font-bold text-site-ink truncate">{displayName}</h1>
                  <p className="text-sm text-site-muted truncate">{user?.email}</p>
                </div>
              </div>

              {/* XP Stats */}
              {!xpLoading && !xpError && (
                <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <Flame className="w-3.5 h-3.5 text-orange-400" />
                    </div>
                    <p className="text-lg font-bold text-site-ink">{streak}d</p>
                    <p className="text-[10px] text-gray-400 font-medium">Streak</p>
                  </div>
                  <div className="w-px h-10 bg-gray-100" />
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <p className="text-lg font-bold text-site-ink">{weeklyXp}</p>
                    <p className="text-[10px] text-gray-400 font-medium">Weekly XP</p>
                  </div>
                  <div className="w-px h-10 bg-gray-100" />
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <Trophy className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                    <p className="text-lg font-bold text-site-ink">{totalXp.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400 font-medium">Total XP</p>
                  </div>
                  <div className="w-px h-10 bg-gray-100" />
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <Award className="w-3.5 h-3.5 text-site-accent" />
                    </div>
                    <p className="text-lg font-bold text-site-ink">{tier}</p>
                    <p className="text-[10px] text-gray-400 font-medium">League</p>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 mt-5 pt-5 border-t border-gray-100">
              <button onClick={() => navigate("/log-practice")}
                className="flex items-center gap-2 px-4 py-2 bg-site-accent text-white rounded-lg text-sm font-medium hover:bg-site-accent-hover transition-colors">
                <Play className="w-3.5 h-3.5" /> Log Practice
              </button>
              <button onClick={() => navigate("/skills")}
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors border border-gray-200">
                <BookOpen className="w-3.5 h-3.5" /> Skill Maps
              </button>
              <button onClick={() => navigate("/reflect")}
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors border border-gray-200">
                Reflect
              </button>
            </div>
          </div>

          {/* ─── Stats Row ─── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard icon={Clock} label="Total Time" value={`${totalHours}h ${totalMins}m`} />
            <StatCard icon={Zap} label="Sessions" value={totalSessions} />
            <StatCard icon={Target} label="Nodes Done" value={`${completedNodes}/${totalNodes}`} />
            <StatCard icon={Award} label="Progress" value={`${overallPct}%`} />
          </div>

          {/* ─── Today ─── */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5 mb-6">
            <h2 className="text-base font-bold text-site-ink mb-4">Today's Activity</h2>
            <div className="flex items-center divide-x divide-gray-100">
              <div className="flex-1 text-center px-4">
                <p className="text-2xl font-bold text-site-ink">
                  {todayMinutes >= 60 ? `${Math.floor(todayMinutes / 60)}h ${todayMinutes % 60}m` : `${todayMinutes}m`}
                </p>
                <p className="text-xs text-gray-400 mt-1">Time</p>
              </div>
              <div className="flex-1 text-center px-4">
                <p className="text-2xl font-bold text-site-ink">{todayPractices.length}</p>
                <p className="text-xs text-gray-400 mt-1">Sessions</p>
              </div>
              <div className="flex-1 text-center px-4">
                <p className="text-2xl font-bold text-site-ink">{todayPractices.filter(p => p.notes?.trim()).length}</p>
                <p className="text-xs text-gray-400 mt-1">Notes</p>
              </div>
            </div>
          </div>

          {/* ─── Skill Maps with Pagination ─── */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-site-ink">Skill Maps</h2>
              {unlockedSkills.length > 0 && (
                <span className="text-xs text-gray-400">{completedMaps} completed · {inProgressMaps} in progress</span>
              )}
            </div>

            {unlockedSkills.length === 0 ? (
              <div className="text-center py-10">
                <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-400 mb-3">No skill maps yet</p>
                <button onClick={() => navigate("/skills")} className="text-sm text-site-accent font-medium hover:underline">
                  Create your first skill map
                </button>
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {pagedSkills.map(skill => {
                    const pct = skill.completionPercentage || 0;
                    const done = skill.completedNodes || 0;
                    const total = skill.nodeCount || 0;
                    const color = skill.color || "#2e5023";
                    return (
                      <div key={skill._id} onClick={() => navigate(`/skills/${skill._id}`)}
                        className="p-4 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer group">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: color }}>
                            {skill.name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-site-ink truncate">{skill.name}</h4>
                            <p className="text-xs text-gray-400">{done}/{total} nodes</p>
                          </div>
                          <span className="text-sm font-bold text-gray-900">{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalMapPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-5 pt-4 border-t border-gray-50">
                    <button onClick={() => setMapPage(p => Math.max(1, p - 1))} disabled={mapPage === 1}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      <ChevronLeft className="w-3.5 h-3.5" /> Prev
                    </button>
                    {Array.from({ length: totalMapPages }, (_, i) => (
                      <button key={i} onClick={() => setMapPage(i + 1)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                          mapPage === i + 1 ? 'bg-site-accent text-white' : 'text-gray-500 hover:bg-gray-50'
                        }`}>
                        {i + 1}
                      </button>
                    ))}
                    <button onClick={() => setMapPage(p => Math.min(totalMapPages, p + 1))} disabled={mapPage >= totalMapPages}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ─── Recent Sessions + Top Maps (3 items each, no view all) ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recent Sessions — max 3 */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
              <h2 className="text-base font-bold text-site-ink mb-4">Recent Sessions</h2>
              {practices.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-7 h-7 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No sessions yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {practices.slice(0, 3).map(p => (
                    <div key={p._id} onClick={() => navigate("/log-practice")}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group">
                      <div className="w-8 h-8 rounded-lg bg-site-soft flex items-center justify-center flex-shrink-0">
                        <span className="text-site-accent text-xs font-bold">{p.skillName?.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-site-ink truncate">{p.skillName}</p>
                        <p className="text-xs text-gray-400">{p.minutesPracticed}min · {timeAgo(p.date)}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0 transition-colors" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Skill Maps — max 3, no view all */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
              <h2 className="text-base font-bold text-site-ink mb-4">Top Skill Maps</h2>
              {skills.length === 0 ? (
                <div className="text-center py-8">
                  <Award className="w-7 h-7 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No skill maps yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {[...skills].filter(s => !s.locked)
                    .sort((a, b) => (b.completionPercentage || 0) - (a.completionPercentage || 0))
                    .slice(0, 3)
                    .map((skill, i) => {
                      const pct = skill.completionPercentage || 0;
                      const color = skill.color || "#2e5023";
                      return (
                        <div key={skill._id} onClick={() => navigate(`/skills/${skill._id}`)}
                          className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                          <span className="w-6 text-xs font-bold text-gray-400 text-center flex-shrink-0">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-site-ink truncate pr-2">{skill.name}</span>
                              <span className="text-xs font-bold text-gray-500 flex-shrink-0">{pct}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${pct}%`, backgroundColor: color }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-site-soft flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-site-accent" />
        </div>
        <div>
          <p className="text-lg font-bold text-site-ink">{value}</p>
          <p className="text-xs text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  );
}
