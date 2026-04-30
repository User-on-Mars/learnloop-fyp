import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSkillMap } from '../context/SkillMapContext';
import { useActiveSessions } from '../context/ActiveSessionContext';
import { useToast } from '../context/ToastContext';
import { showXpNotification } from '../utils/xpNotifications';
import { practiceAPI } from '../api/client';
import client from '../api/client';
import { auth } from '../firebase';
import {
  Lock, CheckCircle, Rocket, Play, Pause, RotateCcw,
  Star, AlertTriangle, ArrowRight, X, ArrowLeft,
  Clock, Target, ChevronLeft, ChevronRight, PenLine,
  Zap, BookOpen, Trophy, ChevronDown, ChevronUp,
} from 'lucide-react';
import { SkillIcon } from '../components/IconPicker';

const CONF_LABELS = ['', 'Not confident', 'Slightly', 'Moderate', 'Confident', 'Very confident'];
const PER_PAGE = 5;

export default function NodeDetailPage() {
  const { skillId, nodeId } = useParams();
  const nav = useNavigate();
  const { showSuccess } = useToast();
  const { currentSkill, nodes, loadSkillMapFull, updateNodeStatus, updateNodeContent, getNodeDetails } = useSkillMap();
  const { activeSessions, addSession, removeSession, toggleSession, resetSession, formatTimer, getProgress } = useActiveSessions();

  const [nodeDetails, setNodeDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [editDesc, setEditDesc] = useState(false);
  const [descIn, setDescIn] = useState('');
  const [showPractice, setShowPractice] = useState(false);
  const [sessTitle, setSessTitle] = useState('');
  const [tgtM, setTgtM] = useState(25);
  const [cd, setCd] = useState(true);
  const [showComp, setShowComp] = useState(false);
  const [compS, setCompS] = useState(null);
  const [comp, setComp] = useState({ notes: '', confidence: 3, blockers: '', nextStep: '' });
  const [sub, setSub] = useState(false);
  const [showMark, setShowMark] = useState(false);
  const [hist, setHist] = useState([]);
  const [page, setPage] = useState(1);
  const [showRemove, setShowRemove] = useState(false);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [expandedHist, setExpandedHist] = useState(null);
  const [tplTimer, setTplTimer] = useState(0);
  const [tplRunning, setTplRunning] = useState(false);
  const [tplCompleting, setTplCompleting] = useState(false);
  const tplIntervalRef = useRef(null);

  useEffect(() => {
    if (tplRunning) tplIntervalRef.current = setInterval(() => setTplTimer(t => t + 1), 1000);
    else clearInterval(tplIntervalRef.current);
    return () => clearInterval(tplIntervalRef.current);
  }, [tplRunning]);
  useEffect(() => { const s = localStorage.getItem(`tplTimer_${nodeId}`); setTplTimer(s ? parseInt(s, 10) || 0 : 0); setTplRunning(false); }, [nodeId]);
  useEffect(() => { if (nodeId && tplTimer > 0) localStorage.setItem(`tplTimer_${nodeId}`, String(tplTimer)); }, [tplTimer, nodeId]);
  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const completeTplSession = async (idx) => {
    if (tplCompleting) return;
    if (tplTimer < 60) { flash('Session must be at least 1 minute', true); return; }
    setTplCompleting(true); setTplRunning(false);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await client.post(`/nodes/${nodeId}/complete-template-session`, { sessionIndex: idx }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.node) { await loadSkillMapFull(skillId); fetchD(); }
      setTplTimer(0); localStorage.removeItem(`tplTimer_${nodeId}`);
      flash('Session completed!');
    } catch (e) { flash(e.response?.data?.message || 'Failed', true); }
    finally { setTplCompleting(false); }
  };

  const flash = (msg, isErr = false) => { isErr ? setErr(msg) : setOk(msg); setTimeout(() => isErr ? setErr('') : setOk(''), 4000); };

  useEffect(() => { if (skillId) loadSkillMapFull(skillId); }, [skillId, loadSkillMapFull]);
  const node = nodes.find(n => n._id === nodeId);
  const hasTPL = node?.sessionDefinitions?.length > 0;
  const doneTPL = node?.completedSessions || [];
  const curTPLIdx = hasTPL ? node.sessionDefinitions.findIndex((_, i) => !doneTPL.includes(i)) : -1;
  const uNodes = nodes.filter(n => !n.isGoal && !(n.isStart && n.title === 'Start'));
  const isFirst = node && uNodes.indexOf(node) === 0;

  const fetchD = useCallback(async () => { if (!nodeId) return; try { setLoading(true); const d = await getNodeDetails(nodeId); setNodeDetails(d); setDescIn(d.node?.description || ''); } catch {} finally { setLoading(false); } }, [nodeId, getNodeDetails]);
  const fetchH = useCallback(async () => { if (!node?.title) return; try { const r = await practiceAPI.getPractices({ limit: 200 }); setHist((r.data.practices || []).filter(p => p.skillName === node.title)); } catch {} }, [node?.title]);
  useEffect(() => { fetchD(); }, [fetchD]);
  useEffect(() => { fetchH(); }, [fetchH]);

  const activeS = activeSessions.find(s => s.nodeId === nodeId);
  const prevTimerRef = useRef(null);
  useEffect(() => {
    if (activeS && activeS.isCountdown && activeS.timer === 0 && !activeS.isRunning && prevTimerRef.current > 0 && !showComp) openComp(activeS);
    prevTimerRef.current = activeS?.timer ?? null;
  }, [activeS?.timer, activeS?.isRunning]);

  const isLocked = node?.status === 'Locked' && !isFirst;
  const isUnlocked = !isLocked && node?.status !== 'Completed';
  const isCompleted = node?.status === 'Completed';
  const totalM = hist.reduce((s, p) => s + Math.floor((p.timerSeconds || p.minutesPracticed * 60 || 0) / 60), 0);
  const timeStr = totalM >= 60 ? `${Math.floor(totalM / 60)}h ${totalM % 60}m` : `${totalM}m`;
  const avgConf = hist.length > 0 ? (hist.reduce((s, p) => s + (p.confidence || 0), 0) / hist.length).toFixed(1) : '—';
  const dispStatus = isCompleted ? 'Completed' : isLocked ? 'Locked' : hist.length > 0 || node?.status === 'In_Progress' ? 'In Progress' : 'Not Started';
  const paged = hist.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totPages = Math.max(1, Math.ceil(hist.length / PER_PAGE));

  const goBack = () => { if ((activeS?.isRunning) || tplRunning) setShowBackConfirm(true); else nav(`/skills/${skillId}`); };
  const markDone = async () => { try { const r = await updateNodeStatus(nodeId, 'Completed'); if (r?.skillMapXpAwarded) showXpNotification(showSuccess, r.skillMapXpAwarded); setShowMark(false); flash('Node completed!'); fetchD(); fetchH(); } catch (e) { flash(e.message || 'Failed', true); } };
  const saveDesc = async () => { try { await updateNodeContent(nodeId, { description: descIn.trim() }); setEditDesc(false); flash('Saved!'); fetchD(); } catch { flash('Failed to save', true); } };

  const startPractice = () => {
    if (!node || !sessTitle.trim()) return;
    if (activeS) { flash('Complete or remove the current session first', true); return; }
    const running = activeSessions.find(s => s.isRunning);
    if (running) { flash(`"${running.skillName}" is running. Pause it first.`, true); return; }
    const t = cd ? tgtM * 60 : 0;
    addSession({ skillName: node.title.slice(0, 20), nodeId, skillId, tags: [currentSkill?.name || ''], notes: sessTitle.trim(), timer: cd ? t : 0, targetTime: t, isCountdown: cd, isRunning: true });
    setShowPractice(false); setSessTitle(''); flash('Session started!');
  };

  const openComp = (s) => {
    const elapsed = s.isCountdown ? Math.max(0, s.targetTime - s.timer) : s.timer;
    if (elapsed < 60) { flash('Session must be at least 1 minute', true); return; }
    if (s.isRunning) toggleSession(s.id);
    setCompS(s); setComp({ notes: '', confidence: 3, blockers: '', nextStep: '' }); setShowComp(true);
  };

  const submitComp = async () => {
    if (!compS || !node) return; setSub(true);
    try {
      const sec = compS.isCountdown ? Math.max(0, compS.targetTime - compS.timer) : compS.timer;
      const mins = Math.max(1, Math.floor(sec / 60)); const xp = mins * 2;
      await practiceAPI.createPractice({ skillName: node.title.slice(0, 20), minutesPracticed: mins, tags: [currentSkill?.name || ''], timerSeconds: sec, notes: comp.notes, confidence: comp.confidence, blockers: comp.blockers, nextStep: comp.nextStep, date: new Date().toISOString() });
      if (node.status !== 'Completed' && node.status !== 'In_Progress') { try { await updateNodeStatus(nodeId, 'In_Progress'); } catch {} }
      removeSession(compS.id); setShowComp(false);
      showSuccess('Practice Logged!', `+${xp} XP earned (${mins} min × 2 XP)`);
      flash(`+${xp} XP earned!`); fetchD(); fetchH();
    } catch { flash('Failed', true); } finally { setSub(false); }
  };

  const removeActive = () => { if (activeS) { removeSession(activeS.id); setShowRemove(false); } };

  /* ── Derived stats for redesigned layout ── */
  const totalSec = hist.reduce((s, p) => s + (p.timerSeconds || p.minutesPracticed * 60 || 0), 0);
  const avgSessionMin = hist.length > 0 ? Math.round(totalSec / hist.length / 60) : 0;

  if (loading && !node) return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-[3px] border-[#2e5023] border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm text-[#9aa094]">Loading node...</p>
      </div>
    </div>
  );

  const nodeIdx = uNodes.indexOf(node);
  const totalNodes = uNodes.length;

  return (
    <div className="fixed inset-0 bg-[#f8faf6] z-40 flex flex-col overflow-hidden">

      {/* ── Top bar - Beautiful & Visible ── */}
      <header className="flex items-center justify-between px-4 sm:px-6 lg:px-10 py-3 border-b border-[#e8ebe4] flex-shrink-0 bg-white">
        {/* Back button with skill map icon */}
        <button 
          onClick={goBack} 
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#f8faf6] to-[#f0f4ed] hover:from-[#edf5e9] hover:to-[#e5f0e0] border border-[#d4e8cc] hover:border-[#b8d4a8] text-[#2e5023] font-semibold text-[13px] transition-all shadow-sm hover:shadow group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <div 
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-sm"
            style={{ backgroundColor: currentSkill?.color || '#2e5023' }}
          >
            <SkillIcon name={currentSkill?.icon || 'Map'} size={14} />
          </div>
          <span className="font-bold">{currentSkill?.name || 'Back'}</span>
        </button>

        {/* Node counter - Cute pill design */}
        {nodeIdx >= 0 && totalNodes > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#f8faf6] to-[#f0f4ed] border border-[#e2e6dc] shadow-sm">
            <div className="flex items-center gap-1">
              {Array.from({ length: totalNodes }, (_, i) => (
                <div 
                  key={i} 
                  className={`w-2 h-2 rounded-full transition-all ${
                    i < nodeIdx ? 'bg-emerald-400' : 
                    i === nodeIdx ? 'bg-[#2e5023] ring-2 ring-[#2e5023]/20 scale-125' : 
                    'bg-[#d4d8ce]'
                  }`}
                  style={i === nodeIdx ? { backgroundColor: currentSkill?.color || '#2e5023' } : i < nodeIdx ? {} : {}}
                />
              ))}
            </div>
            <div className="h-4 w-px bg-[#e2e6dc]" />
            <span className="text-[12px] font-bold" style={{ color: currentSkill?.color || '#2e5023' }}>
              Node {nodeIdx + 1}
            </span>
            <span className="text-[12px] text-[#9aa094]">of {totalNodes}</span>
          </div>
        )}
      </header>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-8">

          {/* ═══ ALERTS ═══ */}
          {ok && <div className="mb-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2.5 rounded-xl text-[13px] font-medium"><Zap className="w-4 h-4" />{ok}</div>}
          {err && <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-xl text-[13px] font-medium"><AlertTriangle className="w-4 h-4" />{err}</div>}
          {isLocked && <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2.5 rounded-xl text-[13px] font-medium"><Lock className="w-4 h-4" />Complete the previous node to unlock this one.</div>}

          {/* ═══ TWO COLUMN LAYOUT ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* ── LEFT COLUMN: Node Info + Actions ── */}
            <div className="lg:col-span-5 space-y-5">

              {/* Node Identity Card */}
              <div className={`rounded-2xl border overflow-hidden ${isCompleted ? 'bg-gradient-to-br from-emerald-50 to-white border-emerald-200' : 'bg-white border-[#e8ebe4]'}`}>
                <div className="p-6">
                  <div className="flex items-start gap-4 mb-5">
                    <div 
                      className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg"
                      style={{ 
                        backgroundColor: isCompleted ? '#10b981' : isLocked ? '#9ca3af' : (currentSkill?.color || '#2e5023'),
                        boxShadow: `0 10px 15px -3px ${isCompleted ? 'rgba(16, 185, 129, 0.2)' : isLocked ? 'rgba(156, 163, 175, 0.2)' : (currentSkill?.color || '#2e5023') + '33'}`
                      }}
                    >
                      {isFirst && !isCompleted ? (
                        <Rocket className="w-7 h-7 text-white" />
                      ) : isCompleted ? (
                        <CheckCircle className="w-7 h-7 text-white" />
                      ) : isLocked ? (
                        <Lock className="w-7 h-7 text-white" />
                      ) : (
                        <SkillIcon name={currentSkill?.icon || 'Target'} size={26} className="text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <h1 className="text-xl sm:text-2xl font-bold text-[#1c1f1a] leading-tight mb-2">{node?.title}</h1>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span 
                          className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full ${
                            isCompleted ? 'bg-emerald-100 text-emerald-700' : 
                            isLocked ? 'bg-amber-100 text-amber-700' : 
                            hist.length > 0 ? 'bg-blue-50 text-blue-600' : 
                            'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {isCompleted ? <CheckCircle className="w-3 h-3" /> : isLocked ? <Lock className="w-3 h-3" /> : hist.length > 0 ? <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> : null}
                          {dispStatus}
                        </span>
                        <span className="text-[11px] text-[#b0b5ae] flex items-center gap-1">
                          in 
                          <span 
                            className="font-semibold"
                            style={{ color: currentSkill?.color || '#2e5023' }}
                          >
                            {currentSkill?.name || 'Skill Map'}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mb-5">
                    {editDesc ? (
                      <div>
                        <textarea value={descIn} onChange={e => setDescIn(e.target.value)} rows={3} maxLength={2000} autoFocus className="w-full px-4 py-3 border border-[#d4e8cc] rounded-xl text-sm text-[#1c1f1a] focus:border-[#2e5023] focus:ring-2 focus:ring-[#2e5023]/10 outline-none resize-none bg-white/80" placeholder="Describe what to learn..." />
                        <div className="flex gap-2 mt-2">
                          <button onClick={saveDesc} className="px-5 py-2 bg-[#2e5023] text-white text-[12px] font-semibold rounded-lg hover:bg-[#3d6b30] transition-colors">Save</button>
                          <button onClick={() => { setEditDesc(false); setDescIn(nodeDetails?.node?.description || ''); }} className="px-5 py-2 text-[12px] text-[#565c52] hover:text-[#1c1f1a] font-medium transition-colors">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="group">
                        <p className="text-[14px] text-[#565c52] leading-relaxed">
                          {nodeDetails?.node?.description || <span className="italic text-[#c8cec0]">No description yet</span>}
                        </p>
                        <button onClick={() => setEditDesc(true)} className="mt-1.5 text-[#2e5023] text-[12px] font-medium hover:underline inline-flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity"><PenLine className="w-3 h-3" />Edit</button>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  {!isLocked && (
                    <div className="flex flex-col gap-2">
                      {isUnlocked && !isCompleted && !activeS && (
                        <button onClick={() => setShowPractice(true)} className="flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-[#2e5023] text-white text-sm font-semibold rounded-xl hover:bg-[#3d6b30] transition-all shadow-lg shadow-[#2e5023]/15 active:scale-[0.98]">
                          <Play className="w-4 h-4" />Start Practice Session
                        </button>
                      )}
                      {isUnlocked && !isCompleted && hist.length > 0 && !activeS && (
                        <button onClick={() => setShowMark(true)} className="flex items-center justify-center gap-2 w-full px-6 py-3 text-[#2e5023] text-sm font-semibold rounded-xl border-2 border-[#c8dbbe] hover:bg-[#edf5e9] transition-colors">
                          <CheckCircle className="w-4 h-4" />Mark as Complete
                        </button>
                      )}
                      {isCompleted && (
                        <div className="flex items-center justify-center gap-2 px-5 py-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                          <Trophy className="w-5 h-5 text-emerald-600" />
                          <span className="text-sm font-semibold text-emerald-700">Node completed!</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {/* ── Active Session Timer Card ── */}
              {activeS && (
                <div className={`rounded-2xl border-2 overflow-hidden ${activeS.isRunning ? 'border-emerald-300' : 'border-[#e8ebe4]'}`}>
                  <div className={`px-5 py-3 flex items-center justify-between ${activeS.isRunning ? 'bg-emerald-50' : 'bg-[#fafbf8]'}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${activeS.isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
                      <span className="text-[13px] font-semibold text-[#1c1f1a]">{activeS.notes || 'Practice Session'}</span>
                    </div>
                    <button onClick={() => setShowRemove(true)} className="text-[12px] text-[#b0b5ae] hover:text-red-500 font-medium transition-colors">Discard</button>
                  </div>
                  <div className="bg-white px-5 py-8 flex flex-col items-center">
                    <p className={`text-6xl font-bold font-mono tracking-tighter leading-none ${activeS.isRunning ? 'text-emerald-600' : 'text-[#1c1f1a]'}`}>{formatTimer(activeS.timer)}</p>
                    {activeS.isCountdown && (
                      <div className="w-full max-w-xs mt-5 h-2 bg-[#f0f2ec] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-1000 ${activeS.isRunning ? 'bg-emerald-500' : 'bg-[#2e5023]'}`} style={{ width: `${getProgress(activeS)}%` }} />
                      </div>
                    )}
                  </div>
                  <div className="bg-[#fafbf8] border-t border-[#f0f2ec] px-5 py-3 flex gap-2">
                    <button onClick={() => toggleSession(activeS.id)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-[0.97] ${activeS.isRunning ? 'bg-[#1c1f1a] text-white' : 'bg-[#2e5023] text-white hover:bg-[#3d6b30]'}`}>{activeS.isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}{activeS.isRunning ? 'Pause' : 'Resume'}</button>
                    <button onClick={() => resetSession(activeS.id)} className="px-3 py-2.5 border border-[#e8ebe4] text-[#565c52] rounded-xl hover:bg-white transition-colors"><RotateCcw className="w-4 h-4" /></button>
                    <button onClick={() => openComp(activeS)} disabled={(() => { const e = activeS.isCountdown ? Math.max(0, activeS.targetTime - activeS.timer) : activeS.timer; return e < 60; })()} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">{(() => { const e = activeS.isCountdown ? Math.max(0, activeS.targetTime - activeS.timer) : activeS.timer; return e < 60 ? `${60 - e}s left` : 'Complete'; })()}</button>
                  </div>
                </div>
              )}

            </div>

            {/* ── RIGHT COLUMN: Stats + History ── */}
            <div className="lg:col-span-7 space-y-5">

              {/* Stats Grid - 4 cards in 2x2 on mobile, 4 columns on desktop */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white rounded-2xl border border-[#e8ebe4] p-5 hover:shadow-md hover:shadow-black/[0.03] transition-shadow">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 ring-4 ring-blue-100 flex items-center justify-center mb-3">
                    <Clock className="w-5 h-5 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold text-[#1c1f1a] leading-none mb-1">{timeStr}</p>
                  <p className="text-[11px] text-[#9aa094] font-medium">Total Time</p>
                </div>
                <div className="bg-white rounded-2xl border border-[#e8ebe4] p-5 hover:shadow-md hover:shadow-black/[0.03] transition-shadow">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 ring-4 ring-violet-100 flex items-center justify-center mb-3">
                    <Target className="w-5 h-5 text-violet-500" />
                  </div>
                  <p className="text-2xl font-bold text-[#1c1f1a] leading-none mb-1">{hist.length}</p>
                  <p className="text-[11px] text-[#9aa094] font-medium">Sessions</p>
                </div>
                <div className="bg-white rounded-2xl border border-[#e8ebe4] p-5 hover:shadow-md hover:shadow-black/[0.03] transition-shadow">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 ring-4 ring-amber-100 flex items-center justify-center mb-3">
                    <Star className="w-5 h-5 text-amber-500" />
                  </div>
                  <p className="text-2xl font-bold text-[#1c1f1a] leading-none mb-1">{avgConf}</p>
                  <p className="text-[11px] text-[#9aa094] font-medium">Confidence</p>
                </div>
                <div className="bg-white rounded-2xl border border-[#e8ebe4] p-5 hover:shadow-md hover:shadow-black/[0.03] transition-shadow">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 ring-4 ring-emerald-100 flex items-center justify-center mb-3">
                    <Clock className="w-5 h-5 text-emerald-500" />
                  </div>
                  <p className="text-2xl font-bold text-[#1c1f1a] leading-none mb-1">{avgSessionMin}m</p>
                  <p className="text-[11px] text-[#9aa094] font-medium">Avg Session</p>
                </div>
              </div>

              {/* ── Template Sessions Card ── */}
              {hasTPL && !activeS && (
                <div className="bg-white rounded-2xl border border-[#e8ebe4] overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f2ec]">
                    <h2 className="text-sm font-bold text-[#1c1f1a] flex items-center gap-2"><BookOpen className="w-4 h-4 text-[#2e5023]" />Practice Sessions</h2>
                    <div className="flex items-center gap-1.5">
                      <div className="flex gap-0.5">{node.sessionDefinitions.map((_, i) => <div key={i} className={`w-2 h-2 rounded-full ${doneTPL.includes(i) ? 'bg-emerald-500' : i === curTPLIdx ? 'bg-[#2e5023]' : 'bg-[#e8ebe4]'}`} />)}</div>
                      <span className="text-[11px] font-semibold text-[#565c52] ml-1">{doneTPL.length}/{node.sessionDefinitions.length}</span>
                    </div>
                  </div>
                  <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
                    {isLocked ? null : node.sessionDefinitions.map((sd, i) => {
                      const isDone = doneTPL.includes(i);
                      const isCur = i === curTPLIdx;
                      const isLk = !isDone && !isCur;
                      return (
                        <div key={i} className={`rounded-xl border p-4 transition-all ${isDone ? 'border-emerald-200 bg-emerald-50/40' : isCur ? 'border-[#2e5023] bg-white shadow-md shadow-[#2e5023]/5' : 'border-[#eef0ea] bg-[#fafbf8] opacity-50'}`}>
                          <div className="flex items-start gap-3">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isDone ? 'bg-emerald-500' : isCur ? 'bg-[#2e5023]' : 'bg-[#d4d8ce]'}`}>
                              {isDone ? <CheckCircle className="w-3.5 h-3.5 text-white" /> : isLk ? <Lock className="w-3 h-3 text-white" /> : <span className="text-[10px] font-bold text-white">{i + 1}</span>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold ${isDone ? 'text-emerald-700' : isCur ? 'text-[#1c1f1a]' : 'text-[#b0b5ae]'}`}>{sd.title}</p>
                              {sd.description && <p className={`text-[11px] mt-0.5 leading-relaxed ${isDone ? 'text-emerald-600/80' : isCur ? 'text-[#565c52]' : 'text-[#c8cec0]'}`}>{sd.description}</p>}
                              {isDone && <p className="text-[10px] text-emerald-600 font-semibold mt-1">✓ Completed</p>}
                            </div>
                          </div>
                          {isCur && !isLocked && (
                            <div className="mt-4 pt-3 border-t border-[#eef0ea]">
                              <p className={`text-4xl font-bold font-mono text-center py-4 rounded-xl mb-2 tracking-tight ${tplRunning ? 'bg-emerald-50 text-emerald-600' : 'bg-[#f5f7f2] text-[#1c1f1a]'}`}>{fmtTime(tplTimer)}</p>
                              <div className="flex gap-2">
                                <button onClick={() => setTplRunning(r => !r)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm active:scale-[0.97] ${tplRunning ? 'bg-[#1c1f1a] text-white' : 'bg-[#2e5023] text-white hover:bg-[#3d6b30]'}`}>{tplRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}{tplRunning ? 'Pause' : 'Start'}</button>
                                <button onClick={() => { setTplTimer(0); setTplRunning(false); }} className="px-3 py-2.5 border border-[#eef0ea] text-[#565c52] rounded-xl hover:bg-[#f5f7f2]"><RotateCcw className="w-4 h-4" /></button>
                              </div>
                              <button onClick={() => completeTplSession(i)} disabled={tplTimer < 60 || tplCompleting} className="w-full mt-2 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed">{tplCompleting ? 'Completing...' : tplTimer < 60 ? `${60 - tplTimer}s until 1 min` : 'Complete Session'}</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {isCompleted && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-sm text-center font-semibold flex items-center justify-center gap-2"><Trophy className="w-4 h-4" />All sessions completed!</div>}
                  </div>
                </div>
              )}

              {/* ── Practice History Card ── */}
              {!hasTPL && (
                <div className="bg-white rounded-2xl border border-[#e8ebe4] overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f2ec]">
                    <h2 className="text-sm font-bold text-[#1c1f1a]">Practice History</h2>
                    {hist.length > 0 && <span className="text-[11px] text-[#9aa094] font-medium">{hist.length} session{hist.length !== 1 ? 's' : ''}</span>}
                  </div>
                  {hist.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-[#f5f7f2] border border-[#eef0ea] flex items-center justify-center mx-auto mb-4">
                        <Clock className="w-6 h-6 text-[#d4d8ce]" />
                      </div>
                      <p className="text-[14px] font-semibold text-[#1c1f1a] mb-1">No sessions yet</p>
                      <p className="text-[12px] text-[#9aa094] max-w-xs mx-auto mb-4">Start your first practice session to begin tracking.</p>
                      {isUnlocked && !isCompleted && !activeS && (
                        <button onClick={() => setShowPractice(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-[#2e5023] text-white text-[12px] font-semibold rounded-lg hover:bg-[#3d6b30] transition-colors"><Play className="w-3.5 h-3.5" />Start Practicing</button>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="divide-y divide-[#f5f7f2] max-h-[500px] overflow-y-auto">
                        {paged.map((p, i) => {
                          const isExpanded = expandedHist === p._id;
                          const sessionNum = (page - 1) * PER_PAGE + i + 1;
                          return (
                            <div key={p._id} className="hover:bg-[#fafbf8] transition-colors">
                              <button 
                                onClick={() => setExpandedHist(isExpanded ? null : p._id)}
                                className="w-full px-5 py-3.5 flex items-center gap-3 text-left"
                              >
                                <div className="w-8 h-8 rounded-lg bg-[#f5f7f2] flex items-center justify-center flex-shrink-0">
                                  <span className="text-[11px] font-bold text-[#2e5023]">{sessionNum}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-[13px] font-semibold text-[#1c1f1a] truncate">{p.notes || 'Session'}</span>
                                    <span className="text-[10px] text-[#b0b5ae] bg-[#f5f7f2] px-2 py-0.5 rounded-full font-medium flex-shrink-0">{p.timerSeconds ? `${Math.floor(p.timerSeconds / 60)}m` : `${p.minutesPracticed}m`}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {p.confidence > 0 && (
                                      <div className="flex items-center gap-0.5">
                                        {[1, 2, 3, 4, 5].map(s => <Star key={s} className={`w-2.5 h-2.5 ${s <= p.confidence ? 'text-amber-400 fill-amber-400' : 'text-[#e8ebe4]'}`} />)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <span className="text-[10px] text-[#b0b5ae] flex-shrink-0 mr-2">{new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-[#9aa094]" /> : <ChevronDown className="w-4 h-4 text-[#9aa094]" />}
                              </button>
                              
                              {/* Expanded Details */}
                              {isExpanded && (
                                <div className="px-5 pb-4 pt-1 bg-[#fafbf8] border-t border-[#f0f2ec]">
                                  <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div className="bg-white rounded-xl p-3 border border-[#eef0ea]">
                                      <p className="text-[10px] text-[#9aa094] font-medium mb-1">Duration</p>
                                      <p className="text-sm font-semibold text-[#1c1f1a]">{p.timerSeconds ? `${Math.floor(p.timerSeconds / 60)}m ${p.timerSeconds % 60}s` : `${p.minutesPracticed} min`}</p>
                                    </div>
                                    <div className="bg-white rounded-xl p-3 border border-[#eef0ea]">
                                      <p className="text-[10px] text-[#9aa094] font-medium mb-1">Confidence</p>
                                      <div className="flex items-center gap-1.5">
                                        <div className="flex gap-0.5">
                                          {[1, 2, 3, 4, 5].map(s => <Star key={s} className={`w-3.5 h-3.5 ${s <= p.confidence ? 'text-amber-400 fill-amber-400' : 'text-[#e8ebe4]'}`} />)}
                                        </div>
                                        <span className="text-[11px] text-[#565c52] font-medium">{CONF_LABELS[p.confidence]}</span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {p.notes && (
                                    <div className="bg-white rounded-xl p-3 border border-[#eef0ea] mb-2">
                                      <p className="text-[10px] text-[#9aa094] font-medium mb-1">Notes</p>
                                      <p className="text-[13px] text-[#1c1f1a]">{p.notes}</p>
                                    </div>
                                  )}
                                  
                                  {p.blockers && (
                                    <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 mb-2">
                                      <p className="text-[10px] text-amber-600 font-medium mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Blockers</p>
                                      <p className="text-[13px] text-amber-800">{p.blockers}</p>
                                    </div>
                                  )}
                                  
                                  {p.nextStep && (
                                    <div className="bg-[#edf5e9] rounded-xl p-3 border border-[#d4e8cc]">
                                      <p className="text-[10px] text-[#2e5023] font-medium mb-1 flex items-center gap-1"><ArrowRight className="w-3 h-3" />Next Step</p>
                                      <p className="text-[13px] text-[#2e5023]">{p.nextStep}</p>
                                    </div>
                                  )}
                                  
                                  <p className="text-[10px] text-[#b0b5ae] mt-3 text-center">
                                    {new Date(p.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {totPages > 1 && (
                        <div className="flex items-center justify-between px-5 py-3 border-t border-[#f5f7f2] bg-[#fafbf8]">
                          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center gap-1 text-[11px] text-[#565c52] hover:text-[#1c1f1a] disabled:opacity-30 font-medium transition-colors"><ChevronLeft className="w-3.5 h-3.5" />Prev</button>
                          <span className="text-[10px] text-[#b0b5ae]">{page}/{totPages}</span>
                          <button onClick={() => setPage(p => Math.min(totPages, p + 1))} disabled={page >= totPages} className="flex items-center gap-1 text-[11px] text-[#565c52] hover:text-[#1c1f1a] disabled:opacity-30 font-medium transition-colors">Next<ChevronRight className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* ═══ MODALS ═══ */}

      {showBackConfirm && (<div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-[60] p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-6 h-6 text-amber-500" /></div>
        <h3 className="text-base font-bold text-[#1c1f1a] mb-1">Leave this page?</h3>
        <p className="text-[13px] text-[#565c52] mb-5">Session is running. Progress won't be saved.</p>
        <div className="flex gap-2">
          <button onClick={() => setShowBackConfirm(false)} className="flex-1 py-2.5 border border-[#e8ebe4] text-[#565c52] rounded-xl font-medium hover:bg-[#f5f7f2] text-sm transition-colors">Stay</button>
          <button onClick={() => { setTplRunning(false); setShowBackConfirm(false); nav(`/skills/${skillId}`); }} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 text-sm transition-colors">Leave</button>
        </div>
      </div></div>)}

      {showRemove && (<div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-[60] p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4"><X className="w-6 h-6 text-red-500" /></div>
        <h3 className="text-base font-bold text-[#1c1f1a] mb-1">Discard session?</h3>
        <p className="text-[13px] text-[#565c52] mb-5">This removes the active session and unsaved progress.</p>
        <div className="flex gap-2">
          <button onClick={() => setShowRemove(false)} className="flex-1 py-2.5 border border-[#e8ebe4] text-[#565c52] rounded-xl font-medium hover:bg-[#f5f7f2] text-sm transition-colors">Keep</button>
          <button onClick={removeActive} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 text-sm transition-colors">Discard</button>
        </div>
      </div></div>)}

      {showMark && (<div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-[60] p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4"><CheckCircle className="w-6 h-6 text-emerald-500" /></div>
        <h3 className="text-base font-bold text-[#1c1f1a] mb-1">Mark as complete?</h3>
        <p className="text-[13px] text-[#565c52] mb-5"><span className="font-semibold">"{node?.title}"</span> will be marked done.</p>
        <div className="flex gap-2">
          <button onClick={() => setShowMark(false)} className="flex-1 py-2.5 border border-[#e8ebe4] text-[#565c52] rounded-xl font-medium hover:bg-[#f5f7f2] text-sm transition-colors">Cancel</button>
          <button onClick={markDone} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 text-sm transition-colors">Complete</button>
        </div>
      </div></div>)}

      {showPractice && (<div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-[60] p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-lg font-bold text-[#1c1f1a] mb-0.5">Start Practice</h3>
        <p className="text-[12px] text-[#9aa094] mb-5">{node?.title}</p>
        <div className="mb-4">
          <label className="block text-[13px] font-medium text-[#1c1f1a] mb-1.5">Session title *</label>
          <input type="text" value={sessTitle} onChange={e => { if (e.target.value.length <= 20) setSessTitle(e.target.value); }} placeholder="e.g. Fundamentals review" maxLength={20} autoFocus className="w-full px-4 py-2.5 border border-[#e8ebe4] rounded-xl text-sm focus:border-[#2e5023] focus:ring-2 focus:ring-[#2e5023]/10 outline-none transition-all" />
          <span className="text-[10px] text-[#b0b5ae] float-right mt-1">{sessTitle.length}/20</span>
        </div>
        <div className="flex gap-2 mb-4">
          <button onClick={() => setCd(true)} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${cd ? 'bg-[#2e5023] text-white shadow-md' : 'bg-[#f5f7f2] text-[#565c52] border border-[#e8ebe4] hover:border-[#c8dbbe]'}`}>Countdown</button>
          <button onClick={() => setCd(false)} className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${!cd ? 'bg-[#2e5023] text-white shadow-md' : 'bg-[#f5f7f2] text-[#565c52] border border-[#e8ebe4] hover:border-[#c8dbbe]'}`}>Stopwatch</button>
        </div>
        {cd && <div className="mb-5"><label className="block text-[12px] text-[#9aa094] mb-1.5">Duration (minutes)</label><input type="number" min={1} max={120} value={tgtM} onChange={e => setTgtM(Math.max(1, Math.min(120, parseInt(e.target.value) || 25)))} className="w-full px-4 py-2.5 border border-[#e8ebe4] rounded-xl text-sm text-center focus:border-[#2e5023] focus:ring-2 focus:ring-[#2e5023]/10 outline-none" /></div>}
        <div className="flex gap-2">
          <button onClick={startPractice} disabled={!sessTitle.trim()} className="flex-1 py-3 bg-[#2e5023] text-white rounded-xl font-semibold text-sm hover:bg-[#3d6b30] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Start</button>
          <button onClick={() => { setShowPractice(false); setSessTitle(''); }} className="flex-1 py-3 border border-[#e8ebe4] text-[#565c52] rounded-xl font-medium hover:bg-[#f5f7f2] text-sm transition-colors">Cancel</button>
        </div>
      </div></div>)}

      {showComp && compS && (<div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-[60] p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-[#1c1f1a]">Complete Session</h3>
          <button onClick={() => { setShowComp(false); setCompS(null); }} className="p-1.5 text-[#b0b5ae] hover:text-[#1c1f1a] rounded-lg hover:bg-[#f5f7f2] transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="bg-[#f5f7f2] rounded-xl p-4 mb-5 border border-[#eef0ea]"><p className="text-sm font-semibold text-[#1c1f1a]">{node?.title}</p>{compS.notes && <p className="text-[12px] text-[#565c52] mt-0.5">{compS.notes}</p>}</div>
        <div className="mb-5">
          <label className="block text-[13px] font-semibold text-[#1c1f1a] mb-2.5">How confident do you feel?</label>
          <div className="flex gap-2">{[1, 2, 3, 4, 5].map(n => (
            <button key={n} onClick={() => setComp(p => ({ ...p, confidence: n }))} className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${comp.confidence === n ? 'bg-[#2e5023] text-white scale-[1.05] shadow-lg shadow-[#2e5023]/15' : 'bg-[#f5f7f2] text-[#565c52] border border-[#eef0ea] hover:border-[#c8dbbe]'}`}>
              <Star className={`w-4 h-4 mx-auto mb-0.5 ${comp.confidence === n ? 'fill-white' : ''}`} />{n}
            </button>
          ))}</div>
          <p className="text-[11px] text-[#b0b5ae] mt-1.5 text-center">{CONF_LABELS[comp.confidence]}</p>
        </div>
        <div className="mb-4">
          <label className="block text-[13px] font-medium text-[#1c1f1a] mb-1.5">Notes</label>
          <textarea value={comp.notes} onChange={e => { if (e.target.value.length <= 50) setComp(p => ({ ...p, notes: e.target.value })); }} rows={2} maxLength={50} className="w-full px-4 py-2.5 border border-[#eef0ea] rounded-xl text-sm focus:border-[#2e5023] focus:ring-2 focus:ring-[#2e5023]/10 outline-none resize-none" placeholder="What did you practice?" />
          <span className="text-[10px] text-[#b0b5ae] float-right mt-0.5">{comp.notes.length}/50</span>
        </div>
        <div className="mb-4">
          <label className="block text-[13px] font-medium text-[#1c1f1a] mb-1.5 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" />Blockers</label>
          <textarea value={comp.blockers} onChange={e => { if (e.target.value.length <= 200) setComp(p => ({ ...p, blockers: e.target.value })); }} rows={2} maxLength={200} className="w-full px-4 py-2.5 border border-[#eef0ea] rounded-xl text-sm focus:border-[#2e5023] focus:ring-2 focus:ring-[#2e5023]/10 outline-none resize-none" placeholder="Any challenges?" />
          <span className="text-[10px] text-[#b0b5ae] float-right mt-0.5">{comp.blockers.length}/200</span>
        </div>
        <div className="mb-6">
          <label className="block text-[13px] font-medium text-[#1c1f1a] mb-1.5 flex items-center gap-1.5"><ArrowRight className="w-3.5 h-3.5 text-[#2e5023]" />Next step</label>
          <textarea value={comp.nextStep} onChange={e => { if (e.target.value.length <= 200) setComp(p => ({ ...p, nextStep: e.target.value })); }} rows={2} maxLength={200} className="w-full px-4 py-2.5 border border-[#eef0ea] rounded-xl text-sm focus:border-[#2e5023] focus:ring-2 focus:ring-[#2e5023]/10 outline-none resize-none" placeholder="What's next?" />
          <span className="text-[10px] text-[#b0b5ae] float-right mt-0.5">{comp.nextStep.length}/200</span>
        </div>
        <button onClick={submitComp} disabled={sub} className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-lg shadow-emerald-600/15">{sub ? 'Saving...' : 'Save Practice Log'}</button>
      </div></div>)}

    </div>
  );
}
