import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { practiceAPI, skillsAPI } from '../api/client';
import { useActiveSessions } from '../context/ActiveSessionContext';
import { useToast } from '../context/ToastContext';
import { showXpNotification } from '../utils/xpNotifications';
import Sidebar from '../components/Sidebar';
import { Play, Pause, RotateCcw, Plus, X, Search, FileText, Trash2, CheckCircle, Star, AlertTriangle, ArrowRight, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Flame, Info, ExternalLink } from 'lucide-react';
const CONF = ['','Not confident','Slightly','Moderate','Confident','Very confident'];
const PER_PAGE = 5;
const SESSIONS_PER_PAGE = 3;
export default function LogPractice() {
  const navigate = useNavigate();
  const { showSuccess } = useToast();
  const [practices, setPractices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [fSkill, setFSkill] = useState('');
  const [fConf, setFConf] = useState('');
  const [fDate, setFDate] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const { activeSessions, addSession, removeSession, toggleSession, resetSession, formatTimer, getProgress } = useActiveSessions();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ skillName:'', tags:[], notes:'' });
  const [newTag, setNewTag] = useState('');
  const [tgtH, setTgtH] = useState(0);
  const [tgtM, setTgtM] = useState(25);
  const [countdown, setCountdown] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showComp, setShowComp] = useState(false);
  const [compSess, setCompSess] = useState(null);
  const [comp, setComp] = useState({ notes:'', confidence:3, blockers:'', nextStep:'' });
  const [deleteId, setDeleteId] = useState(null);
  const [delInput, setDelInput] = useState('');
  const [removeId, setRemoveId] = useState(null);
  const [resetConfirmId, setResetConfirmId] = useState(null);
  const [blockMsg, setBlockMsg] = useState('');
  const [skillNames, setSkillNames] = useState([]);
  const [skillSessionPage, setSkillSessionPage] = useState(1);
  const [freeSessionPage, setFreeSessionPage] = useState(1);
  const doFetch = useCallback(async () => {
    try { setLoading(true); const [r, sk] = await Promise.all([practiceAPI.getPractices({ limit:200 }), skillsAPI.getAll().catch(()=>({data:{skills:[]}}))]); setPractices(r.data.practices||r.data||[]); setSkillNames((sk.data.skills||[]).map(s=>s.name)); }
    catch { setError('Failed to load'); setTimeout(()=>setError(''),6000); }
    finally { setLoading(false); }
  }, []);
  useEffect(()=>{ doFetch(); },[doFetch]);
  const tgtTime = tgtH*3600+tgtM*60;
  // Only skill map names for the filter (not practice log names)
  const allSkillNames = [...skillNames].sort((a,b)=>a.localeCompare(b));
  const running = activeSessions.find(s=>s.isRunning);
  const filtered = practices.filter(p => {
    if (search && !p.skillName?.toLowerCase().includes(search.toLowerCase()) && !p.notes?.toLowerCase().includes(search.toLowerCase())) return false;
    if (fSkill && p.skillName!==fSkill) return false;
    if (fConf && p.confidence!==Number(fConf)) return false;
    if (fDate) { const d=new Date(p.date), n=new Date(); if(fDate==='today'&&d.toDateString()!==n.toDateString()) return false; if(fDate==='week'){const w=new Date(n);w.setDate(w.getDate()-7);if(d<w)return false;} if(fDate==='month'){const m=new Date(n);m.setMonth(m.getMonth()-1);if(d<m)return false;} }
    return true;
  });
  const totPages = Math.max(1,Math.ceil(filtered.length/PER_PAGE));
  const paged = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);
  useEffect(()=>{ setPage(1); },[search,fSkill,fConf,fDate]);
  useEffect(()=>{ const skillS = activeSessions.filter(s => s.skillId || s.nodeId); const freeS = activeSessions.filter(s => !s.skillId && !s.nodeId); const maxSkill = Math.max(1, Math.ceil(skillS.length / SESSIONS_PER_PAGE)); const maxFree = Math.max(1, Math.ceil(freeS.length / SESSIONS_PER_PAGE)); if (skillSessionPage > maxSkill) setSkillSessionPage(maxSkill); if (freeSessionPage > maxFree) setFreeSessionPage(maxFree); },[activeSessions.length, skillSessionPage, freeSessionPage]);
  const resetForm=()=>{setForm({skillName:'',tags:[],notes:''});setNewTag('');setTgtH(0);setTgtM(25);setCountdown(true);};
  const addTagH=(e)=>{e.preventDefault();const t=newTag.trim();if(t&&!form.tags.includes(t))setForm(p=>({...p,tags:[...p.tags,t]}));setNewTag('');};
  const getDur=(s)=>{if(!s)return{m:0,sec:0};const t=s.isCountdown?Math.max(0,s.targetTime-s.timer):s.timer;return{m:Math.max(1,Math.floor(t/60)),sec:t};};
  const fmtDur=(s)=>{const{sec}=getDur(s);const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60);return h>0?`${h}h ${m}m`:`${m}m`;};
  const canComp=(s)=>s.isCountdown?s.timer<s.targetTime:s.timer>0;
  const fmtDate=(d)=>new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  const hasFilters=search||fSkill||fConf||fDate;
  const tryStart=(now)=>{if(!form.skillName.trim())return;if(now&&running){setBlockMsg(`"${running.skillName}" is running. Pause or complete it first.`);setTimeout(()=>setBlockMsg(''),5000);return;}addSession({skillName:form.skillName.trim(),tags:form.tags,notes:form.notes,timer:countdown?tgtTime:0,targetTime:tgtTime,isCountdown:countdown,isRunning:now});resetForm();setShowNew(false);setSuccess(now?'Session started!':'Session saved.');setTimeout(()=>setSuccess(''),3000);};
  const tryToggle=(s)=>{if(!s.isRunning&&running&&running.id!==s.id){setBlockMsg(`"${running.skillName}" is running. Pause it first.`);setTimeout(()=>setBlockMsg(''),5000);return;}toggleSession(s.id);};
  const openComp=(s)=>{if(s.isCountdown&&s.timer===s.targetTime){setError('Start the timer first.');setTimeout(()=>setError(''),4000);return;}if(s.isRunning)toggleSession(s.id);setCompSess(s);setComp({notes:s.notes||'',confidence:3,blockers:'',nextStep:''});setShowComp(true);};
  const submitComp=async()=>{if(!compSess)return;setSubmitting(true);try{const{m,sec}=getDur(compSess);const response = await practiceAPI.createPractice({skillName:compSess.skillName,minutesPracticed:m,tags:compSess.tags,timerSeconds:sec,notes:comp.notes,confidence:comp.confidence,blockers:comp.blockers,nextStep:comp.nextStep,date:new Date().toISOString()});if(response.data?.xpAwarded){showXpNotification(showSuccess,response.data.xpAwarded);}removeSession(compSess.id);setShowComp(false);setCompSess(null);doFetch();setSuccess('Practice logged!');setTimeout(()=>setSuccess(''),3000);}catch(err){setError(err.response?.data?.message||'Failed');setTimeout(()=>setError(''),5000);}finally{setSubmitting(false);}};
  const doDelete=async()=>{if(delInput!=='CONFIRM'||!deleteId)return;try{await practiceAPI.deletePractice(deleteId);setDeleteId(null);setDelInput('');doFetch();}catch{setError('Failed to delete');}};
  return (<div className="flex min-h-screen bg-site-bg"><Sidebar /><main className="flex-1 overflow-y-auto w-full"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"><div><h1 className="text-2xl sm:text-3xl font-bold text-site-ink">Practice Sessions</h1><p className="text-site-muted mt-1">Log what you practiced, confidence, blockers, and next step</p></div><button onClick={()=>{resetForm();setShowNew(true);}} className="flex items-center gap-2 px-5 py-3 bg-site-accent text-white rounded-lg font-semibold hover:bg-site-accent-hover transition-colors shadow-md"><Plus className="w-5 h-5" /> New Practice</button></div>
  {success&&<div className="mb-4 bg-green-50 border border-green-300 text-green-700 p-3 rounded-lg text-sm">{success}</div>}
  {error&&<div className="mb-4 bg-red-50 border border-red-300 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
  {blockMsg&&<div className="mb-4 bg-amber-50 border border-amber-300 text-amber-800 p-3 rounded-lg text-sm flex items-center gap-2"><Info className="w-4 h-4 flex-shrink-0" />{blockMsg}</div>}
  {activeSessions.length>0&&(()=>{
  const skillSessions = activeSessions.filter(s => s.skillId || s.nodeId);
  const freeSessions = activeSessions.filter(s => !s.skillId && !s.nodeId);
  const renderCard = (s) => { const isR=s.isRunning; const isFree = !s.skillId && !s.nodeId; const isTimerDone = s.isCountdown && s.timer <= 0; const minutesCompleted = s.isCountdown ? Math.floor((s.targetTime - s.timer) / 60) : Math.floor(s.timer / 60); return (
    <div key={s.id} className={`rounded-2xl border-2 p-5 shadow-sm transition-all ${isR?'border-green-500 bg-green-50/50 shadow-green-100': isFree ? 'border-purple-200 bg-purple-50/30' : 'border-site-border bg-site-surface'}`}>
    <div className="flex items-start justify-between mb-1"><div className="flex-1 min-w-0"><h3 className="font-bold text-site-ink text-base truncate">{s.skillName}</h3><p className="text-[10px] text-site-faint uppercase tracking-wide mt-0.5">{s.isCountdown ? 'Countdown' : 'Stopwatch'} • {minutesCompleted}m completed</p>{s.notes && <p className="text-xs text-site-muted truncate mt-0.5">{s.notes}</p>}{isR&&<p className="text-xs text-green-600 font-medium flex items-center gap-1 mt-0.5"><Flame className="w-3 h-3"/>Focus mode — you got this!</p>}</div><button onClick={()=>setRemoveId(s._id??s.id)} className="text-site-faint hover:text-red-500 ml-2 p-1"><X className="w-4 h-4"/></button></div>
    {isFree ? (<>
      {s.isCountdown&&<div className="w-full h-1.5 bg-gray-200 rounded-full my-3 overflow-hidden"><div className={`h-full rounded-full transition-all duration-1000 ${isR?'bg-green-500':'bg-site-accent'}`} style={{width:`${getProgress(s)}%`}}/></div>}
      <div className={`text-3xl font-bold font-mono text-center py-3 rounded-xl mb-3 ${isTimerDone?'bg-red-100 text-red-600':isR?'bg-green-100 text-green-700':'bg-site-bg text-site-ink'}`}>{formatTimer(s.timer)}</div>
      {isTimerDone&&<p className="text-center text-red-600 text-sm font-medium mb-3">Time's up! 🎉</p>}
      <div className="flex gap-2 mb-3"><button onClick={()=>tryToggle(s)} disabled={isTimerDone} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-medium text-sm ${isTimerDone?'bg-gray-200 text-gray-400 cursor-not-allowed':isR?'bg-gray-700 text-white hover:bg-gray-800':'bg-site-accent text-white hover:bg-site-accent-hover'}`}>{isR?<Pause className="w-4 h-4"/>:<Play className="w-4 h-4"/>}{isR?'Pause':'Start'}</button><button onClick={()=>setResetConfirmId(s.id)} className="px-3 py-2.5 border border-site-border text-site-muted rounded-lg hover:bg-site-bg"><RotateCcw className="w-4 h-4"/></button></div>
      <button onClick={()=>openComp(s)} disabled={!canComp(s)} className={`w-full py-2.5 rounded-lg font-semibold text-sm ${canComp(s)?'bg-green-600 text-white hover:bg-green-700':'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>Complete & Log</button>
    </>) : (<>
      {s.isCountdown&&<div className="w-full h-1.5 bg-gray-200 rounded-full my-2 overflow-hidden"><div className={`h-full rounded-full transition-all duration-1000 ${isR?'bg-green-500':'bg-site-accent'}`} style={{width:`${getProgress(s)}%`}}/></div>}
      <div className={`text-2xl font-bold font-mono text-center py-2 rounded-xl mb-3 ${isR?'bg-green-100 text-green-700':'bg-site-bg text-site-ink'}`}>{formatTimer(s.timer)}</div>
      <button onClick={()=>navigate(`/skills/${s.skillId}/nodes/${s.nodeId}`)} className="w-full flex items-center justify-center gap-2 py-2.5 bg-site-accent text-white rounded-lg font-medium text-sm hover:bg-site-accent-hover"><ExternalLink className="w-4 h-4"/>Go to Node</button>
    </>)}
    {s.tags?.length>0&&<div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-site-border">{s.tags.map(t=><span key={t} className="px-2 py-0.5 bg-site-soft text-site-accent text-[10px] rounded-full">{t}</span>)}</div>}
    </div>);};
  return (<div className="mb-8 space-y-6">
    {skillSessions.length>0&&(()=>{ const sorted = [...skillSessions].sort((a,b)=>new Date(b.startedAt||0)-new Date(a.startedAt||0)); const totalPages = Math.ceil(sorted.length / SESSIONS_PER_PAGE); const paged = sorted.slice((skillSessionPage-1)*SESSIONS_PER_PAGE, skillSessionPage*SESSIONS_PER_PAGE); return (<div>
      <div className="flex items-center gap-2 mb-3"><div className="w-2 h-2 bg-site-accent rounded-full"/><h2 className="text-base font-semibold text-site-ink">Skill Map Sessions</h2><span className="text-xs text-site-faint">({skillSessions.length})</span></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{paged.map(renderCard)}</div>
      {totalPages>1&&<div className="flex items-center justify-center gap-2 mt-3"><button onClick={()=>setSkillSessionPage(p=>Math.max(1,p-1))} disabled={skillSessionPage===1} className="p-2 rounded-lg border border-site-border text-site-muted hover:bg-site-bg disabled:opacity-30"><ChevronLeft className="w-4 h-4"/></button><span className="text-sm text-site-muted">Page {skillSessionPage} of {totalPages}</span><button onClick={()=>setSkillSessionPage(p=>Math.min(totalPages,p+1))} disabled={skillSessionPage>=totalPages} className="p-2 rounded-lg border border-site-border text-site-muted hover:bg-site-bg disabled:opacity-30"><ChevronRight className="w-4 h-4"/></button></div>}
    </div>);})()}
    {freeSessions.length>0&&(()=>{ const sorted = [...freeSessions].sort((a,b)=>new Date(b.startedAt||0)-new Date(a.startedAt||0)); const totalPages = Math.ceil(sorted.length / SESSIONS_PER_PAGE); const paged = sorted.slice((freeSessionPage-1)*SESSIONS_PER_PAGE, freeSessionPage*SESSIONS_PER_PAGE); return (<div>
      <div className="flex items-center gap-2 mb-3"><div className="w-2 h-2 bg-purple-500 rounded-full"/><h2 className="text-base font-semibold text-site-ink">Free Practice</h2><span className="text-xs text-site-faint">({freeSessions.length})</span></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{paged.map(renderCard)}</div>
      {totalPages>1&&<div className="flex items-center justify-center gap-2 mt-3"><button onClick={()=>setFreeSessionPage(p=>Math.max(1,p-1))} disabled={freeSessionPage===1} className="p-2 rounded-lg border border-site-border text-site-muted hover:bg-site-bg disabled:opacity-30"><ChevronLeft className="w-4 h-4"/></button><span className="text-sm text-site-muted">Page {freeSessionPage} of {totalPages}</span><button onClick={()=>setFreeSessionPage(p=>Math.min(totalPages,p+1))} disabled={freeSessionPage>=totalPages} className="p-2 rounded-lg border border-site-border text-site-muted hover:bg-site-bg disabled:opacity-30"><ChevronRight className="w-4 h-4"/></button></div>}
    </div>);})()}
  </div>);})()}
  <div><div className="flex items-center gap-2 mb-4"><CheckCircle className="w-5 h-5 text-site-accent"/><h2 className="text-lg font-semibold text-site-ink">Completed Sessions</h2><span className="text-xs text-site-faint">({filtered.length})</span></div>
  <div className="bg-site-surface rounded-xl p-4 mb-4 border border-site-border shadow-sm"><div className="flex flex-col sm:flex-row gap-3 mb-3"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-site-faint"/><input type="text" placeholder="Search skills or notes..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border-2 border-transparent rounded-lg outline-none focus:border-site-accent bg-site-bg focus:bg-white text-sm"/></div></div>
  <div className="flex flex-wrap gap-2"><DropFilter label="All Skills" value={fSkill} onChange={setFSkill} options={allSkillNames.map(s=>({value:s,label:s}))} />
  <DropFilter label="Any Confidence" value={fConf} onChange={setFConf} options={[1,2,3,4,5].map(n=>({value:String(n),label:`${n} — ${CONF[n]}`}))} />
  <DropFilter label="All Time" value={fDate} onChange={setFDate} options={[{value:'today',label:'Today'},{value:'week',label:'This Week'},{value:'month',label:'This Month'}]} />
  {hasFilters&&<button onClick={()=>{setSearch('');setFSkill('');setFConf('');setFDate('');}} className="px-3 py-1.5 text-xs text-site-accent font-medium hover:underline">Clear all</button>}</div></div>
  {loading?(<div className="text-center py-12"><div className="animate-spin w-8 h-8 border-4 border-site-accent border-t-transparent rounded-full mx-auto mb-4"/><p className="text-site-muted">Loading...</p></div>):filtered.length===0?(<div className="text-center py-12 bg-site-surface rounded-xl border border-site-border"><FileText className="w-12 h-12 text-site-faint mx-auto mb-4"/><h3 className="text-lg font-medium text-site-ink mb-2">No sessions found</h3><p className="text-site-muted">{hasFilters?'Try adjusting filters':'Complete a session to see it here'}</p></div>):(<>
  <div className="space-y-2">{paged.map(p=>{const open=expandedId===p._id;return(<div key={p._id} className="bg-site-surface rounded-xl border border-site-border shadow-sm overflow-hidden">
  <button type="button" onClick={()=>setExpandedId(open?null:p._id)} className="w-full flex items-center gap-3 p-4 text-left hover:bg-site-bg/50 transition-colors">
  <div className="w-9 h-9 rounded-full bg-site-soft flex items-center justify-center flex-shrink-0"><span className="text-site-accent font-semibold text-sm">{p.skillName?.charAt(0).toUpperCase()}</span></div>
  <div className="flex-1 min-w-0"><p className="font-medium text-site-ink truncate">{p.skillName}</p><p className="text-xs text-site-faint">{p.minutesPracticed} min · {fmtDate(p.date)}</p></div>
  {p.confidence&&<div className="hidden sm:flex gap-0.5 mr-2">{[1,2,3,4,5].map(i=><Star key={i} className={`w-3 h-3 ${i<=p.confidence?'text-yellow-500 fill-yellow-500':'text-gray-300'}`}/>)}</div>}
  {open?<ChevronUp className="w-4 h-4 text-site-faint"/>:<ChevronDown className="w-4 h-4 text-site-faint"/>}</button>
  {open&&(<div className="px-4 pb-4 pt-0 border-t border-site-border"><div className="grid sm:grid-cols-2 gap-4 mt-4">
  <div className="space-y-3">{p.confidence&&<div><p className="text-xs font-medium text-site-faint uppercase tracking-wide mb-1">Confidence</p><div className="flex items-center gap-2"><div className="flex gap-0.5">{[1,2,3,4,5].map(i=><Star key={i} className={`w-4 h-4 ${i<=p.confidence?'text-yellow-500 fill-yellow-500':'text-gray-300'}`}/>)}</div><span className="text-sm text-site-muted">{CONF[p.confidence]}</span></div></div>}
  <div><p className="text-xs font-medium text-site-faint uppercase tracking-wide mb-1">Duration</p><p className="text-sm text-site-ink">{p.minutesPracticed} minutes</p></div>
  {p.tags?.length>0&&<div><p className="text-xs font-medium text-site-faint uppercase tracking-wide mb-1">Tags</p><div className="flex flex-wrap gap-1.5">{p.tags.map(t=><span key={t} className="px-2 py-0.5 bg-site-soft text-site-accent text-xs rounded-full">{t}</span>)}</div></div>}</div>
  <div className="space-y-3">{p.notes&&<div><p className="text-xs font-medium text-site-faint uppercase tracking-wide mb-1">Notes</p><p className="text-sm text-site-ink">{p.notes}</p></div>}
  {p.blockers&&<div><p className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/>Blockers</p><p className="text-sm text-site-ink">{p.blockers}</p></div>}
  {p.nextStep&&<div><p className="text-xs font-medium text-site-accent uppercase tracking-wide mb-1 flex items-center gap-1"><ArrowRight className="w-3 h-3"/>Next Step</p><p className="text-sm text-site-ink">{p.nextStep}</p></div>}</div></div>
  <div className="mt-4 pt-3 border-t border-site-border flex justify-end"><button onClick={()=>{setDeleteId(p._id);setDelInput('');}} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg font-medium"><Trash2 className="w-3.5 h-3.5"/>Delete</button></div></div>)}
  </div>);})}</div>
  {totPages>1&&<div className="flex items-center justify-center gap-2 mt-6"><button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="p-2 rounded-lg border border-site-border text-site-muted hover:bg-site-bg disabled:opacity-30"><ChevronLeft className="w-4 h-4"/></button><span className="text-sm text-site-muted">Page {page} of {totPages}</span><button onClick={()=>setPage(p=>Math.min(totPages,p+1))} disabled={page===totPages} className="p-2 rounded-lg border border-site-border text-site-muted hover:bg-site-bg disabled:opacity-30"><ChevronRight className="w-4 h-4"/></button></div>}
  </>)}</div>
  </div></main>
  {showNew&&(<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-site-surface rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
  <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-bold text-site-ink">New Practice Session</h2><button onClick={()=>setShowNew(false)} className="text-site-faint hover:text-site-ink"><X className="w-5 h-5"/></button></div>
  <div className="mb-4"><label className="block text-sm font-medium text-site-ink mb-1.5">Session Name * <span className="text-xs text-site-faint font-normal">({form.skillName.length}/20)</span></label><input type="text" value={form.skillName} onChange={e=>setForm(p=>({...p,skillName:e.target.value.slice(0,20)}))} placeholder="e.g. Python, Guitar" maxLength={20} className="w-full px-4 py-2.5 border-2 border-transparent rounded-lg outline-none focus:border-site-accent bg-site-bg focus:bg-white text-sm"/></div>
  <div className="mb-4"><label className="block text-sm font-medium text-site-ink mb-1.5">Timer</label><div className="flex gap-2 mb-3"><button onClick={()=>setCountdown(true)} className={`flex-1 py-2 rounded-lg text-sm font-medium ${countdown?'bg-site-accent text-white':'bg-site-bg text-site-muted border border-site-border'}`}>Countdown</button><button onClick={()=>setCountdown(false)} className={`flex-1 py-2 rounded-lg text-sm font-medium ${!countdown?'bg-site-accent text-white':'bg-site-bg text-site-muted border border-site-border'}`}>Stopwatch</button></div>
  {countdown&&<div className="flex gap-3"><div className="flex-1"><label className="block text-xs text-site-faint mb-1">Hours</label><input type="number" min={0} max={12} value={tgtH} onChange={e=>{const val=e.target.value;setTgtH(val===''?0:Math.max(0,Math.min(12,parseInt(val)||0)));}} onFocus={e=>e.target.select()} className="w-full px-3 py-2 border-2 border-transparent rounded-lg outline-none focus:border-site-accent bg-site-bg focus:bg-white text-sm text-center"/></div><div className="flex-1"><label className="block text-xs text-site-faint mb-1">Minutes</label><input type="number" min={0} max={59} value={tgtM} onChange={e=>{const val=e.target.value;setTgtM(val===''?0:Math.max(0,Math.min(59,parseInt(val)||0)));}} onFocus={e=>e.target.select()} className="w-full px-3 py-2 border-2 border-transparent rounded-lg outline-none focus:border-site-accent bg-site-bg focus:bg-white text-sm text-center"/></div></div>}</div>
  <div className="mb-4"><label className="block text-sm font-medium text-site-ink mb-1.5">Tags <span className="text-xs text-site-faint font-normal">({form.tags.length}/10)</span></label><form onSubmit={addTagH} className="flex gap-2"><input type="text" value={newTag} onChange={e=>setNewTag(e.target.value.slice(0,10))} placeholder="Add a tag" maxLength={10} className="flex-1 px-3 py-2 border-2 border-transparent rounded-lg outline-none focus:border-site-accent bg-site-bg focus:bg-white text-sm"/><button type="submit" disabled={form.tags.length>=10} className="px-3 py-2 bg-site-accent text-white rounded-lg text-sm font-medium hover:bg-site-accent-hover disabled:opacity-40 disabled:cursor-not-allowed">Add</button></form>
  {form.tags.length>0&&<div className="flex flex-wrap gap-1.5 mt-2">{form.tags.map(t=><span key={t} className="flex items-center gap-1 px-2 py-0.5 bg-site-soft text-site-accent text-xs rounded-full">{t}<button type="button" onClick={()=>setForm(p=>({...p,tags:p.tags.filter(x=>x!==t)}))} className="hover:text-red-500"><X className="w-3 h-3"/></button></span>)}</div>}</div>
  <div className="flex gap-3 pt-2"><button onClick={()=>tryStart(true)} disabled={!form.skillName.trim()||(countdown&&tgtH===0&&tgtM===0)} className="flex-1 py-2.5 bg-site-accent text-white rounded-lg font-medium hover:bg-site-accent-hover disabled:opacity-40 disabled:cursor-not-allowed">Start Now</button><button onClick={()=>tryStart(false)} disabled={!form.skillName.trim()||(countdown&&tgtH===0&&tgtM===0)} className="flex-1 py-2.5 border border-site-border text-site-ink rounded-lg font-medium hover:bg-site-soft disabled:opacity-40 disabled:cursor-not-allowed">Start Later</button></div>
  </div></div>)}
  {showComp&&compSess&&(<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-site-surface rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
  <div className="flex items-center justify-between mb-4"><h2 className="text-xl font-bold text-site-ink">Complete Session</h2><button onClick={()=>{setShowComp(false);setCompSess(null);}} className="text-site-faint hover:text-site-ink"><X className="w-5 h-5"/></button></div>
  <div className="bg-site-bg rounded-lg p-4 mb-5"><p className="font-semibold text-site-ink">{compSess.skillName}</p><p className="text-sm text-site-muted">Duration: {fmtDur(compSess)}</p></div>
  <div className="mb-5"><label className="block text-sm font-medium text-site-ink mb-2">How confident do you feel? *</label><div className="flex gap-1.5">{[1,2,3,4,5].map(n=>(<button key={n} onClick={()=>setComp(p=>({...p,confidence:n}))} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${comp.confidence===n?'bg-site-accent text-white shadow-md scale-105':'bg-site-bg text-site-muted border border-site-border hover:border-site-accent'}`}><Star className={`w-4 h-4 mx-auto mb-0.5 ${comp.confidence===n?'fill-white':''}`}/>{n}</button>))}</div><p className="text-xs text-site-faint mt-1.5 text-center">{CONF[comp.confidence]}</p></div>
  <div className="mb-4"><label className="block text-sm font-medium text-site-ink mb-1.5">What did you practice? <span className="text-xs text-site-faint font-normal">({comp.notes.length}/50)</span></label><textarea value={comp.notes} onChange={e=>setComp(p=>({...p,notes:e.target.value.slice(0,50)}))} placeholder="Describe what you worked on..." rows={2} maxLength={50} className="w-full px-4 py-2.5 border-2 border-transparent rounded-lg outline-none focus:border-site-accent bg-site-bg focus:bg-white text-sm resize-none"/></div>
  <div className="mb-4"><label className="block text-sm font-medium text-site-ink mb-1.5 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-amber-500"/>Any blockers? <span className="text-xs text-site-faint font-normal">({comp.blockers.length}/50)</span></label><textarea value={comp.blockers} onChange={e=>setComp(p=>({...p,blockers:e.target.value.slice(0,50)}))} placeholder="What was difficult?" rows={2} maxLength={50} className="w-full px-4 py-2.5 border-2 border-transparent rounded-lg outline-none focus:border-site-accent bg-site-bg focus:bg-white text-sm resize-none"/></div>
  <div className="mb-5"><label className="block text-sm font-medium text-site-ink mb-1.5 flex items-center gap-1.5"><ArrowRight className="w-4 h-4 text-site-accent"/>Next step? <span className="text-xs text-site-faint font-normal">({comp.nextStep.length}/50)</span></label><textarea value={comp.nextStep} onChange={e=>setComp(p=>({...p,nextStep:e.target.value.slice(0,50)}))} placeholder="What will you focus on next?" rows={2} maxLength={50} className="w-full px-4 py-2.5 border-2 border-transparent rounded-lg outline-none focus:border-site-accent bg-site-bg focus:bg-white text-sm resize-none"/></div>
  <button onClick={submitComp} disabled={submitting} className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50">{submitting?'Saving...':'Save Practice Log'}</button>
  </div></div>)}
  {resetConfirmId!=null&&(<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"><div className="bg-site-surface rounded-2xl shadow-xl w-full max-w-sm p-6">
  <h2 className="text-lg font-bold text-site-ink mb-2">Restart timer?</h2><p className="text-sm text-site-muted mb-4">Your progress won't be saved. Are you sure?</p>
  <div className="flex gap-3"><button onClick={()=>setResetConfirmId(null)} className="flex-1 py-2.5 border border-site-border text-site-muted rounded-lg font-medium hover:bg-site-bg">No</button><button onClick={()=>{resetSession(resetConfirmId);setResetConfirmId(null);}} className="flex-1 py-2.5 bg-site-accent text-white rounded-lg font-medium hover:bg-site-accent-hover">Yes</button></div>
  </div></div>)}
  {removeId!=null&&(<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"><div className="bg-site-surface rounded-2xl shadow-xl w-full max-w-sm p-6">
  <h2 className="text-lg font-bold text-site-ink mb-2">Remove session?</h2><p className="text-sm text-site-muted mb-4">This will discard the session and unsaved progress.</p>
  <div className="flex gap-3"><button onClick={()=>setRemoveId(null)} className="flex-1 py-2.5 border border-site-border text-site-muted rounded-lg font-medium hover:bg-site-bg">Cancel</button><button onClick={()=>{removeSession(removeId);setRemoveId(null);}} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700">Remove</button></div>
  </div></div>)}
  {deleteId&&(<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"><div className="bg-site-surface rounded-2xl shadow-xl w-full max-w-sm p-6">
  <h2 className="text-lg font-bold text-site-ink mb-2">Delete this session?</h2><p className="text-sm text-site-muted mb-4">Type <span className="font-mono font-semibold text-site-ink">CONFIRM</span> to delete.</p>
  <input type="text" value={delInput} onChange={e=>setDelInput(e.target.value)} placeholder="Type CONFIRM" className="w-full px-4 py-2.5 border-2 border-transparent rounded-lg outline-none focus:border-red-500 bg-site-bg focus:bg-white font-mono text-sm mb-4"/>
  <div className="flex gap-3"><button onClick={()=>{setDeleteId(null);setDelInput('');}} className="flex-1 py-2.5 border border-site-border text-site-muted rounded-lg font-medium hover:bg-site-bg">Cancel</button><button onClick={doDelete} disabled={delInput!=='CONFIRM'} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed">Delete</button></div>
  </div></div>)}
  </div>);}

// Custom dropdown that uses app theme colors instead of browser blue
function DropFilter({ label, value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const selected = options.find(o => o.value === value);
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${value ? 'border-site-accent bg-site-soft text-site-accent' : 'border-site-border bg-site-bg text-site-muted hover:border-site-accent'}`}>
        {selected ? selected.label : label}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-48 max-h-52 overflow-y-auto bg-site-surface border border-site-border rounded-lg shadow-lg z-30">
          <button type="button" onClick={() => { onChange(''); setOpen(false); }}
            className={`w-full text-left px-3 py-2 text-xs transition-colors ${!value ? 'bg-site-soft text-site-accent font-medium' : 'text-site-ink hover:bg-site-soft'}`}>
            {label}
          </button>
          {options.map(o => (
            <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors truncate ${value === o.value ? 'bg-site-soft text-site-accent font-medium' : 'text-site-ink hover:bg-site-soft'}`}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
