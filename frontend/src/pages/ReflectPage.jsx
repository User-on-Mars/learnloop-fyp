import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../useAuth';
import { useToast } from '../context/ToastContext';
import { useSubscription } from '../context/SubscriptionContext';
import { showXpNotification } from '../utils/xpNotifications';
import Sidebar from '../components/Sidebar';
import FilterDropdown from '../components/FilterDropdown';
import client from '../api/client';
import {
  CheckCircle, AlertCircle, Trash2, Download, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, Loader2, BookOpen, Smile, Meh, Frown, Zap, Brain, X, Lock,
  PenLine, Plus, Search, History, Sparkles, FileText,
} from 'lucide-react';

const MOODS = [
  { value: 'Happy', icon: Smile, label: 'Happy', emoji: '😊', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
  { value: 'Neutral', icon: Meh, label: 'Neutral', emoji: '😐', bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600' },
  { value: 'Sad', icon: Frown, label: 'Struggling', emoji: '😔', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  { value: 'Energized', icon: Zap, label: 'Energized', emoji: '⚡', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  { value: 'Thoughtful', icon: Brain, label: 'Thoughtful', emoji: '🧠', bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700' },
];
const MOOD_MAP = Object.fromEntries(MOODS.map(m => [m.value, m]));

export default function ReflectPage() {
  const user = useAuth();
  const navigate = useNavigate();
  const { showSuccess } = useToast();
  const { isFree } = useSubscription();
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [mood, setMood] = useState(null);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [reflections, setReflections] = useState([]);
  const [histLoading, setHistLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(null);
  const [searchQ, setSearchQ] = useState('');
  const [moodFilter, setMoodFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [page, setPage] = useState(1);
  const PER_PAGE = 5;

  const fetchHistory = useCallback(async () => {
    try { setHistLoading(true); const r = await client.get('/reflections'); setReflections(r.data || []); }
    catch { /* silent */ }
    finally { setHistLoading(false); }
  }, []);
  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const addTag = (e) => { e.preventDefault(); const t = tagInput.trim(); if (t && !tags.includes(t) && tags.length < 10) { setTags([...tags, t]); setTagInput(''); } };

  const handleSave = async () => {
    if (!title.trim()) { setError('Title is required.'); setTimeout(() => setError(null), 4000); return; }
    if (!content.trim()) { setError('Content is required.'); setTimeout(() => setError(null), 4000); return; }
    if (!mood) { setError('Please select a mood.'); setTimeout(() => setError(null), 4000); return; }
    setSaving(true); setError(null); setSuccess(false);
    try {
      const response = await client.post('/reflections', { title: title.trim(), content: content.trim(), mood, tags });
      if (response.data?.xpAwarded) showXpNotification(showSuccess, response.data.xpAwarded);
      setSuccess(true); setTimeout(() => setSuccess(false), 3000);
      setTimeout(() => { setContent(''); setTitle(''); setMood(null); setTags([]); setShowForm(false); }, 1000);
      fetchHistory();
    } catch (err) { setError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to save.'); setTimeout(() => setError(null), 5000); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return; setDeleting(true);
    try { await client.delete(`/reflections/${deleteId}`); setReflections(r => r.filter(x => x._id !== deleteId)); if (expandedId === deleteId) setExpandedId(null); setDeleteId(null); }
    catch { setError('Failed to delete.'); setTimeout(() => setError(null), 4000); }
    finally { setDeleting(false); }
  };

  const handleExport = async (id) => {
    setExporting(id);
    try {
      const r = await client.get(`/reflections/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement('a'); a.href = url;
      const ref = reflections.find(x => x._id === id);
      a.download = `reflection-${new Date(ref?.createdAt).toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
    } catch { setError('Failed to export.'); setTimeout(() => setError(null), 4000); }
    finally { setExporting(null); }
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const fmtTime = (d) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  // Derived
  const totalReflections = reflections.length;
  const moodCounts = reflections.reduce((acc, r) => { acc[r.mood] = (acc[r.mood] || 0) + 1; return acc; }, {});
  const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];

  const filtered = reflections.filter(r => {
    if (searchQ && !r.title?.toLowerCase().includes(searchQ.toLowerCase()) && !r.content?.toLowerCase().includes(searchQ.toLowerCase())) return false;
    if (moodFilter !== 'all' && r.mood !== moodFilter) return false;
    if (dateFilter !== 'all') {
      const d = new Date(r.createdAt), n = new Date();
      if (dateFilter === 'today' && d.toDateString() !== n.toDateString()) return false;
      if (dateFilter === 'week') { const w = new Date(n); w.setDate(w.getDate() - 7); if (d < w) return false; }
      if (dateFilter === 'month') { const m = new Date(n); m.setMonth(m.getMonth() - 1); if (d < m) return false; }
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const hasFilters = searchQ || moodFilter !== 'all' || dateFilter !== 'all';

  useEffect(() => { setPage(1); }, [searchQ, moodFilter, dateFilter]);

  return (
    <div className="flex min-h-screen bg-[#eef0ea]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto w-full pt-16 md:pl-14">
        <div className="px-4 sm:px-6 py-6 space-y-5">

          {/* ═══ Hero Header ═══ */}
          <div className="relative overflow-hidden bg-white rounded-2xl border border-[#e2e6dc] p-6 sm:p-8">
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#a3c99a] opacity-10 blur-3xl pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
              <div>
                <h1 className="text-2xl font-bold text-[#1c1f1a] flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#edf5e9] flex items-center justify-center">
                    <PenLine className="w-5 h-5 text-[#2e5023]" />
                  </div>
                  Reflect
                </h1>
                <p className="text-sm text-[#565c52] mt-1.5 ml-[52px]">Write about your learning — what's working, what's not, and where you're headed</p>
              </div>
              <button onClick={() => { setShowForm(true); setTitle(''); setContent(''); setMood(null); setTags([]); }}
                className="flex items-center gap-2 px-6 py-3 bg-[#2e5023] text-white rounded-xl font-semibold text-sm hover:bg-[#4f7942] transition-all shadow-md shadow-[#2e5023]/15 active:scale-[0.97] self-start sm:self-center">
                <Plus className="w-4 h-4" /> New Reflection
              </button>
            </div>

            {/* Quick stats */}
            <div className="relative grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-[#e8ece3]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center">
                  <BookOpen className="w-[18px] h-[18px] text-violet-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-[#1c1f1a] leading-none">{totalReflections}</p>
                  <p className="text-[11px] text-[#9aa094] mt-0.5">Total reflections</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Sparkles className="w-[18px] h-[18px] text-amber-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-[#1c1f1a] leading-none">{topMood ? MOOD_MAP[topMood[0]]?.label || '—' : '—'}</p>
                  <p className="text-[11px] text-[#9aa094] mt-0.5">Top mood</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Zap className="w-[18px] h-[18px] text-emerald-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-[#1c1f1a] leading-none">{reflections.filter(r => { const d = new Date(r.createdAt); const n = new Date(); const w = new Date(n); w.setDate(w.getDate() - 7); return d >= w; }).length}</p>
                  <p className="text-[11px] text-[#9aa094] mt-0.5">This week</p>
                </div>
              </div>
            </div>
          </div>

          {/* ═══ Alerts ═══ */}
          {success && <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-medium"><CheckCircle className="w-4 h-4 flex-shrink-0" />Reflection saved!</div>}
          {error && <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}

          {/* ═══ Reflection History ═══ */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[#edf5e9] flex items-center justify-center border border-[#d4e8cc]">
                <History className="w-[18px] h-[18px] text-[#2e5023]" />
              </div>
              <div>
                <h2 className="text-[17px] font-bold text-[#1c1f1a]">Your Reflections</h2>
                <p className="text-[11px] text-[#9aa094]">{filtered.length} reflection{filtered.length !== 1 ? 's' : ''}</p>
              </div>
            </div>

            {/* ── Filter Card ── */}
            <div className="bg-white rounded-2xl border border-[#e2e6dc] mb-4">
              <div className="px-5 py-4 bg-[#f8faf6] rounded-2xl">
                <div className="relative mb-3">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#c8cec0]" />
                  <input type="text" placeholder="Search reflections..." value={searchQ} onChange={e => setSearchQ(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-[#e2e6dc] rounded-xl outline-none focus:border-[#4f7942] focus:ring-2 focus:ring-[#4f7942]/15 bg-white text-sm text-[#1c1f1a] placeholder:text-[#c8cec0] transition-all" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <FilterDropdown value={moodFilter} onChange={v => { setMoodFilter(v); setPage(1); }}
                    options={[
                      { value: 'all', label: 'All Moods' },
                      ...MOODS.map(m => ({ value: m.value, label: `${m.emoji} ${m.label}` }))
                    ]} />
                  <FilterDropdown value={dateFilter} onChange={v => { setDateFilter(v); setPage(1); }}
                    options={[
                      { value: 'all', label: 'All Time' },
                      { value: 'today', label: 'Today' },
                      { value: 'week', label: 'This Week' },
                      { value: 'month', label: 'This Month' },
                    ]} />
                  {hasFilters && <button onClick={() => { setSearchQ(''); setMoodFilter('all'); setDateFilter('all'); }} className="px-3 py-1.5 text-xs text-red-500 font-semibold hover:bg-red-50 rounded-lg transition-colors">Clear all</button>}
                  <span className="ml-auto text-[11px] text-[#9aa094]">
                    {filtered.length > 0 && `Showing ${(page - 1) * PER_PAGE + 1} – ${Math.min(page * PER_PAGE, filtered.length)} of ${filtered.length}`}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Results Card ── */}
            <div className="bg-white rounded-2xl border border-[#e2e6dc]">
              {histLoading ? (
                <div className="text-center py-16">
                  <div className="animate-spin w-8 h-8 border-3 border-[#2e5023] border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-sm text-[#9aa094]">Loading reflections...</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-14 h-14 rounded-2xl bg-[#f4f7f2] flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-7 h-7 text-[#c8cec0]" />
                  </div>
                  <h3 className="text-base font-bold text-[#1c1f1a] mb-1">{hasFilters ? 'No matching reflections' : 'No reflections yet'}</h3>
                  <p className="text-sm text-[#9aa094]">{hasFilters ? 'Try adjusting your filters' : 'Write your first reflection to start your journal'}</p>
                </div>
              ) : (
                <>
                  {/* Table header */}
                  <div className="grid grid-cols-12 gap-3 px-5 py-3 text-[11px] font-semibold text-[#9aa094] uppercase tracking-wider border-b border-[#e8ece3] bg-[#f8faf6] rounded-t-2xl">
                    <span className="col-span-1">#</span>
                    <span className="col-span-4">Title</span>
                    <span className="col-span-2 text-center">Mood</span>
                    <span className="col-span-2 text-center">Tags</span>
                    <span className="col-span-3 text-right">Date</span>
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-[#f0f2eb]">
                    {paged.map((r, i) => {
                      const open = expandedId === r._id;
                      const m = MOOD_MAP[r.mood];
                      return (
                        <div key={r._id}>
                          <button type="button" onClick={() => setExpandedId(open ? null : r._id)}
                            className="w-full grid grid-cols-12 gap-3 items-center px-5 py-3.5 text-left hover:bg-[#f8faf6] transition-colors group">
                            <span className="col-span-1 text-[12px] text-[#9aa094] font-medium">{(page - 1) * PER_PAGE + i + 1}</span>
                            <div className="col-span-4 min-w-0">
                              <p className="text-[13px] font-semibold text-[#1c1f1a] truncate group-hover:text-[#2e5023] transition-colors">{r.title || 'Untitled'}</p>
                              <p className="text-[11px] text-[#c8cec0] truncate">{r.content?.slice(0, 60)}{r.content?.length > 60 ? '...' : ''}</p>
                            </div>
                            <div className="col-span-2 flex justify-center">
                              {m ? (
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold ${m.bg} ${m.text} border ${m.border}`}>
                                  {m.emoji} {m.label}
                                </span>
                              ) : <span className="text-[11px] text-[#c8cec0]">—</span>}
                            </div>
                            <div className="col-span-2 flex justify-center">
                              {r.tags?.length > 0 ? (
                                <div className="flex gap-1">{r.tags.slice(0, 2).map(t => <span key={t} className="px-2 py-0.5 bg-[#f0f2eb] text-[#565c52] text-[10px] font-medium rounded-full">{t}</span>)}{r.tags.length > 2 && <span className="text-[10px] text-[#9aa094]">+{r.tags.length - 2}</span>}</div>
                              ) : <span className="text-[11px] text-[#c8cec0]">—</span>}
                            </div>
                            <div className="col-span-3 flex items-center justify-end gap-2">
                              <span className="text-[12px] text-[#9aa094]">{fmtDate(r.createdAt)}</span>
                              {open ? <ChevronUp className="w-3.5 h-3.5 text-[#c8cec0]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#c8cec0]" />}
                            </div>
                          </button>

                          {/* Expanded detail */}
                          {open && (
                            <div className="mx-5 mb-5 mt-1 rounded-xl bg-white border border-[#e2e6dc] shadow-sm overflow-hidden">
                              {/* Top bar with title + mood */}
                              <div className="px-5 py-4 bg-[#f4f7f2] border-b border-[#e2e6dc]">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    {r.title && <h3 className="text-[17px] font-bold text-[#1c1f1a] mb-1">{r.title}</h3>}
                                    <p className="text-[12px] text-[#9aa094]">{fmtDate(r.createdAt)} at {fmtTime(r.createdAt)}</p>
                                  </div>
                                  {m && (
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${m.bg} ${m.text} border ${m.border} flex-shrink-0`}>
                                      {m.emoji} {m.label}
                                    </span>
                                  )}
                                </div>
                                {r.tags?.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-3">
                                    {r.tags.map(t => <span key={t} className="px-2.5 py-0.5 bg-[#edf5e9] text-[#2e5023] text-[11px] font-medium rounded-full border border-[#d4e8cc]">{t}</span>)}
                                  </div>
                                )}
                              </div>

                              {/* Content */}
                              <div className="px-5 py-5">
                                <p className="text-[14px] text-[#1c1f1a] whitespace-pre-wrap leading-relaxed">{r.content}</p>
                              </div>

                              {/* Actions bar */}
                              <div className="px-5 py-3 bg-[#f8faf6] border-t border-[#e2e6dc] flex items-center justify-end gap-2">
                                <button onClick={() => { if (isFree) { navigate('/subscription'); return; } handleExport(r._id); }} disabled={exporting === r._id}
                                  className={`flex items-center gap-2 px-4 py-2 text-[12px] rounded-lg font-semibold disabled:opacity-50 transition-all border ${
                                    isFree ? 'text-gray-400 bg-gray-50 border-gray-200' : 'text-[#2e5023] bg-[#edf5e9] border-[#d4e8cc] hover:bg-[#dcefd4]'
                                  }`}>
                                  {exporting === r._id ? <Loader2 className="w-4 h-4 animate-spin" /> : isFree ? <><Download className="w-4 h-4 opacity-40" /><Lock className="w-3.5 h-3.5 text-amber-500" /></> : <Download className="w-4 h-4" />}
                                  Export PDF
                                </button>
                                <button onClick={() => setDeleteId(r._id)}
                                  className="flex items-center gap-2 px-4 py-2 text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-lg font-semibold hover:bg-red-100 transition-all">
                                  <Trash2 className="w-4 h-4" /> Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 mx-5 mb-5 pt-3 border-t border-[#f0f2eb]">
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                        className="flex items-center gap-1 text-[12px] font-medium text-site-muted hover:text-site-ink disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                        <ChevronLeft className="w-3.5 h-3.5" /> Previous
                      </button>
                      <span className="text-[12px] text-site-faint">
                        Page <span className="font-bold text-site-ink">{page}</span> of <span className="font-bold text-site-ink">{totalPages}</span>
                      </span>
                      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                        className="flex items-center gap-1 text-[12px] font-medium text-site-muted hover:text-site-ink disabled:opacity-30 disabled:cursor-not-allowed transition-all">
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

      {/* ═══ New Reflection Modal ═══ */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-[#e2e6dc]">
            <div className="flex items-center justify-between p-6 pb-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#edf5e9] flex items-center justify-center">
                  <PenLine className="w-5 h-5 text-[#2e5023]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#1c1f1a]">New Reflection</h2>
                  <p className="text-[11px] text-[#9aa094]">Capture your thoughts and insights</p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="text-[#c8cec0] hover:text-[#1c1f1a] transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-[#1c1f1a] mb-2">Title <span className="text-red-400">*</span></label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Give your reflection a title" maxLength={200}
                  className="w-full px-4 py-2.5 border border-[#e2e6dc] rounded-xl outline-none focus:border-[#4f7942] focus:ring-2 focus:ring-[#4f7942]/15 bg-[#f8faf6] focus:bg-white text-sm transition-all" />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-semibold text-[#1c1f1a] mb-2">What's on your mind? <span className="text-red-400">*</span> <span className="text-xs text-[#9aa094] font-normal ml-1">({content.length}/10,000)</span></label>
                <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="What did you learn? What insights did you gain?" maxLength={10000} rows={5}
                  className="w-full px-4 py-3 border border-[#e2e6dc] rounded-xl outline-none focus:border-[#4f7942] focus:ring-2 focus:ring-[#4f7942]/15 bg-[#f8faf6] focus:bg-white resize-none text-sm transition-all" />
              </div>

              {/* Mood */}
              <div>
                <label className="block text-sm font-semibold text-[#1c1f1a] mb-2">How are you feeling? <span className="text-red-400">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {MOODS.map(m => {
                    const Icon = m.icon;
                    const active = mood === m.value;
                    return (
                      <button key={m.value} type="button" onClick={() => setMood(mood === m.value ? null : m.value)}
                        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                          active ? 'bg-[#2e5023] text-white shadow-md scale-105' : `${m.bg} ${m.text} border ${m.border} hover:scale-[1.02]`
                        }`}>
                        <Icon className="w-4.5 h-4.5" /> {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-semibold text-[#1c1f1a] mb-2">Tags <span className="text-xs text-[#9aa094] font-normal ml-1">({tags.length}/10)</span></label>
                <form onSubmit={addTag} className="flex gap-2">
                  <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Add a tag" maxLength={50}
                    className="flex-1 px-3 py-2 border border-[#e2e6dc] rounded-xl outline-none focus:border-[#4f7942] focus:ring-2 focus:ring-[#4f7942]/15 bg-[#f8faf6] focus:bg-white text-sm transition-all" />
                  <button type="submit" disabled={tags.length >= 10} className="px-4 py-2 bg-[#2e5023] text-white rounded-xl text-sm font-semibold hover:bg-[#4f7942] disabled:opacity-40 disabled:cursor-not-allowed transition-all">Add</button>
                </form>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {tags.map(t => <span key={t} className="flex items-center gap-1 px-2.5 py-0.5 bg-[#edf5e9] text-[#2e5023] text-xs font-medium rounded-full border border-[#d4e8cc]">{t}<button type="button" onClick={() => setTags(tags.filter(x => x !== t))} className="hover:text-red-500 transition-colors"><X className="w-3 h-3" /></button></span>)}
                  </div>
                )}
              </div>

              {/* Save */}
              <button onClick={handleSave} disabled={saving || !title.trim() || !content.trim() || !mood}
                className="w-full py-3 bg-[#2e5023] text-white rounded-xl font-bold text-sm hover:bg-[#4f7942] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Reflection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Delete Confirm Modal ═══ */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-[#e2e6dc]">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-50 rounded-xl mb-4 border border-red-200">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-[#1c1f1a] text-center mb-2">Delete Reflection</h2>
            <p className="text-sm text-[#565c52] text-center mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} disabled={deleting} className="flex-1 py-2.5 border border-[#e2e6dc] text-[#565c52] rounded-xl font-semibold text-sm hover:bg-[#f4f7f2] disabled:opacity-50 transition-all">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
                {deleting ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
