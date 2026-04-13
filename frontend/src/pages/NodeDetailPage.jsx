import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSkillMap } from '../context/SkillMapContext';
import { useActiveSessions } from '../context/ActiveSessionContext';
import { useToast } from '../context/ToastContext';
import { showXpNotification } from '../utils/xpNotifications';
import { practiceAPI } from '../api/client';
import client from '../api/client';
import { auth } from '../firebase';
import { Lock, Unlock, CheckCircle, Rocket, Play, Pause, RotateCcw, Star, AlertTriangle, ArrowRight, X, ChevronLeft, ChevronRight, Clock, Target } from 'lucide-react';
const CONF = ['','Not confident','Slightly','Moderate','Confident','Very confident'];
const PER = 5;
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
  const [comp, setComp] = useState({ notes:'', confidence:3, blockers:'', nextStep:'' });
  const [sub, setSub] = useState(false);
  const [showMark, setShowMark] = useState(false);
  const [hist, setHist] = useState([]);
  const [page, setPage] = useState(1);
  const [sidebar, setSidebar] = useState(true);
  const [showRemove, setShowRemove] = useState(false);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  // Template session state
  const [tplTimer, setTplTimer] = useState(0);
  const [tplRunning, setTplRunning] = useState(false);
  const [tplCompleting, setTplCompleting] = useState(false);
  const tplIntervalRef = useRef(null);
  // Template session stopwatch
  useEffect(() => {
    if (tplRunning) {
      tplIntervalRef.current = setInterval(() => setTplTimer(t => t + 1), 1000);
    } else {
      clearInterval(tplIntervalRef.current);
    }
    return () => clearInterval(tplIntervalRef.current);
  }, [tplRunning]);
  // Reset timer when switching nodes — restore from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`tplTimer_${nodeId}`);
    setTplTimer(saved ? parseInt(saved, 10) || 0 : 0);
    setTplRunning(false);
  }, [nodeId]);
  // Persist timer to localStorage on change
  useEffect(() => {
    if (nodeId && tplTimer > 0) localStorage.setItem(`tplTimer_${nodeId}`, String(tplTimer));
  }, [tplTimer, nodeId]);
  const fmtTplTimer = (s) => { const m = Math.floor(s / 60); const sec = s % 60; return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`; };
  const completeTplSession = async (idx) => {
    if (tplCompleting) return;
    // Require at least 60 seconds
    if (tplTimer < 60) {
      setErr('Session must be at least 1 minute long');
      setTimeout(() => setErr(''), 4000);
      return;
    }
    setTplCompleting(true);
    setTplRunning(false);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await client.post(`/nodes/${nodeId}/complete-template-session`, { sessionIndex: idx }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.node) {
        await loadSkillMapFull(skillId);
        fetchD();
      }
      setTplTimer(0);
      localStorage.removeItem(`tplTimer_${nodeId}`);
      setOk('Session completed!');
      setTimeout(() => setOk(''), 3000);
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to complete session');
      setTimeout(() => setErr(''), 4000);
    } finally {
      setTplCompleting(false);
    }
  };
  useEffect(() => { if (skillId) loadSkillMapFull(skillId); }, [skillId, loadSkillMapFull]);
  const node = nodes.find(n => n._id === nodeId);
  const hasTemplateSessions = node?.sessionDefinitions && node.sessionDefinitions.length > 0;
  const completedSessions = node?.completedSessions || [];
  const currentTplIndex = hasTemplateSessions ? node.sessionDefinitions.findIndex((_, i) => !completedSessions.includes(i)) : -1;
  const uNodes = nodes.filter(n => !n.isGoal && !(n.isStart && n.title === 'Start'));
  const isFirst = node && uNodes.indexOf(node) === 0;
  const fetchD = useCallback(async () => { if (!nodeId) return; try { setLoading(true); const d = await getNodeDetails(nodeId); setNodeDetails(d); setDescIn(d.node?.description||''); } catch {} finally { setLoading(false); } }, [nodeId, getNodeDetails]);
  const fetchH = useCallback(async () => { if (!node?.title) return; try { const r = await practiceAPI.getPractices({ limit:200 }); setHist((r.data.practices||[]).filter(p => p.skillName === node.title)); } catch {} }, [node?.title]);
  useEffect(() => { fetchD(); }, [fetchD]);
  useEffect(() => { fetchH(); }, [fetchH]);
  const activeS = activeSessions.find(s => s.nodeId === nodeId);
  const isLocked = node?.status === 'Locked' && !isFirst;
  const isUnlocked = !isLocked && node?.status !== 'Completed';
  const isCompleted = node?.status === 'Completed';
  // Total time – only count full minutes per session (seconds don't roll over across sessions)
  const totalM = hist.reduce((s,p) => s + Math.floor((p.timerSeconds || p.minutesPracticed * 60 || 0) / 60), 0);
  const totalH = Math.floor(totalM / 60);
  const remM = totalM % 60;
  const timeStr = totalH > 0 ? `${totalH}h ${remM}m` : `${remM}m`;
  const dispStatus = isCompleted ? 'Completed' : isLocked ? 'Locked' : hist.length > 0 ? 'In Progress' : node?.status === 'In_Progress' ? 'In Progress' : 'Not Started';
  const paged = hist.slice((page-1)*PER, page*PER);
  const totPages = Math.max(1, Math.ceil(hist.length / PER));
  const markDone = async () => { try { const response = await updateNodeStatus(nodeId, 'Completed'); if (response?.skillMapXpAwarded) { showXpNotification(showSuccess, response.skillMapXpAwarded); } setShowMark(false); setOk('Node completed!'); setTimeout(()=>setOk(''),3000); fetchD(); fetchH(); } catch(e) { setErr(e.message||'Failed'); setTimeout(()=>setErr(''),4000); } };
  const saveDesc = async () => { try { await updateNodeContent(nodeId, { description: descIn.trim() }); setEditDesc(false); setOk('Saved!'); setTimeout(()=>setOk(''),2000); fetchD(); } catch { setErr('Failed to save'); setTimeout(()=>setErr(''),3000); } };
  const startPractice = () => {
    if (!node || !sessTitle.trim()) return;
    // Block if session already exists for this node
    if (activeS) { setErr('A session for this node already exists. Complete or remove it first.'); setTimeout(()=>setErr(''),5000); return; }
    // Block if any session is running
    const running = activeSessions.find(s => s.isRunning);
    if (running) { setErr(`"${running.skillName}" is running. Pause it first.`); setTimeout(()=>setErr(''),5000); return; }
    const t = cd ? tgtM*60 : 0;
    // Truncate node title to 20 chars to match practice API validation
    const truncatedTitle = node.title.slice(0, 20);
    addSession({ skillName: truncatedTitle, nodeId, skillId, tags: [currentSkill?.name||''], notes: sessTitle.trim(), timer: cd?t:0, targetTime: t, isCountdown: cd, isRunning: true });
    setShowPractice(false); setSessTitle(''); setOk('Session started!'); setTimeout(()=>setOk(''),3000);
  };
  const openComp = (s) => {
    // Calculate elapsed time
    const elapsed = s.isCountdown ? Math.max(0, s.targetTime - s.timer) : s.timer;
    // Require at least 60 seconds
    if (elapsed < 60) {
      setErr('Session must be at least 1 minute long');
      setTimeout(() => setErr(''), 4000);
      return;
    }
    if (s.isRunning) toggleSession(s.id);
    setCompS(s);
    setComp({ notes:'', confidence:3, blockers:'', nextStep:'' });
    setShowComp(true);
  };
  const submitComp = async () => { 
    if (!compS||!node) return; 
    setSub(true); 
    try { 
      const sec = compS.isCountdown ? Math.max(0, compS.targetTime - compS.timer) : compS.timer; 
      // Truncate node title to 20 chars to match practice API validation
      const truncatedTitle = node.title.slice(0, 20);
      await practiceAPI.createPractice({ 
        skillName: truncatedTitle, 
        minutesPracticed: Math.max(1, Math.floor(sec/60)), 
        tags: [currentSkill?.name||''], 
        timerSeconds: sec, 
        notes: comp.notes, 
        confidence: comp.confidence, 
        blockers: comp.blockers, 
        nextStep: comp.nextStep, 
        date: new Date().toISOString() 
      }); 
      if (node.status !== 'Completed' && node.status !== 'In_Progress') { 
        try { await updateNodeStatus(nodeId, 'In_Progress'); } catch {} 
      } 
      removeSession(compS.id); 
      setShowComp(false); 
      setOk('Practice logged!'); 
      setTimeout(()=>setOk(''),3000); 
      fetchD(); 
      fetchH(); 
    } catch { 
      setErr('Failed'); 
    } finally { 
      setSub(false); 
    } 
  };
  const removeActive = () => { if (activeS) { removeSession(activeS.id); setShowRemove(false); } };
  if (loading && !node) return (<div className="min-h-screen bg-site-bg flex items-center justify-center"><div className="animate-spin w-10 h-10 border-4 border-site-accent border-t-transparent rounded-full" /></div>);
  return (
    <div className="min-h-screen bg-site-bg flex relative">
      <div className={`flex-1 overflow-y-auto transition-all duration-300 ${sidebar ? 'mr-0 lg:mr-80' : 'mr-0'}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <button onClick={() => { if ((activeS && activeS.isRunning) || tplRunning) { setShowBackConfirm(true); } else { nav(`/skills/${skillId}`); } }} className="mb-6 px-5 py-2.5 rounded-lg font-medium bg-site-accent text-white hover:bg-site-accent-hover text-sm shadow-lg border-2 border-[#1f3518]">Back to Skill Map</button>
          {ok && <div className="mb-4 bg-green-50 border border-green-300 text-green-700 p-3 rounded-lg text-sm">{ok}</div>}
          {err && <div className="mb-4 bg-red-50 border border-red-300 text-red-700 p-3 rounded-lg text-sm">{err}</div>}
          {isLocked && <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-xl text-sm mb-6">Complete the previous node to unlock this one.</div>}

          {/* Template Sessions or Regular Actions */}
          {hasTemplateSessions ? (
            <div className="mb-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-site-ink">Practice Sessions</h3>
                <span className="text-xs text-site-faint">{completedSessions.length}/{node.sessionDefinitions.length} completed</span>
              </div>
              {isLocked ? null : node.sessionDefinitions.map((sd, i) => {
                const isDone = completedSessions.includes(i);
                const isCurrent = i === currentTplIndex;
                const isSessionLocked = !isDone && !isCurrent;
                return (
                  <div key={i} className={`rounded-xl border-2 p-4 transition-all ${isDone ? 'border-green-300 bg-green-50/50' : isCurrent ? 'border-site-accent bg-white shadow-md' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isDone ? 'bg-green-500' : isCurrent ? 'bg-site-accent' : 'bg-gray-300'}`}>
                        {isDone ? <CheckCircle className="w-4 h-4 text-white" /> : isSessionLocked ? <Lock className="w-3.5 h-3.5 text-white" /> : <span className="text-xs font-bold text-white">{i + 1}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${isDone ? 'text-green-700' : isCurrent ? 'text-site-ink' : 'text-gray-400'}`}>{sd.title}</p>
                        {sd.description && <p className={`text-xs mt-1 leading-relaxed ${isDone ? 'text-green-600' : isCurrent ? 'text-site-muted' : 'text-gray-400'}`}>{sd.description}</p>}
                        {isDone && <p className="text-[10px] text-green-600 font-medium mt-1">✓ Completed</p>}
                        {isSessionLocked && <p className="text-[10px] text-gray-400 mt-1">Complete previous session to unlock</p>}
                      </div>
                    </div>
                    {isCurrent && !isLocked && (
                      <div className="mt-4 pt-3 border-t border-site-border">
                        <div className={`text-3xl font-bold font-mono text-center py-3 rounded-xl mb-3 ${tplRunning ? 'bg-green-100 text-green-700' : 'bg-site-bg text-site-ink'}`}>{fmtTplTimer(tplTimer)}</div>
                        <div className="flex gap-2">
                          <button onClick={() => setTplRunning(r => !r)} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-medium text-sm ${tplRunning ? 'bg-gray-700 text-white hover:bg-gray-800' : 'bg-site-accent text-white hover:bg-site-accent-hover'}`}>{tplRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}{tplRunning ? 'Pause' : 'Start'}</button>
                          <button onClick={() => { setTplTimer(0); setTplRunning(false); }} className="px-3 py-2.5 border border-site-border text-site-muted rounded-lg hover:bg-site-bg"><RotateCcw className="w-4 h-4" /></button>
                        </div>
                        <button onClick={() => completeTplSession(i)} disabled={tplTimer < 60 || tplCompleting} className="w-full mt-2 py-2.5 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed">{tplCompleting ? 'Completing...' : tplTimer < 60 ? `${60 - tplTimer}s until 1 min` : 'Complete Session'}</button>
                      </div>
                    )}
                  </div>
                );
              })}
              {isCompleted && <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl text-sm text-center font-medium">✓ All sessions completed — node done!</div>}
            </div>
          ) : (
          <>
          {/* Actions + Active Session row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6 items-stretch">
            {/* Left: Actions */}
            <div className="flex flex-col space-y-3">
              {isUnlocked && !isCompleted && (
                <button onClick={() => { if (activeS) { setErr('Complete or end the ongoing session to start a new one'); setTimeout(()=>setErr(''),4000); } else { setShowPractice(true); } }} className={`w-full py-3.5 rounded-xl font-semibold shadow-md text-sm flex items-center justify-center gap-2 ${activeS ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-site-accent text-white hover:bg-site-accent-hover'}`}><Play className="w-5 h-5" />Start Practice Session</button>
              )}
              {isUnlocked && !isCompleted && (
                <button onClick={() => { if (activeS) { setErr('Complete or end the ongoing session first'); setTimeout(()=>setErr(''),4000); } else { setShowMark(true); } }} className={`w-full py-3 border-2 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 ${activeS ? 'border-gray-300 text-gray-400 cursor-not-allowed' : 'border-green-500 text-green-700 hover:bg-green-50'}`}><CheckCircle className="w-4 h-4" />Mark as Complete</button>
              )}
              {isCompleted && <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl text-sm text-center font-medium">✓ This node is completed</div>}
              {/* Quick stats inline */}
              <div className="grid grid-cols-3 gap-2 flex-1">
                <div className="bg-site-surface rounded-lg border border-site-border p-3 text-center flex flex-col items-center justify-center"><Clock className="w-4 h-4 text-site-accent mx-auto mb-1" /><p className="text-sm font-bold text-site-ink">{timeStr}</p><p className="text-[10px] text-site-faint">Total Time</p></div>
                <div className="bg-site-surface rounded-lg border border-site-border p-3 text-center flex flex-col items-center justify-center"><Target className="w-4 h-4 text-site-accent mx-auto mb-1" /><p className="text-sm font-bold text-site-ink">{hist.length}</p><p className="text-[10px] text-site-faint">Sessions</p></div>
                <div className="bg-site-surface rounded-lg border border-site-border p-3 text-center flex flex-col items-center justify-center"><Star className="w-4 h-4 text-yellow-500 mx-auto mb-1" /><p className="text-sm font-bold text-site-ink">{hist.length > 0 ? (hist.reduce((s,p) => s + (p.confidence||0), 0) / hist.length).toFixed(1) : '—'}</p><p className="text-[10px] text-site-faint">Avg Confidence</p></div>
              </div>
            </div>

            {/* Right: Active Session */}
            <div className="flex flex-col">
              {activeS ? (
                <div className={`rounded-xl border-2 p-5 shadow-sm flex-1 flex flex-col ${activeS.isRunning ? 'border-green-500 bg-green-50/50' : 'border-site-border bg-site-surface'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-site-ink">{activeS.notes || 'Session'}</p>
                    <button onClick={() => setShowRemove(true)} className="p-1 text-site-faint hover:text-red-500 rounded"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <div className={`text-4xl font-bold font-mono text-center py-4 rounded-xl mb-3 ${activeS.isRunning ? 'bg-green-100 text-green-700' : 'bg-site-bg text-site-ink'}`}>{formatTimer(activeS.timer)}</div>
                    {activeS.isCountdown && <div className="w-full h-1.5 bg-gray-200 rounded-full mb-3 overflow-hidden"><div className={`h-full rounded-full transition-all duration-1000 ${activeS.isRunning ? 'bg-green-500' : 'bg-site-accent'}`} style={{ width: `${getProgress(activeS)}%` }} /></div>}
                  </div>
                  <div className="flex gap-2 mb-3">
                    <button onClick={() => toggleSession(activeS.id)} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-medium text-sm ${activeS.isRunning ? 'bg-gray-700 text-white' : 'bg-site-accent text-white hover:bg-site-accent-hover'}`}>{activeS.isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}{activeS.isRunning ? 'Pause' : 'Resume'}</button>
                    <button onClick={() => resetSession(activeS.id)} className="px-3 py-2.5 border border-site-border text-site-muted rounded-lg hover:bg-site-bg"><RotateCcw className="w-4 h-4" /></button>
                  </div>
                  <button onClick={() => openComp(activeS)} disabled={(() => { const elapsed = activeS.isCountdown ? Math.max(0, activeS.targetTime - activeS.timer) : activeS.timer; return elapsed < 60; })()} className="w-full py-2.5 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed">{(() => { const elapsed = activeS.isCountdown ? Math.max(0, activeS.targetTime - activeS.timer) : activeS.timer; return elapsed < 60 ? `${60 - elapsed}s until 1 min` : 'Complete & Log'; })()}</button>
                </div>
              ) : !isLocked && !isCompleted ? (
                <div className="rounded-xl border-2 border-dashed border-site-border p-8 text-center flex-1 flex flex-col items-center justify-center">
                  <Play className="w-8 h-8 text-site-faint mb-2" />
                  <p className="text-sm text-site-muted">No active session</p>
                  <p className="text-xs text-site-faint mt-1">Click "Start Practice" to begin</p>
                </div>
              ) : null}
            </div>
          </div>
          </>
          )}

          {/* Practice History - hidden for template nodes */}
          {!hasTemplateSessions && (
          <div className="bg-site-surface rounded-xl border border-site-border p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-site-ink">Practice History ({hist.length})</h3>
            </div>
            {hist.length === 0 ? (
              <p className="text-sm text-site-muted text-center py-8">No sessions yet. Start practicing!</p>
            ) : (<>
              <div className="space-y-2">
                {paged.map(p => (
                  <div key={p._id} className="p-3 bg-site-bg rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2"><span className="text-sm font-semibold text-site-ink">{p.notes || 'Session'}</span><span className="text-xs text-site-faint">· {p.timerSeconds ? `${Math.floor(p.timerSeconds/60)}m ${p.timerSeconds%60}s` : `${p.minutesPracticed}min`}</span></div>
                      <span className="text-xs text-site-faint">{new Date(p.date).toLocaleDateString()}</span>
                    </div>
                    {p.confidence && <div className="flex gap-0.5 mb-1">{[1,2,3,4,5].map(i => <Star key={i} className={`w-3 h-3 ${i <= p.confidence ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />)}</div>}
                    {p.blockers && <p className="text-xs text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{p.blockers}</p>}
                    {p.nextStep && <p className="text-xs text-site-accent flex items-center gap-1"><ArrowRight className="w-3 h-3" />{p.nextStep}</p>}
                  </div>
                ))}
              </div>
              {totPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="p-1.5 rounded border border-site-border text-site-muted hover:bg-site-bg disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                  <span className="text-xs text-site-muted">{page}/{totPages}</span>
                  <button onClick={() => setPage(p => Math.min(totPages,p+1))} disabled={page>=totPages} className="p-1.5 rounded border border-site-border text-site-muted hover:bg-site-bg disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                </div>
              )}
            </>)}
          </div>
          )}
        </div>
      </div>

      {/* Sidebar */}
      <div className={`fixed lg:fixed top-0 right-0 h-full bg-white border-l-4 border-site-accent shadow-xl transition-transform duration-300 z-40 ${sidebar ? 'translate-x-0' : 'translate-x-full'} w-80 flex flex-col`}>
        <div className="p-4 border-b-4 border-site-accent bg-gradient-to-r from-green-100 to-emerald-100"><h2 className="text-lg font-bold text-gray-900">Node Details</h2></div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isCompleted ? 'bg-green-500' : isUnlocked ? 'bg-site-accent' : 'bg-gray-300'}`}>
                {isFirst && !isCompleted ? <Rocket className="w-5 h-5 text-white" /> : isCompleted ? <CheckCircle className="w-5 h-5 text-white" /> : isUnlocked ? <Unlock className="w-5 h-5 text-white" /> : <Lock className="w-5 h-5 text-white" />}
              </div>
              <div className="min-w-0"><h3 className="font-bold text-gray-900 truncate">{node?.title}</h3><span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${isCompleted ? 'bg-green-100 text-green-700' : isUnlocked ? 'bg-site-soft text-site-accent' : 'bg-gray-100 text-gray-500'}`}>{dispStatus}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-2 bg-site-bg rounded-lg"><p className="text-lg font-bold text-site-ink">{hist.length}</p><p className="text-[10px] text-site-faint">Sessions</p></div>
              <div className="text-center p-2 bg-site-bg rounded-lg"><p className="text-lg font-bold text-site-ink">{timeStr}</p><p className="text-[10px] text-site-faint">Total Time</p></div>
            </div>
          </div>
          <div className="bg-site-soft rounded-lg p-3 border border-site-border"><p className="text-[10px] text-site-faint uppercase mb-0.5">Skill Map</p><p className="text-sm font-semibold text-site-ink truncate">{currentSkill?.name || '—'}</p></div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2"><h4 className="text-sm font-bold text-gray-900">Description</h4>{!editDesc && <button onClick={() => setEditDesc(true)} className="text-[10px] text-site-accent font-medium hover:underline">Edit</button>}</div>
            {editDesc ? (<div><textarea value={descIn} onChange={e => setDescIn(e.target.value)} rows={4} maxLength={2000} className="w-full px-3 py-2 border border-site-border rounded-lg text-xs focus:border-site-accent outline-none resize-none mb-2" placeholder="What to learn?" /><div className="flex gap-2"><button onClick={saveDesc} className="px-3 py-1 bg-site-accent text-white text-[10px] rounded font-medium">Save</button><button onClick={() => { setEditDesc(false); setDescIn(nodeDetails?.node?.description||''); }} className="px-3 py-1 border border-site-border text-site-muted text-[10px] rounded">Cancel</button></div></div>
            ) : (<p className="text-xs text-gray-600 break-words">{nodeDetails?.node?.description || 'No description yet.'}</p>)}
          </div>
          {node?.sessionDefinitions && node.sessionDefinitions.length > 0 && (
            <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <h4 className="text-sm font-bold text-gray-900 mb-2">Practice Sessions ({node.sessionDefinitions.length})</h4>
              <div className="space-y-2">
                {node.sessionDefinitions.map((sd, i) => (
                  <div key={i} className="p-2.5 bg-site-bg rounded-lg">
                    <p className="text-xs font-semibold text-site-ink mb-0.5">{sd.title}</p>
                    {sd.description && <p className="text-[11px] text-site-muted leading-relaxed">{sd.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <button onClick={() => setSidebar(!sidebar)} className={`fixed top-4 p-2.5 bg-white border-2 border-site-accent rounded-full shadow-lg hover:shadow-xl transition-all z-50 hover:bg-site-soft ${sidebar ? 'right-[20.5rem]' : 'right-4'}`}>{sidebar ? <ChevronRight className="w-5 h-5 text-site-accent" /> : <ChevronLeft className="w-5 h-5 text-site-accent" />}</button>
      {sidebar && <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setSidebar(false)} />}

      {/* Back confirm when session running */}
      {showBackConfirm && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-site-surface rounded-2xl shadow-xl w-full max-w-xs p-6 text-center">
        <h2 className="text-lg font-bold text-site-ink mb-2">Leave this page?</h2><p className="text-sm text-site-muted mb-4">Your session is still running. Progress will not be saved.</p>
        <div className="flex gap-3"><button onClick={() => setShowBackConfirm(false)} className="flex-1 py-2 border border-site-border text-site-muted rounded-lg font-medium hover:bg-site-bg">Stay</button><button onClick={() => { setTplRunning(false); setShowBackConfirm(false); nav(`/skills/${skillId}`); }} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700">Leave</button></div>
      </div></div>)}
      {/* Remove session confirm */}
      {showRemove && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-site-surface rounded-2xl shadow-xl w-full max-w-xs p-6 text-center">
        <h2 className="text-lg font-bold text-site-ink mb-2">Remove session?</h2><p className="text-sm text-site-muted mb-4">This will discard the active session and unsaved progress.</p>
        <div className="flex gap-3"><button onClick={() => setShowRemove(false)} className="flex-1 py-2 border border-site-border text-site-muted rounded-lg font-medium hover:bg-site-bg">Cancel</button><button onClick={removeActive} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700">Remove</button></div>
      </div></div>)}
      {/* Mark complete confirm */}
      {showMark && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-site-surface rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" /><h2 className="text-lg font-bold text-site-ink mb-2">Mark as Complete?</h2><p className="text-sm text-site-muted mb-5">Are you sure you want to mark <span className="font-semibold text-site-ink">"{node?.title}"</span> as completed?</p>
        <div className="flex gap-3"><button onClick={() => setShowMark(false)} className="flex-1 py-2.5 border border-site-border text-site-muted rounded-lg font-medium hover:bg-site-bg">Cancel</button><button onClick={markDone} className="flex-1 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700">Yes, Complete</button></div>
      </div></div>)}
      {/* Start practice */}
      {showPractice && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-site-surface rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-bold text-site-ink mb-1">Start Practice</h2><p className="text-xs text-site-muted mb-4">Node: <span className="font-semibold text-site-ink">{node?.title}</span></p>
        <div className="mb-3"><label className="block text-sm font-medium text-site-ink mb-1">Session Title *</label><input type="text" value={sessTitle} onChange={e => setSessTitle(e.target.value)} placeholder="e.g. 1st session" maxLength={50} className="w-full px-3 py-2 border border-site-border rounded-lg text-sm focus:border-site-accent outline-none" /></div>
        <div className="flex gap-2 mb-3"><button onClick={() => setCd(true)} className={`flex-1 py-2 rounded-lg text-sm font-medium ${cd ? 'bg-site-accent text-white' : 'bg-site-bg text-site-muted border border-site-border'}`}>Countdown</button><button onClick={() => setCd(false)} className={`flex-1 py-2 rounded-lg text-sm font-medium ${!cd ? 'bg-site-accent text-white' : 'bg-site-bg text-site-muted border border-site-border'}`}>Stopwatch</button></div>
        {cd && <div className="mb-4"><label className="block text-xs text-site-faint mb-1">Minutes</label><input type="number" min={1} max={120} value={tgtM} onChange={e => setTgtM(Math.max(1,Math.min(120,parseInt(e.target.value)||25)))} className="w-full px-3 py-2 border border-site-border rounded-lg text-sm text-center focus:border-site-accent outline-none" /></div>}
        <div className="flex gap-3"><button onClick={startPractice} disabled={!sessTitle.trim()} className="flex-1 py-2.5 bg-site-accent text-white rounded-lg font-medium hover:bg-site-accent-hover disabled:opacity-40 disabled:cursor-not-allowed">Start</button><button onClick={() => { setShowPractice(false); setSessTitle(''); }} className="flex-1 py-2.5 border border-site-border text-site-muted rounded-lg font-medium hover:bg-site-bg">Cancel</button></div>
      </div></div>)}
      {/* Complete session */}
      {showComp && compS && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-site-surface rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold text-site-ink">Complete Session</h2><button onClick={() => { setShowComp(false); setCompS(null); }} className="text-site-faint hover:text-site-ink"><X className="w-5 h-5" /></button></div>
        <div className="bg-site-bg rounded-lg p-3 mb-4"><p className="font-semibold text-site-ink">{node?.title}</p>{compS.notes && <p className="text-xs text-site-muted">{compS.notes}</p>}</div>
        <div className="mb-4"><label className="block text-sm font-medium text-site-ink mb-2">Confidence *</label><div className="flex gap-1.5">{[1,2,3,4,5].map(n => (<button key={n} onClick={() => setComp(p => ({...p, confidence: n}))} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${comp.confidence === n ? 'bg-site-accent text-white shadow-md scale-105' : 'bg-site-bg text-site-muted border border-site-border hover:border-site-accent'}`}><Star className={`w-4 h-4 mx-auto mb-0.5 ${comp.confidence === n ? 'fill-white' : ''}`} />{n}</button>))}</div><p className="text-xs text-site-faint mt-1 text-center">{CONF[comp.confidence]}</p></div>
        <div className="mb-3"><label className="block text-sm font-medium text-site-ink mb-1">Notes</label><textarea value={comp.notes} onChange={e => setComp(p => ({...p, notes: e.target.value}))} rows={2} className="w-full px-3 py-2 border border-site-border rounded-lg text-sm focus:border-site-accent outline-none resize-none" placeholder="What did you practice?" /></div>
        <div className="mb-3"><label className="block text-sm font-medium text-site-ink mb-1 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" />Blockers</label><textarea value={comp.blockers} onChange={e => setComp(p => ({...p, blockers: e.target.value}))} rows={2} className="w-full px-3 py-2 border border-site-border rounded-lg text-sm focus:border-site-accent outline-none resize-none" placeholder="Any challenges?" /></div>
        <div className="mb-4"><label className="block text-sm font-medium text-site-ink mb-1 flex items-center gap-1"><ArrowRight className="w-3.5 h-3.5 text-site-accent" />Next step</label><textarea value={comp.nextStep} onChange={e => setComp(p => ({...p, nextStep: e.target.value}))} rows={2} className="w-full px-3 py-2 border border-site-border rounded-lg text-sm focus:border-site-accent outline-none resize-none" placeholder="What's next?" /></div>
        <button onClick={submitComp} disabled={sub} className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50">{sub ? 'Saving...' : 'Save Practice Log'}</button>
      </div></div>)}
    </div>
  );
}
