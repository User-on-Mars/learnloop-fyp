import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { practiceAPI, skillsAPI } from '../api/client';
import { useActiveSessions } from '../context/ActiveSessionContext';
import { useToast } from '../context/ToastContext';
import { showXpNotification } from '../utils/xpNotifications';
import Sidebar from '../components/Sidebar';
import FilterDropdown from '../components/FilterDropdown';
import {
  Play, Pause, RotateCcw, Plus, X, Search, FileText, Trash2,
  CheckCircle, Star, AlertTriangle, ArrowRight, ChevronDown,
  ChevronUp, ChevronLeft, ChevronRight, Flame, Info, ExternalLink,
  Clock, Timer, Target, Zap, BarChart3, History,
} from 'lucide-react';

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
    try {
      setLoading(true);
      const [r, sk] = await Promise.all([
        practiceAPI.getPractices({ limit:200 }),
        skillsAPI.getAll().catch(()=>({data:{skills:[]}}))
      ]);
      setPractices(r.data.practices||r.data||[]);
      setSkillNames((sk.data.skills||[]).map(s=>s.name));
    } catch {
      setError('Failed to load');
      setTimeout(()=>setError(''),6000);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(()=>{ doFetch(); },[doFetch]);

  const tgtTime = tgtH*3600+tgtM*60;
  const allSkillNames = [...skillNames].sort((a,b)=>a.localeCompare(b));
  const running = activeSessions.find(s=>s.isRunning);

  const filtered = practices.filter(p => {
    if (search && !p.skillName?.toLowerCase().includes(search.toLowerCase()) && !p.notes?.toLowerCase().includes(search.toLowerCase())) return false;
    if (fSkill && p.skillName!==fSkill) return false;
    if (fConf && p.confidence!==Number(fConf)) return false;
    if (fDate) {
      const d=new Date(p.date), n=new Date();
      if(fDate==='today'&&d.toDateString()!==n.toDateString()) return false;
      if(fDate==='week'){const w=new Date(n);w.setDate(w.getDate()-7);if(d<w)return false;}
      if(fDate==='month'){const m=new Date(n);m.setMonth(m.getMonth()-1);if(d<m)return false;}
    }
    return true;
  });

  const totPages = Math.max(1,Math.ceil(filtered.length/PER_PAGE));
  const paged = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE);

  useEffect(()=>{ setPage(1); },[search,fSkill,fConf,fDate]);

  useEffect(()=>{
    const skillS = activeSessions.filter(s => s.skillId || s.nodeId);
    const freeS = activeSessions.filter(s => !s.skillId && !s.nodeId);
    const maxSkill = Math.max(1, Math.ceil(skillS.length / SESSIONS_PER_PAGE));
    const maxFree = Math.max(1, Math.ceil(freeS.length / SESSIONS_PER_PAGE));
    if (skillSessionPage > maxSkill) setSkillSessionPage(maxSkill);
    if (freeSessionPage > maxFree) setFreeSessionPage(maxFree);
  },[activeSessions.length, skillSessionPage, freeSessionPage]);

  const resetForm=()=>{setForm({skillName:'',tags:[],notes:''});setNewTag('');setTgtH(0);setTgtM(25);setCountdown(true);};
  const addTagH=(e)=>{e.preventDefault();const t=newTag.trim();if(t&&!form.tags.includes(t))setForm(p=>({...p,tags:[...p.tags,t]}));setNewTag('');};
  const getDur=(s)=>{if(!s)return{m:0,sec:0};const t=s.isCountdown?Math.max(0,s.targetTime-s.timer):s.timer;return{m:Math.max(1,Math.floor(t/60)),sec:t};};
  const fmtDur=(s)=>{const{sec}=getDur(s);const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60);return h>0?`${h}h ${m}m`:`${m}m`;};
  const canComp=(s)=>{
    if(!s) return false;
    const elapsed = s.isCountdown ? (s.targetTime - s.timer) : s.timer;
    return elapsed >= 60;
  };
  const fmtDate=(d)=>new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  const hasFilters=search||fSkill||fConf||fDate;

  const tryStart=(now)=>{
    if(!form.skillName.trim())return;
    if(now&&running){
      setBlockMsg(`"${running.skillName}" is running. Pause or complete it first.`);
      setTimeout(()=>setBlockMsg(''),5000);
      return;
    }
    addSession({
      skillName:form.skillName.trim(),
      tags:form.tags,
      notes:form.notes,
      timer:countdown?tgtTime:0,
      targetTime:tgtTime,
      isCountdown:countdown,
      isRunning:now
    });
    resetForm();
    setShowNew(false);
    setSuccess(now?'Session started!':'Session saved.');
    setTimeout(()=>setSuccess(''),3000);
  };

  const tryToggle=(s)=>{
    if(!s.isRunning&&running&&running.id!==s.id){
      setBlockMsg(`"${running.skillName}" is running. Pause it first.`);
      setTimeout(()=>setBlockMsg(''),5000);
      return;
    }
    toggleSession(s.id);
  };

  const openComp=(s)=>{
    const elapsed = s.isCountdown ? (s.targetTime - s.timer) : s.timer;
    if(elapsed < 60){
      setError('Session must be at least 1 minute to log.');
      setTimeout(()=>setError(''),4000);
      return;
    }
    if(s.isCountdown&&s.timer===s.targetTime){
      setError('Start the timer first.');
      setTimeout(()=>setError(''),4000);
      return;
    }
    if(s.isRunning)toggleSession(s.id);
    setCompSess(s);
    setComp({notes:s.notes||'',confidence:3,blockers:'',nextStep:''});
    setShowComp(true);
  };

  const submitComp=async()=>{
    if(!compSess)return;
    setSubmitting(true);
    try{
      const{m,sec}=getDur(compSess);
      const response = await practiceAPI.createPractice({
        skillName:compSess.skillName,
        minutesPracticed:m,
        tags:compSess.tags,
        timerSeconds:sec,
        notes:comp.notes,
        confidence:comp.confidence,
        blockers:comp.blockers,
        nextStep:comp.nextStep,
        date:new Date().toISOString()
      });
      if(response.data?.xpAwarded){
        showXpNotification(showSuccess,response.data.xpAwarded);
      }
      removeSession(compSess.id);
      setShowComp(false);
      setCompSess(null);
      doFetch();
      setSuccess('Practice logged!');
      setTimeout(()=>setSuccess(''),3000);
    }catch(err){
      setError(err.response?.data?.message||'Failed');
      setTimeout(()=>setError(''),5000);
    }finally{
      setSubmitting(false);
    }
  };

  const doDelete=async()=>{
    if(delInput!=='CONFIRM'||!deleteId)return;
    try{
      await practiceAPI.deletePractice(deleteId);
      setDeleteId(null);
      setDelInput('');
      doFetch();
    }catch{
      setError('Failed to delete');
    }
  };

  /* ── Derived counts for the hero stats ── */
  const totalLogged = practices.length;
  const totalMinutes = practices.reduce((s,p) => s + (p.minutesPracticed||0), 0);
  const totalHrs = Math.floor(totalMinutes / 60);
  const totalMins = totalMinutes % 60;
  const activeCount = activeSessions.length;

  return (
    <div className="flex min-h-screen bg-[#eef0ea]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto w-full pt-16 md:pl-14">
        <div className="px-4 sm:px-6 py-6 space-y-5">

          {/* ═══ Hero header ═══ */}
          <div className="relative overflow-hidden bg-white rounded-2xl border border-[#e2e6dc] p-6 sm:p-8">
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#a3c99a] opacity-10 blur-3xl pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
              <div>
                <h1 className="text-2xl font-bold text-[#1c1f1a] flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#edf5e9] flex items-center justify-center">
                    <Timer className="w-5 h-5 text-[#2e5023]" />
                  </div>
                  Practice Sessions
                </h1>
                <p className="text-sm text-[#565c52] mt-1.5 ml-[52px]">Track your learning with timers, notes, and confidence ratings</p>
              </div>
              <button onClick={()=>{resetForm();setShowNew(true);}}
                className="flex items-center gap-2 px-6 py-3 bg-[#2e5023] text-white rounded-xl font-semibold text-sm hover:bg-[#4f7942] transition-all shadow-md shadow-[#2e5023]/15 active:scale-[0.97] self-start sm:self-center">
                <Plus className="w-4 h-4" /> New Session
              </button>
            </div>

            {/* Quick stats */}
            <div className="relative grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-[#e8ece3]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Clock className="w-4.5 h-4.5 text-blue-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-[#1c1f1a] leading-none">{totalHrs}h {totalMins}m</p>
                  <p className="text-[11px] text-[#9aa094] mt-0.5">Total practice</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <BarChart3 className="w-4.5 h-4.5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-[#1c1f1a] leading-none">{totalLogged}</p>
                  <p className="text-[11px] text-[#9aa094] mt-0.5">Sessions logged</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Zap className="w-4.5 h-4.5 text-amber-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-[#1c1f1a] leading-none">{activeCount}</p>
                  <p className="text-[11px] text-[#9aa094] mt-0.5">Active now</p>
                </div>
              </div>
            </div>
          </div>

          {/* ═══ Alerts ═══ */}
          {success && <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-medium"><CheckCircle className="w-4 h-4 flex-shrink-0" />{success}</div>}
          {error && <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium"><AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}</div>}
          {blockMsg && <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm font-medium"><Info className="w-4 h-4 flex-shrink-0" />{blockMsg}</div>}

          {/* ═══ Active Sessions ═══ */}
          {activeSessions.length > 0 && (() => {
            const skillSessions = activeSessions.filter(s => s.skillId || s.nodeId);
            const freeSessions = activeSessions.filter(s => !s.skillId && !s.nodeId);

            const renderCard = (s) => {
              const isR = s.isRunning;
              const isFree = !s.skillId && !s.nodeId;
              const isTimerDone = s.isCountdown && s.timer <= 0;
              const minutesCompleted = s.isCountdown ? Math.floor((s.targetTime - s.timer) / 60) : Math.floor(s.timer / 60);
              const elapsed = s.isCountdown ? (s.targetTime - s.timer) : s.timer;
              const meetsMinimum = elapsed >= 60;
              const secondsRemaining = meetsMinimum ? 0 : (60 - elapsed);

              return (
                <div key={s.id} className={`rounded-2xl border-2 p-5 transition-all ${
                  isR ? 'border-[#4f7942] bg-[#f4f9f1] shadow-lg shadow-[#2e5023]/8' :
                  isFree ? 'border-purple-200 bg-purple-50/30 shadow-sm' :
                  'border-[#e2e6dc] bg-white shadow-sm'
                }`}>
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {isR && <span className="w-2 h-2 rounded-full bg-[#4f7942] animate-pulse" />}
                        <h3 className="font-bold text-[#1c1f1a] text-[15px] truncate">{s.skillName}</h3>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#9aa094]">
                        <span className="px-1.5 py-0.5 bg-[#f0f2eb] rounded text-[10px] font-medium">{s.isCountdown ? 'Countdown' : 'Stopwatch'}</span>
                        <span>·</span>
                        <span>{minutesCompleted}m done</span>
                      </div>
                      {s.notes && <p className="text-xs text-[#565c52] truncate mt-1">{s.notes}</p>}
                    </div>
                    <button onClick={()=>setRemoveId(s._id??s.id)} className="text-[#c8cec0] hover:text-red-500 p-1 transition-colors"><X className="w-4 h-4"/></button>
                  </div>

                  {isR && <p className="text-xs text-[#2e5023] font-medium flex items-center gap-1.5 mb-3 bg-[#edf5e9] px-3 py-1.5 rounded-lg"><Flame className="w-3.5 h-3.5"/>Focus mode — you got this!</p>}

                  {isFree ? (<>
                    {/* Progress bar */}
                    {s.isCountdown && <div className="w-full h-2 bg-[#e8ece3] rounded-full my-3 overflow-hidden"><div className={`h-full rounded-full transition-all duration-1000 ${isR?'bg-[#4f7942]':'bg-[#2e5023]'}`} style={{width:`${getProgress(s)}%`}}/></div>}

                    {/* Timer display */}
                    <div className={`text-4xl font-bold font-mono text-center py-4 rounded-xl mb-4 ${
                      isTimerDone ? 'bg-red-50 text-red-600 border border-red-200' :
                      isR ? 'bg-[#edf5e9] text-[#2e5023] border border-[#d4e8cc]' :
                      'bg-[#f4f7f2] text-[#1c1f1a] border border-[#e2e6dc]'
                    }`}>
                      {formatTimer(s.timer)}
                    </div>
                    {isTimerDone && <p className="text-center text-red-600 text-sm font-semibold mb-3 flex items-center justify-center gap-1.5">Time's up! <CheckCircle className="w-4 h-4" /></p>}

                    {/* Controls */}
                    <div className="flex gap-2 mb-3">
                      <button onClick={()=>tryToggle(s)} disabled={isTimerDone}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                          isTimerDone ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                          isR ? 'bg-[#1c1f1a] text-white hover:bg-[#333]' :
                          'bg-[#2e5023] text-white hover:bg-[#4f7942] shadow-sm'
                        }`}>
                        {isR?<Pause className="w-4 h-4"/>:<Play className="w-4 h-4"/>}{isR?'Pause':'Start'}
                      </button>
                      <button onClick={()=>setResetConfirmId(s.id)} className="px-3 py-2.5 border border-[#e2e6dc] text-[#9aa094] rounded-xl hover:bg-[#f4f7f2] hover:text-[#565c52] transition-colors"><RotateCcw className="w-4 h-4"/></button>
                    </div>
                    <button onClick={()=>openComp(s)} disabled={!canComp(s)}
                      className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-all ${
                        canComp(s) ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}>
                      {meetsMinimum ? '✓ Complete & Log' : `${secondsRemaining}s until 1 min`}
                    </button>
                  </>) : (<>
                    {s.isCountdown && <div className="w-full h-2 bg-[#e8ece3] rounded-full my-2 overflow-hidden"><div className={`h-full rounded-full transition-all duration-1000 ${isR?'bg-[#4f7942]':'bg-[#2e5023]'}`} style={{width:`${getProgress(s)}%`}}/></div>}
                    <div className={`text-3xl font-bold font-mono text-center py-3 rounded-xl mb-3 ${isR?'bg-[#edf5e9] text-[#2e5023] border border-[#d4e8cc]':'bg-[#f4f7f2] text-[#1c1f1a] border border-[#e2e6dc]'}`}>{formatTimer(s.timer)}</div>
                    <button onClick={()=>{ if (s.roomId && s.roomSkillMapId) { navigate(`/roomspace/${s.roomId}/skill-maps/${s.roomSkillMapId}/nodes/${s.nodeId}`); } else { navigate(`/skills/${s.skillId}/nodes/${s.nodeId}`); } }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#2e5023] text-white rounded-xl font-semibold text-sm hover:bg-[#4f7942] transition-all shadow-sm">
                      <ExternalLink className="w-4 h-4"/>Go to Node
                    </button>
                  </>)}

                  {s.tags?.length > 0 && <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-[#e8ece3]">{s.tags.map(t=><span key={t} className="px-2.5 py-0.5 bg-[#edf5e9] text-[#2e5023] text-[10px] font-medium rounded-full border border-[#d4e8cc]">{t}</span>)}</div>}
                </div>
              );
            };

            const renderSection = (title, icon, iconColor, sessions, sessionPage, setSessionPage) => {
              if (sessions.length === 0) return null;
              const sorted = [...sessions].sort((a,b)=>new Date(b.startedAt||0)-new Date(a.startedAt||0));
              const totalPages = Math.ceil(sorted.length / SESSIONS_PER_PAGE);
              const pagedSessions = sorted.slice((sessionPage-1)*SESSIONS_PER_PAGE, sessionPage*SESSIONS_PER_PAGE);
              return (
                <div>
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className={`w-2.5 h-2.5 rounded-full ${iconColor}`} />
                    <h2 className="text-[15px] font-bold text-[#1c1f1a]">{title}</h2>
                    <span className="text-xs text-[#9aa094] bg-[#f0f2eb] px-2 py-0.5 rounded-full font-medium">{sessions.length}</span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{pagedSessions.map(renderCard)}</div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 mt-4">
                      <button onClick={()=>setSessionPage(p=>Math.max(1,p-1))} disabled={sessionPage===1} className="p-2 rounded-lg border border-[#e2e6dc] text-[#9aa094] hover:bg-[#f4f7f2] disabled:opacity-30 transition-colors"><ChevronLeft className="w-4 h-4"/></button>
                      <span className="text-[12px] text-[#9aa094]">Page <span className="font-bold text-[#1c1f1a]">{sessionPage}</span> of <span className="font-bold text-[#1c1f1a]">{totalPages}</span></span>
                      <button onClick={()=>setSessionPage(p=>Math.min(totalPages,p+1))} disabled={sessionPage>=totalPages} className="p-2 rounded-lg border border-[#e2e6dc] text-[#9aa094] hover:bg-[#f4f7f2] disabled:opacity-30 transition-colors"><ChevronRight className="w-4 h-4"/></button>
                    </div>
                  )}
                </div>
              );
            };

            return (
              <div className="space-y-6">
                {renderSection('Skill Map Sessions', Target, 'bg-[#2e5023]', skillSessions, skillSessionPage, setSkillSessionPage)}
                {renderSection('Free Practice', Zap, 'bg-purple-500', freeSessions, freeSessionPage, setFreeSessionPage)}
              </div>
            );
          })()}

          {/* ═══ Completed Sessions ═══ */}
          <div>
            {/* Section header */}
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[#edf5e9] flex items-center justify-center border border-[#d4e8cc]">
                <History className="w-4.5 h-4.5 text-[#2e5023]" />
              </div>
              <div>
                <h2 className="text-[17px] font-bold text-[#1c1f1a]">Completed Sessions</h2>
                <p className="text-[11px] text-[#9aa094]">{filtered.length} session{filtered.length !== 1 ? 's' : ''}</p>
              </div>
            </div>

            {/* ── Filter Card ── */}
            <div className="bg-white rounded-2xl border border-[#e2e6dc] mb-4">
              <div className="px-5 py-4 bg-[#f8faf6] rounded-2xl">
                <div className="relative mb-3">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#c8cec0]"/>
                  <input type="text" placeholder="Search skills or notes..." value={search} onChange={e=>setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-[#e2e6dc] rounded-xl outline-none focus:border-[#4f7942] focus:ring-2 focus:ring-[#4f7942]/15 bg-white text-sm text-[#1c1f1a] placeholder:text-[#c8cec0] transition-all"/>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <FilterDropdown value={fSkill || 'all'} onChange={v => setFSkill(v === 'all' ? '' : v)}
                    options={[{ value: 'all', label: 'All Skills' }, ...allSkillNames.map(s=>({value:s,label:s}))]} />
                  <FilterDropdown value={fConf || 'all'} onChange={v => setFConf(v === 'all' ? '' : v)}
                    options={[
                      { value: 'all', label: 'Any Confidence' },
                      ...[1,2,3,4,5].map(n => ({
                        value: String(n),
                        label: <span className="flex items-center gap-1.5">{'★'.repeat(n)}<span className="text-[#9aa094]">{'☆'.repeat(5-n)}</span><span className="text-[11px] text-[#9aa094] ml-1">{CONF[n]}</span></span>
                      }))
                    ]} />
                  <FilterDropdown value={fDate || 'all'} onChange={v => setFDate(v === 'all' ? '' : v)}
                    options={[{ value: 'all', label: 'All Time' }, {value:'today',label:'Today'},{value:'week',label:'This Week'},{value:'month',label:'This Month'}]} />
                  {hasFilters && <button onClick={()=>{setSearch('');setFSkill('');setFConf('');setFDate('');}} className="px-3 py-1.5 text-xs text-red-500 font-semibold hover:bg-red-50 rounded-lg transition-colors">Clear all</button>}
                  <span className="ml-auto text-[11px] text-[#9aa094]">
                    {filtered.length > 0 && `Showing ${(page-1)*PER_PAGE+1} – ${Math.min(page*PER_PAGE, filtered.length)} of ${filtered.length}`}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Results Card ── */}
            <div className="bg-white rounded-2xl border border-[#e2e6dc]">
              {loading ? (
                <div className="text-center py-16">
                  <div className="animate-spin w-8 h-8 border-3 border-[#2e5023] border-t-transparent rounded-full mx-auto mb-4"/>
                  <p className="text-sm text-[#9aa094]">Loading sessions...</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-14 h-14 rounded-2xl bg-[#f4f7f2] flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-7 h-7 text-[#c8cec0]" />
                  </div>
                  <h3 className="text-base font-bold text-[#1c1f1a] mb-1">No sessions found</h3>
                  <p className="text-sm text-[#9aa094]">{hasFilters ? 'Try adjusting your filters' : 'Complete a session to see it here'}</p>
                </div>
              ) : (
                <>
                  {/* Table header */}
                  <div className="grid grid-cols-12 gap-3 px-5 py-3 text-[11px] font-semibold text-[#9aa094] uppercase tracking-wider border-b border-[#e8ece3] bg-[#f8faf6] rounded-t-2xl">
                    <span className="col-span-1">#</span>
                    <span className="col-span-4">Skill</span>
                    <span className="col-span-2 text-center">Duration</span>
                    <span className="col-span-2 text-center">Confidence</span>
                    <span className="col-span-3 text-right">Date</span>
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-[#f0f2eb]">
                    {paged.map((p, i) => {
                      const open = expandedId === p._id;
                      return (
                        <div key={p._id}>
                          <button type="button" onClick={()=>setExpandedId(open?null:p._id)}
                            className="w-full grid grid-cols-12 gap-3 items-center px-5 py-3.5 text-left hover:bg-[#f8faf6] transition-colors group">
                            <span className="col-span-1 text-[12px] text-[#9aa094] font-medium">{(page-1)*PER_PAGE+i+1}</span>
                            <div className="col-span-4 flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-[#edf5e9] flex items-center justify-center flex-shrink-0 border border-[#d4e8cc]">
                                <span className="text-[#2e5023] font-bold text-sm">{p.skillName?.charAt(0).toUpperCase()}</span>
                              </div>
                              <div className="min-w-0">
                                <p className="text-[13px] font-semibold text-[#1c1f1a] truncate group-hover:text-[#2e5023] transition-colors">{p.skillName}</p>
                                {p.tags?.length > 0 && <p className="text-[10px] text-[#c8cec0] truncate">{p.tags.join(' · ')}</p>}
                              </div>
                            </div>
                            <span className="col-span-2 text-center text-[12px] text-[#565c52] font-medium">{p.minutesPracticed} min</span>
                            <div className="col-span-2 flex justify-center">
                              {p.confidence ? (
                                <div className="flex gap-0.5">{[1,2,3,4,5].map(n=><Star key={n} className={`w-3 h-3 ${n<=p.confidence?'text-amber-400 fill-amber-400':'text-gray-200'}`}/>)}</div>
                              ) : <span className="text-[11px] text-[#c8cec0]">—</span>}
                            </div>
                            <div className="col-span-3 flex items-center justify-end gap-2">
                              <span className="text-[12px] text-[#9aa094]">{fmtDate(p.date)}</span>
                              {open ? <ChevronUp className="w-3.5 h-3.5 text-[#c8cec0]"/> : <ChevronDown className="w-3.5 h-3.5 text-[#c8cec0]"/>}
                            </div>
                          </button>

                          {/* Expanded detail */}
                          {open && (
                            <div className="px-5 pb-5 bg-[#f8faf6] border-t border-[#e8ece3]">
                              <div className="grid sm:grid-cols-2 gap-5 pt-5">
                                <div className="space-y-4">
                                  {p.confidence && (
                                    <div>
                                      <p className="text-[11px] font-semibold text-[#9aa094] uppercase tracking-wider mb-1.5">Confidence</p>
                                      <div className="flex items-center gap-2.5">
                                        <div className="flex gap-0.5">{[1,2,3,4,5].map(n=><Star key={n} className={`w-4 h-4 ${n<=p.confidence?'text-amber-400 fill-amber-400':'text-gray-200'}`}/>)}</div>
                                        <span className="text-sm text-[#565c52] font-medium">{CONF[p.confidence]}</span>
                                      </div>
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-[11px] font-semibold text-[#9aa094] uppercase tracking-wider mb-1.5">Duration</p>
                                    <p className="text-sm text-[#1c1f1a] font-medium">{p.minutesPracticed} minutes</p>
                                  </div>
                                  {p.tags?.length > 0 && (
                                    <div>
                                      <p className="text-[11px] font-semibold text-[#9aa094] uppercase tracking-wider mb-1.5">Tags</p>
                                      <div className="flex flex-wrap gap-1.5">{p.tags.map(t=><span key={t} className="px-2.5 py-0.5 bg-[#edf5e9] text-[#2e5023] text-xs font-medium rounded-full border border-[#d4e8cc]">{t}</span>)}</div>
                                    </div>
                                  )}
                                </div>
                                <div className="space-y-4">
                                  {p.notes && (
                                    <div>
                                      <p className="text-[11px] font-semibold text-[#9aa094] uppercase tracking-wider mb-1.5">Notes</p>
                                      <p className="text-sm text-[#1c1f1a] leading-relaxed">{p.notes}</p>
                                    </div>
                                  )}
                                  {p.blockers && (
                                    <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                                      <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/>Blockers</p>
                                      <p className="text-sm text-amber-900">{p.blockers}</p>
                                    </div>
                                  )}
                                  {p.nextStep && (
                                    <div className="bg-[#edf5e9] rounded-xl p-3 border border-[#d4e8cc]">
                                      <p className="text-[11px] font-semibold text-[#2e5023] uppercase tracking-wider mb-1 flex items-center gap-1"><ArrowRight className="w-3 h-3"/>Next Step</p>
                                      <p className="text-sm text-[#2e5023]">{p.nextStep}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="mt-4 pt-3 border-t border-[#e2e6dc] flex justify-end">
                                <button onClick={()=>{setDeleteId(p._id);setDelInput('');}} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg font-semibold transition-colors">
                                  <Trash2 className="w-3.5 h-3.5"/>Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {totPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-[#e8ece3]">
                      <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                        className="flex items-center gap-1 text-[12px] font-medium text-[#9aa094] hover:text-[#1c1f1a] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                        <ChevronLeft className="w-3.5 h-3.5" /> Previous
                      </button>
                      <span className="text-[12px] text-[#9aa094]">Page <span className="font-bold text-[#1c1f1a]">{page}</span> of <span className="font-bold text-[#1c1f1a]">{totPages}</span></span>
                      <button onClick={()=>setPage(p=>Math.min(totPages,p+1))} disabled={page===totPages}
                        className="flex items-center gap-1 text-[12px] font-medium text-[#9aa094] hover:text-[#1c1f1a] disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                        Next <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* ═══ New Session Modal ═══ */}
      {showNew && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-[#e2e6dc]">
            <div className="flex items-center justify-between p-6 pb-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#edf5e9] flex items-center justify-center">
                  <Plus className="w-5 h-5 text-[#2e5023]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#1c1f1a]">New Practice Session</h2>
                  <p className="text-[11px] text-[#9aa094]">Set up your timer and start practicing</p>
                </div>
              </div>
              <button onClick={()=>setShowNew(false)} className="text-[#c8cec0] hover:text-[#1c1f1a] transition-colors"><X className="w-5 h-5"/></button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[#1c1f1a] mb-2">Session Name <span className="text-xs text-[#9aa094] font-normal ml-1">({form.skillName.length}/20)</span></label>
                <input type="text" value={form.skillName} onChange={e=>setForm(p=>({...p,skillName:e.target.value.slice(0,20)}))} placeholder="e.g. Python, Guitar" maxLength={20}
                  className="w-full px-4 py-2.5 border border-[#e2e6dc] rounded-xl outline-none focus:border-[#4f7942] focus:ring-2 focus:ring-[#4f7942]/15 bg-[#f8faf6] focus:bg-white text-sm transition-all"/>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1c1f1a] mb-2">Timer Mode</label>
                <div className="flex gap-2">
                  <button onClick={()=>setCountdown(true)} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${countdown?'bg-[#2e5023] text-white shadow-sm':'bg-[#f4f7f2] text-[#565c52] border border-[#e2e6dc] hover:border-[#c8cec0]'}`}>
                    <Timer className="w-4 h-4" /> Countdown
                  </button>
                  <button onClick={()=>setCountdown(false)} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${!countdown?'bg-[#2e5023] text-white shadow-sm':'bg-[#f4f7f2] text-[#565c52] border border-[#e2e6dc] hover:border-[#c8cec0]'}`}>
                    <Clock className="w-4 h-4" /> Stopwatch
                  </button>
                </div>
                {countdown && (
                  <div className="flex gap-3 mt-3">
                    <div className="flex-1">
                      <label className="block text-[11px] text-[#9aa094] font-medium mb-1">Hours</label>
                      <input type="number" min={0} max={12} value={tgtH} onChange={e=>{const val=e.target.value;setTgtH(val===''?0:Math.max(0,Math.min(12,parseInt(val)||0)));}} onFocus={e=>e.target.select()}
                        className="w-full px-3 py-2.5 border border-[#e2e6dc] rounded-xl outline-none focus:border-[#4f7942] focus:ring-2 focus:ring-[#4f7942]/15 bg-[#f8faf6] focus:bg-white text-sm text-center font-mono transition-all"/>
                    </div>
                    <div className="flex-1">
                      <label className="block text-[11px] text-[#9aa094] font-medium mb-1">Minutes</label>
                      <input type="number" min={0} max={59} value={tgtM} onChange={e=>{const val=e.target.value;setTgtM(val===''?0:Math.max(0,Math.min(59,parseInt(val)||0)));}} onFocus={e=>e.target.select()}
                        className="w-full px-3 py-2.5 border border-[#e2e6dc] rounded-xl outline-none focus:border-[#4f7942] focus:ring-2 focus:ring-[#4f7942]/15 bg-[#f8faf6] focus:bg-white text-sm text-center font-mono transition-all"/>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1c1f1a] mb-2">Tags <span className="text-xs text-[#9aa094] font-normal ml-1">({form.tags.length}/10)</span></label>
                <form onSubmit={addTagH} className="flex gap-2">
                  <input type="text" value={newTag} onChange={e=>setNewTag(e.target.value.slice(0,10))} placeholder="Add a tag" maxLength={10}
                    className="flex-1 px-3 py-2 border border-[#e2e6dc] rounded-xl outline-none focus:border-[#4f7942] focus:ring-2 focus:ring-[#4f7942]/15 bg-[#f8faf6] focus:bg-white text-sm transition-all"/>
                  <button type="submit" disabled={form.tags.length>=10} className="px-4 py-2 bg-[#2e5023] text-white rounded-xl text-sm font-semibold hover:bg-[#4f7942] disabled:opacity-40 disabled:cursor-not-allowed transition-all">Add</button>
                </form>
                {form.tags.length > 0 && <div className="flex flex-wrap gap-1.5 mt-2">{form.tags.map(t=><span key={t} className="flex items-center gap-1 px-2.5 py-0.5 bg-[#edf5e9] text-[#2e5023] text-xs font-medium rounded-full border border-[#d4e8cc]">{t}<button type="button" onClick={()=>setForm(p=>({...p,tags:p.tags.filter(x=>x!==t)}))} className="hover:text-red-500 transition-colors"><X className="w-3 h-3"/></button></span>)}</div>}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={()=>tryStart(true)} disabled={!form.skillName.trim()||(countdown&&tgtH===0&&tgtM===0)}
                  className="flex-1 py-3 bg-[#2e5023] text-white rounded-xl font-semibold text-sm hover:bg-[#4f7942] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2">
                  <Play className="w-4 h-4" /> Start Now
                </button>
                <button onClick={()=>tryStart(false)} disabled={!form.skillName.trim()||(countdown&&tgtH===0&&tgtM===0)}
                  className="flex-1 py-3 border border-[#e2e6dc] text-[#1c1f1a] rounded-xl font-semibold text-sm hover:bg-[#f4f7f2] disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                  Start Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Complete Session Modal ═══ */}
      {showComp && compSess && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-[#e2e6dc]">
            <div className="flex items-center justify-between p-6 pb-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#1c1f1a]">Complete Session</h2>
                  <p className="text-[11px] text-[#9aa094]">Log your practice details</p>
                </div>
              </div>
              <button onClick={()=>{setShowComp(false);setCompSess(null);}} className="text-[#c8cec0] hover:text-[#1c1f1a] transition-colors"><X className="w-5 h-5"/></button>
            </div>

            <div className="p-6 space-y-5">
              {/* Session summary */}
              <div className="bg-[#f4f7f2] rounded-xl p-4 border border-[#e2e6dc] flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#edf5e9] flex items-center justify-center border border-[#d4e8cc]">
                  <span className="text-[#2e5023] font-bold">{compSess.skillName?.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <p className="font-bold text-[#1c1f1a]">{compSess.skillName}</p>
                  <p className="text-sm text-[#565c52]">Duration: <span className="font-semibold text-[#2e5023]">{fmtDur(compSess)}</span></p>
                </div>
              </div>

              {/* Confidence */}
              <div>
                <label className="block text-sm font-semibold text-[#1c1f1a] mb-2">How confident do you feel?</label>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(n=>(
                    <button key={n} onClick={()=>setComp(p=>({...p,confidence:n}))}
                      className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
                        comp.confidence===n ? 'bg-[#2e5023] text-white shadow-md scale-105' : 'bg-[#f4f7f2] text-[#565c52] border border-[#e2e6dc] hover:border-[#4f7942]'
                      }`}>
                      <Star className={`w-4 h-4 mx-auto mb-0.5 ${comp.confidence===n?'fill-white':''}`}/>{n}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[#9aa094] mt-1.5 text-center font-medium">{CONF[comp.confidence]}</p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-[#1c1f1a] mb-2">What did you practice? <span className="text-xs text-[#9aa094] font-normal">({comp.notes.length}/200)</span></label>
                <textarea value={comp.notes} onChange={e=>setComp(p=>({...p,notes:e.target.value.slice(0,200)}))} placeholder="Describe what you worked on..." rows={3} maxLength={200}
                  className="w-full px-4 py-2.5 border border-[#e2e6dc] rounded-xl outline-none focus:border-[#4f7942] focus:ring-2 focus:ring-[#4f7942]/15 bg-[#f8faf6] focus:bg-white text-sm resize-none transition-all"/>
              </div>

              {/* Blockers */}
              <div>
                <label className="block text-sm font-semibold text-[#1c1f1a] mb-2 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-amber-500"/>Any blockers? <span className="text-xs text-[#9aa094] font-normal">({comp.blockers.length}/200)</span></label>
                <textarea value={comp.blockers} onChange={e=>setComp(p=>({...p,blockers:e.target.value.slice(0,200)}))} placeholder="What was difficult?" rows={3} maxLength={200}
                  className="w-full px-4 py-2.5 border border-[#e2e6dc] rounded-xl outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15 bg-[#f8faf6] focus:bg-white text-sm resize-none transition-all"/>
              </div>

              {/* Next step */}
              <div>
                <label className="block text-sm font-semibold text-[#1c1f1a] mb-2 flex items-center gap-1.5"><ArrowRight className="w-4 h-4 text-[#2e5023]"/>Next step? <span className="text-xs text-[#9aa094] font-normal">({comp.nextStep.length}/200)</span></label>
                <textarea value={comp.nextStep} onChange={e=>setComp(p=>({...p,nextStep:e.target.value.slice(0,200)}))} placeholder="What will you focus on next?" rows={3} maxLength={200}
                  className="w-full px-4 py-2.5 border border-[#e2e6dc] rounded-xl outline-none focus:border-[#4f7942] focus:ring-2 focus:ring-[#4f7942]/15 bg-[#f8faf6] focus:bg-white text-sm resize-none transition-all"/>
              </div>

              <button onClick={submitComp} disabled={submitting}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" />{submitting ? 'Saving...' : 'Save Practice Log'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Confirm Modals ═══ */}
      {resetConfirmId != null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-[#e2e6dc]">
            <h2 className="text-lg font-bold text-[#1c1f1a] mb-2">Restart timer?</h2>
            <p className="text-sm text-[#565c52] mb-5">Your progress won't be saved. Are you sure?</p>
            <div className="flex gap-3">
              <button onClick={()=>setResetConfirmId(null)} className="flex-1 py-2.5 border border-[#e2e6dc] text-[#565c52] rounded-xl font-semibold text-sm hover:bg-[#f4f7f2] transition-all">No</button>
              <button onClick={()=>{resetSession(resetConfirmId);setResetConfirmId(null);}} className="flex-1 py-2.5 bg-[#2e5023] text-white rounded-xl font-semibold text-sm hover:bg-[#4f7942] transition-all">Yes, Restart</button>
            </div>
          </div>
        </div>
      )}

      {removeId != null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-[#e2e6dc]">
            <h2 className="text-lg font-bold text-[#1c1f1a] mb-2">Remove session?</h2>
            <p className="text-sm text-[#565c52] mb-5">This will discard the session and unsaved progress.</p>
            <div className="flex gap-3">
              <button onClick={()=>setRemoveId(null)} className="flex-1 py-2.5 border border-[#e2e6dc] text-[#565c52] rounded-xl font-semibold text-sm hover:bg-[#f4f7f2] transition-all">Cancel</button>
              <button onClick={()=>{removeSession(removeId);setRemoveId(null);}} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 transition-all">Remove</button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-[#e2e6dc]">
            <h2 className="text-lg font-bold text-[#1c1f1a] mb-2">Delete this session?</h2>
            <p className="text-sm text-[#565c52] mb-4">Type <span className="font-mono font-bold text-[#1c1f1a] bg-[#f4f7f2] px-1.5 py-0.5 rounded">CONFIRM</span> to delete permanently.</p>
            <input type="text" value={delInput} onChange={e=>setDelInput(e.target.value)} placeholder="Type CONFIRM"
              className="w-full px-4 py-2.5 border border-[#e2e6dc] rounded-xl outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/15 bg-[#f8faf6] focus:bg-white font-mono text-sm mb-4 transition-all"/>
            <div className="flex gap-3">
              <button onClick={()=>{setDeleteId(null);setDelInput('');}} className="flex-1 py-2.5 border border-[#e2e6dc] text-[#565c52] rounded-xl font-semibold text-sm hover:bg-[#f4f7f2] transition-all">Cancel</button>
              <button onClick={doDelete} disabled={delInput!=='CONFIRM'} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

