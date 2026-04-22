import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock, TrendingUp, TrendingDown, Award, Target,
  ChevronLeft, ChevronRight, ChevronDown, FileText, Flame, Zap, BookOpen,
} from "lucide-react";
import { practiceAPI, skillsAPI } from "../api/client";
import client from "../api/client";
import Sidebar from "../components/Sidebar";

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  d.setDate(d.getDate() - day); // Go back to Sunday
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekRange(start) {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const opts = { month: "short", day: "numeric" };
  const startStr = start.toLocaleDateString("en-US", opts);
  const endStr = end.toLocaleDateString("en-US", { ...opts, year: "numeric" });
  return `${startStr} – ${endStr}`;
}

function fmtMin(m) {
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h > 0 ? `${h}h ${r}m` : `${r}m`;
}

function weekLabel(offset) {
  if (offset === 0) return "This Week";
  if (offset === -1) return "Last Week";
  return `${Math.abs(offset)} weeks ago`;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SKILLS_PER_PAGE = 5;

export default function WeeklySummary() {
  const navigate = useNavigate();
  const [weekOffset, setWeekOffset] = useState(0);
  const [practices, setPractices] = useState([]);
  const [reflections, setReflections] = useState([]);
  const [skills, setSkills] = useState([]);
  const [learningSessions, setLearningSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [skillPage, setSkillPage] = useState(1);

  const weekStart = getWeekStart(new Date());
  weekStart.setDate(weekStart.getDate() + weekOffset * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const prevWeekEnd = new Date(prevWeekStart);
  prevWeekEnd.setDate(prevWeekEnd.getDate() + 6);
  prevWeekEnd.setHours(23, 59, 59, 999);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [practiceRes, reflectionRes, skillsRes, sessionsRes] = await Promise.all([
          practiceAPI.getPractices({ limit: 1000 }).catch(() => ({ data: { practices: [] } })),
          client.get("/reflections").catch(() => ({ data: { reflections: [] } })),
          skillsAPI.getAll().catch(() => ({ data: { skills: [] } })),
          client.get("/sessions").catch(() => ({ data: { sessions: [] } })),
        ]);
        setPractices(practiceRes.data.practices || practiceRes.data || []);
        setReflections(reflectionRes.data.reflections || reflectionRes.data || []);
        setSkills(skillsRes.data.skills || []);
        setLearningSessions(sessionsRes.data.sessions || sessionsRes.data || []);
      } catch (err) {
        console.error("Error fetching weekly data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => { setSkillPage(1); }, [weekOffset]);

  // Calculate how many weeks back the oldest data goes
  const maxWeeksBack = useMemo(() => {
    if (practices.length === 0 && reflections.length === 0) return 0;
    const allDates = [
      ...practices.map(p => new Date(p.date || p.createdAt)),
      ...reflections.map(r => new Date(r.createdAt)),
    ];
    const oldest = new Date(Math.min(...allDates));
    const currentWeekStart = getWeekStart(new Date());
    const oldestWeekStart = getWeekStart(oldest);
    return Math.ceil((currentWeekStart - oldestWeekStart) / (7 * 24 * 60 * 60 * 1000));
  }, [practices, reflections]);

  const inRange = (d, s, e) => { const dt = new Date(d); return dt >= s && dt <= e; };
  const weekPractices = practices.filter(p => inRange(p.date || p.createdAt, weekStart, weekEnd));
  const weekReflections = reflections.filter(r => inRange(r.createdAt, weekStart, weekEnd));
  const prevPractices = practices.filter(p => inRange(p.date || p.createdAt, prevWeekStart, prevWeekEnd));

  const totalMinutes = weekPractices.reduce((s, p) => s + (p.minutesPracticed || 0), 0);
  const totalSessions = weekPractices.length;
  const totalReflections = weekReflections.length;
  const prevMinutes = prevPractices.reduce((s, p) => s + (p.minutesPracticed || 0), 0);
  const prevSessions = prevPractices.length;

  // Group by actual skill maps using learning sessions
  const skillMapCounts = {};
  
  // Filter learning sessions for the current week
  const weekLearningSessions = learningSessions.filter(s => inRange(s.startTime, weekStart, weekEnd));
  
  // Build a map of skillId to skill name
  const skillIdToName = {};
  skills.forEach(skill => {
    skillIdToName[skill._id] = skill.name;
  });
  
  // Count sessions and time per skill map
  weekLearningSessions.forEach(session => {
    const skillName = skillIdToName[session.skillId] || "Unknown Skill";
    if (!skillMapCounts[skillName]) {
      skillMapCounts[skillName] = { minutes: 0, sessions: 0 };
    }
    // Duration is in seconds, convert to minutes
    const minutes = Math.floor((session.duration || 0) / 60);
    skillMapCounts[skillName].minutes += minutes;
    skillMapCounts[skillName].sessions += 1;
  });
  
  const sortedSkillMaps = Object.entries(skillMapCounts).sort((a, b) => b[1].minutes - a[1].minutes);
  const topSkillMap = sortedSkillMaps[0];
  const skillTotalPages = Math.max(1, Math.ceil(sortedSkillMaps.length / SKILLS_PER_PAGE));
  const pagedSkillMaps = sortedSkillMaps.slice((skillPage - 1) * SKILLS_PER_PAGE, skillPage * SKILLS_PER_PAGE);

  const activeDays = new Set(weekPractices.map(p => new Date(p.date || p.createdAt).toDateString())).size;

  const dailyMinutes = DAYS.map((_, i) => {
    const dayDate = new Date(weekStart);
    dayDate.setDate(dayDate.getDate() + i);
    const dayStr = dayDate.toDateString();
    return weekPractices.filter(p => new Date(p.date || p.createdAt).toDateString() === dayStr).reduce((s, p) => s + (p.minutesPracticed || 0), 0);
  });
  const dailySessions = DAYS.map((_, i) => {
    const dayDate = new Date(weekStart);
    dayDate.setDate(dayDate.getDate() + i);
    const dayStr = dayDate.toDateString();
    return weekPractices.filter(p => new Date(p.date || p.createdAt).toDateString() === dayStr).length;
  });
  const maxDaily = Math.max(...dailyMinutes, 1);

  const isCurrentWeek = weekOffset === 0;

  const confPractices = weekPractices.filter(p => p.confidence);
  const avgConf = confPractices.length > 0 ? (confPractices.reduce((s, p) => s + p.confidence, 0) / confPractices.length).toFixed(1) : null;

  const getInsight = () => {
    if (totalSessions === 0) return { icon: BookOpen, text: "No sessions recorded this week. Even a short session helps build momentum.", color: "text-site-muted" };
    const timeDiff = totalMinutes - prevMinutes;
    if (activeDays >= 6) return { icon: Zap, text: `${activeDays} days active — excellent consistency this week.`, color: "text-green-600" };
    if (activeDays >= 4) return { icon: TrendingUp, text: `${activeDays} active days${timeDiff > 0 ? `, ${fmtMin(timeDiff)} more than the previous week` : ""}. Strong progress.`, color: "text-green-600" };
    if (timeDiff > 0) return { icon: TrendingUp, text: `${fmtMin(timeDiff)} more practice time compared to the previous week.`, color: "text-green-600" };
    if (timeDiff < 0 && prevMinutes > 0) return { icon: TrendingDown, text: `Practice time decreased by ${fmtMin(Math.abs(timeDiff))} compared to the previous week.`, color: "text-amber-600" };
    if (activeDays <= 2) return { icon: Target, text: `${activeDays} active day${activeDays !== 1 ? "s" : ""} this week. Consistency helps — aim for 3+ days.`, color: "text-amber-600" };
    return { icon: TrendingUp, text: `${totalSessions} sessions across ${activeDays} days. Solid week.`, color: "text-site-accent" };
  };
  const insight = getInsight();
  const InsightIcon = insight.icon;

  // Build week selector options dynamically from data
  const weekOptions = useMemo(() => {
    const opts = [];
    for (let i = 0; i >= -maxWeeksBack; i--) {
      const ws = getWeekStart(new Date());
      ws.setDate(ws.getDate() + i * 7);
      opts.push({ offset: i, label: weekLabel(i), range: formatWeekRange(ws) });
    }
    return opts;
  }, [maxWeeksBack]);

  return (
    <div className="flex min-h-screen bg-site-bg">
      <Sidebar />
      <main className="flex-1 overflow-y-auto w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-site-ink">Weekly Summary</h1>
            <p className="text-site-muted mt-1">Review your learning progress week by week</p>
          </div>

          {/* Week Navigator */}
          <div className="bg-site-surface rounded-xl border border-site-border shadow-sm mb-6">
            <div className="flex items-center justify-between px-4 py-4">
              <button onClick={() => setWeekOffset(p => Math.max(p - 1, -maxWeeksBack))} disabled={weekOffset <= -maxWeeksBack} className={`p-2.5 rounded-lg transition-colors ${weekOffset <= -maxWeeksBack ? "text-site-faint cursor-not-allowed opacity-30" : "hover:bg-site-bg text-site-muted hover:text-site-ink"}`} aria-label="Previous week">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-center">
                <p className="text-xs font-medium text-site-accent mb-0.5">{weekLabel(weekOffset)}</p>
                <p className="text-lg font-bold text-site-ink">{formatWeekRange(weekStart)}</p>
              </div>
              <button onClick={() => setWeekOffset(p => Math.min(p + 1, 0))} disabled={isCurrentWeek} className={`p-2.5 rounded-lg transition-colors ${isCurrentWeek ? "text-site-faint cursor-not-allowed opacity-30" : "hover:bg-site-bg text-site-muted hover:text-site-ink"}`} aria-label="Next week">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            {/* Week selector dropdown */}
            {weekOptions.length > 1 && (
              <div className="px-4 pb-3">
                <WeekDropdown options={weekOptions} value={weekOffset} onChange={setWeekOffset} />
              </div>
            )}
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
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <StatCard icon={Clock} label="Total Time" value={fmtMin(totalMinutes)} prev={prevMinutes > 0 ? fmtMin(prevMinutes) : null} />
                <StatCard icon={Target} label="Sessions" value={totalSessions} prev={prevSessions > 0 ? prevSessions : null} />
                <StatCard icon={FileText} label="Reflections" value={totalReflections} />
                <StatCard icon={Flame} label="Days Active" value={`${activeDays}/7`} />
              </div>

              {/* Insight */}
              <div className={`rounded-xl border p-4 mb-6 shadow-sm flex items-start gap-3 ${
                totalSessions === 0 ? "bg-site-surface border-site-border" : insight.color.includes("green") ? "bg-green-50 border-green-200" : insight.color.includes("amber") ? "bg-amber-50 border-amber-200" : "bg-site-surface border-site-border"
              }`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  insight.color.includes("green") ? "bg-green-100" : insight.color.includes("amber") ? "bg-amber-100" : "bg-site-soft"
                }`}>
                  <InsightIcon className={`w-5 h-5 ${insight.color}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-site-ink mb-0.5">Weekly Insight</p>
                  <p className={`text-sm ${insight.color}`}>{insight.text}</p>
                </div>
              </div>

              {/* Most Practiced Skill Map + Avg Confidence */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {topSkillMap && (
                  <div className="bg-site-surface rounded-xl border border-site-border p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-site-soft flex items-center justify-center">
                        <Award className="w-5 h-5 text-site-accent" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-site-faint uppercase tracking-wide">Most Practiced Skill Map</p>
                        <p className="text-base font-bold text-site-ink truncate">{topSkillMap[0]}</p>
                        <p className="text-xs text-site-muted">{topSkillMap[1].sessions} session{topSkillMap[1].sessions !== 1 ? "s" : ""} · {fmtMin(topSkillMap[1].minutes)}</p>
                      </div>
                    </div>
                  </div>
                )}
                {avgConf && (
                  <div className="bg-site-surface rounded-xl border border-site-border p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center">
                        <span className="text-lg">⭐</span>
                      </div>
                      <div>
                        <p className="text-[10px] text-site-faint uppercase tracking-wide">Avg Confidence</p>
                        <p className="text-base font-bold text-site-ink">{avgConf} / 5</p>
                        <p className="text-xs text-site-muted">across {confPractices.length} rated session{confPractices.length !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Daily Breakdown */}
              <div className="bg-site-surface rounded-xl border border-site-border p-5 mb-6 shadow-sm">
                <h3 className="text-sm font-semibold text-site-ink mb-4">Daily Breakdown</h3>
                <div className="grid grid-cols-7 gap-2">
                  {DAYS.map((day, i) => {
                    const mins = dailyMinutes[i];
                    const sess = dailySessions[i];
                    const intensity = mins > 0 ? Math.max(0.25, mins / maxDaily) : 0;
                    const dayDate = new Date(weekStart);
                    dayDate.setDate(dayDate.getDate() + i);
                    const isToday = dayDate.toDateString() === new Date().toDateString();
                    return (
                      <div key={day} className="flex flex-col items-center gap-1">
                        <span className={`text-xs ${isToday ? "font-bold text-site-accent" : "text-site-faint"}`}>{day}</span>
                        <div
                          className={`w-full aspect-square rounded-xl border flex flex-col items-center justify-center transition-colors ${isToday ? "border-site-accent border-2" : "border-site-border"}`}
                          style={{ backgroundColor: mins > 0 ? `rgba(46, 80, 35, ${intensity})` : undefined }}
                        >
                          {mins > 0 ? (
                            <>
                              <span className="text-sm font-bold text-white">{fmtMin(mins)}</span>
                              <span className="text-[9px] text-white/70">{sess} session{sess !== 1 ? "s" : ""}</span>
                            </>
                          ) : (
                            <span className="text-xs text-site-faint">–</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Skill Maps Practiced — paginated */}
              {sortedSkillMaps.length > 0 && (
                <div className="bg-site-surface rounded-xl border border-site-border p-5 mb-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-site-ink">Skill Maps Practiced ({sortedSkillMaps.length})</h3>
                    {skillTotalPages > 1 && (
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setSkillPage(p => Math.max(1, p - 1))} disabled={skillPage === 1} className="p-1 rounded border border-site-border text-site-muted hover:bg-site-bg disabled:opacity-30"><ChevronLeft className="w-3.5 h-3.5" /></button>
                        <span className="text-xs text-site-muted">{skillPage}/{skillTotalPages}</span>
                        <button onClick={() => setSkillPage(p => Math.min(skillTotalPages, p + 1))} disabled={skillPage >= skillTotalPages} className="p-1 rounded border border-site-border text-site-muted hover:bg-site-bg disabled:opacity-30"><ChevronRight className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {pagedSkillMaps.map(([name, data], idx) => {
                      const pct = Math.round((data.minutes / totalMinutes) * 100);
                      const rank = (skillPage - 1) * SKILLS_PER_PAGE + idx + 1;
                      return (
                        <div key={name} className="flex items-center gap-3">
                          <span className="text-xs text-site-faint w-5 text-right">{rank}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-site-ink truncate">{name}</span>
                              <span className="text-xs text-site-faint whitespace-nowrap ml-2">{data.sessions} session{data.sessions !== 1 ? "s" : ""} · {fmtMin(data.minutes)}</span>
                            </div>
                            <div className="h-1.5 bg-site-bg rounded-full overflow-hidden border border-site-border">
                              <div className="h-full bg-site-accent rounded-full transition-all duration-500" style={{ width: `${Math.max(pct, 3)}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, prev }) {
  return (
    <div className="bg-site-surface rounded-xl border border-site-border p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-site-soft flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-site-accent" />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold text-site-ink">{value}</p>
          <p className="text-xs text-site-faint">{label}</p>
          {prev !== null && prev !== undefined && (
            <p className="text-[10px] text-site-muted">Previous week: {prev}</p>
          )}
        </div>
      </div>
    </div>
  );
}


function WeekDropdown({ options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const selected = options.find(o => o.offset === value);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-xs border border-site-border bg-site-bg text-site-ink hover:border-site-accent outline-none cursor-pointer"
      >
        <span>{selected ? `${selected.label} — ${selected.range}` : "Select week"}</span>
        <ChevronDown className={`w-4 h-4 text-site-faint transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 max-h-60 overflow-y-auto bg-site-surface border border-site-border rounded-lg shadow-lg z-30">
          {options.map(o => (
            <button
              key={o.offset}
              type="button"
              onClick={() => { onChange(o.offset); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors whitespace-nowrap ${
                value === o.offset
                  ? "bg-site-soft text-site-accent font-medium"
                  : "text-site-ink hover:bg-green-50 hover:text-green-700"
              }`}
            >
              {o.label} — {o.range}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
