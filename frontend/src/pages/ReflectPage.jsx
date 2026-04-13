import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../useAuth';
import { useToast } from '../context/ToastContext';
import { showXpNotification } from '../utils/xpNotifications';
import Sidebar from '../components/Sidebar';
import client from '../api/client';
import { CheckCircle, AlertCircle, Trash2, Download, ChevronDown, ChevronUp, Loader2, BookOpen, Smile, Meh, Frown, Zap, Brain, X } from 'lucide-react';

const MOODS = [
  { value: 'Happy', icon: Smile, label: 'Happy' },
  { value: 'Neutral', icon: Meh, label: 'Neutral' },
  { value: 'Sad', icon: Frown, label: 'Struggling' },
  { value: 'Energized', icon: Zap, label: 'Energized' },
  { value: 'Thoughtful', icon: Brain, label: 'Thoughtful' },
];
const MOOD_MAP = Object.fromEntries(MOODS.map(m => [m.value, m]));

export default function ReflectPage() {
  const user = useAuth();
  const navigate = useNavigate();
  const { showSuccess } = useToast();
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [mood, setMood] = useState(null);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // history
  const [reflections, setReflections] = useState([]);
  const [histLoading, setHistLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [datePreset, setDatePreset] = useState('');
  const [showAll, setShowAll] = useState(false);

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
      if (response.data?.xpAwarded) {
        showXpNotification(showSuccess, response.data.xpAwarded);
      }
      setSuccess(true); setTimeout(() => setSuccess(false), 3000);
      setTimeout(() => { setContent(''); setTitle(''); setMood(null); setTags([]); }, 1000);
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



  const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const fmtTime = (d) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const getLabel = (r) => r.title || (r.content.length > 40 ? r.content.slice(0, 40) + '…' : r.content);
  return (
    <div className="flex min-h-screen bg-site-bg">
      <Sidebar />
      <main className="flex-1 overflow-y-auto w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-site-ink">Reflect</h1>
            <p className="text-site-muted mt-1">Write about your learning journey — what's working, what's not, and where you're headed</p>
          </div>

          {success && <div className="mb-4 bg-green-50 border border-green-300 text-green-700 p-3 rounded-lg text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Reflection saved!</div>}
          {error && <div className="mb-4 bg-red-50 border border-red-300 text-red-700 p-3 rounded-lg text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}

          {/* ── Write Section ── */}
          <div className="bg-site-surface rounded-xl border border-site-border p-5 sm:p-6 shadow-sm mb-6">
            <h2 className="text-base font-semibold text-site-ink mb-4">New Reflection</h2>

            {/* Title */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-site-ink mb-1.5">Title <span className="text-red-500">*</span></label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Give your reflection a title" maxLength={200} required
                className="w-full px-4 py-2.5 border-2 border-transparent rounded-lg outline-none focus:border-site-accent bg-site-bg focus:bg-white text-sm text-site-ink placeholder:text-site-faint" />
            </div>

            {/* Textarea */}
            <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="What did you learn today? What insights did you gain? How do you feel about your progress?" maxLength={10000} rows={6}
              className="w-full px-4 py-3 border-2 border-transparent rounded-lg outline-none focus:border-site-accent bg-site-bg focus:bg-white resize-none text-site-ink placeholder:text-site-faint text-sm mb-1" />
            <p className="text-xs text-site-faint text-right mb-4">{content.length}/10,000</p>

            {/* Mood */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-site-ink mb-2">How are you feeling? <span className="text-red-500">*</span></label>
              <div className="flex flex-wrap gap-2">
                {MOODS.map(m => {
                  const Icon = m.icon;
                  return (
                    <button key={m.value} type="button" onClick={() => setMood(mood === m.value ? null : m.value)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${mood === m.value ? 'bg-site-accent text-white shadow-md scale-105' : 'bg-site-bg text-site-muted border border-site-border hover:border-site-accent'}`}>
                      <Icon className="w-5 h-5" /> {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tags */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-site-ink mb-2">Tags</label>
              <form onSubmit={addTag} className="flex gap-2 mb-2">
                <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Add a tag and press Enter" maxLength={50}
                  className="flex-1 px-3 py-2 border-2 border-transparent rounded-lg outline-none focus:border-site-accent bg-site-bg focus:bg-white text-sm" />
                <button type="submit" className="px-3 py-2 bg-site-accent text-white rounded-lg text-sm font-medium hover:bg-site-accent-hover">Add</button>
              </form>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map(t => (
                    <span key={t} className="flex items-center gap-1 px-2.5 py-1 bg-site-soft text-site-accent text-xs rounded-full font-medium">
                      {t} <button type="button" onClick={() => setTags(tags.filter(x => x !== t))} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Save */}
            <button onClick={handleSave} disabled={saving || !title.trim() || !content.trim() || !mood}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-lg font-semibold text-sm transition-all ${saving || !title.trim() || !content.trim() || !mood ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-site-accent text-white hover:bg-site-accent-hover shadow-md'}`}>
              {saving ? 'Saving...' : 'Save Reflection'}
            </button>
          </div>

          {/* ── Reflection History ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-site-accent" />
                <h2 className="text-lg font-semibold text-site-ink">Your Reflections</h2>
                <span className="text-xs text-site-faint">({reflections.length})</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <DateFilter value={datePreset} onChange={v => { setDatePreset(v); if (v !== 'custom') { setDateFrom(''); setDateTo(''); } setShowAll(false); }} />
                {datePreset === 'custom' && (
                  <>
                    <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setShowAll(false); }}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-site-border bg-site-bg focus:border-site-accent outline-none" />
                    <span className="text-xs text-site-faint">to</span>
                    <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setShowAll(false); }}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-site-border bg-site-bg focus:border-site-accent outline-none" />
                  </>
                )}
              </div>
            </div>

            {histLoading ? (
              <div className="text-center py-12"><div className="animate-spin w-8 h-8 border-4 border-site-accent border-t-transparent rounded-full mx-auto mb-4" /><p className="text-site-muted">Loading...</p></div>
            ) : reflections.length === 0 ? (
              <div className="text-center py-12 bg-site-surface rounded-xl border border-site-border">
                <BookOpen className="w-12 h-12 text-site-faint mx-auto mb-4" />
                <h3 className="text-lg font-medium text-site-ink mb-2">No reflections yet</h3>
                <p className="text-site-muted">Write your first reflection above to start your journal</p>
              </div>
            ) : (() => {
              const filtered = reflections.filter(r => {
                const d = new Date(r.createdAt);
                if (datePreset && datePreset !== 'custom') {
                  const n = new Date();
                  if (datePreset === 'today') return d.toDateString() === n.toDateString();
                  if (datePreset === 'week') { const w = new Date(n); w.setDate(w.getDate() - 7); return d >= w; }
                  if (datePreset === 'month') { const m = new Date(n); m.setMonth(m.getMonth() - 1); return d >= m; }
                  if (datePreset === '3months') { const m = new Date(n); m.setMonth(m.getMonth() - 3); return d >= m; }
                }
                if (datePreset === 'custom') {
                  if (dateFrom) { const from = new Date(dateFrom); from.setHours(0,0,0,0); if (d < from) return false; }
                  if (dateTo) { const to = new Date(dateTo); to.setHours(23,59,59,999); if (d > to) return false; }
                }
                return true;
              });
              const visible = showAll ? filtered : filtered.slice(0, 10);
              const hasMore = filtered.length > 10 && !showAll;
              if (filtered.length === 0) return (
                <div className="text-center py-8 bg-site-surface rounded-xl border border-site-border">
                  <p className="text-site-muted">No reflections for this period</p>
                </div>
              );
              return (<>
              <div className="space-y-2">
                {visible.map(r => {
                  const open = expandedId === r._id;
                  const m = MOOD_MAP[r.mood];
                  return (
                    <div key={r._id} className="bg-site-surface rounded-xl border border-site-border shadow-sm overflow-hidden">
                      {/* Row */}
                      <button type="button" onClick={() => setExpandedId(open ? null : r._id)} className="w-full flex items-center gap-3 p-4 text-left hover:bg-site-bg/50 transition-colors">
                        {m && <span className="text-2xl flex-shrink-0"><MoodIcon mood={m} size={24} /></span>}
                        {!m && <div className="w-8 h-8 rounded-full bg-site-bg flex items-center justify-center flex-shrink-0"><BookOpen className="w-4 h-4 text-site-faint" /></div>}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-site-ink truncate">{getLabel(r)}</p>
                          <p className="text-xs text-site-faint">{fmtDate(r.createdAt)} · {fmtTime(r.createdAt)}</p>
                        </div>
                        {r.tags?.length > 0 && <div className="hidden sm:flex gap-1.5 mr-2">{r.tags.slice(0, 3).map(t => <span key={t} className="px-2.5 py-1 bg-site-soft text-site-accent text-xs rounded-full font-medium">{t}</span>)}{r.tags.length > 3 && <span className="text-xs text-site-faint">+{r.tags.length - 3}</span>}</div>}
                        {open ? <ChevronUp className="w-4 h-4 text-site-faint flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-site-faint flex-shrink-0" />}
                      </button>

                      {/* Expanded */}
                      {open && (
                        <div className="px-4 pb-4 border-t border-site-border">
                          <div className="mt-4 space-y-4">
                            {r.title && <h3 className="text-lg font-bold text-site-ink">{r.title}</h3>}
                            {m && <div className="flex items-center gap-2"><MoodIcon mood={m} size={20} /><span className="text-sm font-medium text-site-ink">{m.label}</span></div>}
                            {r.tags?.length > 0 && <div className="flex flex-wrap gap-1.5">{r.tags.map(t => <span key={t} className="px-2.5 py-1 bg-site-soft text-site-accent text-xs rounded-full font-medium">{t}</span>)}</div>}
                            <p className="text-sm text-site-ink whitespace-pre-wrap leading-relaxed">{r.content}</p>
                            <div className="pt-3 border-t border-site-border flex items-center justify-between">
                              <p className="text-xs text-site-faint">{fmtDate(r.createdAt)} at {fmtTime(r.createdAt)}</p>
                              <div className="flex gap-1">
                                <button onClick={() => handleExport(r._id)} disabled={exporting === r._id} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-site-accent hover:bg-site-soft rounded-lg font-medium disabled:opacity-50">
                                  {exporting === r._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PDF
                                </button>
                                <button onClick={() => setDeleteId(r._id)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg font-medium">
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {hasMore && (
                <button onClick={() => setShowAll(true)} className="w-full mt-3 py-2.5 text-sm text-site-accent font-medium hover:bg-site-soft rounded-lg transition-colors border border-site-border">
                  Show all {filtered.length} reflections
                </button>
              )}
              </>);
            })()}
          </div>
        </div>
      </main>

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-site-surface rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4"><AlertCircle className="w-6 h-6 text-red-600" /></div>
            <h2 className="text-lg font-bold text-site-ink text-center mb-2">Delete Reflection</h2>
            <p className="text-sm text-site-muted text-center mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} disabled={deleting} className="flex-1 py-2.5 border border-site-border text-site-muted rounded-lg font-medium hover:bg-site-bg disabled:opacity-50">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
                {deleting ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MoodIcon({ mood, size = 20 }) {
  if (!mood?.icon) return null;
  const Icon = mood.icon;
  return <div className="w-8 h-8 rounded-full bg-site-soft flex items-center justify-center flex-shrink-0"><Icon style={{ width: size, height: size }} className="text-site-accent" /></div>;
}

const DATE_OPTS = [
  { value: '', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: '3months', label: 'Last 3 Months' },
  { value: 'custom', label: 'Custom Range' },
];

function DateFilter({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const sel = DATE_OPTS.find(o => o.value === value) || DATE_OPTS[0];
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${value ? 'border-site-accent bg-site-soft text-site-accent' : 'border-site-border bg-site-bg text-site-muted hover:border-site-accent'}`}>
        {sel.label}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 w-44 bg-site-surface border border-site-border rounded-lg shadow-lg z-30 overflow-hidden">
          {DATE_OPTS.map(o => (
            <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors ${value === o.value ? 'bg-site-soft text-site-accent font-medium' : 'text-site-ink hover:bg-green-50 hover:text-green-700'}`}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
