import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Lock, Unlock, CheckCircle, Rocket, Play, Pause, RotateCcw,
  Star, AlertTriangle, ArrowRight, X, ChevronLeft, ChevronRight, Clock, Target
} from "lucide-react";
import { roomsAPI } from "../api/client.ts";
import Sidebar from "../components/Sidebar";
import { SkillIcon } from "../components/IconPicker";
import { useToast } from "../context/ToastContext";
import { useActiveSessions } from "../context/ActiveSessionContext";

const CONF = ["", "Not confident", "Slightly", "Moderate", "Confident", "Very confident"];
const PER = 5;

export default function RoomNodeDetail() {
  const { roomId, roomSkillMapId, nodeId } = useParams();
  const nav = useNavigate();
  const { showSuccess } = useToast();
  const { activeSessions, addSession, removeSession, toggleSession, resetSession, formatTimer, getProgress } = useActiveSessions();

  const [skillMap, setSkillMap] = useState(null);
  const [node, setNode] = useState(null);
  const [nodeIndex, setNodeIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [hist, setHist] = useState([]);
  const [page, setPage] = useState(1);
  const [sidebar, setSidebar] = useState(true);

  // Practice session state
  const [showPractice, setShowPractice] = useState(false);
  const [sessTitle, setSessTitle] = useState("");
  const [tgtM, setTgtM] = useState(25);
  const [cd, setCd] = useState(true);

  // Find active session for this node from context
  const activeSession = activeSessions.find(s => s.nodeId === nodeId && s.roomId === roomId);

  // Completion form
  const [showComp, setShowComp] = useState(false);
  const [comp, setComp] = useState({ notes: "", confidence: 3, blockers: "", nextStep: "" });
  const [sub, setSub] = useState(false);
  const [showMark, setShowMark] = useState(false);
  const [showRemove, setShowRemove] = useState(false);
  const [showBackConfirm, setShowBackConfirm] = useState(false);

  // Fetch skill map and node data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await roomsAPI.getRoomSkillMapDetail(roomId, roomSkillMapId);
      const sm = res.data;
      setSkillMap(sm);
      const nodes = (sm.nodes || []).sort((a, b) => a.order - b.order);
      const idx = nodes.findIndex(n => n._id === nodeId);
      setNode(idx >= 0 ? nodes[idx] : null);
      setNodeIndex(idx >= 0 ? idx : 0);
    } catch (e) {
      setErr(e.response?.data?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [roomId, roomSkillMapId, nodeId]);

  const fetchHist = useCallback(async () => {
    try {
      const res = await roomsAPI.getNodePractice(roomId, roomSkillMapId, nodeId);
      setHist(res.data.practices || []);
    } catch { setHist([]); }
  }, [roomId, roomSkillMapId, nodeId]);

  useEffect(() => { fetchData(); fetchHist(); }, [fetchData, fetchHist]);

  const getElapsed = () => {
    if (!activeSession) return 0;
    return activeSession.isCountdown ? Math.max(0, activeSession.targetTime - activeSession.timer) : activeSession.timer;
  };

  const startPractice = () => {
    if (!node || !sessTitle.trim()) return;
    if (activeSession) { setErr("Complete or end the ongoing session first"); setTimeout(() => setErr(""), 4000); return; }
    // Block if any session is running
    const running = activeSessions.find(s => s.isRunning);
    if (running) { setErr(`Another session is running. Pause it first.`); setTimeout(() => setErr(""), 5000); return; }
    const t = cd ? tgtM * 60 : 0;
    addSession({
      skillName: (node.title || "Practice").slice(0, 20),
      nodeId,
      skillId: roomSkillMapId,
      roomId,
      roomSkillMapId,
      tags: [skillMap?.name || ""],
      notes: sessTitle.trim(),
      timer: cd ? t : 0,
      targetTime: t,
      isCountdown: cd,
      isRunning: true
    });
    setShowPractice(false);
    setSessTitle("");
    setOk("Session started!");
    setTimeout(() => setOk(""), 3000);
  };

  const openComp = () => {
    if (!activeSession) return;
    const elapsed = getElapsed();
    if (elapsed < 60) { setErr("Session must be at least 1 minute long"); setTimeout(() => setErr(""), 4000); return; }
    if (activeSession.isRunning) toggleSession(activeSession.id);
    setComp({ notes: "", confidence: 3, blockers: "", nextStep: "" });
    setShowComp(true);
  };

  const submitComp = async () => {
    if (!activeSession || !node) return;
    setSub(true);
    try {
      const sec = getElapsed();
      const mins = Math.max(1, Math.floor(sec / 60));
      const xpEarned = mins * 2;
      await roomsAPI.logPractice(roomId, roomSkillMapId, nodeId, {
        notes: comp.notes,
        minutesPracticed: mins,
        timerSeconds: sec,
        confidence: comp.confidence,
        blockers: comp.blockers,
        nextStep: comp.nextStep
      });
      removeSession(activeSession.id);
      setShowComp(false);
      showSuccess("Practice Logged!", `+${xpEarned} XP earned (${mins} min × 2 XP)`);
      setOk(`+${xpEarned} XP earned!`);
      setTimeout(() => setOk(""), 5000);
      fetchData();
      fetchHist();
    } catch { setErr("Failed to log practice"); } finally { setSub(false); }
  };

  const markDone = async () => {
    try {
      await roomsAPI.updateNodeStatus(roomId, roomSkillMapId, nodeId, "Completed");
      setShowMark(false);
      setOk("Node completed!");
      setTimeout(() => setOk(""), 3000);
      fetchData();
      fetchHist();
    } catch (e) { setErr(e.message || "Failed"); setTimeout(() => setErr(""), 4000); }
  };

  const removeActive = () => { if (activeSession) { removeSession(activeSession.id); setShowRemove(false); } };

  const goToNode = (dir) => {
    const nodes = (skillMap?.nodes || []).sort((a, b) => a.order - b.order);
    const newIdx = nodeIndex + dir;
    if (newIdx >= 0 && newIdx < nodes.length) {
      nav(`/roomspace/${roomId}/skill-maps/${roomSkillMapId}/nodes/${nodes[newIdx]._id}`);
    }
  };

  if (loading && !node) return (<div className="flex min-h-screen bg-site-bg"><Sidebar /><main className="flex-1 flex items-center justify-center"><div className="animate-spin w-10 h-10 border-4 border-site-accent border-t-transparent rounded-full" /></main></div>);

  const nodes = (skillMap?.nodes || []).sort((a, b) => a.order - b.order);
  const isFirst = nodeIndex === 0;
  const isLocked = node?.status === "Locked" && !isFirst;
  const isUnlocked = !isLocked && node?.status !== "Completed";
  const isCompleted = node?.status === "Completed";
  const totalM = hist.reduce((s, p) => s + Math.floor((p.timerSeconds || p.minutesPracticed * 60 || 0) / 60), 0);
  const timeStr = totalM >= 60 ? `${Math.floor(totalM / 60)}h ${totalM % 60}m` : `${totalM}m`;
  const dispStatus = isCompleted ? "Completed" : isLocked ? "Locked" : hist.length > 0 ? "In Progress" : "Not Started";
  const paged = hist.slice((page - 1) * PER, page * PER);
  const totPages = Math.max(1, Math.ceil(hist.length / PER));

  return (
    <div className="flex min-h-screen bg-site-bg">
      <Sidebar />
      <main className="flex-1 overflow-y-auto w-full">
        <div className="min-h-screen bg-site-bg flex relative">
          <div className={`flex-1 overflow-y-auto transition-all duration-300 ${sidebar ? "mr-0 lg:mr-80" : "mr-0"}`}>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
              <button onClick={() => { if (activeSession?.isRunning) { setShowBackConfirm(true); } else { nav(`/roomspace/${roomId}/skill-maps/${roomSkillMapId}`); } }} className="mb-6 px-5 py-2.5 rounded-lg font-medium bg-site-accent text-white hover:bg-site-accent-hover text-sm shadow-lg border-2 border-[#1f3518]">Back to Skill Map</button>
              {ok && <div className="mb-4 bg-green-50 border border-green-300 text-green-700 p-3 rounded-lg text-sm">{ok}</div>}
              {err && <div className="mb-4 bg-red-50 border border-red-300 text-red-700 p-3 rounded-lg text-sm">{err}</div>}
              {isLocked && <div className="bg-amber-50 border border-amber-200 text-amber-700 p-4 rounded-xl text-sm mb-6">Complete the previous node to unlock this one.</div>}

              {/* Actions + Active Session */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6 items-stretch">
                <div className="flex flex-col space-y-3">
                  {isUnlocked && !isCompleted && (
                    <button onClick={() => { if (activeSession) { setErr("Complete or end the ongoing session first"); setTimeout(() => setErr(""), 4000); } else { setShowPractice(true); } }} className={`w-full py-3.5 rounded-xl font-semibold shadow-md text-sm flex items-center justify-center gap-2 ${activeSession ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-site-accent text-white hover:bg-site-accent-hover"}`}><Play className="w-5 h-5" />Start Practice Session</button>
                  )}
                  {isUnlocked && !isCompleted && (
                    <button onClick={() => { if (activeSession) { setErr("Complete or end the ongoing session first"); setTimeout(() => setErr(""), 4000); } else if (hist.length === 0) { setErr("Complete at least one practice session before marking as complete"); setTimeout(() => setErr(""), 4000); } else { setShowMark(true); } }} className={`w-full py-3 border-2 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 ${activeSession || hist.length === 0 ? "border-gray-300 text-gray-400 cursor-not-allowed" : "border-green-500 text-green-700 hover:bg-green-50"}`}><CheckCircle className="w-4 h-4" />Mark as Complete</button>
                  )}
                  {isCompleted && <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl text-sm text-center font-medium">✓ This node is completed</div>}
                  <div className="grid grid-cols-3 gap-2 flex-1">
                    <div className="bg-site-surface rounded-lg border border-site-border p-3 text-center flex flex-col items-center justify-center"><Clock className="w-4 h-4 text-site-accent mx-auto mb-1" /><p className="text-sm font-bold text-site-ink">{timeStr}</p><p className="text-[10px] text-site-faint">Total Time</p></div>
                    <div className="bg-site-surface rounded-lg border border-site-border p-3 text-center flex flex-col items-center justify-center"><Target className="w-4 h-4 text-site-accent mx-auto mb-1" /><p className="text-sm font-bold text-site-ink">{hist.length}</p><p className="text-[10px] text-site-faint">Sessions</p></div>
                    <div className="bg-site-surface rounded-lg border border-site-border p-3 text-center flex flex-col items-center justify-center"><Star className="w-4 h-4 text-yellow-500 mx-auto mb-1" /><p className="text-sm font-bold text-site-ink">{hist.length > 0 ? (hist.reduce((s, p) => s + (p.confidence || 0), 0) / hist.length).toFixed(1) : "—"}</p><p className="text-[10px] text-site-faint">Avg Confidence</p></div>
                  </div>
                </div>

                <div className="flex flex-col">
                  {activeSession ? (
                    <div className={`rounded-xl border-2 p-5 shadow-sm flex-1 flex flex-col ${activeSession.isRunning ? "border-green-500 bg-green-50/50" : "border-site-border bg-site-surface"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-site-ink">{activeSession.notes || "Session"}</p>
                        <button onClick={() => setShowRemove(true)} className="p-1 text-site-faint hover:text-red-500 rounded"><X className="w-4 h-4" /></button>
                      </div>
                      <div className="flex-1 flex flex-col justify-center">
                        <div className={`text-4xl font-bold font-mono text-center py-4 rounded-xl mb-3 ${activeSession.isRunning ? "bg-green-100 text-green-700" : "bg-site-bg text-site-ink"}`}>{formatTimer(activeSession.timer)}</div>
                        {activeSession.isCountdown && <div className="w-full h-1.5 bg-gray-200 rounded-full mb-3 overflow-hidden"><div className={`h-full rounded-full transition-all duration-1000 ${activeSession.isRunning ? "bg-green-500" : "bg-site-accent"}`} style={{ width: `${getProgress(activeSession)}%` }} /></div>}
                      </div>
                      <div className="flex gap-2 mb-3">
                        <button onClick={() => toggleSession(activeSession.id)} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-medium text-sm ${activeSession.isRunning ? "bg-gray-700 text-white" : "bg-site-accent text-white hover:bg-site-accent-hover"}`}>{activeSession.isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}{activeSession.isRunning ? "Pause" : "Resume"}</button>
                        <button onClick={() => resetSession(activeSession.id)} className="px-3 py-2.5 border border-site-border text-site-muted rounded-lg hover:bg-site-bg"><RotateCcw className="w-4 h-4" /></button>
                      </div>
                      <button onClick={openComp} disabled={getElapsed() < 60} className="w-full py-2.5 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed">{getElapsed() < 60 ? `${60 - getElapsed()}s until 1 min` : "Complete & Log"}</button>
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

              {/* Practice History */}
              <div className="bg-site-surface rounded-xl border border-site-border p-5 shadow-sm">
                <h3 className="text-base font-semibold text-site-ink mb-4">Practice History ({hist.length})</h3>
                {hist.length === 0 ? (
                  <p className="text-sm text-site-muted text-center py-8">No sessions yet. Start practicing!</p>
                ) : (<>
                  <div className="space-y-2">
                    {paged.map(p => (
                      <div key={p._id} className="p-3 bg-site-bg rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2"><span className="text-sm font-semibold text-site-ink">{p.notes || "Session"}</span><span className="text-xs text-site-faint">· {p.timerSeconds ? `${Math.floor(p.timerSeconds / 60)}m ${p.timerSeconds % 60}s` : `${p.minutesPracticed}min`}</span></div>
                          <span className="text-xs text-site-faint">{new Date(p.date).toLocaleDateString()}</span>
                        </div>
                        {p.confidence && <div className="flex gap-0.5 mb-1">{[1, 2, 3, 4, 5].map(i => <Star key={i} className={`w-3 h-3 ${i <= p.confidence ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`} />)}</div>}
                        {p.blockers && <p className="text-xs text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{p.blockers}</p>}
                        {p.nextStep && <p className="text-xs text-site-accent flex items-center gap-1"><ArrowRight className="w-3 h-3" />{p.nextStep}</p>}
                      </div>
                    ))}
                  </div>
                  {totPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-4">
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded border border-site-border text-site-muted hover:bg-site-bg disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                      <span className="text-xs text-site-muted">{page}/{totPages}</span>
                      <button onClick={() => setPage(p => Math.min(totPages, p + 1))} disabled={page >= totPages} className="p-1.5 rounded border border-site-border text-site-muted hover:bg-site-bg disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                  )}
                </>)}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className={`fixed lg:fixed top-0 right-0 h-full bg-white border-l-4 border-site-accent shadow-xl transition-transform duration-300 z-40 ${sidebar ? "translate-x-0" : "translate-x-full"} w-80 flex flex-col`}>
            <div className="p-4 border-b-4 border-site-accent bg-gradient-to-r from-green-100 to-emerald-100"><h2 className="text-lg font-bold text-gray-900">Node Details</h2></div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
              <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isCompleted ? "bg-green-500" : isUnlocked ? "bg-site-accent" : "bg-gray-300"}`}>
                    {isFirst && !isCompleted ? <Rocket className="w-5 h-5 text-white" /> : isCompleted ? <CheckCircle className="w-5 h-5 text-white" /> : isUnlocked ? <Unlock className="w-5 h-5 text-white" /> : <Lock className="w-5 h-5 text-white" />}
                  </div>
                  <div className="min-w-0"><h3 className="font-bold text-gray-900 truncate">{node?.title}</h3><span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${isCompleted ? "bg-green-100 text-green-700" : isUnlocked ? "bg-site-soft text-site-accent" : "bg-gray-100 text-gray-500"}`}>{dispStatus}</span></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center p-2 bg-site-bg rounded-lg"><p className="text-lg font-bold text-site-ink">{hist.length}</p><p className="text-[10px] text-site-faint">Sessions</p></div>
                  <div className="text-center p-2 bg-site-bg rounded-lg"><p className="text-lg font-bold text-site-ink">{timeStr}</p><p className="text-[10px] text-site-faint">Total Time</p></div>
                </div>
              </div>
              <div className="bg-site-soft rounded-lg p-3 border border-site-border"><p className="text-[10px] text-site-faint uppercase mb-0.5">Skill Map</p><p className="text-sm font-semibold text-site-ink truncate">{skillMap?.name || "—"}</p></div>
              {node?.description && (
                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                  <h4 className="text-sm font-bold text-gray-900 mb-2">Description</h4>
                  <p className="text-xs text-gray-600 break-words">{node.description}</p>
                </div>
              )}
            </div>
          </div>
          <button onClick={() => setSidebar(!sidebar)} className={`fixed top-4 p-2.5 bg-white border-2 border-site-accent rounded-full shadow-lg hover:shadow-xl transition-all z-50 hover:bg-site-soft ${sidebar ? "right-[20.5rem]" : "right-4"}`}>{sidebar ? <ChevronRight className="w-5 h-5 text-site-accent" /> : <ChevronLeft className="w-5 h-5 text-site-accent" />}</button>
          {sidebar && <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setSidebar(false)} />}
        </div>

        {/* Start Practice Modal */}
        {showPractice && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-site-surface rounded-2xl shadow-xl w-full max-w-sm p-6">
          <h2 className="text-lg font-bold text-site-ink mb-1">Start Practice</h2>
          <p className="text-sm text-site-muted mb-4">Node: <span className="font-semibold text-site-ink">{node?.title}</span></p>
          <div className="mb-4"><label className="block text-sm font-medium text-site-ink mb-1">Session Title <span className="text-red-500">*</span></label><input type="text" value={sessTitle} onChange={e => { if (e.target.value.length <= 20) setSessTitle(e.target.value); }} placeholder="e.g. 1st session" className="w-full px-3 py-2 border border-site-border rounded-lg text-sm focus:border-site-accent outline-none" maxLength={20} autoFocus /><div className="text-right text-[10px] text-site-faint mt-0.5">{sessTitle.length}/20</div></div>
          <div className="mb-4"><label className="block text-sm font-medium text-site-ink mb-2">Timer Mode</label><div className="flex gap-2"><button onClick={() => setCd(true)} className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 ${cd ? "border-site-accent bg-site-soft text-site-accent" : "border-site-border text-site-muted"}`}>Countdown</button><button onClick={() => setCd(false)} className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 ${!cd ? "border-site-accent bg-site-soft text-site-accent" : "border-site-border text-site-muted"}`}>Stopwatch</button></div></div>
          {cd && <div className="mb-4"><label className="block text-sm font-medium text-site-ink mb-1">Duration (minutes)</label><input type="number" value={tgtM} onChange={e => setTgtM(Math.max(1, Math.min(120, parseInt(e.target.value) || 1)))} min={1} max={120} className="w-full px-3 py-2 border border-site-border rounded-lg text-sm focus:border-site-accent outline-none" /></div>}
          <div className="flex gap-3"><button onClick={() => setShowPractice(false)} className="flex-1 py-2.5 border border-site-border text-site-muted rounded-lg font-medium hover:bg-site-bg">Cancel</button><button onClick={startPractice} disabled={!sessTitle.trim()} className="flex-1 py-2.5 bg-site-accent text-white rounded-lg font-medium hover:bg-site-accent-hover disabled:opacity-50">Start</button></div>
        </div></div>)}

        {/* Complete & Log Modal */}
        {showComp && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-site-surface rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold text-site-ink">Complete Session</h2><button onClick={() => setShowComp(false)} className="text-site-faint hover:text-site-ink"><X className="w-5 h-5" /></button></div>
          <div className="bg-site-bg rounded-lg p-3 mb-4"><p className="font-semibold text-site-ink">{node?.title}</p>{activeSession?.notes && <p className="text-xs text-site-muted">{activeSession.notes}</p>}</div>
          <div className="mb-4"><label className="block text-sm font-medium text-site-ink mb-2">Confidence *</label><div className="flex gap-1.5">{[1,2,3,4,5].map(n => (<button key={n} onClick={() => setComp(p => ({...p, confidence: n}))} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${comp.confidence === n ? 'bg-site-accent text-white shadow-md scale-105' : 'bg-site-bg text-site-muted border border-site-border hover:border-site-accent'}`}><Star className={`w-4 h-4 mx-auto mb-0.5 ${comp.confidence === n ? 'fill-white' : ''}`} />{n}</button>))}</div><p className="text-xs text-site-faint mt-1 text-center">{CONF[comp.confidence]}</p></div>
          <div className="mb-3"><label className="block text-sm font-medium text-site-ink mb-1">Notes</label><textarea value={comp.notes} onChange={e => { if (e.target.value.length <= 50) setComp(p => ({...p, notes: e.target.value})); }} rows={2} maxLength={50} className="w-full px-3 py-2 border border-site-border rounded-lg text-sm focus:border-site-accent outline-none resize-none" placeholder="What did you practice?" /><div className="text-right text-[10px] text-site-faint">{comp.notes.length}/50</div></div>
          <div className="mb-3"><label className="block text-sm font-medium text-site-ink mb-1 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" />Blockers</label><textarea value={comp.blockers} onChange={e => { if (e.target.value.length <= 200) setComp(p => ({...p, blockers: e.target.value})); }} rows={2} maxLength={200} className="w-full px-3 py-2 border border-site-border rounded-lg text-sm focus:border-site-accent outline-none resize-none" placeholder="Any challenges?" /><div className="text-right text-[10px] text-site-faint">{comp.blockers.length}/200</div></div>
          <div className="mb-4"><label className="block text-sm font-medium text-site-ink mb-1 flex items-center gap-1"><ArrowRight className="w-3.5 h-3.5 text-site-accent" />Next step</label><textarea value={comp.nextStep} onChange={e => { if (e.target.value.length <= 200) setComp(p => ({...p, nextStep: e.target.value})); }} rows={2} maxLength={200} className="w-full px-3 py-2 border border-site-border rounded-lg text-sm focus:border-site-accent outline-none resize-none" placeholder="What's next?" /><div className="text-right text-[10px] text-site-faint">{comp.nextStep.length}/200</div></div>
          <button onClick={submitComp} disabled={sub} className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50">{sub ? "Saving..." : "Save Practice Log"}</button>
        </div></div>)}

        {/* Mark Complete Confirm */}
        {showMark && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-site-surface rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" /><h2 className="text-lg font-bold text-site-ink mb-2">Mark as Complete?</h2><p className="text-sm text-site-muted mb-5">Mark <span className="font-semibold text-site-ink">"{node?.title}"</span> as completed?</p>
          <div className="flex gap-3"><button onClick={() => setShowMark(false)} className="flex-1 py-2.5 border border-site-border text-site-muted rounded-lg font-medium hover:bg-site-bg">Cancel</button><button onClick={markDone} className="flex-1 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700">Yes, Complete</button></div>
        </div></div>)}

        {/* Remove Session Confirm */}
        {showRemove && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-site-surface rounded-2xl shadow-xl w-full max-w-xs p-6 text-center">
          <h2 className="text-lg font-bold text-site-ink mb-2">Remove session?</h2><p className="text-sm text-site-muted mb-4">This will discard the active session.</p>
          <div className="flex gap-3"><button onClick={() => setShowRemove(false)} className="flex-1 py-2 border border-site-border text-site-muted rounded-lg font-medium hover:bg-site-bg">Cancel</button><button onClick={removeActive} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700">Remove</button></div>
        </div></div>)}

        {/* Back Confirm */}
        {showBackConfirm && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-site-surface rounded-2xl shadow-xl w-full max-w-xs p-6 text-center">
          <h2 className="text-lg font-bold text-site-ink mb-2">Leave this page?</h2><p className="text-sm text-site-muted mb-4">Your session is still running. Progress will not be saved.</p>
          <div className="flex gap-3"><button onClick={() => setShowBackConfirm(false)} className="flex-1 py-2 border border-site-border text-site-muted rounded-lg font-medium hover:bg-site-bg">Stay</button><button onClick={() => { if (activeSession) { toggleSession(activeSession.id); } setShowBackConfirm(false); nav(`/roomspace/${roomId}/skill-maps/${roomSkillMapId}`); }} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700">Leave</button></div>
        </div></div>)}
      </main>
    </div>
  );
}
