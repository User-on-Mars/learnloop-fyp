import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Clock,
  TrendingUp,
  Award,
  Target,
  ChevronLeft,
  ChevronRight,
  FileText,
  Flame,
} from "lucide-react";
import { practiceAPI } from "../services/api";
import api from "../services/api";
import Sidebar from "../components/Sidebar";

// Helper: get the Monday of the week containing `date`
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Helper: format date range like "Mar 24 – Mar 30, 2026"
function formatWeekRange(start) {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const opts = { month: "short", day: "numeric" };
  const startStr = start.toLocaleDateString("en-US", opts);
  const endStr = end.toLocaleDateString("en-US", { ...opts, year: "numeric" });
  return `${startStr} – ${endStr}`;
}

// Day labels
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function WeeklySummary() {
  const navigate = useNavigate();
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, -1 = last week, etc.
  const [practices, setPractices] = useState([]);
  const [reflections, setReflections] = useState([]);
  const [loading, setLoading] = useState(true);

  // Calculate the week start based on offset
  const weekStart = getWeekStart(new Date());
  weekStart.setDate(weekStart.getDate() + weekOffset * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [practiceRes, reflectionRes] = await Promise.all([
          practiceAPI.getPractices({ limit: 200 }).catch(() => ({ data: { practices: [] } })),
          api.get("/reflections").catch(() => ({ data: { reflections: [] } })),
        ]);

        setPractices(practiceRes.data.practices || practiceRes.data || []);
        setReflections(reflectionRes.data.reflections || reflectionRes.data || []);
      } catch (err) {
        console.error("Error fetching weekly data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [weekOffset]);

  // Filter data for the selected week
  const weekPractices = practices.filter((p) => {
    const d = new Date(p.date || p.createdAt);
    return d >= weekStart && d <= weekEnd;
  });

  const weekReflections = reflections.filter((r) => {
    const d = new Date(r.createdAt);
    return d >= weekStart && d <= weekEnd;
  });

  // Calculate stats
  const totalMinutes = weekPractices.reduce((sum, p) => sum + (p.minutesPracticed || 0), 0);
  const totalSessions = weekPractices.length;
  const totalReflections = weekReflections.length;

  // Most practiced skill
  const skillCounts = {};
  weekPractices.forEach((p) => {
    const name = p.skillName || "Unknown";
    if (!skillCounts[name]) skillCounts[name] = { minutes: 0, sessions: 0 };
    skillCounts[name].minutes += p.minutesPracticed || 0;
    skillCounts[name].sessions += 1;
  });
  const topSkill = Object.entries(skillCounts).sort((a, b) => b[1].minutes - a[1].minutes)[0];

  // Days active this week
  const activeDays = new Set(
    weekPractices.map((p) => new Date(p.date || p.createdAt).toDateString())
  ).size;

  // Daily breakdown for the mini heatmap
  const dailyMinutes = DAYS.map((_, i) => {
    const dayDate = new Date(weekStart);
    dayDate.setDate(dayDate.getDate() + i);
    const dayStr = dayDate.toDateString();
    return weekPractices
      .filter((p) => new Date(p.date || p.createdAt).toDateString() === dayStr)
      .reduce((sum, p) => sum + (p.minutesPracticed || 0), 0);
  });
  const maxDaily = Math.max(...dailyMinutes, 1);

  // Is this the current week?
  const isCurrentWeek = weekOffset === 0;

  // Improvement message
  const getImprovementMessage = () => {
    if (totalSessions === 0) return "No sessions this week. Start practicing to see your progress!";
    if (activeDays >= 5) return "Amazing consistency! You practiced 5+ days this week.";
    if (activeDays >= 3) return "Good momentum! Try to add one more day next week.";
    return "You're getting started. Aim for at least 3 days next week!";
  };

  return (
    <div className="flex min-h-screen bg-site-bg">
      <Sidebar />

      <main className="flex-1 overflow-y-auto w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-site-ink">Weekly Summary</h1>
            <p className="text-site-muted mt-1">Review your learning progress week by week</p>
          </div>

          {/* Week Navigation */}
          <div className="flex items-center justify-between bg-site-surface rounded-xl border border-site-border p-4 mb-6 shadow-sm">
            <button
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className="p-2 rounded-lg hover:bg-site-bg transition-colors text-site-muted hover:text-site-ink"
              aria-label="Previous week"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <p className="text-sm font-medium text-site-accent">
                {isCurrentWeek ? "This Week" : `${Math.abs(weekOffset)} week${Math.abs(weekOffset) > 1 ? "s" : ""} ago`}
              </p>
              <p className="text-lg font-bold text-site-ink">{formatWeekRange(weekStart)}</p>
            </div>
            <button
              onClick={() => setWeekOffset((prev) => Math.min(prev + 1, 0))}
              disabled={isCurrentWeek}
              className={`p-2 rounded-lg transition-colors ${
                isCurrentWeek
                  ? "text-site-faint cursor-not-allowed"
                  : "hover:bg-site-bg text-site-muted hover:text-site-ink"
              }`}
              aria-label="Next week"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-site-accent mx-auto mb-3" />
                <p className="text-site-muted text-sm">Loading summary...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <StatCard icon={Clock} label="Total Time" value={`${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`} />
                <StatCard icon={Target} label="Sessions" value={totalSessions} />
                <StatCard icon={FileText} label="Reflections" value={totalReflections} />
                <StatCard icon={Flame} label="Days Active" value={`${activeDays}/7`} />
              </div>

              {/* Most Practiced Skill */}
              {topSkill && (
                <div className="bg-site-surface rounded-xl border border-site-border p-5 mb-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-site-soft flex items-center justify-center">
                      <Award className="w-5 h-5 text-site-accent" />
                    </div>
                    <div>
                      <p className="text-xs text-site-faint uppercase tracking-wide">Most Practiced Skill</p>
                      <p className="text-lg font-bold text-site-ink">{topSkill[0]}</p>
                    </div>
                  </div>
                  <p className="text-sm text-site-muted">
                    {topSkill[1].sessions} session{topSkill[1].sessions !== 1 ? "s" : ""} •{" "}
                    {Math.floor(topSkill[1].minutes / 60)}h {topSkill[1].minutes % 60}m total
                  </p>
                </div>
              )}

              {/* Daily Activity Heatmap */}
              <div className="bg-site-surface rounded-xl border border-site-border p-5 mb-6 shadow-sm">
                <h3 className="text-sm font-semibold text-site-ink mb-4">Daily Breakdown</h3>
                <div className="grid grid-cols-7 gap-2">
                  {DAYS.map((day, i) => {
                    const mins = dailyMinutes[i];
                    const intensity = mins > 0 ? Math.max(0.2, mins / maxDaily) : 0;
                    return (
                      <div key={day} className="flex flex-col items-center gap-1">
                        <span className="text-xs text-site-faint">{day}</span>
                        <div
                          className="w-full aspect-square rounded-lg border border-site-border flex items-center justify-center transition-colors"
                          style={{
                            backgroundColor: mins > 0 ? `rgba(46, 80, 35, ${intensity})` : "var(--site-bg, #f8fafc)",
                          }}
                        >
                          <span className={`text-xs font-medium ${mins > 0 ? "text-white" : "text-site-faint"}`}>
                            {mins > 0 ? `${mins}m` : "–"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Improvement Insight */}
              <div className="bg-site-surface rounded-xl border border-site-border p-5 mb-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-site-soft flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-5 h-5 text-site-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-site-ink mb-1">Weekly Insight</p>
                    <p className="text-sm text-site-muted">{getImprovementMessage()}</p>
                  </div>
                </div>
              </div>

              {/* Skills Breakdown */}
              {Object.keys(skillCounts).length > 0 && (
                <div className="bg-site-surface rounded-xl border border-site-border p-5 mb-6 shadow-sm">
                  <h3 className="text-sm font-semibold text-site-ink mb-4">Skills Practiced</h3>
                  <div className="space-y-3">
                    {Object.entries(skillCounts)
                      .sort((a, b) => b[1].minutes - a[1].minutes)
                      .map(([name, data]) => {
                        const pct = Math.round((data.minutes / totalMinutes) * 100);
                        return (
                          <div key={name}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-site-ink">{name}</span>
                              <span className="text-xs text-site-faint">
                                {data.sessions} session{data.sessions !== 1 ? "s" : ""} • {data.minutes}m
                              </span>
                            </div>
                            <div className="h-2 bg-site-bg rounded-full overflow-hidden border border-site-border">
                              <div
                                className="h-full bg-site-accent rounded-full transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {totalSessions === 0 && totalReflections === 0 && (
                <div className="text-center py-12 bg-site-surface rounded-xl border border-site-border shadow-sm">
                  <Calendar className="w-12 h-12 text-site-faint mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-site-ink mb-2">No activity this week</h3>
                  <p className="text-site-muted mb-4">Start a practice session to see your weekly summary</p>
                  <button
                    onClick={() => navigate("/log-practice")}
                    className="px-5 py-2.5 bg-site-accent text-white rounded-lg font-medium hover:bg-site-accent-hover transition-colors"
                  >
                    Start Practicing
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

// Reusable stat card used only in this page
function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-site-surface rounded-xl border border-site-border p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-site-soft flex items-center justify-center">
          <Icon className="w-4 h-4 text-site-accent" />
        </div>
        <div>
          <p className="text-lg font-bold text-site-ink">{value}</p>
          <p className="text-xs text-site-faint">{label}</p>
        </div>
      </div>
    </div>
  );
}
