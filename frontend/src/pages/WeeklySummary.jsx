import { useState, useEffect, useMemo } from "react";
import {
  Clock, TrendingUp, TrendingDown, Award, Target, Calendar,
  ChevronLeft, ChevronRight, FileText, Flame, Zap, 
  BookOpen, Sparkles, BarChart3, Star, Trophy, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { practiceAPI, skillsAPI } from "../api/client";
import client from "../api/client";
import FilterDropdown from "../components/FilterDropdown";

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
    // No sessions this week
    if (totalSessions === 0) {
      return { icon: BookOpen, text: "No sessions recorded this week. Even a short session helps build momentum.", color: "text-[#9aa094]" };
    }
    
    const timeDiff = totalMinutes - prevMinutes;
    const sessionDiff = totalSessions - prevSessions;
    
    // Excellent consistency (6-7 days active)
    if (activeDays >= 6) {
      return { icon: Zap, text: `Amazing! ${activeDays} days active this week — you're building great habits.`, color: "text-green-600" };
    }
    
    // Good consistency (4-5 days active)
    if (activeDays >= 4) {
      const extra = timeDiff > 0 ? ` That's ${fmtMin(timeDiff)} more than last week!` : "";
      return { icon: TrendingUp, text: `${activeDays} active days with ${totalSessions} sessions.${extra} Strong progress!`, color: "text-green-600" };
    }
    
    // Moderate activity (3 days)
    if (activeDays === 3) {
      if (timeDiff > 0) {
        return { icon: TrendingUp, text: `${fmtMin(timeDiff)} more practice time than last week. Keep building momentum!`, color: "text-green-600" };
      }
      return { icon: Target, text: `${totalSessions} sessions across ${activeDays} days. Try adding one more day next week!`, color: "text-teal-600" };
    }
    
    // Low activity but improved from last week
    if (timeDiff > 0 && prevMinutes > 0) {
      return { icon: TrendingUp, text: `${fmtMin(timeDiff)} more practice time compared to last week. You're improving!`, color: "text-green-600" };
    }
    
    // Decreased from last week
    if (timeDiff < 0 && prevMinutes > 0) {
      return { icon: TrendingDown, text: `Practice time decreased by ${fmtMin(Math.abs(timeDiff))} from last week. Let's get back on track!`, color: "text-amber-600" };
    }
    
    // Low activity (1-2 days)
    if (activeDays <= 2) {
      return { icon: Target, text: `${activeDays} active day${activeDays !== 1 ? "s" : ""} this week. Consistency is key — aim for 3+ days.`, color: "text-amber-600" };
    }
    
    // Default positive message
    return { icon: TrendingUp, text: `${totalSessions} session${totalSessions !== 1 ? "s" : ""} across ${activeDays} days. Solid week!`, color: "text-teal-600" };
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
    <div className="px-4 sm:px-6 py-6 lg:py-8">
      
      {/* Hero Header */}
      <div className="relative bg-gradient-to-br from-teal-50 via-white to-cyan-50 rounded-2xl border border-teal-100 p-6 sm:p-7 mb-6 shadow-sm">
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-teal-200 opacity-20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-36 h-36 rounded-full bg-cyan-200 opacity-20 blur-3xl pointer-events-none" />
            
            <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-[#1c1f1a]">Weekly Summary</h1>
                    <p className="text-sm text-teal-600 font-medium">Track Your Progress</p>
                  </div>
                </div>
                <p className="text-[#565c52] text-[15px] leading-relaxed max-w-xl">
                  Review your learning journey week by week. See your practice time, sessions, and growth trends.
                </p>
              </div>

              {/* Week Navigator */}
              <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-xl border border-teal-100 p-2 shadow-sm">
                <button 
                  onClick={() => setWeekOffset(p => Math.max(p - 1, -maxWeeksBack))} 
                  disabled={weekOffset <= -maxWeeksBack} 
                  className={`p-2 rounded-lg transition-all ${weekOffset <= -maxWeeksBack ? "text-[#d0d5ca] cursor-not-allowed" : "hover:bg-teal-50 text-[#565c52] hover:text-teal-600"}`}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="text-center min-w-[140px]">
                  <p className="text-xs font-bold text-teal-600 uppercase tracking-wider">{weekLabel(weekOffset)}</p>
                  <p className="text-sm font-bold text-[#1c1f1a]">{formatWeekRange(weekStart)}</p>
                </div>
                <button 
                  onClick={() => setWeekOffset(p => Math.min(p + 1, 0))} 
                  disabled={isCurrentWeek} 
                  className={`p-2 rounded-lg transition-all ${isCurrentWeek ? "text-[#d0d5ca] cursor-not-allowed" : "hover:bg-teal-50 text-[#565c52] hover:text-teal-600"}`}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Week Dropdown */}
            {weekOptions.length > 1 && (
              <div className="relative mt-4 pt-4 border-t border-teal-100 z-50">
                <FilterDropdown 
                  value={weekOffset} 
                  onChange={setWeekOffset}
                  options={weekOptions.map(o => ({ value: o.offset, label: `${o.label} — ${o.range}` }))}
                  minWidth={200}
                />
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center mx-auto mb-3 animate-pulse">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <p className="text-[#9aa094] text-sm">Loading your summary...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard 
                  icon={Clock} 
                  label="Total Time" 
                  value={fmtMin(totalMinutes)} 
                  prev={prevMinutes} 
                  prevLabel={fmtMin(prevMinutes)}
                  color="teal"
                />
                <StatCard 
                  icon={Target} 
                  label="Sessions" 
                  value={totalSessions} 
                  prev={prevSessions}
                  prevLabel={prevSessions}
                  color="cyan"
                />
                <StatCard 
                  icon={FileText} 
                  label="Reflections" 
                  value={totalReflections}
                  color="emerald"
                />
                <StatCard 
                  icon={Flame} 
                  label="Days Active" 
                  value={`${activeDays}/7`}
                  color="orange"
                  showProgress
                  progress={(activeDays / 7) * 100}
                />
              </div>

              {/* Insight Card */}
              <div className={`rounded-2xl border-2 p-5 mb-6 shadow-sm ${
                totalSessions === 0 
                  ? "bg-[#f8faf6] border-[#e2e6dc]" 
                  : insight.color.includes("green") 
                  ? "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200" 
                  : insight.color.includes("amber") 
                  ? "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200" 
                  : "bg-gradient-to-r from-teal-50 to-cyan-50 border-teal-200"
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    insight.color.includes("green") 
                      ? "bg-gradient-to-br from-emerald-500 to-teal-500" 
                      : insight.color.includes("amber") 
                      ? "bg-gradient-to-br from-amber-500 to-orange-500" 
                      : "bg-gradient-to-br from-teal-500 to-cyan-500"
                  }`}>
                    <InsightIcon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-4 h-4 text-teal-500" />
                      <p className="text-sm font-bold text-[#1c1f1a]">Weekly Insight</p>
                    </div>
                    <p className="text-[15px] text-[#565c52] leading-relaxed">{insight.text}</p>
                  </div>
                </div>
              </div>

              {/* Two Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Most Practiced + Avg Confidence */}
                <div className="flex flex-col gap-4">
                  {topSkillMap && (
                    <div className="bg-white rounded-2xl border border-[#e2e6dc] p-5 shadow-sm flex-1">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                          <Trophy className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Most Practiced</p>
                          <p className="text-lg font-bold text-[#1c1f1a] truncate">{topSkillMap[0]}</p>
                          <p className="text-sm text-[#9aa094]">
                            {topSkillMap[1].sessions} session{topSkillMap[1].sessions !== 1 ? "s" : ""} · {fmtMin(topSkillMap[1].minutes)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {avgConf && (
                    <div className="bg-white rounded-2xl border border-[#e2e6dc] p-5 shadow-sm flex-1">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-yellow-500/20">
                          <Star className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-yellow-600 uppercase tracking-wider mb-1">Avg Confidence</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-2xl font-bold text-[#1c1f1a]">{avgConf}</p>
                            <p className="text-sm text-[#9aa094]">/ 5</p>
                          </div>
                          <p className="text-sm text-[#9aa094]">{confPractices.length} rated session{confPractices.length !== 1 ? "s" : ""}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {!topSkillMap && !avgConf && (
                    <div className="bg-[#f8faf6] rounded-2xl border border-[#e2e6dc] p-8 text-center flex-1 flex flex-col items-center justify-center">
                      <BookOpen className="w-10 h-10 text-[#d0d5ca] mb-3" />
                      <p className="text-sm text-[#9aa094]">No practice data for this week</p>
                    </div>
                  )}

                  {/* Only one card exists - show Weekly Tips */}
                  {((topSkillMap && !avgConf) || (!topSkillMap && avgConf)) && (
                    <div className="bg-white rounded-2xl border border-[#e2e6dc] p-5 flex-1 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                          <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#1c1f1a]">Quick Tips</p>
                          <p className="text-xs text-[#9aa094]">Boost your learning</p>
                        </div>
                      </div>
                      <div className="space-y-2.5">
                        <div className="flex items-start gap-2">
                          <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-emerald-600">1</span>
                          </div>
                          <p className="text-sm text-[#565c52]">Practice daily for at least 15 minutes to build consistency</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-amber-600">2</span>
                          </div>
                          <p className="text-sm text-[#565c52]">Rate your confidence after each session to track progress</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-blue-600">3</span>
                          </div>
                          <p className="text-sm text-[#565c52]">Write reflections to reinforce what you've learned</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Daily Breakdown */}
                <div className="bg-white rounded-2xl border border-[#e2e6dc] overflow-hidden shadow-sm flex flex-col">
                  <div className="px-5 py-4 border-b border-[#e8ece3] flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#1c1f1a]">Daily Breakdown</h3>
                      <p className="text-[11px] text-[#9aa094]">Your activity this week</p>
                    </div>
                  </div>
                  <div className="p-5 flex-1 flex items-center">
                    <div className="grid grid-cols-7 gap-2 w-full">
                      {DAYS.map((day, i) => {
                        const mins = dailyMinutes[i];
                        const sess = dailySessions[i];
                        const intensity = mins > 0 ? Math.max(0.3, mins / maxDaily) : 0;
                        const dayDate = new Date(weekStart);
                        dayDate.setDate(dayDate.getDate() + i);
                        const isToday = dayDate.toDateString() === new Date().toDateString();
                        return (
                          <div key={day} className="flex flex-col items-center gap-1.5">
                            <span className={`text-xs font-medium ${isToday ? "text-teal-600" : "text-[#9aa094]"}`}>{day}</span>
                            <div
                              className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center transition-all ${
                                isToday ? "ring-2 ring-teal-400 ring-offset-2" : ""
                              } ${mins > 0 ? "" : "bg-[#f5f7f2] border border-[#e8ece3]"}`}
                              style={{ 
                                backgroundColor: mins > 0 ? `rgba(20, 184, 166, ${intensity})` : undefined 
                              }}
                            >
                              {mins > 0 ? (
                                <>
                                  <span className="text-[11px] font-bold text-white">{fmtMin(mins)}</span>
                                  <span className="text-[9px] text-white/80">{sess}x</span>
                                </>
                              ) : (
                                <span className="text-xs text-[#d0d5ca]">—</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Skill Maps Practiced */}
              {sortedSkillMaps.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#e2e6dc] overflow-hidden shadow-sm">
                  <div className="px-5 py-4 border-b border-[#e8ece3] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                        <Award className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-[#1c1f1a]">Skill Maps Practiced</h3>
                        <p className="text-[11px] text-[#9aa094]">{sortedSkillMaps.length} skill map{sortedSkillMaps.length !== 1 ? "s" : ""} this week</p>
                      </div>
                    </div>
                    {skillTotalPages > 1 && (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setSkillPage(p => Math.max(1, p - 1))} 
                          disabled={skillPage === 1} 
                          className="p-1.5 rounded-lg border border-[#e2e6dc] text-[#9aa094] hover:bg-[#f8faf6] disabled:opacity-30 transition-all"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs text-[#9aa094] font-medium">{skillPage}/{skillTotalPages}</span>
                        <button 
                          onClick={() => setSkillPage(p => Math.min(skillTotalPages, p + 1))} 
                          disabled={skillPage >= skillTotalPages} 
                          className="p-1.5 rounded-lg border border-[#e2e6dc] text-[#9aa094] hover:bg-[#f8faf6] disabled:opacity-30 transition-all"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="p-5 space-y-3">
                    {pagedSkillMaps.map(([name, data], idx) => {
                      const pct = Math.round((data.minutes / totalMinutes) * 100);
                      const rank = (skillPage - 1) * SKILLS_PER_PAGE + idx + 1;
                      const isTop = rank <= 3;
                      return (
                        <div key={name} className={`flex items-center gap-4 p-3 rounded-xl transition-all ${isTop ? "bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100" : "bg-[#f8faf6]"}`}>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            rank === 1 ? "bg-gradient-to-br from-amber-400 to-orange-500" :
                            rank === 2 ? "bg-gradient-to-br from-gray-300 to-gray-400" :
                            rank === 3 ? "bg-gradient-to-br from-orange-400 to-amber-600" :
                            "bg-[#e8ece3]"
                          }`}>
                            <span className={`text-xs font-bold ${rank <= 3 ? "text-white" : "text-[#9aa094]"}`}>#{rank}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-sm font-semibold text-[#1c1f1a] truncate">{name}</span>
                              <span className="text-xs text-[#9aa094] whitespace-nowrap ml-2">
                                {data.sessions} session{data.sessions !== 1 ? "s" : ""} · {fmtMin(data.minutes)}
                              </span>
                            </div>
                            <div className="h-2 bg-white rounded-full overflow-hidden border border-[#e8ece3]">
                              <div 
                                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500" 
                                style={{ width: `${Math.max(pct, 5)}%` }} 
                              />
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
  );
}

function StatCard({ icon: Icon, label, value, prev, prevLabel, color = "teal", showProgress, progress }) {
  const colorMap = {
    teal: { bg: "bg-gradient-to-br from-teal-500 to-cyan-500", shadow: "shadow-teal-500/20", light: "bg-teal-50", text: "text-teal-600" },
    cyan: { bg: "bg-gradient-to-br from-cyan-500 to-blue-500", shadow: "shadow-cyan-500/20", light: "bg-cyan-50", text: "text-cyan-600" },
    emerald: { bg: "bg-gradient-to-br from-emerald-500 to-teal-500", shadow: "shadow-emerald-500/20", light: "bg-emerald-50", text: "text-emerald-600" },
    orange: { bg: "bg-gradient-to-br from-orange-500 to-amber-500", shadow: "shadow-orange-500/20", light: "bg-orange-50", text: "text-orange-600" },
  };
  const colors = colorMap[color] || colorMap.teal;
  
  const diff = prev !== undefined && prev !== null ? (typeof value === 'number' ? value - prev : 0) : null;
  const showTrend = diff !== null && diff !== 0;

  return (
    <div className="bg-white rounded-2xl border border-[#e2e6dc] p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center shadow-lg ${colors.shadow}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {showTrend && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${
            diff > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
          }`}>
            {diff > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(diff)}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-[#1c1f1a] mb-0.5">{value}</p>
      <p className="text-xs text-[#9aa094]">{label}</p>
      {showProgress && (
        <div className="mt-2 h-1.5 bg-[#f5f7f2] rounded-full overflow-hidden">
          <div className={`h-full ${colors.bg} rounded-full transition-all duration-500`} style={{ width: `${progress}%` }} />
        </div>
      )}
      {prevLabel !== undefined && prevLabel !== null && prev > 0 && (
        <p className="text-[10px] text-[#9aa094] mt-1">Last week: {prevLabel}</p>
      )}
    </div>
  );
}
