import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  ChevronRight,
  Zap,
  Award,
  Target,
  TrendingUp,
  Plus,
  MapPin,
} from "lucide-react";
import { practiceAPI, skillsAPI, xpAPI } from "../api/client";
import Sidebar from "../components/Sidebar";
import DashboardGreeting from "../components/DashboardGreeting";
import XpProfileCard from "../components/XpProfileCard";
import LeagueInfo from "../components/admin/LeagueInfo";

export default function Dashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [practices, setPractices] = useState([]);
  const [skills, setSkills] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [xpProfile, setXpProfile] = useState(null);
  const [xpLoading, setXpLoading] = useState(true);
  const [xpError, setXpError] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");

      const [statsRes, practicesRes, skillsRes] = await Promise.all([
        practiceAPI.getStats().catch(() => ({
          data: {
            summary: { totalMinutes: 0, totalSessions: 0, weeklyMinutes: 0 },
            topSkills: [],
          },
        })),
        practiceAPI.getPractices({ limit: 5 }).catch(() => ({ data: { practices: [] } })),
        skillsAPI.getAll().catch(() => ({ data: { skills: [] } })),
      ]);

      setStats(statsRes.data);
      setPractices(practicesRes.data.practices || []);
      setSkills(skillsRes.data.skills || []);

      // Fetch XP profile separately so failures don't block the dashboard
      setXpLoading(true);
      setXpError(false);
      try {
        const xpRes = await xpAPI.getProfile();
        setXpProfile(xpRes.data);
      } catch {
        setXpError(true);
      } finally {
        setXpLoading(false);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Refresh on tab focus
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) fetchDashboard();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchDashboard]);

  // --- derived data ---
  const summary = stats?.summary || {};
  const topSkills = stats?.topSkills || [];
  const totalHours = Math.floor((summary.totalMinutes || 0) / 60);
  const totalMins = (summary.totalMinutes || 0) % 60;
  const totalSessions = summary.totalSessions || 0;

  // today's activity
  const today = new Date().toDateString();
  const todayPractices = practices.filter(
    (p) => new Date(p.date).toDateString() === today
  );
  const todayMinutes = todayPractices.reduce((s, p) => s + p.minutesPracticed, 0);

  // skill map stats
  const totalNodes = skills.reduce((s, sk) => s + (sk.nodeCount || 0), 0);
  const completedNodes = skills.reduce((s, sk) => s + (sk.completedNodes || 0), 0);
  const completedSkillMaps = skills.filter(sk => sk.completionPercentage === 100).length;
  const remainingSkillMaps = skills.length - completedSkillMaps;
  const overallProgress =
    totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;

  // relative time helper
  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(diff / 86400000);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // --- loading / error states ---
  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-site-bg">
        <Sidebar />
        <main className="flex-1 overflow-y-auto w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-site-accent mx-auto mb-4" />
                <p className="text-site-muted">Loading dashboard...</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-site-bg">
        <Sidebar />
        <main className="flex-1 overflow-y-auto w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-red-50 border border-red-300 text-red-700 p-4 rounded-lg">
              <p>{error}</p>
              <button onClick={fetchDashboard} className="mt-2 text-sm underline hover:no-underline">
                Try again
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // --- main render ---
  return (
    <div className="flex min-h-screen bg-site-bg">
      <Sidebar />

      <main className="flex-1 overflow-y-auto w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <DashboardGreeting />
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => navigate("/log-practice")}
                className="flex items-center gap-2 px-4 py-2.5 bg-site-accent text-white rounded-lg font-medium hover:bg-site-accent-hover transition-all shadow-md text-sm"
              >
                <Clock className="w-4 h-4" />
                Log Practice
              </button>
              <button
                onClick={() => navigate("/skills")}
                className="flex items-center gap-2 px-4 py-2.5 border border-site-border text-site-ink rounded-lg font-medium hover:bg-site-soft transition-all text-sm"
              >
                <Plus className="w-4 h-4" />
                New Skill Map
              </button>
            </div>
          </div>

          {/* ── Quick Stats ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <QuickStat icon={Clock} label="Total Time" value={`${totalHours}h ${totalMins}m`} />
            <QuickStat icon={Zap} label="Sessions" value={totalSessions} />
            <QuickStat icon={Award} label="Skill Maps" value={skills.length} />
            <QuickStat icon={Target} label="Nodes Done" value={`${completedNodes}/${totalNodes}`} />
          </div>

          {/* ── XP Profile ── */}
          <div className="mb-6">
            <XpProfileCard
              profile={xpProfile}
              isLoading={xpLoading}
              error={xpError}
              onRetry={async () => {
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
              }}
            />
          </div>

          {/* ── League Info ── */}
          {xpProfile && (
            <div className="mb-6 bg-site-surface rounded-xl shadow-sm border border-site-border p-5">
              <h3 className="text-base font-semibold text-site-ink mb-4">League Progress</h3>
              <LeagueInfo userXp={xpProfile.totalXp || 0} weeklyXp={xpProfile.weeklyXp || 0} />
            </div>
          )}

          {/* ── Today's Activity + Overall Progress ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Today */}
            <div className="bg-site-surface rounded-xl shadow-sm border border-site-border p-5 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-site-ink">Today's Activity</h3>
                {todayMinutes > 0 && (
                  <span className="flex items-center gap-1 text-xs text-site-accent font-medium">
                    <TrendingUp className="w-3.5 h-3.5" /> Active
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3 flex-1">
                <div className="text-center p-3 bg-site-bg rounded-lg flex flex-col items-center justify-center">
                  <p className="text-xl font-bold text-site-ink">
                    {todayMinutes >= 60 ? `${Math.floor(todayMinutes / 60)}h ${todayMinutes % 60}m` : `${todayMinutes}m`}
                  </p>
                  <p className="text-xs text-site-faint mt-1">Time</p>
                </div>
                <div className="text-center p-3 bg-site-bg rounded-lg flex flex-col items-center justify-center">
                  <p className="text-xl font-bold text-site-ink">{todayPractices.length}</p>
                  <p className="text-xs text-site-faint mt-1">Sessions</p>
                </div>
                <div className="text-center p-3 bg-site-bg rounded-lg flex flex-col items-center justify-center">
                  <p className="text-xl font-bold text-site-ink">
                    {todayPractices.filter((p) => p.notes?.trim()).length}
                  </p>
                  <p className="text-xs text-site-faint mt-1">Notes</p>
                </div>
              </div>
              <button
                onClick={() => navigate("/log-practice")}
                className="mt-4 w-full py-2.5 bg-site-accent text-white rounded-lg font-medium hover:bg-site-accent-hover transition-colors text-sm"
              >
                Start Practice
              </button>
            </div>

            {/* Overall Progress */}
            <div className="bg-site-surface rounded-xl shadow-sm border border-site-border p-5">
              <h3 className="text-base font-semibold text-site-ink mb-4">Overall Progress</h3>
              <div className="flex items-center gap-5 mb-5">
                {/* Progress ring */}
                <div className="relative w-28 h-28 flex-shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" stroke="#e2e8f0" strokeWidth="8" fill="none" />
                    <circle
                      cx="50" cy="50" r="42"
                      stroke="var(--site-accent, #2e5023)"
                      strokeWidth="8" fill="none"
                      strokeDasharray={2 * Math.PI * 42}
                      strokeDashoffset={2 * Math.PI * 42 * (1 - overallProgress / 100)}
                      strokeLinecap="round"
                      className="transition-all duration-700"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold text-site-accent">{overallProgress}%</span>
                  </div>
                </div>
                {/* Status boxes */}
                <div className="flex-1 grid grid-cols-1 gap-2">
                  <div className="flex items-center gap-3 bg-site-soft rounded-lg px-3 py-2.5">
                    <div className="w-3 h-3 rounded-full bg-site-accent flex-shrink-0" />
                    <span className="text-xs text-site-muted flex-1">Skill Maps</span>
                    <span className="text-sm font-bold text-site-ink">{skills.length}</span>
                  </div>
                  <div className="flex items-center gap-3 bg-green-50 rounded-lg px-3 py-2.5">
                    <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
                    <span className="text-xs text-site-muted flex-1">Completed</span>
                    <span className="text-sm font-bold text-green-700">{completedSkillMaps}</span>
                  </div>
                  <div className="flex items-center gap-3 bg-amber-50 rounded-lg px-3 py-2.5">
                    <div className="w-3 h-3 rounded-full bg-amber-400 flex-shrink-0" />
                    <span className="text-xs text-site-muted flex-1">Remaining</span>
                    <span className="text-sm font-bold text-amber-700">{remainingSkillMaps}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate("/skills")}
                className="w-full py-2.5 bg-site-accent text-white rounded-lg font-medium hover:bg-site-accent-hover transition-colors text-sm"
              >
                View Skill Maps
              </button>
            </div>
          </div>

          {/* ── Skill Maps Overview ── */}
          <div className="bg-site-surface rounded-xl shadow-sm border border-site-border p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-site-ink">Your Skill Maps</h3>
              <button
                onClick={() => navigate("/skills")}
                className="text-sm text-site-accent hover:text-site-accent-hover font-medium"
              >
                View all
              </button>
            </div>

            {skills.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="w-10 h-10 text-site-faint mx-auto mb-3" />
                <p className="text-site-muted mb-3">No skill maps yet</p>
                <button
                  onClick={() => navigate("/skills")}
                  className="text-sm text-site-accent font-medium hover:text-site-accent-hover"
                >
                  Create your first skill map →
                </button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {skills.slice(0, 6).map((skill) => {
                  const pct = skill.completionPercentage || 0;
                  const done = skill.completedNodes || 0;
                  const total = skill.nodeCount || 0;
                  return (
                    <div
                      key={skill._id}
                      onClick={() => navigate(`/skills/${skill._id}`)}
                      className="p-4 rounded-lg border border-site-border hover:border-site-accent hover:shadow-sm transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-site-ink truncate pr-2">{skill.name}</h4>
                        <ChevronRight className="w-4 h-4 text-site-faint group-hover:text-site-accent transition-colors flex-shrink-0" />
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 h-2 bg-site-bg rounded-full overflow-hidden">
                          <div
                            className="h-full bg-site-accent rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-site-accent">{pct}%</span>
                      </div>
                      <p className="text-xs text-site-faint">
                        {done}/{total} nodes completed
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Recent Sessions + Top Skills ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Recent Sessions */}
            <div className="bg-site-surface rounded-xl shadow-sm border border-site-border p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-site-ink">Recent Sessions</h3>
                <button
                  onClick={() => navigate("/log-practice")}
                  className="text-sm text-site-accent hover:text-site-accent-hover font-medium"
                >
                  View all
                </button>
              </div>

              {practices.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-10 h-10 text-site-faint mx-auto mb-3" />
                  <p className="text-site-muted mb-3">No practice sessions yet</p>
                  <button
                    onClick={() => navigate("/log-practice")}
                    className="text-sm text-site-accent font-medium"
                  >
                    Start your first session →
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {practices.map((p) => (
                    <div
                      key={p._id}
                      onClick={() => navigate("/log-practice")}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-site-bg transition-colors cursor-pointer group"
                    >
                      <div className="w-9 h-9 rounded-full bg-site-soft flex items-center justify-center flex-shrink-0">
                        <span className="text-site-accent font-semibold text-sm">
                          {p.skillName?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-site-ink truncate">{p.skillName}</p>
                        <p className="text-xs text-site-faint">
                          {p.minutesPracticed}min · {timeAgo(p.date)}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-site-faint group-hover:text-site-accent" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Skill Maps by Progress */}
            <div className="bg-site-surface rounded-xl shadow-sm border border-site-border p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-site-ink">Top Skill Maps</h3>
                <span className="text-xs text-site-faint">By progress</span>
              </div>

              {skills.length === 0 ? (
                <div className="text-center py-8">
                  <Award className="w-10 h-10 text-site-faint mx-auto mb-3" />
                  <p className="text-site-muted">Create skill maps to track your progress</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {skills
                    .sort((a, b) => (b.completionPercentage || 0) - (a.completionPercentage || 0))
                    .slice(0, 5)
                    .map((skill, i) => {
                      const pct = skill.completionPercentage || 0;
                      const done = skill.completedNodes || 0;
                      const total = skill.nodeCount || 0;
                      return (
                        <div 
                          key={skill._id}
                          onClick={() => navigate(`/skills/${skill._id}`)}
                          className="cursor-pointer hover:bg-site-bg rounded-lg p-2 -mx-2 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-site-ink truncate pr-2">{skill.name}</span>
                            <span className="text-xs text-site-faint flex-shrink-0">
                              {done}/{total} nodes
                            </span>
                          </div>
                          <div className="h-2 bg-site-bg rounded-full overflow-hidden">
                            <div
                              className="h-full bg-site-accent rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, opacity: 1 - i * 0.12 }}
                            />
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

/* ── Small reusable stat card ── */
function QuickStat({ icon: Icon, label, value }) {
  return (
    <div className="bg-site-surface rounded-xl p-4 border border-site-border shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-site-soft flex items-center justify-center">
          <Icon className="w-4 h-4 text-site-accent" />
        </div>
        <div>
          <p className="text-xl font-bold text-site-ink">{value}</p>
          <p className="text-xs text-site-faint">{label}</p>
        </div>
      </div>
    </div>
  );
}
